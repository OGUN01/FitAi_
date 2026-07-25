/**
 * ExercisePickerCard — premium compact card rendered inside the exercise
 * picker sheet list/grid.
 *
 * Layout: [icon disc w/ category gradient] [name + muscle chips + meta +
 * est. time] [favourite star] [Quick Add + button]
 *
 * Interactions (all tokenized + haptic per CLAUDE.md):
 *  - Quick Add (GlassButton small): onAdd → spring scale + buttonPress haptic.
 *  - Favourite star: filled ⇄ outline, celebration haptic on fill / selection
 *    on unfill.
 *  - Multi-select mode: swaps the star for a checkbox; tap toggles selection.
 *
 * Animated entrance: FadeInUp stagger via Reanimated layout animations. The
 * stagger delay is derived from the index passed by the parent (picker) so the
 * whole section cascades, not just one card.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import type { CuratedExercise } from "../../../data/curatedExercises";

// ----------------------------------------------------------------------------
// CATEGORY → GRADIENT MAP (per Phase 4 brief)
// ----------------------------------------------------------------------------

interface CategoryStyle {
  gradient: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORY_STYLE: Record<CuratedExercise["category"], CategoryStyle> = {
  chest: { gradient: [colors.primary.DEFAULT, colors.primary.dark], icon: "barbell-outline" },
  back: { gradient: [colors.secondary.DEFAULT, colors.secondary.dark], icon: "body-outline" },
  legs: { gradient: ["#9333EA", "#6B21A8"], icon: "walk-outline" },
  shoulders: { gradient: [colors.warning.DEFAULT, colors.warning.dark], icon: "fitness-outline" },
  arms: { gradient: [colors.error.DEFAULT, colors.error.dark], icon: "hand-right-outline" },
  core: { gradient: ["#10B981", "#047857"], icon: "shield-outline" },
  cardio: { gradient: [colors.error.light, colors.error.DEFAULT], icon: "flash-outline" },
  full_body: { gradient: [colors.primary.light, colors.secondary.DEFAULT], icon: "pulse-outline" },
};

function categoryStyle(category: CuratedExercise["category"]): CategoryStyle {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE.chest;
}

/** Rough estimated time per exercise: 3 sets × (reps window + rest). */
function estimateMinutes(exercise: CuratedExercise): string {
  // 3 sets, ~30s work + 60s rest each → ~5 min. Time-based → ~3 min.
  const mins = exercise.isTimeBased ? 3 : 5;
  return `${mins} min`;
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export interface ExercisePickerCardProps {
  exercise: CuratedExercise;
  isFavorite: boolean;
  isSelected: boolean;
  multiSelectMode: boolean;
  onAdd: () => void;
  onToggleFavorite: () => void;
  onToggleSelect: () => void;
  /** Stagger index (0-based). @default 0 */
  index?: number;
  testID?: string;
}

export const ExercisePickerCard: React.FC<ExercisePickerCardProps> = ({
  exercise,
  isFavorite,
  isSelected,
  multiSelectMode,
  onAdd,
  onToggleFavorite,
  onToggleSelect,
  index = 0,
  testID,
}) => {
  const catStyle = categoryStyle(exercise.category);
  const primaryMuscles = exercise.muscleGroups.slice(0, 2);
  const estTime = estimateMinutes(exercise);

  const handleFavPress = () => {
    if (isFavorite) {
      haptics.selection();
    } else {
      haptics.celebration();
    }
    onToggleFavorite();
  };

  const handleSelectPress = () => {
    haptics.selection();
    onToggleSelect();
  };

  return (
    <Animated.View
      entering={FadeInUp.springify().delay(Math.min(index, 8) * 40)}
      style={styles.container}
      testID={testID}
    >
      {/* Icon disc with category gradient */}
      <LinearGradient
        colors={catStyle.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconDisc}
      >
        <Ionicons name={catStyle.icon} size={rf(20)} color={colors.text.primary} />
      </LinearGradient>

      {/* Name + muscles + meta */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {exercise.name}
        </Text>
        <View style={styles.chipRow}>
          {primaryMuscles.map((m) => (
            <View key={m} style={styles.muscleChip}>
              <Text style={styles.muscleChipText}>{m}</Text>
            </View>
          ))}
        </View>
        <View style={styles.metaRow}>
          {exercise.equipment.length > 0 && (
            <Text style={styles.metaText} numberOfLines={1}>
              {exercise.equipment[0]}
            </Text>
          )}
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{exercise.difficulty}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{estTime}</Text>
        </View>
      </View>

      {/* Favourite star OR multi-select checkbox */}
      {multiSelectMode ? (
        <Pressable
          hitSlop={11}
          onPress={handleSelectPress}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
          accessibilityLabel={`Select ${exercise.name}`}
          accessibilityHint="Double tap to toggle selection"
          style={styles.favBtn}
        >
          <Ionicons
            name={isSelected ? "checkbox" : "square-outline"}
            size={rf(22)}
            color={isSelected ? colors.primary.DEFAULT : colors.text.tertiary}
          />
        </Pressable>
      ) : (
        <Pressable
          hitSlop={11}
          onPress={handleFavPress}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? `Unfavourite ${exercise.name}` : `Favourite ${exercise.name}`}
          accessibilityHint="Double tap to favorite this exercise"
          style={styles.favBtn}
        >
          <Ionicons
            name={isFavorite ? "star" : "star-outline"}
            size={rf(22)}
            color={isFavorite ? colors.warning.DEFAULT : colors.text.tertiary}
          />
        </Pressable>
      )}

      {/* Quick Add + button */}
      <GlassButton
        label=""
        onPress={onAdd}
        variant="primary"
        icon="add"
        hapticType="medium"
        accessibilityLabel={`Add ${exercise.name}`}
        style={styles.addBtn}
      />
    </Animated.View>
  );
};

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.xs),
  },
  iconDisc: {
    width: rw(44),
    height: rw(44),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  } as TextStyle,
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.xxs),
    flexWrap: "wrap",
  },
  muscleChip: {
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(1),
  },
  muscleChipText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    marginTop: rp(spacing.xxs),
  },
  metaText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  metaDot: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  favBtn: {
    padding: rp(spacing.xxs),
  },
  addBtn: {
    minWidth: rw(44),
    minHeight: rw(36),
    paddingHorizontal: 0,
  },
});

// Reuse RN's TextStyle for the fontWeight cast (mirrors ExerciseRow.tsx pattern).
type TextStyleWeight = TextStyle["fontWeight"];

export default ExercisePickerCard;
