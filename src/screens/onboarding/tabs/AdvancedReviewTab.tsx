import React, { useMemo, useState, useCallback, useEffect } from "react";

import { View, StyleSheet, ScrollView, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rbr, rh } from "../../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { HeroSection } from "../../../components/ui/aurora";
import { gradients } from "../../../theme/gradients";
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
  const insets = useSafeAreaInsets();

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
  // This is the primary SSOT for highlighted card — no fuzzy rate matching needed
  // within a session. Survives re-renders but not tab switches (by design: if the
  // user goes back to Tab 3 and changes data, old card IDs are stale anyway).
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleSelectAlternative = useCallback((alt: SmartAlternative) => {
    setSelectedCardId(alt.id);
    handleRateSelection(alt);
  }, [handleRateSelection]);

  // selectedAlternativeId:
  //   1. Use session-scoped selectedCardId if the user has tapped a card this session
  //      → 100% unambiguous (no rate collision possible)
  //   2. Fall back to min-distance rate match for restored state (tab switch / reload)
  //      → min-distance is correct for all current cards; only identical-rate ties
  //        remain ambiguous, but those cards are functionally equivalent anyway
  const selectedAlternativeId = useMemo(() => {
    // Primary: exact card ID from this session's tap
    if (selectedCardId && smartAlternatives?.alternatives?.some(a => a.id === selectedCardId)) {
      if (__DEV__) console.warn('[PACE MATCH] session ID ->', selectedCardId);
      return selectedCardId;
    }
    // Fallback: minimum-distance rate match
    const goal = workoutPreferences?.weekly_weight_loss_goal;
    if (!goal || !smartAlternatives?.alternatives?.length) return null;
    if (__DEV__) {
      console.warn(
        '[PACE MATCH] fallback - goal =', goal, 'kg/wk',
        '| cards:', smartAlternatives.alternatives.map(a => `${a.id}(${a.weeklyRate})`).join(', '),
      );
    }
    let bestMatch: SmartAlternative | null = null;
    let bestDiff = Infinity;
    for (const alt of smartAlternatives.alternatives) {
      const diff = Math.abs(alt.weeklyRate - goal);
      if (diff < 0.015 && diff < bestDiff) {
        bestMatch = alt;
        bestDiff = diff;
      }
    }
    if (__DEV__) {
      console.warn('[PACE MATCH] fallback result ->', bestMatch?.id ?? 'NO MATCH');
    }
    return bestMatch?.id ?? null;
  }, [selectedCardId, workoutPreferences?.weekly_weight_loss_goal, smartAlternatives]);

  // Auto-surface the AdjustmentWizard whenever validation produces blocking errors.
  // Without this, the "Complete Setup" button stays disabled (errors.length > 0) but
  // the wizard never appears (showErrorWizard is initialized false and only toggled
  // by other paths), leaving the user stuck with no way to resolve the error.
  useEffect(() => {
    if (validationResults && validationResults.errors.length > 0) {
      setShowErrorWizard(true);
    }
  }, [validationResults, setShowErrorWizard]);


  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: rp(80) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HeroSection
          image={{
            uri: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
          }}
          overlayGradient={gradients.overlay.dark}
        >
          <Text style={styles.heroTitle} numberOfLines={2}>Review Your Plan</Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>
            We've analyzed your data to create a personalized plan.
          </Text>
        </HeroSection>

        {calculationError && (
          <GlassCard style={styles.errorCard}>
            <Ionicons
              name="alert-circle"
              size={24}
              color={colors.error}
            />
            <Text style={styles.errorText}>{calculationError}</Text>
            <Pressable
              onPress={() => performCalculations()}
              style={{ paddingHorizontal: rp(12), paddingVertical: rp(6), borderRadius: rbr(8), borderWidth: 1, borderColor: colors.error }}
            >
              <Text style={{ color: colors.error, fontSize: rf(14) }}>Retry</Text>
            </Pressable>
          </GlassCard>
        )}

        {successMessage && (
          <GlassCard style={styles.successCard} padding="md" borderRadius="lg">
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={colors.success}
            />
            <Text style={styles.successText}>{successMessage}</Text>
          </GlassCard>
        )}

        <DataSummarySection
          personalInfo={personalInfo}
          dietPreferences={dietPreferences}
          bodyAnalysis={bodyAnalysis}
          workoutPreferences={workoutPreferences}
          calculatedData={calculatedData}
          onNavigateToTab={onNavigateToTab}
        />

        <MetabolicProfileSection calculatedData={calculatedData} />

        <NutritionalNeedsSection calculatedData={calculatedData} />

        <WeightManagementSection
          calculatedData={calculatedData}
          bodyAnalysis={bodyAnalysis}
          onNavigateToTab={onNavigateToTab}
        />

        {!isCalculating && (
          (validationResults && validationResults.warnings.length > 0) ||
          smartAlternatives?.showRateComparison
        ) && (
          <View style={{ paddingHorizontal: rp(20), marginTop: rp(16) }}>
            <WarningCard
              warnings={validationResults?.warnings ?? []}
              onAcknowledgmentChange={(acknowledged) => {
                setWarningsAcknowledged(acknowledged);
              }}
              smartAlternatives={smartAlternatives}
              selectedAlternativeId={selectedAlternativeId}
              onSelectAlternative={handleSelectAlternative}
            />
          </View>
        )}

        <View style={{ height: rh(80) }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.backButtonCompact} onPress={onBack}>
          <Ionicons name="chevron-back" size={rf(18)} color={colors.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[
            styles.completeButtonCompact,
            {
              backgroundColor: (!isComplete || isCalculating || !!calculationError || ((validationResults?.warnings?.length ?? 0) > 0 && !warningsAcknowledged) || ((validationResults?.errors?.length ?? 0) > 0))
                ? colors.textMuted
                : colors.primary,
              opacity: (!isComplete || isCalculating || !!calculationError || ((validationResults?.warnings?.length ?? 0) > 0 && !warningsAcknowledged) || ((validationResults?.errors?.length ?? 0) > 0)) ? 0.5 : 1,
            }
          ]}
          onPress={onComplete}
          disabled={!isComplete || isCalculating || !!calculationError || ((validationResults?.warnings?.length ?? 0) > 0 && !warningsAcknowledged) || ((validationResults?.errors?.length ?? 0) > 0)}
          accessibilityHint="Complete all required sections to enable"
        >
          <Text style={styles.completeButtonText}>
            {isLoading || isCalculating ? 'Processing...' : 'Complete Setup'}
          </Text>
          <Ionicons name="checkmark-circle" size={rf(18)} color={colors.white} />
        </Pressable>
      </View>

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
                // BUG-45: Wire ALL wizard Alternative fields into the SmartAlternative
                // so handleRateSelection can properly sync exercise params downstream.
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
    backgroundColor: colors.background,
  },
  scrollContent: {
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: `${colors.white}0F`,
    elevation: 4,
  },
  backButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  backButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
    lineHeight: rf(18),
  },
  completeButtonCompact: {
    flex: 1,
    marginLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 52,
  },
  completeButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  successCard: {
    margin: rp(20),
    flexDirection: "row",
    alignItems: "center",
    gap: rp(12),
    backgroundColor: `${colors.success}20`,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
  },
  successText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  heroTitle: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: colors.white,
    marginBottom: rp(8),
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: rf(16),
    color: `${colors.white}CC`,
    textAlign: "center",
    marginBottom: rp(20),
  },
  errorCard: {
    margin: rp(20),
    backgroundColor: `${colors.error}1A`,
    borderColor: `${colors.error}4D`,
    borderWidth: 1,
    padding: rp(16),
    alignItems: "center",
    gap: rp(12),
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: rf(14),
    textAlign: "center",
  },
});

export default AdvancedReviewTab;
