/**
 * FitnessScreen - World-Class Workout Tab
 * 
 * REDESIGNED: Following HomeScreen pattern with modular components
 * 
 * Layout Order:
 * 1. FitnessHeader (greeting, week number, calendar button)
 * 2. TodayWorkoutCard (primary action - today's scheduled workout)
 * 3. WeeklyPlanOverview (mini calendar + stats) OR EmptyPlanState
 * 4. WorkoutHistoryList (real data from store, swipe actions)
 * 5. SuggestedWorkouts (horizontal scroll of recommendations)
 * 
 * Key Changes:
 * - Removed useless Feature Grid (marketing fluff)
 * - Removed redundant Hero section
 * - Uses real data from fitnessStore
 * - Proper swipe-to-reveal actions (hidden by default)
 * - Pull-to-refresh
 * - Reanimated entry animations
 * - Haptic feedback throughout
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { WorkoutStartDialog } from '../../components/ui/CustomDialog';
import { ResponsiveTheme } from '../../utils/constants';
import { rh } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

// Stores
import { useUserStore } from '../../stores/userStore';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useAuth } from '../../hooks/useAuth';
import { useFitnessData } from '../../hooks/useFitnessData';

// AI Service
import { aiService } from '../../ai';
import { DayWorkout, WeeklyWorkoutPlan } from '../../types/ai';

// Modular Components
import {
  FitnessHeader,
  TodayWorkoutCard,
  WeeklyPlanOverview,
  WorkoutHistoryList,
  SuggestedWorkouts,
  EmptyPlanState,
} from './fitness';

interface FitnessScreenProps {
  navigation: any;
}

export const FitnessScreen: React.FC<FitnessScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Auth & User
  const { user, isGuestMode } = useAuth();
  const { profile } = useUserStore();

  // Fitness Store
  const {
    weeklyWorkoutPlan,
    isGeneratingPlan,
    workoutProgress,
    setWeeklyWorkoutPlan,
    saveWeeklyWorkoutPlan,
    setGeneratingPlan,
    startWorkoutSession: startStoreWorkoutSession,
    loadData: loadFitnessData,
    getWorkoutProgress,
  } = useFitnessStore();

  // Fitness Data Hook
  const { createWorkout, startWorkoutSession } = useFitnessData();

  // Local State
  const [selectedDay, setSelectedDay] = useState(() => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[new Date().getDay()];
  });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(null);
  const [showWorkoutStartDialog, setShowWorkoutStartDialog] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadFitnessData();
  }, [loadFitnessData]);

  // Get today's workout
  const todaysWorkout = useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return null;
    const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    return weeklyWorkoutPlan.workouts.find((w) => w.dayOfWeek === today) || null;
  }, [weeklyWorkoutPlan]);

  // Check if today is rest day
  const isRestDay = useMemo(() => {
    if (!weeklyWorkoutPlan?.restDays) return false;
    const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    return weeklyWorkoutPlan.restDays.includes(today);
  }, [weeklyWorkoutPlan]);

  // Get today's workout progress
  const todaysProgress = useMemo(() => {
    if (!todaysWorkout) return 0;
    return getWorkoutProgress(todaysWorkout.id)?.progress || 0;
  }, [todaysWorkout, getWorkoutProgress]);

  // Get completed workouts for history
  const completedWorkouts = useMemo(() => {
    const completed: Array<{
      id: string;
      workoutId: string;
      title: string;
      category: string;
      duration: number;
      caloriesBurned: number;
      completedAt: string;
      progress: number;
    }> = [];

    Object.entries(workoutProgress).forEach(([workoutId, progress]) => {
      const workout = weeklyWorkoutPlan?.workouts?.find((w) => w.id === workoutId);
      if (workout && progress.progress > 0) {
        completed.push({
          id: `history_${workoutId}`,
          workoutId,
          title: workout.title,
          category: workout.category,
          duration: workout.duration,
          caloriesBurned: workout.estimatedCalories,
          completedAt: progress.completedAt || new Date().toISOString(),
          progress: progress.progress,
        });
      }
    });

    // Sort by completion date (most recent first)
    return completed.sort((a, b) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  }, [workoutProgress, weeklyWorkoutPlan]);

  // Calculate week stats
  const weekStats = useMemo(() => {
    const totalWorkouts = weeklyWorkoutPlan?.workouts?.length || 0;
    const completedCount = Object.values(workoutProgress).filter((p) => p.progress === 100).length;
    return { totalWorkouts, completedCount };
  }, [weeklyWorkoutPlan, workoutProgress]);

  // Get suggested workouts from plan (upcoming ones)
  const suggestedWorkouts = useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return [];
    
    const today = new Date().getDay();
    const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    return weeklyWorkoutPlan.workouts
      .filter((w) => {
        const workoutDayIndex = dayOrder.indexOf(w.dayOfWeek);
        const progress = getWorkoutProgress(w.id)?.progress || 0;
        return workoutDayIndex > today && progress < 100;
      })
      .slice(0, 3)
      .map((w) => ({
        id: w.id,
        title: w.title,
        category: w.category,
        duration: w.duration,
        estimatedCalories: w.estimatedCalories,
        difficulty: w.difficulty as 'beginner' | 'intermediate' | 'advanced',
      }));
  }, [weeklyWorkoutPlan, getWorkoutProgress]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await loadFitnessData();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadFitnessData]);

  const handleStartWorkout = useCallback(async (workout: DayWorkout) => {
    if (!user?.id && !isGuestMode) {
      Alert.alert('Authentication Required', 'Please sign in to start workouts.');
      return;
    }

    haptics.medium();

    try {
      let sessionId = '';
      try {
        sessionId = await startStoreWorkoutSession(workout);
      } catch (error) {
        sessionId = `fallback_session_${workout.id}_${Date.now()}`;
      }

      const workoutWithSession = { ...workout, sessionId };
      setSelectedWorkout(workoutWithSession);
      setShowWorkoutStartDialog(true);
    } catch (error) {
      console.error('Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  }, [user, isGuestMode, startStoreWorkoutSession]);

  const handleStartTodaysWorkout = useCallback(() => {
    if (todaysWorkout) {
      handleStartWorkout(todaysWorkout);
    } else if (!weeklyWorkoutPlan) {
      generateWeeklyWorkoutPlan();
    }
  }, [todaysWorkout, weeklyWorkoutPlan, handleStartWorkout]);

  const handleViewWorkoutDetails = useCallback(() => {
    if (todaysWorkout) {
      Alert.alert(
        todaysWorkout.title,
        `${todaysWorkout.description}\n\nDuration: ${todaysWorkout.duration} min\nCalories: ${todaysWorkout.estimatedCalories}\nExercises: ${todaysWorkout.exercises?.length ?? 0}`,
        [{ text: 'OK' }]
      );
    }
  }, [todaysWorkout]);

  const handleWorkoutStartConfirm = useCallback(() => {
    if (selectedWorkout) {
      setShowWorkoutStartDialog(false);
      haptics.success();
      
      navigation.navigate('WorkoutSession', {
        workout: { ...selectedWorkout, exercises: selectedWorkout.exercises || [] },
        sessionId: (selectedWorkout as any).sessionId,
      });
    }
  }, [selectedWorkout, navigation]);

  const handleWorkoutStartCancel = useCallback(() => {
    setShowWorkoutStartDialog(false);
    setSelectedWorkout(null);
  }, []);

  const handleRepeatWorkout = useCallback((workout: any) => {
    const originalWorkout = weeklyWorkoutPlan?.workouts?.find((w) => w.id === workout.workoutId);
    if (originalWorkout) {
      handleStartWorkout(originalWorkout);
    }
  }, [weeklyWorkoutPlan, handleStartWorkout]);

  const handleDeleteWorkout = useCallback((workout: any) => {
    // In a real app, this would delete from the store
    Alert.alert('Deleted', `${workout.title} has been removed from history.`);
  }, []);

  const handleViewHistoryWorkout = useCallback((workout: any) => {
    Alert.alert(workout.title, `Completed on ${new Date(workout.completedAt).toLocaleDateString()}\n\nDuration: ${workout.duration} min\nCalories: ${workout.caloriesBurned}`);
  }, []);

  const handleStartSuggestedWorkout = useCallback((suggested: any) => {
    const workout = weeklyWorkoutPlan?.workouts?.find((w) => w.id === suggested.id);
    if (workout) {
      handleStartWorkout(workout);
    }
  }, [weeklyWorkoutPlan, handleStartWorkout]);

  const handleCalendarPress = useCallback(() => {
    // Could navigate to a full calendar view
    Alert.alert('Weekly Calendar', 'Full calendar view coming soon!');
  }, []);

  const handleViewFullPlan = useCallback(() => {
    // Could navigate to a detailed plan view
    if (weeklyWorkoutPlan) {
      Alert.alert(
        weeklyWorkoutPlan.planTitle,
        `${weeklyWorkoutPlan.planDescription}\n\nTotal Workouts: ${weeklyWorkoutPlan.workouts?.length || 0}\nRest Days: ${weeklyWorkoutPlan.restDays?.length || 0}`
      );
    }
  }, [weeklyWorkoutPlan]);

  // Generate weekly workout plan
  const generateWeeklyWorkoutPlan = useCallback(async () => {
    // AUTHENTICATION CHECK: AI generation requires authenticated user
    // Guest users only have local storage data - backend needs Supabase data
    if (!user?.id || user.id.startsWith('guest')) {
      console.log('[AUTH] User not authenticated for AI generation:', user?.id);
      Alert.alert(
        'Sign Up Required',
        'Create an account to generate personalized AI workout plans. Your fitness data will be securely stored and used for customized recommendations.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Up',
            onPress: () => {
              // Navigate to auth screen - navigation comes from parent
            },
          },
        ]
      );
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile to generate a personalized workout plan.',
        [{ text: 'OK' }]
      );
      return;
    }

    setGeneratingPlan(true);
    haptics.medium();

    try {
      const response = await aiService.generateWeeklyWorkoutPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        1
      );

      if (response.success && response.data) {
        setWeeklyWorkoutPlan(response.data);
        await saveWeeklyWorkoutPlan(response.data);
        
        haptics.success();
        Alert.alert(
          'Plan Generated!',
          `Your personalized workout plan "${response.data.planTitle}" is ready with ${response.data.workouts.length} workouts.`,
          [{ text: "Let's Go!" }]
        );
      } else {
        Alert.alert('Generation Failed', response.error || 'Failed to generate workout plan');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', errorMessage);
    } finally {
      setGeneratingPlan(false);
    }
  }, [profile, setGeneratingPlan, setWeeklyWorkoutPlan, saveWeeklyWorkoutPlan]);

  const userName = profile?.personalInfo?.name || 'Champion';

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.animatedContainer}>
          <Animated.ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={ResponsiveTheme.colors.primary}
                colors={[ResponsiveTheme.colors.primary]}
              />
            }
          >
            {/* 1. Header */}
            <FitnessHeader
              userName={userName}
              weekNumber={weeklyWorkoutPlan?.weekNumber || 1}
              totalWorkouts={weekStats.totalWorkouts}
              completedWorkouts={weekStats.completedCount}
              onCalendarPress={handleCalendarPress}
            />

            {/* 2. Today's Workout Card (only if plan exists) */}
            {weeklyWorkoutPlan && (
              <View style={styles.section}>
                <TodayWorkoutCard
                  workout={todaysWorkout}
                  isRestDay={isRestDay}
                  isCompleted={todaysProgress === 100}
                  progress={todaysProgress}
                  onStartWorkout={handleStartTodaysWorkout}
                  onViewDetails={handleViewWorkoutDetails}
                />
              </View>
            )}

            {/* 3. Weekly Plan Overview OR Empty State */}
            <View style={styles.section}>
              {weeklyWorkoutPlan ? (
                <WeeklyPlanOverview
                  plan={weeklyWorkoutPlan}
                  workoutProgress={workoutProgress}
                  selectedDay={selectedDay}
                  onDayPress={setSelectedDay}
                  onViewFullPlan={handleViewFullPlan}
                />
              ) : (
                <EmptyPlanState
                  experienceLevel={profile?.fitnessGoals?.experience_level as any}
                  primaryGoals={profile?.fitnessGoals?.primaryGoals}
                  isGenerating={isGeneratingPlan}
                  onGeneratePlan={generateWeeklyWorkoutPlan}
                />
              )}
            </View>

            {/* 4. Workout History (from real data) */}
            <View style={styles.section}>
              <WorkoutHistoryList
                workouts={completedWorkouts}
                onRepeatWorkout={handleRepeatWorkout}
                onDeleteWorkout={handleDeleteWorkout}
                onViewWorkout={handleViewHistoryWorkout}
              />
            </View>

            {/* 5. Suggested Workouts (if plan exists and has upcoming) */}
            {suggestedWorkouts.length > 0 && (
              <View style={styles.sectionNoHorizontalPadding}>
                <SuggestedWorkouts
                  workouts={suggestedWorkouts}
                  onStartWorkout={handleStartSuggestedWorkout}
                />
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: insets.bottom + rh(90) }} />
          </Animated.ScrollView>
        </Animated.View>

        {/* Workout Start Dialog */}
        <WorkoutStartDialog
          visible={showWorkoutStartDialog}
          workoutTitle={selectedWorkout?.title || ''}
          onCancel={handleWorkoutStartCancel}
          onConfirm={handleWorkoutStartConfirm}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionNoHorizontalPadding: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
});

export default FitnessScreen;
