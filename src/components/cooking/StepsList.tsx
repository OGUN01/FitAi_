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
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
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
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    padding: 16,
    paddingBottom: 8,
  },
  stepsList: {
    maxHeight: 300,
  },
  stepItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  currentStepItem: {
    backgroundColor: "#EEF2FF",
  },
  completedStepItem: {
    backgroundColor: "#F0FDF4",
  },
  stepItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  currentStepText: {
    color: "#4F46E5",
  },
  completedStepText: {
    color: "#10B981",
  },
  stepTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  stepItemText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  stepTimeText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  proTipsSection: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  proTipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 8,
  },
  proTipText: {
    fontSize: 14,
    color: "#166534",
    lineHeight: 20,
    marginBottom: 4,
  },
});
