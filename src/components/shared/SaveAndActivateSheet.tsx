/**
 * SaveAndActivateSheet — shared Save & Activate sheet for BOTH the diet and
 * workout builders (Phase B).
 *
 * Carries:
 *   1. The targets_mode toggle — "keep my goal targets (show the gap)" vs
 *      "make this plan my target". ONE shared toggle (profiles.goal_targets_mode,
 *      'goal' | 'plan') — applies to BOTH diet and workout, never per-domain.
 *      The toggle persists via nutritionStore.setGoalTargetsMode (offline queue
 *      → profiles.goal_targets_mode), and resets to 'goal' automatically when
 *      setActiveDietSource('ai') or setActivePlanSource('ai') fires (reset rule).
 *   2. The food-floor gate — when the plan's intake is below the safe floor
 *      (max(BMR, 1500 M / 1200 F) + pregnancy bonus), Save & Activate is
 *      DISABLED and the sheet shows the shortfall plus the two ways to close
 *      it (add food, or add burn). Below-floor plans still save as drafts —
 *      "Save as Draft" is always available.
 *
 * The sheet only collects the decision; the caller owns the actual
 * save + setActiveSource + setGoalTargetsMode write (single source of truth
 * lives in the stores, not here).
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DetentBottomSheet } from "../ui/aurora/DetentBottomSheet";
import { GlassButton } from "../ui/aurora/GlassButton";
import { haptics } from "../../utils/haptics";
import { hexToRgba } from "../../utils/colors";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
  errorText,
} from "../../theme/aurora-tokens";
import { rp, rf } from "../../utils/responsive";

/** Shared target-source mode. Mirrors profiles.goal_targets_mode
 *  ('goal' | 'plan'). Defined locally (not imported from onboarding types) —
 *  the toggle is a shared profile-level field, not an onboarding field. */
export type SaveTargetsMode = "goal" | "plan";

// ----------------------------------------------------------------------------
// PROPS
// ----------------------------------------------------------------------------

export interface SaveAndActivateSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Current shared toggle value (from nutritionStore.goalTargetsMode). */
  targetsMode: "goal" | "plan";
  /** User picked a targets mode in the sheet (not yet persisted — the caller
   *  commits it together with activation via setGoalTargetsMode). */
  onTargetsMode: (mode: "goal" | "plan") => void;
  /** True when the plan's intake is below the safe food floor. */
  foodFloorBlocked: boolean;
  /** kcal below the floor (0 when OK). */
  foodFloorShortfall: number;
  /** The floor value itself, for the copy. */
  foodFloorKcal: number | null;
  /** "Save & Activate" — the caller saves + activates + persists targetsMode. */
  onActivate: () => void;
  /** Busy flag while activation runs. */
  activating?: boolean;
  /** Which side is activating — drives the copy. */
  planKind: "diet" | "workout";
  testID?: string;
}

const fw = (
  w: (typeof typography.fontWeight)[keyof typeof typography.fontWeight],
): TextStyle["fontWeight"] => String(w) as TextStyle["fontWeight"];

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const SaveAndActivateSheet: React.FC<SaveAndActivateSheetProps> = ({
  visible,
  onClose,
  targetsMode,
  onTargetsMode,
  foodFloorBlocked,
  foodFloorShortfall,
  foodFloorKcal,
  onActivate,
  activating = false,
  planKind,
  testID,
}) => {
  const blocked = foodFloorBlocked && foodFloorShortfall > 0;

  return (
    <DetentBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.62, 0.85]}
      initialSnapIndex={0}
      testID={testID ?? "save-activate-sheet"}
    >
      <Text style={styles.eyebrow}>SAVE & ACTIVATE</Text>
      <Text style={styles.title}>How should targets follow this {planKind === "diet" ? "meal plan" : "schedule"}?</Text>
      <Text style={styles.message}>
        One shared setting for your diet and workout targets.
      </Text>

      {/* ── targets_mode toggle ── */}
      <View style={styles.toggleGroup}>
        <Pressable
          onPress={() => {
            onTargetsMode("goal");
            haptics.selection();
          }}
          accessibilityRole="radio"
          accessibilityLabel="Keep my goal targets, showing the gap"
          accessibilityState={{ selected: targetsMode === "goal" }}
          style={[styles.toggleRow, targetsMode === "goal" && styles.toggleRowSelected]}
          testID={`${testID ?? "save-activate"}-toggle-goal`}
        >
          <View style={styles.radioOuter}>
            {targetsMode === "goal" && <View style={styles.radioInner} />}
          </View>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Keep my goal targets</Text>
            <Text style={styles.toggleSub}>
              Show the gap between this plan and what your goal needs.
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            onTargetsMode("plan");
            haptics.selection();
          }}
          accessibilityRole="radio"
          accessibilityLabel="Make this plan my target"
          accessibilityState={{ selected: targetsMode === "plan" }}
          style={[styles.toggleRow, targetsMode === "plan" && styles.toggleRowSelected]}
          testID={`${testID ?? "save-activate"}-toggle-plan`}
        >
          <View style={styles.radioOuter}>
            {targetsMode === "plan" && <View style={styles.radioInner} />}
          </View>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Make this plan my target</Text>
            <Text style={styles.toggleSub}>
              Daily targets come from this plan; empty days fall back to your goal.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ── Food-floor gate ── */}
      {blocked && (
        <View style={styles.gateCard} testID={`${testID ?? "save-activate"}-floor-gate`}>
          <View style={styles.gateHeader}>
            <Ionicons name="alert-circle" size={rf(18)} color={colors.error.DEFAULT} />
            <Text style={styles.gateTitle}>
              {Math.round(foodFloorShortfall)} kcal/day below your safe floor
            </Text>
          </View>
          <Text style={styles.gateBody}>
            This plan is below your minimum safe intake
            {foodFloorKcal != null ? ` (${Math.round(foodFloorKcal)} kcal/day)` : ""}.
            Close the gap one of two ways:
          </Text>
          <View style={styles.gateOption}>
            <Ionicons name="restaurant-outline" size={rf(14)} color={colors.text.secondary} />
            <Text style={styles.gateOptionText}>
              Add food — raise the plan's calories to the floor.
            </Text>
          </View>
          <View style={styles.gateOption}>
            <Ionicons name="flame-outline" size={rf(18)} color={colors.primary.DEFAULT} />
            <Text style={styles.gateOptionText}>
              Add burn — schedule more training so the deficit closes without cutting food further.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <GlassButton
          label="Save as Draft"
          onPress={onClose}
          variant="secondary"
          hapticType="light"
          style={styles.actionBtn}
          testID={`${testID ?? "save-activate"}-draft`}
        />
        <GlassButton
          label={activating ? "Activating…" : "Save & Activate"}
          icon="flash-outline"
          onPress={onActivate}
          disabled={blocked || activating}
          loading={activating}
          variant="primary"
          hapticType="heavy"
          style={styles.activateBtn}
          testID={`${testID ?? "save-activate"}-confirm`}
        />
      </View>

      {blocked && (
        <Text style={styles.blockedHint}>
          Below-floor plans save as drafts. Activate once the shortfall is closed.
        </Text>
      )}
    </DetentBottomSheet>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: rf(11),
    fontWeight: fw(typography.fontWeight.bold),
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.bold),
    color: colors.text.primary,
    marginTop: rp(spacing.xs),
    lineHeight: rf(typography.fontSize.h3) * 1.2,
  },
  message: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
    marginTop: rp(spacing.xs),
    marginBottom: rp(spacing.sm),
  },
  toggleGroup: {
    gap: rp(spacing.xs),
    marginVertical: rp(spacing.sm),
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rp(spacing.sm),
    padding: rp(spacing.sm),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: surface[1],
    minHeight: 56,
  },
  toggleRowSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.08),
  },
  radioOuter: {
    width: rf(18),
    height: rf(18),
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: rp(2),
  },
  radioInner: {
    width: rf(8),
    height: rf(8),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
  },
  toggleText: {
    flex: 1,
    gap: rp(2),
  },
  toggleTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  toggleSub: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.normal,
  },
  gateCard: {
    backgroundColor: hexToRgba(colors.error.DEFAULT, 0.08),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error.DEFAULT,
    padding: rp(spacing.md),
    marginBottom: rp(spacing.md),
  },
  gateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  gateTitle: {
    color: colors.error.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
  },
  gateBody: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.normal,
    marginBottom: rp(spacing.sm),
  },
  gateOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  gateOptionText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.normal,
  },
  actions: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    marginTop: rp(spacing.sm),
  },
  actionBtn: {
    flex: 1,
  },
  activateBtn: {
    flex: 1,
  },
  blockedHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    textAlign: "center",
    marginTop: rp(spacing.sm),
  },
});

export default SaveAndActivateSheet;
