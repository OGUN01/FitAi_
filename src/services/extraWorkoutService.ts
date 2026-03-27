import { DayWorkout } from "../types/ai";
import { workoutEngine } from "../features/workouts/WorkoutEngine";
import { supabase } from "./supabase";
import { analyticsDataService } from "./analyticsData";
import { resolveCurrentWeightForUser } from "./currentWeight";
import { fitnessRefreshService } from "./fitnessRefreshService";
import { useFitnessStore } from "../stores/fitnessStore";
import { useUserStore } from "../stores/userStore";
import { useProfileStore } from "../stores/profileStore";
import { useAchievementStore } from "../stores/achievementStore";
import {
  calculateWorkoutCalories,
  ExerciseCalorieInput,
} from "./calorieCalculator";
import { generateUUID } from "../utils/uuid";
import { getCurrentWeekStart, getCurrentDayName } from "../utils/weekUtils";
import type {
  ExtraWorkoutTemplate,
  CompletedSession,
} from "../stores/fitness/types";
import type { PersonalInfo, FitnessGoals } from "../types/user";
import { weightTrackingService } from "./WeightTrackingService";

/**
 * Returns 2-3 quick workout suggestion templates based on user goals/experience.
 * No AI call — instant. estimatedCalories is display-only.
 */
export function getSuggestions(goals: FitnessGoals): ExtraWorkoutTemplate[] {
  const experience = (goals?.experience || "beginner") as
    | "beginner"
    | "intermediate"
    | "advanced";

  const templates: ExtraWorkoutTemplate[] = [
    {
      id: "extra-hiit-20",
      title: "20-min HIIT Blast",
      category: "hiit",
      duration: 20,
      difficulty: experience === "beginner" ? "beginner" : "intermediate",
      estimatedCalories: 180,
    },
    {
      id: "extra-strength-30",
      title: "30-min Strength Focus",
      category: "strength",
      duration: 30,
      difficulty: experience,
      estimatedCalories: 220,
    },
    {
      id: "extra-cardio-25",
      title: "25-min Cardio Endurance",
      category: "cardio",
      duration: 25,
      difficulty: experience === "advanced" ? "intermediate" : "beginner",
      estimatedCalories: 200,
    },
  ];

  return templates;
}

/**
 * Generates a full workout from a template using workoutEngine.
 * Returns DayWorkout shape with isExtra: true, or null on failure.
 */
export async function generateWorkout(
  template: ExtraWorkoutTemplate,
  personalInfo: PersonalInfo,
  goals: FitnessGoals,
): Promise<DayWorkout | null> {
  try {
    const result = await workoutEngine.generateQuickWorkout(
      personalInfo,
      goals,
      template.duration,
    );

    if (!result.success || !result.data) {
      console.error(
        "[extraWorkoutService] generateWorkout failed:",
        result.error,
      );
      return null;
    }

    const dayWorkout: DayWorkout = {
      ...(result.data as any),
      id: generateUUID(),
      // Use engine's personalized title/calories; fall back to template only if absent
      title: result.data.title || template.title,
      category: template.category,
      duration: template.duration,
      // result.data.estimatedCalories is MET-based (user weight + duration) — don't override
      dayOfWeek: getCurrentDayName(),
      isExtra: true,
    };

    return dayWorkout;
  } catch (err) {
    console.error("[extraWorkoutService] generateWorkout threw:", err);
    return null;
  }
}

/**
 * Records a completed extra workout session.
 * - Guest mode: skips Supabase, stores locally only
 * - Always updates the store (Rule 6: store is runtime source)
 */
export async function completeExtraWorkout(
  workout: DayWorkout,
  sessionData: any,
  userId: string | null | undefined,
): Promise<boolean> {
  try {
    // Calculate actual calories burned via MET — 0 if weight unavailable (Rule 8)
    const profileStore = useProfileStore.getState();
    const trackedWeight = weightTrackingService.getCurrentWeight();
    const resolvedCurrentWeight = userId
      ? await resolveCurrentWeightForUser(userId, {
          bodyAnalysisWeight: profileStore.bodyAnalysis?.current_weight_kg,
        })
      : {
          value:
            trackedWeight ?? profileStore.bodyAnalysis?.current_weight_kg ?? null,
        };
    const userWeight =
      trackedWeight && trackedWeight > 0
        ? trackedWeight
        : resolvedCurrentWeight.value;

    let actualCaloriesBurned = 0;

    if (
      sessionData?.stats?.caloriesBurned &&
      sessionData.stats.caloriesBurned > 0
    ) {
      actualCaloriesBurned = sessionData.stats.caloriesBurned;
    } else if (userWeight && userWeight > 0 && workout.exercises?.length) {
      const inputs: ExerciseCalorieInput[] = workout.exercises.map(
        (ex: any) => ({
          exerciseId: ex.exerciseId || ex.id,
          name: ex.exerciseName || ex.name,
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration,
          restTime: ex.restTime,
        }),
      );
      const result = calculateWorkoutCalories(inputs, userWeight);
      actualCaloriesBurned = result.totalCalories;
    }

    const isGuest = !userId || userId.startsWith("guest");

    // Non-guest: sync to Supabase
    // Will be set to the Supabase-generated row ID after a successful insert
    let supabaseSessionId: string | null = null;

    if (!isGuest) {
      try {
        const supabaseResult = await supabase
          .from("workout_sessions")
          .insert({
            user_id: userId,
            workout_name: workout.title,
            workout_type: workout.category || "general",
            total_duration_minutes:
              sessionData?.duration || workout.duration || null,
            calories_burned: actualCaloriesBurned,
            exercises_completed:
              sessionData?.stats?.exercises || workout.exercises || [],
            started_at: sessionData?.startedAt || new Date().toISOString(),
            completed_at: new Date().toISOString(),
            is_completed: true,
            is_extra: true,
            enjoyment_rating: sessionData?.rating || null,
            notes: sessionData?.notes || `Extra workout: ${workout.title}`,
          })
          .select("id")
          .single();

        if (supabaseResult.error) {
          console.error(
            "⚠️ Supabase extra workout insert error:",
            supabaseResult.error,
          );
        } else if (supabaseResult.data?.id) {
          supabaseSessionId = supabaseResult.data.id;
        }
      } catch (supabaseErr) {
        console.error(
          "❌ Failed to sync extra workout to Supabase:",
          supabaseErr,
        );
      }

      // Update analytics_metrics (fire-and-forget, eventual consistency)
      try {
        await analyticsDataService.updateTodaysMetrics(userId!, {
          workoutsCompleted: 1,
          caloriesBurned: actualCaloriesBurned,
        });
      } catch (analyticsErr) {
        console.error(
          "⚠️ Failed to update analytics for extra workout:",
          analyticsErr,
        );
      }
    }

    // Always update store — Rule 6: store is runtime source
    const workoutId = workout.id || generateUUID();
    const fitnessStore = useFitnessStore.getState();

    // Mark the active session as done — card will now show COMPLETED
    fitnessStore.clearActiveExtraSession();

    fitnessStore.addCompletedSession({
      sessionId: supabaseSessionId || sessionData?.sessionId || generateUUID(),
      type: "extra" as const,
      workoutId,
      workoutSnapshot: {
        title: workout.title,
        category: workout.category || "general",
        duration: workout.duration || 0,
        exercises: (workout.exercises || []).map((ex: any) => ({
          name: ex.exerciseName || ex.name || "",
          sets: typeof ex.sets === "number" ? ex.sets : 0,
          reps: typeof ex.reps === "number" ? ex.reps : 0,
          exerciseId: ex.exerciseId || ex.id,
          duration: ex.duration,
          restTime: ex.restTime,
        })),
      },
      caloriesBurned: actualCaloriesBurned,
      durationMinutes: sessionData?.duration || workout.duration || 0,
      completedAt: new Date().toISOString(),
      weekStart: getCurrentWeekStart(),
    } satisfies CompletedSession);

    // SSOT Fix 19: update achievementStore.currentStreak so all consumers
    // reading the store see the real streak immediately after extra workout.
    useAchievementStore.getState().updateCurrentStreak();
    if (userId) {
      await useAchievementStore.getState().reconcileWithCurrentData(userId);
    }

    // Trigger UI refresh
    try {
      await fitnessRefreshService.refreshAfterWorkoutCompleted({
        workoutId,
        workoutName: workout.title,
        duration: workout.duration,
        caloriesBurned: actualCaloriesBurned,
      });
    } catch (refreshErr) {
      console.error(
        "⚠️ Failed to trigger fitness refresh after extra workout:",
        refreshErr,
      );
    }

    return true;
  } catch (err) {
    console.error("❌ completeExtraWorkout failed:", err);
    return false;
  }
}
