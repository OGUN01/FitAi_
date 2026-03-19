import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { useProfileStore } from "../../stores/profileStore";
import { useOffline } from "../../hooks/useOffline";
import { api } from "../../services/api";
import { HealthMetrics } from "./types";
import { buildLegacyProfileAdapter } from "../profileLegacyAdapter";

export const useDashboardIntegration = () => {
  const { user: authUser } = useAuth();
  const { profile } = useUser();
  const { isOnline } = useOffline();
  const {
    bodyAnalysis,
    personalInfo: profilePersonalInfo,
    workoutPreferences: profileWorkoutPreferences,
  } = useProfileStore();
  const adaptedProfile = buildLegacyProfileAdapter({
    personalInfo: profilePersonalInfo,
    bodyAnalysis,
    workoutPreferences: profileWorkoutPreferences,
  });
  const dashboardProfile = {
    ...profile,
    personalInfo: adaptedProfile.personalInfo,
    fitnessGoals: adaptedProfile.fitnessGoals,
    dietPreferences: adaptedProfile.dietPreferences,
  };

  const getUserStats = () => {
    return dashboardProfile?.stats;
  };

  const getUserPreferences = () => {
    return dashboardProfile?.preferences;
  };

  const getHealthMetrics = (): HealthMetrics | null => {
    const heightCm = bodyAnalysis?.height_cm;
    const weightKg = bodyAnalysis?.current_weight_kg;

    if (!heightCm || !weightKg) {
      return null;
    }

    const bmi = api.utils.calculateBMI(weightKg, heightCm);
    const bmiCategory = api.utils.getBMICategory(bmi);

    return {
      bmi: Math.round(bmi * 10) / 10,
      bmiCategory,
      weight: weightKg,
      height: heightCm,
    };
  };

  const getDailyCalorieNeeds = () => {
    if (!adaptedProfile.personalInfo) {
      return null;
    }

    const heightCm = bodyAnalysis?.height_cm;
    const weightKg = bodyAnalysis?.current_weight_kg;
    const age = adaptedProfile.personalInfo.age;
    const gender = adaptedProfile.personalInfo.gender;
    const activityLevelValue =
      profileWorkoutPreferences?.activity_level ||
      adaptedProfile.personalInfo.activityLevel;

    if (!heightCm || !weightKg || !age || !gender || !activityLevelValue) {
      return null;
    }

    const ageNum = typeof age === "number" ? age : parseInt(String(age));

    if (isNaN(heightCm) || isNaN(weightKg) || isNaN(ageNum)) {
      return null;
    }

    return api.utils.calculateDailyCalories(
      weightKg,
      heightCm,
      ageNum,
      gender as "male" | "female",
      activityLevelValue as any,
    );
  };

  return {
    getUserStats,
    getUserPreferences,
    getHealthMetrics,
    getDailyCalorieNeeds,
    isOnline,
    isAuthenticated: !!authUser,
    profile: dashboardProfile,
  };
};
