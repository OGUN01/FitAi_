import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeeklyMealPlan, DayMeal } from '../ai';
import { SyncStatus } from '../types/localData';
import { Meal } from '../types/ai';
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

interface MealProgress {
  mealId: string;
  progress: number; // 0-100
  completedAt?: string;
  logId?: string;
}

interface NutritionState {
  // Weekly meal plan state
  weeklyMealPlan: WeeklyMealPlan | null;
  isGeneratingPlan: boolean;
  planError: string | null;

  // Meal progress tracking
  mealProgress: Record<string, MealProgress>;

  // Daily meal tracking
  dailyMeals: Meal[];
  isGeneratingMeal: boolean;
  mealError: string | null;

  // Current meal session
  currentMealSession: {
    mealId: string;
    logId: string;
    startedAt: string;
    ingredients: Array<{
      ingredientId: string;
      completed: boolean;
      quantity: number;
    }>;
  } | null;

  // Actions
  setWeeklyMealPlan: (plan: WeeklyMealPlan | null) => void;
  saveWeeklyMealPlan: (plan: WeeklyMealPlan) => Promise<void>;
  loadWeeklyMealPlan: () => Promise<WeeklyMealPlan | null>;
  setGeneratingPlan: (isGenerating: boolean) => void;
  setPlanError: (error: string | null) => void;

  // Daily meal actions
  addDailyMeal: (meal: Meal) => void;
  setDailyMeals: (meals: Meal[]) => void;
  setGeneratingMeal: (isGenerating: boolean) => void;
  setMealError: (error: string | null) => void;

  // Meal progress actions
  updateMealProgress: (mealId: string, progress: number) => void;
  completeMeal: (mealId: string, logId?: string) => void;
  getMealProgress: (mealId: string) => MealProgress | null;

  // Meal session actions
  startMealSession: (meal: DayMeal) => Promise<string>;
  endMealSession: (logId: string) => Promise<void>;
  updateIngredientProgress: (ingredientId: string, quantity: number) => void;

  // Data persistence
  persistData: () => Promise<void>;
  loadData: () => Promise<void>;
  clearData: () => void;
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      // Initial state
      weeklyMealPlan: null,
      isGeneratingPlan: false,
      planError: null,
      mealProgress: {},
      dailyMeals: [],
      isGeneratingMeal: false,
      mealError: null,
      currentMealSession: null,

      // Weekly meal plan actions
      setWeeklyMealPlan: (plan) => {
        set({ weeklyMealPlan: plan });
      },

      saveWeeklyMealPlan: async (plan) => {
        try {
          const planTitle = (plan as any).planTitle || `Week ${plan.weekNumber} Meal Plan`;
          console.log('🍽️ Saving weekly meal plan:', planTitle);

          // Save to local storage via Zustand persist first
          set({ weeklyMealPlan: plan });
          console.log('✅ Meal plan saved to local storage');

          // Validate plan data
          if (!plan.meals || plan.meals.length === 0) {
            console.warn('⚠️ No meals in plan to save to database');
            return;
          }

          console.log(`📋 Saving ${plan.meals.length} meals to database`);
          console.log(
            `🔍 Meals breakdown by day:`,
            plan.meals.reduce(
              (acc, meal) => {
                acc[meal.dayOfWeek] = (acc[meal.dayOfWeek] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            )
          );

          // Save individual meals to database for tracking
          let savedCount = 0;
          let errorCount = 0;

          for (const meal of plan.meals) {
            try {
              // Validate meal data
              if (!meal.id || !meal.name) {
                console.error('❌ Invalid meal data:', meal);
                errorCount++;
                continue;
              }

              // Create a proper MealLog object matching the expected schema
              const mealLog: import('../types/localData').MealLog = {
                id: `meal_${meal.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                mealType: ((meal as any).type || 'meal').toLowerCase() as any, // uses DayMeal.type
                foods: ((meal as any).items || []).map((item: any, index: number) => ({
                  id: `food_${meal.id}_${index}`,
                  foodId: `food_${meal.id}_${index}`,
                  food: {
                    id: `food_${meal.id}_${index}`,
                    name: item.name || 'Unknown food',
                    isCustom: true,
                    isFavorite: false,
                    localId: `local_${Date.now()}_${index}`,
                    usageCount: 1,
                    verificationStatus: 'user_created',
                  } as any,
                  quantity: item.quantity || 100,
                  unit: 'grams',
                  calories: item.calories || 0,
                  macros: {
                    protein: item.macros?.protein ?? 0,
                    carbohydrates: item.macros?.carbohydrates ?? 0,
                    fat: item.macros?.fat ?? 0,
                    fiber: item.macros?.fiber ?? 0,
                  },
                })),
                totalCalories: meal.totalCalories || 0,
                totalMacros: {
                  protein: meal.totalMacros?.protein ?? 0,
                  carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                  fat: meal.totalMacros?.fat ?? 0,
                  fiber: meal.totalMacros?.fiber ?? 0,
                },
                loggedAt: new Date().toISOString(),
                photos: [],
                syncStatus: SyncStatus.PENDING,
                syncMetadata: {
                  lastSyncedAt: undefined,
                  lastModifiedAt: new Date().toISOString(),
                  syncVersion: 1,
                  deviceId: 'dev-device',
                },
              };

              await crudOperations.createMealLog(mealLog);
              savedCount++;
            } catch (mealError) {
              console.error(`❌ Failed to save meal ${meal.name}:`, mealError);
              errorCount++;
            }
          }

          console.log(`✅ Weekly meal plan saved: ${savedCount} successful, ${errorCount} errors`);

          if (errorCount > 0 && savedCount === 0) {
            throw new Error(`Failed to save any meals (${errorCount} errors)`);
          }
        } catch (error) {
          console.error('❌ Failed to save meal plan:', error);
          // Don't throw error if local storage succeeded
          if (get().weeklyMealPlan) {
            console.log('⚠️ Meal plan saved locally but database save failed');
          } else {
            throw error;
          }
        }

        // ALSO save the complete weekly meal plan to the new weekly_meal_plans table
        try {
          // Clear any failed UUID attempts in the queue first
          await offlineService.clearFailedActionsForTable('weekly_meal_plans');
          
          console.log('🍽️ Saving complete weekly meal plan to database...');
          
          // Get authenticated user ID directly from auth store
          const authUser = useAuthStore.getState().user;
          const userId = authUser?.id;
          const planId = generateUUID();
          
          console.log('🍽️ NutritionStore: Auth user from store:', authUser);
          console.log('🍽️ NutritionStore: User ID from auth:', userId);
          console.log('🍽️ NutritionStore: Plan ID generated:', planId);
          
          // Ensure user is authenticated before database operation
          if (!userId) {
            console.error('❌ No authenticated user - cannot save to database');
            throw new Error('User must be authenticated to save meal plans');
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
          
          const weeklyMealPlanData = {
            id: planId,
            user_id: userId,
            plan_title: (plan as any).planTitle || `Week ${plan.weekNumber} Plan`,
            plan_description: (plan as any).planDescription || `${plan.meals.length} meals planned`,
            week_number: plan.weekNumber || 1,
            total_meals: plan.meals.length,
            total_calories: (plan as any).totalEstimatedCalories || plan.meals.reduce((sum: number, meal: any) => sum + (meal.totalCalories || 0), 0),
            plan_data: plan, // Store complete meal plan as JSONB
            is_active: true
          };

          await offlineService.queueAction({
            type: 'CREATE',
            table: 'weekly_meal_plans',
            data: weeklyMealPlanData,
            userId: useAuthStore.getState().user?.id || 'guest',
            maxRetries: 3,
          });
          console.log('✅ Weekly meal plan queued for database sync');
        } catch (weeklyMealPlanError) {
          console.error('❌ Failed to save weekly meal plan to database:', weeklyMealPlanError);
          // Don't fail the whole operation for this
        }
      },

      loadWeeklyMealPlan: async () => {
        try {
          // First check local storage
          const currentPlan = get().weeklyMealPlan;
          if (currentPlan) {
            console.log('📋 Found meal plan in store:', {
              title: (currentPlan as any).planTitle || `Week ${currentPlan.weekNumber}`,
              meals: currentPlan.meals.length,
              mealsByDay: currentPlan.meals.reduce(
                (acc, meal) => {
                  acc[meal.dayOfWeek] = (acc[meal.dayOfWeek] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              ),
            });
            return currentPlan;
          }

          // Try to load complete weekly meal plan from database
          try {
            const authUser = useAuthStore.getState().user;
            const userId = authUser?.id;
            if (userId) {
              console.log('🔄 Loading weekly meal plan from database...');
              const { data: weeklyMealPlans, error } = await supabase
                .from('weekly_meal_plans')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);

              if (!error && weeklyMealPlans && weeklyMealPlans.length > 0) {
                const latestPlan = weeklyMealPlans[0];
                console.log(`✅ Found weekly meal plan in database: ${latestPlan.plan_title}`);
                
                // Extract the complete plan data from JSONB
                const planData = latestPlan.plan_data;
                if (planData && planData.meals) {
                  // Update local storage with retrieved plan
                  set({ weeklyMealPlan: planData });
                  console.log('📋 Restored weekly meal plan from database to local storage');
                  return planData;
                }
              } else {
                console.log('📋 No weekly meal plan found in database');
              }
            }
          } catch (dbError) {
            console.warn('⚠️ Failed to load from database, trying individual meal logs:', dbError);
          }

          // Fallback: Try to load individual meal logs
          const mealLogs = await crudOperations.readMealLogs();
          if (mealLogs.length > 0) {
            console.log('📋 Found existing meal logs in database:', {
              totalLogs: mealLogs.length,
              logsByType: mealLogs.reduce(
                (acc, log) => {
                  acc[log.mealType] = (acc[log.mealType] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              ),
            });
            // Could reconstruct weekly plan from logs if needed in the future
          } else {
            console.log('📭 No meal logs found in database');
          }

          return null;
        } catch (error) {
          console.error('❌ Failed to load meal plan:', error);
          return null;
        }
      },

      setGeneratingPlan: (isGenerating) => {
        set({ isGeneratingPlan: isGenerating });
      },

      setPlanError: (error) => {
        set({ planError: error });
      },

      // Daily meal actions
      addDailyMeal: (meal) => {
        set((state) => ({
          dailyMeals: [meal, ...state.dailyMeals],
        }));
      },

      setDailyMeals: (meals) => {
        set({ dailyMeals: meals });
      },

      setGeneratingMeal: (isGenerating) => {
        set({ isGeneratingMeal: isGenerating });
      },

      setMealError: (error) => {
        set({ mealError: error });
      },

      // Meal progress actions
      updateMealProgress: (mealId, progress) => {
        set((state) => ({
          mealProgress: {
            ...state.mealProgress,
            [mealId]: {
              ...state.mealProgress[mealId],
              mealId,
              progress,
            },
          },
        }));
      },

      completeMeal: (mealId, logId) => {
        console.log('🍽️ NutritionStore: completeMeal called:', { mealId, logId });
        console.log('🍽️ NutritionStore: Previous progress:', get().mealProgress[mealId]);
        
        set((state) => {
          const newProgress = {
            ...state.mealProgress,
            [mealId]: {
              ...state.mealProgress[mealId],
              mealId,
              progress: 100,
              completedAt: new Date().toISOString(),
              logId,
            },
          };
          
          console.log('🍽️ NutritionStore: New progress:', newProgress[mealId]);
          console.log('🍽️ NutritionStore: All meal progress:', newProgress);
          
          return {
            mealProgress: newProgress,
          };
        });
        
        // Log the final state after update
        setTimeout(() => {
          const finalProgress = get().mealProgress[mealId];
          console.log('🍽️ NutritionStore: Final state after completeMeal:', finalProgress);
        }, 0);
      },

      getMealProgress: (mealId) => {
        return get().mealProgress[mealId] || null;
      },

      // Meal session actions
      startMealSession: async (meal) => {
        const logId = `log_${meal.id}_${Date.now()}`;

        try {
          // Create a proper MealLog object for active session
          const mealLog: import('../types/localData').MealLog = {
            id: logId,
            mealType: meal.type.toLowerCase() as any,
            foods: meal.items.map((item, index) => ({
              id: `food_${meal.id}_${index}`,
              foodId: `food_${meal.id}_${index}`,
              food: {
                id: `food_${meal.id}_${index}`,
                name: item.name || 'Unknown food',
                isCustom: true,
                isFavorite: false,
                localId: `local_${Date.now()}_${index}`,
                usageCount: 1,
                verificationStatus: 'user_created',
              } as any,
              quantity: item.quantity || 100,
              unit: 'grams',
              calories: item.calories || 0,
              macros: {
                protein: item.macros?.protein ?? 0,
                carbohydrates: item.macros?.carbohydrates ?? 0,
                fat: item.macros?.fat ?? 0,
                fiber: item.macros?.fiber ?? 0,
              },
            })),
            totalCalories: meal.totalCalories || 0,
            totalMacros: {
              protein: meal.totalMacros?.protein ?? 0,
              carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
              fat: meal.totalMacros?.fat ?? 0,
              fiber: meal.totalMacros?.fiber ?? 0,
            },
            loggedAt: new Date().toISOString(),
            photos: [],
            syncStatus: SyncStatus.PENDING,
            syncMetadata: {
              lastSyncedAt: undefined,
              lastModifiedAt: new Date().toISOString(),
              syncVersion: 1,
              deviceId: 'dev-device',
            },
            // Note: totalMacros will be computed elsewhere for active sessions
          };
          // Preserve extra UI fields separately if needed
          // Note: macros are saved on the mealLog.totalMacros above; these are UI-only vars if needed
          const totalMacros = {
            protein: meal.totalMacros?.protein ?? 0,
            carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
            fat: meal.totalMacros?.fat ?? 0,
            fiber: meal.totalMacros?.fiber ?? 0,
          } as const;
          const notes = `Active session: ${meal.dayOfWeek} - ${meal.description || meal.name}`;
          const timestamp = new Date().toISOString();

          await crudOperations.createMealLog(mealLog);

          set({
            currentMealSession: {
              mealId: meal.id,
              logId,
              startedAt: new Date().toISOString(),
              ingredients: meal.items.map((item, index) => ({
                ingredientId: `${meal.id}_${index}`,
                completed: false,
                quantity: item.quantity || 100,
              })),
            },
          });

          // Initialize progress
          get().updateMealProgress(meal.id, 0);

          console.log(`🍽️ Started meal session: ${logId}`);
          return logId;
        } catch (error) {
          console.error('❌ Failed to start meal session:', error);
          throw error;
        }
      },

      endMealSession: async (logId) => {
        try {
          const currentSession = get().currentMealSession;
          if (!currentSession) {
            throw new Error('No active meal session');
          }

          // Update log as completed
          await crudOperations.updateMealLog(logId, {
            notes: ((await crudOperations.readMealLog(logId))?.notes || '') + ' [COMPLETED]',
          });

          // Complete the meal
          get().completeMeal(currentSession.mealId, logId);

          set({ currentMealSession: null });

          console.log(`✅ Completed meal session: ${logId}`);
        } catch (error) {
          console.error('❌ Failed to end meal session:', error);
          throw error;
        }
      },

      updateIngredientProgress: (ingredientId, quantity) => {
        set((state) => {
          if (!state.currentMealSession) return state;

          const updatedIngredients = state.currentMealSession.ingredients.map((ingredient) => {
            if (ingredient.ingredientId === ingredientId) {
              return {
                ...ingredient,
                quantity,
                completed: quantity > 0,
              };
            }
            return ingredient;
          });

          // Calculate overall progress
          const totalIngredients = updatedIngredients.length;
          const completedIngredients = updatedIngredients.filter((ing) => ing.completed).length;
          const progressPercent = Math.round((completedIngredients / totalIngredients) * 100);

          // Update meal progress
          get().updateMealProgress(state.currentMealSession!.mealId, progressPercent);

          return {
            ...state,
            currentMealSession: {
              ...state.currentMealSession,
              ingredients: updatedIngredients,
            },
          };
        });
      },

      // Data persistence
      persistData: async () => {
        try {
          const state = get();

          if (state.weeklyMealPlan) {
            await get().saveWeeklyMealPlan(state.weeklyMealPlan);
          }

          // Save daily meals as individual logs
          for (const meal of state.dailyMeals) {
            const mealLog: import('../types/localData').MealLog = {
              id: `daily_meal_${meal.id || Date.now()}`,
              mealType: meal.type as any,
              foods:
                (meal.items as any[] | undefined)?.map((item: any, index) => ({
                  id: `food_${meal.id || Date.now()}_${index}`,
                  foodId: `food_${meal.id || Date.now()}_${index}`,
                  food: {
                    id: `food_${meal.id || Date.now()}_${index}`,
                    name: item.name || 'Unknown food',
                    isCustom: true,
                    isFavorite: false,
                    localId: `local_${Date.now()}_${index}`,
                    usageCount: 1,
                    verificationStatus: 'user_created',
                  } as any,
                  quantity: 100,
                  unit: 'grams',
                  calories: item.calories || 0,
                  macros: {
                    protein: item.macros?.protein ?? 0,
                    carbohydrates: item.macros?.carbohydrates ?? 0,
                    fat: item.macros?.fat ?? 0,
                    fiber: item.macros?.fiber ?? 0,
                  },
                })) || [],
              totalCalories: meal.totalCalories || 0,
              totalMacros: {
                protein: meal.totalMacros?.protein ?? 0,
                carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                fat: meal.totalMacros?.fat ?? 0,
                fiber: meal.totalMacros?.fiber ?? 0,
              },
              loggedAt: new Date().toISOString(),
              photos: [],
              syncStatus: SyncStatus.PENDING,
              syncMetadata: {
                lastSyncedAt: undefined,
                lastModifiedAt: new Date().toISOString(),
                syncVersion: 1,
                deviceId: 'dev-device',
              },
            };

            await crudOperations.createMealLog(mealLog);
          }

          console.log('💾 Nutrition data persisted');
        } catch (error) {
          console.error('❌ Failed to persist nutrition data:', error);
        }
      },

      loadData: async () => {
        try {
          console.log('📂 NutritionStore: Loading data...');
          
          // Preserve existing meal progress before loading
          const currentMealProgress = get().mealProgress;
          console.log('📂 NutritionStore: Current meal progress before load:', currentMealProgress);
          
          const plan = await get().loadWeeklyMealPlan();
          if (plan) {
            // Set the plan while preserving meal progress
            set((state) => ({
              weeklyMealPlan: plan,
              mealProgress: { ...currentMealProgress }, // Preserve meal progress
            }));
          }

          // Load recent meal logs
          const mealLogs = await crudOperations.readMealLogs(
            new Date().toISOString().split('T')[0]
          );
          
          console.log('📂 NutritionStore: Data loaded, final meal progress:', get().mealProgress);
          console.log('📂 Nutrition data loaded');
        } catch (error) {
          console.error('❌ Failed to load nutrition data:', error);
        }
      },

      clearData: () => {
        set({
          weeklyMealPlan: null,
          mealProgress: {},
          dailyMeals: [],
          currentMealSession: null,
          planError: null,
          mealError: null,
        });
      },
    }),
    {
      name: 'nutrition-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        weeklyMealPlan: state.weeklyMealPlan,
        mealProgress: state.mealProgress,
        dailyMeals: state.dailyMeals,
      }),
    }
  )
);

export default useNutritionStore;
