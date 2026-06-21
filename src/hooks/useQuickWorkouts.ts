import { useState, useMemo, useCallback } from "react";
import { useFitnessStore } from "../stores/fitnessStore";
import { useProfileStore } from "../stores/profileStore";
import { generateUUID } from "../utils/uuid";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import {
  getSuggestions,
  generateWorkout,
} from "../services/extraWorkoutService";
import type { PersonalInfo, FitnessGoals } from "../types/user";
import type { ExtraWorkoutTemplate } from "../stores/fitness/types";
import type { FitnessNavigation } from "./useFitnessLogic";
import { getLocalDateString } from "../utils/weekUtils";
import {
  buildLegacyFitnessGoals,
  buildLegacyPersonalInfo,
} from "../utils/profileLegacyAdapter";

export type TemplateStatus = "idle" | "in_progress" | "completed";

export interface QuickWorkoutsHook {
  isVisible: boolean;
  suggestions: ExtraWorkoutTemplate[];
  isGenerating: boolean;
  // eslint-disable-next-line no-unused-vars
  startQuickWorkout: (template: ExtraWorkoutTemplate) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  resumeQuickWorkout: (template: ExtraWorkoutTemplate) => void;
  // eslint-disable-next-line no-unused-vars
  getTemplateStatus: (template: ExtraWorkoutTemplate) => TemplateStatus;
  /**
   * P2-cal-ssot: returns the ACTUAL calories burned for a completed extra
   * workout (from completedSessions — the SSOT for actual burn), or null when
   * the template has not been completed today. Callers should prefer this over
   * `template.estimatedCalories` (the pre-generation display-only estimate)
   * when the status is "completed" — matches the displayCalories pattern used
   * by TodayWorkoutCard. CLAUDE.md #9: estimatedCalories is pre-generation only.
   */
  // eslint-disable-next-line no-unused-vars
  getCompletedCalories: (template: ExtraWorkoutTemplate) => number | null;
}

export const useQuickWorkouts = (
  navigation: FitnessNavigation,
): QuickWorkoutsHook => {
  const weeklyWorkoutPlan = useFitnessStore((state) => state.weeklyWorkoutPlan);
  const completedSessions = useFitnessStore((state) => state.completedSessions);
  const activeExtraSession = useFitnessStore(
    (state) => state.activeExtraSession,
  );
  // SSOT: profileStore is authoritative for personalInfo, bodyAnalysis, workoutPreferences
  const {
    personalInfo: profilePersonalInfo,
    bodyAnalysis,
    workoutPreferences: profileWorkoutPreferences,
  } = useProfileStore();
  const legacyPersonalInfo = useMemo(
    () =>
      buildLegacyPersonalInfo({
        personalInfo: profilePersonalInfo,
        bodyAnalysis,
        workoutPreferences: profileWorkoutPreferences,
      }),
    [profilePersonalInfo, bodyAnalysis, profileWorkoutPreferences],
  );
  const fitnessGoals = useMemo(
    () => buildLegacyFitnessGoals(profileWorkoutPreferences),
    [profileWorkoutPreferences],
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const isVisible = useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return false;

    const todayDayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = todayDayNames[new Date().getDay()];

    const hasTodayPlannedWorkout = weeklyWorkoutPlan.workouts.some(
      (w) => w.dayOfWeek?.toLowerCase() === todayName,
    );

    if (!hasTodayPlannedWorkout) return false;

    const todayWorkouts = weeklyWorkoutPlan.workouts.filter(
      (w) => w.dayOfWeek?.toLowerCase() === todayName,
    );

    return todayWorkouts.every((w) =>
      completedSessions.some(
        (s) =>
          s.type === "planned" &&
          w.id &&
          s.workoutId === w.id &&
          getLocalDateString(s.completedAt) === getLocalDateString(),
      ),
    );
  }, [weeklyWorkoutPlan, completedSessions]);

  const suggestions = useMemo((): ExtraWorkoutTemplate[] => {
    if (!fitnessGoals?.primary_goals?.length) return [];
    return getSuggestions(fitnessGoals as FitnessGoals);
  }, [fitnessGoals]);

  // Derive per-template status from store — single source of truth
  const getTemplateStatus = useCallback(
    (template: ExtraWorkoutTemplate): TemplateStatus => {
      // Completed: an extra session with matching duration was finished today.
      // Duration is unique across templates (20 / 25 / 30 min), so it's the right key.
      const isCompleted = completedSessions.some(
        (s) =>
          s.type === "extra" &&
          s.workoutSnapshot.duration === template.duration &&
          getLocalDateString(s.completedAt) === getLocalDateString(),
      );
      if (isCompleted) return "completed";

      // In progress: an active session is persisted for this template
      if (activeExtraSession?.templateId === template.id) return "in_progress";

      return "idle";
    },
    [completedSessions, activeExtraSession],
  );

  // P2-cal-ssot: actual burned calories for a completed extra workout today.
  // Reads the SAME completedSessions match as getTemplateStatus (duration key)
  // so the two stay consistent — status==="completed" ⟺ getCompletedCalories
  // returns a number. Returns the caloriesBurned of the most recent matching
  // session (null if none), so the card can show actual burn instead of the
  // pre-generation estimate.
  const getCompletedCalories = useCallback(
    (template: ExtraWorkoutTemplate): number | null => {
      const matching = completedSessions
        .filter(
          (s) =>
            s.type === "extra" &&
            s.workoutSnapshot.duration === template.duration &&
            getLocalDateString(s.completedAt) === getLocalDateString(),
        )
        .sort(
          (a, b) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
        );
      const latest = matching[0];
      if (!latest) return null;
      // caloriesBurned is null until the MET calc runs at completion; a
      // completed session should have a number. null → fall back to estimate
      // upstream (return null so the caller keeps estimatedCalories).
      return latest.caloriesBurned ?? null;
    },
    [completedSessions],
  );

  const startQuickWorkout = useCallback(
    async (template: ExtraWorkoutTemplate): Promise<void> => {
      if (!legacyPersonalInfo || !fitnessGoals?.primary_goals?.length) {
        crossPlatformAlert(
          "Profile Incomplete",
          "Please complete your profile to start a workout.",
        );
        return;
      }

      setIsGenerating(true);
      try {
        const workout = await generateWorkout(
          template,
          legacyPersonalInfo as PersonalInfo,
          fitnessGoals as FitnessGoals,
        );
        if (!workout) {
          crossPlatformAlert(
            "Generation Failed",
            "Could not generate workout. Please try again.",
          );
          return;
        }

        const sessionId = generateUUID();

        // Persist the active session so the card can show RESUME if the user exits
        useFitnessStore.getState().setActiveExtraSession({
          templateId: template.id,
          workout,
          sessionId,
          exerciseIndex: 0,
          startedAt: new Date().toISOString(),
        });

        navigation.navigate("WorkoutSession", {
          workout,
          sessionId,
          resumeExerciseIndex: 0,
          isExtra: true,
        });
      } catch (err) {
        console.error("[useQuickWorkouts] startQuickWorkout failed:", err);
        crossPlatformAlert(
          "Generation Failed",
          "Could not generate workout. Please try again.",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [legacyPersonalInfo, fitnessGoals, navigation],
  );

  const resumeQuickWorkout = useCallback(
    (template: ExtraWorkoutTemplate): void => {
      if (!activeExtraSession || activeExtraSession.templateId !== template.id)
        return;

      navigation.navigate("WorkoutSession", {
        workout: activeExtraSession.workout,
        sessionId: activeExtraSession.sessionId,
        resumeExerciseIndex: activeExtraSession.exerciseIndex,
        isExtra: true,
      });
    },
    [activeExtraSession, navigation],
  );

  return {
    isVisible,
    suggestions,
    isGenerating,
    startQuickWorkout,
    resumeQuickWorkout,
    getTemplateStatus,
    getCompletedCalories,
  };
};

export default useQuickWorkouts;
