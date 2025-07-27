import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { DayWorkout } from '../../ai/weeklyContentGenerator';
import { WorkoutTimer } from '../../components/fitness/WorkoutTimer';
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
}

export const WorkoutSessionScreen: React.FC<WorkoutSessionScreenProps> = ({
  route,
  navigation,
}) => {
  const { workout, sessionId } = route.params;
  
  // State management
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    workout.exercises.map((_, index) => ({
      exerciseIndex: index,
      completedSets: new Array(workout.exercises[index]?.sets || 3).fill(false),
      isCompleted: false,
    }))
  );
  const [isRestTime, setIsRestTime] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [workoutStartTime] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(1));

  const currentExercise = workout.exercises[currentExerciseIndex];
  const currentProgress = exerciseProgress[currentExerciseIndex];
  const totalExercises = workout.exercises.length;
  const overallProgress = exerciseProgress.filter(ep => ep.isCompleted).length / totalExercises;

  // Animation when changing exercises
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentExerciseIndex]);

  // Handle set completion
  const handleSetComplete = async (setIndex: number) => {
    const newProgress = [...exerciseProgress];
    newProgress[currentExerciseIndex].completedSets[setIndex] = 
      !newProgress[currentExerciseIndex].completedSets[setIndex];
    
    // Check if all sets are completed
    const allSetsCompleted = newProgress[currentExerciseIndex].completedSets.every(set => set);
    newProgress[currentExerciseIndex].isCompleted = allSetsCompleted;
    
    setExerciseProgress(newProgress);

    // Update overall workout progress
    const completedExercises = newProgress.filter(ep => ep.isCompleted).length;
    const progressPercentage = Math.round((completedExercises / totalExercises) * 100);
    
    try {
      await completionTrackingService.updateWorkoutProgress(
        workout.id,
        progressPercentage,
        {
          sessionId,
          exerciseIndex: currentExerciseIndex,
          setIndex,
          completedExercises,
          totalExercises,
        }
      );
    } catch (error) {
      console.error('Failed to update workout progress:', error);
    }

    // Start rest timer if set is completed and not the last set
    if (newProgress[currentExerciseIndex].completedSets[setIndex] && 
        setIndex < currentExercise.sets - 1) {
      startRestTimer();
    }
  };

  // Start rest timer
  const startRestTimer = () => {
    setIsRestTime(true);
    setRestTimeRemaining(currentExercise.restTime);
  };

  // Navigate to next exercise
  const goToNextExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setIsRestTime(false);
        setRestTimeRemaining(0);
      });
    } else {
      completeWorkout();
    }
  };

  // Navigate to previous exercise
  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentExerciseIndex(currentExerciseIndex - 1);
        setIsRestTime(false);
        setRestTimeRemaining(0);
      });
    }
  };

  // Complete workout
  const completeWorkout = async () => {
    const workoutDuration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000);
    
    try {
      // Mark workout as completed in the tracking service
      const success = await completionTrackingService.completeWorkout(workout.id, {
        sessionId,
        duration: workoutDuration,
        exercisesCompleted: exerciseProgress.filter(ep => ep.isCompleted).length,
        totalExercises,
        completedAt: new Date().toISOString(),
      });
      
      if (success) {
        Alert.alert(
          '🎉 Workout Complete!',
          `Great job! You completed "${workout.title}" in ${workoutDuration} minutes.\n\nCalories burned: ~${workout.estimatedCalories}\nExercises completed: ${exerciseProgress.filter(ep => ep.isCompleted).length}/${totalExercises}`,
          [
            {
              text: 'View Progress',
              onPress: () => {
                navigation.navigate('Progress');
              }
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
      console.error('Error completing workout:', error);
      Alert.alert(
        'Workout Complete!',
        `Great job! You completed "${workout.title}" in ${workoutDuration} minutes.\n\nNote: Progress may not have been saved.`,
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          }
        ]
      );
    }
  };

  // Exit workout
  const exitWorkout = async () => {
    const completedExercises = exerciseProgress.filter(ep => ep.isCompleted).length;
    const hasProgress = completedExercises > 0;
    
    if (hasProgress) {
      Alert.alert(
        'Exit Workout?',
        `You've completed ${completedExercises}/${totalExercises} exercises. Your progress will be saved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save & Exit', 
            onPress: async () => {
              try {
                const progressPercentage = Math.round((completedExercises / totalExercises) * 100);
                await completionTrackingService.updateWorkoutProgress(
                  workout.id,
                  progressPercentage,
                  {
                    sessionId,
                    partialCompletion: true,
                    exitedAt: new Date().toISOString(),
                  }
                );
              } catch (error) {
                console.error('Failed to save progress:', error);
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
          { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const getExerciseName = (exerciseId: string) => {
    return exerciseId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={exitWorkout} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.workoutTitle}>{workout.title}</Text>
          <Text style={styles.progressText}>
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.timerText}>
            {Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000)}m
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${overallProgress * 100}%` }]} />
      </View>

      {/* Rest Timer */}
      <WorkoutTimer
        isVisible={isRestTime}
        duration={restTimeRemaining}
        title="Rest Time"
        onComplete={() => setIsRestTime(false)}
        onCancel={() => setIsRestTime(false)}
      />

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.exerciseContainer, { opacity: fadeAnim }]}>
          {/* Current Exercise */}
          <Card style={styles.exerciseCard} variant="elevated">
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>
                {getExerciseName(currentExercise.exerciseId)}
              </Text>
              <View style={styles.exerciseDetails}>
                <Text style={styles.exerciseDetailText}>
                  {currentExercise.sets} sets × {currentExercise.reps} reps
                </Text>
                {currentExercise.weight && currentExercise.weight > 0 && (
                  <Text style={styles.exerciseDetailText}>
                    {currentExercise.weight}kg
                  </Text>
                )}
              </View>
            </View>

            {/* Sets Tracking */}
            <View style={styles.setsContainer}>
              <Text style={styles.setsTitle}>Sets</Text>
              <View style={styles.setsGrid}>
                {currentProgress.completedSets.map((isCompleted, setIndex) => (
                  <TouchableOpacity
                    key={setIndex}
                    style={[
                      styles.setButton,
                      isCompleted && styles.setButtonCompleted
                    ]}
                    onPress={() => handleSetComplete(setIndex)}
                  >
                    <Text style={[
                      styles.setButtonText,
                      isCompleted && styles.setButtonTextCompleted
                    ]}>
                      {setIndex + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Exercise Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Instructions</Text>
              <Text style={styles.instructionsText}>
                {currentExercise.notes || 'Focus on proper form and controlled movements.'}
              </Text>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <Button
          title="Previous"
          onPress={goToPreviousExercise}
          variant="outline"
          disabled={currentExerciseIndex === 0}
          style={styles.navButton}
        />
        
        <Button
          title={currentExerciseIndex === totalExercises - 1 ? "Finish" : "Next"}
          onPress={goToNextExercise}
          variant="primary"
          style={styles.navButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
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
  },

  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },

  exitButtonText: {
    fontSize: 18,
    color: THEME.colors.error,
    fontWeight: 'bold',
  },

  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: THEME.spacing.md,
  },

  workoutTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
  },

  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },

  headerRight: {
    alignItems: 'center',
  },

  timerText: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
    color: THEME.colors.primary,
  },

  progressBarContainer: {
    height: 4,
    backgroundColor: THEME.colors.border,
    marginHorizontal: THEME.spacing.lg,
  },

  progressBar: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },

  content: {
    flex: 1,
    paddingHorizontal: THEME.spacing.lg,
  },

  exerciseContainer: {
    marginTop: THEME.spacing.lg,
  },

  exerciseCard: {
    padding: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },

  exerciseHeader: {
    marginBottom: THEME.spacing.lg,
  },

  exerciseName: {
    fontSize: THEME.fontSize.xl,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.spacing.lg,
  },

  exerciseDetailText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },

  setsContainer: {
    marginBottom: THEME.spacing.lg,
  },

  setsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },

  setsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.spacing.md,
  },

  setButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.border,
  },

  setButtonCompleted: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },

  setButtonText: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },

  setButtonTextCompleted: {
    color: THEME.colors.surface,
  },

  instructionsContainer: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.lg,
    borderRadius: 12,
  },

  instructionsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  instructionsText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
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
  },
});
