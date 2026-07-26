/**
 * Crowd-sourced Food Database Service (Tier 3)
 *
 * Provides barcode lookup against verified community contributions and
 * submission of new contributions to the `user_food_contributions` table.
 *
 * Tier order (see barcodeService.ts):
 *   1. SQLite (on-device OFF snapshot)
 *   2. Open Food Facts cloud
 *   3. Supabase barcode_lookup_cache (admin-curated)
 *   4. Crowd-sourced contributions (this service)
 *
 * Conventions:
 *   - All methods handle auth/network errors gracefully (return null/false,
 *     never throw) EXCEPT `submitContribution`, which throws so the caller
 *     can catch + queue the contribution for an offline retry.
 *   - Errors are logged with the `[crowdFoodDb]` prefix, matching the
 *     codebase convention (`[sqliteFood]`, `[barcodeService]`).
 *   - Macros are stored normalised to per-100g, matching all other DB
 *     tiers. `normalizeToPer100g` is applied as a safety net even when the
 *     AI label-scan worker has already normalised, because the manual
 *     contribution form path may bypass the worker.
 */

import { supabase } from "./supabase";
import type { SQLiteFoodResult } from "./sqliteFood";
import {
  normalizeToPer100g,
  type FullMacroSet,
  type NutritionBasis,
} from "../utils/nutritionRecalc";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Subset of SQLiteFoodResult returned to barcodeService.
 * Mirrors the columns we read from `user_food_contributions` so the result
 * can flow into the existing buildScannedProduct pipeline unchanged.
 */
export type CrowdContribution = Pick<
  SQLiteFoodResult,
  | "code"
  | "product_name"
  | "brands"
  | "energy_kcal_100g"
  | "proteins_100g"
  | "carbohydrates_100g"
  | "sugars_100g"
  | "fat_100g"
  | "fiber_100g"
  | "sodium_100g"
  | "image_url"
>;

/**
 * Data extracted by the AI label-scan worker (or entered via the manual
 * contribution form) — what gets persisted to `user_food_contributions`.
 */
export interface ExtractedLabelData {
  productName: string;
  brand?: string | null;
  /** Per-100g OR per-serving macros. `nutritionBasis` indicates which. */
  per100g: FullMacroSet;
  servingSize?: number | null;
  servingUnit?: string | null;
  nutritionBasis: NutritionBasis;
  confidence?: number;
  /** Base64-encoded JPEG (no data: prefix). Uploaded to storage before insert. */
  labelImageBase64?: string | null;
  ingredients?: string | null;
}

// ---------------------------------------------------------------------------
// Row shape returned by the lookup select (keeps the mapping explicit).
// ---------------------------------------------------------------------------

interface ContributionRow {
  barcode: string | null;
  product_name: string;
  brand: string | null;
  energy_kcal_100g: number | null;
  proteins_100g: number | null;
  carbohydrates_100g: number | null;
  sugars_100g: number | null;
  fat_100g: number | null;
  saturated_fat_100g: number | null;
  fiber_100g: number | null;
  sodium_100g: number | null;
  label_image_url: string | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const crowdFoodDb = {
  /**
   * Tier-3 lookup: return a verified community contribution for a barcode.
   *
   * Returns null on auth error, network error, or no verified row. Never
   * throws — the caller's fallback chain must remain unaffected.
   */
  async lookupContribution(barcode: string): Promise<CrowdContribution | null> {
    try {
      const { data, error } = await supabase
        .from("user_food_contributions")
        .select(
          "barcode, product_name, brand, energy_kcal_100g, proteins_100g, carbohydrates_100g, sugars_100g, fat_100g, saturated_fat_100g, fiber_100g, sodium_100g, label_image_url",
        )
        .eq("barcode", barcode)
        .eq("verified", true)
        .maybeSingle();

      if (error) {
        console.error("[crowdFoodDb] lookupContribution failed:", error);
        return null;
      }

      if (!data) return null;

      const row = data as ContributionRow;
      if (!row.barcode || !row.product_name) return null;

      return {
        code: row.barcode,
        product_name: row.product_name,
        brands: row.brand,
        energy_kcal_100g: row.energy_kcal_100g,
        proteins_100g: row.proteins_100g,
        carbohydrates_100g: row.carbohydrates_100g,
        sugars_100g: row.sugars_100g,
        fat_100g: row.fat_100g,
        fiber_100g: row.fiber_100g,
        sodium_100g: row.sodium_100g,
        image_url: row.label_image_url,
      };
    } catch (err) {
      console.error("[crowdFoodDb] lookupContribution threw:", err);
      return null;
    }
  },

  /**
   * Submit a new contribution.
   *
   * Steps:
   *   1. Resolve the current user (RLS requires auth.uid()).
   *   2. If a label image is present, decode base64 → Blob and upload to the
   *      `food-label-images` bucket under `${userId}/${barcode}_${ts}.jpg`.
   *   3. Normalise macros to per-100g (safety net — the worker already does
   *      this, but the manual form path may not).
   *   4. Insert into `user_food_contributions`.
   *
   * THROWS on insert / upload failure so the caller can catch + queue the
   * contribution for an offline retry. Auth failures throw too — there is no
   * useful no-op behaviour when we cannot identify the contributor.
   */
  async submitContribution(
    barcode: string,
    data: ExtractedLabelData,
  ): Promise<void> {
    // 1. Resolve current user — required for RLS on the table + storage path.
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error(
        "[crowdFoodDb] submitContribution: no authenticated user:",
        userErr,
      );
      throw new Error(
        "Cannot submit contribution: not authenticated.",
      );
    }

    // 2. Upload label image (if present) before inserting the row, so we can
    //    store both the public URL and the storage path.
    let labelImageUrl: string | null = null;
    let labelImagePath: string | null = null;
    if (data.labelImageBase64) {
      const uploadResult = await this.uploadLabelImage(
        user.id,
        barcode,
        data.labelImageBase64,
      );
      labelImageUrl = uploadResult.publicUrl;
      labelImagePath = uploadResult.path;
    }

    // 3. Normalise to per-100g. The AI worker already normalises, but the
    //    manual contribution form path may pass per-serving values. After
    //    this call the stored macros are ALWAYS per-100g, so the column
    //    `nutrition_basis` is hard-coded to "per_100g".
    const normalized = normalizeToPer100g(
      data.per100g,
      data.nutritionBasis,
      data.servingSize ?? null,
    );

    // 4. Insert. is_approved/verified default to false — the cross-user
    //    verification trigger (B2 in the migration) is responsible for
    //    flipping `verified` when a second contribution matches.
    const { error: insertErr } = await supabase
      .from("user_food_contributions")
      .insert({
        user_id: user.id,
        barcode,
        product_name: data.productName,
        brand: data.brand ?? null,
        energy_kcal_100g: normalized.calories,
        proteins_100g: normalized.protein,
        carbohydrates_100g: normalized.carbs,
        sugars_100g: normalized.sugar ?? null,
        fat_100g: normalized.fat,
        fiber_100g: normalized.fiber ?? null,
        sodium_100g: normalized.sodium ?? null,
        // After normalisation every stored row is per-100g regardless of
        // what the contributor entered. This is the canonical basis for
        // every other DB tier, so the union view can join without branching.
        nutrition_basis: "per_100g",
        serving_size_g: data.servingSize ?? null,
        label_image_url: labelImageUrl,
        label_image_path: labelImagePath,
        contribution_type: "new_product",
        is_approved: false,
        verified: false,
      });

    if (insertErr) {
      console.error(
        "[crowdFoodDb] submitContribution insert failed:",
        insertErr,
      );
      throw insertErr;
    }
  },

  /**
   * Does a verified contribution already exist for this barcode?
   * Used by the prompt UI to short-circuit (skip the "contribute?" prompt).
   *
   * Never throws — returns false on auth/network error.
   */
  async hasVerifiedContribution(barcode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("has_verified_contribution", {
        p_barcode: barcode,
      });
      if (error) {
        console.error(
          "[crowdFoodDb] hasVerifiedContribution failed:",
          error,
        );
        return false;
      }
      return Boolean(data);
    } catch (err) {
      console.error("[crowdFoodDb] hasVerifiedContribution threw:", err);
      return false;
    }
  },

  /**
   * Does the current user already have a pending (unverified) contribution
   * for this barcode? Prevents duplicate prompts.
   *
   * The RPC uses `auth.uid()` internally (SECURITY DEFINER), so no user param
   * is required. Never throws — returns false on auth/network error.
   */
  async pendingContributionForBarcode(barcode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("has_pending_contribution", {
        p_barcode: barcode,
      });
      if (error) {
        console.error(
          "[crowdFoodDb] pendingContributionForBarcode failed:",
          error,
        );
        return false;
      }
      return Boolean(data);
    } catch (err) {
      console.error(
        "[crowdFoodDb] pendingContributionForBarcode threw:",
        err,
      );
      return false;
    }
  },

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Upload a base64-encoded JPEG label image to the `food-label-images`
   * bucket. Returns the public URL and the storage path.
   *
   * Mirrors the upload pattern in backupRecoveryService.ts (Blob body +
   * `contentType`), adapted for binary image data. Throws on upload error
   * so submitContribution can surface the failure to the caller's offline
   * queue.
   */
  async uploadLabelImage(
    userId: string,
    barcode: string,
    base64: string,
  ): Promise<{ publicUrl: string; path: string }> {
    // Decode base64 → Uint8Array. React Native provides atob/btoa globally
    // (Hermes + JSC) — same primitives sqliteFood.ts relies on for gz decode.
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    // Wrap in a Blob so the Supabase JS client sets the right Content-Type
    // and Content-Length headers (matches backupRecoveryService.ts).
    const blob = new Blob([bytes], { type: "image/jpeg" });

    const path = `${userId}/${barcode}_${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from("food-label-images")
      .upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadErr) {
      console.error("[crowdFoodDb] label image upload failed:", uploadErr);
      throw uploadErr;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("food-label-images").getPublicUrl(path);

    return { publicUrl, path };
  },
};
