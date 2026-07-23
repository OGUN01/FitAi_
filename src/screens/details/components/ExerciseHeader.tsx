import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: rw(44),
    height: rh(44),
    borderRadius: rbr(22),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
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
  favoriteButton: {
    width: rw(44),
    height: rh(44),
    borderRadius: rbr(22),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    fontSize: fontSize.lg,
    color: colors.text,
  },
});
