import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';

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
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardContent: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  presetButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  presetButtonTextActive: {
    color: colors.primary,
  },
});
