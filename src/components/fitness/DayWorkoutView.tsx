/**
 * DayWorkoutView Component
 * Displays detailed workout information for a selected day in a modal
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';
import { DayWorkout } from '../../types/ai';

interface DayWorkoutViewProps {
  workout: DayWorkout | null;
  onStartWorkout: (workoutId: string) => void;
  onClose: () => void;
}

export const DayWorkoutView: React.FC<DayWorkoutViewProps> = ({
  workout,
  onStartWorkout,
  onClose,
}) => {
  if (!workout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rest Day</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={rf(24)} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="moon" size={rf(48)} color="#667eea" />
          <Text style={styles.emptyText}>No workout scheduled for this day</Text>
          <Text style={styles.emptySubtext}>Take this time to rest and recover</Text>
        </View>
      </View>
    );
  }

  // Note: warmup and cooldown are separate arrays in the workout object
  const warmupExercises = workout.warmup || [];
  const mainExercises = workout.exercises || [];
  const cooldownExercises = workout.cooldown || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{workout.title}</Text>
          <Text style={styles.headerSubtitle}>
            {workout.dayOfWeek.charAt(0).toUpperCase() + workout.dayOfWeek.slice(1)}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={rf(24)} color="#fff" />
        </Pressable>
      </View>

      {/* Workout Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={rf(20)} color="#FF6B6B" />
          <Text style={styles.statText}>{workout.duration} min</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="flame-outline" size={rf(20)} color="#FF6B6B" />
          <Text style={styles.statText}>{workout.estimatedCalories} cal</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={rf(20)} color="#FF6B6B" />
          <Text style={styles.statText}>{workout.exercises.length} exercises</Text>
        </View>
      </View>

      {/* Exercises List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Warmup Section */}
        {warmupExercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Warmup</Text>
            {warmupExercises.map((exercise, index) => (
              <GlassCard key={exercise.exerciseId} style={styles.exerciseCard}>
                <View style={styles.exerciseContent}>
                  <View style={styles.exerciseNumberContainer}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>
                      {(exercise as any).exerciseData?.name || (exercise as any).name || 'Exercise'}
                    </Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets} sets × {exercise.reps} reps
                      {exercise.restTime && ` • ${exercise.restTime}s rest`}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Main Workout Section */}
        {mainExercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💪 Main Workout</Text>
            {mainExercises.map((exercise, index) => (
              <GlassCard key={exercise.exerciseId} style={styles.exerciseCard}>
                <View style={styles.exerciseContent}>
                  <View style={styles.exerciseNumberContainer}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>
                      {exercise.exerciseData?.name || 'Exercise'}
                    </Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets} sets × {exercise.reps} reps
                      {exercise.restTime && ` • ${exercise.restTime}s rest`}
                    </Text>
                    {(exercise as any).exerciseData?.targetMuscles && (
                      <Text style={styles.targetMuscles}>
                        Target: {(exercise as any).exerciseData.targetMuscles.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Cooldown Section */}
        {cooldownExercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧘 Cooldown</Text>
            {cooldownExercises.map((exercise, index) => (
              <GlassCard key={exercise.exerciseId} style={styles.exerciseCard}>
                <View style={styles.exerciseContent}>
                  <View style={styles.exerciseNumberContainer}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>
                      {(exercise as any).exerciseData?.name || (exercise as any).name || 'Exercise'}
                    </Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets} sets × {exercise.reps} reps
                      {exercise.restTime && ` • ${exercise.restTime}s rest`}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        <View style={{ height: rh(100) }} />
      </ScrollView>

      {/* Start Workout Button */}
      <View style={styles.footer}>
        <AnimatedPressable
          onPress={() => onStartWorkout(workout.id)}
          scaleValue={0.95}
          hapticFeedback={true}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startButton}
          >
            <Ionicons name="play-circle" size={rf(24)} color="#fff" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: rh(60),
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  headerTitle: {
    fontSize: rf(24),
    fontWeight: '700',
    color: '#fff',
    marginBottom: rh(4),
  },
  headerSubtitle: {
    fontSize: rf(14),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  closeButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: rw(20),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(8),
  },
  statText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: '#fff',
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  exerciseCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    padding: ResponsiveTheme.spacing.md,
  },
  exerciseContent: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },
  exerciseNumberContainer: {
    width: rw(32),
    height: rh(32),
    borderRadius: rw(16),
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumber: {
    fontSize: rf(14),
    fontWeight: '700',
    color: '#FF6B6B',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: rf(16),
    fontWeight: '600',
    color: '#fff',
    marginBottom: rh(4),
  },
  exerciseDetails: {
    fontSize: rf(13),
    color: 'rgba(255, 255, 255, 0.7)',
  },
  targetMuscles: {
    fontSize: rf(12),
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: rh(4),
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: rh(40),
    paddingTop: ResponsiveTheme.spacing.md,
  },
  startButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: rw(12),
    paddingVertical: rh(16),
    borderRadius: ResponsiveTheme.spacing.md,
  },
  startButtonText: {
    fontSize: rf(16),
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.xl,
  },
  emptyText: {
    fontSize: rf(18),
    fontWeight: '600',
    color: '#fff',
    marginTop: ResponsiveTheme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: rf(14),
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: rh(8),
    textAlign: 'center',
  },
});
