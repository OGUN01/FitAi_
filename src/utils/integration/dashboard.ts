import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { useOffline } from "../../hooks/useOffline";
import { api } from "../../services/api";
import { HealthMetrics } from "./types";

export const useDashboardIntegration = () => {
  const { user: authUser } = useAuth();
  const { profile } = useUser();
  const { isOnline } = useOffline();

  const getUserStats = () => {
    return profile?.stats;
  };

  const getUserPreferences = () => {
    return profile?.preferences;
  };

  const getHealthMetrics = (): HealthMetrics | null => {
    const heightCm = profile?.bodyMetrics?.height_cm;
    const weightKg = profile?.bodyMetrics?.current_weight_kg;

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
    if (!profile?.personalInfo) {
      return null;
    }

    const heightCm = profile?.bodyMetrics?.height_cm;
    const weightKg = profile?.bodyMetrics?.current_weight_kg;
    const age = profile.personalInfo?.age;
    const gender = profile.personalInfo?.gender;
    const activityLevelValue = (profile.personalInfo as any)?.activityLevel;

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
    profile,
  };
};
