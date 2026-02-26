import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rw, rh, rbr } from '../../../utils/responsive';

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
    alignItems: "center",
    justifyContent: "center",
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
  favoriteButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.text,
  },
});
