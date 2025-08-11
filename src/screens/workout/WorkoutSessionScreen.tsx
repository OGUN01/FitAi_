import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Platform,
  Vibration,
  Dimensions,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { DayWorkout } from '../../ai/weeklyContentGenerator';
import { WorkoutTimer } from '../../components/fitness/WorkoutTimer';
import { ExerciseGifPlayer } from '../../components/fitness/ExerciseGifPlayer';
import { ExerciseInstructionModal } from '../../components/fitness/ExerciseInstructionModal';
import completionTrackingService from '../../services/completionTracking';

interface WorkoutSessionScreenProps {
  route: {
    params: {
      workout: DayWorkout;
      sessionId?: string;
    };
  };
  navigation: any;
}

interface ExerciseProgress {
  exerciseIndex: number;
  completedSets: boolean[];
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
}

interface WorkoutStats {
  totalDuration: number;
  exercisesCompleted: number;
  setsCompleted: number;
  caloriesBurned: number;
}

// Safe string conversion utility
const safeString = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isNaN(value)) return fallback;
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};
// Parse a duration in seconds from reps like "30 seconds", "45s", "1:00", "1 min"
const parseDurationFromReps = (reps: any): number => {
  if (!reps) return 0;
  const str = String(reps).toLowerCase().trim();
  // mm:ss
  const mmss = str.match(/^(\d+):(\d{1,2})$/);
  if (mmss) {
    const m = parseInt(mmss[1], 10);
    const s = parseInt(mmss[2], 10);
    if (!Number.isNaN(m) && !Number.isNaN(s)) return m * 60 + s;
  }
  // e.g., 30 seconds, 30 sec, 30s
  const sec = str.match(/^(\d+)\s*(seconds|second|secs|sec|s)$/);
  if (sec) {
    const v = parseInt(sec[1], 10);
    return Number.isNaN(v) ? 0 : v;
  }
  // e.g., 1 minute, 2 min, 1m
  const min = str.match(/^(\d+)\s*(minutes|minute|mins|min|m)$/);
  if (min) {
    const v = parseInt(min[1], 10);
    return Number.isNaN(v) ? 0 : v * 60;
  }
  // If it's purely numeric, assume seconds
  const pure = parseInt(str, 10);
  return Number.isNaN(pure) ? 0 : pure;
};

// Safe number utility
const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

export const WorkoutSessionScreen: React.FC<WorkoutSessionScreenProps> = ({
  route,
  navigation,
}) => {
  const { workout, sessionId } = route.params;

  console.log('🏋️ ENHANCED WORKOUT SESSION: Initializing', {
    hasWorkout: !!workout,
    workoutTitle: workout?.title,
    sessionId: sessionId,
    exerciseCount: safeNumber(workout?.exercises?.length, 0)
  });

  // CRITICAL DEBUG: Log the actual exercise structure
  if (workout?.exercises?.length > 0) {
    console.log('🔍 CRITICAL DEBUG - First Exercise Structure:', JSON.stringify(workout.exercises[0], null, 2));
    console.log('🔍 CRITICAL DEBUG - Exercise Keys:', Object.keys(workout.exercises[0] || {}));
    console.log('🔍 CRITICAL DEBUG - Looking for ID in:', {
      exerciseId: workout.exercises[0]?.exerciseId,
      id: workout.exercises[0]?.id,
      exerciseName: workout.exercises[0]?.exerciseName,
      name: workout.exercises[0]?.name
    });
  }

  // Enhanced safety checks
  if (!workout) {
    console.error('🚨 No workout provided');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>No Workout Data</Text>
          <Text style={styles.errorSubtext}>Unable to load workout information</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!workout.exercises || workout.exercises.length === 0) {
    console.error('🚨 No exercises in workout');
    return (
      <SafeAreaView style={styles.container}>

        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🏋️‍♂️</Text>
          <Text style={styles.errorText}>No Exercises Found</Text>
          <Text style={styles.errorSubtext}>This workout appears to be empty</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Enhanced state management
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    workout.exercises.map((exercise, index) => ({
      exerciseIndex: index,
      completedSets: new Array(safeNumber(exercise?.sets, 3)).fill(false),
      isCompleted: false,
    }))
  );
  const [isRestTime, setIsRestTime] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [workoutStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showNextExercisePreview, setShowNextExercisePreview] = useState(false);

  // Memoized calculations for performance
  const currentExercise = useMemo(() => {
    return workout.exercises[currentExerciseIndex] || {};
  }, [workout.exercises, currentExerciseIndex]);

  const currentProgress = useMemo(() => {
    return exerciseProgress[currentExerciseIndex] || { completedSets: [], isCompleted: false };
  }, [exerciseProgress, currentExerciseIndex]);

  const totalExercises = useMemo(() => {
    return safeNumber(workout.exercises?.length, 0);
  }, [workout.exercises]);

  // Exercise timer state
  const [showExerciseTimer, setShowExerciseTimer] = useState(false);
  const derivedExerciseDuration = useMemo(() => {
    const repsDuration = parseDurationFromReps(currentExercise.reps);
    const restSeconds = safeNumber(currentExercise.restTime, 0);
    return repsDuration || restSeconds || 30;
  }, [currentExercise.reps, currentExercise.restTime]);
  const overallProgress = useMemo(() => {
    const completed = exerciseProgress.filter(ep => ep?.isCompleted).length;
    return totalExercises > 0 ? completed / totalExercises : 0;
  }, [exerciseProgress, totalExercises]);

  const workoutStats = useMemo((): WorkoutStats => {
    const duration = Math.round((currentTime.getTime() - workoutStartTime.getTime()) / 60000);
    const exercisesCompleted = exerciseProgress.filter(ep => ep?.isCompleted).length;
    const setsCompleted = exerciseProgress.reduce((total, ep) =>
      total + (ep?.completedSets?.filter(Boolean).length || 0), 0
    );
    const caloriesBurned = Math.round((duration * safeNumber(workout.estimatedCalories, 300)) / 60);

    return {
      totalDuration: Math.max(0, duration),
      exercisesCompleted: Math.max(0, exercisesCompleted),
      setsCompleted: Math.max(0, setsCompleted),
      caloriesBurned: Math.max(0, caloriesBurned)
    };
  }, [currentTime, workoutStartTime, exerciseProgress, workout.estimatedCalories]);

  // Enhanced timer for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [currentExerciseIndex]);

  // Enhanced set completion with haptic feedback
  const handleSetComplete = useCallback(async (setIndex: number) => {
    try {
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }

      const newProgress = [...exerciseProgress];
      if (!newProgress[currentExerciseIndex]) return;

      newProgress[currentExerciseIndex].completedSets[setIndex] =
        !newProgress[currentExerciseIndex].completedSets[setIndex];

      // Check if all sets are completed
      const allSetsCompleted = newProgress[currentExerciseIndex].completedSets.every(Boolean);
      newProgress[currentExerciseIndex].isCompleted = allSetsCompleted;

      // Track completion time
      if (allSetsCompleted && !newProgress[currentExerciseIndex].endTime) {
        newProgress[currentExerciseIndex].endTime = new Date();
      }


      setExerciseProgress(newProgress);

      // Enhanced progress tracking
      const completedExercises = newProgress.filter(ep => ep?.isCompleted).length;
      const progressPercentage = totalExercises > 0 ?
        Math.round((completedExercises / totalExercises) * 100) : 0;

      // Save progress
      await completionTrackingService.updateWorkoutProgress(
        workout.id || 'unknown',
        progressPercentage,
        {
          sessionId: sessionId || 'unknown',
          exerciseIndex: currentExerciseIndex,
          setIndex,
          completedExercises,
          totalExercises,
          timestamp: new Date().toISOString(),
          stats: workoutStats
        }
      );

      // Start rest timer if set is completed and not the last set
      const currentSets = safeNumber(currentExercise.sets, 3);
      if (newProgress[currentExerciseIndex].completedSets[setIndex] &&
          setIndex < currentSets - 1) {
        startRestTimer();
      }

      // Show next exercise preview if exercise is completed
      if (allSetsCompleted && currentExerciseIndex < totalExercises - 1) {
        setShowNextExercisePreview(true);
        setTimeout(() => setShowNextExercisePreview(false), 3000);
      }

    } catch (error) {
      console.error('Failed to update workout progress:', error);
    }
  }, [exerciseProgress, currentExerciseIndex, currentExercise, sessionId, workout.id, workoutStats, totalExercises]);

  // Enhanced rest timer
  const startRestTimer = useCallback(() => {
    const restTime = safeNumber(currentExercise.restTime, 60);
    setIsRestTime(true);
    setRestTimeRemaining(restTime);
  }, [currentExercise.restTime]);

  // Complete next incomplete set when the exercise timer finishes
  const completeSetAfterTimer = useCallback(() => {
    try {
      // Hide the timer modal
      setShowExerciseTimer(false);

      // Find next incomplete set for the current exercise
      const sets = exerciseProgress[currentExerciseIndex]?.completedSets || [];
      const nextIncompleteIndex = sets.findIndex(s => !s);

      if (nextIncompleteIndex !== -1) {
        // Mark that set as completed
        handleSetComplete(nextIncompleteIndex);
      }
      // If all sets are already completed, do nothing here; user can navigate Next/Finish
    } catch (err) {
      console.error('completeSetAfterTimer error:', err);
      setShowExerciseTimer(false);
    }
  }, [exerciseProgress, currentExerciseIndex, handleSetComplete]);


  // Enhanced navigation with animations
  const goToNextExercise = useCallback(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        setCurrentExerciseIndex(prev => prev + 1);
        setIsRestTime(false);
        setRestTimeRemaining(0);
        setShowNextExercisePreview(false);
      });
    } else {
      completeWorkout();
    }
  }, [currentExerciseIndex, totalExercises, fadeAnim, scaleAnim]);

  const goToPreviousExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        setCurrentExerciseIndex(prev => prev - 1);
        setIsRestTime(false);
        setRestTimeRemaining(0);
      });
    }
  }, [currentExerciseIndex, fadeAnim, scaleAnim]);

  // Enhanced workout completion
  const completeWorkout = useCallback(async () => {
    console.log('🔥 Completing enhanced workout');

    try {
      const finalStats = {
        ...workoutStats,
        totalDuration: Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000)
      };

      const success = await completionTrackingService.completeWorkout(
        workout.id || 'unknown',
        {
          sessionId: sessionId || 'unknown',
          duration: finalStats.totalDuration,
          exercisesCompleted: finalStats.exercisesCompleted,
          totalExercises,
          completedAt: new Date().toISOString(),
          stats: finalStats
        }
      );

      if (success) {
        Alert.alert(
          '🎉 Workout Complete!',
          `Outstanding performance! You completed "${safeString(workout.title, 'Workout')}" in ${safeString(finalStats.totalDuration)} minutes.\n\n` +
          `📊 Stats:\n` +
          `• Exercises: ${safeString(finalStats.exercisesCompleted)}/${safeString(totalExercises)}\n` +
          `• Sets: ${safeString(finalStats.setsCompleted)}\n` +
          `• Calories: ~${safeString(finalStats.caloriesBurned)}`,
          [
            {
              text: 'View Progress',
              onPress: () => navigation.navigate('Progress')
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
              style: 'default'
            }
          ]
        );
      } else {
        throw new Error('Failed to save workout completion');
      }
    } catch (error) {
      console.error('🚨 Error completing workout:', error);
      Alert.alert(
        'Workout Complete!',
        `Great job! You completed "${safeString(workout.title, 'Workout')}" in ${safeString(workoutStats.totalDuration)} minutes.\n\nNote: Progress may not have been saved.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    }
  }, [workout, sessionId, workoutStats, totalExercises, navigation, workoutStartTime]);

  // Enhanced exit handling
  const exitWorkout = useCallback(async () => {
    console.log('🚪 Enhanced exit workout');
    const hasProgress = workoutStats.exercisesCompleted > 0 || workoutStats.setsCompleted > 0;

    // For web platform, directly navigate back
    if (Platform.OS === 'web') {
      if (hasProgress) {
        try {
          const progressPercentage = totalExercises > 0 ?
            Math.round((workoutStats.exercisesCompleted / totalExercises) * 100) : 0;
          await completionTrackingService.updateWorkoutProgress(
            workout.id || 'unknown',
            progressPercentage,
            {
              sessionId: sessionId || 'unknown',
              partialCompletion: true,
              exitedAt: new Date().toISOString(),
              stats: workoutStats
            }
          );
        } catch (error) {
          console.error('❌ Failed to save progress:', error);
        }
      }
      navigation.goBack();
      return;
    }

    // Enhanced mobile exit dialog
    if (hasProgress) {
      Alert.alert(
        'Save Progress?',
        `You've completed ${safeString(workoutStats.exercisesCompleted)}/${safeString(totalExercises)} exercises and ${safeString(workoutStats.setsCompleted)} sets.\n\nYour progress will be saved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save & Exit',
            onPress: async () => {
              try {
                const progressPercentage = totalExercises > 0 ?
                  Math.round((workoutStats.exercisesCompleted / totalExercises) * 100) : 0;
                await completionTrackingService.updateWorkoutProgress(
                  workout.id || 'unknown',
                  progressPercentage,
                  {
                    sessionId: sessionId || 'unknown',
                    partialCompletion: true,
                    exitedAt: new Date().toISOString(),
                    stats: workoutStats
                  }
                );
              } catch (error) {
                console.error('❌ Failed to save progress:', error);
              }
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Exit Workout?',
        'Are you sure you want to exit? No progress has been made.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [workoutStats, totalExercises, workout.id, sessionId, navigation]);

  // Enhanced exercise name generator
  const getExerciseName = useCallback((exerciseId: string): string => {
    if (!exerciseId) return 'Exercise';
    return safeString(exerciseId, 'Exercise')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  // Next exercise preview
  const nextExercise = useMemo(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      return workout.exercises[currentExerciseIndex + 1];
    }
    return null;
  }, [currentExerciseIndex, totalExercises, workout.exercises]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header with Stats */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={exitWorkout}
          style={styles.exitButton}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.exitButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.workoutTitle} numberOfLines={1}>
            {safeString(workout.title, 'Workout')}
          </Text>
          <Text style={styles.progressText}>
            Exercise {safeString(currentExerciseIndex + 1)} of {safeString(totalExercises)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.timerText}>
            {safeString(workoutStats.totalDuration)}m
          </Text>
          <Text style={styles.caloriesText}>
            {safeString(workoutStats.caloriesBurned)} cal
          </Text>
        </View>
      </View>

      {/* Enhanced Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(100, overallProgress * 100)}%`,
              opacity: fadeAnim
            }
          ]}
        />
        <Text style={styles.progressPercentage}>
          {safeString(Math.round(overallProgress * 100))}%
        </Text>
      </View>

      {/* Enhanced Rest Timer */}
      <WorkoutTimer
        isVisible={isRestTime}
        duration={restTimeRemaining}
        title="Rest Time"
        onComplete={() => {
          setIsRestTime(false);
          setShowExerciseTimer(true);
        }}
        onCancel={() => setIsRestTime(false)}
      />
      {/* Exercise Timer */}
      <WorkoutTimer
        isVisible={showExerciseTimer}
        duration={derivedExerciseDuration}
        title={safeString(currentExercise.name || 'Exercise Timer')}
        onComplete={completeSetAfterTimer}
        onCancel={() => setShowExerciseTimer(false)}
      >
        {/* Show the same GIF above the timer for guidance */}
        <ExerciseGifPlayer
          exerciseId={safeString(currentExercise.exerciseId, '')}
          exerciseName={safeString(currentExercise.name, '')}
          height={180}
          width={220}
          showTitle={false}
          showInstructions={false}
          style={{ marginBottom: THEME.spacing.md }}
        />
      </WorkoutTimer>

      {/* Next Exercise Preview */}
      {showNextExercisePreview && nextExercise && (
        <View style={styles.nextExercisePreview}>
          <Text style={styles.nextExerciseTitle}>Next Up:</Text>
          <Text style={styles.nextExerciseName}>
            {safeString(nextExercise.name || getExerciseName(nextExercise.exerciseId), 'Next Exercise')}
          </Text>
        </View>
      )}

      {/* Enhanced Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.exerciseContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Enhanced Exercise Visual */}
          <ExerciseGifPlayer
            exerciseId={safeString(currentExercise.exerciseId, '')}
            exerciseName={safeString(currentExercise.name, '')}
            height={280}
            width={320}
            showTitle={false}
            showInstructions={true}
            onInstructionsPress={() => setShowInstructionModal(true)}
            style={styles.exerciseGifPlayer}
          />

          {/* Enhanced Exercise Details Card */}
          <Card style={styles.exerciseCard} variant="elevated">
            {/* Exercise Header */}
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName} numberOfLines={2}>
                {safeString(
                  currentExercise.name || getExerciseName(currentExercise.exerciseId),
                  'Current Exercise'
                )}
              </Text>

              {/* Start Exercise Timer */}
              <Button
                title={parseDurationFromReps(currentExercise.reps) ? `Start ${safeString(currentExercise.reps)}` : 'Start Timer'}
                onPress={() => setShowExerciseTimer(true)}
                variant="primary"
                style={{ marginTop: THEME.spacing.md }}
              />

              <View style={styles.exerciseDetails}>
                <Text style={styles.exerciseDetailText}>
                  {safeString(currentExercise.sets, '0')} sets × {safeString(currentExercise.reps, '0')} reps
                </Text>

                {safeNumber(currentExercise.weight, 0) > 0 && (
                  <Text style={styles.exerciseDetailText}>
                    {safeString(currentExercise.weight, '0')}kg
                  </Text>
                )}

                {safeNumber(currentExercise.restTime, 0) > 0 && (
                  <Text style={styles.exerciseDetailText}>
                    Rest: {safeString(currentExercise.restTime, '0')}s
                  </Text>
                )}
              </View>
            </View>

            {/* Enhanced Sets Tracking */}
            <View style={styles.setsContainer}>
              <Text style={styles.setsTitle}>Sets Progress</Text>
              <View style={styles.setsGrid}>
                {currentProgress.completedSets?.map((isCompleted, setIndex) => (
                  <TouchableOpacity
                    key={setIndex}
                    style={[
                      styles.setButton,
                      isCompleted && styles.setButtonCompleted
                    ]}
                    onPress={() => handleSetComplete(setIndex)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.setButtonText,
                      isCompleted && styles.setButtonTextCompleted
                    ]}>
                      {safeString(setIndex + 1)}
                    </Text>
                    {isCompleted && (
                      <Text style={styles.setButtonCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sets Progress Text */}
              <Text style={styles.setsProgressText}>
                {safeString(currentProgress.completedSets?.filter(Boolean).length || 0)} / {safeString(currentProgress.completedSets?.length || 0)} completed
              </Text>
            </View>

            {/* Enhanced Exercise Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Exercise Notes</Text>
              <Text style={styles.instructionsText}>
                {safeString(
                  currentExercise.notes || 'Focus on proper form and controlled movements. Maintain steady breathing throughout each rep.',
                  'Exercise instructions not available'
                )}
              </Text>
            </View>

            {/* Workout Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{safeString(workoutStats.setsCompleted)}</Text>
                <Text style={styles.statLabel}>Sets Done</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{safeString(workoutStats.totalDuration)}m</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{safeString(workoutStats.caloriesBurned)}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Enhanced Exercise Instruction Modal */}
      <ExerciseInstructionModal
        isVisible={showInstructionModal}
        onClose={() => setShowInstructionModal(false)}
        exerciseId={safeString(currentExercise.exerciseId, '')}
        exerciseName={safeString(currentExercise.name, '')}
      />

      {/* Enhanced Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <Button
          title="Previous"
          onPress={goToPreviousExercise}
          variant="outline"
          disabled={currentExerciseIndex === 0}
          style={styles.navButton}
        />

        <Button
          title={currentExerciseIndex === totalExercises - 1 ? "Finish Workout" : "Next Exercise"}
          onPress={goToNextExercise}
          variant="primary"
          style={[styles.navButton, styles.primaryNavButton]}
        />
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },

  errorEmoji: {
    fontSize: 64,
    marginBottom: THEME.spacing.lg,
  },

  errorText: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.error,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  errorSubtext: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.xl,
  },

  errorButton: {
    minWidth: 120,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    elevation: 2,
  },

  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.error + '40',
  },

  exitButtonText: {
    fontSize: 18,
    color: THEME.colors.error,
    fontWeight: THEME.fontWeight.bold,
  },

  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: THEME.spacing.md,
  },

  workoutTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: 'center',
  },

  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },

  headerRight: {
    alignItems: 'flex-end',
  },

  timerText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.primary,
  },

  caloriesText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },

  progressBarContainer: {
    height: 6,
    backgroundColor: THEME.colors.border,
    marginHorizontal: THEME.spacing.lg,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },

  progressBar: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },

  progressPercentage: {
    position: 'absolute',
    right: THEME.spacing.sm,
    top: -20,
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  nextExercisePreview: {
    backgroundColor: THEME.colors.primary + '20',
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
  },

  nextExerciseTitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold,
    marginBottom: THEME.spacing.xs,
  },

  nextExerciseName: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },

  content: {
    flex: 1,
    paddingHorizontal: THEME.spacing.lg,
  },

  exerciseContainer: {
    marginTop: THEME.spacing.lg,
    alignItems: 'center',
  },

  exerciseGifPlayer: {
    marginBottom: THEME.spacing.lg,
    alignSelf: 'center',
    elevation: 4,
  },

  exerciseCard: {
    padding: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
    width: '100%',
  },

  exerciseHeader: {
    marginBottom: THEME.spacing.xl,
  },

  exerciseName: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },

  exerciseDetailText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },

  setsContainer: {
    marginBottom: THEME.spacing.xl,
  },

  setsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },

  setsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },

  setButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.border,
    position: 'relative',
  },

  setButtonCompleted: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },

  setButtonText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.textSecondary,
  },

  setButtonTextCompleted: {
    color: THEME.colors.white,
  },

  setButtonCheck: {
    position: 'absolute',
    top: -2,
    right: 2,
    fontSize: 12,
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.bold,
  },

  setsProgressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    fontWeight: THEME.fontWeight.medium,
  },

  instructionsContainer: {
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.lg,
  },

  instructionsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  instructionsText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: THEME.fontSize.sm * 1.5,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
    textTransform: 'uppercase',
  },

  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    gap: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  navButton: {
    flex: 1,
    minHeight: 50,
  },

  primaryNavButton: {
    elevation: 2,
  },
});