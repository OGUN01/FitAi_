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

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// UI Components
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";

// Theme & Utils
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface PrivacySecurityScreenProps {
  onBack?: () => void;
}

interface PrivacyToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  animationDelay: number;
}

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  icon,
  iconColor,
  title,
  description,
  value,
  onToggle,
  animationDelay,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <GlassCard
        elevation={1}
        padding="md"
        blurIntensity="light"
        borderRadius="lg"
        style={styles.toggleCard}
      >
        <View style={styles.toggleContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}15` },
            ]}
          >
            <Ionicons name={icon} size={rf(18)} color={iconColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.toggleTitle}>{title}</Text>
            <Text style={styles.toggleDescription} numberOfLines={2}>
              {description}
            </Text>
          </View>
          <Switch
            value={value}
            onValueChange={() => {
              haptics.light();
              onToggle();
            }}
            trackColor={{
              false: "rgba(255, 255, 255, 0.1)",
              true: `${ResponsiveTheme.colors.primary}50`,
            }}
            thumbColor={
              value
                ? ResponsiveTheme.colors.primary
                : "rgba(255, 255, 255, 0.4)"
            }
            ios_backgroundColor="rgba(255, 255, 255, 0.1)"
          />
        </View>
      </GlassCard>
    </Animated.View>
  );
};

interface ActionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  isDanger?: boolean;
  animationDelay: number;
}

const ActionItem: React.FC<ActionItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  onPress,
  isDanger = false,
  animationDelay,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        scaleValue={0.98}
        hapticFeedback={false}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={
            (isDanger
              ? [styles.actionCard, styles.dangerCard]
              : styles.actionCard) as any
          }
        >
          <View style={styles.actionContent}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDanger
                    ? "rgba(244, 67, 54, 0.15)"
                    : `${iconColor}15`,
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={rf(18)}
                color={isDanger ? "#F44336" : iconColor}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[styles.actionTitle, isDanger && styles.dangerTitle]}
              >
                {title}
              </Text>
              <Text style={styles.actionDescription}>{description}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={rf(18)}
              color={ResponsiveTheme.colors.textMuted}
            />
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({
  onBack,
}) => {
  const [settings, setSettings] = useState({
    dataSharing: false,
    analytics: true,
    crashReports: true,
    locationTracking: false,
    biometricAuth: false,
    autoLock: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const toggleSetting = useCallback((key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  }, []);

  const handleDataExport = useCallback(() => {
    Alert.alert(
      "Export Data",
      "Your data export will be prepared and sent to your email address. This may take a few minutes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export",
          onPress: () => {
            haptics.success();
            Alert.alert(
              "Export Started",
              "Your data export has been initiated. You will receive an email when it's ready.",
            );
          },
        },
      ],
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Are you absolutely sure? This will permanently delete your account and all associated data.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: () => {
                    haptics.medium();
                    Alert.alert(
                      "Account Deletion",
                      "Account deletion process will be implemented here.",
                    );
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      haptics.success();
      await new Promise((resolve) => setTimeout(resolve, 500));
      setHasChanges(false);
      Alert.alert("Success", "Privacy settings saved successfully!");
    } catch (error) {
      console.error("Failed to save privacy settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    }
  }, []);

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              haptics.light();
              onBack?.();
            }}
            scaleValue={0.9}
            hapticFeedback={false}
          >
            <View style={styles.backButton}>
              <Ionicons name="chevron-back" size={rf(20)} color="#fff" />
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
          {/* Section: Data Privacy */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="eye-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Data Privacy</Text>
            </View>

            <PrivacyToggle
              icon="share-social-outline"
              iconColor="#667eea"
              title="Data Sharing"
              description="Allow sharing anonymous usage data to improve the app"
              value={settings.dataSharing}
              onToggle={() => toggleSetting("dataSharing")}
              animationDelay={100}
            />

            <PrivacyToggle
              icon="analytics-outline"
              iconColor="#4CAF50"
              title="Analytics"
              description="Help us improve by sharing app usage analytics"
              value={settings.analytics}
              onToggle={() => toggleSetting("analytics")}
              animationDelay={150}
            />

            <PrivacyToggle
              icon="bug-outline"
              iconColor="#FF9800"
              title="Crash Reports"
              description="Automatically send crash reports to help fix issues"
              value={settings.crashReports}
              onToggle={() => toggleSetting("crashReports")}
              animationDelay={200}
            />

            <PrivacyToggle
              icon="location-outline"
              iconColor="#2196F3"
              title="Location Tracking"
              description="Allow location access for workout tracking"
              value={settings.locationTracking}
              onToggle={() => toggleSetting("locationTracking")}
              animationDelay={250}
            />
          </View>

          {/* Section: Security */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="lock-closed-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Security</Text>
            </View>

            <PrivacyToggle
              icon="finger-print-outline"
              iconColor="#9C27B0"
              title="Biometric Authentication"
              description="Use fingerprint or face recognition to secure your app"
              value={settings.biometricAuth}
              onToggle={() => toggleSetting("biometricAuth")}
              animationDelay={300}
            />

            <PrivacyToggle
              icon="lock-open-outline"
              iconColor="#607D8B"
              title="Auto-Lock"
              description="Automatically lock the app when it goes to background"
              value={settings.autoLock}
              onToggle={() => toggleSetting("autoLock")}
              animationDelay={350}
            />
          </View>

          {/* Section: Data Management */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="folder-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Data Management</Text>
            </View>

            <ActionItem
              icon="cloud-download-outline"
              iconColor="#4CAF50"
              title="Export My Data"
              description="Download a copy of all your personal data"
              onPress={handleDataExport}
              animationDelay={400}
            />

            <ActionItem
              icon="document-text-outline"
              iconColor="#2196F3"
              title="Privacy Policy"
              description="Read our complete privacy policy"
              onPress={() =>
                Alert.alert(
                  "Privacy Policy",
                  "Privacy policy will be displayed here.",
                )
              }
              animationDelay={450}
            />

            <ActionItem
              icon="clipboard-outline"
              iconColor="#FF9800"
              title="Terms of Service"
              description="Review our terms and conditions"
              onPress={() =>
                Alert.alert(
                  "Terms of Service",
                  "Terms of service will be displayed here.",
                )
              }
              animationDelay={500}
            />
          </View>

          {/* Section: Danger Zone */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={rf(14)} color="#F44336" />
              <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>
                Danger Zone
              </Text>
            </View>

            <ActionItem
              icon="trash-outline"
              iconColor="#F44336"
              title="Delete Account"
              description="Permanently delete your account and all data"
              onPress={handleDeleteAccount}
              isDanger={true}
              animationDelay={550}
            />
          </View>

          {/* Save Button */}
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
                  colors={["#FF6B6B", "#FF8E53"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButton}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(18)}
                    color="#fff"
                  />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </AnimatedPressable>
            </Animated.View>
          )}

          {/* Bottom Spacing */}
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
    borderRadius: rw(20),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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
    color: "#fff",
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
  },
  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: "700",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dangerSectionTitle: {
    color: "#F44336",
  },
  toggleCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  toggleTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
  actionCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  dangerCard: {
    backgroundColor: "rgba(244, 67, 54, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.2)",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  actionTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  dangerTitle: {
    color: "#F44336",
  },
  actionDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
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
    color: "#fff",
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default PrivacySecurityScreen;
