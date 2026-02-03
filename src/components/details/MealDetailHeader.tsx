import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { THEME } from "../ui";

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
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  backIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  headerTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  editIcon: {
    fontSize: THEME.fontSize.md,
  },
});
