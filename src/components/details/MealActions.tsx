import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "../ui";
import { flatColors as colors, spacing } from '../../theme/aurora-tokens';

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
        {onEdit && (
          <Button
            title="Edit Meal"
            onPress={onEdit}
            variant="outline"
            style={styles.actionButton}
          />
        )}
        {onDelete && (
          <Button
            title="Delete Meal"
            onPress={onDelete}
            variant="outline"
            style={{ ...styles.actionButton, ...styles.deleteButton }}
            textStyle={styles.deleteButtonText}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },

  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  actionButton: {
    flex: 1,
  },

  deleteButton: {
    borderColor: colors.error,
  },

  deleteButtonText: {
    color: colors.error,
  },
});
