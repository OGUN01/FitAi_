/**
 * MyWorkoutsCard Component
 *
 * Flat grouped-list section (Apple Fitness+ style — no cards-in-cards):
 *  - Uppercase muted section label + count
 *  - One navigation row into TemplateLibrary (preserves the legacy
 *    `template-library-button` testID on the element that opens the library)
 *  - Read-only all-time stat rows (sessions / duration / calories) with
 *    hairline separators — same data sources as the previous 2x2 stat grid.
 *
 * Data sources (read-only — this is a pure presentation component):
 *  - Sessions / Total Duration / Total Calories → derived locally via useMemo
 *    from the store's `completedSessions` array (all sessions, every week,
 *    planned + extra). We subscribe to the stable array reference rather than
 *    calling the `getAllTimeWorkoutStats()` selector, because Zustand v5 uses
 *    Object.is snapshot equality — a selector returning a fresh object literal
 *    on every call triggers an infinite re-render loop.
 *  - Templates count → workoutTemplateService.getTemplates(userId), loaded
 *    on mount AND on navigation focus (so the count is fresh after creating
 *    a template in TemplateLibrary and returning).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing } from '../../../theme/aurora-tokens';
import { FONT_FAMILY } from '../../../theme/fonts';
import { rf, rw, rp, rbr } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';
import { useFitnessStore } from '../../../stores/fitnessStore';
import { workoutTemplateService } from '../../../services/workoutTemplateService';
import { getCurrentUserId } from '../../../services/authUtils';

interface MyWorkoutsCardProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    addListener?: (event: 'focus', cb: () => void) => () => void;
  };
  /** Fired when the empty-state "Start a workout" CTA is tapped. Wired from
   *  FitnessScreen to the same handler as today's workout start button. */
  onStartWorkout?: () => void;
}

/**
 * Format a duration in minutes as a compact "Xh Ym" string.
 * - 0 → "0m"
 * - 45 → "45m"
 * - 75 → "1h 15m"
 * - 600 → "10h 0m"
 *
 * Kept local to this card because no existing util formats minutes this way
 * (utils/exerciseDuration.formatDuration formats seconds as M:SS, and
 * utils/mealSchedule.formatMinutesToTime returns a clock time like "7:30 AM").
 */
const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

/**
 * Format an integer with thousands separators (e.g. 4380 → "4,380").
 * Uses `toLocaleString` so the grouping follows the device locale.
 */
const formatThousands = (value: number): string => {
  if (!value || value <= 0) return '0';
  return Math.round(value).toLocaleString('en-US');
};

export const MyWorkoutsCard: React.FC<MyWorkoutsCardProps> = ({ navigation, onStartWorkout }) => {
  // Subscribe to the stable `completedSessions` array reference (only changes
  // when a session is added/removed) and derive all-time totals with useMemo.
  // NEVER pass a selector returning a fresh object literal to useFitnessStore —
  // that defeats Zustand's Object.is snapshot equality and causes an infinite
  // re-render loop ("getSnapshot should be cached").
  const completedSessions = useFitnessStore((s) => s.completedSessions);

  const stats = useMemo(() => {
    return {
      count: completedSessions.length,
      totalCalories: completedSessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
      totalDuration: completedSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    };
  }, [completedSessions]);

  // Templates count loaded async on mount AND on navigation focus — without the
  // focus listener, returning from TemplateLibrary after creating a template
  // shows a stale count (the effect only ran once on initial mount).
  const [templateCount, setTemplateCount] = useState<number | null>(null);

  const loadTemplates = React.useCallback(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setTemplateCount(0);
      return;
    }
    workoutTemplateService
      .getTemplates(userId)
      .then((templates) => {
        setTemplateCount(templates.length);
      })
      .catch(() => {
        // Service already logs the Supabase error; just surface a safe value.
        setTemplateCount(0);
      });
  }, []);

  useEffect(() => {
    loadTemplates();
    // Refresh on screen focus — covers "created template elsewhere, returned".
    const unsubscribe = navigation.addListener?.('focus', loadTemplates);
    return () => {
      unsubscribe?.();
    };
  }, [loadTemplates, navigation]);

  const handleViewAll = () => navigation.navigate('TemplateLibrary');
  const isEmpty = stats.count === 0;

  // Empty state: simple muted centered text + text CTAs — no box. The two CTAs
  // remain sibling pressables (never nested) so the web <button>-in-<button>
  // hydration error cannot occur. `template-library-button` sits on the
  // "Browse Library" CTA — the element that opens TemplateLibrary here.
  if (isEmpty) {
    return (
      <Animated.View entering={FadeInDown.delay(250).duration(400)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MY WORKOUTS</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle} numberOfLines={1}>
            No Workouts Yet
          </Text>
          <Text style={styles.emptySubtitle} numberOfLines={3}>
            Complete your first workout to see it here.
          </Text>
          {onStartWorkout && (
            <AnimatedPressable
              onPress={onStartWorkout}
              scaleValue={0.96}
              hapticFeedback={true}
              hapticType="light"
              style={styles.emptyCtaButton}
              accessibilityRole="button"
              accessibilityLabel="Start a workout"
            >
              <Text style={styles.emptyCta}>Start a workout</Text>
            </AnimatedPressable>
          )}
          <AnimatedPressable
            onPress={handleViewAll}
            scaleValue={0.96}
            hapticFeedback={true}
            hapticType="light"
            style={styles.emptyCtaButton}
            accessibilityRole="button"
            accessibilityLabel="Browse workout library"
            testID="template-library-button"
          >
            <Text style={styles.emptyLibraryLink}>Browse Library</Text>
          </AnimatedPressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(250).duration(400)}>
      {/* Section header — uppercase letterspaced muted label + count */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>MY WORKOUTS</Text>
        <Text style={styles.sectionCount} numberOfLines={1}>
          {stats.count} workouts
        </Text>
      </View>

      {/* Flat grouped list — hairline separators, no boxes around rows */}
      <View>
        <AnimatedPressable
          onPress={handleViewAll}
          scaleValue={0.98}
          hapticFeedback={true}
          hapticType="light"
          accessibilityRole="button"
          accessibilityLabel="My workouts library"
          accessibilityHint="Double tap to view your workout templates"
          testID="template-library-button"
        >
          <View style={styles.row}>
            <View style={[styles.iconSquare, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
              <Ionicons name="barbell-outline" size={rf(18)} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                Workout Library
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {templateCount === null ? '-' : templateCount} templates
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={rf(16)} color={colors.textTertiary} />
          </View>
        </AnimatedPressable>

        <View style={styles.separator} />
        <StatRow
          icon="checkmark-done-outline"
          tint={colors.primary}
          title="Sessions Completed"
          value={String(stats.count)}
        />
        <View style={styles.separator} />
        <StatRow
          icon="time-outline"
          tint={colors.successAlt}
          title="Total Duration"
          value={formatDuration(stats.totalDuration)}
        />
        <View style={styles.separator} />
        <StatRow
          icon="flame-outline"
          tint={colors.warningAlt}
          title="Calories Burned"
          value={`${formatThousands(stats.totalCalories)} kcal`}
        />
      </View>
    </Animated.View>
  );
};

/** Read-only iOS-style stat row: tinted icon square, label left, value right. */
interface StatRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  value: string;
}

const StatRow: React.FC<StatRowProps> = ({ icon, tint, title, value }) => (
  <View style={styles.row}>
    <View style={[styles.iconSquare, { backgroundColor: hexToRgba(tint, 0.12) }]}>
      <Ionicons name={icon} size={rf(18)} color={tint} />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
    <Text style={styles.rowValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  sectionCount: {
    fontSize: rf(11),
    fontWeight: '500',
    color: colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: rp(spacing.sm),
  },
  iconSquare: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
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
  rowValue: {
    fontSize: rf(15),
    fontWeight: '600',
    color: colors.text,
    flexShrink: 0,
  },
  // 1px hairline, leading-inset so it aligns with the row text (iOS style).
  // rw(40) scales the icon square width; rp(spacing.md) scales the icon→text
  // gap to match — both must scale together or the hairline drifts on wider
  // screens.
  separator: {
    height: 1,
    backgroundColor: hexToRgba(colors.text, 0.06),
    marginLeft: rw(40) + rp(spacing.md),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: rf(13),
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: rw(280),
    marginTop: spacing.xs,
  },
  emptyCtaButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emptyCta: {
    fontSize: rf(15),
    fontWeight: '600',
    color: colors.primary,
  },
  emptyLibraryLink: {
    fontSize: rf(13),
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

export default MyWorkoutsCard;
