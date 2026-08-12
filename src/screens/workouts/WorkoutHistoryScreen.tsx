/**
 * WorkoutHistoryScreen — flat, week-grouped workout history.
 *
 * Replaces the dead-end "See all N workouts" CTA that previously opened an
 * Alert for a single workout (audit finding #3). Reads `completedSessions`
 * straight from `useFitnessStore` (the runtime source of truth) — pure
 * presentational, no writes.
 *
 * Design language (2026 flat):
 *  - Custom flat header: back chevron + uppercase letterspaced "WORKOUT LOG"
 *    eyebrow + bold "History" title. No glass cards anywhere.
 *  - Sessions grouped by week (getWeekStartForDate) under uppercase muted
 *    week eyebrows ("THIS WEEK" / "WEEK OF JUL 20") with session counts.
 *  - Rows reuse WorkoutHistoryList's flat row language: tinted category icon
 *    square, semibold title, muted meta (date • duration • kcal), hairline
 *    separators with a leading inset aligned to the text.
 *  - Row tap navigates to 'WorkoutDetail' with { workout: workoutSnapshot }
 *    when a snapshot exists; rows without a snapshot are non-tappable and
 *    render no chevron.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TextInput, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { GlassHeader } from '../../components/ui/aurora/GlassHeader';
import { useFitnessStore } from '../../stores/fitnessStore';
import { flatColors as colors, spacing } from '../../theme/aurora-tokens';
import { rf, rw, rp, rbr } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';
import { getCurrentWeekStart, getWeekStartForDate } from '../../utils/weekUtils';
import type { CompletedSession } from '../../stores/fitness/types';

// ----------------------------------------------------------------------------
// TYPES & CONSTANTS
// ----------------------------------------------------------------------------

interface WorkoutHistoryNavigation {
  goBack: () => void;
  navigate: (screen: string, params?: Record<string, unknown>) => void;
}

export interface WorkoutHistoryScreenProps {
  navigation: WorkoutHistoryNavigation;
  /** Route params are optional — the screen reads history from the store. */
  route?: { params?: Record<string, unknown> };
}

/** Flat row model — mirrors the completedWorkouts mapping in useFitnessLogic. */
interface HistoryRow {
  sessionId: string;
  workoutId: string;
  title: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  completedAt: string;
  workoutSnapshot?: CompletedSession['workoutSnapshot'];
}

/** SectionList section shape — one week group with the `data` key SectionList expects. */
interface HistorySection {
  weekStart: string;
  title: string;
  count: number;
  data: HistoryRow[];
}

// ----------------------------------------------------------------------------
// HELPERS (visual only)
// ----------------------------------------------------------------------------

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  switch (category?.toLowerCase()) {
    case 'strength':
      return 'barbell-outline';
    case 'cardio':
      return 'heart-outline';
    case 'hiit':
      return 'flash-outline';
    case 'flexibility':
    case 'yoga':
      return 'body-outline';
    default:
      return 'fitness-outline';
  }
}

// Category tint map — same language as WorkoutHistoryList.
function getCategoryTint(category: string): string {
  switch (category?.toLowerCase()) {
    case 'strength':
      return colors.teal;
    case 'cardio':
      return colors.errorLight;
    case 'hiit':
      return colors.pink;
    case 'flexibility':
    case 'yoga':
      return colors.primary;
    default:
      return colors.primary;
  }
}

function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const WorkoutHistoryScreen: React.FC<WorkoutHistoryScreenProps> = ({ navigation }) => {
  const completedSessions = useFitnessStore((state) => state.completedSessions);
  const [search, setSearch] = useState('');

  const allRows = useMemo<HistoryRow[]>(() => {
    return completedSessions
      .filter((s) => s.completedAt)
      .map<HistoryRow>((s) => ({
        sessionId: s.sessionId,
        workoutId: s.workoutId,
        title: s.workoutSnapshot.title,
        category: s.workoutSnapshot.category,
        duration: s.durationMinutes || s.workoutSnapshot.duration,
        caloriesBurned: s.caloriesBurned,
        completedAt: s.completedAt,
        workoutSnapshot: s.workoutSnapshot,
      }))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [completedSessions]);

  const totalCount = allRows.length;

  const sections = useMemo<HistorySection[]>(() => {
    const currentWeekStart = getCurrentWeekStart();
    const q = search.trim().toLowerCase();
    const rows = q ? allRows.filter((row) => row.title.toLowerCase().includes(q)) : allRows;

    const byWeek = new Map<string, HistoryRow[]>();
    for (const row of rows) {
      const weekStart = getWeekStartForDate(row.completedAt);
      const existing = byWeek.get(weekStart);
      if (existing) existing.push(row);
      else byWeek.set(weekStart, [row]);
    }

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekStart, weekRows]) => {
        const monday = new Date(`${weekStart}T00:00:00`);
        const title =
          weekStart === currentWeekStart
            ? 'This week'
            : `Week of ${monday.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}`;
        return { weekStart, title, count: weekRows.length, data: weekRows };
      });
  }, [allRows, search]);

  // Row tap — only when the session carries a workout snapshot (see header doc).
  const handleRowPress = useCallback(
    (row: HistoryRow) => {
      if (!row.workoutSnapshot) return;
      navigation.navigate('WorkoutDetail', { workout: row.workoutSnapshot });
    },
    [navigation]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: HistorySection }) => (
      <View style={styles.groupHeader} testID={`workout-history-week-${section.weekStart}`}>
        <Text style={styles.groupLabel} numberOfLines={1}>
          {section.title}
        </Text>
        <Text style={styles.groupCount} numberOfLines={1}>
          {section.count} workout{section.count === 1 ? '' : 's'}
        </Text>
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item: row, index, section }: ListRenderItemInfo<HistoryRow> & { section: HistorySection }) => {
      const tint = getCategoryTint(row.category);
      const tappable = !!row.workoutSnapshot;
      const isLast = index === section.data.length - 1;
      return (
        <Animated.View entering={FadeInRight.delay(Math.min(index, 6) * 40).duration(250)}>
          <AnimatedPressable
            onPress={tappable ? () => handleRowPress(row) : undefined}
            disabled={!tappable}
            scaleValue={0.98}
            springConfig="smooth"
            hapticType="light"
            style={styles.row}
            accessibilityRole={tappable ? 'button' : undefined}
            accessibilityLabel={`${row.title}, ${getRelativeDate(row.completedAt)}`}
            testID={`workout-history-row-${row.sessionId}`}
          >
            {/* Category icon square — tinted by category */}
            <View style={[styles.iconSquare, { backgroundColor: hexToRgba(tint, 0.15) }]}>
              <Ionicons name={getCategoryIcon(row.category)} size={rf(18)} color={tint} />
            </View>

            {/* Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {row.title}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {getRelativeDate(row.completedAt)} • {row.duration || 0} min • {row.caloriesBurned || 0} kcal
              </Text>
            </View>

            {/* Chevron — only when the row is tappable */}
            {tappable ? (
              <Ionicons name="chevron-forward" size={rf(16)} color={colors.textTertiary} style={styles.chevron} />
            ) : null}
          </AnimatedPressable>
          {/* Hairline separator — leading-inset to align with row text */}
          {!isLast ? <View style={styles.separator} /> : null}
        </Animated.View>
      );
    },
    [handleRowPress]
  );

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex} edges={['top']} testID="workout-history-screen">
        {/* Shared Aurora header — back + eyebrow + title */}
        <GlassHeader title="History" eyebrow="Workout Log" onBack={navigation.goBack} backAccessibilityLabel="Go back" />

        {totalCount > 0 ? (
          <>
            <Text style={styles.summary} numberOfLines={1}>
              {totalCount} workout{totalCount === 1 ? '' : 's'} completed
            </Text>

            {/* Search by workout title — filters sections below */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={rf(16)} color={colors.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search history..."
                placeholderTextColor={colors.textTertiary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                returnKeyType="search"
                testID="workout-history-search-input"
              />
              {search.length > 0 ? (
                <AnimatedPressable
                  onPress={() => setSearch('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  scaleValue={0.9}
                  springConfig="snappy"
                  hapticType="light"
                >
                  <Ionicons name="close-circle" size={rf(16)} color={colors.textTertiary} />
                </AnimatedPressable>
              ) : null}
            </View>

            <SectionList
              style={styles.flex}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              testID="workout-history-list"
              sections={sections}
              keyExtractor={(row) => row.sessionId}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              initialNumToRender={12}
              windowSize={7}
              ListEmptyComponent={
                <Text style={styles.emptySearchText}>
                  {search.trim() ? `No workouts match "${search.trim()}"` : 'No workouts found'}
                </Text>
              }
            />
          </>
        ) : (
          /* Muted empty state */
          <View style={styles.emptyState} testID="workout-history-empty">
            <Ionicons name="barbell-outline" size={rf(28)} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Workouts Yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first workout to start tracking your progress. Every rep counts!
            </Text>
          </View>
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    fontSize: rf(12),
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: rp(spacing.xs),
    marginBottom: rp(spacing.sm),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    marginHorizontal: rp(spacing.md),
    marginBottom: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    borderRadius: rbr(12),
    backgroundColor: hexToRgba(colors.text, 0.05),
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: rf(14),
    color: colors.text,
    paddingVertical: rp(4),
  },
  emptySearchText: {
    fontSize: rf(13),
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: rp(spacing.xl),
    paddingHorizontal: rp(spacing.lg),
  },
  listContent: {
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.xs),
    paddingBottom: rp(spacing.xxl),
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rp(spacing.md),
    marginBottom: rp(spacing.xs),
  },
  groupLabel: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  groupCount: {
    fontSize: rf(12),
    fontWeight: '500',
    color: colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
  },
  iconSquare: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: colors.text,
  },
  rowMeta: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  chevron: {
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: hexToRgba(colors.text, 0.06),
    marginLeft: rw(40) + spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: rp(spacing.lg),
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(18),
  },
});

export default WorkoutHistoryScreen;
