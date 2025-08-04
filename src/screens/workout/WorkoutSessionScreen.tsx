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
  Platform,
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
}


export const WorkoutSessionScreen: React.FC<WorkoutSessionScreenProps> = ({
  route,
  navigation,
}) => {
  console.log(`🏋️ WORKOUT SESSION SCREEN: Initializing with:`, {
    hasRoute: !!route,
    hasParams: !!route?.params,
    hasWorkout: !!route?.params?.workout,
    hasSessionId: !!route?.params?.sessionId,
    workoutTitle: route?.params?.workout?.title,
    sessionId: route?.params?.sessionId
  });

  const { workout, sessionId } = route.params;

  // Safety check for required params
  if (!workout) {
    console.error(`🚨 WORKOUT SESSION ERROR: No workout provided`);
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Error: No workout data provided</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout.exercises || workout.exercises.length === 0) {
    console.error(`🚨 WORKOUT SESSION ERROR: No exercises in workout`);
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Error: No exercises found in workout</Text>
        </View>
      </SafeAreaView>
    );
  }
  
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
  const [showInstructionModal, setShowInstructionModal] = useState(false);

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
    console.log('🔥 CompleteWorkout called - starting completion process');
    const workoutDuration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000);
    
    console.log(`⏱️  Workout duration: ${workoutDuration} minutes`);
    console.log(`📊 Exercises completed: ${exerciseProgress.filter(ep => ep.isCompleted).length}/${totalExercises}`);
    
    try {
      console.log('📞 Calling completionTrackingService.completeWorkout...');
      // Mark workout as completed in the tracking service
      const success = await completionTrackingService.completeWorkout(workout.id, {
        sessionId,
        duration: workoutDuration,
        exercisesCompleted: exerciseProgress.filter(ep => ep.isCompleted).length,
        totalExercises,
        completedAt: new Date().toISOString(),
      });
      
      console.log(`🎯 CompletionTrackingService returned: ${success}`);
      
      if (success) {
        console.log('✅ Success=true, showing completion alert...');
        Alert.alert(
          '🎉 Workout Complete!',
          `Great job! You completed "${workout.title}" in ${workoutDuration} minutes.\n\nCalories burned: ~${workout.estimatedCalories}\nExercises completed: ${exerciseProgress.filter(ep => ep.isCompleted).length}/${totalExercises}`,
          [
            {
              text: 'View Progress',
              onPress: () => {
                console.log('👀 User chose "View Progress"');
                navigation.navigate('Progress');
              }
            },
            {
              text: 'Done',
              onPress: () => {
                console.log('✅ User chose "Done" - navigating back');
                navigation.goBack();
              },
              style: 'default'
            }
          ]
        );
        console.log('🚨 Alert.alert called - waiting for user response');
      } else {
        console.log('❌ Success=false, completion service failed');
        throw new Error('Failed to save workout completion');
      }
    } catch (error) {
      console.error('🚨 Error completing workout:', error);
      console.log('📢 Showing fallback completion alert...');
      Alert.alert(
        'Workout Complete!',
        `Great job! You completed "${workout.title}" in ${workoutDuration} minutes.\n\nNote: Progress may not have been saved.`,
        [
          {
            text: 'Done',
            onPress: () => {
              console.log('✅ User chose "Done" from fallback alert');
              navigation.goBack();
            },
          }
        ]
      );
      console.log('🚨 Fallback Alert.alert called');
    }
  };

  // Exit workout
  const exitWorkout = async () => {
    console.log('🚪 ExitWorkout called - user tapped X button');
    const completedExercises = exerciseProgress.filter(ep => ep.isCompleted).length;
    const hasProgress = completedExercises > 0;
    
    console.log(`📊 Progress check: ${completedExercises}/${totalExercises} exercises completed`);
    console.log(`🔄 Has progress: ${hasProgress}`);
    
    // For web platform, directly navigate back since Alert.alert doesn't work well
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform detected - direct navigation');
      if (hasProgress) {
        try {
          const progressPercentage = Math.round((completedExercises / totalExercises) * 100);
          console.log(`📊 Saving progress: ${progressPercentage}%`);
          await completionTrackingService.updateWorkoutProgress(
            workout.id,
            progressPercentage,
            {
              sessionId,
              partialCompletion: true,
              exitedAt: new Date().toISOString(),
            }
          );
          console.log('✅ Progress saved successfully');
        } catch (error) {
          console.error('❌ Failed to save progress:', error);
        }
      }
      console.log('🔙 Navigating back (web platform)');
      navigation.goBack();
      return;
    }
    
    // For mobile platforms, use Alert.alert
    if (hasProgress) {
      console.log('⚠️ Showing exit confirmation (with progress)...');
      Alert.alert(
        'Exit Workout?',
        `You've completed ${completedExercises}/${totalExercises} exercises. Your progress will be saved.`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('❌ User cancelled exit')
          },
          { 
            text: 'Save & Exit', 
            onPress: async () => {
              console.log('💾 User chose "Save & Exit"');
              try {
                const progressPercentage = Math.round((completedExercises / totalExercises) * 100);
                console.log(`📊 Saving progress: ${progressPercentage}%`);
                await completionTrackingService.updateWorkoutProgress(
                  workout.id,
                  progressPercentage,
                  {
                    sessionId,
                    partialCompletion: true,
                    exitedAt: new Date().toISOString(),
                  }
                );
                console.log('✅ Progress saved successfully');
              } catch (error) {
                console.error('❌ Failed to save progress:', error);
              }
              console.log('🔙 Navigating back');
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      console.log('⚠️ Showing exit confirmation (no progress)...');
      Alert.alert(
        'Exit Workout?',
        'Are you sure you want to exit? No progress has been made.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('❌ User cancelled exit (no progress)')
          },
          { 
            text: 'Exit', 
            style: 'destructive', 
            onPress: () => {
              console.log('🚪 User chose "Exit" - navigating back');
              navigation.goBack();
            }
          }
        ]
      );
    }
    
    // Add a fallback timeout for mobile platforms in case Alert doesn't work
    setTimeout(() => {
      console.log('⏰ Fallback: Navigating back after 2 seconds');
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }, 2000);
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
        <TouchableOpacity 
          onPress={() => {
            console.log('🔴 Exit button pressed!');
            exitWorkout();
          }} 
          style={styles.exitButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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
          {/* Exercise Visual Demonstration */}
          <ExerciseGifPlayer
            exerciseId={currentExercise.exerciseId}
            exerciseName={currentExercise.name}
            height={250}
            width={300}
            showTitle={false}
            showInstructions={true}
            onInstructionsPress={() => setShowInstructionModal(true)}
            style={styles.exerciseGifPlayer}
          />

          {/* Current Exercise */}
          <Card style={styles.exerciseCard} variant="elevated">
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>
                {currentExercise.name || getExerciseName(currentExercise.exerciseId)}
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

      {/* Exercise Instruction Modal */}
      <ExerciseInstructionModal
        isVisible={showInstructionModal}
        onClose={() => setShowInstructionModal(false)}
        exerciseId={currentExercise.exerciseId}
        exerciseName={currentExercise.name}
      />

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
    alignItems: 'center',
  },

  exerciseGifPlayer: {
    marginBottom: THEME.spacing.lg,
    alignSelf: 'center',
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
