/**
 * ExerciseSwapSheet — runtime (mid-session) exercise substitution
 * (Workout Engine v2 Phase 6C-iii).
 *
 * The live session previously had ZERO swap/substitute affordance — only
 * design-time (builder) substitution existed, via ExercisePickerSheet +
 * workoutBuilderStore.replaceExercise. This reuses that SAME visual language
 * (DetentBottomSheet + ExercisePickerCard + exercisePickerService) rather
 * than inventing a new one, but is a distinct, lighter component: the
 * builder's ExercisePickerSheet is hard-wired to useWorkoutBuilderStore
 * (plan mutation, per-day AI suggestions) — wiring session-only mutation
 * through that same component would conflate plan-mutation and session-
 * mutation control flow, which is exactly the risk the "session-only, never
 * touch the saved plan" requirement warns against.
 *
 * Default candidate pool: same `movementPattern` as the exercise being
 * swapped (so the swap preserves training intent — a push movement stays a
 * push movement) — the search bar lets the user deliberately browse beyond
 * that, matching the picker's own "recommendations are a starting point, not
 * a cage" pattern. Contraindicated exercises (validateExerciseSafety, the
 * SAME injury/pregnancy/medical-condition filter builderValidationService
 * already applies to AI-generated plans) are excluded from BOTH the default
 * pool and search results — never surfaced as a swap target.
 */
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, type TextStyle } from "react-native";
import { DetentBottomSheet } from "../ui/aurora/DetentBottomSheet";
import { EmptyState } from "../ui/aurora";
import { colors, spacing, typography } from "../../theme/aurora-tokens";
import { rp, rf } from "../../utils/responsive";
import { AuroraSearchField } from "../ui/aurora";
import {
  EXERCISE_CATALOG,
  getCatalogEntry,
  type CatalogEntry,
} from "../../data/exerciseCatalog.generated";
import {
  searchExercises,
  getFavorites,
  toggleFavorite,
} from "../../services/exercisePickerService";
import { validateExerciseSafety } from "../../ai/exerciseValidationService";
import { ExercisePickerCard } from "../fitness/builder/ExercisePickerCard";
import { useProfileStore } from "../../stores/profileStore";
import { haptics } from "../../utils/haptics";

export interface ExerciseSwapSheetProps {
  visible: boolean;
  /** The exercise currently occupying this session slot. */
  currentExerciseId: string;
  onSelect: (entry: CatalogEntry) => void;
  onClose: () => void;
}

export const ExerciseSwapSheet: React.FC<ExerciseSwapSheetProps> = ({
  visible,
  currentExerciseId,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    void getFavorites().then(setFavorites);
  }, [visible]);

  const currentEntry = useMemo(
    () => getCatalogEntry(currentExerciseId),
    [currentExerciseId],
  );

  // Same injury/pregnancy/medical-condition constraints
  // builderValidationService.validatePlan already applies to AI-generated
  // plans (see WeeklyBuilderScreen's safetyProfile) — reused verbatim rather
  // than reimplemented, and rederived from the live profile so a swap always
  // reflects the user's CURRENT limitations, not whatever was true when the
  // plan was generated.
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const safetyConstraints = useMemo(
    () => ({
      pregnancyStatus: bodyAnalysis?.pregnancy_status ?? undefined,
      pregnancyTrimester: bodyAnalysis?.pregnancy_trimester,
      injuries: bodyAnalysis?.physical_limitations,
      medicalConditions: bodyAnalysis?.medical_conditions,
    }),
    [bodyAnalysis],
  );

  const isSafe = useCallback(
    (entry: CatalogEntry): boolean => {
      const violations = validateExerciseSafety(
        [
          {
            id: entry.canonicalId,
            name: entry.name,
            muscleGroups: [...entry.primaryMuscles, ...entry.secondaryMuscles],
          },
        ],
        safetyConstraints,
      );
      return violations.length === 0;
    },
    [safetyConstraints],
  );

  // Default pool: same movement pattern, excluding the current exercise and
  // anything contraindicated. Falls back to the full catalog (still safety-
  // filtered) if the current exercise didn't resolve in the catalog at all
  // (e.g. a stale/unknown id) — better to show something than an empty sheet.
  const defaultCandidates = useMemo(() => {
    const pool = currentEntry
      ? EXERCISE_CATALOG.filter((e) => e.movementPattern === currentEntry.movementPattern)
      : EXERCISE_CATALOG;
    return pool
      .filter((e) => e.canonicalId !== currentEntry?.canonicalId)
      .filter(isSafe);
  }, [currentEntry, isSafe]);

  const searchResults = useMemo(() => {
    if (query.trim().length === 0) return [];
    return searchExercises(query)
      .filter((e) => e.canonicalId !== currentEntry?.canonicalId)
      .filter(isSafe);
  }, [query, currentEntry, isSafe]);

  const hasQuery = query.trim().length > 0;
  const listData = hasQuery ? searchResults : defaultCandidates;

  const handleToggleFavorite = useCallback(async (exerciseId: string) => {
    const nowFav = await toggleFavorite(exerciseId);
    setFavorites(await getFavorites());
    if (nowFav) {
      haptics.celebration();
    } else {
      haptics.selection();
    }
  }, []);

  const handleSelect = useCallback(
    (entry: CatalogEntry) => {
      haptics.success();
      onSelect(entry);
    },
    [onSelect],
  );

  const keyExtractor = useCallback((item: CatalogEntry) => item.canonicalId, []);

  const renderItem = useCallback(
    ({ item, index }: { item: CatalogEntry; index: number }) => (
      <ExercisePickerCard
        exercise={item}
        isFavorite={favorites.includes(item.canonicalId)}
        isSelected={false}
        multiSelectMode={false}
        onAdd={() => handleSelect(item)}
        onToggleFavorite={() => handleToggleFavorite(item.canonicalId)}
        onToggleSelect={() => {}}
        index={index}
        testID={`swap-card-${item.canonicalId}`}
      />
    ),
    [favorites, handleSelect, handleToggleFavorite],
  );

  return (
    <DetentBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.5, 0.85]}
      initialSnapIndex={1}
      testID="exercise-swap-sheet"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Swap Exercise</Text>
        <Text style={styles.subtitle}>
          {currentEntry
            ? `Similar movement to ${currentEntry.name} — or search for anything else`
            : "Search for a replacement exercise"}
        </Text>
      </View>

      <AuroraSearchField
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery("")}
        placeholder="Search exercises, muscles, equipment…"
        accessibilityLabel="Search replacement exercises"
        containerStyle={styles.searchField}
      />

      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No exercises found"
            subtitle={
              hasQuery
                ? "Try a different search term."
                : "No safe matches for this movement pattern — try searching instead."
            }
          />
        }
      />
    </DetentBottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: rp(spacing.sm),
  },
  title: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as TextStyle["fontWeight"],
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    marginTop: rp(spacing.xxs),
  },
  searchField: {
    marginBottom: rp(spacing.sm),
  },
  listContent: {
    paddingBottom: rp(spacing.xl),
  },
});

export default ExerciseSwapSheet;
