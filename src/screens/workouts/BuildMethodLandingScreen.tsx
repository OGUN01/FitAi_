/**
 * BuildMethodLandingScreen
 *
 * Phase 2 entry point for the custom workout builder flow. Replaces the old
 * direct route FitnessScreen → ScheduleBuilder with a 4-option landing:
 *  a) Use Templates       — purple accent, "Recommended"
 *  b) Build From Scratch  — orange accent, drag & drop / supersets
 *  c) Duplicate Existing  — copy a previous schedule
 *  d) Import Community    — premium badge, trending templates
 *
 * Renders as a full-screen overlay session in MainNavigation (see
 * buildMethodLandingSession). Each card is a GlassCard wrapped in
 * AnimatedPressable (spring lift + haptic buttonPress) and routes to the next
 * builder step. AuroraBackground theme="space" sits behind everything and a
 * GlassHeader with a back chevron sits on top.
 *
 * Routing (v1 — Phase 3 will reroute Scratch to WeeklyBuilderScreen, Phase 7
 * adds the Community tab):
 *  - Templates    → navigate("TemplateLibrary")
 *  - Scratch      → navigate("ScheduleBuilder")
 *  - Duplicate    → navigate("TemplateLibrary")
 *  - Community    → navigate("TemplateLibrary")  (premium lock badge shown
 *                   when subscriptionStore.isPremium() is false; tapping still
 *                   routes to the library for v1)
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { rf, rw, rp } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import { usePaywall } from "../../hooks/usePaywall";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface BuildMethodLandingScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

/** Narrow a typography.fontWeight token to RN's literal fontWeight union. */
const fw = (w: string): TextStyle["fontWeight"] =>
  w as TextStyle["fontWeight"];

type BuildMethodId = "templates" | "scratch" | "duplicate" | "community";

interface BuildMethod {
  id: BuildMethodId;
  title: string;
  description: string;
  /** Ionicons icon for the leading disc. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent color for the disc gradient + chip. */
  accent: string;
  /** Darker accent for the gradient end. */
  accentDark: string;
  /** Optional badge label ("Recommended" / "Premium"). */
  badge?: string;
  /** Tint for the badge background/text. */
  badgeTint?: string;
  /** Next builder step to route to on tap. */
  nextScreen: string;
}

const METHODS: BuildMethod[] = [
  {
    id: "templates",
    title: "Use Templates",
    description:
      "Beginner / Upper Lower / PPL / Bro Split / Hybrid. Start from a proven schedule and customize.",
    icon: "library-outline",
    accent: colors.purple,
    accentDark: "#7E22CE",
    badge: "Recommended",
    badgeTint: colors.purple,
    nextScreen: "TemplateLibrary",
  },
  {
    id: "scratch",
    title: "Build From Scratch",
    description:
      "3 min estimated build. Drag & drop, supersets, custom rest timers — full control over every day.",
    icon: "construct-outline",
    accent: colors.primary,
    accentDark: colors.primaryDark,
    nextScreen: "WeeklyBuilder",
  },
  {
    id: "duplicate",
    title: "Duplicate Existing",
    description: "Copy your previous schedule and tweak the days you want to change.",
    icon: "copy-outline",
    accent: colors.secondary,
    accentDark: colors.secondaryDark,
    nextScreen: "TemplateLibrary",
  },
  {
    id: "community",
    title: "Import Community",
    description: "Trending templates from the community — fork and make them yours.",
    icon: "people-outline",
    accent: colors.warningAlt,
    accentDark: "#D97706",
    badge: "Premium",
    badgeTint: colors.warningAlt,
    nextScreen: "TemplateLibrary",
  },
];

export const BuildMethodLandingScreen: React.FC<BuildMethodLandingScreenProps> = ({
  navigation,
}) => {
  // Defense-in-depth premium gate. The Community card is locked for free-tier
  // users — tapping it surfaces the paywall via usePaywall().triggerPaywall()
  // instead of routing to TemplateLibrary. Unlocked cards route normally.
  const isPremiumFn = useSubscriptionStore((s) => s.isPremium);
  const isPremium = isPremiumFn();
  const { triggerPaywall } = usePaywall();

  const handleSelect = (method: BuildMethod) => {
    haptics.buttonPress();
    if (method.id === "community" && !isPremium) {
      // Free-tier user tapped the locked Community card — surface the paywall
      // instead of routing. The chevron stays for visual continuity.
      triggerPaywall("community_templates");
      crossPlatformAlert(
        "Premium feature",
        "Import community templates is available with a Premium subscription. Upgrade to browse, fork, and rate community templates.",
        [
          { text: "Maybe later", style: "cancel" },
          { text: "View plans", onPress: () => navigation.navigate("Profile") },
        ],
      );
      return;
    }
    navigation.navigate(method.nextScreen);
  };

  return (
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <GlassHeader
          title="Build Schedule"
          onBack={() => navigation.goBack()}
          backAccessibilityLabel="Back to workout tab"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(80).duration(450)}>
            <Text style={styles.headline}>
              How would you like to build your program?
            </Text>
            <Text style={styles.subhead}>
              Pick a starting point — you can always switch later.
            </Text>
          </Animated.View>

          {METHODS.map((method, index) => (
            <MethodCard
              key={method.id}
              method={method}
              delay={160 + index * 80}
              locked={method.id === "community" && !isPremium}
              onSelect={() => handleSelect(method)}
            />
          ))}
          {/* Helper line below Community card explaining the lock */}
          {!isPremium ? (
            <Text style={styles.lockedHint}>
              Community templates require Premium. Tap to upgrade.
            </Text>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

interface MethodCardProps {
  method: BuildMethod;
  delay: number;
  locked: boolean;
  onSelect: () => void;
}

const MethodCard: React.FC<MethodCardProps> = ({
  method,
  delay,
  locked,
  onSelect,
}) => (
  <Animated.View entering={FadeInUp.delay(delay).duration(450)}>
    <AnimatedPressable
      onPress={onSelect}
      scaleValue={0.98}
      springConfig="smooth"
      hapticType="light"
      accessibilityRole="button"
      accessibilityLabel={`${method.title}${method.badge ? `, ${method.badge}` : ""}${locked ? ", locked" : ""}`}
      accessibilityHint={locked ? "Premium feature — tap to view upgrade options" : "Tap to continue"}
      accessibilityState={{ disabled: false }}
      style={styles.methodCardOuter}
    >
      <GlassCard
        elevation={3}
        blurIntensity="default"
        padding="lg"
        borderRadius="xl"
        contentStyle={locked ? styles.methodCardLockedContent : undefined}
      >
        <View style={styles.methodRow}>
          {/* Accent gradient icon disc */}
          <View
            style={[
              styles.iconDisc,
              {
                backgroundColor: `${method.accent}1F`,
                borderColor: `${method.accent}59`,
              },
            ]}
          >
            <Ionicons
              name={method.icon}
              size={rf(22)}
              color={method.accent}
            />
          </View>

          <View style={styles.methodText}>
            <View style={styles.titleRow}>
              <Text
                style={styles.title}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {method.title}
              </Text>
              {method.badge ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: `${method.badgeTint}1F`,
                      borderColor: `${method.badgeTint}59`,
                    },
                  ]}
                >
                  {locked ? (
                    <Ionicons
                      name="lock-closed"
                      size={rf(10)}
                      color={method.badgeTint}
                      style={styles.badgeLock}
                    />
                  ) : null}
                  <Text
                    style={[styles.badgeText, { color: method.badgeTint }]}
                    numberOfLines={1}
                  >
                    {method.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={styles.description}
              numberOfLines={3}
            >
              {method.description}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={rf(18)}
            color={colors.textSecondary}
            style={styles.chevron}
          />
        </View>
      </GlassCard>
    </AnimatedPressable>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.xxl),
  },
  headline: {
    color: colors.text,
    fontSize: rf(typography.fontSize.h2),
    fontWeight: fw(typography.fontWeight.bold),
    lineHeight: typography.fontSize.h2 * typography.lineHeight.tight,
    marginBottom: rp(spacing.xs),
  },
  subhead: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.body),
    lineHeight: typography.fontSize.body * typography.lineHeight.normal,
    marginBottom: rp(spacing.lg),
  },
  methodCardOuter: {
    marginBottom: rp(spacing.md),
    minHeight: Math.max(rp(spacing.xxl), 64),
  },
  methodCardLockedContent: {
    opacity: 0.6,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
  },
  iconDisc: {
    width: rw(48),
    height: rw(48),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  methodText: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    marginBottom: rp(2),
    flexWrap: "wrap",
  },
  title: {
    color: colors.text,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
    flexShrink: 1,
  },
  description: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: typography.fontSize.caption * typography.lineHeight.normal,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(2),
    paddingHorizontal: rp(spacing.sm),
    minHeight: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    flexShrink: 0,
  },
  badgeLock: {
    marginRight: rp(2),
  },
  badgeText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
    letterSpacing: 0.4,
  },
  chevron: {
    marginLeft: rp(spacing.xs),
  },
  lockedHint: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
    marginBottom: rp(spacing.md),
  },
  bottomSpacer: {
    height: rp(spacing.xl),
  },
});

export default BuildMethodLandingScreen;
