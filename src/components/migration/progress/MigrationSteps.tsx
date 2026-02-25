import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationStepInfo } from "../../../hooks/useMigrationProgress";

interface MigrationStepsProps {
  steps: MigrationStepInfo[];
  currentStepIndex: number;
  stepAnimations: Animated.Value[];
}

export const MigrationSteps: React.FC<MigrationStepsProps> = ({
  steps,
  currentStepIndex,
  stepAnimations,
}) => {
  return (
    <View style={styles.stepsContainer}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isUpcoming = index > currentStepIndex;

        return (
          <Animated.View
            key={step.name}
            style={[
              styles.stepItem,
              {
                opacity: stepAnimations[index],
                transform: [
                  {
                    scale: isCurrent
                      ? stepAnimations[index]
                      : isCompleted
                        ? 1
                        : 0.8,
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.stepIcon,
                isCompleted && styles.stepIconCompleted,
                isCurrent && styles.stepIconCurrent,
                isUpcoming && styles.stepIconUpcoming,
              ]}
            >
              <Ionicons
                name={isCompleted ? "checkmark" : (step.icon as any)}
                size={20}
                color={
                  isCompleted ? "#10B981" : isCurrent ? "#E55A2B" : "#6B7280"
                }
              />
            </View>
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepTitle,
                  isCompleted && styles.stepTitleCompleted,
                  isCurrent && styles.stepTitleCurrent,
                ]}
              >
                {step.title}
              </Text>
              <Text
                style={[
                  styles.stepDescription,
                  isCurrent && styles.stepDescriptionCurrent,
                ]}
              >
                {step.description}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  stepsContainer: {
    marginBottom: 30,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 2,
  },
  stepIconCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "#10B981",
  },
  stepIconCurrent: {
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    borderColor: "#E55A2B",
  },
  stepIconUpcoming: {
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    borderColor: "#6B7280",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  stepTitleCompleted: {
    color: "#10B981",
  },
  stepTitleCurrent: {
    color: "#FFFFFF",
  },
  stepDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
  stepDescriptionCurrent: {
    color: "#9CA3AF",
  },
});
