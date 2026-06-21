import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
} from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';

interface MealSettingsProps {
  breakfastEnabled: boolean;
  setBreakfastEnabled: (value: boolean) => void;
  breakfastTime: string;
  setBreakfastTime: (value: string) => void;
  lunchEnabled: boolean;
  setLunchEnabled: (value: boolean) => void;
  lunchTime: string;
  setLunchTime: (value: string) => void;
  dinnerEnabled: boolean;
  setDinnerEnabled: (value: boolean) => void;
  dinnerTime: string;
  setDinnerTime: (value: string) => void;
}

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

interface MealCardProps {
  emoji: string;
  title: string;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  time: string;
  setTime: (value: string) => void;
  mealType: "breakfast" | "lunch" | "dinner";
}

const MealCard: React.FC<MealCardProps> = ({
  emoji,
  title,
  enabled,
  setEnabled,
  time,
  setTime,
  mealType,
}) => (
  <Card style={styles.card}>
    <View style={styles.mealHeader}>
      <Text style={styles.mealTitle}>
        {emoji} {title}
      </Text>
      <Switch
        value={enabled}
        onValueChange={setEnabled}
        trackColor={{
          false: colors.border,
          true: colors.primary + "50",
        }}
        thumbColor={enabled ? colors.primary : colors.textMuted}
      />
    </View>

    {enabled && (
      <>
        <View style={styles.cardContent}>
          <TextInput
            style={styles.textInput}
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
            keyboardType={
              Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
            }
          />
        </View>
        <View style={styles.presetButtons}>
          {(["early", "normal", "late"] as const).map((preset) => {
            const presetTime = getPresetTime(mealType, preset);
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetButton,
                  time === presetTime && styles.presetButtonActive,
                ]}
                onPress={() => setTime(presetTime)}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    time === presetTime && styles.presetButtonTextActive,
                  ]}
                >
                  {presetTime}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    )}
  </Card>
);

export const MealSettings: React.FC<MealSettingsProps> = ({
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
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Meal Reminder Times</Text>
      <Text style={styles.sectionDescription}>
        Customize when you want to be reminded for each meal.
      </Text>

      <MealCard
        emoji="🍳"
        title="Breakfast"
        enabled={breakfastEnabled}
        setEnabled={setBreakfastEnabled}
        time={breakfastTime}
        setTime={setBreakfastTime}
        mealType="breakfast"
      />

      <MealCard
        emoji="🥙"
        title="Lunch"
        enabled={lunchEnabled}
        setEnabled={setLunchEnabled}
        time={lunchTime}
        setTime={setLunchTime}
        mealType="lunch"
      />

      <MealCard
        emoji="🍽️"
        title="Dinner"
        enabled={dinnerEnabled}
        setEnabled={setDinnerEnabled}
        time={dinnerTime}
        setTime={setDinnerTime}
        mealType="dinner"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardContent: {
    marginBottom: spacing.md,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  mealTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
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
    alignItems: "center" as const,
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  presetButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium as "500",
  },
  presetButtonTextActive: {
    color: colors.primary,
  },
});
