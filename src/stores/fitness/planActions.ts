import * as crypto from "expo-crypto";
import { WeeklyWorkoutPlan } from "../../ai";
import { FitnessState } from "./types";
import { crudOperations } from "../../services/crudOperations";
import { offlineService } from "../../services/offline";
import { supabase } from "../../services/supabase";
import { generateUUID, isValidUUID } from "../../utils/uuid";
import { getCurrentUserId, getUserIdOrGuest } from "../../services/authUtils";
import { Platform } from "react-native";
import { LocalWorkoutSession, SyncStatus } from "../../types/localData";

export const createPlanActions = (
  set: (
    partial:
      | Partial<FitnessState>
      | ((state: FitnessState) => Partial<FitnessState>),
  ) => void,
  get: () => FitnessState,
) => ({
  setWeeklyWorkoutPlan: (plan: WeeklyWorkoutPlan | null) => {
    set({ weeklyWorkoutPlan: plan });
  },

  saveWeeklyWorkoutPlan: async (plan: WeeklyWorkoutPlan) => {
    try {
      const planTitle =
        plan.planTitle || `Week ${plan.weekNumber} Workout Plan`;

      set({ weeklyWorkoutPlan: plan });

      if (!plan.workouts || plan.workouts.length === 0) {
        console.warn("⚠️ No workouts in plan to save to database");
        return;
      }

      let savedCount = 0;
      let errorCount = 0;

      for (const workout of plan.workouts) {
        try {
          if (!workout.id || !workout.title) {
            console.error("❌ Invalid workout data:", workout);
            errorCount++;
            continue;
          }

          const workoutSession: LocalWorkoutSession = {
            id: crypto.randomUUID(),
            localId: `local_${workout.id}_${Date.now()}`,
            workoutId: workout.id,
            userId: getUserIdOrGuest(),
            startedAt: new Date().toISOString(),
            completedAt: null,
            duration: workout.duration
              ? Math.max(5, Math.min(300, workout.duration))
              : null,
            caloriesBurned: workout.estimatedCalories
              ? Math.max(0, Math.min(10000, workout.estimatedCalories))
              : null,
            exercises: (workout.exercises || []).map((exercise) => ({
              exerciseId: exercise.exerciseId || "unknown_exercise",
              sets: Array.from(
                { length: Math.max(1, exercise.sets || 3) },
                (_, index) => ({
                  reps:
                    typeof exercise.reps === "string"
                      ? parseInt(exercise.reps) || 10
                      : exercise.reps || 10,
                  weight: exercise.weight || 0,
                  duration: 0,
                  restTime: exercise.restTime || 60,
                  rpe: 5,
                  completed: false,
                }),
              ),
              notes: exercise.notes || "",
              personalRecord: false,
            })),
            notes: `${workout.dayOfWeek || "unknown"} - ${workout.description || workout.title}`,
            rating: 0,
            isCompleted: false,
            syncStatus: "pending" as SyncStatus,
            syncMetadata: {
              lastSyncedAt: undefined,
              lastModifiedAt: new Date().toISOString(),
              syncVersion: 1,
              deviceId: Platform.OS ?? "unknown",
            },
          };

          await crudOperations.createWorkoutSession(workoutSession);
          savedCount++;
        } catch (workoutError) {
          console.error(
            `❌ Failed to save workout ${workout.title}:`,
            workoutError,
          );
          errorCount++;
        }
      }

      if (errorCount > 0 && savedCount === 0) {
        throw new Error(`Failed to save any workouts (${errorCount} errors)`);
      }
    } catch (error) {
      console.error("❌ Failed to save workout plan:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save workout plan";
      set({ planError: errorMessage });

      if (!get().weeklyWorkoutPlan) {
        throw error;
      }
    }

    try {
      await offlineService.clearFailedActionsForTable("weekly_workout_plans");

      const userId = getCurrentUserId();
      const planId = generateUUID();

      if (!userId) {
        console.error("❌ No authenticated user - cannot save to database");
        throw new Error("User must be authenticated to save workout plans");
      }

      if (!isValidUUID(userId)) {
        console.error("❌ Invalid user UUID format:", userId);
        throw new Error("Invalid user UUID format");
      }
      if (!isValidUUID(planId)) {
        console.error("❌ Invalid plan UUID format:", planId);
        throw new Error("Invalid plan UUID format");
      }

      let activePlanRowId = (plan as any).databaseId || null;
      if (!activePlanRowId) {
        try {
          const { data: activePlans } = await supabase
            .from("weekly_workout_plans")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1);
          activePlanRowId = activePlans?.[0]?.id || null;
        } catch (activePlanLookupError) {
          console.warn(
            "Failed to look up active weekly workout plan before queueing save; falling back to queued create:",
            activePlanLookupError,
          );
        }
      }

      const planRowId = activePlanRowId || planId;
      const hasConfirmedDatabaseId = Boolean(
        activePlanRowId || (plan as any).databaseId,
      );
      const planDataWithDbId = hasConfirmedDatabaseId
        ? {
            ...plan,
            databaseId: activePlanRowId || (plan as any).databaseId,
          }
        : plan;

      set({ weeklyWorkoutPlan: planDataWithDbId });

      const weeklyPlanData = {
        id: planRowId,
        user_id: userId,
        plan_title: plan.planTitle || `Week ${plan.weekNumber} Plan`,
        plan_description:
          plan.planDescription ||
          `${plan.workouts.length} workouts over ${plan.duration || "1 week"}`,
        week_number: plan.weekNumber || 1,
        total_workouts: plan.workouts.length,
        duration_range: plan.duration ? String(plan.duration) : "1 week",
        plan_data: planDataWithDbId,
        is_active: true,
      };

      await offlineService.queueAction({
        type: activePlanRowId ? "UPDATE" : "CREATE",
        table: "weekly_workout_plans",
        data: weeklyPlanData,
        userId: getUserIdOrGuest(),
        maxRetries: 3,
      });
    } catch (weeklyPlanError) {
      console.error(
        "❌ Failed to save weekly workout plan to database:",
        weeklyPlanError,
      );
      const errorMessage =
        weeklyPlanError instanceof Error
          ? weeklyPlanError.message
          : "Failed to save workout plan to database";
      set({ planError: errorMessage });
    }
  },

  loadWeeklyWorkoutPlan: async () => {
    try {
      // Do NOT return early if a plan already exists in the store.
      // A guest-generated plan must not block loading the real Supabase plan after login.
      try {
        const userId = getCurrentUserId();
        if (userId) {
          const { data: weeklyPlans, error } = await supabase
            .from("weekly_workout_plans")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!error && weeklyPlans && weeklyPlans.length > 0) {
            const latestPlan = weeklyPlans[0];

            const planData = latestPlan.plan_data;
            if (planData && planData.workouts) {
              const planWithDbId = {
                ...planData,
                databaseId: latestPlan.id,
              };
              set({ weeklyWorkoutPlan: planWithDbId });
              return planWithDbId;
            }
          } else {
          }
        }
      } catch (dbError) {
        console.warn(
          "⚠️ Failed to load from database, trying individual sessions:",
          dbError,
        );
      }

      const workoutSessions = await crudOperations.readWorkoutSessions();

      return null;
    } catch (error) {
      console.error("❌ Failed to load workout plan:", error);
      return null;
    }
  },

  setGeneratingPlan: (isGenerating: boolean) => {
    set({ isGeneratingPlan: isGenerating });
  },

  setPlanError: (error: string | null) => {
    set({ planError: error });
  },
});
