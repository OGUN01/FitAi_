import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../types/onboarding";
import { MetabolicCalculations } from "../../utils/healthCalculations";
import {
  STANDARD_GYM_EQUIPMENT,
  OCCUPATION_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
} from "../../screens/onboarding/tabs/WorkoutPreferencesConstants";

interface UseWorkoutPreferencesProps {
  data: WorkoutPreferencesData | null;
  bodyAnalysisData?: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onUpdate: (data: Partial<WorkoutPreferencesData>) => void;
}

export const useWorkoutPreferences = ({
  data,
  bodyAnalysisData,
  personalInfoData,
  validationResult,
  onUpdate,
}: UseWorkoutPreferencesProps) => {
  // Tooltip modal state
  const [tooltipModal, setTooltipModal] = useState<{
    visible: boolean;
    title: string;
    description: string;
    benefits?: string[];
  }>({
    visible: false,
    title: "",
    description: "",
    benefits: [],
  });

  const showInfoTooltip = (
    title: string,
    description: string,
    benefits?: string[],
  ) => {
    setTooltipModal({
      visible: true,
      title,
      description,
      benefits,
    });
  };

  const hideInfoTooltip = () => {
    setTooltipModal((prev) => ({ ...prev, visible: false }));
  };

  // Intensity recommendation state
  const [intensityRecommendation, setIntensityRecommendation] = useState<{
    level: "beginner" | "intermediate" | "advanced";
    reasoning: string;
  } | null>(null);

  // Track whether user has manually set intensity / workout types / goals
  // Prevents useEffect auto-overrides from clobbering explicit user choices
  const hasUserSetIntensity = useRef(false);
  const hasUserSetWorkoutTypes = useRef(false);
  const hasUserSetGoals = useRef(false);

  // Form state
  const [formData, setFormData] = useState<WorkoutPreferencesData>({
    // Existing data
    location: data?.location || "both",
    equipment: data?.equipment || [],
    time_preference: data?.time_preference ?? 30,
    intensity: data?.intensity || "beginner",
    workout_types: data?.workout_types || [],

    // Enhanced data
    primary_goals: data?.primary_goals || [],
    activity_level: data?.activity_level || "sedentary",

    // Current fitness assessment
    workout_experience_years: data?.workout_experience_years || 0,
    workout_frequency_per_week: data?.workout_frequency_per_week || 0,
    can_do_pushups: data?.can_do_pushups || 0,
    can_run_minutes: data?.can_run_minutes || 0,
    flexibility_level: data?.flexibility_level || "fair",

    // Weight goals (auto-populated from body analysis)
    weekly_weight_loss_goal: data?.weekly_weight_loss_goal || undefined,

    // Preferences
    preferred_workout_times: data?.preferred_workout_times || [],
    enjoys_cardio: data?.enjoys_cardio ?? true,
    enjoys_strength_training: data?.enjoys_strength_training ?? true,
    enjoys_group_classes: data?.enjoys_group_classes ?? false,
    prefers_outdoor_activities: data?.prefers_outdoor_activities ?? false,
    needs_motivation: data?.needs_motivation ?? false,
    prefers_variety: data?.prefers_variety ?? true,
  });

  // Sync time_preference from time_commitment if the data prop carries a
  // time_commitment string (written by GoalsPreferencesEditModal) and
  // time_preference is still the default 30.  This ensures the SSOT
  // (time_preference, numeric minutes) reflects the user's chosen range.
  const hasInitializedTimeFromCommitment = useRef(false);

  useEffect(() => {
    if (hasInitializedTimeFromCommitment.current) return;
    const wpData = data as Record<string, unknown> | null;
    const tc = wpData?.time_commitment as string | undefined;
    // Only sync if there IS a time_commitment AND time_preference was never
    // explicitly set (still at default 30 or missing).
    if (tc && (!data?.time_preference || data.time_preference === 30)) {
      let minutes = 0;
      if (tc === "60+") {
        minutes = 60;
      } else {
        const rangeMatch = tc.match(/(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) {
          minutes = parseInt(rangeMatch[2], 10); // upper bound
        } else {
          const single = tc.match(/(\d+)/);
          if (single) minutes = parseInt(single[1], 10);
        }
      }
      if (minutes > 0 && minutes !== formData.time_preference) {
        hasInitializedTimeFromCommitment.current = true;
        setFormData((prev) => ({ ...prev, time_preference: minutes }));
        onUpdate({ time_preference: minutes });
      }
    }
  }, [data]);

  // Sync formData with data prop when it changes
  const isSyncingFromProps = useRef(false);

  useEffect(() => {
    if (data && !isSyncingFromProps.current) {
      const newFormData = {
        location: data.location || "both",
        equipment: data.equipment || [],
        time_preference: data.time_preference ?? 30,
        intensity: data.intensity || "beginner",
        workout_types: data.workout_types || [],
        primary_goals: data.primary_goals || [],
        activity_level: data.activity_level || "sedentary",
        workout_experience_years: data.workout_experience_years || 0,
        workout_frequency_per_week: data.workout_frequency_per_week || 0,
        can_do_pushups: data.can_do_pushups || 0,
        can_run_minutes: data.can_run_minutes || 0,
        flexibility_level: data.flexibility_level || "fair",
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || undefined,
        preferred_workout_times: data.preferred_workout_times || [],
        enjoys_cardio: data.enjoys_cardio ?? true,
        enjoys_strength_training: data.enjoys_strength_training ?? true,
        enjoys_group_classes: data.enjoys_group_classes ?? false,
        prefers_outdoor_activities: data.prefers_outdoor_activities ?? false,
        needs_motivation: data.needs_motivation ?? false,
        prefers_variety: data.prefers_variety ?? true,
      };

      const hasChanged =
        JSON.stringify(formData) !== JSON.stringify(newFormData);

      if (hasChanged) {
        isSyncingFromProps.current = true;
        setFormData(newFormData);
        setTimeout(() => {
          isSyncingFromProps.current = false;
        }, 0);
      }
    }
  }, [data]);

  // Auto-populate gym equipment when location is gym
  useEffect(() => {
    if (formData.location === "gym" && formData.equipment.length === 0) {
      setFormData((prev: WorkoutPreferencesData) => ({
        ...prev,
        equipment: STANDARD_GYM_EQUIPMENT,
      }));
    }
  }, [formData.location, formData.equipment.length]);

  // Auto-populate from body analysis data
  useEffect(() => {
    if (bodyAnalysisData && !data?.weekly_weight_loss_goal) {
      const { current_weight_kg, target_weight_kg, target_timeline_weeks } =
        bodyAnalysisData;

      if (current_weight_kg && target_weight_kg && target_timeline_weeks) {
        const weightDifference = Math.abs(current_weight_kg - target_weight_kg);
        const weeklyRate = weightDifference / target_timeline_weeks;

        setFormData((prev: WorkoutPreferencesData) => ({
          ...prev,
          weekly_weight_loss_goal: Math.round(weeklyRate * 100) / 100,
        }));
      }

      if (
        bodyAnalysisData.ai_body_type &&
        formData.primary_goals.length === 0 &&
        !hasUserSetGoals.current
      ) {
        let suggestedGoals: string[] = [];

        switch (bodyAnalysisData.ai_body_type) {
          case "ectomorph":
            suggestedGoals = ["muscle_gain", "strength"];
            break;
          case "endomorph":
            suggestedGoals = ["weight_loss", "endurance"];
            break;
          case "mesomorph":
            suggestedGoals = ["strength", "muscle_gain"];
            break;
        }

        if (suggestedGoals.length > 0) {
          setFormData((prev: WorkoutPreferencesData) => ({
            ...prev,
            primary_goals: suggestedGoals,
          }));
        }
      }
    }
  }, [bodyAnalysisData, data?.weekly_weight_loss_goal]);

  // Form Handlers
  const updateField = <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => {
    // Track explicit user intent so auto-calculate effects don't overwrite
    if (field === "intensity") hasUserSetIntensity.current = true;
    if (field === "workout_types") hasUserSetWorkoutTypes.current = true;
    if (field === "primary_goals") hasUserSetGoals.current = true;

    let updated = { ...formData, [field]: value };

    if (field === "location") {
      if (value === "gym") {
        updated.equipment = STANDARD_GYM_EQUIPMENT;
      } else if (value === "home") {
        updated.equipment = [];
      } else if (value === "both") {
        updated.equipment =
          formData.equipment.length > 0 ? formData.equipment : [];
      }
    }

    setFormData(updated);
    onUpdate(updated);
  };

  const toggleGoal = (goalId: string) => {
    hasUserSetGoals.current = true; // Mark user intent before update
    const currentGoals = formData.primary_goals;
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter((id: string) => id !== goalId)
      : [...currentGoals, goalId];
    updateField("primary_goals", newGoals);
  };

  const toggleWorkoutTime = (timeId: string) => {
    const currentTimes = formData.preferred_workout_times;
    const newTimes = currentTimes.includes(timeId)
      ? currentTimes.filter((id: string) => id !== timeId)
      : [...currentTimes, timeId];
    updateField("preferred_workout_times", newTimes);
  };

  // Fitness Level Auto-Determination
  useEffect(() => {
    if (
      formData.workout_experience_years !== undefined &&
      formData.can_do_pushups !== undefined &&
      formData.can_run_minutes !== undefined &&
      personalInfoData?.age &&
      personalInfoData?.gender
    ) {
      const { recommendedIntensity, reasoning } =
        MetabolicCalculations.calculateRecommendedIntensity(
          formData.workout_experience_years,
          formData.can_do_pushups,
          formData.can_run_minutes,
          personalInfoData.age,
          personalInfoData.gender,
        );

      setIntensityRecommendation({
        level: recommendedIntensity,
        reasoning,
      });

      // Only auto-set intensity if user hasn't manually chosen one
      if (!hasUserSetIntensity.current) {
        setFormData((prev: WorkoutPreferencesData) => {
          if (prev.intensity !== recommendedIntensity) {
            return {
              ...prev,
              intensity: recommendedIntensity,
            };
          }
          return prev;
        });
      }
    }
  }, [
    formData.workout_experience_years,
    formData.can_do_pushups,
    formData.can_run_minutes,
    personalInfoData?.age,
    personalInfoData?.gender,
  ]);

  // Workout Type Auto-Recommendation
  const calculateRecommendedWorkoutTypes = useCallback(() => {
    const recommendedTypes: string[] = [];
    const { primary_goals, intensity, time_preference, location, equipment } =
      formData;

    recommendedTypes.push("strength");

    if (
      primary_goals.includes("weight-loss") ||
      primary_goals.includes("endurance")
    ) {
      recommendedTypes.push("cardio");
      if (time_preference >= 30) {
        recommendedTypes.push("hiit");
      }
    }

    if (
      primary_goals.includes("muscle-gain") ||
      primary_goals.includes("strength")
    ) {
      recommendedTypes.push("strength");
      if (intensity === "advanced") {
        recommendedTypes.push("functional");
      }
    }

    if (
      primary_goals.includes("flexibility") ||
      primary_goals.includes("general-fitness")
    ) {
      recommendedTypes.push("yoga");
      recommendedTypes.push("flexibility");
    }

    if (intensity === "beginner") {
      recommendedTypes.push("yoga");
      recommendedTypes.push("flexibility");
    } else if (intensity === "intermediate") {
      recommendedTypes.push("hiit");
      recommendedTypes.push("functional");
    } else if (intensity === "advanced") {
      recommendedTypes.push("hiit");
      recommendedTypes.push("functional");
      recommendedTypes.push("pilates");
    }

    if (location === "home" && equipment.includes("yoga-mat")) {
      recommendedTypes.push("yoga", "pilates");
    }

    if (equipment.includes("resistance-bands")) {
      recommendedTypes.push("functional");
    }

    if (bodyAnalysisData?.ai_body_type) {
      if (bodyAnalysisData.ai_body_type === "ectomorph") {
        recommendedTypes.push("strength", "functional");
      } else if (bodyAnalysisData.ai_body_type === "endomorph") {
        recommendedTypes.push("cardio", "hiit");
      } else if (bodyAnalysisData.ai_body_type === "mesomorph") {
        recommendedTypes.push("strength", "hiit", "functional");
      }
    }

    const uniqueTypes = [...new Set(recommendedTypes)];
    return uniqueTypes.slice(0, 5);
  }, [
    formData.primary_goals,
    formData.intensity,
    formData.time_preference,
    formData.location,
    formData.equipment,
    bodyAnalysisData?.ai_body_type,
  ]);

  useEffect(() => {
    // Only auto-recommend workout types if user hasn't manually set them
    if (!hasUserSetWorkoutTypes.current) {
      const recommendedTypes = calculateRecommendedWorkoutTypes();
      setFormData((prev: WorkoutPreferencesData) => ({
        ...prev,
        workout_types: recommendedTypes,
      }));
    }
  }, [calculateRecommendedWorkoutTypes]);

  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find((error: string) =>
      error.toLowerCase().includes(fieldName.toLowerCase()),
    );
  };

  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  return {
    formData,
    tooltipModal,
    intensityRecommendation,
    updateField,
    toggleGoal,
    toggleWorkoutTime,
    showInfoTooltip,
    hideInfoTooltip,
    calculateRecommendedWorkoutTypes,
    getFieldError,
    hasFieldError,
  };
};
