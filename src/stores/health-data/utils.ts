import type {
  HealthDataState,
  HealthMetrics,
  HealthIntegrationSettings,
} from "./types";

export const createGeneralActions = (
  set: (
    partial:
      | Partial<HealthDataState>
      | ((state: HealthDataState) => Partial<HealthDataState>),
  ) => void,
  get: () => HealthDataState,
) => ({
  setStepsGoal: (goal: number): void => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        stepsGoal: goal,
      },
    }));
  },

  updateHealthMetrics: (newMetrics: Partial<HealthMetrics>): void => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        ...newMetrics,
        lastUpdated: new Date().toISOString(),
      },
    }));
  },

  updateSettings: (newSettings: Partial<HealthIntegrationSettings>): void => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...newSettings,
      },
    }));

    if (newSettings.healthKitEnabled === true) {
      get().initializeHealthKit();
    }
  },

  setShowHealthDashboard: (show: boolean): void => {
    set({ showingHealthDashboard: show });
  },

  getHealthInsights: (): string[] => {
    const { metrics } = get();
    const insights: string[] = [];

    if (metrics.steps > 0) {
      const stepsGoal = metrics.stepsGoal;
      if (stepsGoal) {
        if (metrics.steps >= stepsGoal) {
          insights.push("🎉 Great job! You've exceeded your daily step goal.");
        } else if (metrics.steps >= stepsGoal / 2) {
          insights.push(
            `💪 You're halfway to your step goal! ${stepsGoal - metrics.steps} steps to go.`,
          );
        } else {
          insights.push(
            "🚶 Consider taking a walk to boost your daily activity.",
          );
        }
      }
    }

    if (metrics.heartRate) {
      if (metrics.heartRate > 100) {
        insights.push(
          "❤️ Your heart rate suggests you've been active - great work!",
        );
      } else if (
        metrics.restingHeartRate &&
        metrics.heartRate < metrics.restingHeartRate + 20
      ) {
        insights.push(
          "🧘 Your heart rate indicates good recovery - perfect for your next workout.",
        );
      }
    }

    if (metrics.sleepHours) {
      if (metrics.sleepHours >= 7) {
        insights.push(
          `😴 Excellent sleep! ${metrics.sleepHours} hours will fuel your fitness goals.`,
        );
      } else if (metrics.sleepHours >= 6) {
        insights.push(
          "💤 Decent sleep, but aim for 7-8 hours for optimal recovery.",
        );
      } else {
        insights.push(
          "⚠️ Low sleep detected. Consider adjusting workout intensity today.",
        );
      }
    }

    if (metrics.recentWorkouts.length >= 3) {
      insights.push(
        "🔥 Amazing consistency! Regular workouts are building your fitness foundation.",
      );
    } else if (metrics.recentWorkouts.length === 0) {
      insights.push(
        "🏃 Ready to start your fitness journey? Your first workout awaits!",
      );
    }

    if (metrics.weight) {
      insights.push(
        "📊 Weight tracking active - consistency is key for accurate progress monitoring.",
      );
    }

    return insights;
  },

  resetHealthData: (): void => {
    set({
      metrics: {
        steps: 0,
        activeCalories: 0,
        recentWorkouts: [],
        lastUpdated: new Date().toISOString(),
      },
      syncStatus: "idle",
      lastSyncTime: undefined,
      syncError: undefined,
      healthTipOfDay: undefined,
    });
  },

  reset: () => {
    get().resetHealthData();
  },
});
