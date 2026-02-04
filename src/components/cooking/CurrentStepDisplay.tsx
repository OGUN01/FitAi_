import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DayMeal } from "../../types/ai";
import { CookingFlow } from "../../utils/cookingFlowGenerator";
import { mealMotivationService } from "../../features/nutrition/MealMotivation";

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
    <View style={styles.currentStepSection}>
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
          <TouchableOpacity
            style={styles.timerButton}
            onPress={() => onStartTimer(currentStep.timeRequired!)}
          >
            <Ionicons name="timer-outline" size={20} color="#4F46E5" />
            <Text style={styles.timerButtonText}>
              {currentStep.timeRequired}m
            </Text>
          </TouchableOpacity>
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
          <TouchableOpacity onPress={onStopTimer}>
            <Ionicons name="stop-circle" size={32} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  currentStepSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  progressHeader: {
    marginBottom: 16,
  },
  encouragementText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
    textAlign: "center",
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 4,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stepInfo: {
    flex: 1,
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 24,
    marginTop: 4,
  },
  timerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerButtonText: {
    fontSize: 14,
    color: "#4F46E5",
    marginLeft: 4,
  },
  tipsContainer: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  tipText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  activeTimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
  },
  timerDisplay: {
    fontSize: 24,
    fontWeight: "700",
    color: "#D97706",
  },
});
