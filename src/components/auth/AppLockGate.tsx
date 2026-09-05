/**
 * AppLockGate — Real biometric app-lock.
 *
 * Wraps app content. When the user has enabled Biometric App Lock
 * (AsyncStorage key `@fitai_app_lock` = { enabled, autoLock }), this gate:
 *
 *   1. On cold mount — demands LocalAuthentication.authenticateAsync()
 *      before revealing children.
 *   2. On AppState foreground-return — re-locks ONLY if `autoLock` is on.
 *
 * Honest degradation:
 *   - expo-local-authentication unavailable (web / Expo Go without rebuild /
 *     device with no enrolled biometric): gate passes through silently, and
 *     the settings toggle (PrivacySecurityScreen) surfaces a
 *     "Requires app rebuild" unavailable state instead of pretending to work.
 *   - User cancels the system prompt: gate stays locked with an explicit
 *     "Unlock" retry button — never auto-passes on cancel.
 *
 * Single source of truth for the setting: AsyncStorage `@fitai_app_lock`.
 * The legacy `@fitai_privacy_settings` key is read once for migration and
 * then removed so no stale flag lingers.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { GlassButton } from "../ui/aurora/GlassButton";
import { AuroraBackground } from "../ui/aurora/AuroraBackground";
import {
  colors,
  spacing,
  surface,
  border,
  typography,
} from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rp } from "../../utils/responsive";

// ============================================================================
// STORAGE CONTRACT
// ============================================================================

export const APP_LOCK_KEY = "@fitai_app_lock";
const LEGACY_PRIVACY_KEY = "@fitai_privacy_settings";

export interface AppLockSettings {
  /** Master switch — when false the gate is a pass-through. */
  enabled: boolean;
  /** When true, re-lock every time the app returns from background. */
  autoLock: boolean;
}

const DEFAULT_SETTINGS: AppLockSettings = { enabled: false, autoLock: false };

export async function readAppLockSettings(): Promise<AppLockSettings> {
  try {
    const raw = await AsyncStorage.getItem(APP_LOCK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed?.enabled === true,
        autoLock: parsed?.autoLock === true,
      };
    }

    // One-time migration from the legacy privacy-settings blob. The legacy
    // shape stored `biometricEnabled` / `autoLockEnabled` booleans; we adopt
    // them if present, then delete the old key so it cannot go stale.
    const legacyRaw = await AsyncStorage.getItem(LEGACY_PRIVACY_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw);
        const migrated: AppLockSettings = {
          enabled: legacy?.biometricEnabled === true,
          autoLock: legacy?.autoLockEnabled === true,
        };
        if (migrated.enabled || migrated.autoLock) {
          await AsyncStorage.setItem(APP_LOCK_KEY, JSON.stringify(migrated));
        }
      } catch (parseErr) {
        console.warn("[AppLockGate] legacy settings unparseable — ignoring", parseErr);
      } finally {
        await AsyncStorage.removeItem(LEGACY_PRIVACY_KEY).catch(() => {});
      }
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("[AppLockGate] Failed to read settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function writeAppLockSettings(
  next: AppLockSettings,
): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_LOCK_KEY, JSON.stringify(next));
  } catch (error) {
    console.error("[AppLockGate] Failed to persist settings:", error);
    throw error;
  }
}

// ============================================================================
// MODULE AVAILABILITY (native module probe)
// ============================================================================

type LocalAuthModule = typeof import("expo-local-authentication");

let cachedModule: LocalAuthModule | null | undefined;

/**
 * Resolve expo-local-authentication if it is installed AND linked into the
 * running binary. Returns null on web / Expo Go / dev-client missing the
 * native module. Cached after first probe.
 */
export function getLocalAuthModule(): LocalAuthModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === "web") {
    cachedModule = null;
    return cachedModule;
  }
  try {
    // Static import would crash the bundle when the native module is missing
    // in Expo Go; a lazy require keeps the pass-through path safe.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("expo-local-authentication") as LocalAuthModule;
    cachedModule = mod ?? null;
  } catch (error) {
    console.warn(
      "[AppLockGate] expo-local-authentication unavailable (rebuild required):",
      error instanceof Error ? error.message : error,
    );
    cachedModule = null;
  }
  return cachedModule;
}

/**
 * Check whether the device can actually prompt for biometric / device-credential
 * auth right now. False on web, Expo Go without rebuild, hardware missing, or
 * no biometric/credential enrolled.
 */
export async function isAppLockAvailable(): Promise<boolean> {
  const mod = getLocalAuthModule();
  if (!mod) return false;
  try {
    const [hasHardware, enrolledLevel] = await Promise.all([
      mod.hasHardwareAsync(),
      mod.getEnrolledLevelAsync(),
    ]);
    if (!hasHardware) return false;
    // EnrolledLevel: 0 = none, 1 = device credential (PIN/pattern), 2+ = biometric
    return enrolledLevel > 0;
  } catch (error) {
    console.warn("[AppLockGate] availability probe failed:", error);
    return false;
  }
}

// ============================================================================
// GATE COMPONENT
// ============================================================================

interface AppLockGateProps {
  children: React.ReactNode;
}

export const AppLockGate: React.FC<AppLockGateProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppLockSettings | null>(null);
  const [locked, setLocked] = useState<boolean>(false);
  const [prompting, setPrompting] = useState<boolean>(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const authenticate = useCallback(async () => {
    const mod = getLocalAuthModule();
    if (!mod) {
      // Module unavailable — degrade honestly: pass through.
      setLocked(false);
      return;
    }
    if (prompting) return;
    setPrompting(true);
    setPromptError(null);
    try {
      const result = await mod.authenticateAsync({
        promptMessage: "Unlock FitAI",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (!mountedRef.current) return;
      if (result.success) {
        setLocked(false);
      } else {
        // User cancelled or system lockout — stay locked, surface retry.
        setPromptError(
          result.error === "user_cancel"
            ? null
            : "Could not verify. Please try again.",
        );
        setLocked(true);
      }
    } catch (error) {
      console.error("[AppLockGate] authenticateAsync threw:", error);
      if (!mountedRef.current) return;
      setPromptError("Biometric prompt failed. Tap Unlock to retry.");
      setLocked(true);
    } finally {
      if (mountedRef.current) setPrompting(false);
    }
  }, [prompting]);

  // Initial settings load + cold-start lock decision
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await readAppLockSettings();
      if (cancelled) return;
      setSettings(s);
      if (!s.enabled) {
        setLocked(false);
        return;
      }
      const available = await isAppLockAvailable();
      if (cancelled) return;
      if (!available) {
        // Native module / hardware missing — honest pass-through (the settings
        // screen separately reports "Requires app rebuild").
        setLocked(false);
        return;
      }
      setLocked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Trigger the system prompt whenever the gate transitions into locked state
  useEffect(() => {
    if (locked && settings?.enabled) {
      void authenticate();
    }
    // authenticate is stable per `prompting`; we only want this on lock transition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // Auto-lock on background → foreground
  useEffect(() => {
    if (!settings?.enabled || !settings.autoLock) return;
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        (prev === "background" || prev === "inactive") &&
        next === "active"
      ) {
        // Re-lock — the `locked` effect will fire the prompt.
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [settings?.enabled, settings?.autoLock]);

  if (!settings || !settings.enabled || !locked) {
    return <>{children}</>;
  }

  return (
    <AuroraBackground theme="space" animated={false} intensity={0.2}>
      <View style={styles.lockContainer}>
        <View style={styles.lockIconWrap}>
          <Ionicons
            name="lock-closed-outline"
            size={rf(48)}
            color={colors.primary.DEFAULT}
          />
        </View>
        <Text style={styles.lockTitle}>FitAI is locked</Text>
        <Text style={styles.lockBody}>
          Unlock with your biometric or device credential to continue.
        </Text>
        {promptError ? (
          <Text style={styles.lockError}>{promptError}</Text>
        ) : null}
        <GlassButton
          label={prompting ? "Verifying…" : "Unlock"}
          onPress={() => {
            if (!prompting) void authenticate();
          }}
          loading={prompting}
          disabled={prompting}
          fullWidth={false}
          icon="finger-print-outline"
          accessibilityLabel="Unlock app"
          testID="app-lock-unlock-button"
          style={styles.unlockButton}
        />
      </View>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  lockIconWrap: {
    width: rp(96),
    height: rp(96),
    borderRadius: rp(48),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: surface[1],
  },
  lockTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: typography.fontSize.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  lockBody: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: rf(20),
  },
  lockError: {
    fontSize: typography.fontSize.caption,
    color: colors.error.DEFAULT,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  unlockButton: {
    marginTop: spacing.sm,
  },
});

export default AppLockGate;
