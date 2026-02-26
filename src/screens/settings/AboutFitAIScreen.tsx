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

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AboutFitAIHeader } from "../../components/settings/AboutFitAIHeader";
import { AboutFitAIActionItem } from "../../components/settings/AboutFitAIActionItem";
import { AboutFitAIFeatureCard } from "../../components/settings/AboutFitAIFeatureCard";
import { AboutFitAISocialButtons } from "../../components/settings/AboutFitAISocialButtons";
import { useAboutFitAILogic } from "../../hooks/useAboutFitAILogic";

import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";

interface AboutFitAIScreenProps {
  onBack?: () => void;
}

export const AboutFitAIScreen: React.FC<AboutFitAIScreenProps> = ({
  onBack,
}) => {
  const {
    appVersion,
    features,
    handleRateApp,
    handleShareApp,
    handleWebsite,
    handleSocialMedia,
    handleTermsOfService,
    handlePrivacyPolicy,
    handleOpenSourceLicenses,
  } = useAboutFitAILogic();

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AboutFitAIHeader onBack={onBack} />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* App Logo & Info */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={styles.appSection}>
              <LinearGradient
                colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryLight]}
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
                  `rgba(255, 107, 53, 0.15)`,
                  `rgba(229, 90, 43, 0.1)`,
                ]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.missionIconContainer}>
                <LinearGradient
                  colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryDark]}
                  style={styles.missionIcon}
                >
                  <Ionicons name="heart-outline" size={rf(24)} color={ResponsiveTheme.colors.white} />
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
                <AboutFitAIFeatureCard
                  key={feature.title}
                  feature={feature}
                  index={index}
                />
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

            <AboutFitAIActionItem
              icon="star-outline"
              iconColor={ResponsiveTheme.colors.warning}
              title="Rate the App"
              description="Help others discover FitAI by rating us"
              onPress={handleRateApp}
              animationDelay={600}
            />

            <AboutFitAIActionItem
              icon="share-social-outline"
              iconColor={ResponsiveTheme.colors.success}
              title="Share with Friends"
              description="Invite friends to join your fitness journey"
              onPress={handleShareApp}
              animationDelay={650}
            />

            <AboutFitAIActionItem
              icon="globe-outline"
              iconColor={ResponsiveTheme.colors.info}
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

            <AboutFitAISocialButtons onSocialPress={handleSocialMedia} />
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

            <AboutFitAIActionItem
              icon="document-text-outline"
              iconColor={ResponsiveTheme.colors.textSecondary}
              title="Terms of Service"
              description="Review our terms and conditions"
              onPress={handleTermsOfService}
              animationDelay={800}
            />

            <AboutFitAIActionItem
              icon="shield-outline"
              iconColor={ResponsiveTheme.colors.textSecondary}
              title="Privacy Policy"
              description="Learn how we protect your data"
              onPress={handlePrivacyPolicy}
              animationDelay={850}
            />

            <AboutFitAIActionItem
              icon="code-slash-outline"
              iconColor={ResponsiveTheme.colors.textSecondary}
              title="Open Source Licenses"
              description="Third-party libraries we use"
              onPress={handleOpenSourceLicenses}
              animationDelay={900}
            />
          </View>

          {/* Copyright */}
          <Animated.View
            entering={FadeInDown.delay(950).duration(400)}
            style={styles.copyrightSection}
          >
            <Text style={styles.copyrightText}>
              © {new Date().getFullYear()} FitAI Inc. All rights reserved.
            </Text>
            <View style={styles.madeWithRow}>
              <Text style={styles.copyrightText}>Made with </Text>
              <Ionicons name="heart" size={rf(12)} color={ResponsiveTheme.colors.error} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
  },
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
    color: ResponsiveTheme.colors.white,
  },
  appName: {
    fontSize: rf(24),
    fontWeight: "800",
    color: ResponsiveTheme.colors.white,
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
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  missionText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
  },
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
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },
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
