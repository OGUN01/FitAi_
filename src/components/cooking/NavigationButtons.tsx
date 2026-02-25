import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CookingFlow } from "../../utils/cookingFlowGenerator";
import { colors } from "../../theme/aurora-tokens";

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
          color={currentStepIndex === 0 ? colors.text.disabled : "#FFFFFF"}
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
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.tertiary,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  disabledButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  finishButton: {
    backgroundColor: colors.success.DEFAULT,
  },
  completeStepButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  completedStepButton: {
    backgroundColor: colors.success.DEFAULT,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginHorizontal: 4,
  },
  disabledButtonText: {
    color: colors.text.disabled,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});
