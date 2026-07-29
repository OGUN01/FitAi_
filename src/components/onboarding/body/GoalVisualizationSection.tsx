/**
 * GoalVisualizationSection — Body tab signature visual (Editorial Dark).
 *
 * The goal is SHOWN, not stated. A draggable StrokeRing binds to
 * target_weight_kg; dragging it sets the target AND recomputes
 * target_timeline_weeks to keep the weekly rate safe (≤ the healthy rate from
 * BodyCompositionCalculations). A timeline slider lets the user override the
 * weeks independently. A current→target readout shows the delta and the
 * resulting weekly pace, flagged safe/aggressive.
 *
 * Presentation only — data wiring (updateField / updateFields) unchanged.
 */

import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  RowGroup,
  SectionLabel,
  StrokeRing,
  Rule,
} from "../../onboarding/fresh";
import {
  tokens,
  type as freshType,
  font,
  spacing as freshSpacing,
} from "../../onboarding/fresh/tokens";
import { RangeSlider } from "../../onboarding/aurora/RangeSlider";
import { BodyCompositionCalculations } from "../../../utils/healthCalculations";
import { BodyAnalysisData, PersonalInfoData } from "../../../types/onboarding";

interface GoalVisualizationSectionProps {
  formData: BodyAnalysisData;
  updateField: <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => void;
  updateFields: (patch: Partial<BodyAnalysisData>) => void;
  personalInfoData?: PersonalInfoData | null;
}

const WEIGHT_MIN = 30;
const WEIGHT_MAX = 300;
const WEEKS_MIN = 4;
const WEEKS_MAX = 104;

const GOAL_RING_SIZE = 232;
const GOAL_RING_STROKE = 12;

const fireImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};
const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

/** Milestone date from a number of weeks from now — "early Apr", "mid Sep".
 * Pure presentation: uses the same `weeks` value the timeline slider writes. */
const milestoneLabel = (weeks: number): string => {
  if (weeks <= 0) return "";
  const target = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);
  const month = target.toLocaleString("en-US", { month: "short" });
  const year = target.getFullYear();
  const day = target.getDate();
  const phase = day <= 10 ? "early" : day <= 20 ? "mid" : "late";
  return `${phase} ${month} ${year}`;
};

export const GoalVisualizationSection: React.FC<
  GoalVisualizationSectionProps
> = ({ formData, updateField, updateFields, personalInfoData }) => {
  const current = formData.current_weight_kg ?? 0;
  const target = formData.target_weight_kg ?? 0;
  const timeline = formData.target_timeline_weeks ?? 12;
  const gender = personalInfoData?.gender;

  const delta = current > 0 && target > 0 ? target - current : 0;
  const direction = delta < -0.01 ? "loss" : delta > 0.01 ? "gain" : "maintain";
  const weeklyRate =
    current > 0 && target > 0 && timeline > 0 ? Math.abs(delta) / timeline : 0;

  const safeRate =
    current > 0
      ? BodyCompositionCalculations.calculateHealthyWeightLossRate(
          current,
          gender,
        )
      : 0.5;
  const isSafeRate = weeklyRate > 0 && weeklyRate <= safeRate;

  // Dragging the goal ring sets target_weight_kg and recomputes the timeline
  // to keep the weekly rate safe (same wiring as the legacy goal arc).
  const handleTargetChange = useCallback(
    (v: number | string) => {
      const newTarget = typeof v === "number" ? v : parseFloat(v) || 0;
      if (current > 0 && newTarget > 0) {
        const diff = Math.abs(current - newTarget);
        const weeks = Math.max(
          WEEKS_MIN,
          Math.min(WEEKS_MAX, Math.ceil(diff / safeRate)),
        );
        updateFields({
          target_weight_kg: newTarget,
          target_timeline_weeks: weeks,
        });
      } else {
        updateField("target_weight_kg", newTarget);
      }
    },
    [current, safeRate, updateField, updateFields],
  );

  const handleTimelineChange = useCallback(
    (v: number | string) => {
      const weeks =
        typeof v === "number" ? v : Math.round(parseFloat(v) || WEEKS_MIN);
      updateField(
        "target_timeline_weeks",
        Math.max(
          WEEKS_MIN,
          Math.min(WEEKS_MAX, weeks),
        ) as BodyAnalysisData["target_timeline_weeks"],
      );
    },
    [updateField],
  );

  // Drag-to-set on the StrokeRing: touch angle → fraction → 0.5 kg step.
  // Same interaction as the legacy RadialDial goal arc, rendered crisp.
  const lastHapticKg = useRef<number>(-1);
  const applyTouch = useCallback(
    (x: number, y: number) => {
      const cx = GOAL_RING_SIZE / 2;
      const cy = GOAL_RING_SIZE / 2;
      const dx = x - cx;
      const dy = y - cy;
      let angle = Math.atan2(dy, dx) + Math.PI / 2; // 0 at top
      if (angle < 0) angle += Math.PI * 2;
      const fraction = angle / (Math.PI * 2);
      const raw = WEIGHT_MIN + fraction * (WEIGHT_MAX - WEIGHT_MIN);
      const snapped = Math.round(raw * 2) / 2; // 0.5 kg steps
      const v = Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, snapped));
      const kgBucket = Math.round(v);
      if (kgBucket !== lastHapticKg.current) {
        lastHapticKg.current = kgBucket;
        fireImpact();
      }
      handleTargetChange(v);
    },
    [handleTargetChange],
  );

  // The PanResponder is created once; route every touch through a ref so the
  // handler always sees the LATEST applyTouch closure (current weight /
  // safeRate change as the sliders move — a captured first-render closure
  // would recompute the timeline against stale values).
  const applyTouchRef = useRef(applyTouch);
  applyTouchRef.current = applyTouch;

  const ringPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) =>
        applyTouchRef.current(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e: GestureResponderEvent) =>
        applyTouchRef.current(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderRelease: () => fireSelection(),
    }),
  ).current;

  const hasGoal = current > 0 && target > 0;
  const goalFraction =
    target > 0
      ? Math.max(
          0,
          Math.min(1, (target - WEIGHT_MIN) / (WEIGHT_MAX - WEIGHT_MIN)),
        )
      : 0;

  return (
    <RowGroup label="Your goal">
      <View style={styles.stack}>
        {/* Draggable goal ring — accent progress over a hairline track, big
            target number + label centered. Subtle FadeInDown on mount. */}
        <Animated.View
          entering={FadeInDown.duration(450)}
          style={styles.arcWrap}
        >
        <View
          style={{ width: GOAL_RING_SIZE, height: GOAL_RING_SIZE }}
          testID="target-weight-arc"
          accessibilityRole="adjustable"
          accessibilityLabel="Target weight"
          accessibilityValue={{
            min: WEIGHT_MIN,
            max: WEIGHT_MAX,
            now: Math.round(target),
            text: `${Math.round(target)} kg`,
          }}
          {...ringPanResponder.panHandlers}
        >
          <StrokeRing
            size={GOAL_RING_SIZE}
            strokeWidth={GOAL_RING_STROKE}
            progress={goalFraction}
            color={tokens.accent}
            trackColor={tokens.hairline}
          >
            <Text style={styles.goalValue} numberOfLines={1}>
              {target > 0 ? Math.round(target) : "—"}
            </Text>
            <Text style={styles.goalUnit} numberOfLines={1}>
              Target kg
            </Text>
          </StrokeRing>
        </View>
        <Text style={styles.dragHint} numberOfLines={1}>
          Drag the ring to set your target
        </Text>
      </Animated.View>

      {/* Current → target readout: plain stats separated by hairlines. */}
      <View>
        <Rule />
        <View style={styles.readoutRow}>
          <Readout
            label="Current"
            value={current > 0 ? `${Math.round(current)}` : "—"}
          />
          <View style={styles.divider} />
          <Readout
            label={
              direction === "gain"
                ? "Gain"
                : direction === "loss"
                  ? "Loss"
                  : "Maintain"
            }
            value={hasGoal ? `${Math.round(Math.abs(delta))} kg` : "—"}
            accent
          />
          <View style={styles.divider} />
          <Readout
            label="Target"
            value={target > 0 ? `${Math.round(target)}` : "—"}
          />
        </View>
        <Rule />
      </View>

      {/* Timeline — slider override; weeks recompute on ring drag above. */}
      <View style={styles.timelineBlock}>
        <View style={styles.timelineLabelRow}>
          <SectionLabel>Timeline</SectionLabel>
          <View style={styles.timelineValueWrap}>
            <Text style={styles.timelineValue} numberOfLines={1}>
              {timeline} weeks
            </Text>
            {timeline > 0 ? (
              <Text style={styles.timelineMilestone} numberOfLines={1}>
                ·  by {milestoneLabel(timeline)}
              </Text>
            ) : null}
          </View>
        </View>
        <RangeSlider
          value={timeline}
          min={WEEKS_MIN}
          max={WEEKS_MAX}
          step={1}
          unit="wk"
          accentColor={tokens.accent}
          onChange={handleTimelineChange}
          testID="timeline-slider"
        />
        {/* Milestone anchor — a concrete date framing ("early Apr 2027") under
            the slider so the weeks value lands emotionally. */}
        {timeline > 0 && Math.abs(delta) > 0.01 ? (
          <Text style={styles.milestoneLine} numberOfLines={1}>
            {direction === "loss"
              ? `You at −${Math.round(Math.abs(delta))} kg, by ${milestoneLabel(timeline)}.`
              : direction === "gain"
                ? `You at +${Math.round(Math.abs(delta))} kg, by ${milestoneLabel(timeline)}.`
                : ""}
          </Text>
        ) : null}
      </View>

      {/* Weekly pace — only meaningful when there is a real delta; a maintain
          goal (delta ≈ 0) is neither safe nor aggressive, so hide the row. */}
      {hasGoal && timeline > 0 && Math.abs(delta) > 0.01 ? (
        <View style={styles.rateRow}>
          <View
            style={[
              styles.rateDot,
              { backgroundColor: isSafeRate ? tokens.accent : tokens.danger },
            ]}
          />
          <Text style={styles.rateText} numberOfLines={2}>
            {weeklyRate.toFixed(2)} kg/week —{" "}
            {isSafeRate
              ? "steady, sustainable pace"
              : "aggressive — we will tune this with your Review"}
          </Text>
        </View>
      ) : null}
      </View>
    </RowGroup>
  );
};

const Readout: React.FC<{
  label: string;
  value: string;
  accent?: boolean;
}> = ({ label, value, accent }) => (
  <View style={styles.readout}>
    <Text style={styles.readoutLabel} numberOfLines={1}>
      {label}
    </Text>
    <Text
      style={[styles.readoutValue, accent ? { color: tokens.accent } : null]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  stack: {
    gap: freshSpacing.l,
  },
  arcWrap: {
    alignItems: "center",
    gap: freshSpacing.m,
    paddingVertical: freshSpacing.s,
  },
  goalValue: {
    fontFamily: font.light,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1,
    color: tokens.ink,
  },
  goalUnit: {
    ...freshType.caption,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: freshSpacing.xs,
  },
  dragHint: {
    ...freshType.caption,
  },
  timelineValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  timelineMilestone: {
    ...freshType.body,
    color: tokens.accent,
  },
  milestoneLine: {
    ...freshType.body,
    color: tokens.ink2,
    marginTop: freshSpacing.xs,
  },
  readoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: freshSpacing.l,
  },
  readout: {
    flex: 1,
    alignItems: "center",
  },
  readoutLabel: {
    ...freshType.caption,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  readoutValue: {
    ...freshType.valueLg,
    marginTop: freshSpacing.xs,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: tokens.hairline,
  },
  timelineBlock: {
    gap: freshSpacing.xs,
  },
  timelineLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  timelineValue: {
    ...freshType.body,
    color: tokens.ink,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: freshSpacing.s,
  },
  rateDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
  },
  rateText: {
    ...freshType.body,
    flex: 1,
  },
});
