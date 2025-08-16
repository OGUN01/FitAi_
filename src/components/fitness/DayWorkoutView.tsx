import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, RefreshControl } from 'react-native';
import { WorkoutCard } from './WorkoutCard';
import { ExerciseCard } from './ExerciseCard';
import { Card, Button, THEME } from '../ui';
import { Workout } from '../../types/workout';

interface DayWorkoutViewProps {
  selectedDay: string;
  workouts: Workout[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onStartWorkout: (workout: Workout) => void;
  onViewWorkoutDetails?: (workout: Workout) => void;
  onGenerateWorkout?: () => void;
  isRestDay?: boolean;
  workoutProgress?: Record<string, number>; // workout id -> progress percentage
}

export const DayWorkoutView: React.FC<DayWorkoutViewProps> = ({
  selectedDay,
  workouts,
  isLoading = false,
  onRefresh,
  onStartWorkout,
  onViewWorkoutDetails,
  onGenerateWorkout,
  isRestDay = false,
  workoutProgress = {},
}) => {
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(1));

  const getDayDisplayName = (day: string) => {
    const dayNames: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };
    return dayNames[day] || day;
  };

  const getDayEmoji = (day: string) => {
    const dayEmojis: Record<string, string> = {
      monday: '💪',
      tuesday: '🔥',
      wednesday: '⚡',
      thursday: '🎯',
      friday: '🚀',
      saturday: '🏆',
      sunday: '😴',
    };
    return dayEmojis[day] || '📅';
  };

  const handleWorkoutToggle = (workoutId: string) => {
    setExpandedWorkout(expandedWorkout === workoutId ? null : workoutId);
  };

  const renderRestDayContent = () => (
    <Card style={styles.restDayCard} variant="elevated">
      <View style={styles.restDayContent}>
        <Text style={styles.restDayEmoji}>😴</Text>
        <Text style={styles.restDayTitle}>Rest Day</Text>
        <Text style={styles.restDaySubtitle}>
          Recovery is just as important as training! Use this day to:
        </Text>
        <View style={styles.restDayTips}>
          <Text style={styles.restDayTip}>• Gentle stretching or yoga</Text>
          <Text style={styles.restDayTip}>• Stay hydrated</Text>
          <Text style={styles.restDayTip}>• Get quality sleep</Text>
          <Text style={styles.restDayTip}>• Focus on nutrition</Text>
        </View>
        {onGenerateWorkout && (
          <Button
            title="Add Optional Workout"
            onPress={onGenerateWorkout}
            variant="outline"
            style={styles.addWorkoutButton}
          />
        )}
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyStateCard} variant="elevated">
      <View style={styles.emptyStateContent}>
        <Text style={styles.emptyStateEmoji}>📋</Text>
        <Text style={styles.emptyStateTitle}>No Workouts Scheduled</Text>
        <Text style={styles.emptyStateSubtitle}>
          No workouts are planned for {getDayDisplayName(selectedDay).toLowerCase()}. Generate a
          personalized workout to get started!
        </Text>
        {onGenerateWorkout && (
          <Button
            title="Generate Workout"
            onPress={onGenerateWorkout}
            variant="primary"
            style={styles.generateButton}
          />
        )}
      </View>
    </Card>
  );

  const renderWorkoutsList = () => (
    <>
      {workouts.map((workout, index) => (
        <Animated.View
          key={workout.id}
          style={{
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <WorkoutCard
            workout={workout}
            onStart={() => onStartWorkout(workout)}
            onViewDetails={() => onViewWorkoutDetails?.(workout)}
            isInProgress={workoutProgress[workout.id] > 0 && workoutProgress[workout.id] < 100}
            progress={workoutProgress[workout.id] || 0}
            animatedValue={fadeAnim}
          />

          {/* Expanded Exercise Details */}
          {expandedWorkout === workout.id && (
            <View style={styles.exercisesContainer}>
              <Text style={styles.exercisesTitle}>Exercises ({workout.exercises?.length ?? 0})</Text>
              {workout.exercises?.map((exerciseSet, exerciseIndex) => {
                // Create a mock Exercise object for display
                const mockExercise = {
                  id: `${workout.id}_${exerciseIndex}`,
                  name: `Exercise ${exerciseIndex + 1}`, // This would come from exercise database
                  description: 'Exercise description here',
                  instructions: [
                    'Perform the movement with proper form',
                    'Control the weight throughout the range of motion',
                    'Breathe properly during the exercise',
                  ],
                  muscleGroups: ['chest', 'shoulders'], // This would come from exercise data
                  equipment: ['dumbbells'], // This would come from exercise data
                  difficulty: 'intermediate' as const,
                  tips: ['Focus on form over weight', 'Control the movement'],
                };

                return (
                  <ExerciseCard
                    key={exerciseIndex}
                    exercise={mockExercise}
                    workoutSet={exerciseSet}
                    exerciseNumber={exerciseIndex + 1}
                    isCompleted={workoutProgress[workout.id] === 100}
                    onComplete={() => {
                      // Handle exercise completion
                      console.log('Exercise completed');
                    }}
                    onStart={() => {
                      // Handle exercise start
                      console.log('Exercise started');
                    }}
                    style={styles.exerciseCard}
                  />
                );
              })}
            </View>
          )}
        </Animated.View>
      ))}
    </>
  );

  return (
    <View style={styles.container}>
      {/* Day Header */}
      <View style={styles.dayHeader}>
        <Text style={styles.dayEmoji}>{getDayEmoji(selectedDay)}</Text>
        <View style={styles.dayInfo}>
          <Text style={styles.dayName}>{getDayDisplayName(selectedDay)}</Text>
          <Text style={styles.daySubtitle}>
            {isRestDay
              ? 'Rest & Recovery'
              : workouts.length === 0
                ? 'No workouts planned'
                : `${workouts.length} workout${workouts.length > 1 ? 's' : ''} planned`}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={THEME.colors.primary}
            />
          ) : undefined
        }
      >
        {isRestDay
          ? renderRestDayContent()
          : workouts.length === 0
            ? renderEmptyState()
            : renderWorkoutsList()}

        {/* Summary Stats */}
        {workouts.length > 0 && !isRestDay && (
          <Card style={styles.summaryCard} variant="outlined">
            <Text style={styles.summaryTitle}>Day Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {workouts.reduce((sum, w) => sum + w.duration, 0)}
                </Text>
                <Text style={styles.summaryLabel}>Total Minutes</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {workouts.reduce((sum, w) => sum + w.estimatedCalories, 0)}
                </Text>
                <Text style={styles.summaryLabel}>Estimated Calories</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {workouts.reduce((sum, w) => sum + w.exercises.length, 0)}
                </Text>
                <Text style={styles.summaryLabel}>Total Exercises</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  dayEmoji: {
    fontSize: 32,
    marginRight: THEME.spacing.md,
  },

  dayInfo: {
    flex: 1,
  },

  dayName: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: 2,
  },

  daySubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  scrollView: {
    flex: 1,
    padding: THEME.spacing.lg,
  },

  restDayCard: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },

  restDayContent: {
    alignItems: 'center',
  },

  restDayEmoji: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },

  restDayTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  restDaySubtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    lineHeight: 22,
  },

  restDayTips: {
    alignSelf: 'stretch',
    marginBottom: THEME.spacing.lg,
  },

  restDayTip: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
    textAlign: 'left',
  },

  addWorkoutButton: {
    minWidth: 160,
  },

  emptyStateCard: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },

  emptyStateContent: {
    alignItems: 'center',
  },

  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },

  emptyStateTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
  },

  emptyStateSubtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    lineHeight: 22,
  },

  generateButton: {
    minWidth: 160,
  },

  exercisesContainer: {
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.sm,
  },

  exercisesTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  exerciseCard: {
    marginBottom: THEME.spacing.sm,
  },

  summaryCard: {
    padding: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
  },

  summaryTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },

  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  summaryItem: {
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  summaryLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  bottomSpacing: {
    height: THEME.spacing.xl,
  },
});
