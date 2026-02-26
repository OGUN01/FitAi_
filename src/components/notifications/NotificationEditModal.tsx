import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { Card, Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import Constants from "expo-constants";

// Simple Expo Go detection
const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient" ||
  (__DEV__ && !Constants.isDevice && !(Constants.platform?.web as any));

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

  const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const getPresetTime = (
    mealType: "breakfast" | "lunch" | "dinner",
    variant: "early" | "normal" | "late",
  ) => {
    const presets = {
      breakfast: { early: "07:00", normal: "08:00", late: "09:30" },
      lunch: { early: "12:00", normal: "13:00", late: "14:00" },
      dinner: { early: "18:00", normal: "19:00", late: "20:30" },
    };
    return presets[mealType][variant];
  };

  const renderWorkoutSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Workout Reminder Time</Text>
      <Text style={styles.sectionDescription}>
        How many minutes before your scheduled workout should you be reminded?
      </Text>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>Minutes Before Workout</Text>
          <TextInput
            style={styles.textInput}
            value={workoutReminderMinutes}
            onChangeText={setWorkoutReminderMinutes}
            placeholder="30"
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>

        <View style={styles.presetButtons}>
          {[15, 30, 45, 60].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.presetButton,
                workoutReminderMinutes === minutes.toString() &&
                  styles.presetButtonActive,
              ]}
              onPress={() => setWorkoutReminderMinutes(minutes.toString())}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  workoutReminderMinutes === minutes.toString() &&
                    styles.presetButtonTextActive,
                ]}
              >
                {minutes}min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoText}>
          💡 Workout times are automatically detected from your AI-generated
          fitness plans. You can also manually set custom workout times in the
          fitness section.
        </Text>
      </Card>
    </View>
  );

  const renderMealSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Meal Reminder Times</Text>
      <Text style={styles.sectionDescription}>
        Customize when you want to be reminded for each meal.
      </Text>

      {/* Breakfast */}
      <Card style={styles.card}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>🍳 Breakfast</Text>
          <Switch
            value={breakfastEnabled}
            onValueChange={setBreakfastEnabled}
            trackColor={{
              false: ResponsiveTheme.colors.border,
              true: ResponsiveTheme.colors.primary + "50",
            }}
            thumbColor={
              breakfastEnabled ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textMuted
            }
          />
        </View>

        {breakfastEnabled && (
          <>
            <View style={styles.cardContent}>
              <TextInput
                style={styles.textInput}
                value={breakfastTime}
                onChangeText={setBreakfastTime}
                placeholder="08:00"
                keyboardType={
                  Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
                }
              />
            </View>
            <View style={styles.presetButtons}>
              {["early", "normal", "late"].map((preset) => {
                const time = getPresetTime("breakfast", preset as any);
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      breakfastTime === time && styles.presetButtonActive,
                    ]}
                    onPress={() => setBreakfastTime(time)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        breakfastTime === time && styles.presetButtonTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Card>

      {/* Lunch */}
      <Card style={styles.card}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>🥙 Lunch</Text>
          <Switch
            value={lunchEnabled}
            onValueChange={setLunchEnabled}
            trackColor={{
              false: ResponsiveTheme.colors.border,
              true: ResponsiveTheme.colors.primary + "50",
            }}
            thumbColor={
              lunchEnabled ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textMuted
            }
          />
        </View>

        {lunchEnabled && (
          <>
            <View style={styles.cardContent}>
              <TextInput
                style={styles.textInput}
                value={lunchTime}
                onChangeText={setLunchTime}
                placeholder="13:00"
                keyboardType={
                  Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
                }
              />
            </View>
            <View style={styles.presetButtons}>
              {["early", "normal", "late"].map((preset) => {
                const time = getPresetTime("lunch", preset as any);
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      lunchTime === time && styles.presetButtonActive,
                    ]}
                    onPress={() => setLunchTime(time)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        lunchTime === time && styles.presetButtonTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Card>

      {/* Dinner */}
      <Card style={styles.card}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>🍽️ Dinner</Text>
          <Switch
            value={dinnerEnabled}
            onValueChange={setDinnerEnabled}
            trackColor={{
              false: ResponsiveTheme.colors.border,
              true: ResponsiveTheme.colors.primary + "50",
            }}
            thumbColor={
              dinnerEnabled ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textMuted
            }
          />
        </View>

        {dinnerEnabled && (
          <>
            <View style={styles.cardContent}>
              <TextInput
                style={styles.textInput}
                value={dinnerTime}
                onChangeText={setDinnerTime}
                placeholder="19:00"
                keyboardType={
                  Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
                }
              />
            </View>
            <View style={styles.presetButtons}>
              {["early", "normal", "late"].map((preset) => {
                const time = getPresetTime("dinner", preset as any);
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      dinnerTime === time && styles.presetButtonActive,
                    ]}
                    onPress={() => setDinnerTime(time)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        dinnerTime === time && styles.presetButtonTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Card>
    </View>
  );

  const renderSleepSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sleep Reminder Settings</Text>
      <Text style={styles.sectionDescription}>
        Set your bedtime and when to be reminded to start winding down.
      </Text>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>Bedtime</Text>
          <TextInput
            style={styles.textInput}
            value={bedtime}
            onChangeText={setBedtime}
            placeholder="22:30"
            keyboardType={
              Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
            }
          />
        </View>
        <View style={styles.presetButtons}>
          {["21:30", "22:00", "22:30", "23:00"].map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.presetButton,
                bedtime === time && styles.presetButtonActive,
              ]}
              onPress={() => setBedtime(time)}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  bedtime === time && styles.presetButtonTextActive,
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>
            Wind Down Reminder (minutes before)
          </Text>
          <TextInput
            style={styles.textInput}
            value={sleepReminderMinutes}
            onChangeText={setSleepReminderMinutes}
            placeholder="30"
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>
        <View style={styles.presetButtons}>
          {[15, 30, 45, 60].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.presetButton,
                sleepReminderMinutes === minutes.toString() &&
                  styles.presetButtonActive,
              ]}
              onPress={() => setSleepReminderMinutes(minutes.toString())}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  sleepReminderMinutes === minutes.toString() &&
                    styles.presetButtonTextActive,
                ]}
              >
                {minutes}min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoText}>
          🌙 You'll receive two notifications: one to start winding down, and
          another at bedtime. Quality sleep is essential for recovery and
          performance.
        </Text>
      </Card>
    </View>
  );

  if (!type) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {type === "workout" && renderWorkoutSettings()}
          {type === "meals" && renderMealSettings()}
          {type === "sleep" && renderSleepSettings()}

          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? "Saving..." : "Save Settings"}
              onPress={handleSave}
              variant="primary"
              size="lg"
              disabled={isLoading}
            />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  cancelButton: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  content: {
    flex: 1,
  },

  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  sectionDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: 20,
  },

  card: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  cardContent: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  mealTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  inputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  textInput: {
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: ResponsiveTheme.spacing.sm,
  },

  presetButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    alignItems: "center",
  },

  presetButtonActive: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: ResponsiveTheme.colors.primary + "20",
  },

  presetButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  presetButtonTextActive: {
    color: ResponsiveTheme.colors.primary,
  },

  infoCard: {
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  infoText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
    fontStyle: "italic",
  },

  buttonContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.lg,
  },

  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },
});

export default NotificationEditModal;
