import { FitnessState, WorkoutProgress, CompletedSession } from "./types";
import { crudOperations } from "../../services/crudOperations";
import { supabase } from "../../services/supabase";

export const createDataActions = (
  set: (
    partial:
      | Partial<FitnessState>
      | ((state: FitnessState) => Partial<FitnessState>),
  ) => void,
  get: () => FitnessState,
) => ({
  persistData: async () => {
    try {
      const state = get();
      await crudOperations.clearAllData();

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

      // Hydrate workoutProgress + completedSessions from Supabase
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
          const { data: sessions } = await supabase
            .from("workout_sessions")
            .select("id, workout_id, planned_day_key, plan_slot_key, workout_name, workout_type, total_duration_minutes, calories_burned, completed_at, started_at, is_extra, exercises_completed, is_completed")
            .eq("user_id", user.user.id)
            .eq("is_completed", true)
            .order("completed_at", { ascending: false })
            .limit(200);

          if (sessions && sessions.length > 0) {
            // Restore workoutProgress (for plan completion checkmarks)
            const restoredProgress: Record<string, WorkoutProgress> = {};
            sessions.forEach((s) => {
              const planWorkout = get().weeklyWorkoutPlan?.workouts?.find(
                (workout) =>
                  workout.id === s.workout_id ||
                  workout.dayOfWeek === s.planned_day_key,
              );
              const resolvedWorkoutId =
                planWorkout?.id || s.workout_id || (s.is_extra ? s.id : null);
              if (resolvedWorkoutId) {
                restoredProgress[resolvedWorkoutId] = {
                  workoutId: resolvedWorkoutId,
                  progress: 100,
                  completedAt: s.completed_at,
                  sessionId: s.id,
                };
              }
            });
            set((state) => ({
              workoutProgress: { ...state.workoutProgress, ...restoredProgress },
            }));

            // Rebuild completedSessions — skip IDs already in the store (from this session)
            const existingIds = new Set(get().completedSessions.map((c) => c.sessionId));
            const hydrated: CompletedSession[] = sessions
              .filter((s) => !existingIds.has(s.id))
              .map((s) => {
                const planWorkout = get().weeklyWorkoutPlan?.workouts?.find(
                  (workout) =>
                    workout.id === s.workout_id ||
                    workout.dayOfWeek === s.planned_day_key,
                );
                // Compute Monday of the week for completed_at
                const d = new Date(s.completed_at);
                const day = d.getDay();
                const diff = day === 0 ? -6 : 1 - day;
                d.setDate(d.getDate() + diff);
                const weekStart = d.toISOString().split('T')[0];

                const exercises = Array.isArray(s.exercises_completed)
                  ? s.exercises_completed.map((ex: any) => ({
                      name: ex.exerciseName || ex.name || '',
                      sets: Number(ex.sets) || 0,
                      reps: Number(ex.reps) || 0,
                      exerciseId: ex.exerciseId || ex.id,
                      duration: ex.duration,
                      restTime: ex.restTime,
                    }))
                  : [];

                return {
                  sessionId: s.id,
                  type: s.is_extra ? ('extra' as const) : ('planned' as const),
                  workoutId: planWorkout?.id || s.workout_id || s.id,
                  plannedDayKey: s.is_extra ? undefined : s.planned_day_key || planWorkout?.dayOfWeek || undefined,
                  planSlotKey: s.is_extra ? undefined : s.plan_slot_key || undefined,
                  workoutSnapshot: {
                    title: s.workout_name || 'Workout',
                    category: s.workout_type || 'general',
                    duration: s.total_duration_minutes || 0,
                    exercises,
                  },
                  caloriesBurned: s.calories_burned || 0,
                  durationMinutes: s.total_duration_minutes || 0,
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
                const preservedLocalSessions = state.completedSessions.filter(
                  (session) => {
                    if (hydratedById.has(session.sessionId)) return false;
                    if (session.type === "extra") return true;
                    const localKey = `${session.weekStart}:${session.planSlotKey || session.workoutId}`;
                    return !hydratedPlannedKeys.has(localKey);
                  },
                );
                return {
                  completedSessions: [...hydrated, ...preservedLocalSessions],
                };
              });
            }
          }
        }
      } catch (error) {
        console.error("❌ Failed to hydrate completed sessions:", error);
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

      get().clearData();

      await crudOperations.clearAllData();

      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;
      await AsyncStorage.removeItem("fitness-storage");


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
      activeExtraSession: null,  // clear stale resume state
    });
  },
});
