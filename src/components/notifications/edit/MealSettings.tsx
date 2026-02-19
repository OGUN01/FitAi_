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
import { Card, THEME } from "../../ui";

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
          false: THEME.colors.border,
          true: THEME.colors.primary + "50",
        }}
        thumbColor={enabled ? THEME.colors.primary : THEME.colors.textMuted}
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
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  mealTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
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
});
