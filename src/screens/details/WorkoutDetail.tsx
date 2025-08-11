import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  duration?: string;
  restTime: string;
  instructions: string[];
  targetMuscles: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string[];
}

interface WorkoutDetailProps {
  workoutId: string;
  onBack?: () => void;
  onStartWorkout?: () => void;
}

export const WorkoutDetail: React.FC<WorkoutDetailProps> = ({
  workoutId,
  onBack,
  onStartWorkout,
}) => {
  // Mock workout data - in real app this would come from props or API
  const workout = {
    id: workoutId,
    name: 'Upper Body Strength',
    description:
      'Build strength and muscle mass in your upper body with this comprehensive workout',
    duration: '45-60 min',
    difficulty: 'Intermediate',
    targetMuscles: ['Chest', 'Back', 'Shoulders', 'Arms'],
    equipment: ['Dumbbells', 'Barbell', 'Bench'],
    calories: 350,
    exercises: [
      {
        id: '1',
        name: 'Bench Press',
        sets: 4,
        reps: '8-10',
        weight: '135-155 lbs',
        restTime: '2-3 min',
        instructions: [
          'Lie flat on bench with feet firmly on ground',
          'Grip barbell slightly wider than shoulder width',
          'Lower bar to chest with control',
          'Press bar up explosively to starting position',
        ],
        targetMuscles: ['Chest', 'Triceps', 'Shoulders'],
        difficulty: 'Intermediate' as const,
        equipment: ['Barbell', 'Bench'],
      },
      {
        id: '2',
        name: 'Bent-Over Row',
        sets: 4,
        reps: '8-12',
        weight: '95-115 lbs',
        restTime: '2 min',
        instructions: [
          'Stand with feet hip-width apart, holding barbell',
          'Hinge at hips, keeping back straight',
          'Pull barbell to lower chest/upper abdomen',
          'Lower with control to starting position',
        ],
        targetMuscles: ['Back', 'Biceps'],
        difficulty: 'Intermediate' as const,
        equipment: ['Barbell'],
      },
      {
        id: '3',
        name: 'Overhead Press',
        sets: 3,
        reps: '10-12',
        weight: '75-95 lbs',
        restTime: '90 sec',
        instructions: [
          'Stand with feet shoulder-width apart',
          'Hold barbell at shoulder height',
          'Press barbell overhead until arms are fully extended',
          'Lower with control to starting position',
        ],
        targetMuscles: ['Shoulders', 'Triceps'],
        difficulty: 'Intermediate' as const,
        equipment: ['Barbell'],
      },
    ] as Exercise[],
  };

  const [selectedExercise, setSelectedExercise] = React.useState<Exercise | null>(null);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return THEME.colors.success;
      case 'Intermediate':
        return THEME.colors.warning;
      case 'Advanced':
        return THEME.colors.error;
      default:
        return THEME.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <TouchableOpacity style={styles.favoriteButton}>
          <Text style={styles.favoriteIcon}>♡</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Workout Info Card */}
        <Card style={styles.workoutCard} variant="elevated">
          <View style={styles.workoutHeader}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutDescription}>{workout.description}</Text>
            </View>
            <View style={styles.workoutIcon}>
              <Text style={styles.workoutEmoji}>💪</Text>
            </View>
          </View>

          {/* Workout Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workout.duration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getDifficultyColor(workout.difficulty) }]}>
                {workout.difficulty}
              </Text>
              <Text style={styles.statLabel}>Difficulty</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workout.calories}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
          </View>

          {/* Target Muscles */}
          <View style={styles.musclesContainer}>
            <Text style={styles.musclesTitle}>Target Muscles</Text>
            <View style={styles.musclesList}>
              {workout.targetMuscles.map((muscle, index) => (
                <View key={index} style={styles.muscleTag}>
                  <Text style={styles.muscleText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Equipment */}
          <View style={styles.equipmentContainer}>
            <Text style={styles.equipmentTitle}>Equipment Needed</Text>
            <View style={styles.equipmentList}>
              {workout.equipment.map((item, index) => (
                <View key={index} style={styles.equipmentTag}>
                  <Text style={styles.equipmentText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Exercises ({workout.exercises.length})</Text>

          {workout.exercises.map((exercise, index) => (
            <Card
              key={exercise.id}
              style={styles.exerciseCard}
              onPress={() => setSelectedExercise(exercise)}
            >
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.sets} sets × {exercise.reps} reps
                    {exercise.weight && ` • ${exercise.weight}`}
                  </Text>
                  <Text style={styles.exerciseRest}>Rest: {exercise.restTime}</Text>
                </View>
                <TouchableOpacity style={styles.exerciseArrow}>
                  <Text style={styles.exerciseArrowText}>→</Text>
                </TouchableOpacity>
              </View>

              {/* Target Muscles for Exercise */}
              <View style={styles.exerciseMuscles}>
                {exercise.targetMuscles.map((muscle, muscleIndex) => (
                  <View key={muscleIndex} style={styles.exerciseMuscleTag}>
                    <Text style={styles.exerciseMuscleText}>{muscle}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Start Workout Button */}
      <View style={styles.bottomContainer}>
        <Button
          title="Start Workout"
          onPress={onStartWorkout}
          variant="primary"
          size="lg"
          fullWidth
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
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  headerTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: THEME.spacing.md,
  },

  workoutCard: {
    marginVertical: THEME.spacing.md,
  },

  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },

  workoutInfo: {
    flex: 1,
  },

  workoutName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  workoutDescription: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },

  workoutIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spacing.md,
  },

  workoutEmoji: {
    fontSize: 24,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 2,
  },

  musclesContainer: {
    marginBottom: THEME.spacing.md,
  },

  musclesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  musclesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.xs,
  },

  muscleTag: {
    backgroundColor: THEME.colors.primary + '20',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.primary + '40',
  },

  muscleText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },

  equipmentContainer: {
    marginBottom: THEME.spacing.md,
  },

  equipmentTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.xs,
  },

  equipmentTag: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
  },

  equipmentText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  exercisesSection: {
    marginBottom: THEME.spacing.xxl,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  exerciseCard: {
    marginBottom: THEME.spacing.sm,
  },

  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },

  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.sm,
  },

  exerciseNumberText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs / 2,
  },

  exerciseDetails: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs / 2,
  },

  exerciseRest: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },

  exerciseArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  exerciseArrowText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  exerciseMuscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.xs / 2,
  },

  exerciseMuscleTag: {
    backgroundColor: THEME.colors.secondary + '20',
    paddingHorizontal: THEME.spacing.xs,
    paddingVertical: THEME.spacing.xs / 4,
    borderRadius: THEME.borderRadius.sm,
  },

  exerciseMuscleText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.secondary,
  },

  bottomContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
});
