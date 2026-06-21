import React from "react";
import { Text, StyleSheet, TextInput } from "react-native";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from "../../../theme/aurora-tokens";
import { Card } from "../../ui";
import { FoodFeedback } from "./types";
import { rh } from "../../../utils/responsive";

interface FeedbackNotesProps {
  feedback: FoodFeedback;
  onFeedbackChange: (updates: Partial<FoodFeedback>) => void;
}

export const FeedbackNotes: React.FC<FeedbackNotesProps> = ({
  feedback,
  onFeedbackChange,
}) => {
  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Additional comments (optional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Any other feedback about this recognition..."
        value={feedback.userNotes || ""}
        onChangeText={(text) => onFeedbackChange({ userNotes: text })}
        multiline={true}
        numberOfLines={3}
      />
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

  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: rh(80),
    textAlignVertical: "top",
  },
});
