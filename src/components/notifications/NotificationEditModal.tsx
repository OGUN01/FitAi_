/**
 * NotificationEditModal - Aurora 'Editorial Dark' edit surface for
 * workout/meal/sleep reminder settings. Built on SettingsModalWrapper +
 * GlassFormInput/GlassFormSwitch, matching PersonalInfoEditModal and the
 * other profile edit modals. Time fields use TimeFieldPicker (tap-to-pick)
 * instead of free-text "HH:MM" input, and numeric fields validate inline as
 * the user types instead of only on Save.
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

import { SettingsModalWrapper } from "../../screens/main/profile/components/SettingsModalWrapper";
import { GlassFormInput } from "../../screens/main/profile/components/GlassFormInput";
import { GlassFormSwitch } from "../../screens/main/profile/components/GlassFormSwitch";
import { TimeFieldPicker } from "./TimeFieldPicker";
import { colors, surface, border, spacing, typography } from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

const { variants } = typography;

// Simple Expo Go detection
const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient" ||
  (__DEV__ && !Constants.isDevice && !(Constants.platform?.web as { uri?: string } | undefined));

// Load notification stores safely
let useWorkoutReminders: any = null;
let useMealReminders: any = null;
let useSleepReminders: any = null;

if (!isExpoGo) {
  try {
    const notificationStore = require("../../stores/notificationStore");
    useWorkoutReminders = notificationStore.useWorkoutReminders;
    useMealReminders = notificationStore.useMealReminders;
    useSleepReminders = notificationStore.useSleepReminders;
  } catch (error) {
    console.warn("Failed to load notification stores:", error);
  }
}

interface NotificationEditModalProps {
  visible: boolean;
  type: "workout" | "meals" | "sleep" | null;
  title: string;
  onClose: () => void;
}

const validateMinutes = (
  text: string,
  min: number,
  max: number,
): string | undefined => {
  const minutes = parseInt(text, 10);
  if (text.trim() === "" || Number.isNaN(minutes)) return "Enter a number";
  if (minutes < min || minutes > max) return `Must be between ${min} and ${max}`;
  return undefined;
};

export const NotificationEditModal: React.FC<NotificationEditModalProps> = ({
  visible,
  type,
  title,
  onClose,
}) => {
  // Return null if running in Expo Go or hooks not available
  if (
    isExpoGo ||
    !useWorkoutReminders ||
    !useMealReminders ||
    !useSleepReminders
  ) {
    return null;
  }

  const workoutReminders = useWorkoutReminders();
  const mealReminders = useMealReminders();
  const sleepReminders = useSleepReminders();

  // Workout state
  const [workoutReminderMinutes, setWorkoutReminderMinutes] = useState("30");
  const [workoutError, setWorkoutError] = useState<string | undefined>();

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
  const [sleepError, setSleepError] = useState<string | undefined>();

  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible && type) {
      switch (type) {
        case "workout":
          setWorkoutReminderMinutes(
            workoutReminders.config.reminderMinutes.toString(),
          );
          setWorkoutError(undefined);
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
          setSleepError(undefined);
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, type]);

  const handleWorkoutMinutesChange = (text: string) => {
    setWorkoutReminderMinutes(text);
    setWorkoutError(validateMinutes(text, 5, 120));
  };

  const handleSleepMinutesChange = (text: string) => {
    setSleepReminderMinutes(text);
    setSleepError(validateMinutes(text, 5, 60));
  };

  const handleSave = async () => {
    setIsSaving(true);

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
      crossPlatformAlert("Error", "Failed to save settings. Please try again.");
      setIsSaving(false);
    }
  };

  const saveWorkoutSettings = async () => {
    const error = validateMinutes(workoutReminderMinutes, 5, 120);
    if (error) {
      setWorkoutError(error);
      setIsSaving(false);
      return;
    }
    const minutes = parseInt(workoutReminderMinutes, 10);

    await workoutReminders.updateConfig({ reminderMinutes: minutes });

    setIsSaving(false);
    crossPlatformAlert(
      "Workout Reminders Updated!",
      `You'll be reminded ${minutes} minutes before your scheduled workouts.`,
      [{ text: "OK", onPress: onClose }],
    );
  };

  const saveMealSettings = async () => {
    await mealReminders.updateConfig({
      breakfast: { enabled: breakfastEnabled, time: breakfastTime },
      lunch: { enabled: lunchEnabled, time: lunchTime },
      dinner: { enabled: dinnerEnabled, time: dinnerTime },
    });

    const enabledCount = [breakfastEnabled, lunchEnabled, dinnerEnabled].filter(
      Boolean,
    ).length;

    setIsSaving(false);
    crossPlatformAlert(
      "Meal Reminders Updated!",
      `${enabledCount} meal reminder${enabledCount !== 1 ? "s" : ""} ${enabledCount > 0 ? "enabled" : "disabled"}.`,
      [{ text: "OK", onPress: onClose }],
    );
  };

  const saveSleepSettings = async () => {
    const error = validateMinutes(sleepReminderMinutes, 5, 60);
    if (error) {
      setSleepError(error);
      setIsSaving(false);
      return;
    }
    const minutes = parseInt(sleepReminderMinutes, 10);

    await sleepReminders.updateConfig({ bedtime, reminderMinutes: minutes });

    setIsSaving(false);
    crossPlatformAlert(
      "Sleep Reminders Updated!",
      `You'll be reminded ${minutes} minutes before your ${bedtime} bedtime.`,
      [{ text: "OK", onPress: onClose }],
    );
  };

  if (!type) return null;

  const icon =
    type === "workout" ? "barbell-outline" : type === "meals" ? "restaurant-outline" : "moon-outline";
  const iconColor =
    type === "workout" ? colors.error.DEFAULT : type === "meals" ? colors.success.DEFAULT : colors.primary.DEFAULT;
  const saveDisabled =
    (type === "workout" && !!workoutError) || (type === "sleep" && !!sleepError);

  return (
    <SettingsModalWrapper
      visible={visible}
      title={title}
      icon={icon}
      iconColor={iconColor}
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={saveDisabled}
      saveLabel="Save Settings"
    >
      {type === "workout" && (
        <>
          <Text style={styles.sectionDescription}>
            How many minutes before your scheduled workout should you be reminded?
          </Text>
          <GlassFormInput
            label="Minutes Before Workout"
            icon="timer-outline"
            iconColor={colors.error.DEFAULT}
            value={workoutReminderMinutes}
            onChangeText={handleWorkoutMinutesChange}
            placeholder="30"
            keyboardType="number-pad"
            error={workoutError}
          />
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={rf(14)} color={colors.text.secondary} />
            <Text style={styles.infoText}>
              Workout times are automatically detected from your AI-generated fitness
              plans. You can also manually set custom workout times in the fitness
              section.
            </Text>
          </View>
        </>
      )}

      {type === "meals" && (
        <>
          <Text style={styles.sectionDescription}>
            Customize when you want to be reminded for each meal.
          </Text>

          <GlassFormSwitch
            label="Breakfast"
            icon="cafe-outline"
            iconColor={colors.warning.DEFAULT}
            value={breakfastEnabled}
            onValueChange={setBreakfastEnabled}
          />
          {breakfastEnabled && (
            <TimeFieldPicker
              label="Breakfast Time"
              value={breakfastTime}
              onChange={setBreakfastTime}
              icon="cafe-outline"
              iconColor={colors.warning.DEFAULT}
            />
          )}

          <GlassFormSwitch
            label="Lunch"
            icon="fast-food-outline"
            iconColor={colors.success.DEFAULT}
            value={lunchEnabled}
            onValueChange={setLunchEnabled}
          />
          {lunchEnabled && (
            <TimeFieldPicker
              label="Lunch Time"
              value={lunchTime}
              onChange={setLunchTime}
              icon="fast-food-outline"
              iconColor={colors.success.DEFAULT}
            />
          )}

          <GlassFormSwitch
            label="Dinner"
            icon="restaurant-outline"
            iconColor={colors.info.DEFAULT}
            value={dinnerEnabled}
            onValueChange={setDinnerEnabled}
          />
          {dinnerEnabled && (
            <TimeFieldPicker
              label="Dinner Time"
              value={dinnerTime}
              onChange={setDinnerTime}
              icon="restaurant-outline"
              iconColor={colors.info.DEFAULT}
            />
          )}
        </>
      )}

      {type === "sleep" && (
        <>
          <Text style={styles.sectionDescription}>
            Set your bedtime and when to be reminded to start winding down.
          </Text>

          <TimeFieldPicker
            label="Bedtime"
            value={bedtime}
            onChange={setBedtime}
            icon="moon-outline"
            iconColor={colors.primary.DEFAULT}
          />

          <GlassFormInput
            label="Wind Down Reminder (minutes before)"
            icon="timer-outline"
            iconColor={colors.primary.DEFAULT}
            value={sleepReminderMinutes}
            onChangeText={handleSleepMinutesChange}
            placeholder="30"
            keyboardType="number-pad"
            error={sleepError}
          />

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={rf(14)} color={colors.text.secondary} />
            <Text style={styles.infoText}>
              You'll receive two notifications: one to start winding down, and another
              at bedtime. Quality sleep is essential for recovery and performance.
            </Text>
          </View>
        </>
      )}
    </SettingsModalWrapper>
  );
};

const styles = StyleSheet.create({
  sectionDescription: {
    ...variants.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: rf(18),
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: surface[1],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  infoText: {
    ...variants.caption,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: rf(17),
  },
});

export default NotificationEditModal;
