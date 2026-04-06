import { useState, useEffect, useCallback, useRef } from "react";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../types/onboarding";
import { SmartAlternative } from "../../services/validationEngine";
import { DEFAULT_EXERCISE_SESSIONS_PER_WEEK } from "../../services/validation/constants";
import { useReviewValidation } from "./useReviewValidation";

interface UseAdvancedReviewFormProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  onUpdate: (data: Partial<AdvancedReviewData>) => void;
  onUpdateBodyAnalysis?: (data: Partial<BodyAnalysisData>) => void;
  onUpdateWorkoutPreferences?: (data: Partial<WorkoutPreferencesData>) => void;
}

export const useAdvancedReviewForm = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  onUpdate,
  onUpdateBodyAnalysis,
  onUpdateWorkoutPreferences,
}: UseAdvancedReviewFormProps) => {
  const [showErrorWizard, setShowErrorWizard] = useState(false);
  const [showWarningWizard, setShowWarningWizard] = useState(false);
  const [currentError, setCurrentError] = useState<any | null>(null);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // D5: selectedAlternativeId is no longer stored as transient state here.
  // It is derived in AdvancedReviewTab from workoutPreferences.weekly_weight_loss_goal
  // which is the persisted SSOT for the chosen rate.

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timeoutRefs.current.forEach(clearTimeout); }, []);
  const hasAutoSelectedRef = useRef(false);
  const {
    validationResults,
    calculatedData,
    isCalculating,
    calculationError,
    smartAlternatives,
    performCalculations,
    setCalculatedData,
    setSmartAlternatives,
  } = useReviewValidation({
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    onUpdate,
  });

  // Calculate all metrics when component mounts or data changes.
  // BUG-37 fix: ALWAYS bypass the deficit cap so the user sees their actual
  // selected goal on first load. The engine still emits the DEFICIT_LIMITED_FOR_SAFETY
  // warning (informational) but it no longer silently replaces their calorie target.
  // The cap only floor is BMR — eating below your own metabolic rate is never allowed.
  useEffect(() => {
    if (personalInfo && dietPreferences && workoutPreferences) {
      performCalculations({ bypassDeficitLimit: true });
    }
  }, [
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    performCalculations,
  ]);

  // Reset acknowledgment when warnings change
  useEffect(() => {
    setWarningsAcknowledged(false);
  }, [validationResults?.warnings?.map(w => w.code).join(',')]);

  // Auto-select best option on first Tab 5 load:
  // - Weight loss + KEEP MY GOAL blocked → select bestBoostOptionId (or AT YOUR BMR fallback)
  // - Maintenance → select BODY RECOMP
  // Guard with hasAutoSelectedRef so it fires once even across recalculations.
  useEffect(() => {
    if (!smartAlternatives || hasAutoSelectedRef.current) return;

    // H5: Guard against re-firing auto-select on tab remount when the user
    // has already explicitly chosen a non-original pace card. If the stored
    // weekly_weight_loss_goal differs from the user_original card's rate by
    // more than 0.015, the user already made an explicit choice — treat the
    // ref as already set and bail out immediately.
    const storedGoal = workoutPreferences?.weekly_weight_loss_goal;
    const userOriginalCard = smartAlternatives.alternatives.find(a => a.isUserOriginal);
    const userAlreadyChoseExplicitly =
      storedGoal &&
      userOriginalCard &&
      Math.abs(storedGoal - userOriginalCard.weeklyRate) > 0.015;
    if (userAlreadyChoseExplicitly) {
      hasAutoSelectedRef.current = true;
      return;
    }

    let targetId: string | null = null;

    if (smartAlternatives.goalMode === "loss") {
      const userOriginal = smartAlternatives.alternatives.find(a => a.isUserOriginal);
      if (userOriginal?.isBlocked) {
        targetId = smartAlternatives.bestBoostOptionId ?? "at_bmr";
      }
    } else if (smartAlternatives.goalMode === "maintenance") {
      targetId = "recomp";
    }

    if (targetId) {
      const target = smartAlternatives.alternatives.find(a => a.id === targetId);
      if (target) {
        hasAutoSelectedRef.current = true;
        handleRateSelection(target);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartAlternatives, workoutPreferences]);

  const handleRateSelection = useCallback(
    async (alternative: SmartAlternative) => {
      // BUG-46: Use Math.ceil to match smartAlternatives.ts card timeline calculation.
      // Both the card and the stored timeline must agree so the chart shows the same
      // number of weeks that the card promised. Math.ceil rounds up fractional weeks
      // (e.g. 19.32 → 20) which is the correct approach: you can't do 0.32 of a week.
      const weightToLose = Math.abs(
        (bodyAnalysis?.current_weight_kg || 0) -
          (bodyAnalysis?.target_weight_kg || 0),
      );
      const weeklyRate = alternative.weeklyRate || 0.5;
      const newTimelineWeeks =
        weeklyRate > 0
          ? Math.ceil(weightToLose / weeklyRate)
          : bodyAnalysis?.target_timeline_weeks || 16;

      // BUG-32: Always sync weekly rate to workout preferences (even for "KEEP MY GOAL")
      if (onUpdateWorkoutPreferences) {
        onUpdateWorkoutPreferences({
          weekly_weight_loss_goal: Math.round(weeklyRate * 100) / 100,
        });
      }

      // D3-FIX: All non-KEEP-MY-GOAL options update target_timeline_weeks —
      // including exercise options. This wires exercise card selection into the chart:
      // e.g. MODERATE ACTIVITY (1.16 kg/wk) correctly shows 15-week timeline.
      if (!alternative.isUserOriginal && onUpdateBodyAnalysis) {
        onUpdateBodyAnalysis({
          target_timeline_weeks: newTimelineWeeks,
        });
      } else if (alternative.isUserOriginal) {
        // KEEP MY GOAL: deps haven't changed so useEffect won't auto-fire.
        performCalculations({ bypassDeficitLimit: true });
      }

      // Exercise option handling — behaviour differs by type:
      //   boost_*: cardio boost added ON TOP of existing workout plan.
      //            DO NOT change time_preference, workout_types, or intensity.
      //            The workout plan is unchanged; SSOT updates via weekly_weight_loss_goal only.
      //   freq_*:  frequency upgrade for gainers — update workout frequency only.
      //   others:  legacy LIGHT/MODERATE/INTENSE activity — replace full workout plan.
      if (alternative.requiresExercise && onUpdateWorkoutPreferences) {
        const isBoostType = alternative.exerciseType?.startsWith("boost_");
        const isFreqUpgrade = alternative.isFrequencyUpgrade;

        if (isBoostType) {
          // Boost options: keep existing workout plan untouched
        } else if (isFreqUpgrade) {
          onUpdateWorkoutPreferences({
            workout_frequency_per_week: alternative.exerciseSessions ?? workoutPreferences?.workout_frequency_per_week,
          });
        } else {
          // Legacy exercise type (LIGHT/MODERATE/INTENSE activity): replace workout plan
          const exerciseTypeMap: Record<string, { types: string[]; intensity: "beginner" | "intermediate" | "advanced" }> = {
            light: { types: ["cardio"], intensity: "beginner" },
            moderate: { types: ["cardio", "mixed"], intensity: "intermediate" },
            intense: { types: ["hiit", "mixed"], intensity: "advanced" },
          };
          const exerciseMeta =
            exerciseTypeMap[alternative.exerciseType ?? "moderate"] ??
            exerciseTypeMap.moderate;
          onUpdateWorkoutPreferences({
            workout_frequency_per_week: alternative.exerciseSessions ?? DEFAULT_EXERCISE_SESSIONS_PER_WEEK,
            workout_types: exerciseMeta.types,
            time_preference: alternative.exerciseMinutes ?? workoutPreferences?.time_preference,
            intensity: exerciseMeta.intensity,
          });
        }
      }

      // 🔍 ONBOARDING DEBUG — Pace card selected (Tab 5: Choose Your Pace)
      if (__DEV__) {
        // Determine which store fields were updated based on card type
        const isBoostType = alternative.requiresExercise && alternative.exerciseType?.startsWith('boost_');
        const isFreqUpgrade = alternative.requiresExercise && alternative.isFrequencyUpgrade;
        const isLegacyExercise = alternative.requiresExercise && !isBoostType && !isFreqUpgrade;

        const exerciseTypeMap: Record<string, { types: string[]; intensity: string }> = {
          light:    { types: ['cardio'],         intensity: 'beginner' },
          moderate: { types: ['cardio', 'mixed'], intensity: 'intermediate' },
          intense:  { types: ['hiit', 'mixed'],   intensity: 'advanced' },
        };
        const legacyMeta = isLegacyExercise
          ? (exerciseTypeMap[alternative.exerciseType ?? 'moderate'] ?? exerciseTypeMap.moderate)
          : null;

        console.warn(
          '\n\n🔄🔄🔄 ================================================== 🔄🔄🔄',
          '\n🔄     PACE CARD SELECTED (Tab 5: Choose Your Pace)        🔄',
          '\n🔄🔄🔄 ================================================== 🔄🔄🔄',
          '\n',
          '\n====== 🃏 SELECTED CARD ======',
          '\ncard ID                  :', alternative.id,
          '\ncard label               :', alternative.label,
          '\nisUserOriginal (KEEP MY GOAL):', alternative.isUserOriginal,
          '\nrequiresExercise         :', alternative.requiresExercise,
          '\nexerciseType             :', alternative.exerciseType ?? 'n/a',
          '\nexerciseSessions         :', alternative.exerciseSessions ?? 'n/a',
          '\nexerciseMinutes          :', alternative.exerciseMinutes ?? 'n/a',
          '\nisBelowBMR               :', (alternative as any).isBelowBMR ?? false,
          '\nisBlocked                :', (alternative as any).isBlocked ?? false,
          '\n',
          '\n====== 📐 RATE & TIMELINE ======',
          '\nweeklyRate (selected card):', weeklyRate, 'kg/wk',
          '\nweightToLose             :', weightToLose.toFixed(2), 'kg',
          '\nnewTimelineWeeks         :', newTimelineWeeks, 'weeks',
          '\n',
          '\n====== 📝 STORE UPDATES DISPATCHED ======',
          '\nworkoutPreferences.weekly_weight_loss_goal →', Math.round(weeklyRate * 100) / 100, 'kg/wk',
          isBoostType
            ? '\n[BOOST type] workout plan UNCHANGED (no freq/type/intensity update)'
            : isFreqUpgrade
              ? '\nworkoutPreferences.workout_frequency_per_week →' + (alternative.exerciseSessions ?? workoutPreferences?.workout_frequency_per_week)
              : isLegacyExercise && legacyMeta
                ? `\nworkoutPreferences.workout_frequency_per_week → ${alternative.exerciseSessions ?? 5}`
                  + `\nworkoutPreferences.workout_types           → ${JSON.stringify(legacyMeta.types)}`
                  + `\nworkoutPreferences.time_preference         → ${alternative.exerciseMinutes ?? workoutPreferences?.time_preference} min`
                  + `\nworkoutPreferences.intensity               → ${legacyMeta.intensity}`
                : '\n[No additional workout pref changes]',
          '\nbodyAnalysis.target_timeline_weeks →', alternative.isUserOriginal ? '(NOT updated — KEEP MY GOAL)' : newTimelineWeeks,
          '\n',
          '\n🔄🔄🔄 ================================================== 🔄🔄🔄\n',
        );
      }

      setSuccessMessage(
        `Rate updated to ${alternative.weeklyRate} kg/week. Recalculating...`,
      );
      const t1 = setTimeout(() => setSuccessMessage(null), 3000);
      timeoutRefs.current.push(t1);
    },
    [
      bodyAnalysis,
      workoutPreferences,
      onUpdateBodyAnalysis,
      onUpdateWorkoutPreferences,
      performCalculations,
    ],
  );

  return {
    validationResults,
    calculatedData,
    isCalculating,
    calculationError,
    smartAlternatives,
    showErrorWizard,
    setShowErrorWizard,
    showWarningWizard,
    setShowWarningWizard,
    currentError,
    setCurrentError,
    warningsAcknowledged,
    setWarningsAcknowledged,
    successMessage,
    setSuccessMessage,
    // D5: selectedAlternativeId removed — derived from workoutPreferences.weekly_weight_loss_goal in AdvancedReviewTab
    handleRateSelection,
    performCalculations,
  };
};
