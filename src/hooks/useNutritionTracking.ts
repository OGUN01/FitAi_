import { useState, useEffect, useRef } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import Constants from "expo-constants";
import { useHydrationStore, useNutritionStore } from "../stores";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { useNutritionData } from "./useNutritionData";
import { hydrationDataService } from "../services/hydrationData";

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
  // P1-hyd-1: ref guard so the goal-mirror effect doesn't ping-pong between
  // hydrationStore (SSOT) and notificationStore. Tracks the last liters value
  // we pushed to notificationStore so we only reschedule reminders when the
  // goal actually changes.
  const lastPushedGoalLitersRef = useRef<number | null>(null);

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
    // P1 effect-loop guard (CLAUDE.md #10): only call setHydrationGoal when
    // the calculated value actually differs from the current goal. Without
    // this, a flag flip from checkAndResetIfNewDay (or any re-render where
    // setHydrationGoal identity changes) could re-fire this effect and write
    // the same value back into the store, which (because setDailyGoal marks
    // isGoalUserSet=true) would clobber a user's explicit override and could
    // ping-pong with other readers of dailyGoalML.
    const newGoalML = calculatedMetrics?.dailyWaterML;
    if (newGoalML && newGoalML !== waterGoalML) {
      // SSOT: this is the authoritative setter for hydration goal from calculatedMetrics
      setHydrationGoal(newGoalML);
    }
    checkAndResetIfNewDay();
  }, [
    calculatedMetrics?.dailyWaterML,
    waterGoalML,
    setHydrationGoal,
    checkAndResetIfNewDay,
  ]);

  // P1-hyd-1 SSOT mirror: hydrationStore.dailyGoalML is the single source of
  // truth for the water goal. When it changes, push the equivalent liters
  // value into notificationStore so water REMINDERS (which read
  // preferences.water.dailyGoalLiters at schedule time) use the same goal as
  // the water PROGRESS RING (which reads hydrationStore.dailyGoalML).
  // Ref-guarded so we only reschedule when the rounded liters value actually
  // changes — avoids a notification-reschedule loop on every metrics recompute.
  useEffect(() => {
    if (!waterGoalML || waterGoalML <= 0) return;
    if (!waterReminders?.updateConfig) return;

    const goalLiters = Math.round((waterGoalML / 1000) * 10) / 10;
    if (lastPushedGoalLitersRef.current === goalLiters) return;
    lastPushedGoalLitersRef.current = goalLiters;

    // Only push if notificationStore's value differs, to skip a redundant
    // reschedule when they're already in sync (e.g. the user just edited via
    // the modal, which already mirrored into hydrationStore).
    if (waterReminders.config?.dailyGoalLiters === goalLiters) return;

    waterReminders
      .updateConfig({ dailyGoalLiters: goalLiters })
      .catch((err: unknown) => {
        console.error(
          "[useNutritionTracking] Failed to mirror hydration goal to notificationStore:",
          err,
        );
      });
  }, [waterGoalML, waterReminders]);

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
    if (waterIntakeML <= 0) return;

    // P1-hyd-4 FIX: Previously this subtracted a FIXED 250ml locally, THEN
    // called removeLastTodayWaterLog() and IGNORED the deletedAmountMl it
    // returned. If the last log was 500ml, local dropped by only 250 → local
    // and remote diverged by 250ml until the next full sync.
    //
    // Now we delete first to learn the REAL amount removed, then decrement
    // local by exactly that value. If nothing was deleted (deletedAmountMl
    // is 0 / undefined), local is untouched so the two stay consistent.
    try {
      const result = await hydrationDataService.removeLastTodayWaterLog();
      const deletedAmountMl = result?.deletedAmountMl ?? 0;

      if (deletedAmountMl > 0) {
        const currentML = useHydrationStore.getState().waterIntakeML;
        const newAmount = Math.max(0, currentML - deletedAmountMl);
        useHydrationStore.getState().setWaterIntake(newAmount);
      } else if (!result?.success) {
        // Nothing deleted AND the call failed — surface the error so it
        // isn't a silent failure (CLAUDE.md #5). Local stays at its current
        // value so we don't diverge from a remote we couldn't read.
        console.error(
          '[handleRemoveWater] removeLastTodayWaterLog failed:',
          result?.error ?? 'unknown error',
        );
      }
    } catch (error) {
      console.error('[handleRemoveWater] Failed to remove water log:', error);
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
