/**
 * Template Share Service — Phase 10 deep-link generation + import.
 *
 * Responsibilities:
 *  - generateShareLink(templateId): build a `fitai://template/{id}` deep link
 *    (the `fitai` scheme is registered in app.config.js). Also produces an
 *    HTTPS universal-link form (`https://fitai.app/template/{id}`) so the
 *    link is shareable via any messaging app.
 *  - importTemplateFromLink(link): parse the link, fetch the source template
 *    (must be public — RLS enforces this on the read), then fork it into the
 *    current user's library via `workoutTemplateService.forkTemplate`.
 *  - openShareSheet(text, url): open the native OS share sheet so the user can
 *    choose any available app.
 *
 * LINK SCHEMES (both resolve to the same template id):
 *   - fitai://template/{templateId}      (app deep link — opens the app directly)
 *   - https://fitai.app/template/{templateId}  (universal link — works on web +
 *     opens the app on devices with universal-link entitlements configured)
 *
 * ERROR POLICY (CLAUDE.md §5): every async op is wrapped in try/catch with
 * console.error — no silent failures. Pure parse functions return null on
 * unrecognized input rather than throwing.
 *
 * NO HARDCODED USER DATA (CLAUDE.md §8): importTemplateFromLink requires a
 * real authenticated userId; if absent it throws (caller surfaces the error).
 */

import { Share } from "react-native";
import {
  workoutTemplateService,
  type WorkoutTemplate,
} from "./workoutTemplateService";
import { requireUserId } from "./authUtils";

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

/** App deep-link scheme (must match app.config.js `scheme`). */
export const TEMPLATE_LINK_SCHEME = "fitai";
/** Universal-link host. Configure associated domains to make this open the app. */
export const TEMPLATE_LINK_HOST = "fitai.app";
/** Path segment that identifies a template link. */
const TEMPLATE_PATH_PREFIX = "template";

// ----------------------------------------------------------------------------
// LINK GENERATION
// ----------------------------------------------------------------------------

/**
 * Build a deep link for a template. Returns the app-scheme form
 * (`fitai://template/{id}`) which is the most reliable form for opening the
 * app on iOS/Android when the scheme is registered. Callers that want the
 * HTTPS universal-link form can use `generateUniversalLink` instead.
 *
 * Pure — no side effects. Returns an empty string only if templateId is falsy.
 */
export function generateShareLink(templateId: string): string {
  if (!templateId) return "";
  return `${TEMPLATE_LINK_SCHEME}://${TEMPLATE_PATH_PREFIX}/${templateId}`;
}

/**
 * Build an HTTPS universal link for a template. Use this when sharing to
 * platforms that strip custom schemes (e.g. some web clients) or when a
 * web fallback is desired.
 */
export function generateUniversalLink(templateId: string): string {
  if (!templateId) return "";
  return `https://${TEMPLATE_LINK_HOST}/${TEMPLATE_PATH_PREFIX}/${templateId}`;
}

// ----------------------------------------------------------------------------
// LINK PARSING
// ----------------------------------------------------------------------------

/**
 * Extract a template id from a deep link or universal link.
 *
 * Accepts:
 *   - fitai://template/{id}
 *   - https://fitai.app/template/{id}
 *   - http://fitai.app/template/{id}
 *
 * Returns null for any URL that doesn't match the template path (including
 * auth deep links like `fitai://auth?type=recovery`, which are owned by the
 * auth deep-link handler — see src/utils/deepLinkHandler.ts).
 */
export function parseTemplateLink(link: string): string | null {
  if (!link || typeof link !== "string") return null;
  const trimmed = link.trim();
  if (!trimmed) return null;

  // Try the app-scheme form first: fitai://template/{id}
  const schemePrefix = `${TEMPLATE_LINK_SCHEME}://${TEMPLATE_PATH_PREFIX}/`;
  if (trimmed.toLowerCase().startsWith(schemePrefix)) {
    const id = trimmed.slice(schemePrefix.length).split(/[?#]/)[0];
    return id || null;
  }

  // Universal-link form: https://fitai.app/template/{id}
  try {
    const parsed = new URL(trimmed);
    const host = parsed.host.toLowerCase();
    if (host !== TEMPLATE_LINK_HOST) return null;
    const segments = parsed.pathname
      .split("/")
      .filter((segment) => segment.length > 0);
    if (segments.length < 2) return null;
    if (segments[0].toLowerCase() !== TEMPLATE_PATH_PREFIX) return null;
    const id = segments[1];
    return id || null;
  } catch {
    return null;
  }
}

/** True if the URL is a template deep link (app-scheme or universal). */
export function isTemplateLink(link: string): boolean {
  return parseTemplateLink(link) !== null;
}

// ----------------------------------------------------------------------------
// LINK IMPORT
// ----------------------------------------------------------------------------

/**
 * Import (fork) a template from a share link into the current user's library.
 *
 * Steps:
 *   1. Parse the link → templateId. Throw if the link is not a template link.
 *   2. Require an authenticated user (CLAUDE.md §8 — no hardcoded fallbacks).
 *   3. Call `workoutTemplateService.forkTemplate(templateId, userId)`, which
 *      reads the public template (RLS allows public reads), clones it into
 *      the user's library, sets `parent_template_id` for lineage, and
 *      atomically increments the source's `fork_count`.
 *
 * Returns the forked template (now owned by the current user, is_public=false).
 */
export async function importTemplateFromLink(
  link: string,
): Promise<WorkoutTemplate> {
  const templateId = parseTemplateLink(link);
  if (!templateId) {
    throw new Error(
      "This link is not a FitAI template link. Ask the sender to share it from the app.",
    );
  }

  // requireUserId throws if not authenticated — caller catches and surfaces.
  const userId = requireUserId();

  const forked = await workoutTemplateService.forkTemplate(templateId, userId);
  return forked;
}

// ----------------------------------------------------------------------------
// SHARE SHEET
// ----------------------------------------------------------------------------

/**
 * Open the native OS share sheet with the given message + URL.
 *
 * Returns true only when the user completes a share; dismissing the sheet is
 * normal cancellation.
 */
export async function openShareSheet(
  message: string,
  url: string,
): Promise<boolean> {
  try {
    const result = await Share.share({
      title: "Share FitAI workout",
      message: `${message}\n\n${url}`,
      url,
    });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error("[templateShareService] openShareSheet failed:", error);
    throw error;
  }
}

/**
 * Convenience: generate a share link for a template AND open the share sheet
 * with a friendly message. Returns the generated link after a completed share,
 * or null when the user dismisses the sheet. Handoff failures reject so the
 * caller can surface recovery UI.
 */
export async function shareTemplate(
  templateId: string,
  templateName: string,
): Promise<string | null> {
  // Share the HTTPS form so recipients without FitAI still receive a usable
  // destination; configured associated-domain devices can open it in-app.
  const link = generateUniversalLink(templateId);
  const message = `Check out this workout template "${templateName}" on FitAI:`;
  const shared = await openShareSheet(message, link);
  return shared ? link : null;
}

export default {
  generateShareLink,
  generateUniversalLink,
  parseTemplateLink,
  isTemplateLink,
  importTemplateFromLink,
  openShareSheet,
  shareTemplate,
  TEMPLATE_LINK_SCHEME,
  TEMPLATE_LINK_HOST,
};
