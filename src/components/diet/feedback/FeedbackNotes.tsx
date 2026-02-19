import React from "react";
import { Text, StyleSheet, TextInput } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  notesInput: {
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    backgroundColor: ResponsiveTheme.colors.surface,
    minHeight: rh(80),
    textAlignVertical: "top",
  },
});
