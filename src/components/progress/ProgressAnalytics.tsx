import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Card, THEME } from '../ui';
import { useProgressData } from '../../hooks/useProgressData';

const { width } = Dimensions.get('window');

interface ProgressAnalyticsProps {
  timeRange?: 'week' | 'month' | 'year';
  onTimeRangeChange?: (range: 'week' | 'month' | 'year') => void;
}

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({
  timeRange = 'month',
  onTimeRangeChange,
}) => {
  const { 
    progressStats, 
    progressEntries,
    progressGoals,
    loadProgressStats,
    statsLoading 
  } = useProgressData();
  
  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'year'>(timeRange);

  useEffect(() => {
    const days = selectedRange === 'week' ? 7 : selectedRange === 'month' ? 30 : 365;
    loadProgressStats(days);
  }, [selectedRange, loadProgressStats]);

  const handleRangeChange = (range: 'week' | 'month' | 'year') => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const timeRanges = [
    { id: 'week', label: 'Week', icon: '📅' },
    { id: 'month', label: 'Month', icon: '🗓️' },
    { id: 'year', label: 'Year', icon: '📆' },
  ] as const;

  const getProgressColor = (change: number) => {
    if (change > 0) return THEME.colors.success;
    if (change < 0) return THEME.colors.warning;
    return THEME.colors.textSecondary;
  };

  const getProgressIcon = (change: number) => {
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➡️';
  };

  const formatChange = (change: number, unit: string) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}${unit}`;
  };

  const calculateGoalProgress = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  if (statsLoading) {
    return (
      <Card style={styles.container} variant="elevated">
        <Text style={styles.loadingText}>Loading progress analytics...</Text>
      </Card>
    );
  }

  if (!progressStats) {
    return (
      <Card style={styles.container} variant="elevated">
        <Text style={styles.emptyText}>No progress data available</Text>
        <Text style={styles.emptySubtext}>Add measurements to see analytics</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container} variant="elevated">
      <View style={styles.header}>
        <Text style={styles.title}>Progress Analytics</Text>
        
        {/* Time Range Selector */}
        <View style={styles.timeRangeSelector}>
          {timeRanges.map((range) => (
            <TouchableOpacity
              key={range.id}
              style={[
                styles.timeRangeButton,
                selectedRange === range.id && styles.timeRangeButtonActive,
              ]}
              onPress={() => handleRangeChange(range.id)}
            >
              <Text style={styles.timeRangeIcon}>{range.icon}</Text>
              <Text
                style={[
                  styles.timeRangeLabel,
                  selectedRange === range.id && styles.timeRangeLabelActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Progress Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {/* Weight Progress */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>⚖️</Text>
                <Text style={styles.metricValue}>{progressStats.weightChange.current.toFixed(1)}kg</Text>
              </View>
              <Text style={styles.metricLabel}>Weight</Text>
              <View style={styles.changeContainer}>
                <Text style={[styles.changeText, { color: getProgressColor(progressStats.weightChange.change) }]}>
                  {getProgressIcon(progressStats.weightChange.change)} {formatChange(progressStats.weightChange.change, 'kg')}
                </Text>
              </View>
              {progressGoals?.target_weight_kg && (
                <View style={styles.goalProgress}>
                  <Text style={styles.goalText}>Goal: {progressGoals.target_weight_kg}kg</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${calculateGoalProgress(progressStats.weightChange.current, progressGoals.target_weight_kg)}%` }
                      ]} 
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Body Fat Progress */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>📊</Text>
                <Text style={styles.metricValue}>{progressStats.bodyFatChange.current.toFixed(1)}%</Text>
              </View>
              <Text style={styles.metricLabel}>Body Fat</Text>
              <View style={styles.changeContainer}>
                <Text style={[styles.changeText, { color: getProgressColor(-progressStats.bodyFatChange.change) }]}>
                  {getProgressIcon(-progressStats.bodyFatChange.change)} {formatChange(progressStats.bodyFatChange.change, '%')}
                </Text>
              </View>
              {progressGoals?.target_body_fat_percentage && (
                <View style={styles.goalProgress}>
                  <Text style={styles.goalText}>Goal: {progressGoals.target_body_fat_percentage}%</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${100 - calculateGoalProgress(progressStats.bodyFatChange.current, progressGoals.target_body_fat_percentage)}%` }
                      ]} 
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Muscle Mass Progress */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>💪</Text>
                <Text style={styles.metricValue}>{progressStats.muscleChange.current.toFixed(1)}kg</Text>
              </View>
              <Text style={styles.metricLabel}>Muscle Mass</Text>
              <View style={styles.changeContainer}>
                <Text style={[styles.changeText, { color: getProgressColor(progressStats.muscleChange.change) }]}>
                  {getProgressIcon(progressStats.muscleChange.change)} {formatChange(progressStats.muscleChange.change, 'kg')}
                </Text>
              </View>
              {progressGoals?.target_muscle_mass_kg && (
                <View style={styles.goalProgress}>
                  <Text style={styles.goalText}>Goal: {progressGoals.target_muscle_mass_kg}kg</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${calculateGoalProgress(progressStats.muscleChange.current, progressGoals.target_muscle_mass_kg)}%` }
                      ]} 
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Body Measurements */}
        {Object.keys(progressStats.measurementChanges).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body Measurements</Text>
            <View style={styles.measurementsContainer}>
              {Object.entries(progressStats.measurementChanges).map(([measurement, data]) => (
                <View key={measurement} style={styles.measurementItem}>
                  <View style={styles.measurementHeader}>
                    <Text style={styles.measurementName}>{measurement.charAt(0).toUpperCase() + measurement.slice(1)}</Text>
                    <Text style={styles.measurementValue}>{data.current.toFixed(1)}cm</Text>
                  </View>
                  <Text style={[styles.measurementChange, { color: getProgressColor(data.change) }]}>
                    {formatChange(data.change, 'cm')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Progress Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              📈 Total Entries: {progressStats.totalEntries}
            </Text>
            <Text style={styles.summaryText}>
              📅 Tracking Period: {progressStats.timeRange} days
            </Text>
            {progressStats.weightChange.changePercentage !== 0 && (
              <Text style={styles.summaryText}>
                ⚖️ Weight Change: {progressStats.weightChange.changePercentage.toFixed(1)}%
              </Text>
            )}
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightsContainer}>
            {progressStats.totalEntries === 0 ? (
              <Text style={styles.insightText}>
                📊 Start tracking your measurements to see progress insights!
              </Text>
            ) : (
              <>
                {progressStats.totalEntries >= 2 && (
                  <Text style={styles.insightText}>
                    🎯 Great consistency! You have {progressStats.totalEntries} measurements recorded.
                  </Text>
                )}
                
                {progressStats.weightChange.change < 0 && (
                  <Text style={styles.insightText}>
                    📉 You're making progress with weight loss! Keep up the great work.
                  </Text>
                )}
                
                {progressStats.muscleChange.change > 0 && (
                  <Text style={styles.insightText}>
                    💪 Excellent muscle gain! Your strength training is paying off.
                  </Text>
                )}
                
                {progressStats.bodyFatChange.change < 0 && (
                  <Text style={styles.insightText}>
                    🔥 Body fat reduction detected! Your fitness routine is working.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.lg,
    margin: THEME.spacing.md,
  },

  header: {
    marginBottom: THEME.spacing.lg,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
  },

  timeRangeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
  },

  timeRangeButtonActive: {
    backgroundColor: THEME.colors.primary,
  },

  timeRangeIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.xs,
  },

  timeRangeLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  timeRangeLabelActive: {
    color: THEME.colors.white,
  },

  section: {
    marginBottom: THEME.spacing.lg,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  metricsGrid: {
    gap: THEME.spacing.md,
  },

  metricCard: {
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },

  metricIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },

  metricValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  metricLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
  },

  changeContainer: {
    marginBottom: THEME.spacing.sm,
  },

  changeText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },

  goalProgress: {
    marginTop: THEME.spacing.sm,
  },

  goalText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.xs,
  },

  progressBar: {
    height: 4,
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: 2,
  },

  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },

  measurementsContainer: {
    gap: THEME.spacing.sm,
  },

  measurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  measurementHeader: {
    flex: 1,
  },

  measurementName: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },

  measurementValue: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  measurementChange: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },

  summaryContainer: {
    gap: THEME.spacing.sm,
  },

  summaryText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  insightsContainer: {
    gap: THEME.spacing.sm,
  },

  insightText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  loadingText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: THEME.spacing.xl,
  },

  emptyText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
  },

  emptySubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
