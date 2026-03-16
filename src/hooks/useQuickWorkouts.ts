import { useState, useMemo, useCallback } from "react";
import { useFitnessStore } from "../stores/fitnessStore";
import { useUserStore } from "../stores/userStore";
import { generateUUID } from "../utils/uuid";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { getSuggestions, generateWorkout } from "../services/extraWorkoutService";
import type { ExtraWorkoutTemplate } from "../stores/fitness/types";
import type { FitnessNavigation } from "./useFitnessLogic";

export interface QuickWorkoutsHook {
  isVisible: boolean;
  suggestions: ExtraWorkoutTemplate[];
  isGenerating: boolean;
  startQuickWorkout: (template: ExtraWorkoutTemplate) => Promise<void>;
}

export const useQuickWorkouts = (navigation: FitnessNavigation): QuickWorkoutsHook => {
  const weeklyWorkoutPlan = useFitnessStore((state) => state.weeklyWorkoutPlan);
  const completedSessions = useFitnessStore((state) => state.completedSessions);
  const { profile } = useUserStore();

  const [isGenerating, setIsGenerating] = useState(false);

  const isVisible = useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayDayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
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
          s.type === 'planned' &&
          w.id && s.workoutId === w.id &&
          s.completedAt.split('T')[0] === todayStr,
      ),
    );
  }, [weeklyWorkoutPlan, completedSessions]);

  const suggestions = useMemo((): ExtraWorkoutTemplate[] => {
    if (!profile?.fitnessGoals) return [];
    return getSuggestions(profile.fitnessGoals);
  }, [profile?.fitnessGoals]);

  const startQuickWorkout = useCallback(async (template: ExtraWorkoutTemplate): Promise<void> => {
    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      crossPlatformAlert('Profile Incomplete', 'Please complete your profile to start a workout.');
      return;
    }

    setIsGenerating(true);
    try {
      const workout = await generateWorkout(template, profile.personalInfo, profile.fitnessGoals);
      if (!workout) {
        crossPlatformAlert('Generation Failed', 'Could not generate workout. Please try again.');
        return;
      }
      navigation.navigate('WorkoutSession', {
        workout,
        sessionId: generateUUID(),
        resumeExerciseIndex: 0,
        isExtra: true,
      });
    } catch (err) {
      console.error('[useQuickWorkouts] startQuickWorkout failed:', err);
      crossPlatformAlert('Generation Failed', 'Could not generate workout. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [profile, navigation]);

  return { isVisible, suggestions, isGenerating, startQuickWorkout };
};

export default useQuickWorkouts;
