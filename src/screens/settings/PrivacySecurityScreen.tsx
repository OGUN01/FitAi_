/**
 * PrivacySecurityScreen - Privacy & Security Settings
 *
 * Editorial Dark: flat surface + hairline cards (no GlassCard/gradient),
 * Ionicons instead of emojis, AnimatedPressable with haptics,
 * aurora-tokens for spacing/colors, FadeInDown entry animations.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Linking, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { ActionItem } from "../../components/settings/ActionItem";
import { SectionHeader } from "../../components/settings/SectionHeader";
import {
  isAppLockAvailable,
  readAppLockSettings,
  writeAppLockSettings,
} from "../../components/auth/AppLockGate";

import { usePrivacySecurityLogic } from "../../hooks/usePrivacySecurityLogic";
import { DeleteAccountConfirmModal } from "./components/DeleteAccountConfirmModal";
import { flatColors as colors, spacing, surface, border, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface PrivacySecurityScreenProps {
  onBack?: () => void;
}

interface SecurityToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  unavailableHint?: string;
  busy?: boolean;
  onToggle: (next: boolean) => void;
  animationDelay: number;
  testID?: string;
  isLast?: boolean;
}

const SecurityToggleRow: React.FC<SecurityToggleRowProps> = ({
  icon,
  iconColor,
  title,
  description,
  value,
  disabled = false,
  unavailableHint,
  busy = false,
  onToggle,
  animationDelay,
  testID,
  isLast = false,
}) => {
  const reducedMotion = useReducedMotion();

  return (
  <Animated.View
    entering={
      reducedMotion ? undefined : FadeInDown.delay(animationDelay).duration(400)
    }
  >
    <View
      style={[
        styles.toggleCard,
        !isLast && styles.toggleCardBorder,
        disabled && styles.toggleCardDisabled,
      ]}
    >
      <View
        style={[
          styles.toggleIconWrap,
          { backgroundColor: `${iconColor}15` },
        ]}
      >
        <Ionicons name={icon} size={rf(18)} color={iconColor} />
      </View>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription} numberOfLines={2}>
          {description}
        </Text>
        {unavailableHint ? (
          <Text style={styles.toggleUnavailableHint}>{unavailableHint}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          if (disabled) return;
          haptics.light();
          onToggle(next);
        }}
        disabled={disabled}
        trackColor={{ false: surface[2], true: `${colors.primary}50` }}
        thumbColor={value ? colors.primary : colors.textMuted}
        ios_backgroundColor={surface[2]}
        accessibilityLabel={title}
        accessibilityHint={unavailableHint ?? description}
        accessibilityState={{ checked: value, disabled, busy }}
        testID={testID}
      />
    </View>
  </Animated.View>
  );
};

export const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({
  onBack,
}) => {
  const { handleDataExport, deleteAccount, isDeletingAccount } =
    usePrivacySecurityLogic();
  const reducedMotion = useReducedMotion();

  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [appLockAvailable, setAppLockAvailable] = useState<boolean | null>(null);
  const [appLockSaving, setAppLockSaving] = useState(false);
  const [autoLockSaving, setAutoLockSaving] = useState(false);
  const appLockSavingRef = useRef(false);
  const autoLockSavingRef = useRef(false);
  const deleteAccountInFlightRef = useRef(false);
  const [appLockError, setAppLockError] = useState<string | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [settings, available] = await Promise.all([
          readAppLockSettings(),
          isAppLockAvailable(),
        ]);
        if (!mounted) return;
        setAppLockEnabled(settings.enabled);
        setAutoLockEnabled(settings.autoLock);
        setAppLockAvailable(available);
      } catch (error) {
        console.error("[PrivacySecurity] load app lock settings failed:", error);
        if (!mounted) return;
        setAppLockAvailable(false);
        setAppLockError("Couldn't load App Lock settings");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAppLockToggle = useCallback(
    async (next: boolean) => {
      if (appLockSavingRef.current) return;
      if (next && appLockAvailable === false) {
        crossPlatformAlert(
          "Rebuild Required",
          "Biometric app lock needs a fresh build with the native module bundled. Rebuild the app to enable it.",
        );
        return;
      }
      appLockSavingRef.current = true;
      setAppLockSaving(true);
      setAppLockError(null);
      setAppLockEnabled(next);
      try {
        await writeAppLockSettings({ enabled: next, autoLock: autoLockEnabled });
      } catch (error) {
        console.error("[PrivacySecurity] persist app lock failed:", error);
        setAppLockEnabled(!next);
        setAppLockError("App Lock wasn't updated. Try again.");
        crossPlatformAlert(
          "Couldn't Update App Lock",
          "Your App Lock setting wasn't changed. Please try again.",
        );
      } finally {
        appLockSavingRef.current = false;
        setAppLockSaving(false);
      }
    },
    [appLockAvailable, autoLockEnabled],
  );

  const confirmDeleteAccount = useCallback(async () => {
    if (deleteAccountInFlightRef.current || isDeletingAccount) return;
    deleteAccountInFlightRef.current = true;
    try {
      await deleteAccount();
      // A successful deletion signs the user out and removes this screen. Keep
      // the dialog open on failure so the typed intent and retry path remain.
    } finally {
      deleteAccountInFlightRef.current = false;
    }
  }, [deleteAccount, isDeletingAccount]);

  const handleAutoLockToggle = useCallback(
    async (next: boolean) => {
      if (autoLockSavingRef.current) return;
      autoLockSavingRef.current = true;
      setAutoLockSaving(true);
      setAppLockError(null);
      setAutoLockEnabled(next);
      try {
        await writeAppLockSettings({ enabled: appLockEnabled, autoLock: next });
      } catch (error) {
        console.error("[PrivacySecurity] persist auto-lock failed:", error);
        setAutoLockEnabled(!next);
        setAppLockError("Auto-Lock wasn't updated. Try again.");
        crossPlatformAlert(
          "Couldn't Update Auto-Lock",
          "Your Auto-Lock setting wasn't changed. Please try again.",
        );
      } finally {
        autoLockSavingRef.current = false;
        setAutoLockSaving(false);
      }
    },
    [appLockEnabled],
  );

  return (
    <AuroraBackground theme="space" animated={!reducedMotion} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <GlassHeader
          title="Privacy & Security"
          titleIcon="shield-checkmark-outline"
          onBack={onBack}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <SectionHeader
              icon="fitness-outline"
              iconColor={colors.error}
              title="Health Connect Privacy"
            />

            <Animated.View
              entering={
                reducedMotion ? undefined : FadeInDown.delay(375).duration(400)
              }
            >
              <View style={styles.privacyPolicyCard}>
                <Text style={styles.privacyPolicyHeading}>
                  How FitAI uses your Health Connect data
                </Text>

                <Text style={styles.privacyPolicyBody}>
                  FitAI integrates with Android Health Connect to power
                  personalized fitness coaching and track your progress. The
                  data below is read from — and, for workouts, written back to
                  — your Health Connect store.
                </Text>

                <Text style={styles.privacyPolicySubheading}>
                  Data we read
                </Text>
                <Text style={styles.privacyPolicyList}>
                  Steps, Heart Rate, Resting Heart Rate, Active Calories, Total
                  Calories, Distance, Weight, Sleep, Exercise Sessions, Heart
                  Rate Variability (HRV), Blood Oxygen (SpO2), and Body Fat.
                </Text>

                <Text style={styles.privacyPolicySubheading}>
                  Data we write back
                </Text>
                <Text style={styles.privacyPolicyList}>
                  Exercise Sessions and Active Calories from your FitAI
                  workouts, so your other health apps see a complete record.
                </Text>

                <Text style={styles.privacyPolicySubheading}>
                  Purpose &amp; storage
                </Text>
                <Text style={styles.privacyPolicyBody}>
                  Your health data is used to personalize workout and nutrition
                  plans and to display your progress. It is stored securely in
                  your private FitAI account (Supabase), linked to your user ID
                  and protected by row-level security. We never sell your data,
                  and it is never shared with third parties for advertising.
                </Text>

                <Text style={styles.privacyPolicySubheading}>
                  Manage or revoke access
                </Text>
                <Text style={styles.privacyPolicyBody}>
                  The connect toggle and per-type switches on FitAI's
                  Connect Wearables screen only control what FitAI syncs
                  going forward — they don't revoke the underlying OS
                  permission. To fully revoke access, open your phone's
                  Health Connect (Android) or Health app (iOS) settings and
                  remove FitAI's permissions there.
                </Text>
              </View>
            </Animated.View>

            <ActionItem
              icon="open-outline"
              iconColor={colors.info}
              title="View Full Privacy Policy"
              description="Read the complete policy on our website"
              onPress={() =>
                Linking.openURL('https://fitai.app/privacy').catch(() =>
                  crossPlatformAlert('Privacy Policy', 'Could not open the page. Please visit fitai.app/privacy in your browser.')
                )
              }
              animationDelay={425}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="lock-closed-outline"
              iconColor={colors.primary}
              title="App Lock"
            />

            <View style={styles.toggleListSurface}>
              <SecurityToggleRow
                icon="finger-print-outline"
                iconColor={colors.primary}
                title="Biometric App Lock"
                description={
                  appLockAvailable === null
                    ? "Checking device support..."
                    : appLockAvailable === false
                    ? "Requires an app rebuild — native module not bundled"
                    : "Require biometric or device credential to open FitAI"
                }
                value={appLockEnabled && appLockAvailable !== false}
                disabled={appLockAvailable !== true || appLockSaving}
                unavailableHint={
                  appLockError ??
                  (appLockAvailable === null
                    ? "Checking availability"
                    : appLockAvailable === false
                      ? "Requires app rebuild"
                      : undefined)
                }
                busy={appLockAvailable === null || appLockSaving}
                onToggle={handleAppLockToggle}
                animationDelay={350}
                testID="app-lock-toggle"
              />

              <SecurityToggleRow
                icon="time-outline"
                iconColor={colors.info}
                title="Auto-Lock on Background"
                description="Re-lock every time you return to the app"
                value={autoLockEnabled}
                disabled={
                  !appLockEnabled ||
                  appLockAvailable !== true ||
                  appLockSaving ||
                  autoLockSaving
                }
                unavailableHint={
                  appLockError ??
                  (!appLockEnabled ? "Enable App Lock first" : undefined)
                }
                busy={autoLockSaving}
                onToggle={handleAutoLockToggle}
                animationDelay={400}
                testID="auto-lock-toggle"
                isLast
              />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="folder-outline"
              iconColor={colors.textSecondary}
              title="Data Management"
            />

            <ActionItem
              icon="cloud-download-outline"
              iconColor={colors.success}
              title="Export My Data"
              description="Download a copy of all your personal data"
              onPress={handleDataExport}
              animationDelay={400}
            />

            <ActionItem
              icon="clipboard-outline"
              iconColor={colors.warning}
              title="Terms of Service"
              description="Review our terms and conditions"
              onPress={() =>
                Linking.openURL('https://fitai.app/terms').catch(() =>
                  crossPlatformAlert('Terms of Service', 'Could not open the page. Please visit fitai.app/terms in your browser.')
                )
              }
              animationDelay={450}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="warning-outline"
              iconColor={colors.error}
              title="Danger Zone"
              isDanger={true}
            />

            <ActionItem
              icon="trash-outline"
              iconColor={colors.error}
              title="Delete Account"
              description="Permanently delete your account and all data — this cannot be undone"
              onPress={() => setShowDeleteAccountModal(true)}
              isDanger={true}
              animationDelay={550}
            />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        <DeleteAccountConfirmModal
          visible={showDeleteAccountModal}
          isLoading={isDeletingAccount}
          onConfirm={confirmDeleteAccount}
          onCancel={() => setShowDeleteAccountModal(false)}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: rp(100),
  },
  section: {
    marginBottom: spacing.lg,
  },
  privacyPolicyCard: {
    marginBottom: spacing.sm,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  privacyPolicyHeading: {
    fontSize: rf(16),
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  privacyPolicySubheading: {
    fontSize: rf(13),
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  privacyPolicyBody: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(19),
    marginBottom: spacing.xs,
  },
  privacyPolicyList: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(19),
  },
  toggleListSurface: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center" as const,
    padding: spacing.md,
    minHeight: rp(56),
  },
  toggleCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: border.DEFAULT,
  },
  toggleCardDisabled: {
    opacity: 0.55,
  },
  toggleIconWrap: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: spacing.md,
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  toggleTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
    marginBottom: rp(2),
  },
  toggleDescription: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  toggleUnavailableHint: {
    fontSize: rf(11),
    color: colors.warning,
    marginTop: rp(2),
    fontStyle: "italic" as const,
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default PrivacySecurityScreen;
