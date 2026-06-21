/**
 * Deep Link Handler — Supabase Auth Redirect Parser
 *
 * Parses Supabase auth redirect URLs (password reset, email verification,
 * magic link, OAuth) into a structured shape so the app can route the user
 * to the right screen WITHOUT bouncing through the browser.
 *
 * BACKGROUND
 * ————————
 * `auth.ts` currently calls `resetPasswordForEmail()` and `resend({type:'signup'})`
 * with `redirectTo: undefined`, which means Supabase sends a generic web link
 * that opens the browser instead of the app. The proper fix requires:
 *   1. An app URI scheme registered in app.json (`expo.scheme` / `scheme` field)
 *      so React Native can intercept links like `fitai://auth?type=recovery...`
 *   2. A `Linking.addEventListener('url', ...)` listener in App.tsx that
 *      feeds every incoming URL through `handleDeepLink` and routes the user.
 *   3. `redirectTo` in auth.ts calls set to the deep-link URL (e.g.
 *      `fitai://auth/reset-password`) so Supabase embeds that in the email.
 *
 * This helper is step 2's pure parser. It has NO side effects — it does not
 * touch Supabase, navigation, or storage. The orchestrator/App.tsx owner is
 * responsible for wiring it into the app's Linking listener and consuming the
 * returned shape. Keeping it pure means it's trivially unit-testable and
 * reusable from tests without mocking.
 *
 * INTENDED App.tsx WIRING (do NOT add to App.tsx from here — that file is
 * owned by another agent; this is documentation for the orchestrator):
 *
 *   import { Linking } from 'react-native';
 *   import { handleDeepLink, DeepLinkResult } from './utils/deepLinkHandler';
 *
 *   // On mount:
 *   useEffect(() => {
 *     const sub = Linking.addEventListener('url', ({ url }) => {
 *       const parsed = handleDeepLink(url);
 *       if (!parsed) return;
 *       switch (parsed.type) {
 *         case 'recovery':
 *           // Password reset: navigate to a reset-password screen, passing
 *           // parsed.accessToken/refreshToken if the link is a PKCE flow.
 *           navigationRef.navigate('ResetPassword', { tokens: parsed.tokens });
 *           break;
 *         case 'signup':
 *         case 'email_change':
 *         case 'invite':
 *           // Email verified. Supabase auto-establishes the session if the
 *           // link carried tokens (PKCE). The onAuthStateChange listener in
 *           // authStore will pick up the new session.
 *           break;
 *         case 'magiclink':
 *           // Same as signup — session established via onAuthStateChange.
 *           break;
 *       }
 *     });
 *     // Also handle the cold-start URL (app launched from a link):
 *     Linking.getInitialURL().then((url) => { if (url) sub.listener?.({ url }); });
 *     return () => sub.remove();
 *   }, []);
 *
 * PKCE vs IMPLICIT FLOW
 * ————————
 * - Implicit (legacy): tokens are in the URL fragment (#access_token=...).
 *   URLSearchParams does NOT see fragments, so we manually split on '#'.
 * - PKCE (current Supabase default): a `code` is returned; Supabase SDK
 *   exchanges it for a session via `supabase.auth.exchangeCodeForSession()`.
 *   The auth link in the email points to the site URL with the code as a
 *   query param. When the app opens via deep link, the orchestrator should
 *   call `supabase.auth.exchangeCodeForSession(code)` to complete the flow.
 *   We surface `code` in the result so the caller can do that.
 */

/**
 * Supabase auth redirect types. Mirrors the values Supabase puts in the
 * `type` query parameter of redirect URLs.
 */
export type DeepLinkAuthType =
  | 'recovery' // password reset
  | 'signup' // email verification after sign-up
  | 'email_change'
  | 'invite'
  | 'magiclink'
  | 'email'
  | 'sms'
  | 'email_signup'
  | 'phone_change';

export interface DeepLinkTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

export interface DeepLinkResult {
  /** Parsed `type` from the URL, or null if absent. */
  type: DeepLinkAuthType | null;
  /** Tokens embedded in the URL (implicit flow). Empty for PKCE. */
  tokens: DeepLinkTokens;
  /** PKCE authorization code, if present. Caller exchanges via Supabase SDK. */
  code?: string;
  /** Error description if Supabase redirected with an error. */
  error?: string;
  /** Error code (e.g. 'access_denied') if present. */
  errorCode?: string;
  /** The next-redirect URL Supabase may include (e.g. for OAuth flows). */
  nextUrl?: string;
  /** The raw, unmodified URL that was passed in. */
  rawUrl: string;
  /** True if the URL was recognized as a Supabase auth redirect. */
  isAuthRedirect: boolean;
}

/**
 * Parse a deep link URL into a structured Supabase auth redirect result.
 *
 * Pure: no side effects, no Supabase calls, no navigation. Returns null
 * only if the input is empty/not a string; otherwise returns a result
 * with `isAuthRedirect=false` for non-auth URLs so the caller can decide
 * whether to forward to other handlers.
 *
 * Handles both query-string and URL-fragment token formats.
 */
export function handleDeepLink(url: string | null | undefined): DeepLinkResult | null {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }

  const result: DeepLinkResult = {
    type: null,
    tokens: {},
    rawUrl: url,
    isAuthRedirect: false,
  };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not a valid absolute URL — could be a relative path or garbage.
    return result;
  }

  // Collect params from BOTH the query string and the fragment. Implicit
  // flow puts tokens in #fragment; PKCE/signup put type in ?query.
  const searchParams = new URLSearchParams(parsed.search.replace(/^\?/, ''));

  // Fragment params (implicit flow tokens). Some clients send
  // `#access_token=...&refresh_token=...&expires_at=...`.
  let fragmentParams: URLSearchParams | null = null;
  if (parsed.hash && parsed.hash.length > 1) {
    const hashContent = parsed.hash.replace(/^#/, '');
    // Fragment may itself contain a '?' (e.g. `#/access_token=...`) in some
    // client configs. Treat the whole fragment as form-encoded params.
    fragmentParams = new URLSearchParams(hashContent);
  }

  // ---- type ----
  const typeRaw = searchParams.get('type') ?? fragmentParams?.get('type') ?? null;
  if (typeRaw) {
    result.type = typeRaw as DeepLinkAuthType;
    result.isAuthRedirect = true;
  }

  // ---- PKCE code ----
  const code = searchParams.get('code') ?? fragmentParams?.get('code') ?? undefined;
  if (code) {
    result.code = code;
    result.isAuthRedirect = true;
  }

  // ---- error ----
  const errorDescription =
    searchParams.get('error_description') ??
    fragmentParams?.get('error_description') ??
    undefined;
  const errorCode =
    searchParams.get('error') ?? fragmentParams?.get('error') ?? undefined;
  if (errorDescription) {
    result.error = errorDescription;
    result.isAuthRedirect = true;
  }
  if (errorCode) {
    result.errorCode = errorCode;
    result.isAuthRedirect = true;
  }

  // ---- tokens (implicit flow) ----
  const accessToken =
    searchParams.get('access_token') ??
    fragmentParams?.get('access_token') ??
    undefined;
  const refreshToken =
    searchParams.get('refresh_token') ??
    fragmentParams?.get('refresh_token') ??
    undefined;
  const expiresAtRaw =
    searchParams.get('expires_at') ??
    fragmentParams?.get('expires_at') ??
    undefined;
  const tokenType =
    searchParams.get('token_type') ??
    fragmentParams?.get('token_type') ??
    undefined;

  if (accessToken || refreshToken) {
    result.tokens = {
      accessToken,
      refreshToken,
      expiresAt: expiresAtRaw ? Number(expiresAtRaw) : undefined,
      tokenType,
    };
    result.isAuthRedirect = true;
  }

  // ---- next redirect (OAuth) ----
  const nextUrl = searchParams.get('next') ?? fragmentParams?.get('next') ?? undefined;
  if (nextUrl) {
    result.nextUrl = nextUrl;
  }

  return result;
}

/**
 * Convenience: returns true if the URL is any kind of Supabase auth redirect
 * (has a `type`, `code`, `access_token`, `refresh_token`, or `error` param).
 */
export function isAuthDeepLink(url: string | null | undefined): boolean {
  const parsed = handleDeepLink(url);
  return parsed?.isAuthRedirect ?? false;
}

export default {
  handleDeepLink,
  isAuthDeepLink,
};
