import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DayMeal } from "../../types/ai";
import { CookingFlow } from "../../utils/cookingFlowGenerator";
import { mealMotivationService } from "../../features/nutrition/MealMotivation";
import { colors } from "../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../utils/responsive";
import { hexToRgba, TINT_ALPHA_LOW } from "../../utils/colors";
import { GlassCard } from "../ui/aurora";
import { AnimatedPressable } from "../ui/aurora";

interface CurrentStepDisplayProps {
  cookingFlow: CookingFlow;
  currentStepIndex: number;
  meal: DayMeal;
  cookingTimer: number | null;
  onStartTimer: (minutes: number) => void;
  onStopTimer: () => void;
  formatTimer: (seconds: number) => string;
  // Steps the user has explicitly marked complete (same Set fed to StepsList's
  // checkmarks and to completionTrackingService.completeMeal's completedSteps
  // payload). Progress here MUST be derived from this, not from
  // currentStepIndex position — otherwise jumping to step 5 via StepsList
  // shows ~100% progress here while the persisted completion is near 0%.
  completedSteps: Set<number>;
}

export default function CurrentStepDisplay({
  cookingFlow,
  currentStepIndex,
  meal,
  cookingTimer,
  onStartTimer,
  onStopTimer,
  formatTimer,
  completedSteps,
}: CurrentStepDisplayProps) {
  if (!cookingFlow || cookingFlow.steps.length === 0) return null;

  const currentStep = cookingFlow.steps[currentStepIndex];
  if (!currentStep) return null;

  const totalSteps = cookingFlow.steps.length;
  const progress = totalSteps > 0 ? (completedSteps.size / totalSteps) * 100 : 0;
  const encouragement = mealMotivationService.getCookingProgressMessage(
    progress,
    meal,
  );

  return (
    <GlassCard
      padding="lg"
      borderRadius="xl"
      showBorder
      style={styles.currentStepSection}
    >
      <View style={styles.progressHeader}>
        <Text
          style={styles.encouragementText}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {encouragement}
        </Text>
        <View
          style={styles.progressBarContainer}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${currentStepIndex + 1} of ${cookingFlow.steps.length}, ${Math.round(progress)} percent complete`}
        >
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      <View style={styles.stepHeader}>
        <View style={styles.stepInfo}>
          <Text
            style={styles.stepCounter}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Step {currentStep.step} of {cookingFlow.steps.length}
          </Text>
          <Text
            style={styles.stepTitle}
          >
            {currentStep.instruction}
          </Text>
        </View>
        {currentStep.timeRequired && (
          <AnimatedPressable
            style={styles.timerButton}
            onPress={() => onStartTimer(currentStep.timeRequired!)}
            scaleValue={0.95}
            springConfig="snappy"
            hapticType="light"
            accessibilityLabel={`Start ${currentStep.timeRequired} minute timer`}
            accessibilityRole="button"
          >
            <Ionicons
              name="timer-outline"
              size={20}
              color={colors.primary.DEFAULT}
            />
            <Text style={styles.timerButtonText} numberOfLines={1}>
              {currentStep.timeRequired}m
            </Text>
          </AnimatedPressable>
        )}
      </View>

      {currentStep.tips && (
        <View style={styles.tipsContainer}>
          <View style={styles.tipRow}>
            <Ionicons name="bulb-outline" size={rf(16)} color={colors.warning.DEFAULT} style={styles.tipIcon} />
            <Text
              style={styles.tipText}
            >
              {currentStep.tips}
            </Text>
          </View>
        </View>
      )}

      {cookingTimer !== null && (
        <View style={styles.activeTimer}>
          <Text style={styles.timerDisplay}>{formatTimer(cookingTimer)}</Text>
          <AnimatedPressable
            onPress={onStopTimer}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Stop timer"
            accessibilityRole="button"
          >
            <Ionicons name="stop-circle" size={32} color={colors.error.DEFAULT} />
          </AnimatedPressable>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  currentStepSection: {
    marginHorizontal: rp(16),
    marginBottom: rp(16),
    borderColor: colors.primary.DEFAULT,
    borderWidth: 1,
  },
  progressHeader: {
    marginBottom: rp(16),
  },
  encouragementText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.primary.DEFAULT,
    textAlign: "center",
    marginBottom: rp(12),
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: rbr(4),
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: rbr(4),
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(12),
  },
  stepInfo: {
    flex: 1,
    minWidth: 0,
  },
  stepCounter: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.primary.DEFAULT,
  },
  stepTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: colors.text.primary,
    lineHeight: rf(24),
    marginTop: rp(4),
  },
  timerButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Math.max(rp(44), 44),
    justifyContent: "center",
    backgroundColor: hexToRgba(colors.primary.DEFAULT, TINT_ALPHA_LOW + 0.08),
    paddingHorizontal: rp(12),
    paddingVertical: rp(10),
    borderRadius: rbr(16),
    marginLeft: rp(8),
  },
  timerButtonText: {
    fontSize: rf(14),
    color: colors.primary.DEFAULT,
    marginLeft: rp(4),
  },
  tipsContainer: {
    backgroundColor: hexToRgba(colors.warning.DEFAULT, TINT_ALPHA_LOW + 0.08),
    padding: rp(12),
    borderRadius: rbr(8),
    marginTop: rp(12),
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipIcon: {
    marginTop: rp(2),
    marginRight: rp(6),
  },
  tipText: {
    flex: 1,
    fontSize: rf(14),
    color: colors.text.secondary,
    lineHeight: rf(20),
  },
  activeTimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: rp(16),
    padding: rp(12),
    backgroundColor: hexToRgba(colors.warning.DEFAULT, TINT_ALPHA_LOW + 0.08),
    borderRadius: rbr(8),
  },
  timerDisplay: {
    fontSize: rf(24),
    fontWeight: "700",
    color: colors.warning.DEFAULT,
  },
});
