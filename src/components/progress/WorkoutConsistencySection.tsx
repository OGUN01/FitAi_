/**
 * WorkoutConsistencySection — GitHub-style heatmap (Aurora 2026)
 *
 * Perfect-square cells, 4px radius, single accent scale (chart.1 orange
 * at 4 opacity steps over surface.1). No boxed card.
 *
 * DATA SOURCES (single sources of truth):
 *  - completedSessions (fitnessStore) → workout dates for calendar
 *  - weeklyProgress.streak (DataRetrievalService) → current streak count
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFitnessStore } from '../../stores/fitnessStore';
import {
  chart,
  colors,
  surface,
  border as borderTokens,
  typography,
  spacing,
  borderRadius,
} from '../../theme/aurora-tokens';

const WEEKS_SHOWN = 12;
const DAYS_PER_WEEK = 7;
const CELL_SIZE = 14;
const CELL_GAP = 4;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const ACCENT = chart[1];
const ACCENT_SCALE = [
  surface[1],
  `${ACCENT}55`,
  `${ACCENT}99`,
  `${ACCENT}CC`,
  ACCENT,
] as const;

interface WorkoutConsistencySectionProps {
  streak: number;
}

const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const WorkoutConsistencySection: React.FC<WorkoutConsistencySectionProps> = ({
  streak,
}) => {
  const completedSessions = useFitnessStore((s) => s.completedSessions);

  const workedOutDays = useMemo(() => {
    const set = new Set<string>();
    completedSessions.forEach((s) => {
      set.add(dateKey(new Date(s.completedAt)));
    });
    return set;
  }, [completedSessions]);

  const { weeks, monthLabels, totalThisPeriod } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0 … Sun=6

    // End of grid = Saturday of the current week (so weeks align Mon-Sun and
    // the current week is the right-most column).
    const gridEnd = new Date(today);
    gridEnd.setDate(today.getDate() + (6 - dayOfWeek));

    const gridStart = new Date(gridEnd);
    gridStart.setDate(gridEnd.getDate() - (WEEKS_SHOWN * DAYS_PER_WEEK - 1));

    const weeksArr: Array<Array<{ key: string; worked: boolean; isToday: boolean; inFuture: boolean }>> = [];
    const months: Array<{ index: number; label: string }> = [];
    let lastMonth = -1;
    let total = 0;

    for (let w = 0; w < WEEKS_SHOWN; w++) {
      const week: Array<{ key: string; worked: boolean; isToday: boolean; inFuture: boolean }> = [];
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + w * DAYS_PER_WEEK + d);
        const key = dateKey(date);
        const worked = workedOutDays.has(key);
        if (worked && date <= today) {
          total += 1;
        }
        if (d === 0 && date.getMonth() !== lastMonth) {
          months.push({
            index: w,
            label: date.toLocaleDateString('en-US', { month: 'short' }),
          });
          lastMonth = date.getMonth();
        }
        week.push({
          key,
          worked,
          isToday: date.getTime() === today.getTime(),
          inFuture: date.getTime() > today.getTime(),
        });
      }
      weeksArr.push(week);
    }
    return { weeks: weeksArr, monthLabels: months, totalThisPeriod: total };
  }, [workedOutDays]);

  return (
    <Animated.View
      entering={FadeInDown.delay(180).duration(320)}
      style={styles.section}
    >
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Consistency</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={13} color={ACCENT} />
            <Text style={styles.streakText}>{streak} day streak</Text>
          </View>
        )}
      </View>

      {/* Month labels */}
      <View style={styles.monthRow}>
        {monthLabels.map((m) => (
          <Text
            key={`${m.label}-${m.index}`}
            style={[styles.monthLabel, { left: m.index * (CELL_SIZE + CELL_GAP) }]}
          >
            {m.label}
          </Text>
        ))}
      </View>

      {/* Day-of-week labels + heatmap grid */}
      <View style={styles.gridRow}>
        <View style={styles.dayLabelsCol}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={styles.dayLabel}>
              {i % 2 === 0 ? d : ''}
            </Text>
          ))}
        </View>
        <View style={styles.weeksRow}>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekCol}>
              {week.map((cell) => {
                const level = cell.worked ? 4 : 0;
                return (
                  <View
                    key={cell.key}
                    style={[
                      styles.cell,
                      { backgroundColor: cell.inFuture ? 'transparent' : ACCENT_SCALE[level] },
                      cell.isToday && styles.cellToday,
                      cell.inFuture && styles.cellFuture,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Footer: total + legend */}
      <View style={styles.footer}>
        <Text style={styles.totalText}>
          <Text style={styles.totalValue}>{totalThisPeriod}</Text> workouts · last {WEEKS_SHOWN} weeks
        </Text>
        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          {ACCENT_SCALE.map((c, i) => (
            <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: `${ACCENT}1A`,
  },
  streakText: {
    ...typography.variants.caption,
    fontFamily: 'Manrope_700Bold',
    color: ACCENT,
  },
  monthRow: {
    height: 16,
    marginBottom: spacing.xxs,
    marginLeft: 20 + CELL_GAP,
    position: 'relative',
  },
  monthLabel: {
    position: 'absolute',
    ...typography.variants.caption,
    fontSize: 10,
    color: colors.text.muted,
  },
  gridRow: {
    flexDirection: 'row',
  },
  dayLabelsCol: {
    width: 20,
    marginRight: CELL_GAP,
    justifyContent: 'space-between',
  },
  dayLabel: {
    height: CELL_SIZE,
    ...typography.variants.caption,
    lineHeight: CELL_SIZE,
    fontSize: 9,
    color: colors.text.muted,
    textAlign: 'center',
  },
  weeksRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  weekCol: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: borderRadius.sm,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.text.primary,
  },
  cellFuture: {
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    borderStyle: 'dashed',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  totalText: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
  totalValue: {
    ...typography.variants.caption,
    fontFamily: 'Manrope_700Bold',
    color: colors.text.primary,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.sm,
  },
  legendText: {
    ...typography.variants.caption,
    fontSize: 10,
    color: colors.text.muted,
    marginHorizontal: spacing.xxs,
  },
});

export default WorkoutConsistencySection;
