import { useFitnessStore } from "../../stores/fitnessStore";
import { supabase } from "../supabase";
import { fitnessRefreshService } from "../fitnessRefreshService";
import { analyticsDataService } from "../analyticsData";
import { EventEmitter } from "./event-emitter";
import { CompletionEvent } from "./types";
import { calculateActualCalories } from "./calorie-calculator";

export async function completeWorkout(
  emitter: EventEmitter,
  workoutId: string,
  sessionData?: any,
  userId?: string,
): Promise<boolean> {
  try {
    const fitnessStore = useFitnessStore.getState();

    await fitnessStore.completeWorkout(workoutId, sessionData?.sessionId);

    const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
      (w) => w.id === workoutId,
    );

    if (workout) {
      const actualCaloriesBurned = calculateActualCalories(
        workout as any,
        sessionData,
      );

      if (userId) {
        try {
          const supabaseResult = await supabase
            .from("workout_sessions")
            .insert({
              user_id: userId,
              workout_id: workoutId,
              workout_name: workout.title,
              workout_type: workout.category || "general",
              duration_minutes:
                workout.duration || sessionData?.duration || null,
              calories_burned: actualCaloriesBurned,
              exercises_completed:
                sessionData?.exercisesCompleted ||
                workout.exercises?.length ||
                0,
              started_at: sessionData?.startedAt || new Date().toISOString(),
              completed_at: new Date().toISOString(),
              notes:
                sessionData?.notes || `Weekly workout plan: ${workout.title}`,
            });

          if (supabaseResult.error) {
            console.error(
              `⚠️ Supabase workout_sessions insert error:`,
              supabaseResult.error,
            );
          } else {
            console.log(
              `✅ Supabase workout_sessions synced for: ${workout.title} (${actualCaloriesBurned} cal MET-based, ${workout.duration} min)`,
            );

            try {
              await analyticsDataService.updateTodaysMetrics(userId, {
                workoutsCompleted: 1,
                caloriesBurned: actualCaloriesBurned,
              });
              console.log(
                "📊 Analytics metrics updated for workout completion",
              );
            } catch (analyticsError) {
              console.warn(
                "⚠️ Failed to update analytics metrics:",
                analyticsError,
              );
            }

            try {
              await fitnessRefreshService.refreshAfterWorkoutCompleted({
                workoutId,
                workoutName: workout.title,
                duration: workout.duration,
                caloriesBurned: actualCaloriesBurned,
              });
              console.log(
                "🔄 Fitness refresh triggered after workout completion",
              );
            } catch (refreshError) {
              console.warn(
                "⚠️ Failed to trigger fitness refresh:",
                refreshError,
              );
            }
          }
        } catch (supabaseError) {
          console.error(
            `❌ Failed to sync workout to Supabase:`,
            supabaseError,
          );
        }
      } else {
        console.log(
          "⚠️ No userId provided, skipping Supabase sync for workout",
        );
      }

      const event: CompletionEvent = {
        id: `workout_completion_${workoutId}_${Date.now()}`,
        type: "workout",
        itemId: workoutId,
        completedAt: new Date().toISOString(),
        progress: 100,
        data: {
          workout,
          sessionData,
          calories: workout.estimatedCalories,
          duration: workout.duration,
        },
      };

      emitter.emit(event);
      console.log(`✅ Workout completed: ${workout.title}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Failed to complete workout:", error);
    return false;
  }
}
