/**
 * AboutFitAIScreen - About FitAI
 *
 * Editorial Dark: flat surface + hairline cards (no GlassCard/gradient),
 * Ionicons instead of emojis, AnimatedPressable with haptics,
 * aurora-tokens for spacing/colors, FadeInDown entry animations.
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { AboutFitAIActionItem } from "../../components/settings/AboutFitAIActionItem";
import { AboutFitAIFeatureCard } from "../../components/settings/AboutFitAIFeatureCard";
import { AboutFitAISocialButtons } from "../../components/settings/AboutFitAISocialButtons";
import { useAboutFitAILogic } from "../../hooks/useAboutFitAILogic";

import { colors, spacing, borderRadius, surface, border } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rw, rh } from "../../utils/responsive";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface AboutFitAIScreenProps {
  onBack?: () => void;
}

export const AboutFitAIScreen: React.FC<AboutFitAIScreenProps> = ({
  onBack,
}) => {
  const reducedMotion = useReducedMotion();
  const {
    appVersion,
    features,
    handleShareApp,
    handleRateApp,
    handleWebsite,
    handleSocialMedia,
    handleTermsOfService,
    handlePrivacyPolicy,
    handleOpenSourceLicenses,
  } = useAboutFitAILogic();

  return (
    <AuroraBackground theme="space" animated={!reducedMotion} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <GlassHeader
          title="About FitAI"
          titleIcon="information-circle-outline"
          onBack={onBack}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* App Logo & Info */}
          <Animated.View
            entering={
              reducedMotion ? undefined : FadeInDown.delay(100).duration(400)
            }
          >
            <View style={styles.appSection}>
              <View style={styles.appLogo}>
              <Text style={styles.appLogoText}>F</Text>
              </View>
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
          <Animated.View
            entering={
              reducedMotion ? undefined : FadeInDown.delay(200).duration(400)
            }
          >
            <View style={styles.missionCard}>
              <View style={styles.missionIconContainer}>
                <View style={styles.missionIcon}>
                  <Ionicons name="heart-outline" size={rf(24)} color={colors.primary.DEFAULT} />
                </View>
              </View>
              <Text style={styles.missionTitle}>Our Mission</Text>
              <Text style={styles.missionText}>
                To revolutionize personal fitness by making AI-powered,
                personalized health and wellness accessible to everyone.
              </Text>
            </View>
          </Animated.View>

          {/* Key Features */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="star-outline"
                size={rf(14)}
                color={colors.text.secondary}
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
                color={colors.text.secondary}
              />
              <Text style={styles.sectionTitle}>Support FitAI</Text>
            </View>

            <AboutFitAIActionItem
              icon="star-outline"
              iconColor={colors.warning.DEFAULT}
              title="Rate FitAI"
              description="Enjoying FitAI? Leave us a review on the store"
              onPress={handleRateApp}
              animationDelay={600}
              accessibilityLabel="Rate FitAI"
              testID="about-rate-fitai"
            />

            <AboutFitAIActionItem
              icon="share-social-outline"
              iconColor={colors.success.DEFAULT}
              title="Share with Friends"
              description="Invite friends to join your fitness journey"
              onPress={handleShareApp}
              animationDelay={650}
              accessibilityLabel="Share FitAI with friends"
              testID="about-share-fitai"
            />

            <AboutFitAIActionItem
              icon="globe-outline"
              iconColor={colors.info.DEFAULT}
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
                name="share-social-outline"
                size={rf(14)}
                color={colors.text.secondary}
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
                color={colors.text.secondary}
              />
              <Text style={styles.sectionTitle}>Legal</Text>
            </View>

            <AboutFitAIActionItem
              icon="document-text-outline"
              iconColor={colors.text.secondary}
              title="Terms of Service"
              description="Review our terms and conditions"
              onPress={handleTermsOfService}
              animationDelay={800}
            />

            <AboutFitAIActionItem
              icon="shield-outline"
              iconColor={colors.text.secondary}
              title="Privacy Policy"
              description="Learn how we protect your data"
              onPress={handlePrivacyPolicy}
              animationDelay={850}
            />

            <AboutFitAIActionItem
              icon="code-slash-outline"
              iconColor={colors.text.secondary}
              title="Open Source Licenses"
              description="Third-party libraries we use"
              onPress={handleOpenSourceLicenses}
              animationDelay={900}
            />
          </View>

          {/* Copyright */}
          <Animated.View
            entering={
              reducedMotion ? undefined : FadeInDown.delay(950).duration(400)
            }
            style={styles.copyrightSection}
          >
            <Text style={styles.copyrightText}>
              © {new Date().getFullYear()} FitAI Inc. All rights reserved.
            </Text>
            <View style={styles.madeWithRow}>
              <Text style={styles.copyrightText}>Made with </Text>
              <Ionicons name="heart" size={rf(12)} color={colors.error.DEFAULT} />
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  appSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  appLogo: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(20),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.primary.DEFAULT,
  },
  appLogoText: {
    fontFamily: FONT_FAMILY.extrabold,
    fontSize: rf(32),
    // Near-black, not white — white-on-#FF6B35 computes to ~2.84:1, failing
    // even the relaxed 3:1 large-text WCAG threshold. Near-black clears
    // 7:1+ (same fix already applied to GlassButton's primary-variant label
    // and DestructiveConfirmModal's confirm button).
    color: colors.background.DEFAULT,
  },
  appName: {
    fontFamily: FONT_FAMILY.extrabold,
    fontSize: rf(24),
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  appTagline: {
    fontSize: rf(14),
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  versionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: surface[2],
    borderRadius: borderRadius.full,
  },
  versionText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: rf(11),
    color: colors.text.tertiary,
  },
  // Flat surface + hairline (Editorial Dark: no glass/gradient/elevation).
  missionCard: {
    alignItems: "center",
    marginBottom: spacing.lg,
    overflow: "hidden",
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  missionIconContainer: {
    marginBottom: spacing.md,
  },
  missionIcon: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${colors.primary.DEFAULT}1A`,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}4D`,
  },
  missionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: rf(18),
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  missionText: {
    fontSize: rf(14),
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: rf(22),
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: rf(12),
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  copyrightSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  copyrightText: {
    fontSize: rf(11),
    color: colors.text.tertiary,
    textAlign: "center",
  },
  madeWithRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default AboutFitAIScreen;
