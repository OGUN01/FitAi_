/**
 * BuildMethodLandingScreen
 *
 * Step 1 of the custom workout builder step-flow. Presents the 3 build
 * methods as flat full-width rows (2026 step-flow aesthetic — no boxed
 * cards, hairline separators, right check circles):
 *  a) Use Templates       — purple accent, "Recommended"
 *  b) Build From Scratch  — orange accent, drag & drop / supersets
 *  c) Import Community    — premium badge, trending templates
 *
 * (A "Duplicate Existing" row previously existed here but routed to the
 * exact same place as "Use Templates" with no distinct feature behind it —
 * removed rather than shipping a dead/duplicate choice.)
 *
 * Renders as a full-screen overlay session in MainNavigation (see
 * buildMethodLandingSession). Tapping a row selects it (check circle fills);
 * the sticky gradient "Continue" CTA routes to the next builder step.
 * AuroraBackground theme="space" sits behind everything.
 *
 * Routing:
 *  - Templates    → navigate("TemplateLibrary", { initialTab: "mine" })
 *  - Scratch      → navigate("WeeklyBuilder")
 *  - Community    → navigate("TemplateLibrary", { initialTab: "community" })
 *                   (premium lock badge shown when subscriptionStore
 *                   .isPremium() is false; tapping surfaces the paywall
 *                   instead of selecting)
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  borderRadius,
} from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rw, rp } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";
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

type BuildMethodId = "templates" | "scratch" | "community";

interface BuildMethod {
  id: BuildMethodId;
  title: string;
  description: string;
  /** Ionicons icon for the leading disc. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent color for the icon disc tint. */
  accent: string;
  /** Optional badge label ("Recommended" / "Premium"). */
  badge?: string;
  /** Tint for the badge background/text. */
  badgeTint?: string;
  /** Next builder step to route to on continue. */
  nextScreen: string;
  /** Extra route params to pass alongside `nextScreen` (e.g. initialTab). */
  nextScreenParams?: Record<string, unknown>;
}

const METHODS: BuildMethod[] = [
  {
    id: "templates",
    title: "Use Templates",
    description:
      "Beginner / Upper Lower / PPL / Bro Split / Hybrid. Start from a proven schedule and customize.",
    icon: "library-outline",
    accent: colors.purple,
    badge: "Recommended",
    badgeTint: colors.purple,
    nextScreen: "TemplateLibrary",
    nextScreenParams: { initialTab: "mine" },
  },
  {
    id: "scratch",
    title: "Build From Scratch",
    description:
      "3 min estimated build. Drag & drop, supersets, custom rest timers — full control over every day.",
    icon: "construct-outline",
    accent: colors.primary,
    nextScreen: "WeeklyBuilder",
  },
  {
    id: "community",
    title: "Import Community",
    description: "Trending templates from the community — fork and make them yours.",
    icon: "people-outline",
    accent: colors.warningAlt,
    badge: "Premium",
    badgeTint: colors.warningAlt,
    nextScreen: "TemplateLibrary",
    nextScreenParams: { initialTab: "community" },
  },
];

export const BuildMethodLandingScreen: React.FC<BuildMethodLandingScreenProps> = ({
  navigation,
}) => {
  // Defense-in-depth premium gate. The Community row is locked for free-tier
  // users — tapping it surfaces the paywall via usePaywall().triggerPaywall()
  // instead of selecting. Unlocked rows select normally.
  const isPremium = useSubscriptionStore((s) => s.isPremium());
  const { triggerPaywall } = usePaywall();
  const [selectedId, setSelectedId] = useState<BuildMethodId | null>(null);

  const handleSelect = (method: BuildMethod) => {
    haptics.buttonPress();
    if (method.id === "community" && !isPremium) {
      // Free-tier user tapped the locked Community row — surface the paywall
      // instead of selecting.
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
    setSelectedId(method.id);
  };

  const handleContinue = () => {
    const method = METHODS.find((m) => m.id === selectedId);
    if (!method) return;
    haptics.buttonPress();
    navigation.navigate(method.nextScreen, method.nextScreenParams);
  };

  return (
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Compact top row — plain back + step eyebrow */}
        <View style={styles.topRow}>
          <AnimatedPressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to workout tab"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={rf(24)} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.stepEyebrow}>STEP 1 OF 3</Text>
          <View style={styles.topRowSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(80).duration(450)}>
            <Text style={styles.title}>Build your program</Text>
            <Text style={styles.subtitle}>
              Pick a starting point — you can always switch later.
            </Text>
          </Animated.View>

          <View style={styles.methodList}>
            {METHODS.map((method, index) => {
              const locked = method.id === "community" && !isPremium;
              const selected = selectedId === method.id;
              return (
                <Animated.View
                  key={method.id}
                  entering={FadeInUp.delay(160 + index * 80).duration(450)}
                >
                  <AnimatedPressable
                    onPress={() => handleSelect(method)}
                    scaleValue={0.98}
                    springConfig="smooth"
                    hapticType="light"
                    accessibilityRole="button"
                    accessibilityLabel={`${method.title}${method.badge ? `, ${method.badge}` : ""}${locked ? ", locked" : ""}`}
                    accessibilityHint={locked ? "Premium feature — tap to view upgrade options" : "Tap to select"}
                    accessibilityState={{ disabled: false, selected }}
                    style={[
                      styles.methodRow,
                      index < METHODS.length - 1 && styles.methodRowSeparator,
                      locked && styles.methodRowLocked,
                    ]}
                  >
                    {/* Accent icon disc */}
                    <View
                      style={[
                        styles.iconDisc,
                        { backgroundColor: hexToRgba(method.accent, 0.12) },
                      ]}
                    >
                      <Ionicons
                        name={method.icon}
                        size={rf(20)}
                        color={method.accent}
                      />
                    </View>

                    <View style={styles.methodText}>
                      <View style={styles.titleRow}>
                        <Text style={styles.methodTitle} numberOfLines={1}>
                          {method.title}
                        </Text>
                        {method.badge ? (
                          <View
                            style={[
                              styles.badge,
                              {
                                backgroundColor: hexToRgba(method.badgeTint ?? method.accent, 0.12),
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
                      <Text style={styles.methodDescription} numberOfLines={3}>
                        {method.description}
                      </Text>
                    </View>

                    {/* Right check circle */}
                    <View
                      style={[
                        styles.checkCircle,
                        selected
                          ? styles.checkCircleSelected
                          : styles.checkCircleUnselected,
                      ]}
                    >
                      {selected ? (
                        <Ionicons name="checkmark" size={rf(14)} color={colors.white} />
                      ) : null}
                    </View>
                  </AnimatedPressable>
                </Animated.View>
              );
            })}
          </View>

          {/* Helper line below Community row explaining the lock */}
          {!isPremium ? (
            <Text style={styles.lockedHint}>
              Community templates require Premium. Tap to upgrade.
            </Text>
          ) : null}
        </ScrollView>

        {/* Sticky bottom CTA */}
        <View style={styles.footer}>
          <AnimatedPressable
            onPress={handleContinue}
            disabled={!selectedId}
            scaleValue={0.97}
            hapticType="medium"
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !selectedId }}
            style={[styles.cta, !selectedId && styles.ctaDisabled]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={rf(18)} color={colors.white} />
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
  },
  backBtn: {
    width: rw(44),
    height: rw(44),
    alignItems: "center",
    justifyContent: "center",
  },
  topRowSpacer: {
    width: rw(44),
  },
  stepEyebrow: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.xl),
  },
  title: {
    fontSize: rf(28),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: "800",
    color: colors.text,
    lineHeight: rf(34),
    letterSpacing: -0.3,
    marginBottom: rp(spacing.sm),
  },
  subtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: rp(spacing.lg),
  },
  methodList: {
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    minHeight: 44,
  },
  methodRowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
  },
  methodRowLocked: {
    opacity: 0.6,
  },
  iconDisc: {
    width: rw(44),
    height: rw(44),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
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
  },
  methodTitle: {
    color: colors.text,
    fontSize: rf(15),
    fontWeight: "600",
    flexShrink: 1,
  },
  methodDescription: {
    color: colors.textSecondary,
    fontSize: rf(12),
    lineHeight: rf(18),
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(2),
    paddingHorizontal: rp(spacing.sm),
    minHeight: 22,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  badgeLock: {
    marginRight: rp(2),
  },
  badgeText: {
    fontSize: rf(11),
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  checkCircle: {
    width: rw(26),
    height: rw(26),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: rp(spacing.xs),
  },
  checkCircleSelected: {
    backgroundColor: colors.primary,
  },
  checkCircleUnselected: {
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.25),
  },
  lockedHint: {
    color: colors.textSecondary,
    fontSize: rf(12),
    textAlign: "center",
    marginTop: rp(spacing.md),
  },
  footer: {
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.sm),
  },
  cta: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    minHeight: 52,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xl),
    minHeight: 52,
  },
  ctaText: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.white,
  },
});

export default BuildMethodLandingScreen;
