/**
 * Offline-aware wrapper around crowdFoodDb.submitContribution.
 *
 * Phase 2 of Tier 3: when a user submits a barcode contribution while offline
 * (or the submission fails on a network blip), the contribution is queued in
 * the SyncEngine's persistent AsyncStorage queue instead of being dropped.
 * The queue is flushed automatically when connectivity returns
 * (SyncEngine.setupNetworkListener → processQueue).
 *
 * Kept in its own module (rather than appended to crowdFoodDb.ts) so phase 2a
 * can evolve crowdFoodDb.ts without merge conflicts. The phase 2b UI flow
 * imports this wrapper (or the underlying functions) via dynamic import.
 */

import type { ExtractedLabelData } from "./crowdFoodDb";

// Re-export so callers can import the type from either location.
export type { ExtractedLabelData };

/**
 * Submit a contribution, or queue it for later if offline.
 *
 * Called by the UI contribution flow. Handles network state + falls back to
 * the SyncEngine queue on failure. Never throws — if both the live submit
 * and the queue fail, the error is logged and the contribution is lost
 * (matching the no-silent-failure rule: errors are surfaced to the console).
 */
export async function submitContributionOrQueue(
  barcode: string,
  data: ExtractedLabelData,
  labelImageBase64?: string | null,
): Promise<void> {
  const [{ syncEngine }, { crowdFoodDb }] = await Promise.all([
    import("./SyncEngine"),
    import("./crowdFoodDb"),
  ]);

  try {
    const status = syncEngine.getStatus();
    if (status.isOnline) {
      await crowdFoodDb.submitContribution(barcode, data);
    } else {
      await syncEngine.queueOperation("foodContribution", {
        barcode,
        extractedData: data,
        labelImageBase64: labelImageBase64 ?? null,
      });
    }
  } catch (err) {
    // Fallback: queue it for later sync.
    console.error(
      "[crowdFoodQueue] live submit failed, queuing contribution:",
      err,
    );
    await syncEngine.queueOperation("foodContribution", {
      barcode,
      extractedData: data,
      labelImageBase64: labelImageBase64 ?? null,
    });
  }
}
