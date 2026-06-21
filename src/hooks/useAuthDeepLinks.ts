/**
 * useAuthDeepLinks — React Native Linking listener for Supabase auth deep links.
 *
 * Subscribes to two sources of incoming URLs and forwards each parsed Supabase
 * auth redirect to the provided callback:
 *
 *   1. Cold start: `Linking.getInitialURL()` — the URL that launched the app
 *      (e.g. user tapped the recovery link from the email app while the app
 *      was killed). Resolves once.
 *   2. Runtime: `Linking.addEventListener('url', ...)` — links tapped while the
 *      app is already open (foregrounded or backgrounded).
 *
 * Each URL is run through `handleDeepLink` (pure parser) and forwarded ONLY
 * if `isAuthDeepLink` returns true. Non-auth URLs (e.g. push-notification
 * deeplinks, universal links to other flows) are left alone so other handlers
 * can own them.
 *
 * The callback receives the full `DeepLinkResult` so the caller can branch on
 * `result.type` (`recovery` → password reset, `signup`/`email_change` → email
 * verified, `magiclink` → session established, etc.).
 *
 * Caller contract:
 *   - The callback should be stable (useCallback) OR tolerate being re-invoked.
 *     This effect re-subscribes when the callback identity changes, which is
 *     safe but wasteful. In App.tsx we wrap the callback in `useCallback`.
 *   - The callback is responsible for any navigation / session refresh. This
 *     hook has NO side effects beyond forwarding the parsed result.
 *
 * Race-condition note (cold start):
 *   `getInitialURL()` resolves asynchronously. If the app is already showing
 *   the WelcomeScreen by the time it resolves, the callback must still be
 *   able to navigate — App.tsx handles this by rendering the PasswordReset
 *   overlay above whatever root screen is currently mounted.
 */

import { useEffect } from "react";
import { Linking } from "react-native";
import {
  handleDeepLink,
  isAuthDeepLink,
  type DeepLinkResult,
} from "../utils/deepLinkHandler";

export type AuthDeepLinkCallback = (result: DeepLinkResult) => void;

export function useAuthDeepLinks(onDeepLink: AuthDeepLinkCallback): void {
  useEffect(() => {
    let cancelled = false;

    // ---- Cold start: the URL that launched the app (if any). ----
    // Resolves to null when the app was opened normally (no deep link).
    Linking.getInitialURL()
      .then((url) => {
        if (cancelled || !url) return;
        if (!isAuthDeepLink(url)) return;
        const parsed = handleDeepLink(url);
        if (parsed) {
          onDeepLink(parsed);
        }
      })
      .catch((error) => {
        // Swallow — a transient failure to read the initial URL must not crash
        // the app on launch. The runtime listener below will still pick up any
        // subsequent links. Logged via console.error per CLAUDE.md "No Silent
        // Failures" rule.
        console.error("[useAuthDeepLinks] getInitialURL failed:", error);
      });

    // ---- Runtime: links tapped while the app is open. ----
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (!url || !isAuthDeepLink(url)) return;
      const parsed = handleDeepLink(url);
      if (parsed) {
        onDeepLink(parsed);
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [onDeepLink]);
}
