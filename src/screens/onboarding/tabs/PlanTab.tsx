/**
 * PlanTab — S7 "Plan" (the final payoff screen of the 7-screen onboarding flow).
 *
 * The reveal: "Here's what we built for you." Three live MetricTiles show the
 * computed daily calorie target, workout frequency, and goal timeline — all
 * derived from the review calculation engine (useAdvancedReviewForm →
 * useReviewValidation.performCalculations). A single orange→cyan gradient
 * Generate CTA fires a SkiaBloom + success haptic, then runs
 * validateAllForCompletion across all 5 store slices. If canComplete →
 * onComplete(); else renders inline tappable error chips that jump back to
 * the failing screen via onNavigateToTab.
 *
 * Reuses the review calculation engine — does NOT reimplement BMR/TDEE/macros.
 * The single source of truth is useAdvancedReviewForm / useReviewValidation.
 * The completion gate reuses validateAllForCompletion (screenValidation.ts),
 * which delegates to OnboardingUtils per-slice validators.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  chart,
} from "../../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";
import { ScreenFrame, MetricTile, SkiaBloom } from "../../../components/onboarding/aurora";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  TabValidationResult,
} from "../../../types/onboarding";
import { useAdvancedReviewForm } from "../../../hooks/onboarding/useAdvancedReviewForm";
import { ONBOARDING_SCREENS } from "../onboardingScreens";

const ACCENT = "#EC4899";

// Orange→cyan gradient for the Generate CTA (the ONE allowed gradient).
const GRADIENT_START = chart[1]; // #FF6B35 orange
const GRADIENT_END = chart[2]; // #00D4FF cyan

interface PlanTabProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;
  onComplete: () => void;
  onUpdate: (data: Partial<AdvancedReviewData>) => void;
  onUpdateBodyAnalysis: (data: Partial<BodyAnalysisData>) => void;
  onUpdateWorkoutPreferences: (data: Partial<WorkoutPreferencesData>) => void;
  onNavigateToTab: (tab: number) => void;
  validateAllForCompletion: (state: {
    personalInfo: PersonalInfoData | null;
    dietPreferences: DietPreferencesData | null;
    bodyAnalysis: BodyAnalysisData | null;
    workoutPreferences: WorkoutPreferencesData | null;
    advancedReview: AdvancedReviewData | null;
  }) => { perScreen: Record<number, TabValidationResult>; canComplete: boolean };
  onNext: () => void;
  onBack: () => void;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

interface FailingScreen {
  id: number;
  title: string;
  errors: string[];
}

export const PlanTab: React.FC<PlanTabProps> = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  advancedReview,
  onComplete,
  onUpdate,
  onUpdateBodyAnalysis,
  onUpdateWorkoutPreferences,
  onNavigateToTab,
  validateAllForCompletion,
  onBack,
  isEditingFromReview,
  onReturnToReview,
}) => {
  // ── Review calculation engine (mirrors AdvancedReviewTab) ──
  // The hook's internal useEffect runs performCalculations({ bypassDeficitLimit: true })
  // on mount + whenever data changes — same path as AdvancedReviewTab. No new
  // calculation path is invented here.
  const { calculatedData, isCalculating, calculationError, performCalculations } =
    useAdvancedReviewForm({
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences,
      onUpdate,
      onUpdateBodyAnalysis,
      onUpdateWorkoutPreferences,
    });

  // ── Payoff reveal state ──
  const [bloomTrigger, setBloomTrigger] = useState(false);
  const [failingScreens, setFailingScreens] = useState<FailingScreen[]>([]);
  const bloomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bloomTimer.current) clearTimeout(bloomTimer.current);
    };
  }, []);

  const handleGenerate = useCallback(() => {
    // Fire the bloom burst + success haptic.
    setBloomTrigger(false);
    requestAnimationFrame(() => setBloomTrigger(true));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (bloomTimer.current) clearTimeout(bloomTimer.current);
    bloomTimer.current = setTimeout(() => setBloomTrigger(false), 600);

    // Run the completion gate across all 5 store slices.
    const result = validateAllForCompletion({
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences,
      advancedReview: calculatedData ?? advancedReview,
    });

    if (result.canComplete) {
      setFailingScreens([]);
      onComplete();
    } else {
      // Collect failing screens with their title + errors for inline chips.
      const failing: FailingScreen[] = [];
      for (const screen of ONBOARDING_SCREENS) {
        const sv = result.perScreen[screen.id];
        if (sv && !sv.is_valid && sv.errors.length > 0) {
          failing.push({ id: screen.id, title: screen.title, errors: sv.errors });
        }
      }
      setFailingScreens(failing);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [
    validateAllForCompletion,
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    advancedReview,
    calculatedData,
    onComplete,
  ]);

  // ── Computed MetricTile values (single source: review calculation engine) ──
  // 0 / undefined are treated as "not yet computed" → surface "—", not a fake number.
  const dailyCalories =
    calculatedData?.daily_calories || advancedReview?.daily_calories || null;
  const workoutFreq =
    calculatedData?.recommended_workout_frequency ||
    advancedReview?.recommended_workout_frequency ||
    null;
  const timelineWeeks =
    calculatedData?.estimated_timeline_weeks ||
    advancedReview?.estimated_timeline_weeks ||
    null;
  const targetWeight = bodyAnalysis?.target_weight_kg || null;

  return (
    <ScreenFrame
      question="Here's what we built for you."
      reassurance="Your daily targets, ready to generate."
      onBack={onBack}
      onNext={handleGenerate}
      nextLabel={isCalculating ? "Calculating..." : "Generate"}
      disabled={isCalculating}
      hideNext
      isEditingFromReview={isEditingFromReview}
      onReturnToReview={onReturnToReview}
      bloomColor={ACCENT}
      testID="onboarding-plan-tab"
    >
      {/* ── Calculation error (retry affordance) ── */}
      {calculationError && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={20} color={colors.error.DEFAULT} />
          <Text style={styles.errorText} numberOfLines={2}>
            {calculationError}
          </Text>
          <Pressable
            onPress={() => performCalculations({ bypassDeficitLimit: true })}
            style={styles.retryButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Retry calculation"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* ── 3 live MetricTiles — the payoff dashboard hero ── */}
      <View style={styles.tilesContainer}>
        <MetricTile
          label="Daily target"
          value={dailyCalories != null ? dailyCalories : "—"}
          unit={dailyCalories != null ? "kcal/day" : undefined}
          icon="flame-outline"
          chartColor={chart[1]}
          delay={0}
          style={{ flex: 0 }}
          testID="onboarding-plan-tile-calories"
        />
        <MetricTile
          label="Workout frequency"
          value={workoutFreq != null ? workoutFreq : "—"}
          unit={workoutFreq != null ? "per week" : undefined}
          icon="barbell-outline"
          chartColor={chart[2]}
          delay={80}
          style={{ flex: 0 }}
          testID="onboarding-plan-tile-workout"
        />
        <MetricTile
          label="Goal target"
          value={
            targetWeight != null && timelineWeeks != null
              ? targetWeight
              : "—"
          }
          unit={
            targetWeight != null && timelineWeeks != null
              ? `kg in ${timelineWeeks} wks`
              : undefined
          }
          icon="flag-outline"
          chartColor={ACCENT}
          delay={160}
          style={{ flex: 0 }}
          testID="onboarding-plan-tile-goal"
        />
      </View>

      {/* ── Inline error chips (tappable → jump back to fix) ── */}
      {failingScreens.length > 0 && (
        <View style={styles.errorChipsContainer}>
          <Text style={styles.errorChipsTitle}>
            Some steps need your attention:
          </Text>
          {failingScreens.map((fs) => (
            <Pressable
              key={fs.id}
              onPress={() => onNavigateToTab(fs.id)}
              style={styles.errorChip}
              accessibilityRole="button"
              accessibilityLabel={`Fix ${fs.title}`}
            >
              <Ionicons
                name="warning"
                size={14}
                color={colors.error.DEFAULT}
                style={styles.errorChipIcon}
              />
              <Text style={styles.errorChipText} numberOfLines={1}>
                {fs.title}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={12}
                color={colors.text.tertiary}
              />
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Gradient Generate CTA (orange→cyan — the ONE allowed gradient) ── */}
      <View style={styles.ctaWrap}>
        <SkiaBloom
          trigger={bloomTrigger}
          color={ACCENT}
          count={20}
          style={styles.ctaBloom}
        />
        <Pressable
          onPress={handleGenerate}
          disabled={isCalculating}
          style={[styles.ctaButton, isCalculating && styles.ctaDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Generate my plan"
          testID="onboarding-generate-cta"
        >
          <LinearGradient
            colors={[GRADIENT_START, GRADIENT_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons
            name="sparkles"
            size={20}
            color={colors.text.primary}
            style={styles.ctaIcon}
          />
          <Text style={styles.ctaText}>
            {isCalculating ? "Calculating..." : "Generate My Plan"}
          </Text>
        </Pressable>
      </View>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    color: colors.error.DEFAULT,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error.DEFAULT,
    minHeight: 44,
    justifyContent: "center",
  },
  retryText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    color: colors.error.DEFAULT,
  },
  tilesContainer: {
    gap: spacing.md,
  },
  errorChipsContainer: {
    gap: spacing.xs,
  },
  errorChipsTitle: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  errorChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: hexToRgba(colors.error.DEFAULT, TINT_ALPHA_LOW),
    borderWidth: 1,
    borderColor: hexToRgba(colors.error.DEFAULT, 0.3),
    minHeight: 44,
  },
  errorChipIcon: {
    marginRight: spacing.xs,
  },
  errorChipText: {
    flex: 1,
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    color: colors.text.secondary,
  },
  ctaWrap: {
    position: "relative",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  ctaBloom: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: borderRadius.xl,
    minHeight: 56,
    width: "100%",
    overflow: "hidden",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaIcon: {
    marginRight: spacing.xs,
  },
  ctaText: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    lineHeight:
      typography.variants.cardHeadline.fontSize *
      typography.variants.cardHeadline.lineHeight,
    color: colors.text.primary,
  },
});

export default PlanTab;
