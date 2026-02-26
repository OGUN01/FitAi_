import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "../ui";
import { ResponsiveTheme } from '../../utils/constants';

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
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  actionButtons: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  actionButton: {
    flex: 1,
  },

  deleteButton: {
    borderColor: ResponsiveTheme.colors.error,
  },

  deleteButtonText: {
    color: ResponsiveTheme.colors.error,
  },
});
