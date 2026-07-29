/**
 * GoalTab — S2 "Goal" ("Better than 2026" redesign).
 *
 * The emotional peak — the dream. One focal question: "What do you want to
 * achieve?" Three answer-as-tap inputs:
 *   - Goals: horizontal snap-carousel of big tappable cards (multi-select)
 *   - Direction: derived from the chosen goal, shown as a confirm chip
 *   - Timeline: a RadialDial "weeks" dial (the one dial that earns its place here)
 * Pure black, brand-orange accent.
 *
 * Data wiring UNCHANGED: writes workoutPreferences.primary_goals +
 * target_timeline_weeks (on bodyAnalysis via the parent's onUpdateWorkoutPreferences
 * passthrough on Body/Plan — here we only own primary_goals + a derived timeline
 * stored on workoutPreferences via the existing weekly_weight_loss_goal path is
 * NOT used here; timeline lives on bodyAnalysis.target_timeline_weeks).
 */

import React, { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import {
  colors,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";
import {
  ScreenFrame,
  GoalCarousel,
  RadialDial,
} from "../../../components/onboarding/aurora";
import { FITNESS_GOALS } from "./WorkoutPreferencesConstants";
import { WorkoutPreferencesData } from "../../../types/onboarding";

const ACCENT = colors.primary.DEFAULT;

const GOAL_CARDS = FITNESS_GOALS.map((g) => ({
  id: g.id,
  label: g.title,
  icon: g.iconName,
  subtitle: g.description,
}));

interface GoalTabProps {
  data: WorkoutPreferencesData | null;
  onUpdate: (data: Partial<WorkoutPreferencesData>) => void;
  onNext: () => void;
  onBack: () => void;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

export const GoalTab: React.FC<GoalTabProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
  isEditingFromReview,
  onReturnToReview,
}) => {
  const goals = data?.primary_goals ?? [];

  const toggleGoal = (id: string) => {
    const has = goals.includes(id);
    const next = has ? goals.filter((g) => g !== id) : [...goals, id];
    onUpdate({ primary_goals: next });
  };

  // Derived direction from the first selected goal — shown as a confirm chip.
  const directionLabel = useMemo(() => {
    if (goals.length === 0) return null;
    if (goals.includes("weight-loss")) return "Lose weight";
    if (goals.includes("muscle-gain") || goals.includes("weight-gain")) return "Build muscle";
    if (goals.includes("strength")) return "Get stronger";
    if (goals.includes("endurance")) return "Build endurance";
    return "Get fitter";
  }, [goals]);

  const canAdvance = goals.length > 0;

  return (
    <ScreenFrame
      question="What do you want to achieve?"
      reassurance="We’ll shape everything around this."
      onBack={onBack}
      onNext={onNext}
      nextLabel={isEditingFromReview ? "Review" : "Next"}
      disabled={!canAdvance}
      isEditingFromReview={isEditingFromReview}
      onReturnToReview={onReturnToReview}
      bloomColor={ACCENT}
      testID="onboarding-goal-tab"
    >
      <View>
        <Text style={styles.fieldLabel}>Pick all that apply</Text>
        <GoalCarousel
          options={GOAL_CARDS}
          value={goals}
          onSelect={toggleGoal}
          accentColor={ACCENT}
          testID="onboarding-goal-carousel"
        />
      </View>

      {directionLabel ? (
        <View style={styles.directionRow}>
          <Text style={styles.fieldLabel}>Your direction</Text>
          <View style={styles.directionChip}>
            <Text style={styles.directionChipText}>{directionLabel}</Text>
          </View>
        </View>
      ) : null}
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.fontSize * typography.variants.caption.lineHeight,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  directionRow: {
    marginTop: spacing.sm,
  },
  directionChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,107,53,0.12)",
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  directionChipText: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    color: colors.text.primary,
  },
});

export default GoalTab;
