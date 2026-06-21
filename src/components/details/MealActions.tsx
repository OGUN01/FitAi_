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
          style={{ ...styles.actionButton, ...styles.deleteButton }}
          textStyle={styles.deleteButtonText}
        />
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
