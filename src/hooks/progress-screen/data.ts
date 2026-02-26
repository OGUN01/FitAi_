import DataRetrievalService from "../../services/dataRetrieval";
import { WeeklyDataPoint } from "./types";

export const ACTIVITIES_PER_PAGE = 10;

export const generateWeeklyChartData = (
  activities: any[],
): WeeklyDataPoint[] => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekData = days.map((day) => ({
    day,
    workouts: 0,
    meals: 0,
    calories: 0,
    duration: 0,
  }));

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
    await DataRetrievalService.loadAllData();

    const today = DataRetrievalService.getTodaysData();
    setTodaysData(today);

    const weekly = DataRetrievalService.getWeeklyProgress();
    setWeeklyProgress(weekly);

    const activities = DataRetrievalService.getRecentActivities(50);
    setRecentActivities(activities);

    const weekData = generateWeeklyChartData(activities);
    setRealWeeklyData(weekData);
  } catch (error) {
    console.error("Failed to load progress data:", error);
  }
};

export const loadAllActivities = (
  setAllActivities: (data: any[]) => void,
  setActivitiesPage: (page: number) => void,
  setHasMoreActivities: (value: boolean) => void,
) => {
  const allActivitiesData = DataRetrievalService.getRecentActivities(100);
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
    const moreActivities = DataRetrievalService.getRecentActivities(200).slice(
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
