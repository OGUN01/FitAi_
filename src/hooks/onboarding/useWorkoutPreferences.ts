import { useState, useEffect, useRef, useCallback } from "react";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../types/onboarding";
import { MetabolicCalculations } from "../../utils/healthCalculations";
import {
  STANDARD_GYM_EQUIPMENT,
} from "../../screens/onboarding/tabs/WorkoutPreferencesConstants";

// ============================================================================
// PREFERRED WORKOUT DAYS (which days of the week the user trains)
//
// Model (single source): `workout_frequency_per_week` is the source for HOW
// MANY sessions; `preferred_workout_days` is the source for WHICH days. The
// two are always written together (setWorkoutFrequency / toggleWorkoutDay) so
// `preferred_workout_days.length === workout_frequency_per_week` holds.
// Tapping a day chip makes the count follow the selection; moving the count
// ruler re-spreads the days evenly (default spread per user feedback:
// 5 → Mon,Tue,Wed,Fri,Sat style spacing).
// ============================================================================
export const WORKOUT_DAY_IDS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

// Shallow array comparison for the string[] fields on WorkoutPreferencesData —
// avoids JSON.stringify-ing the whole formData on every props-sync check,
// which ran on every RangeSlider drag tick (session duration, etc.).
const arraysEqual = (
  a: string[] | null | undefined,
  b: string[] | null | undefined,
): boolean => {
  const av = a || [];
  const bv = b || [];
  if (av.length !== bv.length) return false;
  for (let i = 0; i < av.length; i++) {
    if (av[i] !== bv[i]) return false;
  }
  return true;
};

/** Evenly spread n sessions across a Mon–Sun week (3 → mon/wed/fri, 5 → mon/tue/wed/fri/sat). */
export const spreadDaysForCount = (n: number): string[] => {
  const count = Math.max(0, Math.min(7, Math.round(n)));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(WORKOUT_DAY_IDS[Math.floor((i * 7) / count)]);
  }
  return out;
};

/**
 * Normalize a persisted day selection: keep only valid ids in monday-first
 * order, then force length === count (trim extras, pad from the even spread).
 */
export const normalizeWorkoutDays = (
  days: string[] | null | undefined,
  count: number,
): string[] => {
  const clamped = Math.max(0, Math.min(7, Math.round(count)));
  const valid: string[] = WORKOUT_DAY_IDS.filter((d) => days?.includes(d));
  if (valid.length === clamped) return [...valid];
  if (valid.length > clamped) return valid.slice(0, clamped);
  const merged: string[] = [...valid];
  for (const d of spreadDaysForCount(clamped)) {
    if (merged.length >= clamped) break;
    if (!merged.includes(d)) merged.push(d);
  }
  return WORKOUT_DAY_IDS.filter((d) => merged.includes(d));
};

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
  // Signature of the last workout_types array THIS hook auto-applied. The
  // hasUserSet* refs reset on remount (Back→Next), so the auto-recommend
  // effect also compares persisted data.workout_types against this signature:
  // any non-empty persisted value we did NOT auto-apply this mount is treated
  // as an explicit user choice and is never overwritten.
  const lastAutoWorkoutTypesKey = useRef<string | null>(null);

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
    // §4 default: 3 sessions/week feels achievable (hook previously 0).
    workout_frequency_per_week: data?.workout_frequency_per_week || 3,
    // Which days — persisted choice wins; otherwise even spread for the count.
    preferred_workout_days: normalizeWorkoutDays(
      data?.preferred_workout_days,
      data?.workout_frequency_per_week || 3,
    ),
    can_do_pushups: data?.can_do_pushups || 0,
    can_run_minutes: data?.can_run_minutes || 0,
    flexibility_level: data?.flexibility_level || "fair",

    // Weight goals (auto-populated from body analysis)
    weekly_weight_loss_goal: data?.weekly_weight_loss_goal ?? undefined,

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
  }, [data, onUpdate]);

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
        workout_frequency_per_week: data.workout_frequency_per_week || 3,
        preferred_workout_days: normalizeWorkoutDays(
          data.preferred_workout_days,
          data.workout_frequency_per_week || 3,
        ),
        can_do_pushups: data.can_do_pushups || 0,
        can_run_minutes: data.can_run_minutes || 0,
        flexibility_level: data.flexibility_level || "fair",
        weekly_weight_loss_goal: data.weekly_weight_loss_goal ?? undefined,
        preferred_workout_times: data.preferred_workout_times || [],
        enjoys_cardio: data.enjoys_cardio ?? true,
        enjoys_strength_training: data.enjoys_strength_training ?? true,
        enjoys_group_classes: data.enjoys_group_classes ?? false,
        prefers_outdoor_activities: data.prefers_outdoor_activities ?? false,
        needs_motivation: data.needs_motivation ?? false,
        prefers_variety: data.prefers_variety ?? true,
      };

      const hasChanged =
        formData.location !== newFormData.location ||
        formData.time_preference !== newFormData.time_preference ||
        formData.intensity !== newFormData.intensity ||
        formData.activity_level !== newFormData.activity_level ||
        formData.workout_experience_years !== newFormData.workout_experience_years ||
        formData.workout_frequency_per_week !== newFormData.workout_frequency_per_week ||
        formData.can_do_pushups !== newFormData.can_do_pushups ||
        formData.can_run_minutes !== newFormData.can_run_minutes ||
        formData.flexibility_level !== newFormData.flexibility_level ||
        formData.weekly_weight_loss_goal !== newFormData.weekly_weight_loss_goal ||
        formData.enjoys_cardio !== newFormData.enjoys_cardio ||
        formData.enjoys_strength_training !== newFormData.enjoys_strength_training ||
        formData.enjoys_group_classes !== newFormData.enjoys_group_classes ||
        formData.prefers_outdoor_activities !== newFormData.prefers_outdoor_activities ||
        formData.needs_motivation !== newFormData.needs_motivation ||
        formData.prefers_variety !== newFormData.prefers_variety ||
        !arraysEqual(formData.equipment, newFormData.equipment) ||
        !arraysEqual(formData.workout_types, newFormData.workout_types) ||
        !arraysEqual(formData.primary_goals, newFormData.primary_goals) ||
        !arraysEqual(formData.preferred_workout_days, newFormData.preferred_workout_days) ||
        !arraysEqual(formData.preferred_workout_times, newFormData.preferred_workout_times);

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
        const weekly_weight_loss_goal = Math.round(weeklyRate * 100) / 100;

        setFormData((prev: WorkoutPreferencesData) => ({
          ...prev,
          weekly_weight_loss_goal,
        }));

        if (!isSyncingFromProps.current) {
          onUpdate({ weekly_weight_loss_goal });
        }
      }

      if (
        bodyAnalysisData.ai_body_type &&
        formData.primary_goals.length === 0 &&
        !hasUserSetGoals.current
      ) {
        let suggestedGoals: string[] = [];

        switch (bodyAnalysisData.ai_body_type) {
          case "ectomorph":
            suggestedGoals = ["muscle-gain", "strength"];
            break;
          case "endomorph":
            suggestedGoals = ["weight-loss", "endurance"];
            break;
          case "mesomorph":
            suggestedGoals = ["strength", "muscle-gain"];
            break;
        }

        if (suggestedGoals.length > 0) {
          setFormData((prev: WorkoutPreferencesData) => ({
            ...prev,
            primary_goals: suggestedGoals,
          }));

          if (!isSyncingFromProps.current) {
            onUpdate({ primary_goals: suggestedGoals });
          }
        }
      }
    }
  }, [bodyAnalysisData, data?.weekly_weight_loss_goal, onUpdate]);

  // "What you enjoy" section was removed from the UI (user feedback, Image #14),
  // but the six enjoyment booleans still feed AI generation
  // (enjoysCardio / enjoysStrength / prefersVariety etc. in
  // transformForWorkoutRequest). They are now DERIVED from primary_goals —
  // single writer, no user input left to clobber:
  //   cardio   ← weight-loss / endurance / general_fitness
  //   strength ← muscle-gain / strength / weight-gain / general_fitness
  //   outdoor  ← endurance
  //   group classes / needs motivation stay false (no goal signal);
  //   prefers_variety stays true (historical default — keeps plans fresh).
  // Empty goals → legacy defaults (cardio+strength true, variety true).
  useEffect(() => {
    const goals = formData.primary_goals;
    const derived = {
      enjoys_cardio:
        goals.length === 0 ||
        goals.some((g) =>
          ["weight-loss", "endurance", "general_fitness"].includes(g),
        ),
      enjoys_strength_training:
        goals.length === 0 ||
        goals.some((g) =>
          ["muscle-gain", "strength", "weight-gain", "general_fitness"].includes(
            g,
          ),
        ),
      enjoys_group_classes: false,
      prefers_outdoor_activities: goals.includes("endurance"),
      needs_motivation: false,
      prefers_variety: true,
    };
    const changed = (
      Object.keys(derived) as (keyof typeof derived)[]
    ).some((k) => formData[k] !== derived[k]);
    if (changed) {
      setFormData((prev: WorkoutPreferencesData) => ({ ...prev, ...derived }));
      if (!isSyncingFromProps.current) {
        onUpdate(derived);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.primary_goals]);

  // Debounced commit to parent state (mirrors useDietPreferences/
  // usePersonalInfoForm). RangeSlider-driven fields (time_preference,
  // workout_experience_years, can_do_pushups, can_run_minutes, all written
  // via updateField) fire many formData updates per second while dragging;
  // without this, every tick synchronously wrote into the top-level
  // onboarding state and re-ran the whole onboarding tree. handleNext in
  // WorkoutPreferencesTab already flushes `onUpdate(formData)` synchronously
  // before navigating, so this debounce never risks losing data on tab
  // transition.
  const stableOnUpdate = useCallback(() => {
    onUpdate(formData);
  }, [formData, onUpdate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isSyncingFromProps.current) {
        stableOnUpdate();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData, stableOnUpdate]);

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
      // Smart equipment logic (user feedback, Image #14):
      // - gym  → full gym access assumed; equipment picker hidden in the UI,
      //          stored equipment = standard gym set.
      // - home → only the gear the user picks in the home-equipment picker.
      // - both → gym staples assumed PLUS whatever home gear the user has
      //          (union; the picker stays visible for the home part).
      if (value === "gym") {
        updated.equipment = STANDARD_GYM_EQUIPMENT;
      } else if (value === "home") {
        updated.equipment = [];
      } else if (value === "both") {
        updated.equipment = [
          ...new Set([...STANDARD_GYM_EQUIPMENT, ...formData.equipment]),
        ];
      }
    }

    if (field === "workout_frequency_per_week") {
      // Keep day selection consistent with the count (invariant:
      // preferred_workout_days.length === workout_frequency_per_week).
      const count = Math.max(0, Math.min(7, Math.round(value as number)));
      updated.workout_frequency_per_week = count;
      if ((updated.preferred_workout_days?.length ?? -1) !== count) {
        updated.preferred_workout_days = spreadDaysForCount(count);
      }
    }

    setFormData(updated);
  };

  /** Ruler control: change the session COUNT; re-spread days if size changed. */
  const setWorkoutFrequency = (n: number) => {
    const count = Math.max(0, Math.min(7, Math.round(n)));
    const days =
      formData.preferred_workout_days?.length === count
        ? formData.preferred_workout_days
        : spreadDaysForCount(count);
    const updated = {
      ...formData,
      workout_frequency_per_week: count,
      preferred_workout_days: days,
    };
    setFormData(updated);
  };

  /** Day-chip control: toggle WHICH day; the count follows the selection. */
  const toggleWorkoutDay = (dayId: string) => {
    const current =
      formData.preferred_workout_days ??
      spreadDaysForCount(formData.workout_frequency_per_week);
    const next = current.includes(dayId)
      ? current.filter((d) => d !== dayId)
      : [...current, dayId];
    const ordered = WORKOUT_DAY_IDS.filter((d) => next.includes(d));
    const updated = {
      ...formData,
      workout_frequency_per_week: ordered.length,
      preferred_workout_days: [...ordered],
    };
    setFormData(updated);
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
      primary_goals.includes("general_fitness")
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
    // Only auto-recommend workout types if user hasn't manually set them —
    // in this mount (ref) or a previous one (persisted non-empty value we did
    // not auto-apply; refs reset on remount, so this covers Back→Next).
    if (hasUserSetWorkoutTypes.current) return;
    const persisted = data?.workout_types ?? [];
    const persistedIsUserValue =
      persisted.length > 0 &&
      JSON.stringify(persisted) !== lastAutoWorkoutTypesKey.current;
    if (persistedIsUserValue) return;

    const recommendedTypes = calculateRecommendedWorkoutTypes();
    lastAutoWorkoutTypesKey.current = JSON.stringify(recommendedTypes);
    setFormData((prev: WorkoutPreferencesData) => ({
      ...prev,
      workout_types: recommendedTypes,
    }));

    if (!isSyncingFromProps.current) {
      onUpdate({ workout_types: recommendedTypes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setWorkoutFrequency,
    toggleWorkoutDay,
    showInfoTooltip,
    hideInfoTooltip,
    calculateRecommendedWorkoutTypes,
    getFieldError,
    hasFieldError,
  };
};
