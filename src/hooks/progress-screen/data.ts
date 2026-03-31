// SSOT Fix 16: progress-screen/data.ts no longer calls DataRetrievalService.
// Previous: getRecentActivities() iterated workoutProgress (a stale key-value
//   map of WorkoutProgress objects) — it could miss sessions added after plan
//   regeneration and never included extra/ad-hoc workouts.
// Now: reads fitnessStore.completedSessions (the canonical list) and
//   nutritionStore.mealProgress for meal activities, matching what
//   AnalyticsScreen and FitnessHeader use.

import { useFitnessStore } from "../../stores/fitnessStore";
import { useNutritionStore } from "../../stores/nutritionStore";
import { WeeklyDataPoint } from "./types";
import { findCompletedSessionForWorkout } from "../../utils/workoutIdentity";
import { getCurrentWeekStart, getWeekStartForDate } from "../../utils/weekUtils";

export const ACTIVITIES_PER_PAGE = 10;

// Build an activity list from the canonical stores.
// Returns objects in the same shape the UI already expects (type, name, completedAt, calories, duration).
export const buildRecentActivities = (limit: number = 200): any[] => {
  const fitnessState = useFitnessStore.getState();
  const nutritionState = useNutritionStore.getState();

  const activities: any[] = [];

  // Workout activities — from completedSessions (SSOT)
  fitnessState.completedSessions
    .filter((s) => s.completedAt)
    .forEach((s) => {
      activities.push({
        id: `session_${s.sessionId}`,
        type: "workout",
        name: s.workoutSnapshot?.title ?? "Workout",
        completedAt: s.completedAt,
        calories: s.caloriesBurned ?? 0,
        duration: s.durationMinutes ?? 0,
      });
    });

  // Meal activities — from mealProgress (SSOT)
  Object.values(nutritionState.mealProgress)
    .filter((p) => p.progress === 100 && p.completedAt)
    .forEach((p) => {
      const meal = nutritionState.weeklyMealPlan?.meals.find((m) => m.id === p.mealId);
      let mealName = meal?.name ?? "Meal";
      if (Array.isArray(mealName)) mealName = mealName.join(", ");
      else if (typeof mealName !== "string") mealName = String(mealName || "Meal");

      activities.push({
        id: `meal_${p.mealId}`,
        type: "meal",
        name: mealName,
        completedAt: p.completedAt!,
        calories: meal?.totalCalories ?? 0,
      });
    });

  // Sort descending by date, apply limit
  return activities
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit);
};

// Build today's data snapshot from canonical stores (no DataRetrievalService indirection).
export const buildTodaysData = (): any => {
  const fitnessState = useFitnessStore.getState();
  // Ensure stale partial progress from previous days is cleared before reading
  fitnessState.checkAndResetProgressIfNewDay();
  const nutritionState = useNutritionStore.getState();

  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const todayName = days[new Date().getDay()];

  const todaysWorkout = fitnessState.weeklyWorkoutPlan?.workouts.find(
    (w) => w.dayOfWeek === todayName
  ) ?? null;

  const todaysMeals = nutritionState.weeklyMealPlan?.meals.filter(
    (m) => m.dayOfWeek === todayName
  ) ?? [];

  const sessionFound = todaysWorkout
    ? !!findCompletedSessionForWorkout({
        completedSessions: fitnessState.completedSessions,
        workout: todaysWorkout,
        plan: fitnessState.weeklyWorkoutPlan,
        weekStart: getCurrentWeekStart(),
      })
    : false;
  const rawEntry = todaysWorkout ? fitnessState.getWorkoutProgress(todaysWorkout.id) : null;
  const entryIsThisWeek =
    rawEntry?.completedAt
      ? getWeekStartForDate(rawEntry.completedAt) === getCurrentWeekStart()
      : true; // partial (no completedAt) entries are always considered current
  const workoutProgress = sessionFound
    ? 100
    : Math.min((entryIsThisWeek ? rawEntry?.progress : 0) ?? 0, 99);

  const mealsCompleted = todaysMeals.filter(
    (m) => nutritionState.getMealProgress(m.id)?.progress === 100
  ).length;

  const caloriesConsumed = todaysMeals.reduce((total, m) => {
    if (nutritionState.getMealProgress(m.id)?.progress === 100) return total + (m.totalCalories ?? 0);
    return total;
  }, 0);

  const targetCalories = todaysMeals.reduce((t, m) => t + (m.totalCalories ?? 0), 0);

  return {
    workout: todaysWorkout,
    meals: todaysMeals,
    progress: { workoutProgress, mealsCompleted, totalMeals: todaysMeals.length, caloriesConsumed, targetCalories },
  };
};

export const generateWeeklyChartData = (activities: any[]): WeeklyDataPoint[] => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekData = days.map((day) => ({ day, workouts: 0, meals: 0, calories: 0, duration: 0 }));

  activities.forEach((activity) => {
    const activityDate = new Date(activity.completedAt);
    const dayIndex = (activityDate.getDay() + 6) % 7;

    if (activity.type === "workout") {
      weekData[dayIndex].workouts += 1;
      weekData[dayIndex].calories += activity.calories || 0;
      weekData[dayIndex].duration += activity.duration || 0;
    } else if (activity.type === "meal") {
      weekData[dayIndex].meals += 1;
      weekData[dayIndex].calories += activity.calories || 0;
    }
  });

  return weekData;
};

export const refreshProgressData = async (
  setTodaysData: (data: any) => void,
  setWeeklyProgress: (data: any) => void,
  setRecentActivities: (data: any[]) => void,
  setRealWeeklyData: (data: WeeklyDataPoint[]) => void,
) => {
  try {
    // Load latest data from persistence layers
    await Promise.all([
      useFitnessStore.getState().loadData(),
      useNutritionStore.getState().loadData(),
    ]);

    // Read from canonical stores only — no DataRetrievalService indirection
    const today = buildTodaysData();
    setTodaysData(today);

    // Build weeklyProgress from store values
    const fitnessState = useFitnessStore.getState();
    const nutritionState = useNutritionStore.getState();
    const weekStart = getCurrentWeekStart();

    const workoutsCompleted = fitnessState.completedSessions.filter(
      (s) => s.type === "planned" && s.weekStart === weekStart
    ).length;
    const mealsCompleted = Object.values(nutritionState.mealProgress)
      .filter((p) => p.progress === 100).length;
    const totalMeals = nutritionState.weeklyMealPlan?.meals.length ?? 0;
    const totalWorkouts = fitnessState.weeklyWorkoutPlan?.workouts.length ?? 0;

    setWeeklyProgress({ workoutsCompleted, totalWorkouts, mealsCompleted, totalMeals });

    const activities = buildRecentActivities(50);
    setRecentActivities(activities);
    setRealWeeklyData(generateWeeklyChartData(activities));
  } catch (error) {
    console.error("Failed to load progress data:", error);
  }
};

export const loadAllActivities = (
  setAllActivities: (data: any[]) => void,
  setActivitiesPage: (page: number) => void,
  setHasMoreActivities: (value: boolean) => void,
) => {
  const allActivitiesData = buildRecentActivities(100);
  setAllActivities(allActivitiesData);
  setActivitiesPage(1);
  setHasMoreActivities(allActivitiesData.length >= ACTIVITIES_PER_PAGE);
};

export const loadMoreActivities = (
  activitiesPage: number,
  loadingMoreActivities: boolean,
  hasMoreActivities: boolean,
  setLoadingMoreActivities: (value: boolean) => void,
  setAllActivities: (updater: (prev: any[]) => any[]) => void,
  setActivitiesPage: (updater: (prev: number) => number) => void,
  setHasMoreActivities: (value: boolean) => void,
) => {
  if (loadingMoreActivities || !hasMoreActivities) return undefined;

  setLoadingMoreActivities(true);

  return setTimeout(() => {
    const startIndex = activitiesPage * ACTIVITIES_PER_PAGE;
    const moreActivities = buildRecentActivities(200).slice(
      startIndex,
      startIndex + ACTIVITIES_PER_PAGE,
    );

    if (moreActivities.length > 0) {
      setAllActivities((prev) => [...prev, ...moreActivities]);
      setActivitiesPage((prev) => prev + 1);
      setHasMoreActivities(moreActivities.length === ACTIVITIES_PER_PAGE);
    } else {
      setHasMoreActivities(false);
    }

    setLoadingMoreActivities(false);
  }, 1000);
};
