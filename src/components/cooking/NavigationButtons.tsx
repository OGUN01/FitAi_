import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CookingFlow } from "../../utils/cookingFlowGenerator";

interface NavigationButtonsProps {
  cookingFlow: CookingFlow | null;
  currentStepIndex: number;
  completedSteps: Set<number>;
  onPrevious: () => void;
  onToggleComplete: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export default function NavigationButtons({
  cookingFlow,
  currentStepIndex,
  completedSteps,
  onPrevious,
  onToggleComplete,
  onNext,
  onFinish,
}: NavigationButtonsProps) {
  if (!cookingFlow) return null;

  const isLastStep = currentStepIndex === cookingFlow.steps.length - 1;
  const isCurrentStepCompleted = completedSteps.has(currentStepIndex);

  return (
    <View style={styles.navigationSection}>
      <TouchableOpacity
        style={[
          styles.navButton,
          currentStepIndex === 0 && styles.disabledButton,
        ]}
        onPress={onPrevious}
        disabled={currentStepIndex === 0}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={currentStepIndex === 0 ? "#9CA3AF" : "#FFFFFF"}
        />
        <Text
          style={[
            styles.navButtonText,
            currentStepIndex === 0 && styles.disabledButtonText,
          ]}
        >
          Previous
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.completeStepButton,
          isCurrentStepCompleted && styles.completedStepButton,
        ]}
        onPress={onToggleComplete}
      >
        <Ionicons
          name={
            isCurrentStepCompleted
              ? "checkmark-circle"
              : "checkmark-circle-outline"
          }
          size={24}
          color="#FFFFFF"
        />
        <Text style={styles.completeButtonText}>
          {isCurrentStepCompleted ? "Step Done ✓" : "Mark Complete"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, isLastStep && styles.finishButton]}
        onPress={isLastStep ? onFinish : onNext}
      >
        <Text style={styles.navButtonText}>
          {isLastStep ? "🎉 Finish Cooking" : "Next Step"}
        </Text>
        <Ionicons
          name={isLastStep ? "checkmark" : "chevron-forward"}
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6B7280",
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  disabledButton: {
    backgroundColor: "#F3F4F6",
  },
  finishButton: {
    backgroundColor: "#10B981",
  },
  completeStepButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  completedStepButton: {
    backgroundColor: "#10B981",
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginHorizontal: 4,
  },
  disabledButtonText: {
    color: "#9CA3AF",
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});
