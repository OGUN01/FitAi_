/**
 * accountService — Client caller for server-side account lifecycle endpoints.
 *
 * Single entry point today: `deleteAccount()` → DELETE /api/account on the
 * FitAI Workers gateway. The Worker wipes every user-data row via the
 * service-role client and removes the auth.users credential via
 * auth.admin.deleteUser. Client code is responsible for post-deletion
 * cleanup (AsyncStorage wipe + sign-out + navigation reset).
 *
 * Auth: reuses the shared Supabase session (same pattern as
 * fitaiWorkersClient). Errors surface typed WorkersResponse flags so the
 * caller can distinguish "offline — try again" from a hard server failure.
 */

import { supabase } from "./supabase";
import { isNetworkError } from "../utils/networkErrorDetection";

const WORKERS_BASE_URL = "https://fitai-workers.fitai-prod.workers.dev";

export interface DeleteAccountResult {
  success: boolean;
  /** Server-wiped table count (informational). */
  deletedTables?: number;
  /** Tables the server could not delete (informational, surfaced honestly). */
  failedTables?: string[];
  /** True when rows were wiped but auth.users deletion needs support. */
  authDeletionRequired?: boolean;
  /** Human-readable message from the server. */
  message?: string;
  /** Set when fetch threw / timed out before a response arrived. */
  isOffline?: boolean;
  /** Human-readable error (only present when success === false). */
  error?: string;
}

async function getAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    console.error("[accountService] getSession failed:", error);
    return null;
  }
}

export const accountService = {
  /**
   * Permanently delete the signed-in user's account on the server.
   *
   * The caller MUST NOT also wipe tables client-side after a successful
   * call — the server has already done it with the service role. The caller
   * SHOULD clear local AsyncStorage + call supabase.auth.signOut() (the
   * refresh token will be invalid server-side anyway) + reset navigation.
   */
  async deleteAccount(): Promise<DeleteAccountResult> {
    const token = await getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "You must be signed in to delete your account.",
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(`${WORKERS_BASE_URL}/api/account`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Parse body defensively — the worker always returns JSON, but a
      // network-middlebox 502 could return HTML.
      let body: any = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok && response.status !== 207) {
        const serverMessage =
          body?.error?.message ||
          body?.error ||
          body?.message ||
          `HTTP ${response.status}`;
        console.error(
          "[accountService] deleteAccount server error:",
          response.status,
          serverMessage,
        );
        return {
          success: false,
          error:
            typeof serverMessage === "string"
              ? serverMessage
              : "Server rejected the deletion request.",
        };
      }

      const data = body?.data ?? {};
      return {
        success: body?.success === true,
        deletedTables:
          typeof data.deletedTables === "number" ? data.deletedTables : undefined,
        failedTables: Array.isArray(data.failedTables)
          ? data.failedTables
          : undefined,
        authDeletionRequired: data.authDeletionRequired === true,
        message: typeof data.message === "string" ? data.message : undefined,
        error:
          body?.success === true
            ? undefined
            : data.message || "Deletion incomplete.",
      };
    } catch (error) {
      if (isNetworkError(error) || (error instanceof Error && error.name === "AbortError")) {
        console.error("[accountService] deleteAccount offline:", error);
        return {
          success: false,
          isOffline: true,
          error: "Network unavailable. Please check your connection and try again.",
        };
      }
      console.error("[accountService] deleteAccount threw:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error deleting account.",
      };
    }
  },
};

export default accountService;
