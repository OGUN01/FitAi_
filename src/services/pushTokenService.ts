/**
 * PushTokenService — registers the device for remote push notifications.
 *
 * WHY THIS EXISTS:
 *   notificationService.initialize() sets handlers, requests permissions, and
 *   configures Android channels — but it never obtains a device token. Without
 *   a token registered on the backend, server-driven remote push is impossible
 *   (all notifications were local `scheduleNotificationAsync` only). This service
 *   closes that gap: getExpoPushTokenAsync → upsert into device_tokens.
 *
 * SSOT:
 *   - `device_tokens` table is the cloud source of truth (multi-device: a user
 *     may have a phone + tablet; each gets its own row keyed by unique token).
 *   - The in-memory `currentToken` here is the runtime cache; Supabase is
 *     authoritative on cold start (re-fetched + re-registered in register()).
 *
 * LIFECYCLE:
 *   - register(): called once after permission grant on app init. Idempotent —
 *     skips work if the cached token matches the one already in Supabase.
 *   - On logout: unregisterPushToken() deletes this device's row so the backend
 *     stops sending to a device the user no longer owns.
 *   - expo-notifications ~0.31 has no addPushTokenListener. Expo push tokens are
 *     stable for an install, so we re-fetch on app foreground defensively
 *     (re-register() is cheap — upsert is a no-op when token is unchanged).
 */

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const LOG_TAG = "[pushTokenService]";

class PushTokenService {
  private static instance: PushTokenService;
  /** In-memory cache of the device's current Expo push token. */
  private currentToken: string | null = null;
  /** True once register() has completed (success or graceful failure). */
  private registered = false;
  /** In-flight registration promise — dedupes concurrent callers. */
  private registrationPromise: Promise<string | null> | null = null;

  static getInstance(): PushTokenService {
    if (!PushTokenService.instance) {
      PushTokenService.instance = new PushTokenService();
    }
    return PushTokenService.instance;
  }

  /**
   * Resolve the EAS projectId used to mint the Expo push token.
   * Reads from Constants.expoConfig.extra.eas.projectId (set in app.config.js).
   * Falls back to undefined if absent — expo-notifications will then attempt
   * its own resolution. Returns null only on web (no push there).
   */
  private resolveProjectId(): string | undefined {
    const extra = Constants.expoConfig?.extra as
      | { eas?: { projectId?: string } }
      | undefined;
    const projectId = extra?.eas?.projectId;
    if (!projectId) {
      console.warn(
        `${LOG_TAG} No eas.projectId found in app config; getExpoPushTokenAsync will use its default resolution.`,
      );
    }
    return projectId;
  }

  /**
   * Register the device for remote push notifications.
   *
   * Flow: request permissions → getExpoPushTokenAsync → upsert into device_tokens.
   * Returns the token string on success, or null if permissions were denied or
   * the platform is unsupported (web). Never throws — callers can `await` without
   * a try/catch and treat null as "no push for this device".
   *
   * Idempotent: if the cached token matches what's already registered, no
   * Supabase write occurs.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    // Web has no push support in this app.
    if (Platform.OS === "web") return null;

    // Dedupe concurrent callers (e.g. init + foreground firing together).
    if (this.registrationPromise) return this.registrationPromise;

    this.registrationPromise = this.doRegister();
    try {
      return await this.registrationPromise;
    } finally {
      this.registrationPromise = null;
    }
  }

  private async doRegister(): Promise<string | null> {
    try {
      // 1. Permissions — request if not already granted.
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        // User denied. Do NOT loop-prompt; surface null and move on.
        console.warn(`${LOG_TAG} Push permission not granted; remote push disabled for this device.`);
        this.registered = true;
        return null;
      }

      // 2. Android requires a notification channel before token registration.
      //    notificationService.initialize creates these, but to be safe (and
      //    because this service may run before that path in some flows) we
      //    ensure the default channel exists here. Idempotent.
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        }).catch((e) => {
          // Channel creation is best-effort; don't block registration on it.
          console.warn(`${LOG_TAG} Failed to ensure default channel:`, e);
        });
      }

      // 3. Mint the Expo push token.
      const projectId = this.resolveProjectId();
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      const token = tokenResponse.data;
      if (!token) {
        console.error(`${LOG_TAG} getExpoPushTokenAsync returned no token data.`);
        this.registered = true;
        return null;
      }

      // 4. Persist to Supabase (upsert by unique token). Skip the write when the
      //    cached token is unchanged AND we've already registered this session —
      //    this makes foreground re-registers a no-op.
      const alreadyCurrent = this.currentToken === token && this.registered;
      if (!alreadyCurrent) {
        const upserted = await this.upsertToken(token);
        if (!upserted) {
          // Supabase write failed (auth, network, RLS). Cache the token locally
          // so getPushToken() returns it, but do not mark as fully registered —
          // a foreground re-register will retry the upsert.
          this.currentToken = token;
          this.registered = true;
          return token;
        }
        this.currentToken = token;
      }

      this.registered = true;
      return token;
    } catch (error) {
      // Never let registration crash the app. Log + return null.
      console.error(`${LOG_TAG} registerForPushNotificationsAsync failed:`, error);
      this.registered = true;
      return null;
    }
  }

  /**
   * Upsert the token into device_tokens for the current authenticated user.
   * Returns true on success (or no-op when no user is logged in), false on error.
   */
  private async upsertToken(token: string): Promise<boolean> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        console.error(`${LOG_TAG} Auth error during token upsert:`, authError);
        return false;
      }
      if (!user) {
        // No authenticated user — nothing to register. This is expected on the
        // pre-login path; register() will be re-invoked after sign-in.
        return false;
      }

      const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "expo";

      // Upsert by unique token. onConflict updates last_seen_at so re-registers
      // refresh the heartbeat without creating duplicates.
      const { error } = await supabase
        .from("device_tokens")
        .upsert(
          {
            user_id: user.id,
            token,
            platform,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "token" },
        );

      if (error) {
        console.error(`${LOG_TAG} Failed to upsert device token:`, error);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`${LOG_TAG} upsertToken threw:`, error);
      return false;
    }
  }

  /**
   * Returns the currently registered Expo push token, or null if not yet
   * registered / not available. Does not trigger registration — call
   * registerForPushNotificationsAsync() first.
   */
  getPushToken(): string | null {
    return this.currentToken;
  }

  /**
   * Remove this device's token from the backend. Called on logout so the server
   * stops sending remote push to a device the user no longer owns. Safe to call
   * when no token was ever registered (no-op).
   *
   * Does NOT throw — logout must always complete even if this fails.
   */
  async unregisterPushToken(): Promise<void> {
    const token = this.currentToken;
    if (!token) return;

    try {
      const { error } = await supabase
        .from("device_tokens")
        .delete()
        .eq("token", token);
      if (error) {
        console.error(`${LOG_TAG} Failed to unregister device token:`, error);
      }
    } catch (error) {
      console.error(`${LOG_TAG} unregisterPushToken threw:`, error);
    } finally {
      // Always clear local state so a subsequent register() re-mints.
      this.currentToken = null;
      this.registered = false;
    }
  }

  /**
   * Reset in-memory state without touching the backend. Used when the auth
   * user changes (e.g. switching accounts) so the next register() runs cleanly.
   */
  reset(): void {
    this.currentToken = null;
    this.registered = false;
    this.registrationPromise = null;
  }
}

export default PushTokenService;
export const pushTokenService = PushTokenService.getInstance();
