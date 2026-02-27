/**
 * PrivacySecurityScreen - Privacy & Security Settings
 *
 * Redesigned following UI/UX Methodology:
 * - GlassCard for all cards
 * - Ionicons instead of emojis
 * - AnimatedPressable with haptics
 * - ResponsiveTheme for spacing/colors
 * - FadeInDown entry animations
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { PrivacyToggle } from "../../components/settings/PrivacyToggle";
import { ActionItem } from "../../components/settings/ActionItem";
import { SectionHeader } from "../../components/settings/SectionHeader";

import { usePrivacySecurityLogic } from "../../hooks/usePrivacySecurityLogic";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface PrivacySecurityScreenProps {
  onBack?: () => void;
}

export const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({
  onBack,
}) => {
  const {
    settings,
    hasChanges,
    toggleSetting,
    handleDataExport,
    handleDeleteAccount,
    saveSettings,
  } = usePrivacySecurityLogic();

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              haptics.light();
              onBack?.();
            }}
            scaleValue={0.9}
            hapticFeedback={false}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.backButton}>
              <Ionicons name="chevron-back" size={rf(20)} color={ResponsiveTheme.colors.text} />
            </View>
          </AnimatedPressable>
          <View style={styles.headerCenter}>
            <Ionicons
              name="shield-checkmark-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.headerTitle}>Privacy & Security</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <SectionHeader
              icon="eye-outline"
              iconColor={ResponsiveTheme.colors.textSecondary}
              title="Data Privacy"
            />

            <PrivacyToggle
              icon="share-social-outline"
              iconColor={ResponsiveTheme.colors.primary}
              title="Data Sharing"
              description="Allow sharing anonymous usage data to improve the app"
              value={settings.dataSharing}
              onToggle={() => toggleSetting("dataSharing")}
              animationDelay={100}
            />

            <PrivacyToggle
              icon="analytics-outline"
              iconColor={ResponsiveTheme.colors.success}
              title="Analytics"
              description="Help us improve by sharing app usage analytics"
              value={settings.analytics}
              onToggle={() => toggleSetting("analytics")}
              animationDelay={150}
            />

            <PrivacyToggle
              icon="bug-outline"
              iconColor={ResponsiveTheme.colors.warning}
              title="Crash Reports"
              description="Automatically send crash reports to help fix issues"
              value={settings.crashReports}
              onToggle={() => toggleSetting("crashReports")}
              animationDelay={200}
            />

            <PrivacyToggle
              icon="location-outline"
              iconColor={ResponsiveTheme.colors.info}
              title="Location Tracking"
              description="Allow location access for workout tracking"
              value={settings.locationTracking}
              onToggle={() => toggleSetting("locationTracking")}
              animationDelay={250}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="lock-closed-outline"
              iconColor={ResponsiveTheme.colors.textSecondary}
              title="Security"
            />

            <PrivacyToggle
              icon="finger-print-outline"
              iconColor={ResponsiveTheme.colors.primary}
              title="Biometric Authentication"
              description="Use fingerprint or face recognition to secure your app"
              value={settings.biometricAuth}
              onToggle={() => toggleSetting("biometricAuth")}
              animationDelay={300}
            />

            <PrivacyToggle
              icon="lock-open-outline"
              iconColor={ResponsiveTheme.colors.neutral}
              title="Auto-Lock"
              description="Automatically lock the app when it goes to background"
              value={settings.autoLock}
              onToggle={() => toggleSetting("autoLock")}
              animationDelay={350}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="folder-outline"
              iconColor={ResponsiveTheme.colors.textSecondary}
              title="Data Management"
            />

            <ActionItem
              icon="cloud-download-outline"
              iconColor={ResponsiveTheme.colors.success}
              title="Export My Data"
              description="Download a copy of all your personal data"
              onPress={handleDataExport}
              animationDelay={400}
            />

            <ActionItem
              icon="document-text-outline"
              iconColor={ResponsiveTheme.colors.info}
              title="Privacy Policy"
              description="Read our complete privacy policy"
              onPress={() =>
                crossPlatformAlert(
                  "Privacy Policy",
                  "Privacy policy will be displayed here.",
                )
              }
              animationDelay={450}
            />

            <ActionItem
              icon="clipboard-outline"
              iconColor={ResponsiveTheme.colors.warning}
              title="Terms of Service"
              description="Review our terms and conditions"
              onPress={() =>
                crossPlatformAlert(
                  "Terms of Service",
                  "Terms of service will be displayed here.",
                )
              }
              animationDelay={500}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="warning-outline"
              iconColor={ResponsiveTheme.colors.error}
              title="Danger Zone"
              isDanger={true}
            />

            <ActionItem
              icon="trash-outline"
              iconColor={ResponsiveTheme.colors.error}
              title="Delete Account"
              description="Permanently delete your account and all data"
              onPress={handleDeleteAccount}
              isDanger={true}
              animationDelay={550}
            />
          </View>

          {hasChanges && (
            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              style={styles.saveContainer}
            >
              <AnimatedPressable
                onPress={saveSettings}
                scaleValue={0.97}
                hapticFeedback={false}
              >
                <LinearGradient
                  colors={[ResponsiveTheme.colors.errorLight, ResponsiveTheme.colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButton}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.text}
                  />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </AnimatedPressable>
            </Animated.View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  headerSpacer: {
    width: rw(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
    paddingBottom: rp(100),
  },
  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  saveContainer: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },
  saveButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default PrivacySecurityScreen;
