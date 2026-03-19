import AsyncStorage from "@react-native-async-storage/async-storage";

const loadAchievementModules = async () => {
  jest.resetModules();
  await AsyncStorage.clear();

  const achievementEngineModule = require("./core");
  const achievementStoreModule = require("../../stores/achievementStore");

  return {
    achievementEngine: achievementEngineModule.achievementEngine,
    useAchievementStore: achievementStoreModule.useAchievementStore,
  };
};

describe("achievement engine real-scenario support", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("supports workout streak achievements", async () => {
    const { achievementEngine } = await loadAchievementModules();
    const userId = "streak-user";

    await achievementEngine.initialize();
    await achievementEngine.checkAchievements(userId, {
      workoutStreak: 7,
      currentStreak: 7,
    });

    const progress = achievementEngine.getUserAchievementProgress(userId);
    expect(progress.get("workout_streak_7")?.isCompleted).toBe(true);
  });

  it("supports weight goal and custom workout-type achievements", async () => {
    const { achievementEngine } = await loadAchievementModules();
    const userId = "real-scenarios-user";

    await achievementEngine.initialize();
    await achievementEngine.checkAchievements(userId, {
      weightGoalAchieved: true,
      workoutTypeCounts: { strength: 5 },
      activeDays: 7,
    });

    const progress = achievementEngine.getUserAchievementProgress(userId);
    expect(progress.get("weight_goal_achieved")?.isCompleted).toBe(true);
    expect(progress.get("iron_apprentice")?.isCompleted).toBe(true);
    expect(progress.get("first_week")?.isCompleted).toBe(true);
  });

  it("refreshes store state for in-progress achievements even without an unlock", async () => {
    const { achievementEngine, useAchievementStore } =
      await loadAchievementModules();
    const userId = "store-progress-user";

    await achievementEngine.initialize();
    useAchievementStore.setState({
      isLoading: false,
      isInitialized: true,
      achievements: achievementEngine.getAllAchievements(),
      userAchievements: new Map(),
      unlockedToday: [],
      showCelebration: false,
      celebrationAchievement: null,
      totalFitCoinsEarned: 0,
      completionRate: 0,
      currentStreak: 0,
    });

    await useAchievementStore.getState().checkProgress(userId, {
      totalWorkouts: 5,
    });

    const userAchievement = useAchievementStore
      .getState()
      .userAchievements.get("workout_warrior");

    expect(userAchievement?.isCompleted).toBe(false);
    expect(userAchievement?.progress).toBe(5);
  });
});
