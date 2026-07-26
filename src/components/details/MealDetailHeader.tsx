import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rw, rh, rbr, rf } from '../../utils/responsive';


interface MealDetailHeaderProps {
  onBack?: () => void;
  onEdit?: () => void;
}

// Shared hitSlop expands the tappable area around the 44px buttons without
// growing their visual footprint (the touch-target test asserts exact dims).
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export const MealDetailHeader: React.FC<MealDetailHeaderProps> = ({
  onBack,
  onEdit,
}) => {
  const backDisabled = !onBack;
  const editDisabled = !onEdit;

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.backButton, backDisabled && styles.buttonDisabled]}
        onPress={onBack}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Back"
        accessibilityHint="Return to previous screen"
        accessibilityState={{ disabled: backDisabled }}
        disabled={backDisabled}
      >
        <Ionicons
          name="arrow-back"
          size={rf(20)}
          color={backDisabled ? colors.textTertiary : colors.text}
        />
      </TouchableOpacity>
      <Text
        style={styles.headerTitle}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        Meal Details
      </Text>
      <TouchableOpacity
        style={[styles.editButton, editDisabled && styles.buttonDisabled]}
        onPress={onEdit}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Edit meal"
        accessibilityHint="Open meal editor"
        accessibilityState={{ disabled: editDisabled }}
        disabled={editDisabled}
      >
        <Ionicons
          name="create-outline"
          size={rf(20)}
          color={editDisabled ? colors.textTertiary : colors.text}
        />
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
    borderBottomWidth: Math.max(rw(1), 1),
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

  buttonDisabled: {
    opacity: 0.5,
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
