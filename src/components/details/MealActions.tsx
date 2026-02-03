import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, THEME } from "../ui";

interface MealActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MealActions: React.FC<MealActionsProps> = ({
  onEdit,
  onDelete,
}) => {
  return (
    <View style={styles.bottomContainer}>
      <View style={styles.actionButtons}>
        <Button
          title="Edit Meal"
          onPress={onEdit ?? (() => {})}
          disabled={!onEdit}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title="Delete Meal"
          onPress={onDelete ?? (() => {})}
          disabled={!onDelete}
          variant="outline"
          style={[styles.actionButton, styles.deleteButton] as any}
          textStyle={styles.deleteButtonText}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },

  actionButtons: {
    flexDirection: "row",
    gap: THEME.spacing.sm,
  },

  actionButton: {
    flex: 1,
  },

  deleteButton: {
    borderColor: THEME.colors.error,
  },

  deleteButtonText: {
    color: THEME.colors.error,
  },
});
