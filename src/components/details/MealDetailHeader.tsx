import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rw, rh, rbr } from '../../utils/responsive';


interface MealDetailHeaderProps {
  onBack?: () => void;
  onEdit?: () => void;
}

export const MealDetailHeader: React.FC<MealDetailHeaderProps> = ({
  onBack,
  onEdit,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Meal Details</Text>
      <TouchableOpacity
        style={styles.editButton}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit meal"
      >
        <Text style={styles.editIcon}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rh(40), 44),
    borderRadius: Math.max(rbr(20), 22),
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  backIcon: {
    fontSize: fontSize.lg,
    color: colors.text,
  },

  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },

  editButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rh(40), 44),
    borderRadius: Math.max(rbr(20), 22),
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  editIcon: {
    fontSize: fontSize.md,
  },
});
