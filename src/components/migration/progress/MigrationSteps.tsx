import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationStepInfo } from "../../../hooks/useMigrationProgress";
import { rf, rp, rbr } from "../../../utils/responsive";
import { flatColors as colors } from "../../../theme/aurora-tokens";

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
                name={isCompleted ? "checkmark" : (step.icon as ComponentProps<typeof Ionicons>['name'])}
                size={rf(20)}
                color={
                  isCompleted
                    ? colors.successAlt
                    : isCurrent
                      ? colors.primaryDark
                      : colors.textTertiary
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
    marginBottom: rp(30),
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(15),
    paddingHorizontal: rp(10),
  },
  stepIcon: {
    width: rp(40),
    height: rp(40),
    borderRadius: rbr(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: rp(15),
    borderWidth: 2,
  },
  stepIconCompleted: {
    backgroundColor: colors.successTint,
    borderColor: colors.successAlt,
  },
  stepIconCurrent: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryDark,
  },
  stepIconUpcoming: {
    backgroundColor: colors.glassSurface,
    borderColor: colors.textTertiary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
  stepTitleCompleted: {
    color: colors.successAlt,
  },
  stepTitleCurrent: {
    color: colors.white,
  },
  stepDescription: {
    fontSize: rf(14),
    color: colors.textTertiary,
    lineHeight: rf(18),
  },
  stepDescriptionCurrent: {
    color: colors.textSecondary,
  },
});
