/**
 * TrainingTab — S5 "Training" ("Better than 2026" redesign).
 *
 * One focal question: "How do you move?" Three answer-as-tap controls:
 *   - Activity level: a 5-step horizontal StepperRow (Sedentary → Extreme) with a
 *     big live readout above (heroStat caliber, mirrors YouTab's age readout).
 *   - Location: 3 large tappable tiles (Home / Gym / Both) with accent ring + tint.
 *   - Intensity: 3 tiles (Beginner / Intermediate / Advanced) — same tile pattern.
 * Pure OLED black, brand-orange accent, QuestionHero + ScreenFrame + NavRail.
 *
 * Data wiring UNCHANGED: uses useWorkoutPreferences → updateField → onUpdate.
 * (equipment, enjoyment, frequency, workout_types — deferred, not collected here.)
 */

import React, { useMemo, useEffect } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";
import {
  ScreenFrame,
  StepperRow,
} from "../../../components/onboarding/aurora";
import type { StepperOption } from "../../../components/onboarding/aurora";
import {
  ACTIVITY_LEVELS,
  LOCATION_OPTIONS,
  INTENSITY_OPTIONS,
} from "./WorkoutPreferencesConstants";
import { WorkoutPreferencesData } from "../../../types/onboarding";
import { useWorkoutPreferences } from "../../../hooks/onboarding/useWorkoutPreferences";

const ACCENT = "#FF6B35";

interface TrainingTabProps {
  data: WorkoutPreferencesData | null;
  onUpdate: (data: Partial<WorkoutPreferencesData>) => void;
  onNext: () => void;
  onBack: () => void;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

const fireSelection = () => Haptics.selectionAsync().catch(() => {});

// 5-step activity stepper — short labels so all segments fit one row at 16px.
const ACTIVITY_STEPS: StepperOption[] = [
  { id: "sedentary", label: "Sed." },
  { id: "light", label: "Light" },
  { id: "moderate", label: "Mod." },
  { id: "active", label: "Active" },
  { id: "extreme", label: "Extreme" },
];

// Full descriptive label for the hero readout (looked up from ACTIVITY_LEVELS).
const ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_LEVELS.map((l) => [l.value, l.label]),
);

export const TrainingTab: React.FC<TrainingTabProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
  isAutoSaving,
  isEditingFromReview,
  onReturnToReview,
}) => {
  const { formData, updateField } = useWorkoutPreferences({ data, onUpdate });

  // One-shot mount-sync: useWorkoutPreferences seeds local formData with smart
  // defaults (activity_level "sedentary", location "both", intensity
  // "beginner") that this screen's per-screen gate AND the completion gate
  // (validateWorkoutPreferences) require. Without this, canAdvance (which
  // reads local formData) would pass on mount, but validateScreen (which
  // reads the store) would fail on Next — a mismatch. Surfacing the defaults
  // to the store makes both agree and lets the user accept the smart
  // defaults. Idempotent for returning users (formData initializes from
  // `data`); explicit edits still win via updateField → onUpdate.
  useEffect(() => {
    onUpdate(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAdvance = useMemo(
    () =>
      !!formData.activity_level && !!formData.location && !!formData.intensity,
    [formData.activity_level, formData.location, formData.intensity],
  );

  const activityReadout = ACTIVITY_LABELS[formData.activity_level] ?? "—";

  return (
    <ScreenFrame
      question="How do you move?"
      reassurance="Where and how hard you like to train."
      onBack={onBack}
      onNext={onNext}
      nextLabel={isEditingFromReview ? "Review" : "Next"}
      disabled={!canAdvance}
      isEditingFromReview={isEditingFromReview}
      onReturnToReview={onReturnToReview}
      bloomColor={ACCENT}
      testID="onboarding-training-tab"
    >
      {/* Activity level — stepper with live hero readout */}
      <View style={styles.activityBlock}>
        <Text style={styles.fieldLabel}>Activity level</Text>
        <View style={styles.readoutRow}>
          <Text style={styles.readout}>{activityReadout}</Text>
        </View>
        <StepperRow
          options={ACTIVITY_STEPS}
          value={formData.activity_level}
          onSelect={(id) =>
            updateField(
              "activity_level",
              id as WorkoutPreferencesData["activity_level"],
            )
          }
          accentColor={ACCENT}
          testID="onboarding-activity-stepper"
        />
      </View>

      {/* Location — 3 tiles */}
      <View>
        <Text style={styles.fieldLabel}>Where do you train?</Text>
        <View style={styles.tileRow}>
          {LOCATION_OPTIONS.map((opt) => (
            <ChoiceTile
              key={opt.id}
              label={opt.title}
              iconName={opt.iconName}
              selected={formData.location === opt.id}
              accentColor={ACCENT}
              onPress={() => {
                fireSelection();
                updateField("location", opt.id as WorkoutPreferencesData["location"]);
              }}
              testID={`onboarding-location-${opt.id}`}
            />
          ))}
        </View>
      </View>

      {/* Intensity — 3 tiles */}
      <View>
        <Text style={styles.fieldLabel}>How hard?</Text>
        <View style={styles.tileRow}>
          {INTENSITY_OPTIONS.map((opt) => (
            <ChoiceTile
              key={opt.value}
              label={opt.label}
              iconName={opt.iconName}
              selected={formData.intensity === opt.value}
              accentColor={ACCENT}
              onPress={() => {
                fireSelection();
                updateField(
                  "intensity",
                  opt.value as WorkoutPreferencesData["intensity"],
                );
              }}
              testID={`onboarding-intensity-${opt.value}`}
            />
          ))}
        </View>
      </View>
    </ScreenFrame>
  );
};

// ── Choice tile (shared by Location + Intensity) ──────────────────────────────
interface ChoiceTileProps {
  label: string;
  iconName: string;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
  testID?: string;
}

const ChoiceTile: React.FC<ChoiceTileProps> = ({
  label,
  iconName,
  selected,
  accentColor,
  onPress,
  testID,
}) => {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.03 : 1, { damping: 14, stiffness: 150 });
  }, [selected]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const selectedBg = hexToRgba(accentColor, TINT_ALPHA_LOW);

  return (
    <Animated.View style={[styles.tileWrap, animStyle]} testID={testID}>
      <Pressable
        onPress={onPress}
        style={[
          styles.tile,
          selected
            ? { backgroundColor: selectedBg, borderColor: accentColor }
            : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.08)" },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        <Ionicons
          name={iconName as React.ComponentProps<typeof Ionicons>["name"]}
          size={26}
          color={selected ? accentColor : colors.text.secondary}
          style={styles.tileIcon}
        />
        <Text
          style={[
            styles.tileLabel,
            { color: selected ? colors.text.primary : colors.text.secondary },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  activityBlock: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.fontSize * typography.variants.caption.lineHeight,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  readoutRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  readout: {
    fontFamily: typography.variants.heroStat.fontFamily,
    fontSize: typography.variants.heroStat.fontSize,
    lineHeight: typography.variants.heroStat.fontSize * typography.variants.heroStat.lineHeight,
    color: colors.text.primary,
  },
  tileRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tileWrap: {
    flex: 1,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    minHeight: 92,
  },
  tileIcon: {
    marginBottom: spacing.xs,
  },
  tileLabel: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    lineHeight: typography.variants.cardHeadline.fontSize * typography.variants.cardHeadline.lineHeight,
  },
});

export default TrainingTab;
