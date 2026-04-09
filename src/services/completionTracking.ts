import { useFitnessStore } from "../stores/fitnessStore";
import { useNutritionStore } from "../stores/nutritionStore";
import { useProfileStore } from "../stores/profileStore";
import { useAchievementStore } from "../stores/achievementStore";
import { DayWorkout, DayMeal, WorkoutSet } from "../ai";
import crudOperations from "./crudOperations";
import { MealLog, SyncStatus } from "../types/localData";
import { supabase } from "./supabase";
import { nutritionRefreshService } from "./nutritionRefreshService";
import { fitnessRefreshService } from "./fitnessRefreshService";
import {
  calculateWorkoutCalories,
  ExerciseCalorieInput,
} from "./calorieCalculator";
import { analyticsDataService } from "./analyticsData";
import { resolveCurrentWeightForUser } from "./currentWeight";
import { weightTrackingService } from "./WeightTrackingService";
import { getCurrentWeekStart, getWeekStartForDate } from "../utils/weekUtils";
import { getWorkoutDayKey, getWorkoutSlotKey } from "../utils/workoutIdentity";
import { generateUUID } from "../utils/uuid";
import { MealLogProvenance } from "../types/nutritionLogging";

export interface CompletionEvent {
  id: string;
  type: "workout" | "meal";
  itemId: string;
  completedAt: string;
  progress: number;
  data: any;
}

function createLoggedFoodsFromMealItems(meal: DayMeal) {
  return (meal.items || []).map((item: any, index: number) => ({
    id: item.id || `${meal.id}_food_${index}`,
    foodId: item.foodId || item.id || `${meal.id}_food_${index}`,
    name: item.name,
    quantity: typeof item.quantity === "number" ? item.quantity : 1,
    unit: item.unit || "serving",
    calories: item.calories ?? 0,
    macros: {
      protein: item.macros?.protein ?? 0,
      carbohydrates: item.macros?.carbohydrates ?? 0,
      fat: item.macros?.fat ?? 0,
      fiber: item.macros?.fiber ?? 0,
      sugar: item.macros?.sugar ?? 0,
      sodium: item.macros?.sodium ?? 0,
    },
    provenance: (meal as DayMeal & { sourceMetadata?: MealLogProvenance }).sourceMetadata,
  }));
}

class CompletionTrackingService {
  private listeners: ((event: CompletionEvent) => void)[] = [];

  // Subscribe to completion events
  subscribe(listener: (event: CompletionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Emit completion event
  private emit(event: CompletionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Calculate actual calories burned using MET-based formula
   * Uses user's real weight for personalized calculation
   * NO FALLBACK VALUES - returns 0 if weight not available
   */
  private async calculateActualCalories(
    workout: DayWorkout,
    sessionData?: any,
    userId?: string,
  ): Promise<number> {
    // If session data has pre-calculated stats (from WorkoutSessionScreen), use those
    if (
      sessionData?.stats?.caloriesBurned &&
      sessionData.stats.caloriesBurned > 0
    ) {
      return sessionData.stats.caloriesBurned;
    }

    const trackedWeight = weightTrackingService.getCurrentWeight();
    const fallbackWeight =
      useProfileStore.getState().bodyAnalysis?.current_weight_kg;
    const resolvedWeight = userId
      ? await resolveCurrentWeightForUser(userId, {
          bodyAnalysisWeight: fallbackWeight,
        })
      : {
          value: trackedWeight ?? fallbackWeight ?? null,
        };
    const userWeight =
      trackedWeight && trackedWeight > 0 ? trackedWeight : resolvedWeight.value;

    // NO FALLBACK - if weight not available, return 0 and log warning
    if (!userWeight || userWeight <= 0) {
      return 0;
    }

    // Calculate from exercises using MET values
    if (workout.exercises && workout.exercises.length > 0) {
      const exerciseInputs: ExerciseCalorieInput[] = workout.exercises.map(
        (ex) => {
          // Runtime data from Workers API may include bodyParts/muscle_groups/targetMuscles
          const exAny = ex as WorkoutSet & { bodyParts?: string[]; muscle_groups?: string[]; targetMuscles?: string[] };
          return {
            exerciseId: ex.exerciseId || ex.id,
            name: ex.exerciseName || ex.name,
            sets: ex.sets,
            reps: ex.reps,
            duration: ex.duration,
            restTime: ex.restTime,
            bodyParts: exAny.bodyParts || exAny.muscle_groups || exAny.targetMuscles || [],
          };
        },
      );

      const result = calculateWorkoutCalories(exerciseInputs, userWeight);

      if (result.totalCalories > 0) {
        return result.totalCalories;
      }
    }

    // No exercises to calculate from

    return 0;
  }

  // Complete a workout
  async completeWorkout(
    workoutId: string,
    sessionData?: any,
    userId?: string,
  ): Promise<boolean> {
    try {
      const fitnessStore = useFitnessStore.getState();

      // Get workout details before completing so we can calculate calories
      // Search BOTH AI plan and custom plan so custom workouts can complete
      const workoutFromAIPlan = fitnessStore.weeklyWorkoutPlan?.workouts.find(
        (w) => w.id === workoutId,
      );
      const workout = workoutFromAIPlan ?? fitnessStore.customWeeklyPlan?.workouts.find(
        (w) => w.id === workoutId,
      );
      const workoutSourcePlan = workoutFromAIPlan
        ? fitnessStore.weeklyWorkoutPlan
        : fitnessStore.customWeeklyPlan;

      if (workout) {
        // Calculate actual calories using MET-based formula with user's weight
        const actualCaloriesBurned = await this.calculateActualCalories(
          workout,
          sessionData,
          userId,
        );
        const completedAt = new Date().toISOString();
        const completedDurationMinutes =
          sessionData?.duration || workout.duration || 0;
        const completedExercises =
          sessionData?.stats?.exercises || workout.exercises || [];

        // Update workout progress to 100%, persisting calories in the store
        await fitnessStore.completeWorkout(
          workoutId,
          sessionData?.sessionId,
          actualCaloriesBurned || undefined,
        );

        // Will be set to the Supabase-generated row ID after a successful insert.
        // Using this as sessionId ensures loadData() dedup matches by ID and avoids
        // double-counting when the realtime subscription re-fires loadData().
        let supabaseSessionId: string | null = null;

        // Sync workout completion to Supabase (only for logged-in users)
        if (userId) {
          try {
            const completionPayload = {
              user_id: userId,
              workout_id: workoutId,
              workout_plan_id: workoutSourcePlan?.databaseId || null,
              planned_day_key: getWorkoutDayKey(workout),
              plan_slot_key: getWorkoutSlotKey(
                workout,
                workoutSourcePlan || undefined,
              ),
              workout_name: workout.title,
              workout_type: workout.category || "general",
              is_extra: false,
              duration: completedDurationMinutes || null, // H18: canonical column for reads
              total_duration_minutes: completedDurationMinutes || null, // kept for backward compat
              calories_burned: actualCaloriesBurned,
              exercises_completed: completedExercises,
              started_at: sessionData?.startedAt || completedAt,
              completed_at: completedAt,
              is_completed: true,
              rating: sessionData?.rating || null, // H18: canonical — read by dataTransformation.ts
              notes:
                sessionData?.notes || `Weekly workout plan: ${workout.title}`,
            };

            let supabaseResult;
            if (sessionData?.sessionId) {
              supabaseResult = await supabase
                .from("workout_sessions")
                .update(completionPayload)
                .eq("id", sessionData.sessionId)
                .eq("user_id", userId)
                .select("id")
                .single();

              if (supabaseResult.error) {
                supabaseResult = await supabase
                  .from("workout_sessions")
                  .insert(completionPayload)
                  .select("id")
                  .single();
              }
            } else {
              supabaseResult = await supabase
                .from("workout_sessions")
                .insert(completionPayload)
                .select("id")
                .single();
            }

            if (supabaseResult.error) {
              console.error(
                `⚠️ Supabase workout_sessions insert error:`,
                supabaseResult.error,
              );
            } else {
              // Use the Supabase-generated row ID as sessionId so loadData() dedup works
              if (supabaseResult.data?.id) {
                supabaseSessionId = supabaseResult.data.id;
              }

              if (supabaseSessionId) {
                this._writeExerciseSets(
                  userId,
                  supabaseSessionId,
                  completedExercises,
                ).catch((err) => {
                  console.error("⚠️ _writeExerciseSets failed:", err);
                });
              }

              // Save to analytics_metrics for Monthly Summary tracking
              try {
                await analyticsDataService.updateTodaysMetrics(userId, {
                  workoutsCompleted: 1,
                  caloriesBurned: actualCaloriesBurned,
                });
              } catch (analyticsError) {
                console.error(
                  "⚠️ Failed to update analytics metrics:",
                  analyticsError,
                );
              }

              // CRITICAL: Trigger refresh so fitness hooks refetch data
              // This ensures UI updates immediately after workout completion
              try {
                await fitnessRefreshService.refreshAfterWorkoutCompleted({
                  workoutId,
                  workoutName: workout.title,
                  duration: completedDurationMinutes,
                  caloriesBurned: actualCaloriesBurned,
                });
              } catch (refreshError) {
                console.error(
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
            // Continue - local storage succeeded
          }
        }

        // ALWAYS update store (Rule 6: store is the runtime source)
        // NOTE: addCompletedSession cannot be moved before the DB call (not optimistic)
        // because sessionId uses supabaseSessionId — the server-generated row ID that is
        // only available after the Supabase insert. Without it, loadData() dedup would
        // fail to match the stored session when the realtime subscription re-fires,
        // causing double-counting in the completed sessions list.
        useFitnessStore.getState().addCompletedSession({
          sessionId:
            supabaseSessionId || sessionData?.sessionId || generateUUID(),
          type: "planned" as const,
          workoutId: workoutId,
          plannedDayKey: getWorkoutDayKey(workout),
          planSlotKey: getWorkoutSlotKey(
            workout,
            workoutSourcePlan || undefined,
          ),
          workoutSnapshot: {
            title: workout.title,
            category: workout.category || "general",
            duration: completedDurationMinutes,
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
          durationMinutes: completedDurationMinutes,
          completedAt,
          weekStart: getWeekStartForDate(completedAt),
        });

        // SSOT Fix 19: update achievementStore.currentStreak immediately
        // so all readers always see the real live streak value.
        useAchievementStore.getState().updateCurrentStreak();
        if (userId) {
          await useAchievementStore.getState().reconcileWithCurrentData(userId);
        }

        const event: CompletionEvent = {
          id: `workout_completion_${workoutId}_${Date.now()}`,
          type: "workout",
          itemId: workoutId,
          completedAt,
          progress: 100,
          data: {
            workout,
            sessionData,
            calories: actualCaloriesBurned,
            duration: completedDurationMinutes,
          },
        };

        this.emit(event);

        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Failed to complete workout:", error);
      return false;
    }
  }

  // Complete a meal
  async completeMeal(
    mealId: string,
    logData?: any,
    userId?: string,
  ): Promise<boolean> {
    try {
      const nutritionStore = useNutritionStore.getState();

      // Update meal progress to 100%
      await nutritionStore.completeMeal(mealId, logData?.logId);

      // Get meal details for the event
      const meal = nutritionStore.weeklyMealPlan?.meals.find(
        (m) => m.id === mealId,
      );

      if (meal) {
        const userCountry = useProfileStore.getState().personalInfo?.country || null;
        if (!userCountry) {
          console.warn('[completionTracking] country not available for meal provenance — using null');
        }
        const provenance: MealLogProvenance = logData?.provenance ||
          (meal as DayMeal & { sourceMetadata?: MealLogProvenance }).sourceMetadata || {
            mode: "manual",
            truthLevel: "curated",
            confidence: null,
            countryContext: userCountry,
            requiresReview: false,
            source: "manual-log",
          };

        // Create actual meal log in database for calorie tracking
        try {
          // Use provided userId - NO FALLBACK to fake user IDs
          const currentUserId = userId;
          const completedAt = new Date().toISOString();
          const planMealId = meal.id;
          const mealLogId = generateUUID();

          if (currentUserId) {
            const mealLog: MealLog = {
              id: mealLogId,
              planMealId,
              fromPlan: true,
              portionMultiplier: 1,
              mealType: meal.type as "breakfast" | "lunch" | "dinner" | "snack",
              foods: createLoggedFoodsFromMealItems(meal),
              totalCalories: meal.totalCalories || 0,
              totalMacros: {
                protein: meal.totalMacros?.protein ?? 0,
                carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                fat: meal.totalMacros?.fat ?? 0,
                fiber: meal.totalMacros?.fiber ?? 0,
                sugar: meal.totalMacros?.sugar ?? 0,
                sodium: meal.totalMacros?.sodium ?? 0,
              },
              loggedAt: completedAt,
              notes: `Weekly meal plan: ${meal.name}`,
              provenance,
              syncStatus: SyncStatus.PENDING,
              syncMetadata: {
                lastModifiedAt: new Date().toISOString(),
                syncVersion: 1,
                deviceId: "local",
              },
            };

            // Store the meal log locally
            await crudOperations.createMealLog(mealLog);

            // CRITICAL: Also insert into Supabase meal_logs table for stats sync
            // This ensures loadDailyNutrition can read the data from Supabase
            try {
              const supabaseResult = await supabase
                .from("meal_logs")
                .insert({
                  id: mealLogId,
                  user_id: currentUserId,
                  meal_type: meal.type,
                  meal_name: meal.name,
                  from_plan: true,
                  plan_meal_id: planMealId,
                  portion_multiplier: 1,
                  food_items: meal.items || [],
                  total_calories: meal.totalCalories || 0,
                  total_protein: meal.totalMacros?.protein ?? 0,
                  total_carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                  total_fat: meal.totalMacros?.fat ?? 0,
                  logging_mode: provenance.mode,
                  truth_level: provenance.truthLevel,
                  confidence: provenance.confidence ?? null,
                  country_context: provenance.countryContext ?? null,
                  requires_review: provenance.requiresReview,
                  source_metadata: {
                    source: provenance.source ?? null,
                    productIdentity: provenance.productIdentity ?? null,
                    conflict: provenance.conflict ?? null,
                  },
                  notes: logData?.reviewNote || null,
                  logged_at: completedAt,
                })
                .select("id")
                .single();

              if (supabaseResult.error) {
                console.error(
                  `⚠️ Supabase meal_logs insert error:`,
                  supabaseResult.error,
                );
              } else {
                if (supabaseResult.data?.id) {
                  useNutritionStore.setState((state) => ({
                    mealProgress: {
                      ...state.mealProgress,
                      [mealId]: {
                        ...state.mealProgress[mealId],
                        mealId,
                        planMealId,
                        logId: mealLogId,
                        progress: 100,
                        completedAt,
                      },
                    },
                  }));

                  // Bug 1 fix: update dailyMeals so getTodaysConsumedNutrition reflects
                  // this meal immediately (Rule 6: store is the runtime source).
                  useNutritionStore.getState().addDailyMeal({
                    id: meal.id,
                    type: meal.type,
                    name: meal.name,
                    items: meal.items || [],
                    totalCalories: meal.totalCalories || 0,
                    totalMacros: {
                      protein: meal.totalMacros?.protein ?? 0,
                      carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                      fat: meal.totalMacros?.fat ?? 0,
                      fiber: meal.totalMacros?.fiber ?? 0,
                      sugar: meal.totalMacros?.sugar ?? 0,
                      sodium: meal.totalMacros?.sodium ?? 0,
                    },
                    tags: meal.tags || [],
                    isPersonalized: meal.isPersonalized ?? false,
                    aiGenerated: meal.aiGenerated ?? true,
                    createdAt: meal.createdAt || completedAt,
                    updatedAt: completedAt,
                    loggedAt: completedAt,
                  });
                }

                // Save to analytics_metrics for Monthly Summary tracking
                try {
                  await analyticsDataService.updateTodaysMetrics(
                    currentUserId,
                    {
                      mealsLogged: 1,
                      caloriesConsumed: meal.totalCalories || 0,
                    },
                  );
                } catch (analyticsError) {
                  console.error(
                    "⚠️ Failed to update analytics metrics:",
                    analyticsError,
                  );
                }

                // CRITICAL: Trigger refresh so useNutritionData hook refetches dailyNutrition
                // This ensures the calorie ring updates immediately after meal completion
                try {
                  await nutritionRefreshService.triggerRefresh();
                } catch (refreshError) {
                  console.error(
                    "⚠️ Failed to trigger nutrition refresh:",
                    refreshError,
                  );
                }
              }
            } catch (supabaseError) {
              console.error(
                `❌ Failed to sync to Supabase meal_logs:`,
                supabaseError,
              );
              // Revert the optimistic completeMeal() state since DB write failed
              useNutritionStore.setState((state) => ({
                mealProgress: {
                  ...state.mealProgress,
                  [mealId]: {
                    ...state.mealProgress[mealId],
                    progress: 0,
                    completedAt: undefined,
                    logId: undefined,
                  },
                },
              }));
            }
          } else {
            // Continue with completion even if no user
          }
        } catch (mealLogError) {
          console.error(`❌ Error creating meal log:`, mealLogError);
          // Continue with completion even if logging fails
        }

        const event: CompletionEvent = {
          id: `meal_completion_${mealId}_${Date.now()}`,
          type: "meal",
          itemId: mealId,
          completedAt: new Date().toISOString(),
          progress: 100,
          data: {
            meal,
            logData,
            calories: meal.totalCalories,
            ingredients: meal.items?.length || 0,
          },
        };

        this.emit(event);

        // Verify the meal progress was saved
        const savedProgress = nutritionStore.getMealProgress(mealId);

        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Failed to complete meal:", error);
      return false;
    }
  }

  // Update workout progress
  async updateWorkoutProgress(
    workoutId: string,
    progress: number,
    exerciseData?: any,
    userId?: string,
  ): Promise<boolean> {
    try {
      const fitnessStore = useFitnessStore.getState();
      fitnessStore.updateWorkoutProgress(workoutId, progress);

      // Emit progress event — search both AI plan and custom plan
      const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
        (w) => w.id === workoutId,
      ) ?? fitnessStore.customWeeklyPlan?.workouts.find(
        (w) => w.id === workoutId,
      );
      if (workout) {
        const event: CompletionEvent = {
          id: `workout_progress_${workoutId}_${Date.now()}`,
          type: "workout",
          itemId: workoutId,
          completedAt: new Date().toISOString(),
          progress,
          data: {
            workout,
            exerciseData,
            partialCalories: (() => {
              const trackedW = weightTrackingService.getCurrentWeight();
              const fallbackW = useProfileStore.getState().bodyAnalysis?.current_weight_kg;
              const resolvedW = (trackedW && trackedW > 0) ? trackedW : (fallbackW ?? 0);
              const base = workout.estimatedCalories && workout.estimatedCalories > 0
                ? workout.estimatedCalories
                : Math.round(6 * resolvedW * ((workout.duration || 45) / 60));
              return Math.round(base * (progress / 100));
            })(),
          },
        };

        this.emit(event);

        // Auto-complete if progress reaches 100%
        if (progress >= 100) {
          return this.completeWorkout(workoutId, exerciseData, userId);
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to update workout progress:", error);
      return false;
    }
  }

  // Update meal progress
  async updateMealProgress(
    mealId: string,
    progress: number,
    ingredientData?: any,
  ): Promise<boolean> {
    try {
      const nutritionStore = useNutritionStore.getState();
      nutritionStore.updateMealProgress(mealId, progress);

      // Emit progress event
      const meal = nutritionStore.weeklyMealPlan?.meals.find(
        (m) => m.id === mealId,
      );
      if (meal) {
        const event: CompletionEvent = {
          id: `meal_progress_${mealId}_${Date.now()}`,
          type: "meal",
          itemId: mealId,
          completedAt: new Date().toISOString(),
          progress,
          data: {
            meal,
            ingredientData,
            partialCalories: Math.round(
              (meal.totalCalories || 0) * (progress / 100),
            ),
          },
        };

        this.emit(event);

        // Auto-complete if progress reaches 100%
        if (progress >= 100) {
          // Note: userId should be passed from caller - don't use fake ID
          return this.completeMeal(mealId, ingredientData, undefined);
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to update meal progress:", error);
      return false;
    }
  }

  // Get completion stats
  getCompletionStats(): {
    workouts: {
      completed: number;
      total: number;
      completionRate: number;
    };
    meals: {
      completed: number;
      total: number;
      completionRate: number;
    };
    totalCaloriesBurned: number;
    totalCaloriesConsumed: number;
  } {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    // Calculate workout stats from completedSessions — single source of truth
    const weekStart = getCurrentWeekStart();
    const plannedStats = fitnessStore.getPlannedSessionStats(weekStart);
    const extraStats = fitnessStore.getExtraSessionStats(weekStart);
    const completedWorkouts = plannedStats.count;
    const caloriesBurned =
      plannedStats.totalCalories + extraStats.totalCalories;

    const activePlan = fitnessStore.activePlanSource === 'custom'
      ? fitnessStore.customWeeklyPlan
      : fitnessStore.weeklyWorkoutPlan;
    const totalWorkouts = activePlan?.workouts.length || 0;

    // Calculate meal stats
    const totalMeals = nutritionStore.weeklyMealPlan?.meals.length || 0;
    const completedMeals = Object.values(nutritionStore.mealProgress).filter(
      (p) => p.progress === 100,
    ).length;

    const mealMap = new Map(
      (nutritionStore.weeklyMealPlan?.meals ?? []).map((m) => [m.id, m]),
    );
    const caloriesConsumed = Object.values(nutritionStore.mealProgress)
      .filter((p) => p.progress === 100)
      .reduce((total, progress) => {
        const meal = mealMap.get(progress.mealId);
        return total + (meal?.totalCalories || 0);
      }, 0);

    return {
      workouts: {
        completed: completedWorkouts,
        total: totalWorkouts,
        completionRate:
          totalWorkouts > 0
            ? Math.round((completedWorkouts / totalWorkouts) * 100)
            : 0,
      },
      meals: {
        completed: completedMeals,
        total: totalMeals,
        completionRate:
          totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0,
      },
      totalCaloriesBurned: caloriesBurned,
      totalCaloriesConsumed: caloriesConsumed,
    };
  }

  // Get today's completion status
  getTodaysCompletions(): {
    workout: { completed: boolean; progress: number } | null;
    meals: { completed: number; total: number; progress: number };
  } {
    const today = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[today.getDay()];

    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    // Today's workout — search both AI plan and custom plan
    const todaysWorkout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
      (w) => w.dayOfWeek === todayName,
    ) ?? fitnessStore.customWeeklyPlan?.workouts.find(
      (w) => w.dayOfWeek === todayName,
    );
    const workoutProgress = todaysWorkout
      ? fitnessStore.getWorkoutProgress(todaysWorkout.id)
      : null;

    // Today's meals
    const todaysMeals =
      nutritionStore.weeklyMealPlan?.meals.filter(
        (m) => m.dayOfWeek === todayName,
      ) || [];
    const completedMeals = todaysMeals.filter((meal) => {
      const progress = nutritionStore.getMealProgress(meal.id);
      return progress?.progress === 100;
    }).length;

    return {
      workout: todaysWorkout
        ? {
            completed: workoutProgress?.progress === 100,
            progress: workoutProgress?.progress || 0,
          }
        : null,
      meals: {
        completed: completedMeals,
        total: todaysMeals.length,
        progress:
          todaysMeals.length > 0
            ? Math.round((completedMeals / todaysMeals.length) * 100)
            : 0,
      },
    };
  }

  // Mark all today's items as completed (for testing)
  async completeAllToday(): Promise<void> {
    const today = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[today.getDay()];

    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    // Complete today's workout — search both AI plan and custom plan
    const todaysWorkout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
      (w) => w.dayOfWeek === todayName,
    ) ?? fitnessStore.customWeeklyPlan?.workouts.find(
      (w) => w.dayOfWeek === todayName,
    );
    if (todaysWorkout) {
      await this.completeWorkout(todaysWorkout.id);
    }

    // Complete today's meals
    // Note: This is a test function - userId should be provided by caller in production
    const todaysMeals =
      nutritionStore.weeklyMealPlan?.meals.filter(
        (m) => m.dayOfWeek === todayName,
      ) || [];
    for (const meal of todaysMeals) {
      await this.completeMeal(meal.id, undefined, undefined);
    }
  }

  // Dual-write per-set data to exercise_sets table (fire-and-forget)
  // Also runs belt-and-suspenders PR detection for time-based exercises
  // (SetLogModal handles PR detection for normal sets; this covers auto-logged sets)
  private async _writeExerciseSets(
    userId: string,
    sessionId: string,
    completedExercises: any[],
  ): Promise<void> {
    if (!completedExercises?.length) return;

    const now = new Date().toISOString();
    const rows: any[] = [];

    for (const exercise of completedExercises) {
      const exerciseId = exercise.exerciseId || exercise.id || "unknown";
      const exerciseName = exercise.name || exercise.exerciseName || null;
      const sets = exercise.sets || exercise.completedSets || [];

      if (Array.isArray(sets) && sets.length > 0) {
        // Per-set data available
        for (let i = 0; i < sets.length; i++) {
          const set = sets[i];
          rows.push({
            user_id: userId,
            session_id: sessionId,
            exercise_id: exerciseId,
            exercise_name: exerciseName,
            set_number: i + 1,
            weight_kg: set.weight ?? set.weight_kg ?? null,
            reps: set.reps ?? null,
            duration_seconds: set.duration_seconds ?? null,
            set_type: set.setType ?? set.set_type ?? "normal",
            is_completed: set.completed ?? set.is_completed ?? true,
            rpe: set.rpe ?? null,                          // NEW: RPE from three-tap UI
            is_calibration: set.isCalibration ?? false,    // NEW: calibration session flag
            completed_at: now,
          });
        }
      } else {
        // Flat exercise data — infer from sets/reps fields
        const numSets = typeof exercise.sets === "number" ? exercise.sets : 1;
        const reps =
          typeof exercise.reps === "string"
            ? parseInt(exercise.reps.split("-")[1] || exercise.reps, 10)
            : (exercise.reps ?? null);

        for (let i = 0; i < numSets; i++) {
          rows.push({
            user_id: userId,
            session_id: sessionId,
            exercise_id: exerciseId,
            exercise_name: exerciseName,
            set_number: i + 1,
            weight_kg: null,
            reps: reps,
            duration_seconds: null,
            set_type: "normal",
            is_completed: true,
            rpe: null,            // flat exercise path — no RPE available
            is_calibration: false,
            completed_at: now,
          });
        }
      }
    }

    if (rows.length === 0) return;

    const { error } = await supabase.from("exercise_sets").insert(rows);

    if (error) {
      console.error("⚠️ Failed to write exercise_sets:", error);
      return;
    }

    // GAP-02/08: Belt-and-suspenders PR detection at session completion.
    // SetLogModal already records PRs for normal sets logged live.
    // This path catches time-based exercises (auto-logged, no modal shown).
    try {
      const { prDetectionService } = await import("./prDetectionService");
      const { exerciseHistoryService } = await import("./exerciseHistoryService");
      const { estimateOneRepMax } = await import("../utils/oneRepMax");

      for (const exercise of completedExercises) {
        const exerciseId = exercise.exerciseId || exercise.id || "unknown";
        const exerciseName = exercise.name || exercise.exerciseName || undefined;
        const sets = exercise.sets || exercise.completedSets || [];
        if (!Array.isArray(sets) || sets.length === 0) continue;

        // Only process sets with actual numeric weight/reps (time-based have duration_seconds)
        const weightedSets = sets.filter(
          (s: any) => (s.weight ?? s.weight_kg ?? 0) > 0 && (s.reps ?? 0) > 0
        );
        if (weightedSets.length === 0) continue;

        // Find the best set from this session
        let bestWeight = 0;
        let bestWeightReps = 0;
        let bestE1RM = 0;
        let bestE1RMReps = 0;
        for (const s of weightedSets) {
          const w = s.weight ?? s.weight_kg ?? 0;
          const r = s.reps ?? 0;
          if (w > bestWeight) { bestWeight = w; bestWeightReps = r; }
          const e1rm = estimateOneRepMax(w, r);
          if (e1rm > bestE1RM) { bestE1RM = e1rm; bestE1RMReps = r; }
        }

        // Compare against stored PRs
        const prs = await exerciseHistoryService.getPersonalRecords(exerciseId, userId);
        const weightPR = prs.find((p) => p.prType === "weight");
        const e1rmPR = prs.find((p) => p.prType === "estimated_1rm");

        if (bestWeight > (weightPR?.value ?? 0)) {
          await prDetectionService.recordPR(userId, exerciseId, "weight", bestWeight, sessionId, exerciseName, bestWeightReps);
        }
        if (bestE1RM > (e1rmPR?.value ?? 0)) {
          await prDetectionService.recordPR(userId, exerciseId, "estimated_1rm", bestE1RM, sessionId, exerciseName, bestE1RMReps);
        }
      }
    } catch (prErr) {
      console.error("[completionTracking] PR detection error:", prErr);
    }
  }
}

export const completionTrackingService = new CompletionTrackingService();
export default completionTrackingService;
