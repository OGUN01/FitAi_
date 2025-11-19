import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { GlassCard } from '../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { HeroSection } from '../../components/ui/aurora/HeroSection';
import { MiniProgressRing } from '../../components/ui/aurora/ProgressRing';
import { haptics } from '../../utils/haptics';
import { gradients, toLinearGradientProps } from '../../theme/gradients';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { useDashboardIntegration } from '../../utils/integration';
import { aiService } from '../../ai';
import { useAuth } from '../../hooks/useAuth';
import DataRetrievalService from '../../services/dataRetrieval';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useAchievementStore } from '../../stores/achievementStore';
import { useHealthDataStore } from '../../stores/healthDataStore';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { GuestSignUpScreen } from './GuestSignUpScreen';

// Daily motivational quotes
const DAILY_QUOTES = [
  "Your body can stand almost anything. It's your mind that you have to convince.",
  "The only bad workout is the one that didn't happen.",
  "Fitness is not about being better than someone else. It's about being better than you used to be.",
  "Success starts with self-discipline.",
  "Take care of your body. It's the only place you have to live.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Your health is an investment, not an expense.",
  "Don't wish for a good body, work for it.",
  "Push yourself because no one else is going to do it for you.",
  "Small progress is still progress.",
  "Believe in yourself and all that you are.",
  "The body achieves what the mind believes.",
  "You don't have to be extreme, just consistent.",
  "Make yourself proud.",
  "Every workout counts. Every meal matters.",
];

// Get daily quote based on day of year
const getDailyQuote = (): string => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
};

interface HomeScreenProps {
  onNavigateToTab?: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToTab }) => {
  const { getUserStats, getHealthMetrics, getDailyCalorieNeeds, profile, isAuthenticated } =
    useDashboardIntegration();

  const { isGuestMode } = useAuth();

  // Store data
  const { loadData: loadFitnessData } = useFitnessStore();
  const { loadData: loadNutritionData } = useNutritionStore();
  const { 
    getRecentAchievements, 
    getNearlyCompletedAchievements, 
    getDailyProgress, 
    getTopCategories,
    getTotalBadgesEarned 
  } = useAchievementStore();

  // Health data store
  const {
    metrics: healthMetrics,
    isHealthKitAuthorized,
    isHealthConnectAvailable,
    isHealthConnectAuthorized,
    syncStatus,
    settings: healthSettings,
    healthTipOfDay,
    getHealthInsights,
    initializeHealthKit,
    syncHealthData,
    initializeGoogleFit,
    syncFromGoogleFit,
    initializeHealthConnect,
    requestHealthConnectPermissions,
    syncFromHealthConnect
  } = useHealthDataStore();

  // Analytics store
  const {
    currentAnalytics,
    analyticsSummary,
    isInitialized: analyticsInitialized,
    getTopInsights,
    getImprovementAreas,
    getPositiveTrends,
    getPredictiveInsights,
    initialize: initializeAnalytics,
    refreshAnalytics
  } = useAnalyticsStore();

  // Subscription store
  const {
    subscriptionStatus,
    premiumFeatures,
    trialInfo,
    showPaywall,
    canAccessAdvancedAnalytics,
    canAccessPremiumAchievements,
    canUseUnlimitedAI,
    showPaywallModal,
    hidePaywallModal,
    initialize: initializeSubscription
  } = useSubscriptionStore();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  // Micro-interaction animation refs
  const streakCounterFlip = useRef(new Animated.Value(0)).current;
  const heroParallax = useRef(new Animated.Value(0)).current;
  const quickStat1Ring = useRef(new Animated.Value(0)).current;
  const quickStat2Ring = useRef(new Animated.Value(0)).current;
  const quickStat3Ring = useRef(new Animated.Value(0)).current;
  const activity1Opacity = useRef(new Animated.Value(0)).current;
  const activity1TranslateY = useRef(new Animated.Value(-20)).current;
  const activity2Opacity = useRef(new Animated.Value(0)).current;
  const activity2TranslateY = useRef(new Animated.Value(-20)).current;
  const activity3Opacity = useRef(new Animated.Value(0)).current;
  const activity3TranslateY = useRef(new Animated.Value(-20)).current;

  // State for real data
  const [todaysData, setTodaysData] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [showHealthSettingsModal, setShowHealthSettingsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Achievement data
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [nearlyCompleted, setNearlyCompleted] = useState<any[]>([]);
  const [achievementProgress, setAchievementProgress] = useState<any>(null);

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
        
        // Load achievement data
        const recentAchievementData = getRecentAchievements(3);
        const nearlyCompletedData = getNearlyCompletedAchievements(2);
        const progressData = getDailyProgress();
        
        setRecentAchievements(recentAchievementData);
        setNearlyCompleted(nearlyCompletedData);
        setAchievementProgress(progressData);
        
        // Initialize health data based on platform and settings
        if (Platform.OS === 'ios') {
          // iOS - HealthKit integration
          if (isHealthKitAuthorized) {
            console.log('🍎 Syncing health data on home screen load...');
            syncHealthData();
          } else if (healthSettings.healthKitEnabled) {
            console.log('🍎 Initializing HealthKit...');
            initializeHealthKit();
          }
        } else if (Platform.OS === 'android') {
          // Android - Health Connect integration (preferred) or Google Fit fallback
          if (healthSettings.healthConnectEnabled && healthSettings.preferredProvider === 'healthconnect') {
            if (isHealthConnectAuthorized) {
              console.log('🔗 Syncing Health Connect data on home screen load...');
              syncFromHealthConnect(7);
            } else {
              console.log('🔗 Initializing Health Connect...');
              initializeHealthConnect();
            }
          } else if (healthSettings.preferredProvider === 'googlefit') {
            // Fallback to Google Fit if user prefers it
            console.log('🤖 Initializing Google Fit as fallback...');
            initializeGoogleFit();
          }
        }
        
        // Initialize analytics if not already done
        if (!analyticsInitialized) {
          console.log('📊 Initializing analytics...');
          initializeAnalytics();
        } else {
          console.log('📊 Refreshing analytics...');
          refreshAnalytics();
        }
        
        // Initialize subscription system
        console.log('💳 Initializing subscription system...');
        initializeSubscription();
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

  // Micro-interaction: Quick stats ring fill animation on mount
  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(quickStat1Ring, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(quickStat2Ring, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(quickStat3Ring, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Micro-interaction: Activity feed stagger entrance
  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(activity1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(activity1TranslateY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(activity2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(activity2TranslateY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(activity3Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(activity3TranslateY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Micro-interaction: Streak counter flip animation
  useEffect(() => {
    Animated.sequence([
      Animated.timing(streakCounterFlip, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(streakCounterFlip, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [realStreak]);

  const userStats = getUserStats() || {};
  const dailyCalories = getDailyCalorieNeeds() || 0;
  const aiStatus = aiService.getAIStatus();

  // Real data from stores
  const realCaloriesBurned = DataRetrievalService.getTotalCaloriesBurned();
  const realStreak = weeklyProgress?.streak || 0;
  const hasRealData = DataRetrievalService.hasDataForHome();
  const todaysWorkoutInfo = DataRetrievalService.getTodaysWorkoutForHome();

  // Handle successful signup from guest signup screen
  const handleGuestSignUpSuccess = () => {
    console.log('✅ HomeScreen: Guest signup completed successfully');
    setShowGuestSignUp(false);
    // The app will automatically detect the new authenticated state
  };

  // Handle back from guest signup screen
  const handleGuestSignUpBack = () => {
    console.log('🔙 HomeScreen: User went back from guest signup');
    setShowGuestSignUp(false);
  };

  // Handle pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);

    // Reload all data
    await Promise.all([
      loadFitnessData(),
      loadNutritionData(),
    ]);

    // Trigger haptic feedback
    haptics.impact('light');

    setRefreshing(false);
  };

  // If guest signup screen is active, render it
  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onBack={handleGuestSignUpBack}
        onSignUpSuccess={handleGuestSignUpSuccess}
      />
    );
  }

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: heroParallax } } }],
              { useNativeDriver: true }
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#4ECDC4"
                colors={['#4ECDC4', '#FF6B6B', '#FFC107']}
                progressBackgroundColor="rgba(255, 255, 255, 0.1)"
              />
            }
          >
          <View>
            {/* Header - Aurora Design */}
            <View style={styles.header}>
              {/* Left: Avatar + Greeting */}
              <View style={styles.headerLeft}>
                <AnimatedPressable
                  style={styles.avatar}
                  onPress={() => onNavigateToTab?.('profile')}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="light"
                >
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileInitial}>
                      {profile?.personalInfo?.name
                        ? profile.personalInfo.name.charAt(0).toUpperCase()
                        : 'U'}
                    </Text>
                  </View>
                </AnimatedPressable>
                <View style={styles.greetingContainer}>
                  <Text style={styles.greeting}>
                    {new Date().getHours() < 12
                      ? 'Good Morning'
                      : new Date().getHours() < 18
                      ? 'Good Afternoon'
                      : 'Good Evening'}
                  </Text>
                  <Text style={styles.userName}>
                    {profile?.personalInfo?.name || 'User'}
                  </Text>
                </View>
              </View>

              {/* Right: Streak + Notifications */}
              <View style={styles.headerRight}>
                <GlassCard
                  elevation={2}
                  blurIntensity="light"
                  padding="sm"
                  borderRadius="lg"
                  style={styles.streakBadge}
                >
                  <Text style={styles.streakIcon}>🔥</Text>
                  <Text style={styles.streakNumber}>{realStreak || userStats?.currentStreak || 0}</Text>
                </GlassCard>
                <AnimatedPressable
                  style={styles.notificationButton}
                  onPress={() => Alert.alert('Notifications', 'No new notifications')}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="light"
                >
                  <Text style={styles.notificationIcon}>🔔</Text>
                  {/* Unread count badge can be added here */}
                </AnimatedPressable>
              </View>
            </View>

            {/* HeroCard - Daily Motivation */}
            <View style={styles.section}>
              <Animated.View
                style={{
                  transform: [
                    {
                      translateY: heroParallax.interpolate({
                        inputRange: [0, 200],
                        outputRange: [0, -50],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }}
              >
                <HeroSection
                  image={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' }}
                  overlayGradient={{
                    colors: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)'],
                    start: { x: 0, y: 1 },
                    end: { x: 0, y: 0 },
                  }}
                  contentPosition="center"
                  height={200}
                  parallaxEnabled={false}
                >
                  <Text style={styles.heroQuote}>{getDailyQuote()}</Text>
                </HeroSection>
              </Animated.View>
            </View>

            {/* Guest User Sign-up Prompt */}
            {isGuestMode && (
              <View style={styles.section}>
                <GlassCard elevation={3} blurIntensity="light" padding="md" borderRadius="lg" style={styles.guestPromptCard}>
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
                      onPress={() => setShowGuestSignUp(true)}
                      variant="primary"
                      size="sm"
                      style={styles.guestPromptButton}
                    />
                  </View>
                </GlassCard>
              </View>
            )}

            {/* Today's Focus Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Focus</Text>

              {/* Today's Workout Card */}
              <GlassCard elevation={3} blurIntensity="light" padding="md" borderRadius="lg" style={styles.workoutCard}>
                <View style={styles.workoutCardContent}>
                  <View style={styles.workoutThumbnail}>
                    <Text style={styles.workoutThumbnailIcon}>💪</Text>
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutName}>Full Body Strength</Text>
                    <Text style={styles.workoutDetails}>45 mins • Intermediate</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '0%' }]} />
                      </View>
                      <Text style={styles.progressText}>0% Complete</Text>
                    </View>
                  </View>
                </View>
                <AnimatedPressable
                  style={styles.startButton}
                  onPress={() => onNavigateToTab?.('fitness')}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  <LinearGradient
                    {...(toLinearGradientProps(gradients.button.primary) as any)}
                    style={styles.startButtonGradient}
                  >
                    <Text style={styles.startButtonText}>START</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </GlassCard>

              {/* Meal Plan Card */}
              <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.mealPlanCard}>
                <Text style={styles.mealPlanTitle}>Today's Meal Plan</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.mealScroll}
                  contentContainerStyle={styles.mealScrollContent}
                  snapToInterval={rw(80) + ResponsiveTheme.spacing.md}
                  decelerationRate="fast"
                  pagingEnabled={false}
                >
                  <View style={styles.mealCard}>
                    <View style={styles.mealImage}>
                      <Text style={styles.mealEmoji}>🍳</Text>
                    </View>
                    <Text style={styles.mealLabel}>Breakfast</Text>
                    <Text style={styles.mealCalories}>350 cal</Text>
                  </View>
                  <View style={styles.mealCard}>
                    <View style={styles.mealImage}>
                      <Text style={styles.mealEmoji}>🥗</Text>
                    </View>
                    <Text style={styles.mealLabel}>Lunch</Text>
                    <Text style={styles.mealCalories}>520 cal</Text>
                  </View>
                  <View style={styles.mealCard}>
                    <View style={styles.mealImage}>
                      <Text style={styles.mealEmoji}>🍗</Text>
                    </View>
                    <Text style={styles.mealLabel}>Dinner</Text>
                    <Text style={styles.mealCalories}>480 cal</Text>
                  </View>
                  <View style={styles.mealCard}>
                    <View style={styles.mealImage}>
                      <Text style={styles.mealEmoji}>🍎</Text>
                    </View>
                    <Text style={styles.mealLabel}>Snacks</Text>
                    <Text style={styles.mealCalories}>150 cal</Text>
                  </View>
                </ScrollView>
                <Text style={styles.mealPlanCaption}>Tap to view details</Text>
              </GlassCard>
            </View>

            {/* Quick Stats - Aurora Design with ProgressRings */}
            <View style={styles.statsSection}>
              <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.quickStatsCard}>
                <View style={styles.quickStatsGrid}>
                  {/* Calories */}
                  <View style={styles.quickStatItem}>
                    <MiniProgressRing
                      progress={(realCaloriesBurned || userStats?.totalCaloriesBurned || 0) / 2000 * 100}
                      size={70}
                      strokeWidth={6}
                      gradient={{
                        colors: ['#FF6B6B', '#FF8E53'],
                        start: { x: 0, y: 0 },
                        end: { x: 1, y: 1 },
                      }}
                    >
                      <Text style={styles.quickStatIcon}>🔥</Text>
                    </MiniProgressRing>
                    <Text style={styles.quickStatValue}>
                      {realCaloriesBurned || userStats?.totalCaloriesBurned || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Calories</Text>
                  </View>

                  {/* Steps */}
                  <View style={styles.quickStatItem}>
                    <MiniProgressRing
                      progress={(healthMetrics?.steps || 0) / 10000 * 100}
                      size={70}
                      strokeWidth={6}
                      gradient={{
                        colors: ['#4CAF50', '#8BC34A'],
                        start: { x: 0, y: 0 },
                        end: { x: 1, y: 1 },
                      }}
                    >
                      <Text style={styles.quickStatIcon}>👟</Text>
                    </MiniProgressRing>
                    <Text style={styles.quickStatValue}>
                      {healthMetrics?.steps || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Steps</Text>
                  </View>

                  {/* Water */}
                  <View style={styles.quickStatItem}>
                    <MiniProgressRing
                      progress={50}
                      size={70}
                      strokeWidth={6}
                      gradient={{
                        colors: ['#2196F3', '#03A9F4'],
                        start: { x: 0, y: 0 },
                        end: { x: 1, y: 1 },
                      }}
                    >
                      <Text style={styles.quickStatIcon}>💧</Text>
                    </MiniProgressRing>
                    <Text style={styles.quickStatValue}>1.5L</Text>
                    <Text style={styles.quickStatLabel}>Water</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Achievement Highlights */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🏆 Achievement Highlights</Text>
                <AnimatedPressable onPress={() => onNavigateToTab?.('analytics')} scaleValue={0.95} hapticFeedback={true} hapticType="light">
                  <Text style={styles.seeAllText}>View All</Text>
                </AnimatedPressable>
              </View>

              {recentAchievements.length > 0 || nearlyCompleted.length > 0 ? (
                <View style={styles.achievementContainer}>
                  {/* Recent Achievements */}
                  {recentAchievements.length > 0 && (
                    <View style={styles.achievementGroup}>
                      <Text style={styles.achievementGroupTitle}>🎉 Recently Earned</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.achievementScroll}
                      >
                        {recentAchievements.map((achievement, index) => (
                          <GlassCard key={index} elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.achievementCard}>
                            <View style={styles.achievementBadge}>
                              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                            </View>
                            <Text style={styles.achievementTitle}>{achievement.title}</Text>
                            <Text style={styles.achievementCategory}>{achievement.category}</Text>
                          </GlassCard>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Nearly Completed */}
                  {nearlyCompleted.length > 0 && (
                    <View style={styles.achievementGroup}>
                      <Text style={styles.achievementGroupTitle}>🔥 Almost There</Text>
                      {nearlyCompleted.map((achievement, index) => (
                        <GlassCard key={index} elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.progressCard}>
                          <View style={styles.progressCardContent}>
                            <View style={styles.progressCardHeader}>
                              <View style={styles.progressBadge}>
                                <Text style={styles.progressIcon}>{achievement.icon}</Text>
                              </View>
                              <View style={styles.progressInfo}>
                                <Text style={styles.progressTitle}>{achievement.title}</Text>
                                <Text style={styles.progressDescription}>{achievement.description}</Text>
                              </View>
                            </View>
                            <View style={styles.progressBarContainer}>
                              <View style={styles.progressBar}>
                                <View 
                                  style={[
                                    styles.progressFill, 
                                    { width: `${achievement.progress}%` }
                                  ]} 
                                />
                              </View>
                              <Text style={styles.progressPercentage}>{achievement.progress}%</Text>
                            </View>
                          </View>
                        </GlassCard>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <GlassCard elevation={1} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.emptyAchievementCard}>
                  <View style={styles.emptyAchievementContent}>
                    <Text style={styles.emptyAchievementIcon}>🏆</Text>
                    <Text style={styles.emptyAchievementTitle}>Start Earning Achievements</Text>
                    <Text style={styles.emptyAchievementText}>
                      Complete workouts, hit goals, and maintain streaks to unlock 131 unique achievements!
                    </Text>
                    <Button
                      title="View All Achievements"
                      onPress={() => onNavigateToTab?.('analytics')}
                      variant="outline"
                      size="sm"
                      style={styles.emptyAchievementButton}
                    />
                  </View>
                </GlassCard>
              )}
            </View>

            {/* Recent Activity Feed */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activityFeed}>
                {/* Yesterday's Workout */}
                <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.activityCard}>
                  <View style={styles.activityContent}>
                    <View style={styles.activityIconContainer}>
                      <Text style={styles.activityIcon}>💪</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityType}>Full Body Workout</Text>
                      <Text style={styles.activityDetails}>45 mins • 320 calories</Text>
                      <Text style={styles.activityTimestamp}>Yesterday, 6:30 PM</Text>
                    </View>
                  </View>
                </GlassCard>

                {/* Meal Logged */}
                <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.activityCard}>
                  <View style={styles.activityContent}>
                    <View style={styles.activityIconContainer}>
                      <Text style={styles.activityIcon}>🥗</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityType}>Logged Lunch</Text>
                      <Text style={styles.activityDetails}>Chicken Salad • 450 cal</Text>
                      <Text style={styles.activityTimestamp}>Today, 1:00 PM</Text>
                    </View>
                  </View>
                </GlassCard>

                {/* Achievement Unlocked */}
                <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.activityCard}>
                  <View style={styles.activityContent}>
                    <View style={styles.activityIconContainer}>
                      <Text style={styles.activityIcon}>🏆</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityType}>Achievement Unlocked</Text>
                      <Text style={styles.activityDetails}>7-Day Streak Master</Text>
                      <Text style={styles.activityTimestamp}>2 days ago</Text>
                    </View>
                  </View>
                </GlassCard>
              </View>
            </View>

            {/* Personal Training CTA - Aurora Design */}
            <View style={styles.section}>
              <GlassCard elevation={3} blurIntensity="medium" padding="lg" borderRadius="xl" style={styles.personalTrainingCard}>
                {/* Icon Grid Preview */}
                <View style={styles.ptIconGrid}>
                  <View style={styles.ptIconRow}>
                    <Text style={styles.ptIcon}>🏋️</Text>
                    <Text style={styles.ptIcon}>🎯</Text>
                    <Text style={styles.ptIcon}>💪</Text>
                  </View>
                  <View style={styles.ptIconRow}>
                    <Text style={styles.ptIcon}>⚡</Text>
                    <Text style={styles.ptIcon}>📊</Text>
                    <Text style={styles.ptIcon}>🏆</Text>
                  </View>
                </View>

                {/* Content */}
                <Text style={styles.ptTitle}>Book Personal Training</Text>
                <Text style={styles.ptCaption}>50 mins • Goal-based • Expert trainers</Text>

                {/* Book Now Button */}
                <AnimatedPressable
                  style={styles.ptBookButton}
                  onPress={() => Alert.alert('Personal Training', 'Booking feature coming soon!')}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  <LinearGradient
                    {...(toLinearGradientProps(gradients.button.primary) as any)}
                    style={styles.ptBookButtonGradient}
                  >
                    <Text style={styles.ptBookButtonText}>BOOK NOW</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </GlassCard>
            </View>

            {/* Premium Achievement Prompt */}
            {!canAccessPremiumAchievements() && getTotalBadgesEarned() >= 5 && (
              <View style={styles.section}>
                <GlassCard elevation={3} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.premiumPromptCard}>
                  <View style={styles.premiumPromptContent}>
                    <View style={styles.premiumPromptHeader}>
                      <Text style={styles.premiumPromptIcon}>🏆</Text>
                      <Text style={styles.premiumPromptBadge}>PREMIUM</Text>
                    </View>
                    <Text style={styles.premiumPromptTitle}>Unlock Premium Achievements</Text>
                    <Text style={styles.premiumPromptText}>
                      You've earned {getTotalBadgesEarned()} badges! Unlock 50+ exclusive premium achievements, advanced progress tracking, and achievement analytics.
                    </Text>
                    <View style={styles.premiumPromptFeatures}>
                      <Text style={styles.premiumFeatureItem}>✨ Exclusive premium badges</Text>
                      <Text style={styles.premiumFeatureItem}>📊 Achievement analytics</Text>
                      <Text style={styles.premiumFeatureItem}>🎯 Advanced goal tracking</Text>
                    </View>
                    <Button
                      title={trialInfo.isEligible ? 'Start Free Trial' : 'Upgrade to Premium'}
                      onPress={() => showPaywallModal('premium_achievements')}
                      variant="primary"
                      style={styles.premiumPromptButton}
                    />
                    {trialInfo.isEligible && (
                      <Text style={styles.premiumTrialText}>7 days free, then $9.99/month</Text>
                    )}
                  </View>
                </GlassCard>
              </View>
            )}

            {/* Health Overview */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🩺 Health Overview</Text>
                <AnimatedPressable onPress={() => {
                  console.log('🔧 STEP 4 TEST: Opening Health Settings Modal');
                  setShowHealthSettingsModal(true);
                }} scaleValue={0.95} hapticFeedback={true} hapticType="light">
                  <Text style={styles.seeAllText}>Settings</Text>
                </AnimatedPressable>
              </View>

              <AnimatedPressable
                onPress={() => {
                  console.log('🔧 STEP 4 TEST: Opening Health Settings Modal from section');
                  setShowHealthSettingsModal(true);
                }}
                scaleValue={0.97}
                hapticFeedback={true}
                hapticType="medium"
              >
              {((Platform.OS === 'ios' && isHealthKitAuthorized && healthSettings.healthKitEnabled) || 
                (Platform.OS === 'android' && isHealthConnectAuthorized && healthSettings.healthConnectEnabled)) ? (
                <View style={styles.healthContainer}>
                  {/* Health Metrics Cards */}
                  <View style={styles.healthMetricsGrid}>
                    {/* Steps */}
                    <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.healthMetricCard}>
                      <View style={styles.healthMetricHeader}>
                        <Text style={styles.healthMetricIcon}>👣</Text>
                        <View style={styles.healthMetricProgress}>
                          <View style={styles.healthProgressRing}>
                            <View 
                              style={[
                                styles.healthProgressFill,
                                { 
                                  transform: [{ 
                                    rotate: `${Math.min((healthMetrics.steps / 10000) * 360, 360)}deg` 
                                  }] 
                                }
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                      <Text style={styles.healthMetricValue}>
                        {healthMetrics.steps?.toLocaleString() || '0'}
                      </Text>
                      <Text style={styles.healthMetricLabel}>Steps</Text>
                      <Text style={styles.healthMetricGoal}>Goal: 10,000</Text>
                    </GlassCard>

                    {/* Active Calories */}
                    <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.healthMetricCard}>
                      <View style={styles.healthMetricHeader}>
                        <Text style={styles.healthMetricIcon}>🔥</Text>
                        <View style={styles.healthMetricProgress}>
                          <View style={styles.healthProgressRing}>
                            <View 
                              style={[
                                styles.healthProgressFill,
                                { 
                                  backgroundColor: ResponsiveTheme.colors.warning,
                                  transform: [{ 
                                    rotate: `${Math.min((healthMetrics.activeCalories / 500) * 360, 360)}deg` 
                                  }] 
                                }
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                      <Text style={styles.healthMetricValue}>
                        {healthMetrics.activeCalories?.toLocaleString() || '0'}
                      </Text>
                      <Text style={styles.healthMetricLabel}>Active Cal</Text>
                      <Text style={styles.healthMetricGoal}>Goal: 500</Text>
                    </GlassCard>

                    {/* Sleep Hours */}
                    {healthMetrics.sleepHours && (
                      <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.healthMetricCard}>
                        <View style={styles.healthMetricHeader}>
                          <Text style={styles.healthMetricIcon}>😴</Text>
                          <View style={styles.healthMetricProgress}>
                            <View style={styles.healthProgressRing}>
                              <View 
                                style={[
                                  styles.healthProgressFill,
                                  { 
                                    backgroundColor: ResponsiveTheme.colors.success,
                                    transform: [{ 
                                      rotate: `${Math.min((healthMetrics.sleepHours / 8) * 360, 360)}deg` 
                                    }] 
                                  }
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                        <Text style={styles.healthMetricValue}>
                          {healthMetrics.sleepHours.toFixed(1)}h
                        </Text>
                        <Text style={styles.healthMetricLabel}>Sleep</Text>
                        <Text style={styles.healthMetricGoal}>Goal: 8h</Text>
                      </GlassCard>
                    )}

                    {/* Heart Rate */}
                    {healthMetrics.heartRate && (
                      <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.healthMetricCard}>
                        <View style={styles.healthMetricHeader}>
                          <Text style={styles.healthMetricIcon}>❤️</Text>
                          <Text style={styles.healthHeartRateStatus}>
                            {healthMetrics.heartRate > 100 ? 'Active' : 'Resting'}
                          </Text>
                        </View>
                        <Text style={styles.healthMetricValue}>
                          {healthMetrics.heartRate} BPM
                        </Text>
                        <Text style={styles.healthMetricLabel}>Heart Rate</Text>
                        <Text style={styles.healthMetricGoal}>
                          {new Date(healthMetrics.lastUpdated).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </GlassCard>
                    )}
                  </View>

                  {/* Health Insight */}
                  {healthTipOfDay && (
                    <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.healthInsightCard}>
                      <View style={styles.healthInsightHeader}>
                        <Text style={styles.healthInsightIcon}>💡</Text>
                        <Text style={styles.healthInsightTitle}>Health Insight</Text>
                      </View>
                      <Text style={styles.healthInsightText}>{healthTipOfDay}</Text>
                    </GlassCard>
                  )}

                  {/* Sync Status */}
                  <View style={styles.healthSyncStatus}>
                    <View style={styles.healthSyncIndicator}>
                      <Text style={styles.healthSyncIcon}>
                        {syncStatus === 'syncing' ? '🔄' : 
                         syncStatus === 'success' ? '✅' : 
                         syncStatus === 'error' ? '❌' : '⏸️'}
                      </Text>
                      <Text style={styles.healthSyncText}>
                        {syncStatus === 'syncing' ? 'Syncing health data...' :
                         syncStatus === 'success' ? 'Health data synced' :
                         syncStatus === 'error' ? 'Sync failed - tap to retry' :
                         'Health sync idle'}
                      </Text>
                    </View>
                    {syncStatus === 'error' && (
                      <AnimatedPressable
                        scaleValue={0.95}
                        style={styles.healthRetryButton}
                        onPress={() => syncHealthData(true)}
                      >
                        <Text style={styles.healthRetryText}>Retry</Text>
                      </AnimatedPressable>
                    )}
                  </View>
                </View>
              ) : (
                <GlassCard elevation={1} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.healthSetupCard}>
                  <View style={styles.healthSetupContent}>
                    <Text style={styles.healthSetupIcon}>🩺</Text>
                    <Text style={styles.healthSetupTitle}>Connect Health Data</Text>
                    <Text style={styles.healthSetupText}>
                      Sync with Apple Health or Google Fit to track steps, heart rate, sleep, and more for personalized workout recommendations.
                    </Text>
                    <Button
                      title={isHealthKitAuthorized ? 'Enable Sync' : 'Connect HealthKit'}
                      onPress={() => {
                        if (isHealthKitAuthorized) {
                          syncHealthData(true);
                        } else {
                          initializeHealthKit();
                        }
                      }}
                      variant="primary"
                      size="sm"
                      style={styles.healthSetupButton}
                    />
                  </View>
                </GlassCard>
              )}
              </AnimatedPressable>
            </View>

            {/* Analytics Insights */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📊 Performance Insights</Text>
                <AnimatedPressable scaleValue={0.97} onPress={() => onNavigateToTab?.('analytics')} hapticFeedback={true} hapticType="light">
                  <Text style={styles.seeAllText}>Full Report</Text>
                </AnimatedPressable>
              </View>

              {currentAnalytics && analyticsInitialized ? (
                <View style={styles.analyticsContainer}>
                  {/* Overall Performance Score */}
                  <GlassCard elevation={3} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.performanceScoreCard}>
                    <View style={styles.performanceHeader}>
                      <View style={styles.performanceScoreSection}>
                        <Text style={styles.performanceScoreValue}>{currentAnalytics.overallScore}</Text>
                        <Text style={styles.performanceScoreMax}>/100</Text>
                      </View>
                      <View style={styles.performanceDetailsSection}>
                        <Text style={styles.performanceTitle}>Overall Performance</Text>
                        <Text style={styles.performanceSubtitle}>
                          {currentAnalytics.overallScore >= 90 ? '🏆 Exceptional' :
                           currentAnalytics.overallScore >= 80 ? '🌟 Excellent' :
                           currentAnalytics.overallScore >= 70 ? '💪 Good' :
                           currentAnalytics.overallScore >= 60 ? '📈 Improving' :
                           '🎯 Getting Started'}
                        </Text>
                        <View style={styles.performanceProgress}>
                          <View style={styles.performanceProgressBar}>
                            <View 
                              style={[
                                styles.performanceProgressFill, 
                                { width: `${currentAnalytics.overallScore}%` }
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </GlassCard>

                  {/* Quick Stats Grid */}
                  <View style={styles.analyticsStatsGrid}>
                    <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.analyticsStatCard}>
                      <Text style={styles.analyticsStatIcon}>🔥</Text>
                      <Text style={styles.analyticsStatValue}>{analyticsSummary.currentStreak}</Text>
                      <Text style={styles.analyticsStatLabel}>Day Streak</Text>
                    </GlassCard>

                    <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.analyticsStatCard}>
                      <Text style={styles.analyticsStatIcon}>⭐</Text>
                      <Text style={styles.analyticsStatValue}>{analyticsSummary.averageScore}</Text>
                      <Text style={styles.analyticsStatLabel}>Avg Score</Text>
                    </GlassCard>

                    <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.analyticsStatCard}>
                      <Text style={styles.analyticsStatIcon}>💪</Text>
                      <Text style={styles.analyticsStatValue}>{analyticsSummary.totalWorkouts}</Text>
                      <Text style={styles.analyticsStatLabel}>Workouts</Text>
                    </GlassCard>
                  </View>

                  {/* Top Insights */}
                  {getTopInsights().length > 0 && (
                    <View style={styles.insightsSection}>
                      <Text style={styles.insightsSectionTitle}>✨ Key Insights</Text>
                      {getTopInsights().slice(0, 2).map((insight, index) => (
                        <GlassCard key={index} elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.insightCard}>
                          <Text style={styles.insightText}>{insight}</Text>
                        </GlassCard>
                      ))}
                    </View>
                  )}

                  {/* Positive Trends */}
                  {getPositiveTrends().length > 0 && (
                    <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.trendsCard}>
                      <View style={styles.trendsHeader}>
                        <Text style={styles.trendsIcon}>📈</Text>
                        <Text style={styles.trendsTitle}>Positive Trends</Text>
                      </View>
                      <View style={styles.trendsList}>
                        {getPositiveTrends().slice(0, 2).map((trend, index) => (
                          <Text key={index} style={styles.trendItem}>• {trend}</Text>
                        ))}
                      </View>
                    </GlassCard>
                  )}

                  {/* Improvement Areas */}
                  {getImprovementAreas().length > 0 && (
                    <GlassCard elevation={1} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.improvementCard}>
                      <View style={styles.improvementHeader}>
                        <Text style={styles.improvementIcon}>🎯</Text>
                        <Text style={styles.improvementTitle}>Focus Areas</Text>
                      </View>
                      <Text style={styles.improvementText}>
                        {getImprovementAreas()[0]}
                      </Text>
                      <AnimatedPressable
                        scaleValue={0.95}
                        style={styles.improvementButton}
                        onPress={() => onNavigateToTab?.('analytics')}
                      >
                        <Text style={styles.improvementButtonText}>View Recommendations</Text>
                      </AnimatedPressable>
                    </GlassCard>
                  )}

                  {/* Predictive Insights */}
                  {getPredictiveInsights() && (
                    <GlassCard elevation={3} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.predictiveCard}>
                      <View style={styles.predictiveHeader}>
                        <Text style={styles.predictiveIcon}>🔮</Text>
                        <Text style={styles.predictiveTitle}>Forecast</Text>
                      </View>
                      <Text style={styles.predictiveText}>
                        {getPredictiveInsights()?.goalAchievementProbability 
                          ? `${Math.round(getPredictiveInsights()!.goalAchievementProbability * 100)}% chance to reach your goals this month`
                          : 'Keep tracking to see predictive insights'}
                      </Text>
                      {getPredictiveInsights()?.plateauRisk && (
                        <Text style={styles.predictiveWarning}>
                          ⚠️ Plateau risk detected - consider varying your routine
                        </Text>
                      )}
                    </GlassCard>
                  )}
                </View>
              ) : (
                <GlassCard elevation={1} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.analyticsEmptyCard}>
                  <View style={styles.analyticsEmptyContent}>
                    <Text style={styles.analyticsEmptyIcon}>📊</Text>
                    <Text style={styles.analyticsEmptyTitle}>Start Building Your Analytics</Text>
                    <Text style={styles.analyticsEmptyText}>
                      Complete workouts, log meals, and track progress to unlock powerful insights and personalized recommendations.
                    </Text>
                    <Button
                      title="View Analytics Dashboard"
                      onPress={() => onNavigateToTab?.('analytics')}
                      variant="primary"
                      size="sm"
                      style={styles.analyticsEmptyButton}
                    />
                  </View>
                </GlassCard>
              )}
            </View>

            {/* Premium Analytics Upgrade */}
            {!canAccessAdvancedAnalytics() && currentAnalytics && analyticsSummary.totalWorkouts >= 10 && (
              <View style={styles.section}>
                <GlassCard elevation={3} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.premiumAnalyticsCard}>
                  <View style={styles.premiumAnalyticsContent}>
                    <View style={styles.premiumAnalyticsHeader}>
                      <Text style={styles.premiumAnalyticsIcon}>📈</Text>
                      <View style={styles.premiumAnalyticsTextSection}>
                        <Text style={styles.premiumAnalyticsTitle}>Unlock Advanced Analytics</Text>
                        <Text style={styles.premiumAnalyticsBadge}>PREMIUM FEATURE</Text>
                      </View>
                    </View>
                    <Text style={styles.premiumAnalyticsSubtitle}>
                      You've completed {analyticsSummary.totalWorkouts} workouts! Get deeper insights with premium analytics.
                    </Text>
                    
                    <View style={styles.premiumAnalyticsFeatures}>
                      <View style={styles.premiumAnalyticsRow}>
                        <Text style={styles.premiumAnalyticsFeature}>🔮 Predictive body transformation forecasts</Text>
                      </View>
                      <View style={styles.premiumAnalyticsRow}>
                        <Text style={styles.premiumAnalyticsFeature}>⚡ Plateau detection & prevention</Text>
                      </View>
                      <View style={styles.premiumAnalyticsRow}>
                        <Text style={styles.premiumAnalyticsFeature}>📊 Detailed performance benchmarking</Text>
                      </View>
                      <View style={styles.premiumAnalyticsRow}>
                        <Text style={styles.premiumAnalyticsFeature}>📈 Exportable progress reports</Text>
                      </View>
                    </View>

                    <View style={styles.premiumAnalyticsPreview}>
                      <Text style={styles.premiumAnalyticsPreviewTitle}>Preview: Your Potential Forecast</Text>
                      <View style={styles.premiumAnalyticsPreviewContent}>
                        <Text style={styles.premiumAnalyticsPreviewText}>
                          🎯 85% chance to reach your goals this month
                        </Text>
                        <Text style={styles.premiumAnalyticsPreviewText}>
                          💪 Predicted 3.2kg muscle gain in 6 months
                        </Text>
                        <View style={styles.premiumAnalyticsBlur}>
                          <Text style={styles.premiumAnalyticsBlurText}>Unlock to see more</Text>
                        </View>
                      </View>
                    </View>

                    <Button
                      title={trialInfo.isEligible ? 'Try Premium Free' : 'Upgrade Now'}
                      onPress={() => showPaywallModal('advanced_analytics')}
                      variant="primary"
                      style={styles.premiumAnalyticsButton}
                    />
                  </View>
                </GlassCard>
              </View>
            )}

            {/* AI Usage Limit Prompt */}
            {!canUseUnlimitedAI() && hasRealData && (
              <View style={styles.section}>
                <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.aiLimitCard}>
                  <View style={styles.aiLimitContent}>
                    <View style={styles.aiLimitHeader}>
                      <Text style={styles.aiLimitIcon}>🤖</Text>
                      <View style={styles.aiLimitInfo}>
                        <Text style={styles.aiLimitTitle}>AI Usage Limit</Text>
                        <Text style={styles.aiLimitSubtitle}>2 of 3 daily AI generations used</Text>
                      </View>
                      <AnimatedPressable
                        scaleValue={0.95}
                        style={styles.aiLimitUpgrade}
                        onPress={() => showPaywallModal('unlimited_ai')}
                      >
                        <Text style={styles.aiLimitUpgradeText}>Unlimited</Text>
                      </AnimatedPressable>
                    </View>
                    <View style={styles.aiLimitProgress}>
                      <View style={styles.aiLimitProgressBar}>
                        <View style={[styles.aiLimitProgressFill, { width: '66%' }]} />
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </View>
            )}

            {/* Today's Workout */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Workout</Text>
                <AnimatedPressable scaleValue={0.97} onPress={() => onNavigateToTab?.('fitness')} hapticFeedback={true} hapticType="light">
                  <Text style={styles.seeAllText}>See All</Text>
                </AnimatedPressable>
              </View>

              <AnimatedPressable
                onPress={() => onNavigateToTab?.('fitness')}
                scaleValue={0.98}
                hapticFeedback={true}
                hapticType="medium"
                style={{ elevation: 3, shadowOpacity: 0.1 }}
                onPressIn={() => {
                  // Lift elevation effect handled by scaleValue
                }}
              >
                <GlassCard elevation={5} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.workoutCard}>
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
                            : "Ready for today's workout?"}
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
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${todaysData?.progress.workoutProgress || 0}%` },
                        ]}
                      />
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
                        ? todaysWorkoutInfo.workout?.description ||
                          'Ready to continue your workout?'
                        : "Ready for today's workout?"}
                </Text>

                <Button
                  title={
                    !todaysWorkoutInfo.hasWeeklyPlan
                      ? 'Generate Workout'
                      : todaysWorkoutInfo.isRestDay
                        ? 'View Weekly Plan'
                        : todaysWorkoutInfo.hasWorkout
                          ? todaysWorkoutInfo.isCompleted
                            ? 'View Details'
                            : 'Continue Workout'
                          : 'Start Workout'
                  }
                  onPress={() => {
                    onNavigateToTab?.('fitness');
                  }}
                  variant={todaysWorkoutInfo.isRestDay ? 'outline' : 'primary'}
                  style={styles.workoutButton}
                />
              </GlassCard>
              </AnimatedPressable>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                <AnimatedPressable
                  scaleValue={0.95}
                  style={styles.actionItem}
                  onPress={() => onNavigateToTab?.('fitness')}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.actionCard}>
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
                  </GlassCard>
                </AnimatedPressable>

                <AnimatedPressable
                  scaleValue={0.95}
                  style={styles.actionItem}
                  onPress={() => onNavigateToTab?.('diet')}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.actionCard}>
                    <Text style={styles.actionIcon}>🍎</Text>
                    <Text style={styles.actionText}>
                      {todaysData?.meals.length > 0 ? 'View Meals' : 'Plan Meals'}
                    </Text>
                  </GlassCard>
                </AnimatedPressable>

                <AnimatedPressable
                  scaleValue={0.95}
                  style={styles.actionItem}
                  onPress={() => onNavigateToTab?.('progress')}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.actionCard}>
                    <Text style={styles.actionIcon}>📊</Text>
                    <Text style={styles.actionText}>View Progress</Text>
                  </GlassCard>
                </AnimatedPressable>

                <AnimatedPressable
                  scaleValue={0.95}
                  style={styles.actionItem}
                  onPress={() => onNavigateToTab?.('profile')}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.actionCard}>
                    <Text style={styles.actionIcon}>⚙️</Text>
                    <Text style={styles.actionText}>Settings</Text>
                  </GlassCard>
                </AnimatedPressable>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>

              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <GlassCard key={activity.id} elevation={1} blurIntensity="light" padding="md" borderRadius="lg" style={styles.activityCard}>
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
                  </GlassCard>
                ))
              ) : (
                <GlassCard elevation={1} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.emptyActivityCard}>
                  <View style={styles.emptyActivityContent}>
                    <Text style={styles.emptyActivityIcon}>📈</Text>
                    <Text style={styles.emptyActivityTitle}>
                      {hasRealData
                        ? 'Complete Activities to See History'
                        : 'Start Your Fitness Journey'}
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
                </GlassCard>
              )}
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>
      </Animated.View>

      {/* Health Settings Modal */}
      <Modal
        visible={showHealthSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHealthSettingsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🩺 Health Integration Settings</Text>
            <AnimatedPressable
              scaleValue={0.95}
              onPress={() => setShowHealthSettingsModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </AnimatedPressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <GlassCard elevation={1} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.healthSettingCard}>
              <View style={styles.healthSettingHeader}>
                <Text style={styles.healthSettingIcon}>
                  {Platform.OS === 'ios' ? '🍎' : '🔗'}
                </Text>
                <View style={styles.healthSettingInfo}>
                  <Text style={styles.healthSettingTitle}>
                    {Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect'}
                  </Text>
                  <Text style={styles.healthSettingDescription}>
                    {Platform.OS === 'ios' 
                      ? 'Sync with Apple Health for steps, heart rate, sleep data'
                      : 'Modern health platform for steps, heart rate, sleep, and activity data. Replaces deprecated Google Fit.'
                    }
                  </Text>
                </View>
              </View>
              
              <View style={styles.healthSettingActions}>
                <Button
                  title={(Platform.OS === 'ios' ? isHealthKitAuthorized : isHealthConnectAuthorized) ? 'Reconnect' : 'Connect'}
                  onPress={async () => {
                    console.log('🔧 Connecting to health platform...');
                    if (Platform.OS === 'ios') {
                      // iOS HealthKit
                      initializeHealthKit();
                    } else {
                      // Android Health Connect
                      console.log('🔗 Attempting to initialize Health Connect...');
                      try {
                        // Step 1: Initialize Health Connect
                        console.log('Step 1: Initializing Health Connect...');
                        const initialized = await initializeHealthConnect();
                        
                        if (!initialized) {
                          // Step 2: Request permissions if not initialized
                          console.log('Step 2: Requesting Health Connect permissions...');
                          
                          // Show user what's happening
                          alert('📱 Health Connect will now request permissions for:\\n\\n• Steps\\n• Heart Rate\\n• Active Calories\\n• Distance\\n• Weight\\n• Sleep Data\\n\\nPlease grant these permissions to enable health tracking.');
                          
                          const permissionGranted = await requestHealthConnectPermissions();
                          
                          if (permissionGranted) {
                            alert('✅ Health Connect connected successfully!\\n\\nYour health data will now sync automatically.');
                            console.log('✅ Health Connect permissions granted');
                            
                            // Step 3: Perform initial data sync
                            console.log('Step 3: Performing initial health data sync...');
                            const syncResult = await syncFromHealthConnect(7);
                            
                            if (syncResult.success) {
                              console.log('✅ Initial health data sync completed');
                              console.log('Synced data:', syncResult.data);
                            } else {
                              console.warn('⚠️ Initial sync failed:', syncResult.error);
                            }
                          } else {
                            alert('❌ Health Connect permissions were denied.\\n\\nTo enable health tracking:\\n1. Go to Health Connect settings\\n2. Grant permissions for FitAI\\n3. Try connecting again');
                            
                            // Optionally open Health Connect settings for user
                            const { healthConnectService } = await import('../../services/healthConnect');
                            await healthConnectService.openSettings();
                          }
                        } else {
                          alert('✅ Health Connect is already connected!\\n\\nYour health data is syncing automatically.');
                          console.log('✅ Health Connect already connected');
                        }
                      } catch (error) {
                        console.error('❌ Health Connect connection error:', error);
                        alert(`❌ Error connecting to Health Connect:\\n\\n${error.message}\\n\\nPlease ensure Health Connect is installed and try again.`);
                      }
                    }
                  }}
                  variant={(Platform.OS === 'ios' ? isHealthKitAuthorized : isHealthConnectAuthorized) ? 'outline' : 'primary'}
                  size="md"
                />
                
                {((Platform.OS === 'ios' && isHealthKitAuthorized) || (Platform.OS === 'android' && isHealthConnectAuthorized)) && (
                  <Button
                    title="Sync Now"
                    onPress={async () => {
                      console.log('🔧 STEP 6 TEST: Manual sync triggered');
                      console.log('🔄 Manual health data sync triggered');
                      
                      try {
                        // Show loading state to user
                        alert('🔄 Syncing health data...\\n\\nThis may take a few moments.');
                        
                        if (Platform.OS === 'ios') {
                          syncHealthData(true);
                        } else {
                          // Sync from Health Connect for Android
                          console.log('🔗 Attempting to sync from Health Connect...');
                          const result = await syncFromHealthConnect(7);
                          
                          if (result.success) {
                            const data = result.data;
                            let syncSummary = '✅ Health data synced successfully!\\n\\n';
                            
                            // Show user what data was synced
                            if (data?.steps) syncSummary += `📊 Steps: ${data.steps.toLocaleString()}\\n`;
                            if (data?.heartRate) syncSummary += `💓 Heart Rate: ${data.heartRate} bpm\\n`;
                            if (data?.activeCalories) syncSummary += `🔥 Active Calories: ${Math.round(data.activeCalories)}\\n`;
                            if (data?.distance) syncSummary += `🏃 Distance: ${(data.distance / 1000).toFixed(2)} km\\n`;
                            if (data?.weight) syncSummary += `⚖️ Weight: ${data.weight.toFixed(1)} kg\\n`;
                            
                            alert(syncSummary);
                            console.log('✅ Manual Health Connect sync successful:', data);
                          } else {
                            alert(`❌ Failed to sync health data:\\n\\n${result.error}\\n\\nPlease check your Health Connect permissions and try again.`);
                            console.error('❌ Manual sync failed:', result.error);
                          }
                        }
                      } catch (error) {
                        console.error('❌ Health data sync error:', error);
                        alert(`❌ Error syncing health data:\\n\\n${error.message}`);
                      }
                    }}
                    variant="outline"
                    size="md"
                    style={styles.syncButton}
                  />
                )}
              </View>
              
              <View style={styles.healthStatus}>
                <Text style={styles.healthStatusLabel}>Connection Status:</Text>
                <Text style={[
                  styles.healthStatusValue,
                  { color: (Platform.OS === 'ios' ? isHealthKitAuthorized : isHealthConnectAuthorized) ? '#4CAF50' : '#FF9800' }
                ]}>
                  {(Platform.OS === 'ios' ? isHealthKitAuthorized : isHealthConnectAuthorized) ? '✅ Connected' : '⚠️ Not Connected'}
                </Text>
              </View>
              
              {((Platform.OS === 'ios' && isHealthKitAuthorized) || (Platform.OS === 'android' && isHealthConnectAuthorized)) && (
                <View style={styles.healthDataPreview}>
                  <Text style={styles.healthDataTitle}>Latest Data:</Text>
                  <View style={styles.healthDataGrid}>
                    <View style={styles.healthDataItem}>
                      <Text style={styles.healthDataLabel}>Steps</Text>
                      <Text style={styles.healthDataValue}>
                        {healthMetrics?.steps?.toLocaleString() || 'No data'}
                      </Text>
                    </View>
                    <View style={styles.healthDataItem}>
                      <Text style={styles.healthDataLabel}>Heart Rate</Text>
                      <Text style={styles.healthDataValue}>
                        {healthMetrics?.heartRate || 'No data'} bpm
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </GlassCard>

            {/* Migration Information Card for Android */}
            {Platform.OS === 'android' && (
              <GlassCard elevation={1} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.migrationInfoCard}>
                <View style={styles.migrationHeader}>
                  <Text style={styles.migrationIcon}>🔄</Text>
                  <Text style={styles.migrationTitle}>Google Fit → Health Connect Migration</Text>
                </View>
                <View style={styles.migrationContent}>
                  <Text style={styles.migrationDescription}>
                    Google is deprecating Google Fit APIs by June 2026. Health Connect is Google's official modern replacement offering:
                  </Text>
                  <View style={styles.migrationBenefits}>
                    <Text style={styles.migrationBenefit}>• 🔒 Enhanced privacy - data stays on your device</Text>
                    <Text style={styles.migrationBenefit}>• ⚡ Better performance and reliability</Text>
                    <Text style={styles.migrationBenefit}>• 🔄 Compatible with more health apps</Text>
                    <Text style={styles.migrationBenefit}>• 🛡️ Future-proof solution from Google</Text>
                  </View>
                  <Text style={styles.migrationNote}>
                    Health Connect requires Android 8.0+ and the Health Connect app to be installed.
                  </Text>
                </View>
              </GlassCard>
            )}
            
            <Text style={styles.modalFooter}>
              Health data is synced securely and used only to personalize your fitness experience.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </AuroraBackground>
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

  // Aurora Header Styles
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.md,
    flex: 1,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },

  avatar: {
    // Avatar wrapper
  },

  greetingContainer: {
    flex: 1,
  },

  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },

  streakIcon: {
    fontSize: rf(18),
  },

  streakNumber: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  notificationButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  notificationIcon: {
    fontSize: rf(20),
  },

  // HeroCard Styles
  heroQuote: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    textAlign: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    lineHeight: ResponsiveTheme.fontSize.xl * 1.4,
  },

  // Today's Focus - Workout Card
  workoutCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  workoutCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },

  workoutThumbnail: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(12),
    backgroundColor: ResponsiveTheme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  workoutThumbnailIcon: {
    fontSize: rf(40),
  },

  workoutInfo: {
    flex: 1,
  },

  workoutName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  workoutDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  startButton: {
    borderRadius: rw(12),
    overflow: 'hidden',
  },

  startButtonGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  startButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  // Today's Focus - Meal Plan
  mealPlanCard: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  mealPlanTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  mealScroll: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  mealScrollContent: {
    gap: ResponsiveTheme.spacing.md,
    paddingRight: ResponsiveTheme.spacing.md,
  },

  mealCard: {
    alignItems: 'center',
  },

  mealImage: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(12),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  mealEmoji: {
    fontSize: rf(40),
  },

  mealLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xxs,
  },

  mealCalories: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  mealPlanCaption: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Quick Stats with ProgressRings
  quickStatsCard: {
    // Card styling handled by GlassCard
  },

  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  quickStatItem: {
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },

  quickStatIcon: {
    fontSize: rf(24),
  },

  quickStatValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  quickStatLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Recent Activity Feed
  activityFeed: {
    gap: ResponsiveTheme.spacing.md,
  },

  activityCard: {
    // Card styling handled by GlassCard
  },

  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.md,
  },

  activityIconContainer: {
    width: rw(50),
    height: rw(50),
    borderRadius: rw(25),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activityIcon: {
    fontSize: rf(24),
  },

  activityInfo: {
    flex: 1,
  },

  activityType: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xxs,
  },

  activityDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xxs,
  },

  activityTimestamp: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: 'italic',
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
    gap: ResponsiveTheme.spacing.sm,
  },

  statCard: {
    flex: 1,
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    minWidth: rw(100),
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

  // Achievement styles
  achievementContainer: {
    gap: ResponsiveTheme.spacing.lg,
  },

  achievementGroup: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  achievementGroupTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  achievementScroll: {
    marginHorizontal: -ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  achievementCard: {
    width: rw(120),
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.sm,
  },

  achievementBadge: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    backgroundColor: ResponsiveTheme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  achievementIcon: {
    fontSize: rf(24),
  },

  achievementTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  achievementCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  progressCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  progressCardContent: {
    padding: ResponsiveTheme.spacing.md,
  },

  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  progressBadge: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: ResponsiveTheme.colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.sm,
  },

  progressIcon: {
    fontSize: rf(18),
  },

  progressInfo: {
    flex: 1,
  },

  progressTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  progressDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressPercentage: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginLeft: ResponsiveTheme.spacing.sm,
    minWidth: rw(35),
  },

  // Empty achievement state
  emptyAchievementCard: {
    padding: ResponsiveTheme.spacing.xl,
  },

  emptyAchievementContent: {
    alignItems: 'center',
  },

  emptyAchievementIcon: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  emptyAchievementTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  emptyAchievementText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  emptyAchievementButton: {
    minWidth: rw(140),
  },

  // Health Data styles
  healthContainer: {
    gap: ResponsiveTheme.spacing.md,
  },

  healthMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
    justifyContent: 'space-between',
  },

  healthMetricCard: {
    width: '48%',
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  healthMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  healthMetricIcon: {
    fontSize: rf(24),
  },

  healthMetricProgress: {
    width: rw(24),
    height: rw(24),
  },

  healthProgressRing: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    borderWidth: 3,
    borderColor: ResponsiveTheme.colors.backgroundSecondary,
    position: 'relative',
    overflow: 'hidden',
  },

  healthProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '50%',
    backgroundColor: ResponsiveTheme.colors.primary,
    transformOrigin: 'center bottom',
  },

  healthMetricValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  healthMetricLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  healthMetricGoal: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  healthHeartRateStatus: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Health Insight Card
  healthInsightCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.primary + '05',
    borderColor: ResponsiveTheme.colors.primary + '20',
  },

  healthInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  healthInsightIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  healthInsightTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  healthInsightText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },

  // Health Sync Status
  healthSyncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  healthSyncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  healthSyncIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  healthSyncText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    flex: 1,
  },

  healthRetryButton: {
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  healthRetryText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Health Setup Card
  healthSetupCard: {
    padding: ResponsiveTheme.spacing.xl,
  },

  healthSetupContent: {
    alignItems: 'center',
  },

  healthSetupIcon: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  healthSetupTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  healthSetupText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  healthSetupButton: {
    minWidth: rw(140),
  },

  // Analytics Insights styles
  analyticsContainer: {
    gap: ResponsiveTheme.spacing.md,
  },

  // Performance Score Card
  performanceScoreCard: {
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.primary + '08',
    borderColor: ResponsiveTheme.colors.primary + '20',
  },

  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  performanceScoreSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: ResponsiveTheme.spacing.lg,
  },

  performanceScoreValue: {
    fontSize: rf(36),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  performanceScoreMax: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.xs,
  },

  performanceDetailsSection: {
    flex: 1,
  },

  performanceTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  performanceSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  performanceProgress: {
    flex: 1,
  },

  performanceProgressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    overflow: 'hidden',
  },

  performanceProgressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  // Analytics Stats Grid
  analyticsStatsGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },

  analyticsStatCard: {
    flex: 1,
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  analyticsStatIcon: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  analyticsStatValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  analyticsStatLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Insights Section
  insightsSection: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  insightsSectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  insightCard: {
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  insightText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },

  // Trends Card
  trendsCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.success + '08',
    borderColor: ResponsiveTheme.colors.success + '20',
  },

  trendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  trendsIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  trendsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  trendsList: {
    gap: ResponsiveTheme.spacing.xs,
  },

  trendItem: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    lineHeight: rf(18),
  },

  // Improvement Card
  improvementCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  improvementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  improvementIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  improvementTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  improvementText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  improvementButton: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    alignSelf: 'flex-start',
  },

  improvementButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Predictive Card
  predictiveCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.warning + '08',
    borderColor: ResponsiveTheme.colors.warning + '20',
  },

  predictiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  predictiveIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  predictiveTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  predictiveText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  predictiveWarning: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Analytics Empty State
  analyticsEmptyCard: {
    padding: ResponsiveTheme.spacing.xl,
  },

  analyticsEmptyContent: {
    alignItems: 'center',
  },

  analyticsEmptyIcon: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  analyticsEmptyTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  analyticsEmptyText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  analyticsEmptyButton: {
    minWidth: rw(160),
  },

  // Premium Prompt Styles
  premiumPromptCard: {
    backgroundColor: 'linear-gradient(135deg, #FFD700, #FFA500)',
    borderColor: ResponsiveTheme.colors.warning + '40',
    borderWidth: 2,
    overflow: 'hidden',
  },

  premiumPromptContent: {
    padding: ResponsiveTheme.spacing.lg,
  },

  premiumPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  premiumPromptIcon: {
    fontSize: rf(32),
  },

  premiumPromptBadge: {
    backgroundColor: ResponsiveTheme.colors.warning,
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    textAlign: 'center',
  },

  premiumPromptTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  premiumPromptText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  premiumPromptFeatures: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  premiumFeatureItem: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    lineHeight: rf(18),
  },

  premiumPromptButton: {
    backgroundColor: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  premiumTrialText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
  },

  // Premium Analytics Card
  premiumAnalyticsCard: {
    backgroundColor: ResponsiveTheme.colors.primary + '08',
    borderColor: ResponsiveTheme.colors.primary + '30',
    borderWidth: 2,
  },

  premiumAnalyticsContent: {
    padding: ResponsiveTheme.spacing.lg,
  },

  premiumAnalyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  premiumAnalyticsIcon: {
    fontSize: rf(28),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  premiumAnalyticsTextSection: {
    flex: 1,
  },

  premiumAnalyticsTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  premiumAnalyticsBadge: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  premiumAnalyticsSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  premiumAnalyticsFeatures: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  premiumAnalyticsRow: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  premiumAnalyticsFeature: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(20),
  },

  premiumAnalyticsPreview: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  premiumAnalyticsPreviewTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  premiumAnalyticsPreviewContent: {
    position: 'relative',
  },

  premiumAnalyticsPreviewText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  premiumAnalyticsBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ResponsiveTheme.colors.background + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  premiumAnalyticsBlurText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  premiumAnalyticsButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  // AI Limit Card
  aiLimitCard: {
    borderColor: ResponsiveTheme.colors.warning + '40',
  },

  aiLimitContent: {
    padding: ResponsiveTheme.spacing.md,
  },

  aiLimitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  aiLimitIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  aiLimitInfo: {
    flex: 1,
  },

  aiLimitTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  aiLimitSubtitle: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  aiLimitUpgrade: {
    backgroundColor: ResponsiveTheme.colors.warning,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  aiLimitUpgradeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  aiLimitProgress: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  aiLimitProgressBar: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    overflow: 'hidden',
  },

  aiLimitProgressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.warning,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  // Health Settings Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  modalCloseButton: {
    padding: ResponsiveTheme.spacing.sm,
  },

  modalCloseText: {
    fontSize: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
  },

  modalContent: {
    flex: 1,
    padding: ResponsiveTheme.spacing.lg,
  },

  healthSettingCard: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  healthSettingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  healthSettingIcon: {
    fontSize: rf(32),
    marginRight: ResponsiveTheme.spacing.md,
  },

  healthSettingInfo: {
    flex: 1,
  },

  healthSettingTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  healthSettingDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  healthSettingActions: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  syncButton: {
    flex: 1,
  },

  healthStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  healthStatusLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  healthStatusValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  healthDataPreview: {
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    paddingTop: ResponsiveTheme.spacing.md,
  },

  healthDataTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  healthDataGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },

  healthDataItem: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    alignItems: 'center',
  },

  healthDataLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  healthDataValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  modalFooter: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: ResponsiveTheme.spacing.lg,
    lineHeight: rf(16),
  },

  // Migration Information Card Styles
  migrationInfoCard: {
    marginTop: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderColor: ResponsiveTheme.colors.primary + '30',
  },

  migrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  migrationIcon: {
    fontSize: ResponsiveTheme.fontSize.xl,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  migrationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  migrationContent: {
    gap: ResponsiveTheme.spacing.sm,
  },

  migrationDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  migrationBenefits: {
    gap: ResponsiveTheme.spacing.xs,
  },

  migrationBenefit: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(18),
  },

  migrationNote: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: ResponsiveTheme.spacing.sm,
    lineHeight: rf(16),
  },

  // Personal Training CTA Styles
  personalTrainingCard: {
    alignItems: 'center',
  },

  ptIconGrid: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  ptIconRow: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  ptIcon: {
    fontSize: rf(32),
  },

  ptTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: 'center',
  },

  ptCaption: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.lg,
    textAlign: 'center',
  },

  ptBookButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
    width: '100%',
  },

  ptBookButtonGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ptBookButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    letterSpacing: 1,
  },
});
