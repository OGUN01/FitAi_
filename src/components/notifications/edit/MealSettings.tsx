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
import { ResponsiveTheme } from '../../../utils/constants';

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
          false: ResponsiveTheme.colors.border,
          true: ResponsiveTheme.colors.primary + "50",
        }}
        thumbColor={enabled ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textMuted}
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
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
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
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
    alignItems: "center" as const,
  },
  presetButtonActive: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: ResponsiveTheme.colors.primary + "20",
  },
  presetButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
  },
  presetButtonTextActive: {
    color: ResponsiveTheme.colors.primary,
  },
});
