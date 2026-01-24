import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NotificationServiceClass, {
  NotificationPreferences,
  WaterReminderConfig,
  WorkoutReminderConfig,
  MealReminderConfig,
  SleepReminderConfig,
} from "../services/notificationService";

// Lazy singleton access - no module-level instantiation
const getNotificationService = () => NotificationServiceClass.getInstance();

interface NotificationState {
  preferences: NotificationPreferences;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  updateWaterConfig: (config: Partial<WaterReminderConfig>) => Promise<void>;
  updateWorkoutConfig: (
    config: Partial<WorkoutReminderConfig>,
  ) => Promise<void>;
  updateMealConfig: (config: Partial<MealReminderConfig>) => Promise<void>;
  updateSleepConfig: (config: Partial<SleepReminderConfig>) => Promise<void>;
  toggleNotificationType: (
    type: keyof NotificationPreferences,
  ) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  scheduleAllNotifications: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  getScheduledCount: () => Promise<number>;
}

// Default preferences - defined at module level without native API calls
const getDefaultPreferences = (): NotificationPreferences => ({
  water: {
    enabled: true,
    dailyGoalLiters: 4,
    wakeUpTime: "07:00",
    sleepTime: "23:00",
  },
  workout: {
    enabled: true,
    reminderMinutes: 30,
  },
  meals: {
    enabled: true,
    breakfast: { enabled: true, time: "08:00" },
    lunch: { enabled: true, time: "13:00" },
    dinner: { enabled: true, time: "19:00" },
  },
  sleep: {
    enabled: false,
    bedtime: "22:30",
    reminderMinutes: 30,
  },
  progress: {
    enabled: true,
    frequency: "weekly",
  },
});

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      preferences: getDefaultPreferences(), // Use local function, not service method
      isInitialized: false,
      isLoading: false,
      error: null,

      initialize: async () => {
        set({ isLoading: true, error: null });

        try {
          // Initialize notification service
          const notificationService = getNotificationService();
          const success = await notificationService.initialize();
          if (!success) {
            throw new Error("Failed to initialize notification permissions");
          }

          // Load saved preferences
          const savedPreferences = await notificationService.loadPreferences();
          if (savedPreferences) {
            set({ preferences: savedPreferences });
          }

          // Schedule notifications based on current preferences
          await get().scheduleAllNotifications();

          set({ isInitialized: true, isLoading: false });
        } catch (error) {
          console.error("Failed to initialize notification store:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to initialize notifications",
            isLoading: false,
          });
        }
      },

      updateWaterConfig: async (config) => {
        const currentPrefs = get().preferences;
        const updatedPrefs = {
          ...currentPrefs,
          water: { ...currentPrefs.water, ...config },
        };

        set({ preferences: updatedPrefs });
        const notificationService = getNotificationService();
        await notificationService.savePreferences(updatedPrefs);
        await notificationService.scheduleWaterReminders(updatedPrefs.water);
      },

      updateWorkoutConfig: async (config) => {
        const currentPrefs = get().preferences;
        const updatedPrefs = {
          ...currentPrefs,
          workout: { ...currentPrefs.workout, ...config },
        };

        set({ preferences: updatedPrefs });
        const notificationService = getNotificationService();
        await notificationService.savePreferences(updatedPrefs);
        await notificationService.scheduleWorkoutReminders(
          updatedPrefs.workout,
        );
      },

      updateMealConfig: async (config) => {
        const currentPrefs = get().preferences;
        const updatedPrefs = {
          ...currentPrefs,
          meals: { ...currentPrefs.meals, ...config },
        };

        set({ preferences: updatedPrefs });
        const notificationService = getNotificationService();
        await notificationService.savePreferences(updatedPrefs);
        await notificationService.scheduleMealReminders(updatedPrefs.meals);
      },

      updateSleepConfig: async (config) => {
        const currentPrefs = get().preferences;
        const updatedPrefs = {
          ...currentPrefs,
          sleep: { ...currentPrefs.sleep, ...config },
        };

        set({ preferences: updatedPrefs });
        const notificationService = getNotificationService();
        await notificationService.savePreferences(updatedPrefs);
        await notificationService.scheduleSleepReminders(updatedPrefs.sleep);
      },

      toggleNotificationType: async (type) => {
        const currentPrefs = get().preferences;
        const updatedPrefs = {
          ...currentPrefs,
          [type]: {
            ...currentPrefs[type],
            enabled: !currentPrefs[type].enabled,
          },
        };

        set({ preferences: updatedPrefs });
        const notificationService = getNotificationService();
        await notificationService.savePreferences(updatedPrefs);

        // Reschedule specific notification type
        switch (type) {
          case "water":
            await notificationService.scheduleWaterReminders(
              updatedPrefs.water,
            );
            break;
          case "workout":
            await notificationService.scheduleWorkoutReminders(
              updatedPrefs.workout,
            );
            break;
          case "meals":
            await notificationService.scheduleMealReminders(updatedPrefs.meals);
            break;
          case "sleep":
            await notificationService.scheduleSleepReminders(
              updatedPrefs.sleep,
            );
            break;
          case "progress":
            // Progress notifications handled separately
            break;
        }
      },

      resetToDefaults: async () => {
        const defaults = getDefaultPreferences();
        set({ preferences: defaults });
        const notificationService = getNotificationService();
        await notificationService.savePreferences(defaults);
        await get().scheduleAllNotifications();
      },

      scheduleAllNotifications: async () => {
        const { preferences } = get();

        try {
          const notificationService = getNotificationService();
          // Clear all existing notifications first
          await notificationService.clearAllNotifications();

          // Schedule each type of notification
          if (preferences.water.enabled) {
            await notificationService.scheduleWaterReminders(preferences.water);
          }

          if (preferences.workout.enabled) {
            await notificationService.scheduleWorkoutReminders(
              preferences.workout,
            );
          }

          if (preferences.meals.enabled) {
            await notificationService.scheduleMealReminders(preferences.meals);
          }

          if (preferences.sleep.enabled) {
            await notificationService.scheduleSleepReminders(preferences.sleep);
          }

          console.log("All notifications scheduled successfully");
        } catch (error) {
          console.error("Failed to schedule notifications:", error);
          set({ error: "Failed to schedule notifications" });
        }
      },

      clearAllNotifications: async () => {
        const notificationService = getNotificationService();
        await notificationService.clearAllNotifications();
      },

      getScheduledCount: async () => {
        const notificationService = getNotificationService();
        const notifications =
          await notificationService.getScheduledNotifications();
        return notifications.length;
      },
    }),
    {
      name: "notification-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);

// Helper hook for water-specific operations
export const useWaterReminders = () => {
  const { preferences, updateWaterConfig, toggleNotificationType } =
    useNotificationStore();

  return {
    config: preferences.water,
    updateConfig: updateWaterConfig,
    toggle: () => toggleNotificationType("water"),

    // Convenience methods
    setDailyGoal: (liters: number) =>
      updateWaterConfig({ dailyGoalLiters: liters }),
    setWakeUpTime: (time: string) => updateWaterConfig({ wakeUpTime: time }),
    setSleepTime: (time: string) => updateWaterConfig({ sleepTime: time }),

    // Calculate current progress helper
    calculateDailyProgress: (currentLiters: number) => ({
      percentage: Math.min(
        (currentLiters / preferences.water.dailyGoalLiters) * 100,
        100,
      ),
      remaining: Math.max(preferences.water.dailyGoalLiters - currentLiters, 0),
      isGoalMet: currentLiters >= preferences.water.dailyGoalLiters,
    }),
  };
};

// Helper hook for workout-specific operations
export const useWorkoutReminders = () => {
  const { preferences, updateWorkoutConfig, toggleNotificationType } =
    useNotificationStore();

  return {
    config: preferences.workout,
    updateConfig: updateWorkoutConfig,
    toggle: () => toggleNotificationType("workout"),

    // Convenience methods
    setReminderTime: (minutes: number) =>
      updateWorkoutConfig({ reminderMinutes: minutes }),
    setCustomTimes: (times: string[]) =>
      updateWorkoutConfig({ customTimes: times }),

    // Auto-schedule from workout plan
    scheduleFromWorkoutPlan: async (workoutTimes: string[]) => {
      const notificationService = getNotificationService();
      await notificationService.scheduleWorkoutReminders(
        preferences.workout,
        workoutTimes,
      );
    },
  };
};

// Helper hook for meal-specific operations
export const useMealReminders = () => {
  const { preferences, updateMealConfig, toggleNotificationType } =
    useNotificationStore();

  return {
    config: preferences.meals,
    updateConfig: updateMealConfig,
    toggle: () => toggleNotificationType("meals"),

    // Individual meal toggles
    toggleBreakfast: () =>
      updateMealConfig({
        breakfast: {
          ...preferences.meals.breakfast,
          enabled: !preferences.meals.breakfast.enabled,
        },
      }),
    toggleLunch: () =>
      updateMealConfig({
        lunch: {
          ...preferences.meals.lunch,
          enabled: !preferences.meals.lunch.enabled,
        },
      }),
    toggleDinner: () =>
      updateMealConfig({
        dinner: {
          ...preferences.meals.dinner,
          enabled: !preferences.meals.dinner.enabled,
        },
      }),

    // Time setters
    setBreakfastTime: (time: string) =>
      updateMealConfig({
        breakfast: { ...preferences.meals.breakfast, time },
      }),
    setLunchTime: (time: string) =>
      updateMealConfig({
        lunch: { ...preferences.meals.lunch, time },
      }),
    setDinnerTime: (time: string) =>
      updateMealConfig({
        dinner: { ...preferences.meals.dinner, time },
      }),
  };
};

// Helper hook for sleep-specific operations
export const useSleepReminders = () => {
  const { preferences, updateSleepConfig, toggleNotificationType } =
    useNotificationStore();

  return {
    config: preferences.sleep,
    updateConfig: updateSleepConfig,
    toggle: () => toggleNotificationType("sleep"),

    // Convenience methods
    setBedtime: (time: string) => updateSleepConfig({ bedtime: time }),
    setReminderMinutes: (minutes: number) =>
      updateSleepConfig({ reminderMinutes: minutes }),
  };
};
