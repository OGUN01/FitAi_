import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Button, Card } from '../../components/ui';
import { ResponsiveTheme } from '../../utils/responsiveTheme';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { useDashboardIntegration } from '../../utils/integration';
import { aiService } from '../../ai';
import { useAuth } from '../../hooks/useAuth';
import DataRetrievalService from '../../services/dataRetrieval';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useNutritionStore } from '../../stores/nutritionStore';
interface HomeScreenProps {
  onNavigateToTab?: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToTab }) => {
  const {
    getUserStats,
    getHealthMetrics,
    getDailyCalorieNeeds,
    profile,
    isAuthenticated
  } = useDashboardIntegration();

  const { isGuestMode } = useAuth();
  
  // Store data
  const { loadData: loadFitnessData } = useFitnessStore();
  const { loadData: loadNutritionData } = useNutritionStore();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  
  // State for real data
  const [todaysData, setTodaysData] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load store data first
        await DataRetrievalService.loadAllData();
        
        // Get current data
        const todaysInfo = DataRetrievalService.getTodaysData();
        const weeklyInfo = DataRetrievalService.getWeeklyProgress();
        const activities = DataRetrievalService.getRecentActivities(5);
        
        setTodaysData(todaysInfo);
        setWeeklyProgress(weeklyInfo);
        setRecentActivities(activities);
      } catch (error) {
        console.error('Failed to load home data:', error);
      }
    };
    
    loadData();
    
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const userStats = getUserStats();
  const healthMetrics = getHealthMetrics();
  const dailyCalories = getDailyCalorieNeeds();
  const aiStatus = aiService.getAIStatus();
  
  // Real data from stores
  const realCaloriesBurned = DataRetrievalService.getTotalCaloriesBurned();
  const realStreak = weeklyProgress?.streak || 0;
  const hasRealData = DataRetrievalService.hasDataForHome();
  const todaysWorkoutInfo = DataRetrievalService.getTodaysWorkoutForHome();

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View>
            {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning! 👋</Text>
            <Text style={styles.userName}>
              {profile?.personalInfo?.name ? `${profile.personalInfo.name}, ready for today's workout?` : 'Ready for today\'s workout?'}
            </Text>
            {aiStatus.mode === 'real' && (
              <Text style={styles.aiStatus}>🤖 AI-Powered Recommendations Active</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => onNavigateToTab?.('profile')}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>
                {profile?.personalInfo?.name ? profile.personalInfo.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Guest User Sign-up Prompt */}
        {isGuestMode && (
          <View style={styles.section}>
            <Card style={styles.guestPromptCard} variant="elevated">
              <View style={styles.guestPromptHeader}>
                <Text style={styles.guestPromptIcon}>💾</Text>
                <View style={styles.guestPromptText}>
                  <Text style={styles.guestPromptTitle}>Save Your Progress</Text>
                  <Text style={styles.guestPromptSubtitle}>
                    Create an account to backup your workouts and sync across devices
                  </Text>
                </View>
                <Button
                  title="Sign Up"
                  onPress={() => Alert.alert('Sign Up', 'Sign up feature coming soon!')}
                  variant="primary"
                  size="sm"
                  style={styles.guestPromptButton}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>{realCaloriesBurned || userStats.totalCaloriesBurned || 0}</Text>
              <Text style={styles.statLabel}>Calories Burned</Text>
              <Text style={styles.statSubtext}>🔥 {hasRealData ? 'From workouts' : 'Get started!'}</Text>
            </Card>

            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>{realStreak || userStats.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
              <Text style={styles.statSubtext}>⏱️ {realStreak > 0 ? 'Keep it up!' : 'Start your streak!'}</Text>
            </Card>
          </View>
        </View>

        {/* Today's Workout */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <TouchableOpacity onPress={() => onNavigateToTab?.('fitness')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <Card style={styles.workoutCard} variant="elevated">
            <View style={styles.workoutHeader}>
              <View>
                <Text style={styles.workoutTitle}>
                  {!todaysWorkoutInfo.hasWeeklyPlan
                    ? 'Start Your First Workout'
                    : todaysWorkoutInfo.isRestDay
                      ? '😴 Rest Day'
                      : todaysWorkoutInfo.isCompleted
                        ? '✅ Workout Complete!'
                        : todaysWorkoutInfo.workout?.title || todaysWorkoutInfo.dayStatus}
                </Text>
                <Text style={styles.workoutSubtitle}>
                  {!todaysWorkoutInfo.hasWeeklyPlan
                    ? 'Personalized based on your goals'
                    : todaysWorkoutInfo.isRestDay
                      ? 'Recovery is just as important as training!'
                      : todaysWorkoutInfo.hasWorkout
                        ? `${todaysWorkoutInfo.workout?.duration || 0} min • ${todaysWorkoutInfo.workout?.estimatedCalories || 0} cal`
                        : 'Ready for today\'s workout?'}
                </Text>
              </View>
              <View style={styles.workoutIcon}>
                <Text style={styles.workoutEmoji}>
                  {!todaysWorkoutInfo.hasWeeklyPlan
                    ? '🏋️'
                    : todaysWorkoutInfo.isRestDay
                      ? '😴'
                      : todaysWorkoutInfo.isCompleted
                        ? '✅'
                        : todaysWorkoutInfo.workoutType === 'strength'
                          ? '💪'
                          : todaysWorkoutInfo.workoutType === 'cardio'
                            ? '🏃'
                            : todaysWorkoutInfo.workoutType === 'flexibility'
                              ? '🧘'
                              : todaysWorkoutInfo.workoutType === 'hiit'
                                ? '⚡'
                                : '🏋️'}
                </Text>
              </View>
            </View>

            {todaysWorkoutInfo.hasWorkout && !todaysWorkoutInfo.isRestDay && (
              <View style={styles.workoutProgress}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { width: `${todaysData?.progress.workoutProgress || 0}%` }
                  ]} />
                </View>
                <Text style={styles.progressText}>
                  Progress: {todaysData?.progress.workoutProgress || 0}%
                </Text>
              </View>
            )}

            <Text style={styles.workoutDescription}>
              {!todaysWorkoutInfo.hasWeeklyPlan
                ? `Based on your fitness goals: ${profile?.fitnessGoals?.primaryGoals?.join(', ') || 'General fitness'}`
                : todaysWorkoutInfo.isRestDay
                  ? 'Use this day to:\n• Gentle stretching or yoga\n• Stay hydrated\n• Get quality sleep'
                  : todaysWorkoutInfo.hasWorkout
                    ? todaysWorkoutInfo.workout?.description || 'Ready to continue your workout?'
                    : 'Ready for today\'s workout?'}
            </Text>

            <Button
              title={!todaysWorkoutInfo.hasWeeklyPlan
                ? 'Generate Workout'
                : todaysWorkoutInfo.isRestDay
                  ? 'View Weekly Plan'
                  : todaysWorkoutInfo.hasWorkout
                    ? (todaysWorkoutInfo.isCompleted ? 'View Details' : 'Continue Workout')
                    : 'Start Workout'}
              onPress={() => {
                onNavigateToTab?.('fitness');
              }}
              variant={todaysWorkoutInfo.isRestDay ? "outline" : "primary"}
              style={styles.workoutButton}
            />
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => onNavigateToTab?.('fitness')}
            >
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>
                  {todaysWorkoutInfo.isRestDay ? '😴' : '🏋️'}
                </Text>
                <Text style={styles.actionText}>
                  {todaysWorkoutInfo.isRestDay
                    ? 'Rest Day'
                    : todaysWorkoutInfo.hasWorkout
                      ? 'Continue Workout'
                      : 'Start Workout'}
                </Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => onNavigateToTab?.('diet')}
            >
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>🍎</Text>
                <Text style={styles.actionText}>{todaysData?.meals.length > 0 ? 'View Meals' : 'Plan Meals'}</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => onNavigateToTab?.('progress')}
            >
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionText}>View Progress</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => onNavigateToTab?.('profile')}
            >
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>⚙️</Text>
                <Text style={styles.actionText}>Settings</Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <Card key={activity.id} style={styles.activityCard} variant="outlined">
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityEmoji}>
                      {activity.type === 'workout' ? '🏋️' : '🍎'}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.name}</Text>
                    <Text style={styles.activitySubtitle}>
                      {activity.type === 'workout' 
                        ? `${activity.duration} min • ${activity.calories} cal burned`
                        : `${activity.calories} calories`}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {new Date(activity.completedAt).toLocaleDateString()}
                  </Text>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyActivityCard} variant="outlined">
              <View style={styles.emptyActivityContent}>
                <Text style={styles.emptyActivityIcon}>📈</Text>
                <Text style={styles.emptyActivityTitle}>
                  {hasRealData ? 'Complete Activities to See History' : 'Start Your Fitness Journey'}
                </Text>
                <Text style={styles.emptyActivityText}>
                  {hasRealData 
                    ? 'Complete workouts and log meals to track your progress here'
                    : 'Complete your first workout or log a meal to see your activity here'}
                </Text>
                <Button
                  title="Get Started"
                  onPress={() => onNavigateToTab?.(hasRealData ? 'fitness' : 'fitness')}
                  variant="outline"
                  size="sm"
                  style={styles.emptyActivityButton}
                />
              </View>
            </Card>
          )}
        </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  
  scrollView: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rp(24),
    paddingTop: rp(24),
    paddingBottom: rp(16),
  },
  
  greeting: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  
  userName: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  aiStatus: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    marginTop: ResponsiveTheme.spacing.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  
  profileButton: {
    padding: ResponsiveTheme.spacing.xs,
  },
  
  profileAvatar: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  profileInitial: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },
  
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  
  statsSection: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },
  
  seeAllText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  
  statsGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },
  
  statCard: {
    flex: 1,
    padding: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  
  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  
  statSubtext: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  workoutCard: {
    padding: ResponsiveTheme.spacing.lg,
  },
  
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },
  
  workoutTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  
  workoutSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  
  workoutIcon: {
    width: rw(48),
    height: rh(48),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  workoutEmoji: {
    fontSize: rf(24),
  },
  
  workoutProgress: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  
  progressBar: {
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  
  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
  
  workoutDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(20),
  },

  workoutButton: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
  
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },
  
  actionItem: {
    width: '47%',
  },
  
  actionCard: {
    padding: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },
  
  actionIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  
  actionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textAlign: 'center',
  },
  
  activityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.md,
  },
  
  activityIcon: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },
  
  activityEmoji: {
    fontSize: rf(20),
  },
  
  activityContent: {
    flex: 1,
  },
  
  activityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
  },
  
  activitySubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  
  activityTime: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
  
  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },

  // Guest prompt styles
  guestPromptCard: {
    backgroundColor: ResponsiveTheme.colors.primary + '08',
    borderColor: ResponsiveTheme.colors.primary + '20',
  },

  guestPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.md,
  },

  guestPromptIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  guestPromptText: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  guestPromptTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  guestPromptSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  guestPromptButton: {
    minWidth: rw(80),
  },

  // Empty activity state styles
  emptyActivityCard: {
    padding: ResponsiveTheme.spacing.xl,
  },

  emptyActivityContent: {
    alignItems: 'center',
    textAlign: 'center',
  },

  emptyActivityIcon: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  emptyActivityTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  emptyActivityText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  emptyActivityButton: {
    minWidth: rw(120),
  },
});
