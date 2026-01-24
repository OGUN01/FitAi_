/**
 * AboutFitAIScreen - About FitAI
 *
 * Redesigned following UI/UX Methodology:
 * - GlassCard for all cards
 * - Ionicons instead of emojis
 * - AnimatedPressable with haptics
 * - ResponsiveTheme for spacing/colors
 * - FadeInDown entry animations
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Application from "expo-application";
import Constants from "expo-constants";

// UI Components
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";

// Theme & Utils
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface AboutFitAIScreenProps {
  onBack?: () => void;
}

interface FeatureItem {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
}

interface ActionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  animationDelay: number;
}

const ActionItem: React.FC<ActionItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  onPress,
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
          style={styles.actionCard}
        >
          <View style={styles.actionContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${iconColor}15` },
              ]}
            >
              <Ionicons name={icon} size={rf(18)} color={iconColor} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>{title}</Text>
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

export const AboutFitAIScreen: React.FC<AboutFitAIScreenProps> = ({
  onBack,
}) => {
  // Get version from expo-constants (reads from app.config.js/app.json)
  // Falls back to expo-application for native build info
  const appVersion =
    Constants.expoConfig?.version ||
    Application.nativeApplicationVersion ||
    "1.0.0";
  const buildNumber =
    Constants.expoConfig?.android?.versionCode?.toString() ||
    Application.nativeBuildVersion ||
    new Date().toISOString().split("T")[0];

  const features: FeatureItem[] = [
    {
      icon: "sparkles-outline",
      color: "#667eea",
      title: "100% AI-Powered",
      description: "Every workout and meal plan is uniquely generated for you",
    },
    {
      icon: "flag-outline",
      color: "#4CAF50",
      title: "Personalized Goals",
      description: "Tailored fitness plans based on your specific objectives",
    },
    {
      icon: "analytics-outline",
      color: "#FF9800",
      title: "Smart Tracking",
      description: "Comprehensive progress monitoring and analytics",
    },
    {
      icon: "nutrition-outline",
      color: "#FF6B6B",
      title: "Nutrition Planning",
      description: "AI-generated meal plans with macro tracking",
    },
    {
      icon: "barbell-outline",
      color: "#9C27B0",
      title: "Adaptive Workouts",
      description: "Exercises that evolve with your fitness level",
    },
    {
      icon: "sync-outline",
      color: "#2196F3",
      title: "Real-time Sync",
      description: "Seamless data synchronization across all devices",
    },
  ];

  const handleRateApp = useCallback(() => {
    Alert.alert(
      "Rate FitAI",
      "Thank you for using FitAI! Your feedback helps us improve.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rate on App Store",
          onPress: () => {
            haptics.success();
            Alert.alert(
              "App Store",
              "App Store link will be available after app publication.",
            );
          },
        },
      ],
    );
  }, []);

  const handleShareApp = useCallback(() => {
    Alert.alert(
      "Share FitAI",
      "Invite your friends to join you on your fitness journey!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: () => {
            haptics.success();
            Alert.alert("Share", "Native sharing will be implemented here.");
          },
        },
      ],
    );
  }, []);

  const handleWebsite = useCallback(() => {
    haptics.light();
    Linking.openURL("https://fitai.app");
  }, []);

  const handleSocialMedia = useCallback((platform: string) => {
    const urls: Record<string, string> = {
      twitter: "https://twitter.com/fitai_app",
      instagram: "https://instagram.com/fitai_app",
      facebook: "https://facebook.com/fitai.app",
    };

    const url = urls[platform];
    if (url) {
      haptics.light();
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open social media link.");
      });
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
              name="information-circle-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.headerTitle}>About FitAI</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* App Logo & Info */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={styles.appSection}>
              <LinearGradient
                colors={["#FF6B6B", "#FF8E53"]}
                style={styles.appLogo}
              >
                <Text style={styles.appLogoText}>F</Text>
              </LinearGradient>
              <Text style={styles.appName}>FitAI</Text>
              <Text style={styles.appTagline}>
                Your AI-Powered Fitness Companion
              </Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{appVersion}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Mission Statement */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <GlassCard
              elevation={2}
              padding="lg"
              blurIntensity="default"
              borderRadius="xl"
              style={styles.missionCard}
            >
              <LinearGradient
                colors={[
                  "rgba(102, 126, 234, 0.15)",
                  "rgba(118, 75, 162, 0.1)",
                ]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.missionIconContainer}>
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  style={styles.missionIcon}
                >
                  <Ionicons name="heart-outline" size={rf(24)} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.missionTitle}>Our Mission</Text>
              <Text style={styles.missionText}>
                To revolutionize personal fitness by making AI-powered,
                personalized health and wellness accessible to everyone.
              </Text>
            </GlassCard>
          </Animated.View>

          {/* Key Features */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="star-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Key Features</Text>
            </View>

            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <Animated.View
                  key={feature.title}
                  entering={FadeInDown.delay(300 + index * 50).duration(400)}
                  style={styles.featureWrapper}
                >
                  <GlassCard
                    elevation={1}
                    padding="md"
                    blurIntensity="light"
                    borderRadius="lg"
                    style={styles.featureCard}
                  >
                    <View
                      style={[
                        styles.featureIcon,
                        { backgroundColor: `${feature.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={feature.icon}
                        size={rf(20)}
                        color={feature.color}
                      />
                    </View>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Support FitAI */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="thumbs-up-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Support FitAI</Text>
            </View>

            <ActionItem
              icon="star-outline"
              iconColor="#FFD700"
              title="Rate the App"
              description="Help others discover FitAI by rating us"
              onPress={handleRateApp}
              animationDelay={600}
            />

            <ActionItem
              icon="share-social-outline"
              iconColor="#4CAF50"
              title="Share with Friends"
              description="Invite friends to join your fitness journey"
              onPress={handleShareApp}
              animationDelay={650}
            />

            <ActionItem
              icon="globe-outline"
              iconColor="#2196F3"
              title="Visit Our Website"
              description="Learn more about FitAI and our services"
              onPress={handleWebsite}
              animationDelay={700}
            />
          </View>

          {/* Social Media */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="logo-buffer"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Follow Us</Text>
            </View>

            <Animated.View
              entering={FadeInDown.delay(750).duration(400)}
              style={styles.socialGrid}
            >
              <AnimatedPressable
                onPress={() => handleSocialMedia("twitter")}
                scaleValue={0.95}
                hapticFeedback={false}
                style={styles.socialButtonWrapper}
              >
                <GlassCard
                  elevation={1}
                  padding="md"
                  blurIntensity="light"
                  borderRadius="lg"
                  style={styles.socialButton}
                >
                  <Ionicons name="logo-twitter" size={rf(20)} color="#1DA1F2" />
                  <Text style={styles.socialText}>Twitter</Text>
                </GlassCard>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => handleSocialMedia("instagram")}
                scaleValue={0.95}
                hapticFeedback={false}
                style={styles.socialButtonWrapper}
              >
                <GlassCard
                  elevation={1}
                  padding="md"
                  blurIntensity="light"
                  borderRadius="lg"
                  style={styles.socialButton}
                >
                  <Ionicons
                    name="logo-instagram"
                    size={rf(20)}
                    color="#E4405F"
                  />
                  <Text style={styles.socialText}>Instagram</Text>
                </GlassCard>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => handleSocialMedia("facebook")}
                scaleValue={0.95}
                hapticFeedback={false}
                style={styles.socialButtonWrapper}
              >
                <GlassCard
                  elevation={1}
                  padding="md"
                  blurIntensity="light"
                  borderRadius="lg"
                  style={styles.socialButton}
                >
                  <Ionicons
                    name="logo-facebook"
                    size={rf(20)}
                    color="#1877F2"
                  />
                  <Text style={styles.socialText}>Facebook</Text>
                </GlassCard>
              </AnimatedPressable>
            </Animated.View>
          </View>

          {/* Legal */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="document-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Legal</Text>
            </View>

            <ActionItem
              icon="document-text-outline"
              iconColor="#607D8B"
              title="Terms of Service"
              description="Review our terms and conditions"
              onPress={() => {
                haptics.light();
                Linking.openURL("https://fitai.app/terms").catch(() =>
                  Alert.alert(
                    "Terms of Service",
                    "Visit https://fitai.app/terms to view our Terms of Service.",
                  ),
                );
              }}
              animationDelay={800}
            />

            <ActionItem
              icon="shield-outline"
              iconColor="#607D8B"
              title="Privacy Policy"
              description="Learn how we protect your data"
              onPress={() => {
                haptics.light();
                Linking.openURL("https://fitai.app/privacy").catch(() =>
                  Alert.alert(
                    "Privacy Policy",
                    "Visit https://fitai.app/privacy to view our Privacy Policy.",
                  ),
                );
              }}
              animationDelay={850}
            />

            <ActionItem
              icon="code-slash-outline"
              iconColor="#607D8B"
              title="Open Source Licenses"
              description="Third-party libraries we use"
              onPress={() => {
                haptics.light();
                Linking.openURL("https://fitai.app/licenses").catch(() =>
                  Alert.alert(
                    "Open Source Licenses",
                    "FitAI uses the following open source libraries:\n\n" +
                      "• React Native (MIT)\n" +
                      "• Expo (MIT)\n" +
                      "• Zustand (MIT)\n" +
                      "• React Navigation (MIT)\n" +
                      "• Supabase JS (MIT)\n" +
                      "• And many more...\n\n" +
                      "Visit https://fitai.app/licenses for the complete list.",
                  ),
                );
              }}
              animationDelay={900}
            />
          </View>

          {/* Copyright */}
          <Animated.View
            entering={FadeInDown.delay(950).duration(400)}
            style={styles.copyrightSection}
          >
            <Text style={styles.copyrightText}>
              © 2024 FitAI Inc. All rights reserved.
            </Text>
            <View style={styles.madeWithRow}>
              <Text style={styles.copyrightText}>Made with </Text>
              <Ionicons name="heart" size={rf(12)} color="#FF6B6B" />
              <Text style={styles.copyrightText}> for fitness enthusiasts</Text>
            </View>
          </Animated.View>

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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
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
  // App Section
  appSection: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  appLogo: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(20),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  appLogoText: {
    fontSize: rf(32),
    fontWeight: "800",
    color: "#fff",
  },
  appName: {
    fontSize: rf(24),
    fontWeight: "800",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  appTagline: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  versionBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  versionText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: "500",
  },
  // Mission Card
  missionCard: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    overflow: "hidden",
  },
  missionIconContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  missionIcon: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    justifyContent: "center",
    alignItems: "center",
  },
  missionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  missionText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
  },
  // Sections
  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  // Features Grid
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },
  featureWrapper: {
    width: "48.5%",
  },
  featureCard: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.lg,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  featureIcon: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  featureTitle: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(15),
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },
  // Actions
  actionCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  actionTextContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  actionTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  // Social Grid
  socialGrid: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },
  socialButtonWrapper: {
    flex: 1,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  socialText: {
    fontSize: rf(12),
    fontWeight: "500",
    color: "#fff",
  },
  // Copyright
  copyrightSection: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  copyrightText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },
  madeWithRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.xs,
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default AboutFitAIScreen;
