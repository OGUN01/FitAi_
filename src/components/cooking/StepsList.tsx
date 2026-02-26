import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CookingFlow } from "../../utils/cookingFlowGenerator";
import { colors } from "../../theme/aurora-tokens";
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rp, rbr } from '../../utils/responsive';

interface StepsListProps {
  cookingFlow: CookingFlow;
  currentStepIndex: number;
  completedSteps: Set<number>;
  onStepPress: (index: number) => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
}

export default function StepsList({
  cookingFlow,
  currentStepIndex,
  completedSteps,
  onStepPress,
  scrollViewRef,
}: StepsListProps) {
  if (!cookingFlow) return null;

  return (
    <View style={styles.stepsListSection}>
      <Text style={styles.sectionTitle}>Cooking Steps</Text>
      <ScrollView
        ref={scrollViewRef}
        style={styles.stepsList}
        showsVerticalScrollIndicator={false}
      >
        {cookingFlow.steps.map((step, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.stepItem,
              index === currentStepIndex && styles.currentStepItem,
              completedSteps.has(index) && styles.completedStepItem,
            ]}
            onPress={() => onStepPress(index)}
          >
            <View style={styles.stepItemContent}>
              <View style={styles.stepNumber}>
                <Text
                  style={[
                    styles.stepNumberText,
                    index === currentStepIndex && styles.currentStepText,
                    completedSteps.has(index) && styles.completedStepText,
                  ]}
                >
                  {step.icon || step.step}
                </Text>
              </View>
              <View style={styles.stepTextContainer}>
                <Text
                  style={[
                    styles.stepItemText,
                    index === currentStepIndex && styles.currentStepText,
                    completedSteps.has(index) && styles.completedStepText,
                  ]}
                >
                  {step.instruction}
                </Text>
                {step.timeRequired && (
                  <Text style={styles.stepTimeText}>
                    ⏱️ {step.timeRequired} min
                  </Text>
                )}
              </View>
              {completedSteps.has(index) && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.success.DEFAULT}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cookingFlow.proTips.length > 0 && (
        <View style={styles.proTipsSection}>
          <Text style={styles.proTipsTitle}>💡 Pro Tips</Text>
          {cookingFlow.proTips.map((tip, index) => (
            <Text key={index} style={styles.proTipText}>
              • {tip}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepsListSection: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: rp(16),
    marginBottom: rp(16),
    borderRadius: rbr(12),
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: colors.text.primary,
    padding: rp(16),
    paddingBottom: rp(8),
  },
  stepsList: {
    maxHeight: 300,
  },
  stepItem: {
    paddingHorizontal: rp(16),
    paddingVertical: rp(12),
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.glassBorder,
  },
  currentStepItem: {
    backgroundColor: ResponsiveTheme.colors.primaryTint,
  },
  completedStepItem: {
    backgroundColor: "rgba(76, 175, 80, 0.08)",
  },
  stepItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: rbr(16),
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: rp(12),
  },
  stepNumberText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text.secondary,
  },
  currentStepText: {
    color: colors.primary.DEFAULT,
  },
  completedStepText: {
    color: colors.success.DEFAULT,
  },
  stepTextContainer: {
    flex: 1,
    marginLeft: rp(12),
  },
  stepItemText: {
    flex: 1,
    fontSize: rf(16),
    color: colors.text.secondary,
  },
  stepTimeText: {
    fontSize: rf(12),
    color: colors.text.muted,
    marginTop: rp(4),
  },
  proTipsSection: {
    backgroundColor: "rgba(255, 152, 0, 0.10)",
    padding: rp(16),
    borderRadius: rbr(12),
    marginTop: rp(16),
  },
  proTipsTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: colors.warning.DEFAULT,
    marginBottom: rp(8),
  },
  proTipText: {
    fontSize: rf(14),
    color: colors.warning.DEFAULT,
    lineHeight: rf(20),
    marginBottom: rp(4),
  },
});
