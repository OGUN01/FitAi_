import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Card, THEME } from "../../ui";

interface TimeSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "morning" | "evening";
  getPresetTime: (
    type: "morning" | "evening",
    preset: "early" | "normal" | "late",
  ) => string;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  label,
  value,
  onChange,
  type,
  getPresetTime,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChange}
          placeholder={type === "morning" ? "07:00" : "23:00"}
          keyboardType={
            Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
          }
        />
      </View>
      <View style={styles.presetButtons}>
        {(["early", "normal", "late"] as const).map((preset) => {
          const time = getPresetTime(type, preset);
          return (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetButton,
                value === time && styles.presetButtonActive,
              ]}
              onPress={() => onChange(time)}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  value === time && styles.presetButtonTextActive,
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  cardContent: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
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
    alignItems: "center",
  },
  presetButtonActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary + "20",
  },
  presetButtonText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  presetButtonTextActive: {
    color: THEME.colors.primary,
  },
});
