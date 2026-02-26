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

  // Calculate all metrics when component mounts or data changes
  // Body analysis is optional — proceed even if it’s missing or has no data entered
  useEffect(() => {
    if (personalInfo && dietPreferences && workoutPreferences) {
      performCalculations();
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

  // Auto-select the user's original rate if no selection yet
  useEffect(() => {
    if (
      smartAlternatives &&
      !selectedAlternativeId &&
      smartAlternatives.alternatives.length > 0
    ) {
      const userOriginal = smartAlternatives.alternatives.find(
        (alt) => alt.isUserOriginal,
      );
      if (userOriginal) {
        setSelectedAlternativeId(userOriginal.id);
      }
    }
  }, [smartAlternatives, selectedAlternativeId]);

  const handleRateSelection = useCallback(
    async (alternative: SmartAlternative) => {
      setSelectedAlternativeId(alternative.id);

      // If it's the user's original selection, no changes needed
      if (alternative.isUserOriginal) {
        return;
      }

      // Calculate the new timeline based on the selected rate
      const weightToLose = Math.abs(
        (bodyAnalysis?.current_weight_kg || 0) -
          (bodyAnalysis?.target_weight_kg || 0),
      );
      // Ensure we don't divide by zero if rate is somehow 0 (unlikely for valid alternatives)
      const weeklyRate = alternative.weeklyRate || 0.5;
      const newTimelineWeeks = Math.ceil(weightToLose / weeklyRate);


      // Update body analysis with new timeline
      if (onUpdateBodyAnalysis) {
        onUpdateBodyAnalysis({
          target_timeline_weeks: newTimelineWeeks,
        });
      }

      // If exercise option, update workout preferences
      if (alternative.requiresExercise && onUpdateWorkoutPreferences) {
        // Increase workout frequency if needed for exercise options
        const currentFrequency =
          workoutPreferences?.workout_frequency_per_week || 0;
        if (currentFrequency < 3) {
          onUpdateWorkoutPreferences({
            workout_frequency_per_week: Math.max(3, currentFrequency),
          });
        }
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
