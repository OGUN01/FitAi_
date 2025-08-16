import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeeklyWorkoutPlan, DayWorkout } from '../ai/weeklyContentGenerator';
import { crudOperations } from '../services/crudOperations';
import { dataManager } from '../services/dataManager';
import { offlineService } from '../services/offline';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../services/supabase';

// React Native-compatible UUID v4 generator
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// UUID validation helper
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

interface WorkoutProgress {
  workoutId: string;
  progress: number; // 0-100
  completedAt?: string;
  sessionId?: string;
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
  updateWorkoutProgress: (workoutId: string, progress: number) => void;
  completeWorkout: (workoutId: string, sessionId?: string) => void;
  getWorkoutProgress: (workoutId: string) => WorkoutProgress | null;

  // Workout session actions
  startWorkoutSession: (workout: DayWorkout) => Promise<string>;
  endWorkoutSession: (sessionId: string) => Promise<void>;
  updateExerciseProgress: (
    exerciseId: string,
    setIndex: number,
    reps: number,
    weight: number
  ) => void;

  // Data persistence
  persistData: () => Promise<void>;
  loadData: () => Promise<void>;
  clearData: () => void;
  clearOldWorkoutData: () => Promise<void>;
  forceWorkoutRegeneration: () => void;
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

      // Weekly workout plan actions
      setWeeklyWorkoutPlan: (plan) => {
        set({ weeklyWorkoutPlan: plan });
      },

      saveWeeklyWorkoutPlan: async (plan) => {
        try {
          console.log('💾 Saving weekly workout plan:', plan.planTitle);

          // 🔍 Debug: Validate incoming plan data
          console.log('🔍 Store Debug - Plan validation:');
          console.log('  - Plan object:', plan ? '✅' : '❌');
          console.log('  - Plan title:', plan?.planTitle || 'undefined');
          console.log('  - Workouts array:', Array.isArray(plan?.workouts) ? '✅' : '❌');
          console.log('  - Workouts count:', plan?.workouts?.length || 0);

          // Save to local storage via Zustand persist first
          console.log('🔍 Store Debug - Setting state...');
          set({ weeklyWorkoutPlan: plan });

          // 🔍 Debug: Verify state was set
          const currentState = get();
          console.log('🔍 Store Debug - State after set:');
          console.log('  - State has plan:', currentState.weeklyWorkoutPlan ? '✅' : '❌');
          console.log(
            '  - State plan title:',
            currentState.weeklyWorkoutPlan?.planTitle || 'undefined'
          );
          console.log(
            '  - State workouts count:',
            currentState.weeklyWorkoutPlan?.workouts?.length || 0
          );

          console.log('✅ Plan saved to local storage');

          // Validate plan data
          if (!plan.workouts || plan.workouts.length === 0) {
            console.warn('⚠️ No workouts in plan to save to database');
            return;
          }

          console.log(`📋 Saving ${plan.workouts.length} workouts to database`);

          // Save individual workouts to database for tracking
          let savedCount = 0;
          let errorCount = 0;

          for (const workout of plan.workouts) {
            try {
              // Validate workout data
              if (!workout.id || !workout.title) {
                console.error('❌ Invalid workout data:', workout);
                errorCount++;
                continue;
              }

              // Create a proper WorkoutSession object matching the expected schema
              const workoutSession = {
                id: `workout_${workout.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                workoutId: workout.id,
                userId: useAuthStore.getState().user?.id || 'guest',
                startedAt: new Date().toISOString(),
                completedAt: null,
                duration: Math.max(5, Math.min(300, workout.duration || 30)), // Ensure 5-300 minute range
                caloriesBurned: Math.max(0, Math.min(10000, workout.estimatedCalories || 200)), // Ensure 0-10000 range
                exercises: (workout.exercises || []).map((exercise) => ({
                  exerciseId: exercise.exerciseId || 'unknown_exercise',
                  sets: Array.from({ length: Math.max(1, exercise.sets || 3) }, (_, index) => ({
                    reps:
                      typeof exercise.reps === 'string'
                        ? parseInt(exercise.reps) || 10
                        : exercise.reps || 10,
                    weight: exercise.weight || 0,
                    duration: 0,
                    restTime: exercise.restTime || 60,
                    rpe: 5, // Default RPE
                    completed: false,
                  })),
                  notes: exercise.notes || '',
                  personalRecord: false,
                })),
                notes: `${workout.dayOfWeek || 'unknown'} - ${workout.description || workout.title}`,
                rating: 0,
                isCompleted: false,
              };

              await crudOperations.createWorkoutSession(workoutSession);
              savedCount++;
            } catch (workoutError) {
              console.error(`❌ Failed to save workout ${workout.title}:`, workoutError);
              errorCount++;
            }
          }

          console.log(
            `✅ Weekly workout plan saved: ${savedCount} successful, ${errorCount} errors`
          );

          if (errorCount > 0 && savedCount === 0) {
            throw new Error(`Failed to save any workouts (${errorCount} errors)`);
          }
        } catch (error) {
          console.error('❌ Failed to save workout plan:', error);
          // Don't throw error if local storage succeeded
          if (get().weeklyWorkoutPlan) {
            console.log('⚠️ Plan saved locally but database save failed');
          } else {
            throw error;
          }
        }

        // ALSO save the complete weekly plan to the new weekly_workout_plans table
        try {
          // Clear any failed UUID attempts in the queue first
          await offlineService.clearFailedActionsForTable('weekly_workout_plans');
          
          console.log('📋 Saving complete weekly workout plan to database...');
          
          // Get authenticated user ID directly from auth store
          const authUser = useAuthStore.getState().user;
          const userId = authUser?.id;
          const planId = generateUUID();
          
          console.log('🔍 FitnessStore: Auth user from store:', authUser);
          console.log('🔍 FitnessStore: User ID from auth:', userId);
          console.log('🔍 FitnessStore: Plan ID generated:', planId);
          
          // Ensure user is authenticated before database operation
          if (!userId) {
            console.error('❌ No authenticated user - cannot save to database');
            throw new Error('User must be authenticated to save workout plans');
          }
          
          // Validate UUIDs before database operation
          if (!isValidUUID(userId)) {
            console.error('❌ Invalid user UUID format:', userId);
            throw new Error('Invalid user UUID format');
          }
          if (!isValidUUID(planId)) {
            console.error('❌ Invalid plan UUID format:', planId);
            throw new Error('Invalid plan UUID format');
          }
          
          console.log('✅ UUID validation passed:', { userId, planId });
          
          const weeklyPlanData = {
            id: planId,
            user_id: userId,
            plan_title: plan.planTitle,
            plan_description: plan.planDescription || `${plan.workouts.length} workouts over ${plan.duration}`,
            week_number: plan.weekNumber || 1,
            total_workouts: plan.workouts.length,
            duration_range: plan.duration,
            plan_data: plan, // Store complete plan as JSONB
            is_active: true
          };

          await offlineService.queueAction({
            type: 'CREATE',
            table: 'weekly_workout_plans',
            data: weeklyPlanData,
            userId: useAuthStore.getState().user?.id || 'guest',
            maxRetries: 3,
          });
          console.log('✅ Weekly workout plan queued for database sync');
        } catch (weeklyPlanError) {
          console.error('❌ Failed to save weekly workout plan to database:', weeklyPlanError);
          // Don't fail the whole operation for this
        }
      },

      loadWeeklyWorkoutPlan: async () => {
        try {
          // First check local storage
          const currentPlan = get().weeklyWorkoutPlan;
          if (currentPlan) {
            console.log('📋 Found workout plan in local storage');
            return currentPlan;
          }

          // Try to load complete weekly plan from database
          try {
            const authUser = useAuthStore.getState().user;
            const userId = authUser?.id;
            if (userId) {
              console.log('🔄 Loading weekly workout plan from database...');
              const { data: weeklyPlans, error } = await supabase
                .from('weekly_workout_plans')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);

              if (!error && weeklyPlans && weeklyPlans.length > 0) {
                const latestPlan = weeklyPlans[0];
                console.log(`✅ Found weekly workout plan in database: ${latestPlan.plan_title}`);
                
                // Extract the complete plan data from JSONB
                const planData = latestPlan.plan_data;
                if (planData && planData.workouts) {
                  // Update local storage with retrieved plan
                  set({ weeklyWorkoutPlan: planData });
                  console.log('📋 Restored weekly workout plan from database to local storage');
                  return planData;
                }
              } else {
                console.log('📋 No weekly workout plan found in database');
              }
            }
          } catch (dbError) {
            console.warn('⚠️ Failed to load from database, trying individual sessions:', dbError);
          }

          // Fallback: Try to load individual workout sessions
          const workoutSessions = await crudOperations.readWorkoutSessions();
          if (workoutSessions.length > 0) {
            console.log(`📋 Found ${workoutSessions.length} individual workout sessions in database`);
            // Could reconstruct weekly plan from sessions if needed in the future
          }

          return null;
        } catch (error) {
          console.error('❌ Failed to load workout plan:', error);
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
      updateWorkoutProgress: (workoutId, progress) => {
        set((state) => ({
          workoutProgress: {
            ...state.workoutProgress,
            [workoutId]: {
              ...state.workoutProgress[workoutId],
              workoutId,
              progress,
            },
          },
        }));
      },

      completeWorkout: (workoutId, sessionId) => {
        set((state) => ({
          workoutProgress: {
            ...state.workoutProgress,
            [workoutId]: {
              workoutId,
              progress: 100,
              completedAt: new Date().toISOString(),
              sessionId,
            },
          },
        }));
      },

      getWorkoutProgress: (workoutId) => {
        return get().workoutProgress[workoutId] || null;
      },

      // Workout session actions
      startWorkoutSession: async (workout) => {
        const sessionId = `session_${workout.id}_${Date.now()}`;

        try {
          // Create a proper WorkoutSession object for active session
          const workoutSession = {
            id: sessionId,
            workoutId: workout.id,
            userId: useAuthStore.getState().user?.id || 'guest',
            startedAt: new Date().toISOString(),
            completedAt: null,
            duration: Math.max(5, Math.min(300, workout.duration || 30)), // Ensure 5-300 minute range
            caloriesBurned: Math.max(0, Math.min(10000, workout.estimatedCalories || 200)), // Ensure 0-10000 range
            exercises: workout.exercises.map((exercise) => ({
              exerciseId: exercise.exerciseId,
              sets: Array.from({ length: exercise.sets }, (_, index) => ({
                reps:
                  typeof exercise.reps === 'string' ? parseInt(exercise.reps) || 10 : exercise.reps,
                weight: exercise.weight || 0,
                duration: 0,
                restTime: exercise.restTime || 60,
                rpe: 5, // Default RPE
                completed: false,
              })),
              notes: exercise.notes || '',
              personalRecord: false,
            })),
            notes: `Active session: ${workout.dayOfWeek} - ${workout.description || workout.title}`,
            rating: 0,
            isCompleted: false,
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

          // Initialize progress
          get().updateWorkoutProgress(workout.id, 0);

          console.log(`🏋️ Started workout session: ${sessionId}`);
          return sessionId;
        } catch (error) {
          console.error('❌ Failed to start workout session:', error);
          throw error;
        }
      },

      endWorkoutSession: async (sessionId) => {
        try {
          const currentSession = get().currentWorkoutSession;
          if (!currentSession) {
            throw new Error('No active workout session');
          }

          // Update session as completed
          await crudOperations.updateWorkoutSession(sessionId, {
            status: 'completed' as any,
            updatedAt: new Date().toISOString(),
          });

          // Complete the workout
          get().completeWorkout(currentSession.workoutId, sessionId);

          set({ currentWorkoutSession: null });

          console.log(`✅ Completed workout session: ${sessionId}`);
        } catch (error) {
          console.error('❌ Failed to end workout session:', error);
          throw error;
        }
      },

      updateExerciseProgress: (exerciseId, setIndex, reps, weight) => {
        set((state) => {
          if (!state.currentWorkoutSession) return state;

          const updatedExercises = state.currentWorkoutSession.exercises.map((exercise) => {
            if (exercise.exerciseId === exerciseId) {
              const updatedSets = [...exercise.sets];
              if (updatedSets[setIndex]) {
                updatedSets[setIndex] = {
                  reps,
                  weight,
                  completed: reps > 0,
                };
              }

              const completedSets = updatedSets.filter((set) => set.completed).length;
              const exerciseCompleted = completedSets === updatedSets.length;

              return {
                ...exercise,
                sets: updatedSets,
                completed: exerciseCompleted,
              };
            }
            return exercise;
          });

          // Calculate overall progress
          const totalExercises = updatedExercises.length;
          const completedExercises = updatedExercises.filter((ex) => ex.completed).length;
          const progressPercent = Math.round((completedExercises / totalExercises) * 100);

          // Update workout progress
          get().updateWorkoutProgress(state.currentWorkoutSession!.workoutId, progressPercent);

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
          await crudOperations.clearAllData(); // Clear old data

          if (state.weeklyWorkoutPlan) {
            await get().saveWeeklyWorkoutPlan(state.weeklyWorkoutPlan);
          }

          console.log('💾 Fitness data persisted');
        } catch (error) {
          console.error('❌ Failed to persist fitness data:', error);
        }
      },

      loadData: async () => {
        try {
          const plan = await get().loadWeeklyWorkoutPlan();
          if (plan) {
            set({ weeklyWorkoutPlan: plan });
          }
          console.log('📂 Fitness data loaded');
        } catch (error) {
          console.error('❌ Failed to load fitness data:', error);
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
          console.log('🧹 Clearing old workout data with descriptive exercise names...');

          // Clear local store data
          get().clearData();

          // Clear database data
          await crudOperations.clearAllData();

          // Clear AsyncStorage
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.removeItem('fitness-storage');

          console.log('✅ Old workout data cleared successfully');

          // Set flag to force regeneration
          get().forceWorkoutRegeneration();
        } catch (error) {
          console.error('❌ Failed to clear old workout data:', error);
          throw error;
        }
      },

      forceWorkoutRegeneration: () => {
        console.log('🔄 Forcing workout regeneration with new constraint system...');
        set({
          weeklyWorkoutPlan: null,
          planError: null,
          isGeneratingPlan: false,
        });
        console.log('✅ Ready for fresh workout generation with database IDs');
      },
    }),
    {
      name: 'fitness-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        weeklyWorkoutPlan: state.weeklyWorkoutPlan,
        workoutProgress: state.workoutProgress,
      }),
    }
  )
);

export default useFitnessStore;
