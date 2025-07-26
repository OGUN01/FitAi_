import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { useDashboardIntegration } from '../../utils/integration';
import { aiService } from '../../ai';
import { useAuth } from '../../hooks/useAuth';
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

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  // Animate in on mount
  useEffect(() => {
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

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.statValue}>{userStats.totalCaloriesBurned || 0}</Text>
              <Text style={styles.statLabel}>Calories Burned</Text>
              <Text style={styles.statSubtext}>🔥 Total progress</Text>
            </Card>

            <Card style={styles.statCard} variant="elevated">
              <Text style={styles.statValue}>{userStats.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
              <Text style={styles.statSubtext}>⏱️ Keep it up!</Text>
            </Card>
          </View>
        </View>

        {/* Today's Workout */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Full workout library coming soon!')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <Card style={styles.workoutCard} variant="elevated">
            <View style={styles.workoutHeader}>
              <View>
                <Text style={styles.workoutTitle}>Start Your First Workout</Text>
                <Text style={styles.workoutSubtitle}>Personalized based on your goals</Text>
              </View>
              <View style={styles.workoutIcon}>
                <Text style={styles.workoutEmoji}>🏋️</Text>
              </View>
            </View>
            
            <Text style={styles.workoutDescription}>
              Based on your fitness goals: {profile?.fitnessGoals?.primaryGoals?.join(', ') || 'General fitness'}
            </Text>
            
            <Button
              title="Generate Workout"
              onPress={() => Alert.alert('AI Workout', 'AI-powered workout generation coming soon!')}
              variant="primary"
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
              onPress={() => Alert.alert('Start Workout', 'Workout feature coming soon!')}
            >
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>🏋️</Text>
                <Text style={styles.actionText}>Start Workout</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => Alert.alert('Log Meal', 'Meal logging feature coming soon!')}
            >
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>🍎</Text>
                <Text style={styles.actionText}>Log Meal</Text>
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
          
          <Card style={styles.emptyActivityCard} variant="outlined">
            <View style={styles.emptyActivityContent}>
              <Text style={styles.emptyActivityIcon}>📈</Text>
              <Text style={styles.emptyActivityTitle}>Start Your Fitness Journey</Text>
              <Text style={styles.emptyActivityText}>
                Complete your first workout or log a meal to see your activity here
              </Text>
              <Button
                title="Get Started"
                onPress={() => Alert.alert('Get Started', 'Choose from workout or meal logging!')}
                variant="outline"
                size="sm"
                style={styles.emptyActivityButton}
              />
            </View>
          </Card>
        </View>

        {/* Bottom Spacing */}
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
  
  greeting: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  userName: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },

  aiStatus: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.primary,
    marginTop: THEME.spacing.xs,
    fontWeight: THEME.fontWeight.medium,
  },
  
  profileButton: {
    padding: THEME.spacing.xs,
  },
  
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  profileInitial: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
  },
  
  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  
  statsSection: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  
  seeAllText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },
  
  statsGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  
  statCard: {
    flex: 1,
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },
  
  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
    marginBottom: THEME.spacing.xs,
  },
  
  statSubtext: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  
  workoutCard: {
    padding: THEME.spacing.lg,
  },
  
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  
  workoutTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  workoutSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  workoutEmoji: {
    fontSize: 24,
  },
  
  workoutProgress: {
    marginBottom: THEME.spacing.lg,
  },
  
  progressBar: {
    height: 6,
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.sm,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.sm,
  },
  
  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  
  workoutDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 20,
  },

  workoutButton: {
    marginTop: THEME.spacing.sm,
  },
  
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },
  
  actionItem: {
    width: '47%',
  },
  
  actionCard: {
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  
  actionIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },
  
  actionText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
    textAlign: 'center',
  },
  
  activityCard: {
    marginBottom: THEME.spacing.sm,
  },
  
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  
  activityEmoji: {
    fontSize: 20,
  },
  
  activityContent: {
    flex: 1,
  },
  
  activityTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },
  
  activitySubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  activityTime: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
  
  bottomSpacing: {
    height: THEME.spacing.xl,
  },

  // Guest prompt styles
  guestPromptCard: {
    backgroundColor: THEME.colors.primary + '08',
    borderColor: THEME.colors.primary + '20',
  },

  guestPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },

  guestPromptIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },

  guestPromptText: {
    flex: 1,
    marginRight: THEME.spacing.sm,
  },

  guestPromptTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  guestPromptSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },

  guestPromptButton: {
    minWidth: 80,
  },

  // Empty activity state styles
  emptyActivityCard: {
    padding: THEME.spacing.xl,
  },

  emptyActivityContent: {
    alignItems: 'center',
    textAlign: 'center',
  },

  emptyActivityIcon: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },

  emptyActivityTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
  },

  emptyActivityText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: THEME.spacing.lg,
  },

  emptyActivityButton: {
    minWidth: 120,
  },
});
