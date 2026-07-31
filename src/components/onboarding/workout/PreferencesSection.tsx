/**
 * PreferencesSection — the visible "How do you want to train?" core
 * (Editorial Dark reskin)
 *
 * Location (single-select OptionRows), intensity (single-select OptionRows +
 * soft accent recommendation note), session duration (RangeSlider, volt
 * accent), sessions/week (WeekRhythm ruler 0–7 + TAPPABLE Mon–Sun day chips —
 * user picks WHICH days they train), preferred times (multi-select
 * OptionRows). No cards — SectionLabel + hairlines only.
 *
 * Data wiring: `updateField`, `toggleWorkoutTime`, `setWorkoutFrequency`,
 * `toggleWorkoutDay`, and `intensityRecommendation` from useWorkoutPreferences.
 */

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens, OptionRow, SectionLabel, Rule } from "../fresh";
import { RangeSlider } from "../aurora";
import { WeekRhythm } from "./preferences/WeekRhythm";
import {
  LOCATION_OPTIONS,
  INTENSITY_OPTIONS,
  WORKOUT_TIMES,
} from "../../../screens/onboarding/tabs/WorkoutPreferencesConstants";
import { WorkoutPreferencesData } from "../../../types/onboarding";

interface PreferencesSectionProps {
  formData: WorkoutPreferencesData;
  updateField: <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => void;
  toggleWorkoutTime: (timeId: string) => void;
  /** Ruler control — session count; re-spreads days when the size changes. */
  setWorkoutFrequency: (n: number) => void;
  /** Day-chip control — toggles WHICH day; the count follows the selection. */
  toggleWorkoutDay: (dayId: string) => void;
  showInfoTooltip: (title: string, description: string) => void;
  intensityRecommendation?: {
    level: "beginner" | "intermediate" | "advanced";
    reasoning: string;
  } | null;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
};

export const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  formData,
  updateField,
  toggleWorkoutTime,
  setWorkoutFrequency,
  toggleWorkoutDay,
  showInfoTooltip,
  intensityRecommendation,
}) => {
  const intensityLevel = intensityRecommendation?.level;

  return (
    <View testID="training-setup-section">
      {/* Location — single select */}
      <View style={styles.headerRow}>
        <SectionLabel>Workout location</SectionLabel>
        <Pressable
          onPress={() =>
            showInfoTooltip(
              "Workout location",
              "Where you'll train. This shapes equipment and exercise choices.",
            )
          }
          hitSlop={8}
          accessibilityLabel="About workout location"
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={tokens.ink3}
          />
        </Pressable>
      </View>
      <View style={styles.rows} testID="location-chip-picker">
        {LOCATION_OPTIONS.map((option) => (
          <OptionRow
            key={option.id}
            label={option.title}
            sublabel={option.description}
            icon={option.iconName as keyof typeof Ionicons.glyphMap}
            selected={formData.location === option.id}
            onPress={() =>
              updateField("location", option.id as WorkoutPreferencesData["location"])
            }
            testID={`location-row-${option.id}`}
          />
        ))}
      </View>

      {/* Intensity — single select + soft recommendation */}
      <View style={[styles.headerRow, styles.fieldGap]}>
        <SectionLabel>Intensity</SectionLabel>
        <Pressable
          onPress={() =>
            showInfoTooltip(
              "Intensity",
              "Beginner, intermediate, or advanced. You can override our recommendation.",
            )
          }
          hitSlop={8}
          accessibilityLabel="About intensity"
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={tokens.ink3}
          />
        </Pressable>
      </View>
      {intensityLevel && (
        <View style={styles.recoRow} testID="intensity-suggestion">
          <Ionicons name="sparkles-outline" size={13} color={tokens.ink3} />
          <Text style={styles.recoText}>
            Recommended{"  "}
            <Text style={styles.recoLevel}>
              {intensityLevel.charAt(0).toUpperCase() + intensityLevel.slice(1)}
            </Text>
          </Text>
        </View>
      )}
      <View style={styles.rows} testID="intensity-chip-picker">
        {INTENSITY_OPTIONS.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            sublabel={option.description}
            icon={option.iconName as keyof typeof Ionicons.glyphMap}
            selected={formData.intensity === option.value}
            onPress={() =>
              updateField(
                "intensity",
                option.value as WorkoutPreferencesData["intensity"],
              )
            }
            testID={`intensity-row-${option.value}`}
          />
        ))}
      </View>

      {/* Session duration — slider */}
      <View style={[styles.headerRow, styles.fieldGap]}>
        <SectionLabel>Session duration</SectionLabel>
        <Text style={styles.valueLg}>
          {formatDuration(formData.time_preference)}
        </Text>
      </View>
      <RangeSlider
        value={formData.time_preference}
        min={15}
        max={120}
        step={5}
        onChange={(v) => updateField("time_preference", v)}
        unit="min"
        tickHapticEvery={5}
        accentColor={tokens.accent}
        showValue={false}
        style={styles.slider}
        testID="time-preference-slider"
      />

      {/* Sessions per week — ruler + tappable day chips (WHICH days) */}
      <View style={[styles.headerRow, styles.fieldGap]}>
        <SectionLabel>Sessions per week</SectionLabel>
        <Text style={styles.valueMd}>
          {formData.workout_frequency_per_week}×/week
        </Text>
      </View>
      <WeekRhythm
        value={formData.workout_frequency_per_week}
        onChange={setWorkoutFrequency}
        days={formData.preferred_workout_days}
        onToggleDay={toggleWorkoutDay}
        style={styles.stepper}
        testID="frequency-stepper"
      />

      {/* Preferred workout times — multi select */}
      <View style={[styles.headerRow, styles.fieldGap]}>
        <SectionLabel>Preferred times</SectionLabel>
      </View>
      <Text style={styles.caption}>When do you like to train?</Text>
      <View style={styles.rows} testID="workout-times-chip-picker">
        {WORKOUT_TIMES.map((time) => (
          <OptionRow
            key={time.value}
            label={time.label}
            sublabel={time.description}
            icon={time.iconName as keyof typeof Ionicons.glyphMap}
            selected={formData.preferred_workout_times.includes(time.value)}
            onPress={() => toggleWorkoutTime(time.value)}
            testID={`workout-time-row-${time.value}`}
          />
        ))}
      </View>
      <Rule spacing={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldGap: {
    marginTop: 28,
  },
  rows: {
    marginTop: 8,
  },
  caption: {
    marginTop: 6,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  recoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  recoText: {
    marginLeft: 6,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  recoLevel: {
    fontFamily: "Manrope_600SemiBold",
    color: tokens.accent,
  },
  valueLg: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 22,
    lineHeight: 26,
    color: tokens.accent,
  },
  valueMd: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
    color: tokens.accent,
  },
  slider: {
    marginTop: 8,
  },
  stepper: {
    marginTop: 12,
  },
});
