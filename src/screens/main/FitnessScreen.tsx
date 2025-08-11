import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, THEME } from '../../components/ui';
import { CustomDialog, WorkoutStartDialog } from '../../components/ui/CustomDialog';
import { WeeklyCalendar } from '../../components/fitness/WeeklyCalendar';
import { DayWorkoutView } from '../../components/fitness/DayWorkoutView';
import { aiService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useAuth } from '../../hooks/useAuth';
import { useFitnessData } from '../../hooks/useFitnessData';
import Constants from 'expo-constants';

// Simple Expo Go detection and safe loading
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient' ||
  (__DEV__ && !Constants.isDevice && Constants.platform?.web !== true);

let useWorkoutReminders: any = null;
if (!isExpoGo) {
  try {
    const notificationStore = require('../../stores/notificationStore');
    useWorkoutReminders = notificationStore.useWorkoutReminders;
  } catch (error) {
    console.warn('Failed to load workout reminders:', error);
  }
}
import { DayWorkout, WeeklyWorkoutPlan } from '../../ai/weeklyContentGenerator';

interface FitnessScreenProps {
  navigation: any;
}

export const FitnessScreen: React.FC<FitnessScreenProps> = ({ navigation }) => {
  // State management
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];
    console.log(`🔍 Today is: ${todayName} (day ${today.getDay()})`);
    return todayName;
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [forceUpdate, setForceUpdate] = useState<number>(0); // Force re-render
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showWorkoutStartDialog, setShowWorkoutStartDialog] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(null);
  const [showGenerationSuccessDialog, setShowGenerationSuccessDialog] = useState(false);
  const [generationSuccessData, setGenerationSuccessData] = useState<{
    planTitle: string;
    workoutCount: number;
    duration: string;
  } | null>(null);

  // Hooks
  const { user, isAuthenticated } = useAuth();
  const { profile } = useUserStore();
  const { createWorkout, startWorkoutSession } = useFitnessData();
  const workoutReminders = useWorkoutReminders ? useWorkoutReminders() : null;

  // Fitness store
  const {
    weeklyWorkoutPlan: weeklyPlan,
    isGeneratingPlan,
    workoutProgress,
    setWeeklyWorkoutPlan,
    saveWeeklyWorkoutPlan,
    loadWeeklyWorkoutPlan,
    setGeneratingPlan,
    updateWorkoutProgress,
    completeWorkout,
    getWorkoutProgress,
    startWorkoutSession: startStoreWorkoutSession,
    loadData: loadFitnessData,
  } = useFitnessStore();

  // Load existing workout data on mount
  useEffect(() => {
    loadFitnessData();
  }, []);

  // Animation when changing days
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedDay]);

  // Generate workout data for calendar
  const getWorkoutData = () => {
    if (!weeklyPlan) return {};

    const workoutData: Record<
      string,
      { hasWorkout: boolean; isCompleted: boolean; isRestDay: boolean }
    > = {};

    // Initialize all days as rest days
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    allDays.forEach((day) => {
      workoutData[day] = { hasWorkout: false, isCompleted: false, isRestDay: true };
    });

    // Mark workout days
    weeklyPlan.workouts.forEach((workout) => {
      const progress = getWorkoutProgress(workout.id);
      workoutData[workout.dayOfWeek] = {
        hasWorkout: true,
        isCompleted: progress?.progress === 100,
        isRestDay: false,
      };
    });

    // Mark actual rest days
    weeklyPlan.restDays.forEach((day) => {
      workoutData[day] = { hasWorkout: false, isCompleted: false, isRestDay: true };
    });

    return workoutData;
  };

  // Get workouts for selected day
  const getWorkoutsForDay = (day: string): DayWorkout[] => {
    if (!weeklyPlan) return [];
    return weeklyPlan.workouts.filter((workout) => workout.dayOfWeek === day);
  };

  // Get workout progress for display
  const getDisplayWorkoutProgress = () => {
    const progressMap: Record<string, number> = {};
    Object.entries(workoutProgress).forEach(([workoutId, progress]) => {
      progressMap[workoutId] = progress.progress;
    });
    return progressMap;
  };

  // Check if selected day is a rest day
  const isRestDay = (day: string): boolean => {
    if (!weeklyPlan) return false;
    return weeklyPlan.restDays.includes(day);
  };

  // Schedule workout reminders based on generated plan
  const scheduleWorkoutRemindersFromPlan = async (plan: WeeklyWorkoutPlan) => {
    try {
      if (!workoutReminders?.config?.enabled) {
        console.log('⏰ Workout reminders are disabled, skipping scheduling');
        return;
      }

      // Extract workout times from the plan
      const workoutTimes: string[] = [];

      // Generate default workout times based on plan structure
      const defaultTimes = generateDefaultWorkoutTimes(plan);
      workoutTimes.push(...defaultTimes);

      // Schedule the reminders using the notification service
      if (workoutReminders) {
        await workoutReminders.scheduleFromWorkoutPlan(workoutTimes);
      }

      console.log(
        `✅ Scheduled workout reminders for ${workoutTimes.length} workouts:`,
        workoutTimes
      );
    } catch (error) {
      console.error('❌ Failed to schedule workout reminders:', error);
      // Don't block the main workflow if reminder scheduling fails
    }
  };

  // Generate smart default workout times based on user preferences and workout intensity
  const generateDefaultWorkoutTimes = (plan: WeeklyWorkoutPlan): string[] => {
    if (!plan.workouts) return [];

    const times: string[] = [];
    const dayMapping = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6,
    };

    plan.workouts.forEach((workout) => {
      const dayIndex = dayMapping[workout.dayOfWeek as keyof typeof dayMapping];
      let defaultTime = '18:00'; // Default evening workout

      // Smart time assignment based on workout type and day
      if (dayIndex <= 4) {
        // Weekdays
        if (workout.category === 'cardio' || workout.category === 'hiit') {
          defaultTime = '07:00'; // Morning cardio
        } else if (workout.category === 'strength') {
          defaultTime = '18:30'; // Evening strength
        } else if (workout.category === 'yoga' || workout.category === 'flexibility') {
          defaultTime = '19:30'; // Evening relaxation
        }
      } else {
        // Weekends
        if (workout.category === 'cardio' || workout.category === 'hiit') {
          defaultTime = '09:00'; // Weekend morning
        } else {
          defaultTime = '10:00'; // Weekend mid-morning
        }
      }

      times.push(defaultTime);
    });

    return times;
  };

  // Generate weekly workout plan
  const generateWeeklyWorkoutPlan = async () => {
    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile to generate your personalized weekly workout plan.',
        [{ text: 'OK' }]
      );
      return;
    }

    setGeneratingPlan(true);

    try {
      console.log('🏋️ Generating weekly workout plan...');

      const response = await aiService.generateWeeklyWorkoutPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        1 // Week 1
      );

      if (response.success && response.data) {
        console.log(`✅ Generated weekly plan: ${response.data.planTitle}`);
        console.log(`🔍 Weekly plan data:`, JSON.stringify(response.data, null, 2));
        console.log(`🔍 Workouts count: ${response.data.workouts?.length || 0}`);
        console.log(`🔍 Rest days: ${response.data.restDays?.join(', ') || 'none'}`);

        // 🔍 Debug: Check data structure before saving
        console.log('🔍 Debug - Data structure validation:');
        console.log('  - planTitle:', response.data.planTitle ? '✅' : '❌');
        console.log('  - workouts array:', Array.isArray(response.data.workouts) ? '✅' : '❌');
        console.log('  - workouts length:', response.data.workouts?.length || 0);
        console.log('  - first workout:', response.data.workouts?.[0] ? '✅' : '❌');
        if (response.data.workouts?.[0]) {
          console.log('  - first workout dayOfWeek:', response.data.workouts[0].dayOfWeek);
          console.log(
            '  - first workout exercises:',
            response.data.workouts[0].exercises?.length || 0
          );
        }

        // ✅ CRITICAL FIX: Set state immediately and verify it takes effect
        console.log('🔍 Debug - Setting workout plan state immediately...');
        setWeeklyWorkoutPlan(response.data);

        // Force immediate re-render to ensure UI updates
        setForceUpdate((prev) => prev + 1);

        // Verify state was set correctly
        console.log('🔍 Debug - State set, verifying...', {
          planTitle: response.data.planTitle,
          workoutsCount: response.data.workouts?.length,
          firstWorkout: response.data.workouts?.[0]?.title,
        });

        // Save to store and database (async, don't block UI)
        console.log('🔍 Debug - Saving to store/database...');
        try {
          await saveWeeklyWorkoutPlan(response.data);
          console.log('✅ Debug - Save completed successfully');

          // Schedule workout reminders automatically
          await scheduleWorkoutRemindersFromPlan(response.data);
        } catch (saveError) {
          console.error('❌ Debug - Save failed (but UI state is set):', saveError);
        }

        // Final verification with timeout to check React state update
        setTimeout(() => {
          const currentState = useFitnessStore.getState().weeklyWorkoutPlan;
          console.log('🔍 Final State Check:', {
            reactState: weeklyPlan ? 'Present' : 'Null',
            zustandState: currentState ? 'Present' : 'Null',
            workoutsInState: weeklyPlan?.workouts?.length || 0,
          });
        }, 200);

        console.log(`🔍 Workout plan saved to store and database`);

        // Also save individual workouts to legacy system for compatibility
        if (user?.id) {
          for (const workout of response.data.workouts) {
            await createWorkout({
              name: workout.title,
              type: workout.category,
              duration_minutes: workout.duration,
              calories_burned: workout.estimatedCalories,
              notes: `${workout.dayOfWeek} - ${workout.description}`,
            });
          }
        }

        const experienceLevel = profile.fitnessGoals.experience_level;
        const planDuration =
          experienceLevel === 'beginner'
            ? '1 week'
            : experienceLevel === 'intermediate'
              ? '1.5 weeks'
              : '2 weeks';

        Alert.alert(
          '🎉 Weekly Plan Generated!',
          `Your personalized ${planDuration} workout plan "${response.data.planTitle}" is ready! ${response.data.workouts.length} workouts scheduled across the week.`,
          [{ text: "Let's Start!" }]
        );
      } else {
        Alert.alert(
          'Generation Failed',
          response.error || 'Failed to generate weekly workout plan'
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', errorMessage);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Handle starting a workout
  const handleStartWorkout = async (workout: DayWorkout) => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please sign in to start workouts.');
      return;
    }

    try {
      // Debug: Log the incoming workout data
      console.log('🧭 Setting workout session:', {
        workoutTitle: workout.title,
        exerciseCount: workout.exercises?.length || 0,
        sessionId: 'pending...',
      });

      // Start workout session using store
      const sessionId = await startStoreWorkoutSession(workout);
      console.log('Starting workout session:', sessionId);

      // Also start legacy workout session for compatibility
      const workoutData = {
        name: workout.title,
        type: workout.category,
        exercises: workout.exercises.map((exercise) => ({
          exercise_id: exercise.exerciseId,
          sets: exercise.sets,
          reps: typeof exercise.reps === 'string' ? exercise.reps : exercise.reps.toString(),
          weight: exercise.weight || 0,
          rest_seconds: exercise.restTime,
        })),
      };
      await startWorkoutSession(workoutData);

      // Show custom dialog instead of Alert
      const workoutWithSession = { ...workout, sessionId };
      console.log('🧭 Setting workout session:', {
        sessionId,
        workout: workout.title,
        exercises: workout.exercises?.length || 0,
        firstExercise: workout.exercises?.[0] || 'No exercises',
      });

      // Debug: Log full workout object
      console.log('📋 Full workout object:', JSON.stringify(workoutWithSession, null, 2));

      setSelectedWorkout(workoutWithSession);
      setShowWorkoutStartDialog(true);
    } catch (error) {
      console.error('Error starting workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  };

  // Handle workout start confirmation
  const handleWorkoutStartConfirm = () => {
    if (selectedWorkout) {
      setShowWorkoutStartDialog(false);

      // Debug: Log the workout data being passed
      console.log('🧭 NAVIGATION: Navigating to WorkoutSession', {
        params: {
          workout: selectedWorkout,
          sessionId: (selectedWorkout as any).sessionId,
          exerciseCount: selectedWorkout.exercises?.length || 0,
          hasExercises: !!selectedWorkout.exercises,
        },
      });

      // Log the exercises array for debugging
      if (selectedWorkout.exercises) {
        console.log('📋 Exercises being passed:', selectedWorkout.exercises);
      } else {
        console.error('❌ No exercises in selectedWorkout!');
      }

      // Ensure exercises are included in the workout object
      const workoutWithExercises = {
        ...selectedWorkout,
        exercises: selectedWorkout.exercises || [],
      };

      navigation.navigate('WorkoutSession', {
        workout: workoutWithExercises,
        sessionId: (selectedWorkout as any).sessionId,
      });
    }
  };

  // Handle workout start cancel
  const handleWorkoutStartCancel = () => {
    setShowWorkoutStartDialog(false);
    setSelectedWorkout(null);
  };

  // Handle viewing workout details
  const handleViewWorkoutDetails = (workout: DayWorkout) => {
    Alert.alert(
      workout.title,
      `${workout.description}\n\nDuration: ${workout.duration} min\nCalories: ${workout.estimatedCalories}\nExercises: ${workout.exercises.length}\n\nTarget: ${workout.targetMuscleGroups.join(', ')}`,
      [{ text: 'OK' }]
    );
  };

  // Handle refreshing data
  const handleRefresh = async () => {
    // Refresh weekly plan if needed
    if (weeklyPlan) {
      console.log('Refreshing workout data...');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Fitness Plan</Text>
        <Button
          title={isGeneratingPlan ? 'Generating...' : 'Generate Plan'}
          onPress={generateWeeklyWorkoutPlan}
          variant="primary"
          size="sm"
          disabled={isGeneratingPlan}
          style={styles.generateButton}
        />
      </View>

      {/* Loading State */}
      {isGeneratingPlan && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
          <Text style={styles.loadingText}>Creating your personalized weekly plan...</Text>
        </View>
      )}

      {/* Debug: Track UI rendering state with detailed info */}
      {(() => {
        const hasValidPlan = weeklyPlan && weeklyPlan.workouts && weeklyPlan.workouts.length > 0;
        if (!hasValidPlan) {
          console.log('🔍 UI Render: No valid workout plan detected', {
            weeklyPlan: weeklyPlan ? 'exists' : 'null',
            workouts: weeklyPlan?.workouts
              ? `array with ${weeklyPlan.workouts.length} items`
              : 'missing',
            forceUpdateCount: forceUpdate,
          });
        } else {
          console.log('✅ UI Render: Valid workout plan detected', {
            planTitle: weeklyPlan.planTitle,
            workoutCount: weeklyPlan.workouts.length,
            forceUpdateCount: forceUpdate,
          });
        }
        return null;
      })()}

      {/* Weekly Calendar */}
      {weeklyPlan && weeklyPlan.workouts && weeklyPlan.workouts.length > 0 && (
        <WeeklyCalendar
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
          weekOffset={weekOffset}
          onWeekChange={setWeekOffset}
          workoutData={getWorkoutData()}
        />
      )}

      {/* Day Workout View */}
      <Animated.View style={[styles.dayViewContainer, { opacity: fadeAnim }]}>
        {weeklyPlan && weeklyPlan.workouts ? (
          <DayWorkoutView
            selectedDay={selectedDay}
            workouts={getWorkoutsForDay(selectedDay)}
            isLoading={isGeneratingPlan}
            onRefresh={handleRefresh}
            onStartWorkout={handleStartWorkout}
            onViewWorkoutDetails={handleViewWorkoutDetails}
            onGenerateWorkout={generateWeeklyWorkoutPlan}
            isRestDay={isRestDay(selectedDay)}
            workoutProgress={getDisplayWorkoutProgress()}
          />
        ) : (
          // Empty state when no plan exists
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📅</Text>
            <Text style={styles.emptyStateTitle}>No Weekly Plan</Text>
            <Text style={styles.emptyStateSubtitle}>
              Generate your personalized weekly workout plan to get started with day-by-day fitness
              guidance.
            </Text>
            {profile?.fitnessGoals && (
              <Text style={styles.emptyStateInfo}>
                Based on your {profile.fitnessGoals.experience_level} level, you'll get:
                {'\n'}•{' '}
                {profile.fitnessGoals.experience_level === 'beginner'
                  ? '3 workouts over 1 week'
                  : profile.fitnessGoals.experience_level === 'intermediate'
                    ? '5 workouts over 1.5 weeks'
                    : '6 workouts over 2 weeks'}
                {'\n'}• Workouts tailored to: {profile.fitnessGoals.primaryGoals.join(', ')}
              </Text>
            )}
            <Button
              title="Generate Your Weekly Plan"
              onPress={generateWeeklyWorkoutPlan}
              variant="primary"
              style={styles.emptyStateButton}
              disabled={isGeneratingPlan}
            />
          </View>
        )}
      </Animated.View>

      {/* Compact Plan Summary */}
      {weeklyPlan && (
        <View style={styles.compactPlanSummary}>
          <View style={styles.planHeader}>
            <View style={styles.planTitleContainer}>
              <Text style={styles.planTitle} numberOfLines={1}>
                {weeklyPlan.planTitle}
              </Text>
              <Text style={styles.planDescription} numberOfLines={1}>
                {weeklyPlan.planDescription}
              </Text>
            </View>
          </View>

          <View style={styles.horizontalStats}>
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatValue}>{weeklyPlan.workouts.length}</Text>
              <Text style={styles.compactStatLabel}>Workouts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatValue}>
                {Math.round(weeklyPlan.totalEstimatedCalories)}
              </Text>
              <Text style={styles.compactStatLabel}>Total Calories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatValue}>{weeklyPlan.restDays.length}</Text>
              <Text style={styles.compactStatLabel}>Rest Days</Text>
            </View>
          </View>
        </View>
      )}

      {/* Custom Dialogs */}
      <WorkoutStartDialog
        visible={showWorkoutStartDialog}
        workoutTitle={selectedWorkout?.title || ''}
        onCancel={handleWorkoutStartCancel}
        onConfirm={handleWorkoutStartConfirm}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  generateButton: {
    minWidth: rw(120),
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  loadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.md,
    textAlign: 'center',
  },

  dayViewContainer: {
    flex: 1,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.xl,
  },

  emptyStateEmoji: {
    fontSize: rf(64),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  emptyStateTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  emptyStateSubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(22),
  },

  emptyStateInfo: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xl,
    lineHeight: rf(20),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  emptyStateButton: {
    minWidth: rw(200),
  },

  // Compact Plan Summary Styles
  compactPlanSummary: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  planHeader: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  planTitleContainer: {
    flex: 1,
  },

  planTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  planDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  horizontalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: ResponsiveTheme.spacing.sm,
  },

  compactStatItem: {
    alignItems: 'center',
    flex: 1,
  },

  compactStatValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs / 2,
  },

  compactStatLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: ResponsiveTheme.colors.border,
    marginHorizontal: ResponsiveTheme.spacing.sm,
  },

  // Legacy styles (keeping for compatibility)
  planSummary: {
    backgroundColor: ResponsiveTheme.colors.surface,
    padding: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
