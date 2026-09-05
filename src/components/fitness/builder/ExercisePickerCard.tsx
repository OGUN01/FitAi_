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
import Animated, { FadeInUp } from "react-native-reanimated";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  flatColors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { hexToRgba } from "../../../utils/colors";
import { rp, rf, rw } from "../../../utils/responsive";
import { formatMuscleGroup } from "../../../utils/textFormat";
import type { CatalogEntry } from "../../../data/exerciseCatalog.generated";

// ----------------------------------------------------------------------------
// BODY REGION → ACCENT COLOR MAP (flat tint per region — gradient discs retired)
//
// Workout Engine v2 Phase 6C-ii: CatalogEntry has no single "category" field
// like the old CuratedExercise did — it carries `bodyPart`, which mixes two
// vocabularies depending on the row's source (ExerciseDB rows: "back",
// "cardio", "chest", "lower arms", "neck", "shoulders", "upper arms",
// "upper legs", "lower legs", "waist"; standalone curated rows: the old
// curated `category` verbatim — chest/back/shoulders/arms/legs/core/cardio/
// full_body). normalizeBodyPart folds both into the same small display-bucket
// set the existing CATEGORY_STYLE map already covers, rather than needing a
// second style table.
// ----------------------------------------------------------------------------

type DisplayCategory = "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "cardio" | "full_body";

interface CategoryStyle {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORY_STYLE: Record<DisplayCategory, CategoryStyle> = {
  chest: { color: colors.primary.DEFAULT, icon: "barbell-outline" },
  back: { color: colors.secondary.DEFAULT, icon: "body-outline" },
  legs: { color: flatColors.purple, icon: "walk-outline" },
  shoulders: { color: colors.warning.DEFAULT, icon: "fitness-outline" },
  arms: { color: colors.error.DEFAULT, icon: "hand-right-outline" },
  core: { color: flatColors.successAlt, icon: "shield-outline" },
  cardio: { color: colors.error.light, icon: "flash-outline" },
  full_body: { color: colors.primary.light, icon: "pulse-outline" },
};

const BODY_PART_TO_DISPLAY: Record<string, DisplayCategory> = {
  chest: "chest",
  back: "back",
  "upper legs": "legs",
  "lower legs": "legs",
  legs: "legs",
  shoulders: "shoulders",
  neck: "shoulders",
  "upper arms": "arms",
  "lower arms": "arms",
  arms: "arms",
  waist: "core",
  core: "core",
  cardio: "cardio",
  full_body: "full_body",
};

function categoryStyle(bodyPart: string | null): CategoryStyle {
  const display = (bodyPart && BODY_PART_TO_DISPLAY[bodyPart]) || "full_body";
  return CATEGORY_STYLE[display];
}

/** Rough estimated time per exercise: 3 sets × (reps window + rest). */
function estimateMinutes(exercise: CatalogEntry): string {
  // 3 sets, ~30s work + 60s rest each → ~5 min. Time-based → ~3 min.
  const mins = exercise.isTimeBased ? 3 : 5;
  return `${mins} min`;
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export interface ExercisePickerCardProps {
  exercise: CatalogEntry;
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
  const catStyle = categoryStyle(exercise.bodyPart);
  const primaryMuscles = exercise.primaryMuscles.slice(0, 2);
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
      {/* Flat accent icon chip (was category gradient disc) */}
      <View
        style={[
          styles.iconDisc,
          { backgroundColor: hexToRgba(catStyle.color, 0.15) },
        ]}
      >
        <Ionicons name={catStyle.icon} size={rf(20)} color={catStyle.color} />
      </View>

      {/* Name + muscles + meta */}
      <View style={styles.info}>
        <Text
          style={styles.name}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {exercise.name}
        </Text>
        <View style={styles.chipRow}>
          {primaryMuscles.map((m) => (
            <View key={m} style={styles.muscleChip}>
              <Text style={styles.muscleChipText}>{formatMuscleGroup(m)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.metaRow}>
          {exercise.equipment.length > 0 && (
            <Text
              style={[styles.metaText, styles.metaTextCapitalize]}
              numberOfLines={1}
            >
              {exercise.equipment[0]}
            </Text>
          )}
          <Text style={styles.metaDot}>·</Text>
          <Text style={[styles.metaText, styles.metaTextCapitalize]}>
            {exercise.skillLevel}
          </Text>
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
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: border.subtle,
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
    backgroundColor: surface[2],
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(1),
  },
  muscleChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.medium) as TextStyleWeight,
    textTransform: "capitalize",
  } as TextStyle,
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    marginTop: rp(spacing.xxs),
  },
  metaText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  metaTextCapitalize: {
    textTransform: "capitalize",
  },
  metaDot: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  favBtn: {
    padding: rp(spacing.xxs),
    minHeight: Math.max(rp(44), 44),
    justifyContent: "center",
  },
  addBtn: {
    minWidth: rw(44),
    minHeight: Math.max(rw(44), 44),
    paddingHorizontal: 0,
  },
});

// Reuse RN's TextStyle for the fontWeight cast (mirrors ExerciseRow.tsx pattern).
type TextStyleWeight = TextStyle["fontWeight"];

export default ExercisePickerCard;
