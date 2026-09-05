/**
 * GoalImpactPanel — the workout-builder mirror of the diet side's
 * `NutritionInsightsPanel` (Phase B).
 *
 * Shows what the in-memory draft actually produces, recomputed LIVE on every
 * edit — never a save round-trip:
 *   - planned burn/day (PLAN_BURN from computeEnergyBreakdown)
 *   - the resulting weekly rate
 *   - the projection sentence (range/deferred rules from projectGoal)
 *   - the gap against the goal target (goalTdee vs effectiveTdee)
 *   - unresolvedExerciseIds surfaced as a warning row rather than silently
 *     priced at 0
 *
 * LIVE PREVIEW WIRING (the no-save-round-trip requirement):
 * The panel subscribes to `workoutBuilderStore.draft` and the user's current
 * weight, then calls `computeEnergyBreakdown` + `projectGoal` directly inside a
 * `useMemo` over the draft. Because the store mutates `draft` synchronously on
 * every set/rep/cardio edit (addExercise / updateExercise / addCardioBlock …),
 * the `draft` reference changes and the memo recomputes immediately — the burn
 * number moves the instant a user retypes a set's reps, exactly the way
 * `dietBuilderStore.recomputeMealTotals` updates macro totals on every item
 * mutation. There is no `saveCustomWeeklyPlan` / debounced-autosave gate in this
 * path.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import { computeEnergyBreakdown, CALORIE_PER_KG } from "../../../services/energy/energyModel";
import {
  projectGoal,
  type GoalDirection,
} from "../../../services/energy/projection";
import { RATE_BAND_THRESHOLDS, type RateBand } from "../../../services/energy/constants";
import { resolveExerciseMeta } from "../../../utils/resolveExerciseMeta";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";

// ----------------------------------------------------------------------------
// PROPS
// ----------------------------------------------------------------------------

export interface GoalImpactPanelProps {
  /** Current body weight in kg (single source of truth — profile/bodyAnalysis).
   *  Required for the burn calc; null/0 hides the panel's numbers. */
  weightKg: number | null;
  /** Profile slice needed by computeEnergyBreakdown. All nullable — when any
   *  required field is missing the panel renders a "set up your profile"
   *  placeholder instead of fake numbers (CLAUDE.md §8: no hardcoded
   *  fallbacks for user data). */
  profile: {
    heightCm: number | null;
    age: number | null;
    gender: string | null;
    activityLevel: string | null;
  };
  /** Onboarding intent (for goalTdee — the frozen onboarding number). */
  intent: {
    workoutFrequencyPerWeek: number;
    timePreference: number;
    intensity: string;
    workoutTypes: string[];
  };
  /** Goal target (for the gap line + projection). */
  goal: {
    targetWeightKg: number | null;
    primaryGoals: string[] | null;
  };
  /** Planned daily intake kcal — the OTHER lever in the gap. For a workout-only
   *  builder preview this is the goal-derived daily calorie target (the diet
   *  side owns the live intake number); null → gap uses effectiveTdee alone. */
  plannedIntakeKcal: number | null;
  testID?: string;
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

const fw = (
  w: (typeof typography.fontWeight)[keyof typeof typography.fontWeight],
): TextStyle["fontWeight"] => String(w) as TextStyle["fontWeight"];

function resolveGoalDirection(primaryGoals: string[]): GoalDirection {
  const hasLoss = primaryGoals.includes("weight-loss");
  const hasGain = primaryGoals.includes("weight-gain");
  if (hasLoss && !hasGain) return "loss";
  if (hasGain && !hasLoss) return "gain";
  return "maintain";
}

/** Classify the rate band from the shared constants — same thresholds as
 *  evaluatePlanSafety.classifyRateBand. Maintenance is always 'safe'. */
function classifyRateBand(
  weeklyRateKg: number,
  weightKg: number,
  goalDirection: GoalDirection,
): RateBand {
  if (goalDirection === "maintain") return "safe";
  const absRate = Math.abs(weeklyRateKg);
  const bodyFraction = weightKg > 0 ? absRate / weightKg : 0;
  if (bodyFraction <= RATE_BAND_THRESHOLDS.safe) return "safe";
  if (bodyFraction <= RATE_BAND_THRESHOLDS.unpredictable) return "aggressive";
  return "unpredictable";
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const tabularNums: TextStyle = { fontVariant: ["tabular-nums"] };

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const GoalImpactPanel: React.FC<GoalImpactPanelProps> = ({
  weightKg,
  profile,
  intent,
  goal,
  plannedIntakeKcal,
  testID,
}) => {
  // ── Subscribe to the in-memory draft (LIVE — no save round-trip) ──
  const draft = useWorkoutBuilderStore((s) => s.draft);
  const isComputingInsights = useWorkoutBuilderStore((s) => s.isComputingInsights);

  // ── Compute the energy breakdown + projection directly from the draft ──
  // Recomputes whenever `draft` changes (every set/rep/cardio mutation writes a
  // new draft reference) or any profile/intake prop changes. No save gate.
  const result = useMemo(() => {
    if (
      !draft ||
      !weightKg ||
      weightKg <= 0 ||
      !profile.heightCm ||
      !profile.age ||
      !profile.gender ||
      !profile.activityLevel
    ) {
      return null;
    }
    try {
      const energy = computeEnergyBreakdown({
        weightKg,
        heightCm: profile.heightCm,
        age: profile.age,
        gender: profile.gender,
        activityLevel: profile.activityLevel,
        workoutFrequencyPerWeek: intent.workoutFrequencyPerWeek,
        timePreference: intent.timePreference,
        intensity: intent.intensity,
        workoutTypes: intent.workoutTypes,
        plan: draft,
      });

      const primaryGoals = goal.primaryGoals ?? [];
      const goalDirection = resolveGoalDirection(primaryGoals);
      // For the gap we use the goal-derived daily intake when the diet side
      // hasn't handed us a live one; that keeps the rate honest about the
      // workout's contribution without inventing a fake intake.
      const intake = plannedIntakeKcal ?? energy.goalTdee;
      const weeklyRateKg =
        ((energy.effectiveTdee - intake) * 7) / CALORIE_PER_KG;
      const rateBand = classifyRateBand(weeklyRateKg, weightKg, goalDirection);

      const projection = projectGoal({
        effectiveTdee: energy.effectiveTdee,
        plannedIntake: intake,
        currentWeightKg: weightKg,
        targetWeightKg: goal.targetWeightKg ?? weightKg,
        goalDirection,
        rateBand,
      });

      return { energy, projection, weeklyRateKg, goalDirection, intake };
    } catch {
      return null;
    }
  }, [
    draft,
    weightKg,
    profile.heightCm,
    profile.age,
    profile.gender,
    profile.activityLevel,
    intent.workoutFrequencyPerWeek,
    intent.timePreference,
    intent.intensity,
    intent.workoutTypes,
    goal.primaryGoals,
    goal.targetWeightKg,
    plannedIntakeKcal,
  ]);

  // ── Resolve unresolved exercise names (DB → curated) for the warning row ──
  const unresolvedNames = useMemo(() => {
    const ids = result?.energy.unresolvedExerciseIds ?? [];
    return ids.map((id) => {
      const meta = resolveExerciseMeta(id);
      return meta.name ?? id;
    });
  }, [result?.energy.unresolvedExerciseIds]);

  // ── Projection sentence (range/deferred rules) ──
  const { sentence, isWarning } = useMemo(() => {
    if (!result) return { sentence: "", isWarning: false };
    const { projection, goalDirection } = result;
    if (goalDirection === "maintain") {
      return { sentence: "This plan is set to maintain your current weight.", isWarning: false };
    }
    if (projection.etaEarliest && projection.etaLatest) {
      return {
        sentence: `At this pace, you'll reach your goal weight by ${formatMonthYear(projection.etaEarliest)} – ${formatMonthYear(projection.etaLatest)}.`,
        isWarning: false,
      };
    }
    if (projection.etaEarliest) {
      return {
        sentence: `At this pace, you'll reach your goal weight by ${formatMonthYear(projection.etaEarliest)}.`,
        isWarning: false,
      };
    }
    // No date — projectGoal.label carries the honest deferred/no-progress copy.
    return { sentence: projection.label, isWarning: projection.band !== "safe" };
  }, [result]);

  if (!result) {
    return (
      <View style={styles.container} testID={testID}>
        <Animated.View entering={FadeInDown.springify()} style={styles.placeholderCard}>
          <Ionicons name="trending-up-outline" size={rf(20)} color={colors.text.tertiary} />
          <Text style={styles.placeholderText}>
            Add your profile details and build a workout to see your goal impact.
          </Text>
        </Animated.View>
      </View>
    );
  }

  const burnPerDay = result.energy.planBurnPerDay;
  const gapKcal = result.energy.effectiveTdee - result.energy.goalTdee;
  const rateKg = result.weeklyRateKg;
  const rateLabel = `${Math.abs(rateKg).toFixed(2)} kg/wk ${rateKg >= 0 ? "loss" : "gain"}`;
  const bandColor =
    result.projection.band === "safe"
      ? colors.success.DEFAULT
      : result.projection.band === "aggressive"
        ? colors.warning.DEFAULT
        : colors.error.DEFAULT;

  return (
    <View style={styles.container} testID={testID}>
      {/* Goal projection — hero sentence, no card */}
      <Animated.View entering={FadeInDown.springify()} style={styles.heroSection}>
        <View style={styles.heroHeader}>
          <Ionicons
            name={isWarning ? "warning-outline" : "trending-up-outline"}
            size={rf(16)}
            color={isWarning ? colors.warning.DEFAULT : colors.primary.DEFAULT}
          />
          <Text style={styles.heroEyebrow}>GOAL IMPACT</Text>
          {isComputingInsights && <AuroraSpinner customSize={rf(12)} theme="primary" />}
        </View>
        <Text style={[styles.heroSentence, isWarning && { color: colors.warning.DEFAULT }]}>
          {sentence}
        </Text>
      </Animated.View>

      {/* Stat row — planned burn / day, resulting rate, gap vs goal target */}
      <Animated.View entering={FadeInDown.springify().delay(80)} style={styles.card}>
        <View style={styles.statsRow}>
          <BurnStat
            icon="flame-outline"
            label="Burn / day"
            value={`${Math.round(burnPerDay)}`}
            unit="kcal"
            valueColor={burnPerDay > 0 ? colors.primary.DEFAULT : colors.text.tertiary}
          />
          <BurnStat
            icon="speedometer-outline"
            label="Resulting rate"
            value={rateLabel.split(" ")[0]}
            unit={rateLabel.split(" ").slice(1).join(" ")}
            valueColor={bandColor}
          />
          <BurnStat
            icon="swap-vertical-outline"
            label="Gap vs goal"
            value={`${gapKcal >= 0 ? "+" : ""}${Math.round(gapKcal)}`}
            unit="kcal/d"
            valueColor={
              Math.abs(gapKcal) < 1
                ? colors.success.DEFAULT
                : gapKcal > 0
                  ? colors.primary.DEFAULT
                  : colors.warning.DEFAULT
            }
          />
        </View>

        {/* Effective TDEE vs goal TDEE detail line */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Effective TDEE</Text>
          <Text style={styles.detailValue}>
            {Math.round(result.energy.effectiveTdee)} kcal
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Goal TDEE (onboarding intent)</Text>
          <Text style={styles.detailValue}>
            {Math.round(result.energy.goalTdee)} kcal
          </Text>
        </View>
      </Animated.View>

      {/* Unresolved exercises warning row — surfaced, never silently zeroed */}
      {unresolvedNames.length > 0 && (
        <Animated.View entering={FadeInDown.springify().delay(160)} style={styles.warnCard}>
          <View style={styles.warnHeader}>
            <Ionicons name="alert-circle-outline" size={rf(16)} color={colors.warning.DEFAULT} />
            <Text style={styles.warnTitle}>
              {unresolvedNames.length} exercise{unresolvedNames.length > 1 ? "s" : ""} not priced
            </Text>
          </View>
          <Text style={styles.warnBody}>
            These weren't matched to a known calorie estimate and contribute 0 burn — the
            number above may undercount the real plan. Tap to replace with a recognised exercise:
            {unresolvedNames.map((n) => ` ${n}`).join(",")}.
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

// ── BurnStat sub-component ──────────────────────────────────────────────────
const BurnStat: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit: string;
  valueColor: string;
}> = ({ icon, label, value, unit, valueColor }) => (
  <View style={styles.statCell}>
    <Ionicons name={icon} size={rf(16)} color={colors.text.secondary} />
    <Text style={[styles.statValue, { color: valueColor }]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.statUnit} numberOfLines={1}>
      {unit}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { marginVertical: rp(spacing.sm) },
  heroSection: {
    paddingHorizontal: rp(spacing.sm),
    marginBottom: rp(spacing.md),
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  heroEyebrow: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.bold),
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroSentence: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.semibold),
    lineHeight: rf(typography.fontSize.h3) * 1.35,
  },
  card: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: rp(spacing.md),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.md),
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: rp(2),
    minHeight: Math.max(rp(44), 44),
    justifyContent: "center",
  },
  statValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.bold),
    ...tabularNums,
  },
  statUnit: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    ...tabularNums,
  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rp(spacing.xs),
    borderTopWidth: 1,
    borderTopColor: border.subtle,
  },
  detailLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
  },
  detailValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    ...tabularNums,
  },
  warnCard: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
    padding: rp(spacing.md),
    marginTop: rp(spacing.sm),
  },
  warnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  warnTitle: {
    color: colors.warning.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
  },
  warnBody: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
  },
  placeholderCard: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: rp(spacing.md),
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  placeholderText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
  },
});

export default GoalImpactPanel;
