/**
 * S5 "Plan" — AdvancedReviewTab
 *
 * The payoff screen, re-skinned to the "Editorial Dark" language (no cards):
 * metric rows (micro-label left, big Manrope value right) separated by
 * hairlines under SectionLabels; the pace picker renders as OptionRow-style
 * selectable rows with hairline-separated warning callouts; Complete Setup
 * is the single solid-accent CTA (via ScreenScaffold).
 *
 * On "Complete Setup": a volt-glow reveal washes over the screen + a larger
 * SkiaBloom (24 particles) fires, then the flow bridges into Home.
 *
 * Data wiring, hooks, validation, props — UNCHANGED. Presentation only.
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";

import { View, StyleSheet, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import {
  ScreenScaffold,
  Rule,
  tokens,
} from "../../../components/onboarding/fresh";
import { SkiaBloom } from "../../../components/onboarding/aurora/SkiaBloom";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../../types/onboarding";
import { useAdvancedReviewForm } from "../../../hooks/onboarding/useAdvancedReviewForm";
import { SmartAlternative } from "../../../services/validationEngine";
import { DataSummarySection } from "../../../components/onboarding/review/DataSummarySection";
import { MetabolicProfileSection } from "../../../components/onboarding/review/MetabolicProfileSection";
import { NutritionalNeedsSection } from "../../../components/onboarding/review/NutritionalNeedsSection";
import { WeightManagementSection } from "../../../components/onboarding/review/WeightManagementSection";
import { WarningCard } from "../../../components/onboarding/WarningCard";
import { AdjustmentWizard } from "../../../components/onboarding/AdjustmentWizard";

interface AdvancedReviewTabProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  onUpdate: (data: Partial<AdvancedReviewData>) => void;
  onUpdateBodyAnalysis?: (data: Partial<BodyAnalysisData>) => void;
  onUpdateWorkoutPreferences?: (data: Partial<WorkoutPreferencesData>) => void;
  onSaveToDatabase?: () => Promise<boolean>;
  onNavigateToTab?: (tabNumber: number) => void;
  isComplete: boolean;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

const AdvancedReviewTab: React.FC<AdvancedReviewTabProps> = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  onBack,
  onComplete,
  onUpdate,
  onUpdateBodyAnalysis,
  onUpdateWorkoutPreferences,
  onSaveToDatabase,
  onNavigateToTab,
  isComplete,
  isLoading = false,
}) => {
  const {
    calculatedData,
    validationResults,
    isCalculating,
    calculationError,
    showErrorWizard,
    setShowErrorWizard,
    successMessage,
    smartAlternatives,
    handleRateSelection,
    performCalculations,
    warningsAcknowledged,
    setWarningsAcknowledged,
  } = useAdvancedReviewForm({
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    onUpdate,
    onUpdateBodyAnalysis,
    onUpdateWorkoutPreferences,
  });

  // Session-scoped card ID: set on every explicit user tap, cleared on unmount.
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleSelectAlternative = useCallback((alt: SmartAlternative) => {
    setSelectedCardId(alt.id);
    handleRateSelection(alt);
  }, [handleRateSelection]);

  const selectedAlternativeId = useMemo(() => {
    if (selectedCardId && smartAlternatives?.alternatives?.some(a => a.id === selectedCardId)) {
      return selectedCardId;
    }
    const goal = workoutPreferences?.weekly_weight_loss_goal;
    if (!goal || !smartAlternatives?.alternatives?.length) return null;
    let bestMatch: SmartAlternative | null = null;
    let bestDiff = Infinity;
    for (const alt of smartAlternatives.alternatives) {
      const diff = Math.abs(alt.weeklyRate - goal);
      if (diff < 0.015 && diff < bestDiff) {
        bestMatch = alt;
        bestDiff = diff;
      }
    }
    return bestMatch?.id ?? null;
  }, [selectedCardId, workoutPreferences?.weekly_weight_loss_goal, smartAlternatives]);

  // Auto-surface the AdjustmentWizard whenever validation produces blocking errors.
  useEffect(() => {
    if (validationResults && validationResults.errors.length > 0) {
      setShowErrorWizard(true);
    }
  }, [validationResults, setShowErrorWizard]);

  const hasBlockingWarnings =
    (validationResults?.warnings?.length ?? 0) > 0 && !warningsAcknowledged;
  const hasBlockingErrors = (validationResults?.errors?.length ?? 0) > 0;
  const isCompleteDisabled =
    !isComplete ||
    isCalculating ||
    !!calculationError ||
    hasBlockingWarnings ||
    hasBlockingErrors;

  // ── Payoff reveal state ──
  // On "Complete Setup": wash a volt glow over the screen, fire a larger
  // SkiaBloom (24 particles), then bridge into Home via onComplete.
  const [revealTrigger, setRevealTrigger] = useState(false);
  const [bloomTrigger, setBloomTrigger] = useState(false);
  const revealOpacity = useSharedValue(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bloomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    revealOpacity.value = revealTrigger
      ? withTiming(1, { duration: 800, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      : withTiming(0, { duration: 300 });
  }, [revealTrigger, revealOpacity]);

  const revealGradientStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
  }));

  const handleComplete = useCallback(() => {
    if (isCompleteDisabled) return;
    // Fire the glow reveal + larger bloom.
    setRevealTrigger(true);
    setBloomTrigger(false);
    requestAnimationFrame(() => setBloomTrigger(true));
    if (bloomTimer.current) clearTimeout(bloomTimer.current);
    bloomTimer.current = setTimeout(() => setBloomTrigger(false), 900);
    // Bridge into Home after the reveal plays.
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => {
      onComplete();
    }, 700);
  }, [isCompleteDisabled, onComplete]);

  useEffect(() => {
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
      if (bloomTimer.current) clearTimeout(bloomTimer.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ScreenScaffold
        question="Your Plan"
        subtext="Everything you told us, turned into a plan. Tap any number to adjust its source."
        onBack={onBack}
        onNext={handleComplete}
        nextLabel={isLoading || isCalculating ? "Processing..." : "Complete Setup"}
        nextDisabled={isCompleteDisabled}
      >
        {calculationError && (
          <View style={styles.callout}>
            <Rule />
            <View style={styles.calloutRow}>
              <Ionicons name="alert-circle" size={18} color={tokens.danger} />
              <Text style={styles.calloutTextDanger}>{calculationError}</Text>
            </View>
            <Pressable
              onPress={() => performCalculations()}
              style={styles.retryButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Retry calculation"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
            <Rule />
          </View>
        )}

        {successMessage && (
          <View style={styles.callout}>
            <Rule />
            <View style={styles.calloutRow}>
              <Ionicons name="checkmark-circle" size={18} color={tokens.accent} />
              <Text style={styles.calloutText}>{successMessage}</Text>
            </View>
            <Rule />
          </View>
        )}

        {/* Reveal narrative (destination → plan → proof), staggered as one
            cascade: inputs → the goal → your daily fuel → the math underneath.
            Each section offsets its internal row stagger by enterDelay. */}
        <DataSummarySection
          personalInfo={personalInfo}
          dietPreferences={dietPreferences}
          bodyAnalysis={bodyAnalysis}
          workoutPreferences={workoutPreferences}
          calculatedData={calculatedData}
          onNavigateToTab={onNavigateToTab}
          enterDelay={0}
        />

        {/* Destination — locked goal hero + anticipation line */}
        <WeightManagementSection
          calculatedData={calculatedData}
          bodyAnalysis={bodyAnalysis}
          onNavigateToTab={onNavigateToTab}
          enterDelay={140}
        />

        {/* The plan — calorie hero + macro system */}
        <NutritionalNeedsSection
          calculatedData={calculatedData}
          onNavigateToTab={onNavigateToTab}
          enterDelay={300}
        />

        {/* The proof — BMR/TDEE/metabolic age, quiet trust layer */}
        <MetabolicProfileSection
          calculatedData={calculatedData}
          onNavigateToTab={onNavigateToTab}
          personalInfoAge={personalInfo?.age ?? null}
          enterDelay={460}
        />

        {!isCalculating && (
          (validationResults && validationResults.warnings.length > 0) ||
          smartAlternatives?.showRateComparison
        ) && (
          <Animated.View
            style={styles.warningWrap}
            entering={FadeInDown.duration(300).delay(600)}
          >
            <WarningCard
              warnings={validationResults?.warnings ?? []}
              onAcknowledgmentChange={(acknowledged) => {
                setWarningsAcknowledged(acknowledged);
              }}
              smartAlternatives={smartAlternatives}
              selectedAlternativeId={selectedAlternativeId}
              onSelectAlternative={handleSelectAlternative}
            />
          </Animated.View>
        )}
      </ScreenScaffold>

      {/* Volt payoff reveal — a screen-wide accent glow that washes in on
          "Complete Setup" before bridging into Home. Sits above all content
          and never intercepts touches. */}
      <Animated.View
        style={[styles.revealLayer, revealGradientStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            "rgba(255,107,53,0.22)",
            "rgba(255,107,53,0.06)",
            "rgba(255,107,53,0)",
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Larger SkiaBloom (24 particles) for the payoff reveal — centered. */}
      <SkiaBloom
        trigger={bloomTrigger}
        color={tokens.accent}
        count={24}
        style={styles.payoffBloom}
      />

      {showErrorWizard &&
        validationResults &&
        validationResults.errors.length > 0 && (
          <AdjustmentWizard
            visible={showErrorWizard}
            onClose={() => setShowErrorWizard(false)}
            onSaveToDatabase={onSaveToDatabase}
            error={validationResults.errors[0]}
            currentData={{
              bmr: calculatedData?.calculated_bmr || 0,
              tdee: calculatedData?.calculated_tdee || 0,
              currentWeight: bodyAnalysis?.current_weight_kg || 0,
              targetWeight: bodyAnalysis?.target_weight_kg || 0,
              currentTimeline: bodyAnalysis?.target_timeline_weeks || 0,
              currentFrequency:
                workoutPreferences?.workout_frequency_per_week || 0,
              // S15: let wizard options floor calories at the sex-based absolute
              // minimum and clamp target weights to the healthy-BMI floor.
              gender: personalInfo?.gender ?? undefined,
              heightCm: bodyAnalysis?.height_cm ?? undefined,
            }}
            primaryGoals={workoutPreferences?.primary_goals || []}
            onSelectAlternative={(alt) => {
              const smartAlt = smartAlternatives?.alternatives.find(
                (sa) =>
                  Math.abs(sa.weeklyRate - alt.weeklyRate) < 0.005 &&
                  Math.abs(sa.dailyCalories - alt.dailyCalories) < 5,
              );
              if (smartAlt) {
                handleSelectAlternative(smartAlt);
              } else {
                const hasExercise = !!alt.newWorkoutFrequency;
                handleSelectAlternative({
                  id: "custom-" + alt.name,
                  label: alt.name,
                  description: alt.approach,
                  dailyCalories: alt.dailyCalories,
                  weeklyRate: alt.weeklyRate,
                  riskLevel: "moderate",
                  isRecommended: false,
                  isUserOriginal: false,
                  bmrDifference: 0,
                  isBlocked: false,
                  requiresExercise: hasExercise,
                  exerciseType: hasExercise
                    ? (alt.newIntensity === "advanced" ? "intense" : alt.newIntensity === "beginner" ? "light" : "moderate")
                    : undefined,
                  exerciseMinutes: alt.newCardioMinutes ?? undefined,
                  exerciseSessions: alt.newWorkoutFrequency ?? undefined,
                  exerciseCaloriesBurned: undefined,
                  exerciseDescription: alt.newCardioMinutes ? `${alt.newCardioMinutes} min cardio` : undefined,
                  timelineWeeks: alt.newTimeline || 12,
                  isBelowBMR: false,
                } as SmartAlternative);
              }
            }}
          />
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  callout: {
    marginBottom: 24,
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  calloutText: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink,
  },
  calloutTextDanger: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: tokens.danger,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingRight: 12,
    marginBottom: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  retryText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    color: tokens.accent,
  },
  warningWrap: {
    marginTop: 36,
  },
  revealLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  payoffBloom: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
});

export default AdvancedReviewTab;
