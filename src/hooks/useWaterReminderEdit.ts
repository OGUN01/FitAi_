import { logger } from '../utils/logger';
import { useState, useEffect } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";

interface WaterReminderConfig {
  dailyGoalLiters: number;
  wakeUpTime: string;
  sleepTime: string;
}

interface WaterReminders {
  config: WaterReminderConfig;
  updateConfig: (config: Partial<WaterReminderConfig>) => Promise<void>;
}

export const useWaterReminderEdit = (
  waterReminders: WaterReminders,
  visible: boolean,
  onClose: () => void,
) => {
  const [dailyGoal, setDailyGoal] = useState(
    waterReminders.config.dailyGoalLiters.toString(),
  );
  const [wakeUpTime, setWakeUpTime] = useState(
    waterReminders.config.wakeUpTime,
  );
  const [sleepTime, setSleepTime] = useState(waterReminders.config.sleepTime);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens — use granular config fields to avoid resetting on unrelated config changes
  const { dailyGoalLiters, wakeUpTime: configWakeUpTime, sleepTime: configSleepTime } = waterReminders.config ?? {};
  useEffect(() => {
    if (visible) {
      setDailyGoal(dailyGoalLiters?.toString() ?? "");
      setWakeUpTime(configWakeUpTime ?? "");
      setSleepTime(configSleepTime ?? "");
    }
  }, [visible, dailyGoalLiters, configWakeUpTime, configSleepTime]);

  const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const calculateAwakeHours = (): number => {
    const wakeMinutes = timeToMinutes(wakeUpTime);
    const sleepMinutes = timeToMinutes(sleepTime);
    const awakeMinutes =
      sleepMinutes > wakeMinutes
        ? sleepMinutes - wakeMinutes
        : 24 * 60 - wakeMinutes + sleepMinutes;
    return Math.floor(awakeMinutes / 60);
  };

  const calculateReminderFrequency = (): string => {
    const awakeHours = calculateAwakeHours();
    const goalLiters = parseFloat(dailyGoal);

    if (isNaN(goalLiters) || awakeHours <= 0) return "N/A";

    const avgInterval = awakeHours / Math.ceil(goalLiters * 4); // Assuming 4 reminders per liter

    if (avgInterval < 1) return "Every 30-60 min";
    if (avgInterval < 2) return "Every 1-2 hours";
    return `Every ${Math.round(avgInterval)} hours`;
  };

  const saveTimes = async () => {
    await waterReminders.updateConfig({
      dailyGoalLiters: parseFloat(dailyGoal),
      wakeUpTime,
      sleepTime,
    });

    crossPlatformAlert(
      "Settings Saved!",
      "Your water reminder settings have been updated. Smart notifications will be rescheduled accordingly.",
      [{ text: "OK", onPress: onClose }],
    );
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const goalLiters = parseFloat(dailyGoal);

      // Validation
      if (isNaN(goalLiters) || goalLiters < 1 || goalLiters > 10) {
        crossPlatformAlert(
          "Invalid Goal",
          "Please enter a daily water goal between 1 and 10 liters.",
        );
        return;
      }

      if (!isValidTimeFormat(wakeUpTime) || !isValidTimeFormat(sleepTime)) {
        crossPlatformAlert(
          "Invalid Time",
          "Please enter times in HH:MM format (e.g., 07:30).",
        );
        return;
      }

      // Check if wake time is before sleep time (basic validation)
      const wakeMinutes = timeToMinutes(wakeUpTime);
      const sleepMinutes = timeToMinutes(sleepTime);

      if (wakeMinutes >= sleepMinutes && sleepMinutes !== 0) {
        crossPlatformAlert(
          "Time Conflict",
          "Wake up time should be before sleep time. Are you sure about these times?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save Anyway", onPress: () => saveTimes() },
          ],
        );
        return;
      }

      await saveTimes();
    } catch (error) {
      logger.error('Error saving water reminder settings', { error: String(error) });
      crossPlatformAlert(
        "Error",
        "Failed to save water reminder settings. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPresetTime = (
    type: "morning" | "evening",
    preset: "early" | "normal" | "late",
  ) => {
    if (type === "morning") {
      switch (preset) {
        case "early":
          return "06:00";
        case "normal":
          return "07:30";
        case "late":
          return "09:00";
      }
    } else {
      switch (preset) {
        case "early":
          return "21:30";
        case "normal":
          return "23:00";
        case "late":
          return "00:30";
      }
    }
  };

  return {
    dailyGoal,
    setDailyGoal,
    wakeUpTime,
    setWakeUpTime,
    sleepTime,
    setSleepTime,
    isLoading,
    handleSave,
    calculateAwakeHours,
    calculateReminderFrequency,
    getPresetTime,
  };
};
