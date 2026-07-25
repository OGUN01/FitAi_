/**
 * Template Bookmarks Service — Phase 10 local bookmark store.
 *
 * v1 uses AsyncStorage only (no DB table) — per the plan §10.4, bookmarks
 * are stored client-side for v1. The shape is a simple string[] of template
 * ids, mirroring the favourite-exercises pattern (exercisePickerService.ts).
 *
 * STORAGE KEY: "bookmarked_templates" → string[] of template ids.
 *
 * ERROR POLICY (CLAUDE.md §5): every AsyncStorage op is wrapped in try/catch
 * with console.error — no silent failures. Read failures degrade to empty
 * list; write failures are logged but do not throw (the UI stays responsive).
 *
 * CONCURRENCY: getBookmarks() always reads fresh from AsyncStorage so
 * multiple screens see a consistent view. toggleBookmark() does a
 * read-modify-write; the small race window is acceptable for a local-only
 * bookmark list (worst case: a double-toggle on rapid taps — the UI guards
 * against this with a haptic + immediate icon flip).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

const BOOKMARKS_STORAGE_KEY = "bookmarked_templates";

// ----------------------------------------------------------------------------
// READS
// ----------------------------------------------------------------------------

/**
 * Get all bookmarked template ids. Returns [] on any storage error (degraded
 * read — never throws). The caller should not assume ordering; ids are stored
 * in insertion order but bookmarks are rendered sorted by the UI.
 */
export async function getBookmarks(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Defensive: filter to strings in case of storage corruption.
      return parsed.filter((id): id is string => typeof id === "string");
    } catch (parseError) {
      console.error(
        "[templateBookmarksService] JSON parse failed — clearing corrupted bookmarks:",
        parseError,
      );
      await AsyncStorage.removeItem(BOOKMARKS_STORAGE_KEY);
      return [];
    }
  } catch (error) {
    console.error("[templateBookmarksService] getBookmarks failed:", error);
    return [];
  }
}

/**
 * Check if a template is bookmarked. Convenience wrapper around getBookmarks()
 * for the bookmark-icon render path on cards (called per-card in a list).
 * For long lists, prefer a single getBookmarks() call + Set lookup.
 */
export async function isBookmarked(templateId: string): Promise<boolean> {
  if (!templateId) return false;
  const ids = await getBookmarks();
  return ids.includes(templateId);
}

// ----------------------------------------------------------------------------
// WRITES
// ----------------------------------------------------------------------------

/**
 * Toggle a bookmark. If the template is currently bookmarked, remove it;
 * otherwise add it. Returns the new bookmarked state (true = now bookmarked).
 *
 * The function is idempotent: calling it twice with the same id returns the
 * template to its original state.
 */
export async function toggleBookmark(templateId: string): Promise<boolean> {
  if (!templateId) return false;
  try {
    const current = await getBookmarks();
    const exists = current.includes(templateId);
    const next = exists
      ? current.filter((id) => id !== templateId)
      : [...current, templateId];
    await AsyncStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify(next),
    );
    return !exists; // true if now bookmarked, false if removed
  } catch (error) {
    console.error("[templateBookmarksService] toggleBookmark failed:", error);
    // Re-throw so the caller can surface a failure (e.g. storage full) — but
    // wrap in a friendly error so callers don't have to parse the raw one.
    throw new Error("Could not update bookmarks. Please try again.");
  }
}

/**
 * Add a bookmark (no-op if already bookmarked). Returns true if added, false
 * if it was already present.
 */
export async function addBookmark(templateId: string): Promise<boolean> {
  if (!templateId) return false;
  try {
    const current = await getBookmarks();
    if (current.includes(templateId)) return false;
    await AsyncStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify([...current, templateId]),
    );
    return true;
  } catch (error) {
    console.error("[templateBookmarksService] addBookmark failed:", error);
    throw new Error("Could not bookmark this template. Please try again.");
  }
}

/**
 * Remove a bookmark (no-op if not bookmarked). Returns true if removed.
 */
export async function removeBookmark(templateId: string): Promise<boolean> {
  if (!templateId) return false;
  try {
    const current = await getBookmarks();
    if (!current.includes(templateId)) return false;
    await AsyncStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify(current.filter((id) => id !== templateId)),
    );
    return true;
  } catch (error) {
    console.error("[templateBookmarksService] removeBookmark failed:", error);
    throw new Error("Could not remove bookmark. Please try again.");
  }
}

/**
 * Clear all bookmarks. Used on sign-out so the next user starts fresh.
 */
export async function clearBookmarks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BOOKMARKS_STORAGE_KEY);
  } catch (error) {
    console.error("[templateBookmarksService] clearBookmarks failed:", error);
  }
}

export default {
  getBookmarks,
  isBookmarked,
  toggleBookmark,
  addBookmark,
  removeBookmark,
  clearBookmarks,
  BOOKMARKS_STORAGE_KEY,
};
