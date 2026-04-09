import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import * as crypto from "expo-crypto";
import { WeeklyWorkoutPlan, DayWorkout, WorkoutSet } from "../ai";
import { crudOperations } from "../services/crudOperations";
import { dataBridge } from "../services/DataBridge";
import { offlineService } from "../services/offline";
import { supabase } from "../services/supabase";
import { generateUUID, isValidUUID } from "../utils/uuid";
import { getCurrentUserId, getUserIdOrGuest } from "../services/authUtils";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useProfileStore } from "./profileStore";
import { resolveCurrentWeightFromStores } from "../services/currentWeight";
import {
  calculateWorkoutCalories,
  ExerciseCalorieInput,
} from "../services/calorieCalculator";
import {
  findPlanWorkoutBySessionIdentity,
  getWorkoutSlotKey,
} from "../utils/workoutIdentity";
// SSOT: import canonical type definitions from ./fitness/types — do NOT redeclare locally
import {
  CompletedSession,
  FitnessState,
  WorkoutProgress,
} from "./fitness/types";
import type { WorkoutTemplate } from "../services/workoutTemplateService";
import {
  getCurrentWeekStart,
  getLocalDateString,
  getWeekStartForDate,
} from "../utils/weekUtils";

// Realtime subscription channel reference (outside store to persist across re-renders)
let workoutSessionsChannel: RealtimeChannel | null = null;

export const useFitnessStore = create<FitnessState>()(
  persist(
    (set, get) => ({
      // Initial state
      weeklyWorkoutPlan: null,
      isGeneratingPlan: false,
      planError: null,
      customWeeklyPlan: null,
      activePlanSource: 'ai' as const,
      workoutProgress: {},
      lastProgressDate: "", // empty = force cleanup on first rehydration
      currentWorkoutSession: null,
      completedSessions: [],
      completedSessionsHydrated: false,
      _hasHydrated: false,
      activeExtraSession: null,
      mesocycleStartDate: null,
      restTimerEnabled: false,

      setMesocycleStartDate: (date: string) => {
        set({ mesocycleStartDate: date });
      },

      getMesocycleWeek: () => {
        const startDate = get().mesocycleStartDate;
        if (!startDate) return 0;
        return (
          Math.floor(
            (Date.now() - new Date(startDate).getTime()) /
              (7 * 24 * 60 * 60 * 1000),
          ) + 1
        );
      },

      // Day-boundary reset: clear stale partial progress on new day
      checkAndResetProgressIfNewDay: () => {
        const today = getLocalDateString();
        const state = get();
        if (state.lastProgressDate === today) return;

        // New day: clear partial progress (< 100).
        // Completed entries (100) only stay if they belong to the current week —
        // otherwise the same workout ID on a new week would still show as complete.
        const currentWeekStart = getCurrentWeekStart();
        const cleaned: Record<string, WorkoutProgress> = {};
        for (const [id, entry] of Object.entries(state.workoutProgress)) {
          if (
            entry.progress >= 100 &&
            entry.completedAt &&
            getWeekStartForDate(entry.completedAt) === currentWeekStart
          ) {
            cleaned[id] = entry;
          }
        }

        set({
          workoutProgress: cleaned,
          currentWorkoutSession: null,
          lastProgressDate: today,
        });
      },

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

          let activePlanRowId = plan.databaseId || null;
          if (!activePlanRowId) {
            try {
              const { data: activePlans, error: activePlansError } =
                await supabase
                  .from("weekly_workout_plans")
                  .select("id")
                  .eq("user_id", userId)
                  .eq("is_active", true)
                  .eq("plan_source", "ai")
                  .order("created_at", { ascending: false })
                  .limit(1);
              if (activePlansError) {
                console.error(
                  "[fitnessStore] Failed to look up active workout plan:",
                  activePlansError,
                );
              }
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
            activePlanRowId || plan.databaseId,
          );
          const planDataWithDbId = hasConfirmedDatabaseId
            ? {
                ...plan,
                databaseId: activePlanRowId || plan.databaseId,
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
            plan_data: planDataWithDbId, // Store complete plan as JSONB
            is_active: true,
            plan_source: "ai",
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
          // Do NOT return early if a plan already exists in the store.
          // A guest-generated plan must not block loading the real Supabase plan after login.

          // Try to load complete weekly plan from database
          try {
            const userId = getCurrentUserId();
            if (userId) {
              const { data: weeklyPlans, error } = await supabase
                .from("weekly_workout_plans")
                .select("*")
                .eq("user_id", userId)
                .eq("is_active", true)
                .eq("plan_source", "ai")
                .order("created_at", { ascending: false })
                .limit(1);

              if (!error && weeklyPlans && weeklyPlans.length > 0) {
                const latestPlan = weeklyPlans[0];

                // Extract the complete plan data from JSONB
                const planData = latestPlan.plan_data;
                if (planData && planData.workouts) {
                  const planWithDbId = {
                    ...planData,
                    databaseId: latestPlan.id,
                  };
                  // Update local storage with retrieved plan
                  set({ weeklyWorkoutPlan: planWithDbId });
                  return planWithDbId;
                }
              } else {
              }
            }
          } catch (dbError) {
            console.error("❌ Failed to load workout plan from DB:", dbError);
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

      // ── Custom plan actions ─────────────────────────────────────────────
      setActivePlanSource: (source) => {
        set({ activePlanSource: source });

        // Persist to Supabase via offline queue so preference syncs across devices
        const userId = getCurrentUserId();
        if (userId) {
          offlineService.queueAction({
            type: 'UPDATE',
            table: 'profiles',
            data: { id: userId, active_plan_source: source },
            userId,
            maxRetries: 3,
          });
        }
      },

      setCustomWeeklyPlan: (plan) => {
        set({ customWeeklyPlan: plan });
      },

      getActivePlan: () => {
        const state = get();
        return state.activePlanSource === 'custom'
          ? state.customWeeklyPlan
          : state.weeklyWorkoutPlan;
      },

      saveCustomWeeklyPlan: async (plan) => {
        try {
          // Save to local storage via Zustand persist first
          set({ customWeeklyPlan: plan });

          if (!plan.workouts || plan.workouts.length === 0) {
            return;
          }
        } catch (error) {
          console.error("❌ Failed to save custom workout plan:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to save custom workout plan";
          set({ planError: errorMessage });

          if (!get().customWeeklyPlan) {
            throw error;
          }
        }

        // Persist to weekly_workout_plans with plan_source = 'custom'
        try {
          const userId = getCurrentUserId();
          const planId = generateUUID();

          if (!userId) {
            console.error("❌ No authenticated user - cannot save custom plan to database");
            throw new Error("User must be authenticated to save custom plans");
          }

          if (!isValidUUID(userId)) {
            console.error("❌ Invalid user UUID format:", userId);
            throw new Error("Invalid user UUID format");
          }
          if (!isValidUUID(planId)) {
            console.error("❌ Invalid plan UUID format:", planId);
            throw new Error("Invalid plan UUID format");
          }

          // Look for existing active custom plan
          let activeCustomPlanRowId = plan.databaseId || null;
          if (!activeCustomPlanRowId) {
            try {
              const { data: customPlans, error: customPlansError } =
                await supabase
                  .from("weekly_workout_plans")
                  .select("id")
                  .eq("user_id", userId)
                  .eq("is_active", true)
                  .eq("plan_source", "custom")
                  .order("created_at", { ascending: false })
                  .limit(1);
              if (customPlansError) {
                console.error(
                  "[fitnessStore] Failed to look up active custom plan:",
                  customPlansError,
                );
              }
              activeCustomPlanRowId = customPlans?.[0]?.id || null;
            } catch (lookupError) {
              console.warn(
                "Failed to look up active custom plan; falling back to queued create:",
                lookupError,
              );
            }
          }

          const planRowId = activeCustomPlanRowId || planId;
          const hasConfirmedDatabaseId = Boolean(
            activeCustomPlanRowId || plan.databaseId,
          );
          const planDataWithDbId = hasConfirmedDatabaseId
            ? { ...plan, databaseId: activeCustomPlanRowId || plan.databaseId }
            : plan;

          set({ customWeeklyPlan: planDataWithDbId });

          const weeklyPlanData = {
            id: planRowId,
            user_id: userId,
            plan_title: plan.planTitle || "My Custom Schedule",
            plan_description:
              plan.planDescription ||
              `${plan.workouts.length} custom workouts`,
            week_number: plan.weekNumber || 1,
            total_workouts: plan.workouts.length,
            duration_range: plan.duration ? String(plan.duration) : "1 week",
            plan_data: planDataWithDbId,
            is_active: true,
            plan_source: "custom",
          };

          await offlineService.queueAction({
            type: activeCustomPlanRowId ? "UPDATE" : "CREATE",
            table: "weekly_workout_plans",
            data: weeklyPlanData,
            userId: getUserIdOrGuest(),
            maxRetries: 3,
          });
        } catch (customPlanError) {
          console.error(
            "❌ Failed to save custom workout plan to database:",
            customPlanError,
          );
          const errorMessage =
            customPlanError instanceof Error
              ? customPlanError.message
              : "Failed to save custom plan to database";
          set({ planError: errorMessage });
        }
      },

      loadCustomWeeklyPlan: async () => {
        try {
          const userId = getCurrentUserId();
          if (!userId) return null;

          const { data: customPlans, error } = await supabase
            .from("weekly_workout_plans")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .eq("plan_source", "custom")
            .order("created_at", { ascending: false })
            .limit(1);

          if (!error && customPlans && customPlans.length > 0) {
            const latestPlan = customPlans[0];
            const planData = latestPlan.plan_data;
            if (planData && planData.workouts) {
              const planWithDbId = {
                ...planData,
                databaseId: latestPlan.id,
              };
              set({ customWeeklyPlan: planWithDbId });
              return planWithDbId;
            }
          }

          // No custom plan found (0 rows or no valid plan_data) — clear stale state
          set({ customWeeklyPlan: null });
          return null;
        } catch (error) {
          console.error("❌ Failed to load custom workout plan:", error);
          return null;
        }
      },
      updateWorkoutProgress: (workoutId, progress, metadata?) => {
        set((state) => ({
          workoutProgress: {
            ...state.workoutProgress,
            [workoutId]: {
              ...state.workoutProgress[workoutId],
              workoutId,
              progress,
              ...(metadata?.exerciseIndex !== undefined && {
                exerciseIndex: metadata.exerciseIndex,
              }),
              ...(metadata?.caloriesBurned !== undefined && {
                caloriesBurned: metadata.caloriesBurned,
              }),
            },
          },
        }));
      },

      completeWorkout: async (workoutId, sessionId, caloriesBurned) => {
        const completedAt = new Date().toISOString();
        const plannedDuration = get().weeklyWorkoutPlan?.workouts.find(
          (w) => w.id === workoutId,
        )?.duration ?? get().customWeeklyPlan?.workouts.find(
          (w) => w.id === workoutId,
        )?.duration;

        try {
          // DATABASE-FIRST PATTERN: Update database FIRST
          if (sessionId) {
            await crudOperations.updateWorkoutSession(sessionId, {
              completedAt,
              isCompleted: true,
              ...(plannedDuration !== undefined && {
                duration: plannedDuration,
              }),
              ...(caloriesBurned !== undefined && { caloriesBurned }),
              syncMetadata: {
                lastModifiedAt: completedAt,
                syncVersion: 1,
                deviceId: Platform.OS ?? "unknown",
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
          (s) => s.type === "planned" && s.weekStart === weekStart,
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
        const todaySessions = state.completedSessions.filter(
          (s) => getLocalDateString(s.completedAt) === getLocalDateString(),
        );
        return {
          count: todaySessions.length,
          totalCalories: todaySessions.reduce(
            (sum, s) => sum + s.caloriesBurned,
            0,
          ),
          totalDuration: todaySessions.reduce(
            (sum, s) => sum + s.durationMinutes,
            0,
          ),
        };
      },

      // New completedSessions actions
      addCompletedSession: (session) => {
        if (!session?.sessionId) return;
        set((state) => {
          // Idempotent: skip if sessionId already exists
          if (
            state.completedSessions.some(
              (s) => s.sessionId === session.sessionId,
            )
          ) {
            return state;
          }
          let newSessions = [...state.completedSessions, session];
          if (newSessions.length > 90) {
            console.warn(`[fitnessStore] completedSessions capped at 90 — ${newSessions.length - 90} oldest sessions dropped`);
            newSessions = newSessions.slice(-90);
          }
          return { completedSessions: newSessions };
        });
      },

      markCompletedSessionsHydrated: () =>
        set({ completedSessionsHydrated: true }),

      setHasHydrated: () => set({ _hasHydrated: true }),

      setActiveExtraSession: (session) => set({ activeExtraSession: session }),

      updateActiveExtraProgress: (exerciseIndex) =>
        set((state) =>
          state.activeExtraSession
            ? {
                activeExtraSession: {
                  ...state.activeExtraSession,
                  exerciseIndex,
                },
              }
            : state,
        ),

      clearActiveExtraSession: () => set({ activeExtraSession: null }),

      setRestTimerEnabled: (enabled: boolean) =>
        set({ restTimerEnabled: enabled }),

      getPlannedSessionStats: (weekStart) => {
        const sessions = get().completedSessions.filter(
          (s) => s.type === "planned" && s.weekStart === weekStart,
        );
        return {
          count: sessions.length,
          totalCalories: sessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
          totalDuration: sessions.reduce(
            (sum, s) => sum + s.durationMinutes,
            0,
          ),
        };
      },

      getExtraSessionStats: (weekStart) => {
        const sessions = get().completedSessions.filter(
          (s) => s.type === "extra" && s.weekStart === weekStart,
        );
        return {
          count: sessions.length,
          totalCalories: sessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
          totalDuration: sessions.reduce(
            (sum, s) => sum + s.durationMinutes,
            0,
          ),
        };
      },

      getAllSessionCalories: (dateStr) => {
        return get()
          .completedSessions.filter(
            (s) => getLocalDateString(s.completedAt) === dateStr,
          )
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
                lastSyncedAt: null,
                lastModifiedAt: new Date().toISOString(),
                syncVersion: 1,
                deviceId: Platform.OS ?? "unknown",
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

      startTemplateSession: async (
        template: WorkoutTemplate,
        userId?: string,
      ) => {
        const resolvedUserId = userId || getCurrentUserId();
        const sessionId = generateUUID();
        const now = new Date().toISOString();

        try {
          const { error } = await supabase.from("workout_sessions").insert({
            id: sessionId,
            user_id: resolvedUserId,
            workout_name: template.name,
            is_extra: true,
            is_completed: false,
            started_at: now,
            exercises: template.exercises,
            duration: template.estimatedDurationMinutes ?? null,
          });

          if (error) {
            console.error("❌ Failed to insert template session:", error);
          }

          set({
            currentWorkoutSession: {
              workoutId: `template_${template.id}`,
              sessionId,
              startedAt: now,
              exercises: template.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                completed: false,
                sets: Array.from({ length: ex.sets }, () => ({
                  reps: 0,
                  weight: ex.targetWeightKg ?? 0,
                  completed: false,
                })),
              })),
            },
          });

          return sessionId;
        } catch (error) {
          console.error("❌ Failed to start template session:", error);
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

          // Complete the workout — pass actual MET-based calories from workoutProgress if available
          const actualCalories =
            get().workoutProgress[currentSession.workoutId]?.caloriesBurned;
          await get().completeWorkout(currentSession.workoutId, sessionId, actualCalories);

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

      updateSetData: (exerciseId, setIndex, data) => {
        set((state) => {
          if (!state.currentWorkoutSession) return state;

          const updatedExercises = state.currentWorkoutSession.exercises.map(
            (exercise) => {
              if (exercise.exerciseId !== exerciseId) return exercise;

              const updatedSets = [...exercise.sets];
              if (updatedSets[setIndex]) {
                updatedSets[setIndex] = {
                  reps: data.reps,
                  weight: data.weightKg,
                  completed: data.completed,
                  setType: data.setType,
                  rpe: data.rpe ?? null,
                  isCalibration: data.isCalibration ?? false,
                };
              }

              const allCompleted =
                updatedSets.length > 0 && updatedSets.every((s) => s.completed);

              return {
                ...exercise,
                sets: updatedSets,
                completed: allCompleted,
              };
            },
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
          if (state.customWeeklyPlan) {
            await get().saveCustomWeeklyPlan(state.customWeeklyPlan);
          }
        } catch (error) {
          console.error("❌ Failed to persist fitness data:", error);
        }
      },

      loadData: async () => {
        try {
          // Day-boundary reset BEFORE loading any data — ensures stale partial progress is gone
          get().checkAndResetProgressIfNewDay();

          const plan = await get().loadWeeklyWorkoutPlan();
          if (plan) {
            set({ weeklyWorkoutPlan: plan });
          }

          await get().loadCustomWeeklyPlan();

          // Hydrate workoutProgress + completedSessions from Supabase on login
          try {
            const { data: user, error: authError } =
              await supabase.auth.getUser();
            if (authError) {
              // AuthSessionMissingError is expected on cold start before the session is restored.
              // loadData() will be called again after login via the auth listener.
              console.warn(
                "[fitnessStore] No auth session during hydration (expected on cold start):",
                authError.message,
              );
            } else if (user?.user?.id) {
              // Hydrate active_plan_source preference from profiles (multi-device sync)
              try {
                const { data: profile, error: profileError } = await supabase
                  .from("profiles")
                  .select("active_plan_source")
                  .eq("id", user.user.id)
                  .single();

                if (profileError) {
                  console.error("❌ Failed to fetch active_plan_source from profiles:", profileError);
                } else if (profile?.active_plan_source) {
                  const source = profile.active_plan_source as 'ai' | 'custom';
                  if (source === 'ai' || source === 'custom') {
                    set({ activePlanSource: source });
                  }
                }
              } catch (prefError) {
                console.error("❌ Error hydrating active_plan_source:", prefError);
              }

              const { data: sessions, error } = await supabase
                .from("workout_sessions")
                .select(
                  "id, workout_id, planned_day_key, plan_slot_key, workout_name, workout_type, duration, total_duration_minutes, calories_burned, completed_at, started_at, is_extra, exercises, exercises_completed, is_completed",
                )
                .eq("user_id", user.user.id)
                .eq("is_completed", true)
                .order("completed_at", { ascending: false })
                .limit(200);

              if (error) {
                console.error("❌ Failed to fetch workout_sessions:", error);
              } else if (sessions && sessions.length > 0) {
                // Restore workoutProgress (for plan completion checkmarks)
                const restoredProgress: Record<string, WorkoutProgress> = {};
                sessions.forEach((s) => {
                  const planWorkout = findPlanWorkoutBySessionIdentity({
                    plan: get().weeklyWorkoutPlan,
                    workoutId: s.workout_id,
                    plannedDayKey: s.planned_day_key,
                    planSlotKey: s.plan_slot_key,
                  }) || findPlanWorkoutBySessionIdentity({
                    plan: get().customWeeklyPlan,
                    workoutId: s.workout_id,
                    plannedDayKey: s.planned_day_key,
                    planSlotKey: s.plan_slot_key,
                  });
                  const resolvedWorkoutId =
                    planWorkout?.id ||
                    (s.is_extra ? s.workout_id || s.id : null);
                  if (resolvedWorkoutId) {
                    const caloriesBurned =
                      typeof s.calories_burned === "number"
                        ? s.calories_burned
                        : undefined;
                    restoredProgress[resolvedWorkoutId] = {
                      workoutId: resolvedWorkoutId,
                      progress: 100,
                      completedAt: s.completed_at,
                      sessionId: s.id,
                      ...(caloriesBurned !== undefined && { caloriesBurned }),
                    };
                  }
                });
                set((state) => ({
                  workoutProgress: {
                    ...state.workoutProgress,
                    ...restoredProgress,
                  },
                }));

                const hydrated: CompletedSession[] = sessions.map((s) => {
                  const planWorkout = findPlanWorkoutBySessionIdentity({
                    plan: get().weeklyWorkoutPlan,
                    workoutId: s.workout_id,
                    plannedDayKey: s.planned_day_key,
                    planSlotKey: s.plan_slot_key,
                  }) || findPlanWorkoutBySessionIdentity({
                    plan: get().customWeeklyPlan,
                    workoutId: s.workout_id,
                    plannedDayKey: s.planned_day_key,
                    planSlotKey: s.plan_slot_key,
                  });
                  const durationMinutes =
                    typeof s.total_duration_minutes === "number" &&
                    s.total_duration_minutes > 0
                      ? s.total_duration_minutes
                      : typeof s.duration === "number" && s.duration > 0
                        ? s.duration
                        : planWorkout?.duration || 0;
                  let caloriesBurned =
                    typeof s.calories_burned === "number"
                      ? s.calories_burned
                      : 0;
                  const weekStart = getWeekStartForDate(s.completed_at);

                  const rawExercises = Array.isArray(s.exercises_completed)
                    ? s.exercises_completed
                    : Array.isArray(s.exercises)
                      ? s.exercises
                      : [];
                  const exercises = rawExercises.map((ex: any) => ({
                    name: ex.exerciseName || ex.name || "",
                    sets: Number(ex.sets) || 0,
                    reps: Number(ex.reps) || 0,
                    exerciseId: ex.exerciseId || ex.id,
                    duration: ex.duration,
                    restTime: ex.restTime,
                  }));

                  if (caloriesBurned <= 0 && planWorkout?.exercises?.length) {
                    const userWeight = resolveCurrentWeightFromStores({
                      bodyAnalysisWeight:
                        useProfileStore.getState().bodyAnalysis
                          ?.current_weight_kg,
                    }).value;
                    if (userWeight && userWeight > 0) {
                      const exerciseInputs: ExerciseCalorieInput[] =
                        planWorkout.exercises.map((exercise: any) => ({
                          exerciseId: exercise.exerciseId || exercise.id,
                          name: exercise.exerciseName || exercise.name,
                          sets: exercise.sets,
                          reps: exercise.reps,
                          duration: exercise.duration,
                          restTime: exercise.restTime,
                        }));
                      const estimatedCalories = calculateWorkoutCalories(
                        exerciseInputs,
                        userWeight,
                      ).totalCalories;
                      if (estimatedCalories > 0) {
                        caloriesBurned = estimatedCalories;
                      }
                    }
                  }

                  return {
                    sessionId: s.id,
                    type: s.is_extra
                      ? ("extra" as const)
                      : ("planned" as const),
                    workoutId: planWorkout?.id || s.workout_id || s.id,
                    plannedDayKey: s.is_extra
                      ? undefined
                      : s.planned_day_key ||
                        planWorkout?.dayOfWeek ||
                        undefined,
                    planSlotKey: !s.is_extra
                      ? s.plan_slot_key ||
                        (planWorkout
                          ? getWorkoutSlotKey(
                              planWorkout,
                              get().weeklyWorkoutPlan || undefined,
                            )
                          : undefined)
                      : undefined,
                    workoutSnapshot: {
                      title: s.workout_name || planWorkout?.title || "Workout",
                      category:
                        s.workout_type || planWorkout?.category || "general",
                      duration: durationMinutes,
                      exercises,
                    },
                    caloriesBurned,
                    durationMinutes,
                    completedAt: s.completed_at,
                    weekStart,
                  };
                });

                if (hydrated.length > 0) {
                  set((state) => {
                    const hydratedById = new Set(
                      hydrated.map((session) => session.sessionId),
                    );
                    const hydratedPlannedKeys = new Set(
                      hydrated
                        .filter((session) => session.type === "planned")
                        .map(
                          (session) =>
                            `${session.weekStart}:${session.planSlotKey || session.workoutId}`,
                        ),
                    );
                    const preservedLocalSessions =
                      state.completedSessions.filter((session) => {
                        if (hydratedById.has(session.sessionId)) return false;
                        if (session.type === "extra") return true;
                        const localKey = `${session.weekStart}:${session.planSlotKey || session.workoutId}`;
                        return !hydratedPlannedKeys.has(localKey);
                      });
                    const normalizedPreservedLocalSessions =
                      preservedLocalSessions.map((session) => ({
                        ...session,
                        weekStart:
                          session.weekStart ||
                          getWeekStartForDate(session.completedAt),
                      }));
                    return {
                      completedSessions: [
                        ...hydrated,
                        ...normalizedPreservedLocalSessions,
                      ],
                    };
                  });
                }
              }
            }
          } catch (supabaseError) {
            console.error(
              "❌ Failed to hydrate completed sessions:",
              supabaseError,
            );
          }

          // GAP-18: Reconcile workoutProgress vs completedSessions.
          // If workoutProgress[id].progress === 100 but there is NO matching
          // completedSession in the current week, reset progress to 0.
          // This prevents stale "Completed" badges when the DB write failed.
          try {
            const currentWeekStart = getCurrentWeekStart();
            const state = get();
            const desyncedIds: string[] = [];

            Object.entries(state.workoutProgress).forEach(([workoutId, entry]) => {
              if (entry.progress < 100) return;
              if (!entry.completedAt) return;
              // Only check entries that are in the current week
              if (getWeekStartForDate(entry.completedAt) !== currentWeekStart) return;

              const hasSession = state.completedSessions.some(
                (s) => s.sessionId === entry.sessionId ||
                        s.workoutId === workoutId,
              );
              if (!hasSession) {
                desyncedIds.push(workoutId);
              }
            });

            if (desyncedIds.length > 0) {
              set((state) => {
                const cleaned = { ...state.workoutProgress };
                desyncedIds.forEach((id) => {
                  if (cleaned[id]) {
                    cleaned[id] = { ...cleaned[id], progress: 0 };
                  }
                });
                return { workoutProgress: cleaned };
              });
            }
          } catch (reconcileError) {
            console.error("[fitnessStore] GAP-18 reconcile error:", reconcileError);
          }
        } catch (error) {
          console.error("❌ Failed to load fitness data:", error);
        }
      },

      clearData: () => {
        set({
          weeklyWorkoutPlan: null,
          customWeeklyPlan: null,
          activePlanSource: 'ai' as const,
          workoutProgress: {},
          lastProgressDate: getLocalDateString(),
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
          activeExtraSession: null,
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
          customWeeklyPlan: null,
          activePlanSource: 'ai' as const,
          isGeneratingPlan: false,
          planError: null,
          workoutProgress: {},
          lastProgressDate: getLocalDateString(),
          currentWorkoutSession: null,
          completedSessions: [],
          completedSessionsHydrated: false,
          activeExtraSession: null,
          mesocycleStartDate: null,
          _hasHydrated: false,
        });
      },
    }),
    {
      name: "fitness-storage",
      storage: createDebouncedStorage(),
      partialize: (state) => ({
        weeklyWorkoutPlan: state.weeklyWorkoutPlan,
        customWeeklyPlan: state.customWeeklyPlan,
        activePlanSource: state.activePlanSource,
        workoutProgress: state.workoutProgress,
        lastProgressDate: state.lastProgressDate,
        completedSessions: state.completedSessions,
        activeExtraSession: state.activeExtraSession,
        mesocycleStartDate: state.mesocycleStartDate,
        restTimerEnabled: state.restTimerEnabled,
        // completedSessionsHydrated: intentionally excluded (resets on cold start)
        // _hasHydrated: intentionally excluded (set by onRehydrateStorage)
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated();
          state.checkAndResetProgressIfNewDay();
        }
      },
    },
  ),
);

export default useFitnessStore;

export const selectWorkoutProgress = (state: FitnessState) => state.workoutProgress;
export const selectWeeklyWorkoutPlan = (state: FitnessState) => state.weeklyWorkoutPlan;
export const selectCompletedSessions = (state: FitnessState) => state.completedSessions;
export const selectCurrentWorkoutSession = (state: FitnessState) => state.currentWorkoutSession;
