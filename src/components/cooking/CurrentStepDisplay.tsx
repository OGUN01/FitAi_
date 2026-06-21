import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DayMeal } from "../../types/ai";
import { CookingFlow } from "../../utils/cookingFlowGenerator";
import { mealMotivationService } from "../../features/nutrition/MealMotivation";
import { colors } from "../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../utils/responsive";
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
}

export default function CurrentStepDisplay({
  cookingFlow,
  currentStepIndex,
  meal,
  cookingTimer,
  onStartTimer,
  onStopTimer,
  formatTimer,
}: CurrentStepDisplayProps) {
  if (!cookingFlow || cookingFlow.steps.length === 0) return null;

  const currentStep = cookingFlow.steps[currentStepIndex];
  if (!currentStep) return null;

  const progress = ((currentStepIndex + 1) / cookingFlow.steps.length) * 100;
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
        <Text style={styles.encouragementText}>{encouragement}</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      <View style={styles.stepHeader}>
        <View style={styles.stepInfo}>
          <Text style={styles.stepCounter}>
            {currentStep.icon} Step {currentStep.step} of{" "}
            {cookingFlow.steps.length}
          </Text>
          <Text style={styles.stepTitle}>{currentStep.instruction}</Text>
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
            <Text style={styles.timerButtonText}>
              {currentStep.timeRequired}m
            </Text>
          </AnimatedPressable>
        )}
      </View>

      {currentStep.tips && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipText}>💡 {currentStep.tips}</Text>
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
    borderWidth: 2,
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
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    paddingHorizontal: rp(12),
    paddingVertical: rp(6),
    borderRadius: rbr(16),
  },
  timerButtonText: {
    fontSize: rf(14),
    color: colors.primary.DEFAULT,
    marginLeft: rp(4),
  },
  tipsContainer: {
    backgroundColor: "rgba(255, 152, 0, 0.12)",
    padding: rp(12),
    borderRadius: rbr(8),
    marginTop: rp(12),
  },
  tipText: {
    fontSize: rf(14),
    color: colors.warning.DEFAULT,
    lineHeight: rf(20),
  },
  activeTimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: rp(16),
    padding: rp(12),
    backgroundColor: "rgba(255, 152, 0, 0.12)",
    borderRadius: rbr(8),
  },
  timerDisplay: {
    fontSize: rf(24),
    fontWeight: "700",
    color: colors.warning.DEFAULT,
  },
});
