import { useState, useEffect } from "react";
import { Alert } from "react-native";
import Constants from "expo-constants";
import { useHydrationStore, useNutritionStore } from "../stores";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { useNutritionData } from "./useNutritionData";

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
      setHydrationGoal(calculatedMetrics.dailyWaterML);
    }
    checkAndResetIfNewDay();
  }, [calculatedMetrics?.dailyWaterML]);

  const waterConsumedLiters = waterIntakeML / 1000;
  const waterGoalLiters = waterGoalML ? waterGoalML / 1000 : null;

  const handleAddWater = () => {
    const incrementAmountML = 250;

    if (waterGoalML && waterIntakeML >= waterGoalML) {
      Alert.alert(
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
      setTimeout(() => {
        Alert.alert(
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
                  Alert.alert(
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
      Alert.alert(
        "Water Added!",
        `Great job! ${remainingL.toFixed(1)}L more to reach your goal.`,
      );
    }
  };

  const handleRemoveWater = () => {
    if (waterIntakeML > 0) {
      const decrementAmountML = 250;
      const newAmount = Math.max(0, waterIntakeML - decrementAmountML);
      useHydrationStore.getState().setWaterIntake(newAmount);
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
