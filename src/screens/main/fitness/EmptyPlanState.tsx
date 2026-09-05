/**
 * EmptyPlanState Component
 * Premium first-run hero shown when no weekly workout plan exists yet.
 * Mirrors the TemplateLibraryScreen HeroEmptyState pattern: a gradient icon
 * orb with a soft glow, aspirational eyebrow/title/subtitle, and one
 * full-width gradient CTA wired to the existing onGeneratePlan handler.
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { rf, rw, rp, rh, rbr } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
import { useProfileStore } from "../../../stores/profileStore";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

interface EmptyPlanStateProps {
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  primaryGoals?: string[];
  isGenerating: boolean;
  onGeneratePlan: () => void;
}

export const EmptyPlanState: React.FC<EmptyPlanStateProps> = ({
  experienceLevel = "beginner",
  primaryGoals = [],
  isGenerating,
  onGeneratePlan,
}) => {
  const reducedMotion = useReducedMotion();
  // Spin the sync icon while generating — progressive feedback instead of a
  // static icon next to "Finding best exercises for you...".
  const rotation = useSharedValue(0);
  useEffect(() => {
    if (isGenerating && !reducedMotion) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [isGenerating, reducedMotion, rotation]);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Preview chips must reflect what the generator will actually produce, not
  // a fabricated estimate. The rule-based generator derives workout frequency
  // from the user's own workout_frequency_per_week onboarding preference (see
  // fitai-workers/src/handlers/workoutGenerationRuleBased.ts), and a generated
  // "weekly" plan is always exactly one week — there is no 1.5/2-week concept
  // anywhere in the pipeline. When the real preference isn't available yet we
  // omit the chip rather than guess (CLAUDE.md: no hardcoded fallbacks for
  // user data).
  const workoutPreferences = useProfileStore((s) => s.workoutPreferences);
  const workoutsPerWeek = workoutPreferences?.workout_frequency_per_week;
  const sessionMinutes =
    workoutPreferences?.session_duration_minutes ?? workoutPreferences?.time_preference;

  const goalLabel =
    primaryGoals.length > 0
      ? primaryGoals[0].replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
      : null;

  return (
    <View style={styles.heroEmpty} testID="empty-plan-state">
      {/* Gradient icon orb + soft glow */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.delay(120).duration(500)}
        style={styles.heroIconWrap}
      >
        <View style={styles.heroGlow} />
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroIconDisc}
        >
          <Ionicons name="barbell-outline" size={rf(40)} color={colors.text} />
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(200).duration(500)}>
        <Text style={styles.heroEyebrow}>Get Started</Text>
      </Animated.View>
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(260).duration(500)}>
        <Text
          style={styles.heroTitle}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          Build your AI workout plan
        </Text>
      </Animated.View>
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(320).duration(500)}>
        <Text style={styles.heroSubtitle} numberOfLines={3}>
          Generate a personalized weekly plan tailored to your goals, equipment, and experience level.
        </Text>
      </Animated.View>

      {/* Plan preview — flat pill chips. Workouts/week and session length come
          from the user's real onboarding preferences (the same values the
          generator reads) — omitted entirely when not yet available rather
          than showing a fabricated number. */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.delay(360).duration(500)}
        style={styles.previewRow}
      >
        {workoutsPerWeek != null && workoutsPerWeek > 0 ? (
          <View style={styles.previewChip}>
            <Ionicons name="calendar-outline" size={rf(14)} color={colors.primary} />
            <Text style={styles.previewChipText} numberOfLines={1}>
              {workoutsPerWeek} workouts/week
            </Text>
          </View>
        ) : null}
        {sessionMinutes != null && sessionMinutes > 0 ? (
          <View style={styles.previewChip}>
            <Ionicons name="time-outline" size={rf(14)} color={colors.primary} />
            <Text style={styles.previewChipText} numberOfLines={1}>
              ~{sessionMinutes} min sessions
            </Text>
          </View>
        ) : null}
        <View style={styles.previewChip}>
          <Ionicons name="trophy-outline" size={rf(14)} color={colors.primary} />
          <Text style={styles.previewChipText} numberOfLines={1}>
            {experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)}
          </Text>
        </View>
        {goalLabel ? (
          <View style={styles.previewChip}>
            <Ionicons name="flag-outline" size={rf(14)} color={colors.primary} />
            <Text style={styles.previewChipText} numberOfLines={1}>
              {goalLabel}
            </Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Generate Button — full-width gradient CTA */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.delay(440).duration(500)}
        style={styles.heroCtaRow}
      >
        <AnimatedPressable
          onPress={onGeneratePlan}
          scaleValue={0.96}
          springConfig="snappy"
          hapticType="light"
          disabled={isGenerating}
          accessibilityRole="button"
          accessibilityLabel="Generate AI Workout Plan"
          style={styles.heroPrimaryCta}
        >
          <LinearGradient
            colors={
              isGenerating ? [colors.muted, colors.neutral] : [colors.primary, colors.primaryDark]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {isGenerating ? (
            <>
              <Animated.View style={spinStyle}>
                <Ionicons name="sync" size={rf(18)} color={colors.text} />
              </Animated.View>
              <Text
                style={styles.heroPrimaryCtaText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                Finding best exercises for you...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={rf(18)} color={colors.text} style={styles.heroCtaIcon} />
              <Text
                style={styles.heroPrimaryCtaText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                Generate AI Workout
              </Text>
            </>
          )}
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: rp(spacing.xl),
    paddingVertical: rp(spacing.xxl),
  },
  heroIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rp(spacing.xl),
  },
  heroGlow: {
    position: "absolute",
    width: rp(160),
    height: rp(160),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.primary, 0.18),
    transform: [{ scale: 1.1 }],
  },
  heroIconDisc: {
    width: rp(104),
    height: rp(104),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    // Ambient glow already comes from `heroGlow` (translucent orange circle
    // behind this disc) — the colored drop-shadow here was a redundant,
    // copy-pasted 24px bloom (identical block also existed in
    // TemplateLibraryScreen.tsx). Removed rather than duplicated.
  },
  heroEyebrow: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: rp(spacing.sm),
  },
  heroTitle: {
    fontSize: rf(26),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    lineHeight: rf(32),
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: rp(spacing.sm),
    lineHeight: rf(20),
    maxWidth: rw(300),
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.xl),
    maxWidth: rw(340),
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    borderRadius: rbr(12),
    backgroundColor: hexToRgba(colors.primary, 0.1),
  },
  previewChipText: {
    fontSize: rf(12),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    color: colors.text,
  },
  heroCtaRow: {
    marginTop: rp(spacing.xxl),
    alignItems: "center",
    gap: rp(spacing.sm),
    width: "100%",
  },
  heroPrimaryCta: {
    minHeight: Math.max(rh(54), 54),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: rbr(16),
    overflow: "hidden",
    paddingHorizontal: rp(spacing.xl),
    paddingVertical: rp(spacing.md),
    flexDirection: "row",
    width: rw(280),
  } as ViewStyle,
  heroPrimaryCtaText: {
    color: colors.text,
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
  },
  heroCtaIcon: {
    marginRight: rp(spacing.xs),
  },
});

export default EmptyPlanState;
