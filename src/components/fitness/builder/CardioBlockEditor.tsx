/**
 * CardioBlockEditor — net-new UI for first-class cardio activity in the
 * workout builder (Phase B). This is the "6 am, 30 min running" requirement.
 *
 * Renders inside a DayBlock's expanded content (below the strength rows). For
 * each CardioBlock on the day it shows an editable row (name, duration,
 * intensity, optional distance) with a remove control, plus an "Add cardio"
 * button and a per-day `scheduledTime` picker (display/notifications ONLY —
 * never an energy-math input, per the goal-engine plan).
 *
 * LIVE PREVIEW: every edit calls the store's cardio actions, which mutate
 * `workoutBuilderStore.draft` synchronously and recompute insights — the
 * GoalImpactPanel's burn number moves immediately (no save round-trip).
 *
 * Styling matches the existing builder components (GlassCard-less flat rows,
 * form-row styling, aurora-tokens). No Alert.alert — uses crossPlatformAlert
 * only if needed (currently none required).
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, Layout } from "react-native-reanimated";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { DetentBottomSheet } from "../../ui/aurora/DetentBottomSheet";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  flatColors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";
import type { CardioBlock, CardioIntensity } from "../../../types/workout";

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const INTENSITY_OPTIONS: { value: CardioIntensity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

/** Common cardio activity presets (resolved to MET via EXERCISE_TYPE_MET_OVERRIDES
 *  in planBurn.ts — running 9.8, cycling 7.5, rowing 7.0, jump rope 12.3,
 *  walking 3.5). */
const CARDIO_PRESETS: { name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: "Running", icon: "footsteps-outline" },
  { name: "Cycling", icon: "bicycle-outline" },
  { name: "Rowing", icon: "water-outline" },
  { name: "Jump Rope", icon: "fitness-outline" },
  { name: "Walking", icon: "walk-outline" },
  { name: "Swimming", icon: "boat-outline" },
];

/** Time-of-day options for the scheduledTime picker (display/notifications
 *  only — never an energy-math input). */
const TIME_OPTIONS = [
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
];

const fw = (
  w: (typeof typography.fontWeight)[keyof typeof typography.fontWeight],
): TextStyle["fontWeight"] => String(w) as TextStyle["fontWeight"];

const tabularNums: TextStyle = { fontVariant: ["tabular-nums"] };

function genId(): string {
  return `cardio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export interface CardioBlockEditorProps {
  dayIndex: number;
  /** The day's cardio blocks (from the draft). */
  cardioBlocks: CardioBlock[] | undefined;
  /** The day's scheduled time ("HH:MM") or undefined. */
  scheduledTime: string | undefined;
  testID?: string;
}

export const CardioBlockEditor: React.FC<CardioBlockEditorProps> = ({
  dayIndex,
  cardioBlocks,
  scheduledTime,
  testID,
}) => {
  const addCardioBlock = useWorkoutBuilderStore((s) => s.addCardioBlock);
  const removeCardioBlock = useWorkoutBuilderStore((s) => s.removeCardioBlock);
  const updateCardioBlock = useWorkoutBuilderStore((s) => s.updateCardioBlock);
  const setScheduledTime = useWorkoutBuilderStore((s) => s.setScheduledTime);

  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const blocks = cardioBlocks ?? [];

  const handleAddPreset = useCallback(
    (name: string) => {
      const block: CardioBlock = {
        id: genId(),
        kind: "cardio",
        name,
        durationMinutes: 30,
        intensity: "moderate",
      };
      addCardioBlock(dayIndex, block);
      setPresetPickerOpen(false);
      haptics.success();
    },
    [addCardioBlock, dayIndex],
  );

  const handleRemove = useCallback(
    (blockId: string) => {
      removeCardioBlock(dayIndex, blockId);
      haptics.selection();
    },
    [removeCardioBlock, dayIndex],
  );

  const handleDurationChange = useCallback(
    (blockId: string, raw: string) => {
      const minutes = parseInt(raw, 10);
      if (isNaN(minutes)) return;
      updateCardioBlock(dayIndex, blockId, {
        durationMinutes: Math.max(0, Math.min(600, minutes)),
      });
    },
    [updateCardioBlock, dayIndex],
  );

  const handleIntensityChange = useCallback(
    (blockId: string, intensity: CardioIntensity) => {
      updateCardioBlock(dayIndex, blockId, { intensity });
      haptics.selection();
    },
    [updateCardioBlock, dayIndex],
  );

  const handleDistanceChange = useCallback(
    (blockId: string, raw: string) => {
      const km = parseFloat(raw);
      updateCardioBlock(dayIndex, blockId, {
        distanceKm: isNaN(km) ? undefined : Math.max(0, km),
      });
    },
    [updateCardioBlock, dayIndex],
  );

  const handlePickTime = useCallback(
    (time: string) => {
      setScheduledTime(dayIndex, time);
      setTimePickerOpen(false);
      haptics.selection();
    },
    [setScheduledTime, dayIndex],
  );

  const handleClearTime = useCallback(() => {
    setScheduledTime(dayIndex, undefined);
    setTimePickerOpen(false);
    haptics.selection();
  }, [setScheduledTime, dayIndex]);

  const timeLabel = scheduledTime
    ? TIME_OPTIONS.find((t) => t.value === scheduledTime)?.label ??
      formatHHMM(scheduledTime)
    : "Set time";

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.sectionHeader}>
        <Ionicons name="timer-outline" size={rf(16)} color={colors.primary.DEFAULT} />
        <Text style={styles.sectionTitle}>Cardio</Text>
      </View>

      {/* Per-day scheduled time — display/notifications ONLY */}
      <Pressable
        onPress={() => {
          setTimePickerOpen(true);
          haptics.selection();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Scheduled time: ${timeLabel}. Tap to change.`}
        style={styles.timeRow}
      >
        <Ionicons name="time-outline" size={rf(14)} color={colors.text.tertiary} />
        <Text style={styles.timeLabel}>{timeLabel}</Text>
        <Ionicons name="chevron-down-outline" size={rf(14)} color={colors.text.tertiary} />
      </Pressable>

      {blocks.map((block) => (
        <Animated.View
          key={block.id}
          entering={FadeInUp.springify()}
          layout={Layout.springify()}
          style={styles.blockCard}
        >
          <View style={styles.blockHeader}>
            <Ionicons name="flame-outline" size={rf(15)} color={colors.primary.DEFAULT} />
            <Text style={styles.blockName} numberOfLines={1}>
              {block.name}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => handleRemove(block.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${block.name} cardio`}
              style={styles.removeBtn}
            >
              <Ionicons name="close-circle" size={rf(18)} color={colors.text.tertiary} />
            </Pressable>
          </View>

          <View style={styles.formRow}>
            {/* Duration */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Min</Text>
              <TextInput
                style={styles.fieldInput}
                value={String(block.durationMinutes)}
                keyboardType="numeric"
                onChangeText={(raw) => handleDurationChange(block.id, raw)}
                accessibilityLabel={`${block.name} duration in minutes`}
                selectTextOnFocus
              />
            </View>

            {/* Distance (optional, display only) */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Km</Text>
              <TextInput
                style={styles.fieldInput}
                value={block.distanceKm != null ? String(block.distanceKm) : ""}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor={colors.text.tertiary}
                onChangeText={(raw) => handleDistanceChange(block.id, raw)}
                accessibilityLabel={`${block.name} distance in kilometers, optional`}
                selectTextOnFocus
              />
            </View>
          </View>

          {/* Intensity selector — segmented */}
          <View style={styles.intensityRow}>
            {INTENSITY_OPTIONS.map((opt) => {
              const selected = block.intensity === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleIntensityChange(block.id, opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.label} intensity`}
                  accessibilityState={{ selected }}
                  style={[styles.intensityPill, selected && styles.intensityPillSelected]}
                >
                  <Text
                    style={[
                      styles.intensityPillText,
                      selected && styles.intensityPillTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ))}

      <GlassButton
        label="Add Cardio"
        icon="add-circle-outline"
        onPress={() => {
          setPresetPickerOpen(true);
          haptics.buttonPress();
        }}
        variant="primary"
        fullWidth
        style={styles.addBtn}
        testID={`${testID ?? "cardio"}-add`}
      />

      {/* Cardio preset picker */}
      <DetentBottomSheet
        visible={presetPickerOpen}
        onClose={() => setPresetPickerOpen(false)}
        snapPoints={[0.5, 0.7]}
        initialSnapIndex={0}
        testID={`${testID ?? "cardio"}-preset-sheet`}
      >
        <Text style={styles.sheetEyebrow}>ADD CARDIO</Text>
        <Text style={styles.sheetTitle}>Choose an activity</Text>
        <Text style={styles.sheetMessage}>
          Burn is estimated from MET × weight × duration × intensity.
        </Text>
        <View style={styles.presetList}>
          {CARDIO_PRESETS.map((preset) => (
            <Pressable
              key={preset.name}
              onPress={() => handleAddPreset(preset.name)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${preset.name}`}
              style={({ pressed }) => [styles.presetRow, pressed && styles.presetRowPressed]}
            >
              <Ionicons name={preset.icon} size={rf(18)} color={colors.primary.DEFAULT} />
              <Text style={styles.presetLabel}>{preset.name}</Text>
              <Ionicons name="add-outline" size={rf(18)} color={colors.text.tertiary} />
            </Pressable>
          ))}
        </View>
        <View style={styles.sheetActions}>
          <GlassButton
            label="Cancel"
            onPress={() => setPresetPickerOpen(false)}
            variant="secondary"
            hapticType="light"
            style={styles.sheetActionBtn}
            testID={`${testID ?? "cardio"}-preset-cancel`}
          />
        </View>
      </DetentBottomSheet>

      {/* Scheduled time picker — display/notifications only */}
      <DetentBottomSheet
        visible={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        snapPoints={[0.5, 0.7]}
        initialSnapIndex={0}
        testID={`${testID ?? "cardio"}-time-sheet`}
      >
        <Text style={styles.sheetEyebrow}>SCHEDULED TIME</Text>
        <Text style={styles.sheetTitle}>When will you train?</Text>
        <Text style={styles.sheetMessage}>
          For reminders only — your burn counts regardless of the time you actually train.
        </Text>
        <View style={styles.presetList}>
          {TIME_OPTIONS.map((opt) => {
            const selected = scheduledTime === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handlePickTime(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.presetRow,
                  pressed && styles.presetRowPressed,
                ]}
              >
                <Ionicons
                  name={selected ? "checkmark-circle" : "time-outline"}
                  size={rf(18)}
                  color={selected ? colors.primary.DEFAULT : colors.text.tertiary}
                />
                <Text
                  style={[styles.presetLabel, selected && styles.presetLabelSelected]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.sheetActions}>
          <GlassButton
            label="Clear"
            onPress={handleClearTime}
            variant="secondary"
            hapticType="light"
            style={styles.sheetActionBtn}
            testID={`${testID ?? "cardio"}-time-clear`}
          />
          <GlassButton
            label="Cancel"
            onPress={() => setTimePickerOpen(false)}
            variant="primary"
            hapticType="light"
            style={styles.sheetActionBtn}
            testID={`${testID ?? "cardio"}-time-cancel`}
          />
        </View>
      </DetentBottomSheet>
    </View>
  );
};

/** Format an "HH:MM" string into a 12-hour label as a fallback. */
function formatHHMM(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

const styles = StyleSheet.create({
  container: {
    marginTop: rp(spacing.sm),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.xs),
    marginBottom: rp(spacing.sm),
    alignSelf: "flex-start",
  },
  timeLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    ...tabularNums,
  },
  blockCard: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: rp(spacing.sm),
    marginBottom: rp(spacing.xs),
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  blockName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  removeBtn: {
    padding: rp(4),
  },
  formRow: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.xs),
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginBottom: rp(2),
  },
  fieldInput: {
    backgroundColor: surface[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: border.subtle,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    minHeight: 44,
    ...tabularNums,
  },
  intensityRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
  },
  intensityPill: {
    flex: 1,
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: border.subtle,
    alignItems: "center",
    minHeight: 36,
    justifyContent: "center",
  },
  intensityPillSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  intensityPillText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  intensityPillTextSelected: {
    color: flatColors.white,
  },
  addBtn: {
    marginTop: rp(spacing.xs),
  },
  // Sheet styles
  sheetEyebrow: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.bold),
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sheetTitle: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.bold),
    color: colors.text.primary,
    marginTop: rp(spacing.xs),
  },
  sheetMessage: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
    marginTop: rp(spacing.xs),
    marginBottom: rp(spacing.sm),
  },
  presetList: {
    gap: rp(spacing.xs),
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: surface[1],
    minHeight: 48,
  },
  presetRowPressed: {
    opacity: 0.6,
  },
  presetLabel: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.medium),
  },
  presetLabelSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fw(typography.fontWeight.bold),
  },
  sheetActions: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    marginTop: rp(spacing.md),
  },
  sheetActionBtn: {
    flex: 1,
  },
});

export default CardioBlockEditor;
