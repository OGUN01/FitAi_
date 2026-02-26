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
import { ResponsiveTheme } from '../../../utils/constants';

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
});
