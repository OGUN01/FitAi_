/**
 * WaterReminderEditModal - Aurora 'Editorial Dark' edit surface for water
 * reminder settings. Built on the same SettingsModalWrapper + GlassFormInput
 * system as the profile edit modals (PersonalInfoEditModal etc.) instead of
 * a plain pageSheet Modal with raw primitives, so it feels like the rest of
 * the app. Wake/sleep times use TimeFieldPicker (tap-to-pick) instead of
 * free-text "HH:MM" fields, so an invalid time can't be typed.
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

import { SettingsModalWrapper } from "../../screens/main/profile/components/SettingsModalWrapper";
import { GlassFormInput } from "../../screens/main/profile/components/GlassFormInput";
import { TimeFieldPicker } from "./TimeFieldPicker";
import { calculateWaterIntervals } from "../../services/notificationService";
import { colors, surface, border, spacing, typography } from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

const { variants } = typography;

// Simple Expo Go detection
const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient" ||
  (__DEV__ && !Constants.isDevice && !(Constants.platform?.web as { uri?: string } | undefined));

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

const GOAL_PRESETS = [2, 3, 4, 5];

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
  const [wakeUpTime, setWakeUpTime] = useState(waterReminders.config.wakeUpTime);
  const [sleepTime, setSleepTime] = useState(waterReminders.config.sleepTime);
  const [goalError, setGoalError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setDailyGoal(waterReminders.config.dailyGoalLiters.toString());
      setWakeUpTime(waterReminders.config.wakeUpTime);
      setSleepTime(waterReminders.config.sleepTime);
      setGoalError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleGoalChange = (text: string) => {
    setDailyGoal(text);
    const goal = parseFloat(text);
    if (text.trim() === "" || Number.isNaN(goal)) {
      setGoalError("Enter a number");
    } else if (goal < 1 || goal > 10) {
      setGoalError("Must be between 1 and 10 liters");
    } else {
      setGoalError(undefined);
    }
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

    if (isNaN(goalLiters) || goalLiters <= 0 || awakeHours <= 0) return "N/A";

    // Reuse the exact same interval calculation notificationService uses to
    // schedule reminders, so this preview always matches what actually gets
    // scheduled on Save instead of drifting from an independent heuristic.
    const intervals = calculateWaterIntervals(wakeUpTime, sleepTime, goalLiters);
    if (intervals.length === 0) return "N/A";

    const avgInterval = awakeHours / intervals.length;

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

    setIsSaving(false);
    crossPlatformAlert(
      "Settings Saved!",
      "Your water reminder settings have been updated. Smart notifications will be rescheduled accordingly.",
      [{ text: "OK", onPress: onClose }],
    );
  };

  const handleSave = async () => {
    const goalLiters = parseFloat(dailyGoal);
    if (isNaN(goalLiters) || goalLiters < 1 || goalLiters > 10) {
      setGoalError("Must be between 1 and 10 liters");
      return;
    }

    setIsSaving(true);

    try {
      const wakeMinutes = timeToMinutes(wakeUpTime);
      const sleepMinutes = timeToMinutes(sleepTime);
      // "00:00" as a sleep/bedtime means end-of-day midnight, not the very
      // start of the day — treat it as 1440 minutes so the comparison below
      // is wraparound-aware instead of special-casing (and silently
      // bypassing the conflict check for) exactly midnight.
      const sleepMinutesForCompare = sleepMinutes === 0 ? 1440 : sleepMinutes;

      if (wakeMinutes >= sleepMinutesForCompare) {
        setIsSaving(false);
        crossPlatformAlert(
          "Time Conflict",
          "Wake up time should be before sleep time. Are you sure about these times?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Save Anyway",
              onPress: () => {
                setIsSaving(true);
                saveTimes();
              },
            },
          ],
        );
        return;
      }

      await saveTimes();
    } catch (error) {
      console.error("Error saving water reminder settings:", error);
      crossPlatformAlert(
        "Error",
        "Failed to save water reminder settings. Please try again.",
      );
      setIsSaving(false);
    }
  };

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Water Reminders"
      subtitle="Daily goal & schedule"
      icon="water-outline"
      iconColor={colors.info.DEFAULT}
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!!goalError}
      saveLabel="Save Settings"
    >
      <GlassFormInput
        label="Daily Water Goal (Liters)"
        icon="water-outline"
        iconColor={colors.info.DEFAULT}
        value={dailyGoal}
        onChangeText={handleGoalChange}
        placeholder="4.0"
        keyboardType="decimal-pad"
        error={goalError}
      />

      <View style={styles.chipRow}>
        {GOAL_PRESETS.map((liters) => {
          const selected = dailyGoal === liters.toString();
          return (
            <Pressable
              key={liters}
              onPress={() => {
                haptics.light();
                handleGoalChange(liters.toString());
              }}
              accessibilityRole="button"
              accessibilityLabel={`${liters} liters`}
              accessibilityState={selected ? { selected: true } : undefined}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {liters}L
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Awake Hours</Text>
      <Text style={styles.sectionDescription}>
        Set your typical wake up and sleep times for smart water reminder scheduling.
      </Text>

      <TimeFieldPicker
        label="Wake Up Time"
        value={wakeUpTime}
        onChange={setWakeUpTime}
        icon="sunny-outline"
        iconColor={colors.warning.DEFAULT}
      />

      <TimeFieldPicker
        label="Sleep Time"
        value={sleepTime}
        onChange={setSleepTime}
        icon="moon-outline"
        iconColor={colors.primary.DEFAULT}
      />

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Ionicons name="sparkles-outline" size={rf(14)} color={colors.text.secondary} />
          <Text style={styles.previewHeaderText}>Smart Schedule Preview</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Awake Hours</Text>
          <Text style={styles.previewValue}>{calculateAwakeHours()}h</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Daily Goal</Text>
          <Text style={styles.previewValue}>{dailyGoal || "—"}L</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Reminder Frequency</Text>
          <Text style={styles.previewValue}>{calculateReminderFrequency()}</Text>
        </View>
        <Text style={styles.previewNote}>
          Reminders are distributed intelligently: more frequent in morning/afternoon,
          less in evening.
        </Text>
      </View>
    </SettingsModalWrapper>
  );
};

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    backgroundColor: surface[1],
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: `${colors.primary.DEFAULT}14`,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    ...variants.caption,
    fontWeight: "600" as const,
    color: colors.text.secondary,
  },
  chipTextSelected: {
    color: colors.primary.DEFAULT,
  },
  sectionLabel: {
    ...variants.sectionTitle,
    fontSize: rf(15),
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...variants.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: rf(18),
  },
  previewCard: {
    backgroundColor: surface[1],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  previewHeaderText: {
    ...variants.caption,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  previewLabel: {
    ...variants.body,
    fontSize: rf(13),
    color: colors.text.secondary,
  },
  previewValue: {
    ...variants.body,
    fontSize: rf(13),
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.primary,
  },
  previewNote: {
    ...variants.caption,
    fontSize: rf(11),
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    lineHeight: rf(15),
  },
});

export default WaterReminderEditModal;
