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

// Load water reminders safely
let useWaterReminders: any = null;

if (!isExpoGo) {
  try {
    const notificationStore = require("../../stores/notificationStore");
    useWaterReminders = notificationStore.useWaterReminders;
  } catch (error) {
    console.warn("Failed to load water reminders:", error);
  }
}

interface WaterReminderEditModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WaterReminderEditModal: React.FC<WaterReminderEditModalProps> = ({
  visible,
  onClose,
}) => {
  // Return null if running in Expo Go
  if (isExpoGo || !useWaterReminders) {
    return null;
  }

  const waterReminders = useWaterReminders();
  const [dailyGoal, setDailyGoal] = useState(
    waterReminders.config.dailyGoalLiters.toString(),
  );
  const [wakeUpTime, setWakeUpTime] = useState(
    waterReminders.config.wakeUpTime,
  );
  const [sleepTime, setSleepTime] = useState(waterReminders.config.sleepTime);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setDailyGoal(waterReminders.config.dailyGoalLiters.toString());
      setWakeUpTime(waterReminders.config.wakeUpTime);
      setSleepTime(waterReminders.config.sleepTime);
    }
  }, [visible, waterReminders.config]);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const goalLiters = parseFloat(dailyGoal);

      // Validation
      if (isNaN(goalLiters) || goalLiters < 1 || goalLiters > 10) {
        Alert.alert(
          "Invalid Goal",
          "Please enter a daily water goal between 1 and 10 liters.",
        );
        setIsLoading(false);
        return;
      }

      if (!isValidTimeFormat(wakeUpTime) || !isValidTimeFormat(sleepTime)) {
        Alert.alert(
          "Invalid Time",
          "Please enter times in HH:MM format (e.g., 07:30).",
        );
        setIsLoading(false);
        return;
      }

      // Check if wake time is before sleep time (basic validation)
      const wakeMinutes = timeToMinutes(wakeUpTime);
      const sleepMinutes = timeToMinutes(sleepTime);

      if (wakeMinutes >= sleepMinutes && sleepMinutes !== 0) {
        Alert.alert(
          "Time Conflict",
          "Wake up time should be before sleep time. Are you sure about these times?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save Anyway", onPress: () => saveTimes() },
          ],
        );
        setIsLoading(false);
        return;
      }

      await saveTimes();
    } catch (error) {
      console.error("Error saving water reminder settings:", error);
      Alert.alert(
        "Error",
        "Failed to save water reminder settings. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const saveTimes = async () => {
    await waterReminders.updateConfig({
      dailyGoalLiters: parseFloat(dailyGoal),
      wakeUpTime,
      sleepTime,
    });

    setIsLoading(false);
    Alert.alert(
      "Settings Saved!",
      "Your water reminder settings have been updated. Smart notifications will be rescheduled accordingly.",
      [{ text: "OK", onPress: onClose }],
    );
  };

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
          <Text style={styles.title}>Water Reminders</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Daily Goal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Water Goal</Text>
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.inputLabel}>Goal (Liters)</Text>
                <TextInput
                  style={styles.textInput}
                  value={dailyGoal}
                  onChangeText={setDailyGoal}
                  placeholder="4.0"
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
              <View style={styles.presetButtons}>
                {[2, 3, 4, 5].map((liters) => (
                  <TouchableOpacity
                    key={liters}
                    style={[
                      styles.presetButton,
                      dailyGoal === liters.toString() &&
                        styles.presetButtonActive,
                    ]}
                    onPress={() => setDailyGoal(liters.toString())}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        dailyGoal === liters.toString() &&
                          styles.presetButtonTextActive,
                      ]}
                    >
                      {liters}L
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </View>

          {/* Awake Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Awake Hours</Text>
            <Text style={styles.sectionDescription}>
              Set your typical wake up and sleep times for smart water reminder
              scheduling.
            </Text>

            {/* Wake Up Time */}
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.inputLabel}>Wake Up Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={wakeUpTime}
                  onChangeText={setWakeUpTime}
                  placeholder="07:00"
                  keyboardType={
                    Platform.OS === "ios"
                      ? "numbers-and-punctuation"
                      : "default"
                  }
                />
              </View>
              <View style={styles.presetButtons}>
                {["early", "normal", "late"].map((preset) => {
                  const time = getPresetTime("morning", preset as any);
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetButton,
                        wakeUpTime === time && styles.presetButtonActive,
                      ]}
                      onPress={() => setWakeUpTime(time)}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          wakeUpTime === time && styles.presetButtonTextActive,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Sleep Time */}
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.inputLabel}>Sleep Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={sleepTime}
                  onChangeText={setSleepTime}
                  placeholder="23:00"
                  keyboardType={
                    Platform.OS === "ios"
                      ? "numbers-and-punctuation"
                      : "default"
                  }
                />
              </View>
              <View style={styles.presetButtons}>
                {["early", "normal", "late"].map((preset) => {
                  const time = getPresetTime("evening", preset as any);
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetButton,
                        sleepTime === time && styles.presetButtonActive,
                      ]}
                      onPress={() => setSleepTime(time)}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          sleepTime === time && styles.presetButtonTextActive,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          </View>

          {/* Smart Schedule Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Schedule Preview</Text>
            <Card style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Awake Hours:</Text>
                <Text style={styles.previewValue}>
                  {calculateAwakeHours()}h
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Daily Goal:</Text>
                <Text style={styles.previewValue}>{dailyGoal}L</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Reminder Frequency:</Text>
                <Text style={styles.previewValue}>
                  {calculateReminderFrequency()}
                </Text>
              </View>
              <Text style={styles.previewNote}>
                💡 Reminders are distributed intelligently: more frequent in
                morning/afternoon, less in evening.
              </Text>
            </Card>
          </View>

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

  previewCard: {
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  previewLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  previewValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  previewNote: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.sm,
    fontStyle: "italic",
    lineHeight: 16,
  },

  buttonContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.lg,
  },

  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },
});

export default WaterReminderEditModal;
