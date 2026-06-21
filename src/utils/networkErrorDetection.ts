/**
 * Network vs Auth Error Classification
 *
 * Single shared classifier for distinguishing transient/retryable network
 * faults from genuine authentication failures. Used by:
 *   - src/services/auth.ts        (revalidateSession — avoid force-logout on network blip)
 *   - src/services/fitaiWorkersClient.ts (401 refresh path — avoid throwing
 *     AuthenticationError when the refresh threw a transport error)
 *
 * WHY THIS EXISTS
 * ————————
 * Before this helper, `revalidateSession()` treated ANY `refreshSession()`
 * failure as "session invalid" → `clearLocalSession()` → forced logout. A
 * transient network blip (airplane mode, flaky DNS) would sign the user out
 * even though the refresh token was still perfectly valid. The user would
 * have to re-enter credentials once connectivity returned — a poor UX and, for
 * a fitness app used mid-workout, actively harmful.
 *
 * Classification rules:
 *   NETWORK (retryable, keep session):
 *     - TypeError (fetch threw before a response — classic "Failed to fetch")
 *     - AbortError (request timed out / was aborted)
 *     - Supabase `AuthRetryableError` (network/server hiccup per Supabase SDK)
 *     - message matches /network|timeout|fetch|abort|failed to fetch|econn/i
 *   AUTH (session genuinely invalid — safe to logout):
 *     - Supabase `AuthSessionMissingError` (no refresh token in storage)
 *     - HTTP 401 / 403 (returned by callers that inspect response.status)
 *     - message matches /unauthorized|forbidden|invalid.*token|session.*missing|jwt/i
 *   UNKNOWN (default to AUTH to preserve the prior safe-but-aggressive
 *     behavior; callers that want to be more lenient can pass a flag).
 *
 * Reuses the message-sniffing pattern already established in
 * `src/utils/errorHandling.ts` (ErrorHandler.inferErrorType) and
 * `src/utils/integration/error.ts` (useErrorHandling.isNetworkError), but
 * adds Supabase-specific class checks that those utils lack.
 */

/** Substring patterns indicating a retryable transport/network fault. */
const NETWORK_PATTERNS: readonly RegExp[] = [
  /network/i,
  /timeout/i,
  /fetch/i,
  /abort/i,
  /econn/i, // ECONNRESET, ECONNREFUSED, etc.
  /socket/i,
];

/** Substring patterns indicating a genuine auth/session failure. */
const AUTH_PATTERNS: readonly RegExp[] = [
  /unauthorized/i,
  /forbidden/i,
  /invalid.*token/i,
  /session.*missing/i,
  /\bjwt\b/i,
  /refresh.*token.*not/i,
];

/**
 * Returns true if the error represents a transient/retryable network or
 * transport fault (as opposed to a genuine auth rejection).
 *
 * Accepts the Supabase `{ error }` shape (which has `.name`, `.message`, and
 * sometimes `.status`) as well as raw Error instances, so it can be applied
 * uniformly to both `refreshSession()`'s returned `refreshError` and a
 * thrown exception in a catch block.
 */
export function isNetworkError(
  error: unknown,
): boolean {
  if (!error) return false;

  // Normalize: Supabase errors and Error both expose name/message. Unknown
  // shapes are stringified and matched against patterns as a fallback.
  const err = error as { name?: string; message?: string; status?: number };
  const name = err?.name ?? "";
  const message = err?.message ?? (typeof error === "string" ? error : "");
  const status = typeof err?.status === "number" ? err.status : undefined;

  // Explicit Supabase class checks. AuthRetryableError signals the SDK could
  // not reach the server (network) or the server returned a 5xx — both
  // retryable, NOT a reason to clear the session.
  if (name === "AuthRetryableError") {
    return true;
  }
  // AuthSessionMissingError = no refresh token in storage → real auth failure.
  if (name === "AuthSessionMissingError") {
    return false;
  }

  // Transport-layer throws (fetch failed to establish a connection).
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  // HTTP status codes: 5xx and 429 are retryable server/network conditions.
  // 401/403 are auth failures (handled by isAuthError below).
  if (status !== undefined && (status >= 500 || status === 429)) {
    return true;
  }

  // Message-pattern fallback. Match AUTH first so e.g. "session missing"
  // isn't mis-classified by a looser network pattern.
  if (AUTH_PATTERNS.some((re) => re.test(message))) {
    return false;
  }
  if (NETWORK_PATTERNS.some((re) => re.test(message))) {
    return true;
  }

  // Default: not a known network error. Callers treating unknowns as auth
  // (the conservative prior behavior) will clear the session; that's the
  // safe default for an unrecognized failure.
  return false;
}

/**
 * Returns true if the error represents a genuine authentication failure
 * (invalid/expired/missing session) that justifies clearing the local
 * session and signing the user out.
 */
export function isAuthError(error: unknown): boolean {
  if (!error) return false;

  const err = error as { name?: string; message?: string; status?: number };
  const name = err?.name ?? "";
  const message = err?.message ?? (typeof error === "string" ? error : "");
  const status = typeof err?.status === "number" ? err.status : undefined;

  if (name === "AuthSessionMissingError") {
    return true;
  }
  // AuthRetryableError is explicitly NOT an auth error (it's network).
  if (name === "AuthRetryableError") {
    return false;
  }

  if (status === 401 || status === 403) {
    return true;
  }

  if (AUTH_PATTERNS.some((re) => re.test(message))) {
    return true;
  }

  // "Failed to fetch" etc. should not be classified as auth.
  if (NETWORK_PATTERNS.some((re) => re.test(message))) {
    return false;
  }

  return false;
}

/**
 * Human-readable label for logging. Returns 'network' | 'auth' | 'unknown'.
 */
export function classifyError(error: unknown): "network" | "auth" | "unknown" {
  if (isNetworkError(error)) return "network";
  if (isAuthError(error)) return "auth";
  return "unknown";
}

export default {
  isNetworkError,
  isAuthError,
  classifyError,
};
