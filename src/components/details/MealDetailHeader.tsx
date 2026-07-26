import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rw, rh, rbr, rf } from '../../utils/responsive';


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
        accessibilityHint="Return to previous screen"
        disabled={!onBack}
      >
        <Ionicons name="arrow-back" size={rf(20)} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
        Meal Details
      </Text>
      <TouchableOpacity
        style={styles.editButton}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit meal"
        accessibilityHint="Open meal editor"
        disabled={!onEdit}
      >
        <Ionicons name="create-outline" size={rf(20)} color={colors.text} />
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

  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    textAlign: "center",
    marginHorizontal: spacing.sm,
  },

  editButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rh(40), 44),
    borderRadius: Math.max(rbr(20), 22),
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
