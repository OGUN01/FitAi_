import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeAsyncStorage } from "../utils/safeAsyncStorage";
import * as crypto from "expo-crypto";
import { WeeklyWorkoutPlan, DayWorkout, WorkoutSet } from "../ai";
import { crudOperations } from "../services/crudOperations";
import { dataBridge } from "../services/DataBridge";
import { offlineService } from "../services/offline";
import { supabase } from "../services/supabase";
import { generateUUID, isValidUUID } from "../utils/uuid";
import { getCurrentUserId, getUserIdOrGuest } from "../services/authUtils";
import { RealtimeChannel } from "@supabase/supabase-js";
import { CompletedSession } from "./fitness/types";
import { getCurrentWeekStart } from "../utils/weekUtils";

// Realtime subscription channel reference (outside store to persist across re-renders)
let workoutSessionsChannel: RealtimeChannel | null = null;

interface WorkoutProgress {
  workoutId: string;
  progress: number; // 0-100
  completedAt?: string;
  sessionId?: string;
  exerciseIndex?: number;   // first incomplete exercise index on partial exit
  caloriesBurned?: number;  // actual calories burned up to exit point
}

// Completed workout stats computed from workoutProgress - SINGLE SOURCE OF TRUTH
interface CompletedWorkoutStats {
  count: number;
  totalCalories: number;
  totalDuration: number;
}

interface FitnessState {
  // Weekly workout plan state
  weeklyWorkoutPlan: WeeklyWorkoutPlan | null;
  isGeneratingPlan: boolean;
  planError: string | null;

  // Workout progress tracking
  workoutProgress: Record<string, WorkoutProgress>;

  // Current workout session
  currentWorkoutSession: {
    workoutId: string;
    sessionId: string;
    startedAt: string;
    exercises: Array<{
      exerciseId: string;
      completed: boolean;
      sets: Array<{
        reps: number;
        weight: number;
        completed: boolean;
      }>;
    }>;
  } | null;

  // Actions
  setWeeklyWorkoutPlan: (plan: WeeklyWorkoutPlan | null) => void;
  saveWeeklyWorkoutPlan: (plan: WeeklyWorkoutPlan) => Promise<void>;
  loadWeeklyWorkoutPlan: () => Promise<WeeklyWorkoutPlan | null>;
  setGeneratingPlan: (isGenerating: boolean) => void;
  setPlanError: (error: string | null) => void;

  // Workout progress actions
  updateWorkoutProgress: (
    workoutId: string,
    progress: number,
    metadata?: { exerciseIndex?: number; caloriesBurned?: number },
  ) => void;
  completeWorkout: (workoutId: string, sessionId?: string, caloriesBurned?: number) => Promise<void>;
  getWorkoutProgress: (workoutId: string) => WorkoutProgress | null;

  // Computed selectors - SINGLE SOURCE OF TRUTH
  getCompletedWorkoutStats: () => CompletedWorkoutStats;
  getTodaysCompletedWorkoutStats: () => CompletedWorkoutStats;

  // Workout session actions
  startWorkoutSession: (workout: DayWorkout) => Promise<string>;
  endWorkoutSession: (sessionId: string) => Promise<void>;
  updateExerciseProgress: (
    exerciseId: string,
    setIndex: number,
    reps: number,
    weight: number,
  ) => void;

  // Data persistence
  persistData: () => Promise<void>;
  loadData: () => Promise<void>;
  clearData: () => void;
  clearOldWorkoutData: () => Promise<void>;
  forceWorkoutRegeneration: () => void;

  // Realtime subscriptions
  setupRealtimeSubscription: (userId: string) => void;
  cleanupRealtimeSubscription: () => void;

  // Reset store (for logout)
  reset: () => void;

  // Completed sessions — single source of truth for all stats
  completedSessions: CompletedSession[];
  completedSessionsHydrated: boolean;
  _hasHydrated: boolean;

  // New actions
  addCompletedSession: (session: CompletedSession) => void;
  markCompletedSessionsHydrated: () => void;
  setHasHydrated: () => void;
  getPlannedSessionStats: (weekStart: string) => { count: number; totalCalories: number; totalDuration: number };
  getExtraSessionStats: (weekStart: string) => { count: number; totalCalories: number; totalDuration: number };
  getAllSessionCalories: (dateStr: string) => number;
}

export const useFitnessStore = create<FitnessState>()(
  persist(
    (set, get) => ({
      // Initial state
      weeklyWorkoutPlan: null,
      isGeneratingPlan: false,
      planError: null,
      workoutProgress: {},
      currentWorkoutSession: null,
      completedSessions: [],
      completedSessionsHydrated: false,
      _hasHydrated: false,

      // Weekly workout plan actions
      setWeeklyWorkoutPlan: (plan) => {
        set({ weeklyWorkoutPlan: plan });
      },

      saveWeeklyWorkoutPlan: async (plan) => {
        try {
          const planTitle =
            plan.planTitle || `Week ${plan.weekNumber} Workout Plan`;

          // Save to local storage via Zustand persist first
          set({ weeklyWorkoutPlan: plan });


          // Validate plan data
          if (!plan.workouts || plan.workouts.length === 0) {
            return;
          }


        } catch (error) {
          console.error("❌ Failed to save workout plan:", error);
          // ARCH-003 FIX: Set error state instead of silently swallowing
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to save workout plan";
          set({ planError: errorMessage });

          // Don't throw error if local storage succeeded
          if (!get().weeklyWorkoutPlan) {
            throw error;
          }
        }

        // ALSO save the complete weekly plan to the new weekly_workout_plans table
        try {
          // Clear any failed UUID attempts in the queue first
          await offlineService.clearFailedActionsForTable(
            "weekly_workout_plans",
          );


          // Get authenticated user ID via StoreCoordinator (removes cross-store dependency)
          const userId = getCurrentUserId();
          const planId = generateUUID();


          // Ensure user is authenticated before database operation
          if (!userId) {
            console.error("❌ No authenticated user - cannot save to database");
            throw new Error("User must be authenticated to save workout plans");
          }

          // Validate UUIDs before database operation
          if (!isValidUUID(userId)) {
            console.error("❌ Invalid user UUID format:", userId);
            throw new Error("Invalid user UUID format");
          }
          if (!isValidUUID(planId)) {
            console.error("❌ Invalid plan UUID format:", planId);
            throw new Error("Invalid plan UUID format");
          }


          const weeklyPlanData = {
            id: planId,
            user_id: userId,
            plan_title: plan.planTitle || `Week ${plan.weekNumber} Plan`,
            plan_description:
              plan.planDescription ||
              `${plan.workouts.length} workouts over ${plan.duration || "1 week"}`,
            week_number: plan.weekNumber || 1,
            total_workouts: plan.workouts.length,
            duration_range: plan.duration ? String(plan.duration) : "1 week",
            plan_data: plan, // Store complete plan as JSONB
            is_active: true,
          };

          await offlineService.queueAction({
            type: "CREATE",
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
          // ARCH-003 FIX: Set error state instead of silently swallowing
          const errorMessage =
            weeklyPlanError instanceof Error
              ? weeklyPlanError.message
              : "Failed to save workout plan to database";
          set({ planError: errorMessage });
          // Don't throw - local save succeeded, just log the sync failure
        }
      },

      loadWeeklyWorkoutPlan: async () => {
        try {
          // First check local storage
          const currentPlan = get().weeklyWorkoutPlan;
          if (currentPlan) {
            return currentPlan;
          }

          // Try to load complete weekly plan from database
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

                // Extract the complete plan data from JSONB
                const planData = latestPlan.plan_data;
                if (planData && planData.workouts) {
                  // Update local storage with retrieved plan
                  set({ weeklyWorkoutPlan: planData });
                  return planData;
                }
              } else {
              }
            }
          } catch (dbError) {
          }

          // Fallback: Try to load individual workout sessions
          const workoutSessions = await crudOperations.readWorkoutSessions();
          if (workoutSessions.length > 0) {
            // Could reconstruct weekly plan from sessions if needed in the future
          }

          return null;
        } catch (error) {
          console.error("❌ Failed to load workout plan:", error);
          return null;
        }
      },

      setGeneratingPlan: (isGenerating) => {
        set({ isGeneratingPlan: isGenerating });
      },

      setPlanError: (error) => {
        set({ planError: error });
      },

      // Workout progress actions
      updateWorkoutProgress: (workoutId, progress, metadata?) => {
        set((state) => ({
          workoutProgress: {
            ...state.workoutProgress,
            [workoutId]: {
              ...state.workoutProgress[workoutId],
              workoutId,
              progress,
              ...(metadata?.exerciseIndex !== undefined && { exerciseIndex: metadata.exerciseIndex }),
              ...(metadata?.caloriesBurned !== undefined && { caloriesBurned: metadata.caloriesBurned }),
            },
          },
        }));
      },

      completeWorkout: async (workoutId, sessionId, caloriesBurned) => {
        const completedAt = new Date().toISOString();

        try {
          // DATABASE-FIRST PATTERN: Update database FIRST
          if (sessionId) {
            await crudOperations.updateWorkoutSession(sessionId, {
              completedAt,
              isCompleted: true,
              syncMetadata: {
                lastModifiedAt: completedAt,
                syncVersion: 1,
                deviceId: "dev-device",
              },
            });
          }

          // THEN update Zustand cache
          set((state) => ({
            workoutProgress: {
              ...state.workoutProgress,
              [workoutId]: {
                workoutId,
                progress: 100,
                completedAt,
                sessionId,
                ...(caloriesBurned !== undefined && { caloriesBurned }),
              },
            },
          }));
        } catch (error) {
          console.error(`❌ Failed to complete workout ${workoutId}:`, error);

          // FALLBACK: Queue for offline sync if database update fails
          await offlineService.queueAction({
            type: "UPDATE",
            table: "workout_sessions",
            data: {
              id: sessionId,
              completed_at: completedAt,
              is_completed: true,
            },
            userId: getUserIdOrGuest(),
            maxRetries: 3,
          });

          // Still update local cache for optimistic UI
          set((state) => ({
            workoutProgress: {
              ...state.workoutProgress,
              [workoutId]: {
                workoutId,
                progress: 100,
                completedAt,
                sessionId,
                ...(caloriesBurned !== undefined && { caloriesBurned }),
              },
            },
          }));
        }
      },

      getWorkoutProgress: (workoutId) => {
        return get().workoutProgress[workoutId] || null;
      },

      // COMPUTED SELECTORS - SINGLE SOURCE OF TRUTH for workout stats
      // Reads from completedSessions (unified model) scoped to current week
      getCompletedWorkoutStats: () => {
        const state = get();
        const weekStart = getCurrentWeekStart();
        const planned = state.completedSessions.filter(
          (s) => s.type === 'planned' && s.weekStart === weekStart
        );
        return {
          count: planned.length,
          totalCalories: planned.reduce((sum, s) => sum + s.caloriesBurned, 0),
          totalDuration: planned.reduce((sum, s) => sum + s.durationMinutes, 0),
        };
      },

      // Get completed workout stats for TODAY only
      getTodaysCompletedWorkoutStats: () => {
        const state = get();
        const todayISO = new Date().toISOString();
        const todaySessions = state.completedSessions.filter(
          s => s.completedAt.split('T')[0] === todayISO.split('T')[0]
        );
        return {
          count: todaySessions.length,
          totalCalories: todaySessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
          totalDuration: todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0),
        };
      },

      // New completedSessions actions
      addCompletedSession: (session) => {
        set((state) => {
          // Idempotent: skip if sessionId already exists
          if (state.completedSessions.some((s) => s.sessionId === session.sessionId)) {
            return state;
          }
          return { completedSessions: [...state.completedSessions, session] };
        });
      },

      markCompletedSessionsHydrated: () => set({ completedSessionsHydrated: true }),

      setHasHydrated: () => set({ _hasHydrated: true }),

      getPlannedSessionStats: (weekStart) => {
        const sessions = get().completedSessions.filter(
          (s) => s.type === 'planned' && s.weekStart === weekStart
        );
        return {
          count: sessions.length,
          totalCalories: sessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
          totalDuration: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
        };
      },

      getExtraSessionStats: (weekStart) => {
        const sessions = get().completedSessions.filter(
          (s) => s.type === 'extra' && s.weekStart === weekStart
        );
        return {
          count: sessions.length,
          totalCalories: sessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
          totalDuration: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
        };
      },

      getAllSessionCalories: (dateStr) => {
        return get().completedSessions
          .filter((s) => s.completedAt.startsWith(dateStr))
          .reduce((sum, s) => sum + s.caloriesBurned, 0);
      },

      // Workout session actions
      startWorkoutSession: async (workout) => {
        const sessionId = crypto.randomUUID();

        try {
          // Create a proper WorkoutSession object for active session
          const workoutSession: import("../types/localData").LocalWorkoutSession =
            {
              id: sessionId,
              localId: `local_${sessionId}`,
              workoutId: workout.id,
              userId: getUserIdOrGuest(),
              startedAt: new Date().toISOString(),
              completedAt: null,
              duration: workout.duration
                ? Math.max(5, Math.min(300, workout.duration))
                : null, // NO FALLBACK - null if missing
              caloriesBurned: workout.estimatedCalories
                ? Math.max(0, Math.min(10000, workout.estimatedCalories))
                : null, // NO FALLBACK - null if missing
              exercises: workout.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                sets: Array.from({ length: exercise.sets }, (_, index) => ({
                  reps:
                    typeof exercise.reps === "string"
                      ? parseInt(exercise.reps) || 10
                      : exercise.reps,
                  weight: exercise.weight || 0,
                  duration: 0,
                  restTime: exercise.restTime || 60,
                  rpe: 5, // Default RPE
                  completed: false,
                })),
                notes: exercise.notes || "",
                personalRecord: false,
              })),
              notes: `Active session: ${workout.dayOfWeek} - ${workout.description || workout.title}`,
              rating: 0,
              isCompleted: false,
              syncStatus: "pending" as import("../types/localData").SyncStatus,
              syncMetadata: {
                lastSyncedAt: undefined,
                lastModifiedAt: new Date().toISOString(),
                syncVersion: 1,
                deviceId: "dev-device",
              },
            };

          await crudOperations.createWorkoutSession(workoutSession);

          set({
            currentWorkoutSession: {
              workoutId: workout.id,
              sessionId,
              startedAt: new Date().toISOString(),
              exercises: workout.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                completed: false,
                sets: Array(exercise.sets)
                  .fill(null)
                  .map(() => ({
                    reps: 0,
                    weight: 0,
                    completed: false,
                  })),
              })),
            },
          });

          return sessionId;
        } catch (error) {
          console.error("❌ Failed to start workout session:", error);
          throw error;
        }
      },

      endWorkoutSession: async (sessionId) => {
        try {
          const currentSession = get().currentWorkoutSession;
          if (!currentSession) {
            throw new Error("No active workout session");
          }

          // Update session as completed
          await crudOperations.updateWorkoutSession(sessionId, {
            completedAt: new Date().toISOString(),
          });

          // Complete the workout
          await get().completeWorkout(currentSession.workoutId, sessionId);

          set({ currentWorkoutSession: null });

        } catch (error) {
          console.error("❌ Failed to end workout session:", error);
          throw error;
        }
      },

      updateExerciseProgress: (exerciseId, setIndex, reps, weight) => {
        set((state) => {
          if (!state.currentWorkoutSession) return state;

          const updatedExercises = state.currentWorkoutSession.exercises.map(
            (exercise) => {
              if (exercise.exerciseId === exerciseId) {
                const updatedSets = [...exercise.sets];
                if (updatedSets[setIndex]) {
                  updatedSets[setIndex] = {
                    reps,
                    weight,
                    completed: reps > 0,
                  };
                }

                const completedSets = updatedSets.filter(
                  (set) => set.completed,
                ).length;
                const exerciseCompleted = completedSets === updatedSets.length;

                return {
                  ...exercise,
                  sets: updatedSets,
                  completed: exerciseCompleted,
                };
              }
              return exercise;
            },
          );

          // Calculate overall progress
          const totalExercises = updatedExercises.length;
          const completedExercises = updatedExercises.filter(
            (ex) => ex.completed,
          ).length;
          const progressPercent = Math.round(
            (completedExercises / totalExercises) * 100,
          );

          // Update workout progress
          get().updateWorkoutProgress(
            state.currentWorkoutSession!.workoutId,
            progressPercent,
          );

          return {
            ...state,
            currentWorkoutSession: {
              ...state.currentWorkoutSession,
              exercises: updatedExercises,
            },
          };
        });
      },

      // Data persistence
      persistData: async () => {
        try {
          const state = get();
          // BUG FIX: Don't call crudOperations.clearAllData() — it clears ALL CRUD data
          // (nutrition, etc.), not just fitness. Use upsert logic instead.
          if (state.weeklyWorkoutPlan) {
            await get().saveWeeklyWorkoutPlan(state.weeklyWorkoutPlan);
          }

        } catch (error) {
          console.error("❌ Failed to persist fitness data:", error);
        }
      },

      loadData: async () => {
        try {
          const plan = await get().loadWeeklyWorkoutPlan();
          if (plan) {
            set({ weeklyWorkoutPlan: plan });
          }
        } catch (error) {
          console.error("❌ Failed to load fitness data:", error);
        }
      },

      clearData: () => {
        set({
          weeklyWorkoutPlan: null,
          workoutProgress: {},
          currentWorkoutSession: null,
          planError: null,
        });
      },

      clearOldWorkoutData: async () => {
        try {

          // Clear local store data
          get().clearData();

          // Clear database data
          await crudOperations.clearAllData();

          // Clear AsyncStorage
          const AsyncStorage = (
            await import("@react-native-async-storage/async-storage")
          ).default;
          await AsyncStorage.removeItem("fitness-storage");


          // Set flag to force regeneration
          get().forceWorkoutRegeneration();
        } catch (error) {
          console.error("❌ Failed to clear old workout data:", error);
          throw error;
        }
      },

      forceWorkoutRegeneration: () => {
        set({
          weeklyWorkoutPlan: null,
          planError: null,
          isGeneratingPlan: false,
        });
      },

      setupRealtimeSubscription: (userId: string) => {
        if (workoutSessionsChannel) {
          workoutSessionsChannel.unsubscribe();
        }

        workoutSessionsChannel = supabase
          .channel("workout_sessions_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "workout_sessions",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              get().loadData();
            },
          )
          .subscribe();
      },

      cleanupRealtimeSubscription: () => {
        if (workoutSessionsChannel) {
          workoutSessionsChannel.unsubscribe();
          workoutSessionsChannel = null;
        }
      },

      reset: () => {
        get().cleanupRealtimeSubscription();
        set({
          weeklyWorkoutPlan: null,
          isGeneratingPlan: false,
          planError: null,
          workoutProgress: {},
          currentWorkoutSession: null,
          completedSessions: [],
          completedSessionsHydrated: false,
          // _hasHydrated intentionally NOT reset — stays true once hydrated
        });
      },
    }),
    {
      name: "fitness-storage",
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        weeklyWorkoutPlan: state.weeklyWorkoutPlan,
        workoutProgress: state.workoutProgress,
        completedSessions: state.completedSessions,
        // completedSessionsHydrated: intentionally excluded (resets on cold start)
        // _hasHydrated: intentionally excluded (set by onRehydrateStorage)
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated();
      },
    },
  ),
);

export default useFitnessStore;
