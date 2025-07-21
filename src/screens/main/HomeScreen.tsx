import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { useDashboardIntegration } from '../../utils/integration';
import { aiService } from '../../ai';

export const HomeScreen: React.FC = () => {
  const {
    getUserStats,
    getHealthMetrics,
    getDailyCalorieNeeds,
    profile,
    isAuthenticated
  } = useDashboardIntegration();

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
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>U</Text>
            </View>
          </TouchableOpacity>
        </View>

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
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <Card style={styles.workoutCard} variant="elevated">
            <View style={styles.workoutHeader}>
              <View>
                <Text style={styles.workoutTitle}>Upper Body Strength</Text>
                <Text style={styles.workoutSubtitle}>45 min • Intermediate</Text>
              </View>
              <View style={styles.workoutIcon}>
                <Text style={styles.workoutEmoji}>💪</Text>
              </View>
            </View>
            
            <View style={styles.workoutProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '30%' }]} />
              </View>
              <Text style={styles.progressText}>3 of 10 exercises completed</Text>
            </View>
            
            <Button
              title="Continue Workout"
              onPress={() => {}}
              variant="primary"
              style={styles.workoutButton}
            />
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionItem}>
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>🏋️</Text>
                <Text style={styles.actionText}>Start Workout</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem}>
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>🍎</Text>
                <Text style={styles.actionText}>Log Meal</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem}>
              <Card style={styles.actionCard} variant="outlined">
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionText}>View Progress</Text>
              </Card>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem}>
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
          
          <Card style={styles.activityCard} variant="outlined">
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityEmoji}>🏃</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Morning Run</Text>
                <Text style={styles.activitySubtitle}>30 min • 3.2 km • 245 cal</Text>
              </View>
              <Text style={styles.activityTime}>2h ago</Text>
            </View>
          </Card>
          
          <Card style={styles.activityCard} variant="outlined">
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityEmoji}>🥗</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Healthy Breakfast</Text>
                <Text style={styles.activitySubtitle}>Oatmeal with berries • 320 cal</Text>
              </View>
              <Text style={styles.activityTime}>4h ago</Text>
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
});
