import { useState, useEffect, useRef } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import Constants from "expo-constants";
import { useHydrationStore, useNutritionStore } from "../stores";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { useNutritionData } from "./useNutritionData";
import { supabase } from "../services/supabase";

const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient" ||
  (__DEV__ && !Constants.isDevice && !Constants.platform?.web);

let useWaterRemindersHook: any = null;
if (!isExpoGo) {
  try {
    const notificationStore = require("../stores/notificationStore");
    useWaterRemindersHook = notificationStore.useWaterReminders;
  } catch (error) {
    console.warn("Failed to load water reminders:", error);
  }
}

export const useNutritionTracking = (navigation: any) => {
  const [showWaterIntakeModal, setShowWaterIntakeModal] = useState(false);
  const addWaterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    waterIntakeML,
    dailyGoalML: waterGoalML,
    addWater: hydrationAddWater,
    setDailyGoal: setHydrationGoal,
    checkAndResetIfNewDay,
  } = useHydrationStore();

  const { getTodaysConsumedNutrition } = useNutritionStore();

  const waterReminders = useWaterRemindersHook ? useWaterRemindersHook() : null;

  const {
    metrics: calculatedMetrics,
    isLoading: metricsLoading,
    hasCalculatedMetrics,
    getWaterGoalLiters,
    getCalorieTarget,
    getMacroTargets,
  } = useCalculatedMetrics();

  const nutritionData = useNutritionData();

  useEffect(() => {
    if (calculatedMetrics?.dailyWaterML) {
      // SSOT: this is the authoritative setter for hydration goal from calculatedMetrics
      setHydrationGoal(calculatedMetrics.dailyWaterML);
    }
    checkAndResetIfNewDay();
  }, [
    calculatedMetrics?.dailyWaterML,
    setHydrationGoal,
    checkAndResetIfNewDay,
  ]);

  useEffect(() => {
    return () => {
      if (addWaterTimeoutRef.current) clearTimeout(addWaterTimeoutRef.current);
    };
  }, []);

  const waterConsumedLiters = waterIntakeML / 1000;
  const DEFAULT_WATER_GOAL_ML = 2500; // 2.5L default when no profile metrics available
  const waterGoalLiters = (waterGoalML ?? DEFAULT_WATER_GOAL_ML) / 1000;

  const handleAddWater = () => {
    const incrementAmountML = 250;

    if (waterGoalML && waterIntakeML >= waterGoalML) {
      crossPlatformAlert(
        "Daily Goal Achieved!",
        `You've already reached your daily water goal of ${waterGoalLiters?.toFixed(1)}L! Great job staying hydrated!`,
        [{ text: "Awesome!" }],
      );
      return;
    }

    const previousIntake = waterIntakeML;
    hydrationAddWater(incrementAmountML);

    if (
      waterGoalML &&
      previousIntake + incrementAmountML >= waterGoalML &&
      previousIntake < waterGoalML
    ) {
      if (addWaterTimeoutRef.current) clearTimeout(addWaterTimeoutRef.current);
      addWaterTimeoutRef.current = setTimeout(() => {
        crossPlatformAlert(
          "Hydration Goal Achieved!",
          `Congratulations! You've reached your daily water goal of ${waterGoalLiters?.toFixed(1)}L!`,
          [
            { text: "Keep it up!", style: "default" },
            {
              text: "Adjust Goal",
              onPress: () => {
                if (navigation) {
                  navigation.navigate("Settings", { screen: "Notifications" });
                } else {
                  crossPlatformAlert(
                    "Water Settings",
                    "Navigate to Settings > Notifications to adjust your water goal and reminder schedule.",
                  );
                }
              },
            },
          ],
        );
      }, 500);
    } else if (waterGoalML) {
      const remainingL = Math.max(
        (waterGoalML - (previousIntake + incrementAmountML)) / 1000,
        0,
      );
      crossPlatformAlert(
        "Water Added!",
        `Great job! ${remainingL.toFixed(1)}L more to reach your goal.`,
      );
    }
  };

  const handleRemoveWater = async () => {
    if (waterIntakeML > 0) {
      const decrementAmountML = 250;
      const newAmount = Math.max(0, waterIntakeML - decrementAmountML);
      useHydrationStore.getState().setWaterIntake(newAmount);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const today = new Date().toISOString().split('T')[0];
          const { data: logs } = await supabase
            .from('water_logs')
            .select('id')
            .eq('user_id', session.user.id)
            .gte('logged_at', today)
            .order('logged_at', { ascending: false })
            .limit(1);
          if (logs && logs.length > 0) {
            await supabase.from('water_logs').delete().eq('id', logs[0].id);
          }
        }
      } catch (error) {
        console.error('[handleRemoveWater] Failed to remove water log:', error);
      }
    }
  };

  const handleLogWater = () => {
    setShowWaterIntakeModal(true);
  };

  return {
    waterIntakeML,
    waterGoalML,
    waterConsumedLiters,
    waterGoalLiters,
    hydrationAddWater,
    setHydrationGoal,
    waterReminders,

    calculatedMetrics,
    metricsLoading,
    hasCalculatedMetrics,
    getWaterGoalLiters,
    getCalorieTarget,
    getMacroTargets,

    getTodaysConsumedNutrition,

    ...nutritionData,

    showWaterIntakeModal,
    setShowWaterIntakeModal,
    handleAddWater,
    handleRemoveWater,
    handleLogWater,
  };
};
