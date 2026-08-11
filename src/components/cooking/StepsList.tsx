import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CookingFlow } from "../../utils/cookingFlowGenerator";
import { colors } from "../../theme/aurora-tokens";
import { rf, rp, rbr } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT } from '../../utils/colors';
import { GlassCard } from "../ui/aurora";
import { AnimatedPressable } from "../ui/aurora";

interface StepsListProps {
  cookingFlow: CookingFlow;
  currentStepIndex: number;
  completedSteps: Set<number>;
  onStepPress: (index: number) => void;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  registerStepRef?: (index: number, ref: View | null) => void;
}

export default function StepsList({
  cookingFlow,
  currentStepIndex,
  completedSteps,
  onStepPress,
  registerStepRef,
}: StepsListProps) {
  if (!cookingFlow) return null;

  return (
    <GlassCard
      padding="none"
      borderRadius="xl"
      style={styles.stepsListSection}
    >
      <Text
        style={styles.sectionTitle}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        Cooking Steps
      </Text>
      <View style={styles.stepsList}>
        {cookingFlow.steps.map((step, index) => (
          <View
            key={index}
            ref={(ref) => registerStepRef?.(index, ref)}
          >
          <AnimatedPressable
            style={[
              styles.stepItem,
              index === currentStepIndex && styles.currentStepItem,
              completedSteps.has(index) && styles.completedStepItem,
            ]}
            onPress={() => onStepPress(index)}
            scaleValue={0.98}
            springConfig="smooth"
            hapticType="light"
            accessibilityLabel={`Step ${step.step}: ${step.instruction}`}
            accessibilityRole="button"
            accessibilityState={{
              selected: index === currentStepIndex,
              checked: completedSteps.has(index),
            }}
          >
            <View style={styles.stepItemContent}>
              <View style={styles.stepNumber}>
                <Text
                  style={[
                    styles.stepNumberText,
                    index === currentStepIndex && styles.currentStepText,
                    completedSteps.has(index) && styles.completedStepText,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {step.step}
                </Text>
              </View>
              <View style={styles.stepTextContainer}>
                <Text
                  style={[
                    styles.stepItemText,
                    index === currentStepIndex && styles.currentStepText,
                    completedSteps.has(index) && styles.completedStepText,
                  ]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {step.instruction}
                </Text>
                {step.timeRequired && (
                  <View style={styles.stepTimeRow}>
                    <Ionicons name="timer-outline" size={rf(12)} color={colors.text.secondary} />
                    <Text
                      style={styles.stepTimeText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {step.timeRequired} min
                    </Text>
                  </View>
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
          </AnimatedPressable>
          </View>
        ))}
      </View>

      {cookingFlow.proTips.length > 0 && (
        <View style={styles.proTipsSection}>
          <View style={styles.proTipsTitleRow}>
            <Ionicons name="bulb-outline" size={rf(16)} color={colors.warning.DEFAULT} />
            <Text
              style={styles.proTipsTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Pro Tips
            </Text>
          </View>
          {cookingFlow.proTips.map((tip, index) => (
            <Text
              key={index}
              style={styles.proTipText}
              numberOfLines={4}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              • {tip}
            </Text>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  stepsListSection: {
    marginHorizontal: rp(16),
    marginBottom: rp(16),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: colors.text.primary,
    padding: rp(16),
    paddingBottom: rp(8),
  },
  stepsList: {
    // Use plain View — no nested ScrollView. The outer CookingSessionScreen
    // ScrollView already handles scrolling for the whole screen.
  } as ViewStyle,
  stepItem: {
    paddingHorizontal: rp(16),
    paddingVertical: rp(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    minHeight: Math.max(rp(56), 44),
  },
  currentStepItem: {
    backgroundColor: hexToRgba(colors.primary.DEFAULT, TINT_ALPHA_LOW + 0.08),
  },
  completedStepItem: {
    backgroundColor: hexToRgba(colors.success.DEFAULT, TINT_ALPHA_SOFT),
  },
  stepItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    width: rp(32),
    height: rp(32),
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
    minWidth: 0,
  },
  stepItemText: {
    flex: 1,
    fontSize: rf(16),
    color: colors.text.secondary,
  },
  stepTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: rp(4),
    gap: rp(4),
  },
  stepTimeText: {
    fontSize: rf(12),
    color: colors.text.secondary,
  },
  proTipsSection: {
    backgroundColor: hexToRgba(colors.warning.DEFAULT, TINT_ALPHA_LOW + 0.06),
    padding: rp(16),
    borderRadius: rbr(12),
    marginTop: rp(16),
  },
  proTipsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(8),
    gap: rp(6),
  },
  proTipsTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: colors.warning.DEFAULT,
  },
  proTipText: {
    fontSize: rf(14),
    color: colors.text.secondary,
    lineHeight: rf(20),
    marginBottom: rp(4),
  },
});

