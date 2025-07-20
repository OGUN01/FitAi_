import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Card, THEME } from '../../components/ui';

export const ProgressScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [refreshing, setRefreshing] = useState(false);

  const periods = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  const stats = {
    weight: { current: 72.5, change: -2.3, unit: 'kg' },
    bodyFat: { current: 18.2, change: -1.8, unit: '%' },
    muscle: { current: 42.1, change: +0.8, unit: 'kg' },
    bmi: { current: 22.4, change: -0.7, unit: '' },
  };

  const achievements = [
    {
      id: 1,
      title: 'First Workout',
      description: 'Completed your first workout session',
      icon: '🎯',
      date: '2 weeks ago',
      completed: true,
    },
    {
      id: 2,
      title: 'Week Warrior',
      description: 'Worked out 5 days in a week',
      icon: '🔥',
      date: '1 week ago',
      completed: true,
    },
    {
      id: 3,
      title: 'Consistency King',
      description: 'Worked out 10 days in a row',
      icon: '👑',
      date: 'In progress',
      completed: false,
      progress: 7,
      target: 10,
    },
  ];

  const weeklyData = [
    { day: 'Mon', workouts: 1, calories: 320 },
    { day: 'Tue', workouts: 0, calories: 0 },
    { day: 'Wed', workouts: 1, calories: 450 },
    { day: 'Thu', workouts: 1, calories: 380 },
    { day: 'Fri', workouts: 0, calories: 0 },
    { day: 'Sat', workouts: 1, calories: 520 },
    { day: 'Sun', workouts: 1, calories: 290 },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call to refresh progress data
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Refreshed', 'Progress data has been updated!');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareIcon}>📤</Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.section}>
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.id}
                onPress={() => setSelectedPeriod(period.id)}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.id && styles.periodButtonActive,
                ]}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period.id && styles.periodTextActive,
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Body Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Metrics</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>{stats.weight.current}</Text>
              <Text style={styles.statUnit}>{stats.weight.unit}</Text>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={[
                styles.statChange,
                stats.weight.change < 0 ? styles.statChangePositive : styles.statChangeNegative
              ]}>
                {stats.weight.change > 0 ? '+' : ''}{stats.weight.change} {stats.weight.unit}
              </Text>
            </Card>
            
            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>{stats.bodyFat.current}</Text>
              <Text style={styles.statUnit}>{stats.bodyFat.unit}</Text>
              <Text style={styles.statLabel}>Body Fat</Text>
              <Text style={[
                styles.statChange,
                stats.bodyFat.change < 0 ? styles.statChangePositive : styles.statChangeNegative
              ]}>
                {stats.bodyFat.change > 0 ? '+' : ''}{stats.bodyFat.change}{stats.bodyFat.unit}
              </Text>
            </Card>
          </View>
          
          <View style={styles.statsGrid}>
            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>{stats.muscle.current}</Text>
              <Text style={styles.statUnit}>{stats.muscle.unit}</Text>
              <Text style={styles.statLabel}>Muscle Mass</Text>
              <Text style={[
                styles.statChange,
                stats.muscle.change > 0 ? styles.statChangePositive : styles.statChangeNegative
              ]}>
                {stats.muscle.change > 0 ? '+' : ''}{stats.muscle.change} {stats.muscle.unit}
              </Text>
            </Card>
            
            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>{stats.bmi.current}</Text>
              <Text style={styles.statUnit}>BMI</Text>
              <Text style={styles.statLabel}>Body Mass Index</Text>
              <Text style={[
                styles.statChange,
                stats.bmi.change < 0 ? styles.statChangePositive : styles.statChangeNegative
              ]}>
                {stats.bmi.change > 0 ? '+' : ''}{stats.bmi.change}
              </Text>
            </Card>
          </View>
        </View>

        {/* Weekly Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week's Activity</Text>
          <Card style={styles.chartCard} variant="elevated">
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Workouts & Calories</Text>
              <Text style={styles.chartSubtitle}>Last 7 days</Text>
            </View>
            
            <View style={styles.chart}>
              {weeklyData.map((day, index) => (
                <View key={index} style={styles.chartDay}>
                  <View style={styles.chartBars}>
                    <View style={[
                      styles.chartBar,
                      styles.workoutBar,
                      { height: day.workouts * 40 + 10 }
                    ]} />
                    <View style={[
                      styles.chartBar,
                      styles.calorieBar,
                      { height: (day.calories / 10) + 5 }
                    ]} />
                  </View>
                  <Text style={styles.chartDayLabel}>{day.day}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: THEME.colors.primary }]} />
                <Text style={styles.legendText}>Workouts</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: THEME.colors.secondary }]} />
                <Text style={styles.legendText}>Calories</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          
          {achievements.map((achievement) => (
            <Card key={achievement.id} style={styles.achievementCard} variant="outlined">
              <View style={styles.achievementContent}>
                <View style={[
                  styles.achievementIcon,
                  achievement.completed && styles.achievementIconCompleted
                ]}>
                  <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
                </View>
                
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  
                  {!achievement.completed && achievement.progress && achievement.target && (
                    <View style={styles.achievementProgress}>
                      <View style={styles.progressBar}>
                        <View style={[
                          styles.progressFill,
                          { width: `${(achievement.progress / achievement.target) * 100}%` }
                        ]} />
                      </View>
                      <Text style={styles.progressText}>
                        {achievement.progress}/{achievement.target}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={[
                  styles.achievementDate,
                  achievement.completed && styles.achievementDateCompleted
                ]}>
                  {achievement.date}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Summary</Text>
          <Card style={styles.summaryCard} variant="elevated">
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>24</Text>
                <Text style={styles.summaryLabel}>Total Workouts</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>18h</Text>
                <Text style={styles.summaryLabel}>Time Exercised</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>7,240</Text>
                <Text style={styles.summaryLabel}>Calories Burned</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>12</Text>
                <Text style={styles.summaryLabel}>Day Streak</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  
  scrollView: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },
  
  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  shareIcon: {
    fontSize: 20,
  },
  
  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xs,
  },
  
  periodButton: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
  },
  
  periodButtonActive: {
    backgroundColor: THEME.colors.primary,
  },
  
  periodText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
  },
  
  periodTextActive: {
    color: THEME.colors.white,
  },
  
  statsGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  
  statCard: {
    flex: 1,
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  
  statUnit: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
    marginTop: -THEME.spacing.xs,
  },
  
  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
    marginBottom: THEME.spacing.xs,
  },
  
  statChange: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
  },
  
  statChangePositive: {
    color: THEME.colors.success,
  },
  
  statChangeNegative: {
    color: THEME.colors.error,
  },
  
  chartCard: {
    padding: THEME.spacing.lg,
  },
  
  chartHeader: {
    marginBottom: THEME.spacing.lg,
  },
  
  chartTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  chartSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: THEME.spacing.lg,
  },
  
  chartDay: {
    alignItems: 'center',
    flex: 1,
  },
  
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: THEME.spacing.sm,
  },
  
  chartBar: {
    width: 8,
    borderRadius: THEME.borderRadius.sm,
    marginHorizontal: 1,
  },
  
  workoutBar: {
    backgroundColor: THEME.colors.primary,
  },
  
  calorieBar: {
    backgroundColor: THEME.colors.secondary,
  },
  
  chartDayLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
  
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.spacing.lg,
  },
  
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: THEME.spacing.xs,
  },
  
  legendText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },
  
  achievementCard: {
    marginBottom: THEME.spacing.md,
  },
  
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  
  achievementIconCompleted: {
    backgroundColor: `${THEME.colors.primary}20`,
  },
  
  achievementEmoji: {
    fontSize: 24,
  },
  
  achievementInfo: {
    flex: 1,
  },
  
  achievementTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  achievementDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  achievementProgress: {
    marginTop: THEME.spacing.sm,
  },
  
  progressBar: {
    height: 4,
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.xs,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.sm,
  },
  
  progressText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
  
  achievementDate: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
  
  achievementDateCompleted: {
    color: THEME.colors.success,
  },
  
  summaryCard: {
    padding: THEME.spacing.lg,
  },
  
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.lg,
  },
  
  summaryItem: {
    width: '45%',
    alignItems: 'center',
  },
  
  summaryValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  
  summaryLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
    textAlign: 'center',
  },
  
  bottomSpacing: {
    height: THEME.spacing.xl,
  },
});
