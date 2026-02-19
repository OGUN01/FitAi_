import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  correctnessButtons: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  correctnessButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.background,
    alignItems: "center",
  },

  correctnessButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  correctnessButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: "600",
  },

  correctnessButtonTextActive: {
    color: ResponsiveTheme.colors.white,
  },

  correctionSection: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  correctionLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    fontWeight: "600",
  },

  correctionInput: {
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    backgroundColor: ResponsiveTheme.colors.surface,
  },
});
