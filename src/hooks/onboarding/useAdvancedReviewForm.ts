import { useState, useEffect, useCallback, useRef } from "react";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../types/onboarding";
import { SmartAlternative } from "../../services/validationEngine";
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
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<
    string | null
  >(null);

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timeoutRefs.current.forEach(clearTimeout); }, []);
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
  }, [validationResults?.warnings]);


  const handleRateSelection = useCallback(
    async (alternative: SmartAlternative) => {
      setSelectedAlternativeId(alternative.id);

      // Calculate the new timeline based on the selected rate
      const weightToLose = Math.abs(
        (bodyAnalysis?.current_weight_kg || 0) -
          (bodyAnalysis?.target_weight_kg || 0),
      );
      // Ensure we don't divide by zero if rate is somehow 0 (unlikely for valid alternatives)
      const weeklyRate = alternative.weeklyRate || 0.5;
      const newTimelineWeeks = Math.ceil(weightToLose / weeklyRate);

      // BUG-32: Always sync weekly rate to workout preferences (even for "KEEP MY GOAL")
      // so the AI planner uses the confirmed value.
      if (onUpdateWorkoutPreferences) {
        onUpdateWorkoutPreferences({
          weekly_weight_loss_goal: Math.round(weeklyRate * 100) / 100,
        });
      }

      // Only update timeline when user picks a different rate (not "KEEP MY GOAL")
      if (!alternative.isUserOriginal && onUpdateBodyAnalysis) {
        onUpdateBodyAnalysis({
          target_timeline_weeks: newTimelineWeeks,
        });
      }

      // If exercise option, also update workout frequency, type, duration, and intensity
      if (alternative.requiresExercise && onUpdateWorkoutPreferences) {
        const currentFrequency = workoutPreferences?.workout_frequency_per_week || 0;
        const exerciseTypeMap: Record<string, { types: string[]; intensity: "beginner" | "intermediate" | "advanced" }> = {
          light: { types: ["cardio"], intensity: "beginner" },
          moderate: { types: ["cardio", "mixed"], intensity: "intermediate" },
          intense: { types: ["hiit", "mixed"], intensity: "advanced" },
        };
        const exerciseMeta =
          exerciseTypeMap[(alternative as any).exerciseType ?? "moderate"] ??
          exerciseTypeMap.moderate;
        onUpdateWorkoutPreferences({
          workout_frequency_per_week: Math.max(3, currentFrequency),
          workout_types: exerciseMeta.types,
          time_preference: alternative.exerciseMinutes ?? workoutPreferences?.time_preference ?? 30,
          intensity: exerciseMeta.intensity,
        });
      }

      // Show success message
      setSuccessMessage(
        `Rate updated to ${alternative.weeklyRate} kg/week. Recalculating...`,
      );

      // useEffect watching bodyAnalysis will trigger recalculation automatically.
      const t1 = setTimeout(() => setSuccessMessage(null), 3000);
      timeoutRefs.current.push(t1);
    },
    [
      bodyAnalysis,
      workoutPreferences,
      onUpdateBodyAnalysis,
      onUpdateWorkoutPreferences,
    ],
  );

  return {
    // Validation Hook Data
    validationResults,
    calculatedData,
    isCalculating,
    calculationError,
    smartAlternatives,

    // Form State
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
    selectedAlternativeId,
    setSelectedAlternativeId,

    // Handlers
    handleRateSelection,
    performCalculations,
  };
};
