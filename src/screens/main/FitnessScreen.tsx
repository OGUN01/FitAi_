import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/responsiveTheme';
import { Button, THEME } from '../../components/ui';
import { WeeklyCalendar } from '../../components/fitness/WeeklyCalendar';
import { DayWorkoutView } from '../../components/fitness/DayWorkoutView';
import { aiService } from '../../ai';
import { useUserStore } from '../../stores/userStore';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useAuth } from '../../hooks/useAuth';
import { useFitnessData } from '../../hooks/useFitnessData';
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

  // Hooks
  const { user, isAuthenticated } = useAuth();
  const { profile } = useUserStore();
  const { createWorkout, startWorkoutSession } = useFitnessData();
  
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
    
    const workoutData: Record<string, { hasWorkout: boolean; isCompleted: boolean; isRestDay: boolean }> = {};
    
    // Initialize all days as rest days
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    allDays.forEach(day => {
      workoutData[day] = { hasWorkout: false, isCompleted: false, isRestDay: true };
    });

    // Mark workout days
    weeklyPlan.workouts.forEach(workout => {
      const progress = getWorkoutProgress(workout.id);
      workoutData[workout.dayOfWeek] = {
        hasWorkout: true,
        isCompleted: progress?.progress === 100,
        isRestDay: false
      };
    });

    // Mark actual rest days
    weeklyPlan.restDays.forEach(day => {
      workoutData[day] = { hasWorkout: false, isCompleted: false, isRestDay: true };
    });

    return workoutData;
  };

  // Get workouts for selected day
  const getWorkoutsForDay = (day: string): DayWorkout[] => {
    if (!weeklyPlan) return [];
    return weeklyPlan.workouts.filter(workout => workout.dayOfWeek === day);
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

        // Save to store and database
        await saveWeeklyWorkoutPlan(response.data);
        setForceUpdate(prev => prev + 1); // Force re-render
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
        const planDuration = experienceLevel === 'beginner' ? '1 week' : 
                           experienceLevel === 'intermediate' ? '1.5 weeks' : '2 weeks';

        Alert.alert(
          '🎉 Weekly Plan Generated!',
          `Your personalized ${planDuration} workout plan "${response.data.planTitle}" is ready! ${response.data.workouts.length} workouts scheduled across the week.`,
          [{ text: 'Let\'s Start!' }]
        );
      } else {
        Alert.alert('Generation Failed', response.error || 'Failed to generate weekly workout plan');
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
      // Start workout session using store
      const sessionId = await startStoreWorkoutSession(workout);
      console.log('Starting workout session:', sessionId);

      // Also start legacy workout session for compatibility
      const workoutData = {
        name: workout.title,
        type: workout.category,
        exercises: workout.exercises.map(exercise => ({
          exercise_id: exercise.exerciseId,
          sets: exercise.sets,
          reps: typeof exercise.reps === 'string' ? exercise.reps : exercise.reps.toString(),
          weight: exercise.weight || 0,
          rest_seconds: exercise.restTime
        }))
      };
      await startWorkoutSession(workoutData);

      Alert.alert(
        '🎯 Workout Started!',
        `Starting "${workout.title}". Ready to begin your workout session?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Begin Workout',
            onPress: () => {
              // Navigate to workout session screen
              navigation.navigate('WorkoutSession', { workout, sessionId });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error starting workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
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
          title={isGeneratingPlan ? "Generating..." : "Generate Plan"}
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
          <Text style={styles.loadingText}>
            Creating your personalized weekly plan...
          </Text>
        </View>
      )}

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
              Generate your personalized weekly workout plan to get started with day-by-day fitness guidance.
            </Text>
            {profile?.fitnessGoals && (
              <Text style={styles.emptyStateInfo}>
                Based on your {profile.fitnessGoals.experience_level} level, you'll get:
                {'\n'}• {profile.fitnessGoals.experience_level === 'beginner' ? '3 workouts over 1 week' :
                    profile.fitnessGoals.experience_level === 'intermediate' ? '5 workouts over 1.5 weeks' :
                    '6 workouts over 2 weeks'}
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

      {/* Plan Summary */}
      {weeklyPlan && (
        <View style={styles.planSummary}>
          <Text style={styles.planTitle}>{weeklyPlan.planTitle}</Text>
          <Text style={styles.planDescription}>{weeklyPlan.planDescription}</Text>
          <View style={styles.planStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyPlan.workouts.length}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(weeklyPlan.totalEstimatedCalories)}
              </Text>
              <Text style={styles.statLabel}>Total Calories</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyPlan.restDays.length}</Text>
              <Text style={styles.statLabel}>Rest Days</Text>
            </View>
          </View>
        </View>
      )}
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
  
  planSummary: {
    backgroundColor: ResponsiveTheme.colors.surface,
    padding: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  
  planTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  
  planDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
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