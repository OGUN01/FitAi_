import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { Card, THEME } from "../../ui";

interface SleepSettingsProps {
  bedtime: string;
  setBedtime: (value: string) => void;
  reminderMinutes: string;
  setReminderMinutes: (value: string) => void;
}

export const SleepSettings: React.FC<SleepSettingsProps> = ({
  bedtime,
  setBedtime,
  reminderMinutes,
  setReminderMinutes,
}) => {
  return (
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
            value={reminderMinutes}
            onChangeText={setReminderMinutes}
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
                reminderMinutes === minutes.toString() &&
                  styles.presetButtonActive,
              ]}
              onPress={() => setReminderMinutes(minutes.toString())}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  reminderMinutes === minutes.toString() &&
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
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  sectionDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 20,
  },
  card: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  cardContent: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium as "500",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.backgroundSecondary,
  },
  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: THEME.spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.backgroundSecondary,
    alignItems: "center" as const,
  },
  presetButtonActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary + "20",
  },
  presetButtonText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium as "500",
  },
  presetButtonTextActive: {
    color: THEME.colors.primary,
  },
  infoCard: {
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
  },
  infoText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
