import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { THEME } from "../../../components/ui";

interface ExerciseHeaderProps {
  onBack?: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export const ExerciseHeader: React.FC<ExerciseHeaderProps> = ({
  onBack,
  isFavorited,
  onToggleFavorite,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Exercise Guide</Text>
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={onToggleFavorite}
      >
        <Text style={styles.favoriteIcon}>{isFavorited ? "❤️" : "♡"}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
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
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },
});
