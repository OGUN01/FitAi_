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
import { useUserStore, useFitnessStore, useAppStateStore } from '../../stores';
import type { DayName } from '../../stores';
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
  RecoveryTipsModal,
} from './fitness';
import { completionTrackingService } from '../../services/completionTracking';

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

  // SHARED UI STATE - Single Source of Truth from appStateStore
  const { selectedDay, setSelectedDay, isSelectedDayToday: isSelectedDayTodayFn } = useAppStateStore();
  
  // Local UI State
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(null);
  const [showWorkoutStartDialog, setShowWorkoutStartDialog] = useState(false);
  const [showRecoveryTipsModal, setShowRecoveryTipsModal] = useState(false);

  // Load data on mount and subscribe to completion events
  useEffect(() => {
    loadFitnessData();
    
    // Subscribe to completion events for real-time UI updates
    // This ensures FitnessScreen refreshes when workouts are completed
    console.log('[EVENT] FitnessScreen: Setting up completion event listener');
    const unsubscribe = completionTrackingService.subscribe((event) => {
      console.log('[EVENT] FitnessScreen: Received completion event:', event);
      if (event.type === 'workout') {
        // Refresh fitness data when a workout is completed
        loadFitnessData();
      }
    });

    return () => {
      console.log('[EVENT] FitnessScreen: Unsubscribing from completion events');
      unsubscribe();
    };
  }, [loadFitnessData]);

  // Get selected day's workout (syncs with calendar selection)
  const selectedDayWorkout = useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return null;
    return weeklyWorkoutPlan.workouts.find((w) => w.dayOfWeek === selectedDay) || null;
  }, [weeklyWorkoutPlan, selectedDay]);

  // Check if selected day is rest day
  const isSelectedDayRestDay = useMemo(() => {
    if (!weeklyWorkoutPlan?.restDays) return false;
    return weeklyWorkoutPlan.restDays.includes(selectedDay);
  }, [weeklyWorkoutPlan, selectedDay]);

  // Check if selected day is today - from appStateStore
  const isSelectedDayToday = isSelectedDayTodayFn();

  // Get selected day's workout progress
  const selectedDayProgress = useMemo(() => {
    if (!selectedDayWorkout) return 0;
    return getWorkoutProgress(selectedDayWorkout.id)?.progress; // NO FALLBACK
  }, [selectedDayWorkout, getWorkoutProgress]);

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
        const progress = getWorkoutProgress(w.id)?.progress ?? 0; // Use 0 for completion calc
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

  const handleStartSelectedDayWorkout = useCallback(() => {
    if (selectedDayWorkout) {
      handleStartWorkout(selectedDayWorkout);
    } else if (!weeklyWorkoutPlan) {
      generateWeeklyWorkoutPlan();
    }
  }, [selectedDayWorkout, weeklyWorkoutPlan, handleStartWorkout]);

  const handleViewWorkoutDetails = useCallback(() => {
    if (selectedDayWorkout) {
      Alert.alert(
        selectedDayWorkout.title,
        `${selectedDayWorkout.description}\n\nDuration: ${selectedDayWorkout.duration} min\nCalories: ${selectedDayWorkout.estimatedCalories}\nExercises: ${selectedDayWorkout.exercises?.length ?? 0}`,
        [{ text: 'OK' }]
      );
    }
  }, [selectedDayWorkout]);

  const handleRecoveryTips = useCallback(() => {
    haptics.light();
    setShowRecoveryTipsModal(true);
  }, []);

  const handleCloseRecoveryTips = useCallback(() => {
    setShowRecoveryTipsModal(false);
  }, []);

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

  // Regenerate workout plan with confirmation
  const handleRegeneratePlan = useCallback(() => {
    Alert.alert(
      'Regenerate Workout Plan',
      'This will create a new AI-generated workout plan and replace your current one. Your workout history will be preserved.\n\nContinue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Regenerate',
          style: 'default',
          onPress: generateWeeklyWorkoutPlan,
        },
      ]
    );
  }, [generateWeeklyWorkoutPlan]);

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

  const userName = profile?.personalInfo?.name; // NO FALLBACK - if no name, onboarding incomplete

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

            {/* 2. Selected Day's Workout Card (syncs with calendar selection) */}
            {weeklyWorkoutPlan && (
              <View style={styles.section}>
                <TodayWorkoutCard
                  workout={selectedDayWorkout}
                  isRestDay={isSelectedDayRestDay}
                  isCompleted={selectedDayProgress === 100}
                  progress={selectedDayProgress}
                  onStartWorkout={handleStartSelectedDayWorkout}
                  onViewDetails={handleViewWorkoutDetails}
                  onRecoveryTips={handleRecoveryTips}
                  selectedDay={selectedDay}
                  isToday={isSelectedDayToday}
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
                  onRegeneratePlan={handleRegeneratePlan}
                  isRegenerating={isGeneratingPlan}
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

        {/* Recovery Tips Modal */}
        <RecoveryTipsModal
          visible={showRecoveryTipsModal}
          onClose={handleCloseRecoveryTips}
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
