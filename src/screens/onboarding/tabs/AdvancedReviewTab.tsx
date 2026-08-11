/**
 * S5 "Plan" — AdvancedReviewTab
 *
 * The payoff screen, re-skinned to the "Editorial Dark" language (no cards):
 * metric rows (micro-label left, big Manrope value right) separated by
 * hairlines under SectionLabels; the pace picker renders as the screen's
 * single contrasting block — a low-alpha volt panel holding the named pace
 * tiers (Relaxed / Comfortable / Recommended / Your goal), each selection
 * re-deriving calories, deficit and timeline from the ValidationEngine SSOT;
 * Complete Setup is the single solid-accent CTA (via ScreenScaffold).
 *
 * On "Complete Setup": once the save is confirmed, a volt-glow reveal washes
 * over the screen + a larger SkiaBloom (24 particles) fires. Only after that
 * celebration has played out (~900ms) does the flow hand off to the
 * full-screen completion modal (mounted by the parent via
 * onCelebrationComplete) — sequenced this way so the modal, a non-transparent
 * native RN Modal, doesn't cover the celebration the instant save succeeds.
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
  // Real contract: resolves true on a confirmed save, false on failure.
  // (useOnboardingLogic.handleCompleteOnboarding is the sole caller today.)
  onComplete: () => Promise<boolean>;
  // Fired once the payoff celebration (glow reveal + bloom) has had its
  // on-screen window — the parent uses this to mount the full-screen
  // completion modal without covering the celebration. Optional so the
  // component still degrades gracefully with no follow-up if unwired.
  onCelebrationComplete?: () => void;
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
  onCelebrationComplete,
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
  // On "Complete Setup": await the real save result, then wash a volt glow
  // over the screen and fire a larger SkiaBloom (24 particles) — only once
  // completion is confirmed.
  const [revealTrigger, setRevealTrigger] = useState(false);
  const [bloomTrigger, setBloomTrigger] = useState(false);
  const revealOpacity = useSharedValue(0);
  const bloomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    revealOpacity.value = revealTrigger
      ? withTiming(1, { duration: 800, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      : withTiming(0, { duration: 300 });
  }, [revealTrigger, revealOpacity]);

  const revealGradientStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
  }));

  const handleComplete = useCallback(async () => {
    if (isCompleteDisabled) return;
    // Wait for the actual save result before celebrating — firing the glow
    // reveal ahead of a failed save leaves the screen stuck in a "success"
    // tint underneath the error dialog.
    const success = await onComplete();
    if (!success) {
      // Save failed: make sure no stale reveal is left mid-animation and
      // bail without triggering the celebration or the completion modal.
      setRevealTrigger(false);
      return;
    }
    // Save confirmed — play the glow reveal + larger bloom first. The
    // completion modal (a full-screen, non-transparent native Modal) is
    // deliberately NOT shown yet: mounting it now would cover this
    // celebration the instant it starts. onCelebrationComplete is called
    // once the wash + bloom have had their full on-screen window, handing
    // off to the parent to present the modal.
    setRevealTrigger(true);
    setBloomTrigger(false);
    requestAnimationFrame(() => setBloomTrigger(true));
    if (bloomTimer.current) clearTimeout(bloomTimer.current);
    bloomTimer.current = setTimeout(() => {
      setBloomTrigger(false);
      onCelebrationComplete?.();
    }, 900);
  }, [isCompleteDisabled, onComplete, onCelebrationComplete]);

  // Keep the latest callback available to the mount/unmount-only effect
  // below without putting it in that effect's dependency array — the parent
  // passes an inline arrow (new identity every render), and depending on it
  // directly would run the *cleanup* on every such re-render (React re-runs
  // an effect's cleanup whenever a dependency changes, not just on
  // unmount), firing onCelebrationComplete mid-celebration and showing the
  // completion modal over the still-playing glow/bloom.
  const onCelebrationCompleteRef = useRef(onCelebrationComplete);
  useEffect(() => {
    onCelebrationCompleteRef.current = onCelebrationComplete;
  }, [onCelebrationComplete]);

  useEffect(() => {
    return () => {
      // Empty deps: this cleanup only runs on true unmount (backgrounding,
      // remount, error-boundary reset). If it fires while the celebration
      // is still mid-flight, the queued setTimeout below is torn down and
      // would otherwise never fire — that would leave the parent's
      // showCompletionModal permanently unset after a fully successful
      // save. Hand off to the parent immediately instead of losing the
      // signal, even though the on-screen celebration itself is cut short.
      if (bloomTimer.current) {
        clearTimeout(bloomTimer.current);
        bloomTimer.current = null;
        onCelebrationCompleteRef.current?.();
      }
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

        {/* Persistent blocking-error callout: the AdjustmentWizard auto-surfaces
            on recalculation, but applying an alternative (or dismissing it)
            closes the sheet while the underlying error can still be active —
            leaving Complete Setup disabled with zero on-screen explanation.
            Keep the reason + a reopen path visible whenever that happens. */}
        {hasBlockingErrors && !showErrorWizard && (
          <View style={styles.callout}>
            <Rule />
            <View style={styles.calloutRow}>
              <Ionicons name="alert-circle" size={18} color={tokens.danger} />
              <Text style={styles.calloutTextDanger}>
                {typeof validationResults?.errors[0] === "string"
                  ? validationResults.errors[0]
                  : (validationResults?.errors[0]?.message ??
                    "Your plan needs adjustment before continuing.")}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowErrorWizard(true)}
              style={styles.retryButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Review plan adjustment options"
            >
              <Text style={styles.retryText}>Review options</Text>
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
          units={personalInfo?.units ?? null}
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
              selectedWeeklyRate={
                workoutPreferences?.weekly_weight_loss_goal ?? null
              }
              onSelectAlternative={handleSelectAlternative}
            />
          </Animated.View>
        )}
      </ScreenScaffold>

      {/* Volt payoff reveal — a screen-wide accent glow that washes in once
          the save is confirmed, playing out fully (~900ms) before
          onCelebrationComplete hands off to the completion modal. Sits
          above all content and never intercepts touches. */}
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
