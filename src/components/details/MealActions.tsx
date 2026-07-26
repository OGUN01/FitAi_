import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../ui";
import { flatColors as colors, spacing } from '../../theme/aurora-tokens';
import { rw } from '../../utils/responsive';

interface MealActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MealActions: React.FC<MealActionsProps> = ({
  onEdit,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.bottomContainer, { paddingBottom: spacing.md + insets.bottom }]}
      accessibilityRole="toolbar"
    >
      <View style={styles.actionButtons}>
        {onEdit ? (
          <Button
            title="Edit Meal"
            onPress={onEdit}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Edit meal"
          />
        ) : null}
        {onDelete ? (
          <Button
            title="Delete Meal"
            onPress={onDelete}
            variant="outline"
            style={{ ...styles.actionButton, ...styles.deleteButton }}
            textStyle={styles.deleteButtonText}
            accessibilityLabel="Delete meal"
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomContainer: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: Math.max(rw(1), 1),
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
