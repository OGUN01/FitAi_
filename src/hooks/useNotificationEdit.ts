import { useState, useEffect } from "react";
import { Alert } from "react-native";

interface NotificationStores {
  workoutReminders: any;
  mealReminders: any;
  sleepReminders: any;
}

interface WorkoutState {
  reminderMinutes: string;
}

interface MealState {
  breakfastEnabled: boolean;
  breakfastTime: string;
  lunchEnabled: boolean;
  lunchTime: string;
  dinnerEnabled: boolean;
  dinnerTime: string;
}

interface SleepState {
  bedtime: string;
  reminderMinutes: string;
}

export type NotificationType = "workout" | "meals" | "sleep";

export const useNotificationEdit = (
  type: NotificationType | null,
  visible: boolean,
  stores: NotificationStores,
  onClose: () => void,
) => {
  const { workoutReminders, mealReminders, sleepReminders } = stores;

  // Workout state
  const [workoutReminderMinutes, setWorkoutReminderMinutes] = useState("30");

  // Meal state
  const [breakfastEnabled, setBreakfastEnabled] = useState(true);
  const [breakfastTime, setBreakfastTime] = useState("08:00");
  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [lunchTime, setLunchTime] = useState("13:00");
  const [dinnerEnabled, setDinnerEnabled] = useState(true);
  const [dinnerTime, setDinnerTime] = useState("19:00");

  // Sleep state
  const [bedtime, setBedtime] = useState("22:30");
  const [sleepReminderMinutes, setSleepReminderMinutes] = useState("30");

  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible && type) {
      switch (type) {
        case "workout":
          setWorkoutReminderMinutes(
            workoutReminders.config.reminderMinutes.toString(),
          );
          break;
        case "meals":
          setBreakfastEnabled(mealReminders.config.breakfast.enabled);
          setBreakfastTime(mealReminders.config.breakfast.time);
          setLunchEnabled(mealReminders.config.lunch.enabled);
          setLunchTime(mealReminders.config.lunch.time);
          setDinnerEnabled(mealReminders.config.dinner.enabled);
          setDinnerTime(mealReminders.config.dinner.time);
          break;
        case "sleep":
          setBedtime(sleepReminders.config.bedtime);
          setSleepReminderMinutes(
            sleepReminders.config.reminderMinutes.toString(),
          );
          break;
      }
    }
  }, [
    visible,
    type,
    workoutReminders.config,
    mealReminders.config,
    sleepReminders.config,
  ]);

  const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const saveWorkoutSettings = async () => {
    const minutes = parseInt(workoutReminderMinutes);

    if (isNaN(minutes) || minutes < 5 || minutes > 120) {
      Alert.alert(
        "Invalid Time",
        "Please enter a reminder time between 5 and 120 minutes.",
      );
      setIsLoading(false);
      return;
    }

    await workoutReminders.updateConfig({
      reminderMinutes: minutes,
    });

    setIsLoading(false);
    Alert.alert(
      "Workout Reminders Updated!",
      `You'll be reminded ${minutes} minutes before your scheduled workouts.`,
      [{ text: "OK", onPress: onClose }],
    );
  };

  const saveMealSettings = async () => {
    // Validate time formats
    const times = [breakfastTime, lunchTime, dinnerTime];
    for (const time of times) {
      if (!isValidTimeFormat(time)) {
        Alert.alert(
          "Invalid Time",
          "Please enter times in HH:MM format (e.g., 08:30).",
        );
        setIsLoading(false);
        return;
      }
    }

    await mealReminders.updateConfig({
      breakfast: { enabled: breakfastEnabled, time: breakfastTime },
      lunch: { enabled: lunchEnabled, time: lunchTime },
      dinner: { enabled: dinnerEnabled, time: dinnerTime },
    });

    const enabledCount = [breakfastEnabled, lunchEnabled, dinnerEnabled].filter(
      Boolean,
    ).length;

    setIsLoading(false);
    Alert.alert(
      "Meal Reminders Updated!",
      `${enabledCount} meal reminder${enabledCount !== 1 ? "s" : ""} ${enabledCount > 0 ? "enabled" : "disabled"}.`,
      [{ text: "OK", onPress: onClose }],
    );
  };

  const saveSleepSettings = async () => {
    const minutes = parseInt(sleepReminderMinutes);

    if (isNaN(minutes) || minutes < 5 || minutes > 60) {
      Alert.alert(
        "Invalid Time",
        "Please enter a reminder time between 5 and 60 minutes.",
      );
      setIsLoading(false);
      return;
    }

    if (!isValidTimeFormat(bedtime)) {
      Alert.alert(
        "Invalid Time",
        "Please enter bedtime in HH:MM format (e.g., 22:30).",
      );
      setIsLoading(false);
      return;
    }

    await sleepReminders.updateConfig({
      bedtime,
      reminderMinutes: minutes,
    });

    setIsLoading(false);
    Alert.alert(
      "Sleep Reminders Updated!",
      `You'll be reminded ${minutes} minutes before your ${bedtime} bedtime.`,
      [{ text: "OK", onPress: onClose }],
    );
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      switch (type) {
        case "workout":
          await saveWorkoutSettings();
          break;
        case "meals":
          await saveMealSettings();
          break;
        case "sleep":
          await saveSleepSettings();
          break;
      }
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
      setIsLoading(false);
    }
  };

  return {
    // Workout state
    workoutState: {
      reminderMinutes: workoutReminderMinutes,
      setReminderMinutes: setWorkoutReminderMinutes,
    },
    // Meal state
    mealState: {
      breakfastEnabled,
      setBreakfastEnabled,
      breakfastTime,
      setBreakfastTime,
      lunchEnabled,
      setLunchEnabled,
      lunchTime,
      setLunchTime,
      dinnerEnabled,
      setDinnerEnabled,
      dinnerTime,
      setDinnerTime,
    },
    // Sleep state
    sleepState: {
      bedtime,
      setBedtime,
      reminderMinutes: sleepReminderMinutes,
      setReminderMinutes: setSleepReminderMinutes,
    },
    // Actions
    isLoading,
    handleSave,
  };
};
