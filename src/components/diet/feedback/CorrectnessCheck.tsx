import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from "../../../theme/aurora-tokens";
import { Card } from "../../ui";
import { FoodFeedback } from "./types";

interface CorrectnessCheckProps {
  feedback: FoodFeedback;
  onFeedbackChange: (updates: Partial<FoodFeedback>) => void;
}

export const CorrectnessCheck: React.FC<CorrectnessCheckProps> = ({
  feedback,
  onFeedbackChange,
}) => {
  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Is the food name correct?</Text>
      <View style={styles.correctnessButtons}>
        <TouchableOpacity
          style={[
            styles.correctnessButton,
            feedback.isCorrect && styles.correctnessButtonActive,
          ]}
          onPress={() =>
            onFeedbackChange({
              isCorrect: true,
              correctName: undefined,
            })
          }
        >
          <Text
            style={[
              styles.correctnessButtonText,
              feedback.isCorrect && styles.correctnessButtonTextActive,
            ]}
          >
            ✅ Correct
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.correctnessButton,
            !feedback.isCorrect && styles.correctnessButtonActive,
          ]}
          onPress={() => onFeedbackChange({ isCorrect: false })}
        >
          <Text
            style={[
              styles.correctnessButtonText,
              !feedback.isCorrect && styles.correctnessButtonTextActive,
            ]}
          >
            ❌ Incorrect
          </Text>
        </TouchableOpacity>
      </View>

      {!feedback.isCorrect && (
        <View style={styles.correctionSection}>
          <Text style={styles.correctionLabel}>What should it be called?</Text>
          <TextInput
            style={styles.correctionInput}
            placeholder="Enter correct food name..."
            value={feedback.correctName || ""}
            onChangeText={(text) => onFeedbackChange({ correctName: text })}
            multiline={false}
          />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },

  correctnessButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  correctnessButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },

  correctnessButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  correctnessButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
  },

  correctnessButtonTextActive: {
    color: colors.white,
  },

  correctionSection: {
    marginTop: spacing.md,
  },

  correctionLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },

  correctionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
