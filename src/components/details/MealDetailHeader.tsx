import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ResponsiveTheme } from '../../utils/constants';
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
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Meal Details</Text>
      <TouchableOpacity style={styles.editButton} onPress={onEdit}>
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
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  backButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  backIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.text,
  },

  headerTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  editButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  editIcon: {
    fontSize: ResponsiveTheme.fontSize.md,
  },
});
