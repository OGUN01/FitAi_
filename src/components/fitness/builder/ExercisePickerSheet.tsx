/**
 * ExercisePickerSheet — Phase 4 premium exercise picker bottom sheet.
 *
 * Composes:
 *  - DetentBottomSheet (Phase 1): near-fullscreen snap [0.3, 0.6, 0.95]
 *  - exercisePickerService: search / filters / recents / favourites / recs
 *  - ExercisePickerCard: the leaf row
 *
 * Sections (when search empty):
 *   [Recent searches] [Popular] [Recommended (inverse muscle-balance)]
 *   [Pinned favourites] [All — paginated FlatList]
 * When search has text: a single filtered FlatList.
 *
 * Single-add: tap a card → addExercise(dayIndex) → closePicker + success haptic
 *   + spring exit.
 * Multi-add: long-press a card → multi-select mode (checkbox per card, an
 *   "Add N" header button). On confirm, each selected exercise is appended.
 *
 * State is sourced from useWorkoutBuilderStore (pickerOpen / pickerContext /
 * addExercise / closePicker).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type TextInputChangeEventData,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DetentBottomSheet } from "../../ui/aurora/DetentBottomSheet";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import { CURATED_EXERCISES, type CuratedExercise } from "../../../data/curatedExercises";
import type { PlannedExercise } from "../../../types/workout";
import {
  searchExercises,
  getRecentSearches,
  addRecentSearch,
  getFavorites,
  toggleFavorite,
  getRecommendedForDay,
  getPopularExercises,
  curatedToPlanned,
  type ExercisePickerFilter,
} from "../../../services/exercisePickerService";
import { ExercisePickerCard } from "./ExercisePickerCard";
import { workoutBuilderAi } from "../../../ai/workoutBuilderAi";
import { useProfileStore } from "../../../stores/profileStore";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";
import type { AiSuggestion } from "../../../types/workout";

// ----------------------------------------------------------------------------
// CONSTANTS — filter chip options (sourced from the curated library itself so
// we never drift from the data).
// ----------------------------------------------------------------------------

const MUSCLE_OPTIONS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "glutes",
  "quadriceps",
  "hamstrings",
] as const;

const EQUIPMENT_OPTIONS = [
  "body weight",
  "dumbbell",
  "barbell",
  "cable",
  "machine",
  "band",
] as const;

const DIFFICULTY_OPTIONS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

const CATEGORY_OPTIONS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
  "cardio",
  "full_body",
] as const;

const ALL_PAGE_SIZE = 24;

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const ExercisePickerSheet: React.FC = () => {
  // ── Store ──
  const pickerOpen = useWorkoutBuilderStore((s) => s.pickerOpen);
  const pickerContext = useWorkoutBuilderStore((s) => s.pickerContext);
  const closePicker = useWorkoutBuilderStore((s) => s.closePicker);
  const addExercise = useWorkoutBuilderStore((s) => s.addExercise);
  const applyAiSuggestions = useWorkoutBuilderStore((s) => s.applyAiSuggestions);
  const draft = useWorkoutBuilderStore((s) => s.draft);

  // ── AI suggestions (Phase 9) ──
  const aiSuggestions = useWorkoutBuilderStore((s) => s.aiSuggestions);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");

  // ── UI state ──
  const [query, setQuery] = useState("");
  const [filterRowOpen, setFilterRowOpen] = useState(false);
  const [filter, setFilter] = useState<ExercisePickerFilter>({});
  const [recents, setRecents] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allPageCount, setAllPageCount] = useState(1);

  const inputRef = useRef<TextInput>(null);

  // ── Derived: current day's exercise ids (for recommendations) ──
  const currentDayExerciseIds = useMemo(() => {
    if (!pickerContext || !draft) return [];
    const day = draft.workouts[pickerContext.dayIndex];
    return (day?.plannedExercises ?? []).map((p) => p.exerciseId);
  }, [pickerContext, draft]);

  // ── Load recents + favorites on open ──
  useEffect(() => {
    if (!pickerOpen) return;
    void getRecentSearches().then(setRecents);
    void getFavorites().then(setFavorites);
    setAllPageCount(1);
    setQuery("");
    setFilter({});
    setMultiSelectMode(false);
    setSelectedIds(new Set());
  }, [pickerOpen]);

  // ── Fetch AI suggestions when the picker opens (Phase 9) ──
  // Fires suggest-day with the current day's exercises + profile so the user
  // sees complementary recommendations immediately. Non-blocking — picker
  // is usable while the AI call is in flight.
  useEffect(() => {
    if (!pickerOpen || !pickerContext || !draft) {
      setAiError("");
      setAiReasoning("");
      return;
    }
    const day = draft.workouts[pickerContext.dayIndex];
    const currentExercises = day?.plannedExercises ?? [];
    let cancelled = false;
    setAiLoading(true);
    setAiError("");
    workoutBuilderAi
      .suggestDay({
        dayIndex: pickerContext.dayIndex,
        currentExercises,
      })
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.data) {
          setAiReasoning(result.data.reasoning);
        } else {
          setAiError(result.error ?? "AI suggestions unavailable");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[ExercisePickerSheet] AI suggest failed:", err);
        setAiError("AI suggestions unavailable");
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, pickerContext, draft]);

  // ── Search results (when query non-empty) ──
  const searchResults = useMemo(() => {
    if (query.trim().length === 0) return [];
    return searchExercises(query, filter);
  }, [query, filter]);

  // ── Recommended (inverse muscle-balance) ──
  const recommended = useMemo(
    () => getRecommendedForDay(currentDayExerciseIds),
    [currentDayExerciseIds],
  );

  const popular = useMemo(() => getPopularExercises(), []);

  const favoriteExercises = useMemo(
    () =>
      favorites
        .map((id) => CURATED_EXERCISES_BY_ID.get(id))
        .filter((c): c is CuratedExercise => Boolean(c)),
    [favorites],
  );

  // The "All" list (paginated). When filters are active, the search results
  // already cover the universe — the All section is the un-paginated filtered
  // set when filters are set, otherwise the full library paged.
  const allExercises = useMemo(() => {
    const hasFilters =
      (filter.muscleGroups?.length ?? 0) > 0 ||
      (filter.equipment?.length ?? 0) > 0 ||
      (filter.difficulty?.length ?? 0) > 0 ||
      Boolean(filter.category);
    if (!hasFilters) return CURATED_ALL;
    // Reuse the search path with an empty query so filters are applied.
    return searchExercises("", filter);
  }, [filter]);

  const allVisible = useMemo(
    () => allExercises.slice(0, ALL_PAGE_SIZE * allPageCount),
    [allExercises, allPageCount],
  );

  // ── Handlers ──
  const handleClose = useCallback(() => {
    closePicker();
  }, [closePicker]);

  const handleQueryChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      const value = e.nativeEvent.text;
      setQuery(value);
      // Persist non-trivial queries into recents (debounced by the user — we
      // only commit on blur / submit to avoid spamming AsyncStorage).
    },
    [],
  );

  const commitRecent = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    void addRecentSearch(trimmed).then(() => {
      void getRecentSearches().then(setRecents);
    });
  }, [query]);

  const handleAddSingle = useCallback(
    (exercise: CuratedExercise) => {
      if (!pickerContext) return;
      const planned: PlannedExercise = curatedToPlanned(exercise);
      addExercise(pickerContext.dayIndex, planned);
      haptics.success();
      closePicker();
    },
    [pickerContext, addExercise, closePicker],
  );

  // ── Phase 9: Apply all AI suggestions at once ──
  const handleApplyAiSuggestions = useCallback(() => {
    if (!pickerContext || aiSuggestions.length === 0) return;
    applyAiSuggestions(pickerContext.dayIndex, aiSuggestions);
    haptics.success();
    closePicker();
  }, [pickerContext, aiSuggestions, applyAiSuggestions, closePicker]);

  // ── Phase 9: Apply a single AI suggestion ──
  const handleAddAiSuggestion = useCallback(
    (suggestion: AiSuggestion) => {
      if (!pickerContext) return;
      const planned: PlannedExercise = {
        exerciseId: suggestion.exerciseId,
        name: suggestion.name,
        sets: Array.from({ length: suggestion.sets }, (_, i) => ({
          setNumber: i + 1,
          reps: suggestion.reps,
          setType: "normal" as const,
        })),
        restSeconds: suggestion.restSeconds,
        notes: suggestion.reason,
      };
      addExercise(pickerContext.dayIndex, planned);
      haptics.success();
      closePicker();
    },
    [pickerContext, addExercise, closePicker],
  );

  const handleToggleFavorite = useCallback(
    async (exerciseId: string) => {
      const nowFav = await toggleFavorite(exerciseId);
      setFavorites(await getFavorites());
      if (nowFav) {
        haptics.celebration();
      } else {
        haptics.selection();
      }
    },
    [],
  );

  const handleToggleFilter = useCallback(
    <K extends keyof ExercisePickerFilter>(key: K, value: string) => {
      setFilter((prev) => {
        const next = { ...prev };
        const current = next[key] as string[] | undefined;
        if (key === "category") {
          // single-select
          if (next.category === value) {
            delete next.category;
          } else {
            next.category = value as CuratedExercise["category"];
          }
          return next;
        }
        if (!current) {
          (next[key] as string[]) = [value];
          return next;
        }
        if (current.includes(value)) {
          (next[key] as string[]) = current.filter((v) => v !== value);
        } else {
          (next[key] as string[]) = [...current, value];
        }
        return next;
      });
      setAllPageCount(1);
      haptics.selection();
    },
    [],
  );

  const handleClearFilters = useCallback(() => {
    setFilter({});
    setAllPageCount(1);
    haptics.selection();
  }, []);

  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      }
      haptics.selection();
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((exerciseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    if (!pickerContext) return;
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      const curated = CURATED_EXERCISES_BY_ID.get(id);
      if (!curated) continue;
      const planned = curatedToPlanned(curated);
      addExercise(pickerContext.dayIndex, planned);
    }
    haptics.success();
    setSelectedIds(new Set());
    setMultiSelectMode(false);
    closePicker();
  }, [pickerContext, selectedIds, addExercise, closePicker]);

  const handleRecentTap = useCallback((q: string) => {
    setQuery(q);
    inputRef.current?.focus();
    haptics.selection();
  }, []);

  // ── Render helpers ──
  const hasQuery = query.trim().length > 0;
  const hasActiveFilters =
    (filter.muscleGroups?.length ?? 0) > 0 ||
    (filter.equipment?.length ?? 0) > 0 ||
    (filter.difficulty?.length ?? 0) > 0 ||
    Boolean(filter.category);

  const renderCard = useCallback(
    (exercise: CuratedExercise, index: number) => (
      <ExercisePickerCard
        exercise={exercise}
        isFavorite={favorites.includes(exercise.id)}
        isSelected={selectedIds.has(exercise.id)}
        multiSelectMode={multiSelectMode}
        onAdd={() => handleAddSingle(exercise)}
        onToggleFavorite={() => handleToggleFavorite(exercise.id)}
        onToggleSelect={() => handleToggleSelect(exercise.id)}
        index={index}
        testID={`picker-card-${exercise.id}`}
      />
    ),
    [favorites, selectedIds, multiSelectMode, handleAddSingle, handleToggleFavorite, handleToggleSelect],
  );

  const renderSearchResult = useCallback(
    ({ item, index }: ListRenderItemInfo<CuratedExercise>) =>
      renderCard(item, index),
    [renderCard],
  );

  const renderAllItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CuratedExercise>) =>
      renderCard(item, index),
    [renderCard],
  );

  const keyExtractor = useCallback((item: CuratedExercise) => item.id, []);

  const onEndReached = useCallback(() => {
    setAllPageCount((prev) => prev + 1);
  }, []);

  // ── Empty state ──
  const renderEmpty = () => {
    if (!hasQuery && !hasActiveFilters) return null;
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="search-outline" size={rf(36)} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>No exercises found</Text>
        <Text style={styles.emptyHint}>
          Try a different search term or clear filters.
        </Text>
        {hasActiveFilters && (
          <GlassButton
            label="Clear filters"
            onPress={handleClearFilters}
            variant="secondary"
            style={styles.emptyBtn}
          />
        )}
      </View>
    );
  };

  return (
    <DetentBottomSheet
      visible={pickerOpen}
      onClose={handleClose}
      snapPoints={[0.3, 0.6, 0.95]}
      initialSnapIndex={2}
      testID="exercise-picker-sheet"
    >
      {/* ── HEADER: title + multi-select toggle ── */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Add Exercise</Text>
        <Pressable
          hitSlop={10}
          onPress={handleToggleMultiSelect}
          accessibilityRole="button"
          accessibilityLabel={multiSelectMode ? "Exit multi-select" : "Enter multi-select"}
          style={styles.multiToggle}
        >
          <Ionicons
            name={multiSelectMode ? "checkmark-circle" : "checkmark-circle-outline"}
            size={rf(22)}
            color={multiSelectMode ? colors.primary.DEFAULT : colors.text.secondary}
          />
        </Pressable>
      </View>

      {/* ── SEARCH BAR + filter button ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={rf(16)} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChange={handleQueryChange}
            onBlur={commitRecent}
            onSubmitEditing={commitRecent}
            placeholder="Search exercises, muscles, equipment…"
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
            accessibilityLabel="Search exercises"
          />
          {query.length > 0 && (
            <Pressable
              hitSlop={10}
              onPress={() => {
                setQuery("");
                haptics.selection();
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={rf(16)} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
        {/* Voice search placeholder removed — TODO(Phase 4): wire real voice
            search before re-enabling this control. */}
        {/* Filter toggle */}
        <Pressable
          hitSlop={10}
          onPress={() => {
            setFilterRowOpen((v) => !v);
            haptics.selection();
          }}
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
          style={[styles.iconBtn, hasActiveFilters && styles.iconBtnActive]}
        >
          <Ionicons
            name="options-outline"
            size={rf(20)}
            color={hasActiveFilters ? colors.primary.DEFAULT : colors.text.secondary}
          />
        </Pressable>
      </View>

      {/* ── MULTI-SELECT ADD BAR (when active) ── */}
      {multiSelectMode && (
        <View style={styles.multiBar}>
          <Text style={styles.multiBarText}>
            {selectedIds.size} selected
          </Text>
          <GlassButton
            label={selectedIds.size > 0 ? `Add ${selectedIds.size}` : "Add"}
            onPress={handleAddSelected}
            variant="primary"
            disabled={selectedIds.size === 0}
            icon="add"
            style={styles.multiAddBtn}
          />
        </View>
      )}

      {/* ── FILTER CHIP ROWS (collapsible) ── */}
      {filterRowOpen && (
        <View style={styles.filterSection}>
          <FilterChipRow
            label="Muscle"
            options={MUSCLE_OPTIONS as unknown as string[]}
            selected={filter.muscleGroups ?? []}
            onToggle={(v) => handleToggleFilter("muscleGroups", v)}
          />
          <FilterChipRow
            label="Equipment"
            options={EQUIPMENT_OPTIONS as unknown as string[]}
            selected={filter.equipment ?? []}
            onToggle={(v) => handleToggleFilter("equipment", v)}
          />
          <FilterChipRow
            label="Difficulty"
            options={DIFFICULTY_OPTIONS as unknown as string[]}
            selected={filter.difficulty ?? []}
            onToggle={(v) => handleToggleFilter("difficulty", v)}
          />
          <FilterChipRow
            label="Pattern"
            options={CATEGORY_OPTIONS as unknown as string[]}
            selected={filter.category ? [filter.category] : []}
            onToggle={(v) => handleToggleFilter("category", v)}
          />
          {hasActiveFilters && (
            <Pressable
              onPress={handleClearFilters}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              style={styles.clearFiltersBtn}
            >
              <Text style={styles.clearFiltersText}>Clear all filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── BODY ── */}
      {hasQuery || hasActiveFilters ? (
        // Search / filter results
        <FlatList
          data={searchResults.length > 0 ? searchResults : (hasActiveFilters ? allExercises : [])}
          keyExtractor={keyExtractor}
          renderItem={renderSearchResult}
          ListEmptyComponent={hasQuery || hasActiveFilters ? renderEmpty : null}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.5}
        />
      ) : (
        // Sectioned browse mode
        <FlatList
          data={allVisible}
          keyExtractor={keyExtractor}
          renderItem={renderAllItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View>
              {recents.length > 0 && (
                <Section title="Recent searches">
                  <View style={styles.chipFlow}>
                    {recents.map((q) => (
                      <Pressable
                        key={q}
                        style={styles.recentChip}
                        onPress={() => handleRecentTap(q)}
                        accessibilityRole="button"
                        accessibilityLabel={`Search ${q}`}
                      >
                        <Ionicons name="time-outline" size={rf(11)} color={colors.text.tertiary} />
                        <Text style={styles.recentChipText} numberOfLines={1}>{q}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Section>
              )}

              <Section title="Popular">
                {popular.map((ex, i) => renderCard(ex, i))}
              </Section>

              <Section title="Recommended for this day">
                {recommended.length > 0 ? (
                  recommended.map((ex, i) => renderCard(ex, i))
                ) : (
                  <Text style={styles.sectionEmpty}>
                    Add a few exercises and we'll suggest complementary ones.
                  </Text>
                )}
              </Section>

              {/* Phase 9 — AI-powered suggestions (complementary exercises) */}
              {(aiLoading || aiSuggestions.length > 0 || aiError.length > 0) && (
                <View style={styles.aiSection}>
                  <View style={styles.aiSectionHeader}>
                    <Ionicons
                      name="sparkles"
                      size={rf(14)}
                      color={colors.primary.DEFAULT}
                    />
                    <Text style={styles.aiSectionTitle}>Recommended (AI)</Text>
                    {aiLoading && (
                      <AuroraSpinner customSize={rf(12)} theme="white" />
                    )}
                  </View>
                  {aiError.length > 0 && !aiLoading && (
                    <Text style={styles.aiErrorText}>{aiError}</Text>
                  )}
                  {!aiLoading && aiSuggestions.length > 0 && (
                    <>
                      {aiReasoning.length > 0 && (
                        <Text style={styles.aiReasoning} numberOfLines={2}>
                          {aiReasoning}
                        </Text>
                      )}
                      {aiSuggestions.map((s, i) => (
                        <Pressable
                          key={`ai-${s.exerciseId}-${i}`}
                          onPress={() => handleAddAiSuggestion(s)}
                          accessibilityRole="button"
                          accessibilityLabel={`Add AI suggestion: ${s.name}`}
                          style={styles.aiSuggestionCard}
                        >
                          <View style={styles.aiSuggestionHeader}>
                            <Text style={styles.aiSuggestionName} numberOfLines={1}>
                              {s.name}
                            </Text>
                            <View style={styles.confidenceBadge}>
                              <Text style={styles.confidenceText}>
                                {Math.round(s.confidence * 100)}%
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.aiSuggestionReason} numberOfLines={2}>
                            {s.reason}
                          </Text>
                          <Text style={styles.aiSuggestionMeta}>
                            {s.sets} sets · {s.reps} reps · {s.muscleGroup}
                          </Text>
                        </Pressable>
                      ))}
                      {aiSuggestions.length > 1 && (
                        <GlassButton
                          label="Apply AI Recommendation"
                          onPress={handleApplyAiSuggestions}
                          variant="primary"
                          icon="sparkles"
                          style={styles.aiApplyBtn}
                          textStyle={styles.aiApplyBtnText}
                        />
                      )}
                    </>
                  )}
                </View>
              )}

              {favoriteExercises.length > 0 && (
                <Section title="Pinned favourites">
                  {favoriteExercises.map((ex, i) => renderCard(ex, i))}
                </Section>
              )}

              <Section title="All exercises">
                <Text style={styles.sectionCount}>{allExercises.length} available</Text>
              </Section>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </DetentBottomSheet>
  );
};

// ----------------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------------

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const FilterChipRow: React.FC<{
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}> = ({ label, options, selected, onToggle }) => (
  <View style={styles.filterRow}>
    <Text style={styles.filterLabel}>{label}</Text>
    <View style={styles.chipFlow}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => onToggle(opt)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${label}: ${opt}`}
            style={[styles.filterChip, active && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

// ----------------------------------------------------------------------------
// MODULE-LEVEL CACHES (built once on import)
// ----------------------------------------------------------------------------

const CURATED_ALL: CuratedExercise[] = CURATED_EXERCISES;

const CURATED_EXERCISES_BY_ID: Map<string, CuratedExercise> = new Map(
  CURATED_ALL.map((c) => [c.id, c]),
);

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rp(spacing.sm),
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as TextStyleWeight,
  } as TextStyle,
  multiToggle: {
    width: Math.max(rw(36), 44),
    height: Math.max(rw(36), 44),
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.sm),
  },
  searchIcon: {
    marginRight: rp(spacing.xs),
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    paddingVertical: rp(spacing.sm),
  },
  clearBtn: {
    padding: rp(spacing.xxs),
  },
  iconBtn: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    borderColor: colors.primary.DEFAULT,
  },
  multiBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.glass.backgroundLight,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
  },
  multiBarText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  } as TextStyle,
  multiAddBtn: {
    minWidth: rw(110),
  },
  filterSection: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    padding: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  filterRow: {
    gap: rp(spacing.xxs),
  },
  filterLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
    textTransform: "uppercase",
  } as TextStyle,
  chipFlow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.xs),
  },
  filterChip: {
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: Math.max(rp(36), 36),
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.dark,
  },
  filterChipText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  filterChipTextActive: {
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  } as TextStyle,
  clearFiltersBtn: {
    alignSelf: "flex-end",
    paddingVertical: rp(spacing.xxs),
  },
  clearFiltersText: {
    color: colors.primary.light,
    fontSize: rf(typography.fontSize.micro),
  },
  listContent: {
    paddingBottom: rp(spacing.xl),
  },
  // Sections
  section: {
    marginBottom: rp(spacing.md),
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as TextStyleWeight,
    marginBottom: rp(spacing.xs),
    textTransform: "uppercase",
  } as TextStyle,
  sectionCount: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginBottom: rp(spacing.xs),
  },
  sectionEmpty: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontStyle: "italic",
  },
  // Recent chips
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    maxWidth: rw(160),
  },
  recentChipText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    flexShrink: 1,
  },
  // Empty state
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.xl),
    gap: rp(spacing.sm),
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  } as TextStyle,
  emptyHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: rp(spacing.sm),
  },
  // Phase 9 — AI suggestions
  aiSection: {
    marginBottom: rp(spacing.md),
    padding: rp(spacing.sm),
    backgroundColor: "rgba(255, 107, 53, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.4)",
    borderRadius: borderRadius.lg,
    gap: rp(spacing.xs),
    maxHeight: rp(220),
    overflow: "hidden",
  },
  aiSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  aiSectionTitle: {
    flex: 1,
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as TextStyleWeight,
    textTransform: "uppercase",
  } as TextStyle,
  aiErrorText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontStyle: "italic",
  },
  aiReasoning: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.normal,
  },
  aiSuggestionCard: {
    backgroundColor: colors.glass.backgroundLight,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    padding: rp(spacing.sm),
    gap: rp(spacing.xxs),
  },
  aiSuggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.xs),
  },
  aiSuggestionName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  } as TextStyle,
  confidenceBadge: {
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(2),
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(76, 175, 80, 0.18)",
  },
  confidenceText: {
    color: colors.success.light,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  } as TextStyle,
  aiSuggestionReason: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.normal,
  },
  aiSuggestionMeta: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  aiApplyBtn: {
    marginTop: rp(spacing.xs),
    minHeight: Math.max(rf(36), 44),
  },
  aiApplyBtnText: {
    fontSize: rf(typography.fontSize.caption),
  },
});

// RN TextStyle alias for the fontWeight cast (mirrors ExerciseRow pattern).
type TextStyleWeight = TextStyle["fontWeight"];

export default ExercisePickerSheet;
