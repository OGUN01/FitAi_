/**
 * BuilderSummaryFooter (diet variant) — floating flat footer, sticky at the
 * bottom of MealBuilderScreen.
 *
 * Rather than clone the workout footer's generic 3-stat row, reuses the diet
 * screen's own established nutrition-summary shape (CompactIntakeSummary's
 * progress bar + "Planned kcal / Daily target") relabeled for planning
 * instead of consumption, with the macro mini-readouts beneath.
 *
 * Two actions:
 *  - Save Diet Plan — wires the currently-unused CheckmarkMorph component
 *    into the success moment.
 *  - Save & Activate — saves, then immediately calls
 *    setActiveDietSource('custom') so the user doesn't have to hunt for the
 *    toggle elsewhere.
 */
import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { CheckmarkMorph } from "../../fitness/builder/CheckmarkMorph";
import { getIntakeSummary } from "../dietViewModel";
import { haptics } from "../../../utils/haptics";
import { colors, surface, border, spacing, borderRadius, typography } from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";

export interface BuilderSummaryFooterProps {
  plannedCalories: number;
  targetCalories: number;
  mealCount: number;
  onSave: () => Promise<void>;
  onSaveAndActivate: () => Promise<void>;
  hasContent: boolean;
  testID?: string;
}

const tabularNums: TextStyle = { fontVariant: ["tabular-nums"] };

export const BuilderSummaryFooter: React.FC<BuilderSummaryFooterProps> = ({
  plannedCalories,
  targetCalories,
  mealCount,
  onSave,
  onSaveAndActivate,
  hasContent,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [savingAndActivating, setSavingAndActivating] = useState(false);
  const [checkmarkTrigger, setCheckmarkTrigger] = useState(false);
  const saveInFlightRef = useRef(false);

  const { percent, remaining } = getIntakeSummary(plannedCalories, targetCalories);
  const isOverTarget = remaining < 0;

  const handleSave = useCallback(async () => {
    if (!hasContent || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      await onSave();
      setCheckmarkTrigger(true);
      setTimeout(() => setCheckmarkTrigger(false), 1200);
    } catch (error) {
      console.error("[BuilderSummaryFooter] save failed:", error);
      haptics.error();
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }, [hasContent, onSave]);

  const handleSaveAndActivate = useCallback(async () => {
    if (!hasContent || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSavingAndActivating(true);
    try {
      await onSaveAndActivate();
      setCheckmarkTrigger(true);
      setTimeout(() => setCheckmarkTrigger(false), 1200);
    } catch (error) {
      console.error("[BuilderSummaryFooter] save & activate failed:", error);
      haptics.error();
    } finally {
      saveInFlightRef.current = false;
      setSavingAndActivating(false);
    }
  }, [hasContent, onSaveAndActivate]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || rp(spacing.md) }]} testID={testID}>
      <View style={styles.card}>
        <View style={styles.headingRow}>
          <Text style={styles.title}>Planned kcal</Text>
          <Text style={[styles.percent, isOverTarget && styles.percentOver]}>{percent}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, isOverTarget && styles.fillOver, { width: `${percent}%` }]} />
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {Math.round(plannedCalories)} / {Math.round(targetCalories) || "—"} kcal
          </Text>
          <Text style={styles.statText}>
            {mealCount} meal{mealCount !== 1 ? "s" : ""} today
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <GlassButton
            label={saving ? "Saving…" : "Save Diet Plan"}
            icon="checkmark-circle-outline"
            onPress={handleSave}
            disabled={!hasContent || saving || savingAndActivating}
            loading={saving}
            variant="success"
            hapticType="heavy"
            style={styles.saveBtn}
            testID={`${testID ?? "diet-footer"}-save`}
          />
          <GlassButton
            label={savingAndActivating ? "Activating…" : "Save & Activate"}
            icon="flash-outline"
            onPress={handleSaveAndActivate}
            disabled={!hasContent || saving || savingAndActivating}
            loading={savingAndActivating}
            variant="primary"
            hapticType="heavy"
            style={styles.saveBtn}
            testID={`${testID ?? "diet-footer"}-save-activate`}
          />
        </View>
      </View>

      {checkmarkTrigger && (
        <View style={styles.checkmarkWrap} pointerEvents="none">
          <CheckmarkMorph trigger={checkmarkTrigger} size={40} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
    zIndex: 1100,
  },
  card: {
    backgroundColor: surface[1],
    borderTopWidth: 1,
    borderTopColor: border.subtle,
    borderRadius: borderRadius.xl,
    padding: rp(spacing.md),
    gap: rp(spacing.xs),
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  percent: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
    ...tabularNums,
  },
  percentOver: { color: colors.error.DEFAULT },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: surface[2],
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3, backgroundColor: colors.primary.DEFAULT },
  fillOver: { backgroundColor: colors.error.DEFAULT },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    ...tabularNums,
  },
  actionsRow: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    marginTop: rp(spacing.xs),
  },
  saveBtn: {
    flex: 1,
  },
  checkmarkWrap: {
    position: "absolute",
    top: -20,
    right: rp(spacing.lg),
  },
});

export default BuilderSummaryFooter;
