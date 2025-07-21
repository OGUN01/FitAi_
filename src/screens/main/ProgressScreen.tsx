import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Card, Button, THEME } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useProgressData } from '../../hooks/useProgressData';
import { ProgressAnalytics } from '../../components/progress/ProgressAnalytics';

export const ProgressScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Authentication and user data
  const { user, isAuthenticated } = useAuth();

  // Real progress data with Track B integration
  const {
    progressEntries,
    progressLoading,
    progressError,
    loadProgressEntries,
    bodyAnalysis,
    progressStats,
    statsLoading,
    progressGoals,
    createProgressEntry,
    trackBStatus,
    refreshAll,
    clearErrors,
  } = useProgressData();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const periods = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  // Real stats from progress data
  const stats = progressStats ? {
    weight: {
      current: progressStats.weightChange.current,
      change: progressStats.weightChange.change,
      unit: 'kg',
      goal: progressGoals?.target_weight_kg || 70.0,
      trend: progressStats.weightChange.change < 0 ? 'decreasing' : progressStats.weightChange.change > 0 ? 'increasing' : 'stable',
      weeklyAvg: progressStats.weightChange.current,
    },
    bodyFat: {
      current: progressStats.bodyFatChange.current,
      change: progressStats.bodyFatChange.change,
      unit: '%',
      goal: progressGoals?.target_body_fat_percentage || 15.0,
      trend: progressStats.bodyFatChange.change < 0 ? 'decreasing' : progressStats.bodyFatChange.change > 0 ? 'increasing' : 'stable',
      weeklyAvg: progressStats.bodyFatChange.current,
    },
    muscle: {
      current: progressStats.muscleChange.current,
      change: progressStats.muscleChange.change,
      unit: 'kg',
      goal: progressGoals?.target_muscle_mass_kg || 45.0,
      trend: progressStats.muscleChange.change < 0 ? 'decreasing' : progressStats.muscleChange.change > 0 ? 'increasing' : 'stable',
      weeklyAvg: progressStats.muscleChange.current,
    },
    bmi: {
      current: progressStats.weightChange.current > 0 ? (progressStats.weightChange.current / Math.pow(1.75, 2)) : 22.4, // Assuming 1.75m height
      change: -0.7, // Calculated based on weight change
      unit: '',
      goal: 21.5,
      trend: progressStats.weightChange.change < 0 ? 'decreasing' : 'increasing',
      weeklyAvg: progressStats.weightChange.current > 0 ? (progressStats.weightChange.current / Math.pow(1.75, 2)) : 22.4,
    },
  } : {
    weight: { current: 0, change: 0, unit: 'kg', goal: 70.0, trend: 'stable', weeklyAvg: 0 },
    bodyFat: { current: 0, change: 0, unit: '%', goal: 15.0, trend: 'stable', weeklyAvg: 0 },
    muscle: { current: 0, change: 0, unit: 'kg', goal: 45.0, trend: 'stable', weeklyAvg: 0 },
    bmi: { current: 0, change: 0, unit: '', goal: 21.5, trend: 'stable', weeklyAvg: 0 },
  };

  // Enhanced achievements with categories and rewards
  const achievements = [
    {
      id: 1,
      title: 'First Steps',
      description: 'Completed your first workout session',
      icon: '🎯',
      date: '2 weeks ago',
      completed: true,
      category: 'Milestone',
      points: 50,
      rarity: 'common',
    },
    {
      id: 2,
      title: 'Week Warrior',
      description: 'Worked out 5 days in a week',
      icon: '🔥',
      date: '1 week ago',
      completed: true,
      category: 'Consistency',
      points: 100,
      rarity: 'uncommon',
    },
    {
      id: 3,
      title: 'Consistency Champion',
      description: 'Worked out 10 days in a row',
      icon: '👑',
      date: 'In progress',
      completed: false,
      progress: 7,
      target: 10,
      category: 'Streak',
      points: 200,
      rarity: 'rare',
    },
    {
      id: 4,
      title: 'Calorie Crusher',
      description: 'Burned 1000+ calories in a single workout',
      icon: '💪',
      date: '3 days ago',
      completed: true,
      category: 'Performance',
      points: 150,
      rarity: 'uncommon',
    },
    {
      id: 5,
      title: 'Early Bird',
      description: 'Complete 5 morning workouts',
      icon: '🌅',
      date: 'In progress',
      completed: false,
      progress: 3,
      target: 5,
      category: 'Habit',
      points: 75,
      rarity: 'common',
    },
    {
      id: 6,
      title: 'Weight Loss Hero',
      description: 'Lost 5kg from starting weight',
      icon: '⚖️',
      date: 'In progress',
      completed: false,
      progress: 2.3,
      target: 5.0,
      category: 'Goal',
      points: 300,
      rarity: 'epic',
    },
  ];

  // Enhanced weekly data with more metrics
  const weeklyData = [
    {
      day: 'Mon',
      workouts: 1,
      calories: 320,
      duration: 45,
      type: 'Strength',
      intensity: 'High',
      mood: 'Great',
    },
    {
      day: 'Tue',
      workouts: 0,
      calories: 0,
      duration: 0,
      type: 'Rest',
      intensity: 'None',
      mood: 'Relaxed',
    },
    {
      day: 'Wed',
      workouts: 1,
      calories: 450,
      duration: 35,
      type: 'HIIT',
      intensity: 'Very High',
      mood: 'Energized',
    },
    {
      day: 'Thu',
      workouts: 1,
      calories: 380,
      duration: 50,
      type: 'Cardio',
      intensity: 'Medium',
      mood: 'Good',
    },
    {
      day: 'Fri',
      workouts: 0,
      calories: 0,
      duration: 0,
      type: 'Rest',
      intensity: 'None',
      mood: 'Tired',
    },
    {
      day: 'Sat',
      workouts: 1,
      calories: 520,
      duration: 60,
      type: 'Full Body',
      intensity: 'High',
      mood: 'Motivated',
    },
    {
      day: 'Sun',
      workouts: 1,
      calories: 290,
      duration: 30,
      type: 'Yoga',
      intensity: 'Low',
      mood: 'Peaceful',
    },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      Alert.alert('Refreshed', 'Progress data has been updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh progress data');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle adding new progress entry
  const handleAddProgressEntry = async () => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please sign in to track progress.');
      return;
    }

    // For demo purposes, create a sample entry
    const success = await createProgressEntry({
      weight_kg: 72.5,
      body_fat_percentage: 18.2,
      muscle_mass_kg: 42.1,
      measurements: {
        chest: 100,
        waist: 80,
        hips: 95,
        bicep: 35,
        thigh: 55,
        neck: 38,
      },
      notes: 'Weekly progress check',
    });

    if (success) {
      Alert.alert('Success', 'Progress entry added successfully!');
    } else {
      Alert.alert('Error', 'Failed to add progress entry');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}>
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
          <View style={styles.headerButtons}>
            {/* Track B Status Indicator */}
            <TouchableOpacity style={styles.statusButton}>
              <Text style={styles.statusIcon}>
                {trackBStatus.isConnected ? '🟢' : '🔴'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.analyticsButton, showAnalytics && styles.analyticsButtonActive]}
              onPress={() => setShowAnalytics(!showAnalytics)}
            >
              <Text style={styles.analyticsIcon}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddProgressEntry}
            >
              <Text style={styles.addIcon}>➕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Text style={styles.shareIcon}>📤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading State */}
        {(progressLoading || statsLoading) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading progress data...</Text>
          </View>
        )}

        {/* Error State */}
        {progressError && (
          <Card style={styles.errorCard} variant="outlined">
            <Text style={styles.errorText}>⚠️ {progressError}</Text>
            <Button
              title="Retry"
              onPress={refreshAll}
              variant="outline"
              size="sm"
              style={styles.retryButton}
            />
          </Card>
        )}

        {/* No Authentication State */}
        {!isAuthenticated && (
          <Card style={styles.errorCard} variant="outlined">
            <Text style={styles.errorText}>🔐 Please sign in to track your progress</Text>
          </Card>
        )}

        {/* No Data State */}
        {isAuthenticated && progressEntries.length === 0 && !progressLoading && (
          <Card style={styles.errorCard} variant="outlined">
            <Text style={styles.errorText}>📊 No progress data yet</Text>
            <Text style={styles.errorSubtext}>Add your first measurement to start tracking!</Text>
            <Button
              title="Add Entry"
              onPress={handleAddProgressEntry}
              variant="primary"
              size="sm"
              style={styles.retryButton}
            />
          </Card>
        )}

        {/* Progress Analytics Component */}
        {showAnalytics && (
          <ProgressAnalytics />
        )}

        {/* Period Selector */}
        {!showAnalytics && (
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
        )}

        {/* Body Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Metrics</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard} variant="elevated">
              <View style={styles.statHeader}>
                <Text style={styles.statValue}>{stats.weight.current}</Text>
                <Text style={styles.statUnit}>{stats.weight.unit}</Text>
                <Text style={styles.trendIcon}>
                  {stats.weight.trend === 'decreasing' ? '📉' : '📈'}
                </Text>
              </View>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={[
                styles.statChange,
                stats.weight.change < 0 ? styles.statChangePositive : styles.statChangeNegative
              ]}>
                {stats.weight.change > 0 ? '+' : ''}{stats.weight.change} {stats.weight.unit}
              </Text>
              <View style={styles.goalProgress}>
                <Text style={styles.goalText}>Goal: {stats.weight.goal}{stats.weight.unit}</Text>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { width: `${Math.min(100, ((stats.weight.current - stats.weight.goal) / stats.weight.current) * 100 + 50)}%` }
                  ]} />
                </View>
              </View>
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
                  <View style={styles.achievementHeader}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <View style={styles.achievementMeta}>
                      <Text style={styles.achievementCategory}>{achievement.category}</Text>
                      <Text style={styles.achievementPoints}>+{achievement.points} pts</Text>
                    </View>
                  </View>
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

                  <View style={[styles.rarityBadge, styles[`rarity${achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}`]]}>
                    <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
                  </View>
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

        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
      </Animated.View>
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

  // Enhanced stat card styles
  statHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xs,
  },

  trendIcon: {
    fontSize: 16,
    marginLeft: THEME.spacing.xs,
  },

  goalProgress: {
    marginTop: THEME.spacing.sm,
  },

  goalText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },

  progressBar: {
    height: 4,
    backgroundColor: THEME.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },

  // Enhanced achievement styles
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.xs,
  },

  achievementMeta: {
    alignItems: 'flex-end',
  },

  achievementCategory: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: THEME.fontWeight.medium,
  },

  achievementPoints: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold,
    marginTop: 2,
  },

  rarityBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },

  rarityCommon: {
    backgroundColor: '#E5E7EB',
  },

  rarityUncommon: {
    backgroundColor: '#DBEAFE',
  },

  rarityRare: {
    backgroundColor: '#EDE9FE',
  },

  rarityEpic: {
    backgroundColor: '#FEF3C7',
  },

  rarityText: {
    fontSize: 8,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  statusButton: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusIcon: {
    fontSize: 16,
  },

  addButton: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addIcon: {
    fontSize: 16,
    color: THEME.colors.white,
  },

  analyticsButton: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  analyticsButtonActive: {
    backgroundColor: THEME.colors.primary,
  },

  analyticsIcon: {
    fontSize: 16,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },

  loadingText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
  },

  errorCard: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    alignItems: 'center',
  },

  errorText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.error,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  errorSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  retryButton: {
    paddingHorizontal: THEME.spacing.lg,
  },
});
