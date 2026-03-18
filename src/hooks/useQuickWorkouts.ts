import { useState, useMemo, useCallback } from "react";
import { useFitnessStore } from "../stores/fitnessStore";
import { useUserStore } from "../stores/userStore";
import { useProfileStore } from "../stores/profileStore";
import { generateUUID } from "../utils/uuid";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { getSuggestions, generateWorkout } from "../services/extraWorkoutService";
import type { ExtraWorkoutTemplate } from "../stores/fitness/types";
import type { FitnessNavigation } from "./useFitnessLogic";

export type TemplateStatus = 'idle' | 'in_progress' | 'completed';

export interface QuickWorkoutsHook {
  isVisible: boolean;
  suggestions: ExtraWorkoutTemplate[];
  isGenerating: boolean;
  startQuickWorkout: (template: ExtraWorkoutTemplate) => Promise<void>;
  resumeQuickWorkout: (template: ExtraWorkoutTemplate) => void;
  getTemplateStatus: (template: ExtraWorkoutTemplate) => TemplateStatus;
}

export const useQuickWorkouts = (navigation: FitnessNavigation): QuickWorkoutsHook => {
  const weeklyWorkoutPlan = useFitnessStore((state) => state.weeklyWorkoutPlan);
  const completedSessions = useFitnessStore((state) => state.completedSessions);
  const activeExtraSession = useFitnessStore((state) => state.activeExtraSession);
  const { profile } = useUserStore();
  // SSOT: profileStore is authoritative for personalInfo, bodyAnalysis, workoutPreferences
  const { personalInfo: profilePersonalInfo, bodyAnalysis, workoutPreferences: profileWorkoutPreferences } = useProfileStore();

  // SSOT: Build merged fitnessGoals — profileStore.workoutPreferences is authoritative
  const mergedFitnessGoals = profileWorkoutPreferences
    ? {
        primary_goals: profileWorkoutPreferences.primary_goals || profile?.fitnessGoals?.primary_goals || [],
        primaryGoals: profileWorkoutPreferences.primary_goals || profile?.fitnessGoals?.primaryGoals || [],
        experience: profileWorkoutPreferences.intensity || profile?.fitnessGoals?.experience || 'beginner',
        experience_level: profileWorkoutPreferences.intensity || profile?.fitnessGoals?.experience_level || 'beginner',
        time_commitment: String(profileWorkoutPreferences.time_preference || profile?.fitnessGoals?.time_commitment || 45),
        preferred_equipment: profileWorkoutPreferences.equipment || profile?.fitnessGoals?.preferred_equipment,
        target_areas: profile?.fitnessGoals?.target_areas,
      }
    : profile?.fitnessGoals;

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
    if (!mergedFitnessGoals?.primary_goals?.length && !profile?.fitnessGoals) return [];
    return getSuggestions((mergedFitnessGoals || profile!.fitnessGoals) as any);
  }, [mergedFitnessGoals, profile?.fitnessGoals]);

  // Derive per-template status from store — single source of truth
  const getTemplateStatus = useCallback((template: ExtraWorkoutTemplate): TemplateStatus => {
    const todayStr = new Date().toISOString().split('T')[0];

    const extraSessions = completedSessions.filter((s) => s.type === 'extra');

    // Completed: an extra session with matching duration was finished today.
    // Duration is unique across templates (20 / 25 / 30 min), so it's the right key.
    const isCompleted = completedSessions.some(
      (s) =>
        s.type === 'extra' &&
        s.workoutSnapshot.duration === template.duration &&
        s.completedAt.split('T')[0] === todayStr,
    );
    if (isCompleted) return 'completed';

    // In progress: an active session is persisted for this template
    if (activeExtraSession?.templateId === template.id) return 'in_progress';

    return 'idle';
  }, [completedSessions, activeExtraSession]);

  const startQuickWorkout = useCallback(async (template: ExtraWorkoutTemplate): Promise<void> => {
    // SSOT: check profileStore first; profile (userStore) is legacy fallback
    if ((!profilePersonalInfo && !profile?.personalInfo) || !mergedFitnessGoals?.primary_goals?.length) {
      crossPlatformAlert('Profile Incomplete', 'Please complete your profile to start a workout.');
      return;
    }

    setIsGenerating(true);
    try {
      // SSOT: prefer profileStore for age (personalInfo) and weight (bodyAnalysis)
      const mergedPersonalInfo = {
        ...(profilePersonalInfo || profile?.personalInfo || {}),
        age: profilePersonalInfo?.age || profile?.personalInfo?.age,
        weight: bodyAnalysis?.current_weight_kg || profile?.bodyMetrics?.current_weight_kg || (profile?.personalInfo as any)?.weight,
      };
      const workout = await generateWorkout(template, mergedPersonalInfo as any, (mergedFitnessGoals || profile!.fitnessGoals) as any);
      if (!workout) {
        crossPlatformAlert('Generation Failed', 'Could not generate workout. Please try again.');
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

      navigation.navigate('WorkoutSession', {
        workout,
        sessionId,
        resumeExerciseIndex: 0,
        isExtra: true,
      });
    } catch (err) {
      console.error('[useQuickWorkouts] startQuickWorkout failed:', err);
      crossPlatformAlert('Generation Failed', 'Could not generate workout. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [profile, profilePersonalInfo, bodyAnalysis, mergedFitnessGoals, navigation]);

  const resumeQuickWorkout = useCallback((template: ExtraWorkoutTemplate): void => {
    if (!activeExtraSession || activeExtraSession.templateId !== template.id) return;

    navigation.navigate('WorkoutSession', {
      workout: activeExtraSession.workout,
      sessionId: activeExtraSession.sessionId,
      resumeExerciseIndex: activeExtraSession.exerciseIndex,
      isExtra: true,
    });
  }, [activeExtraSession, navigation]);

  return { isVisible, suggestions, isGenerating, startQuickWorkout, resumeQuickWorkout, getTemplateStatus };
};

export default useQuickWorkouts;
