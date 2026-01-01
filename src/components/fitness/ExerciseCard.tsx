import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, LayoutAnimation } from 'react-native';
import { Card, THEME } from '../ui';
import { Exercise, WorkoutSet } from '../../types/workout';

interface ExerciseCardProps {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  exerciseNumber: number;
  isCompleted?: boolean;
  onComplete?: () => void;
  onStart?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  showTimer?: boolean;
  remainingTime?: number;
  style?: any;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  workoutSet,
  exerciseNumber,
  isCompleted = false,
  onComplete,
  onStart,
  expanded = false,
  onToggleExpand,
  showTimer = false,
  remainingTime = 0,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggleExpand?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatReps = (reps: number | string) => {
    if (typeof reps === 'string') return reps;
    return reps.toString();
  };

  const getMuscleGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      chest: '#FF6B6B',
      back: '#4ECDC4',
      shoulders: '#45B7D1',
      biceps: '#96CEB4',
      triceps: '#FFEAA7',
      legs: '#DDA0DD',
      abs: '#98D8C8',
      glutes: '#F7DC6F',
      cardio: '#FF7675',
      flexibility: '#A29BFE',
    };
    return colors[group.toLowerCase()] || THEME.colors.primary;
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '🟢';
      case 'intermediate':
        return '🟡';
      case 'advanced':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <Card style={[styles.card, isCompleted && styles.cardCompleted, style]} variant="outlined">
      <TouchableOpacity style={styles.cardContent} onPress={handleToggleExpand} activeOpacity={0.7}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.exerciseNumber}>
            <Text style={styles.exerciseNumberText}>{exerciseNumber}</Text>
          </View>

          <View style={styles.titleSection}>
            <Text style={[styles.exerciseName, isCompleted && styles.exerciseNameCompleted]}>
              {exercise.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {workoutSet.sets} sets × {formatReps(workoutSet.reps)} reps
              </Text>
              {workoutSet.weight && <Text style={styles.metaText}> • {workoutSet.weight}kg</Text>}
              {workoutSet.duration && (
                <Text style={styles.metaText}> • {formatTime(workoutSet.duration)}</Text>
              )}
            </View>
          </View>

          <View style={styles.statusSection}>
            {isCompleted ? (
              <View style={styles.completedBadge}>
                <Text style={styles.completedIcon}>✓</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.playButton} onPress={onStart}>
                <Text style={styles.playIcon}>▶️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Timer Display */}
        {showTimer && remainingTime > 0 && (
          <View style={styles.timerSection}>
            <View style={styles.timerDisplay}>
              <Text style={styles.timerText}>Rest: {formatTime(remainingTime)}</Text>
            </View>
          </View>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Exercise Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🎯</Text>
                <Text style={styles.detailLabel}>Difficulty:</Text>
                <Text style={styles.detailValue}>
                  {getDifficultyIcon(exercise.difficulty)} {exercise.difficulty}
                </Text>
              </View>

              {workoutSet.restTime && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>⏱️</Text>
                  <Text style={styles.detailLabel}>Rest time:</Text>
                  <Text style={styles.detailValue}>{formatTime(workoutSet.restTime)}</Text>
                </View>
              )}

              {exercise.calories && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>🔥</Text>
                  <Text style={styles.detailLabel}>Calories:</Text>
                  <Text style={styles.detailValue}>{exercise.calories} per set</Text>
                </View>
              )}
            </View>

            {/* Muscle Groups */}
            {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
              <View style={styles.muscleGroupsSection}>
                <Text style={styles.sectionTitle}>Target Muscles</Text>
                <View style={styles.muscleGroupsContainer}>
                  {exercise.muscleGroups.map((group) => (
                    <View
                      key={`muscle-${group}`}
                      style={[
                        styles.muscleGroupChip,
                        { backgroundColor: getMuscleGroupColor(group) },
                      ]}
                    >
                      <Text style={styles.muscleGroupText}>{group.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Equipment */}
            {exercise.equipment && exercise.equipment.length > 0 && (
              <View style={styles.equipmentSection}>
                <Text style={styles.sectionTitle}>Equipment Needed</Text>
                <View style={styles.equipmentContainer}>
                  {exercise.equipment.map((item) => (
                    <View key={`equipment-${item}`} style={styles.equipmentChip}>
                      <Text style={styles.equipmentText}>{item.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <View style={styles.instructionsSection}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {exercise.instructions.map((instruction, index) => (
                  <View key={`instruction-${index}-${instruction.substring(0, 20)}`} style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>{index + 1}.</Text>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Tips */}
            {exercise.tips && exercise.tips.length > 0 && (
              <View style={styles.tipsSection}>
                <Text style={styles.sectionTitle}>💡 Tips</Text>
                {exercise.tips.map((tip) => (
                  <Text key={`tip-${tip.substring(0, 30)}`} style={styles.tipText}>
                    • {tip}
                  </Text>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {!isCompleted ? (
                <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedStatus}>
                  <Text style={styles.completedStatusText}>✓ Completed</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Expand/Collapse Indicator */}
        <View style={styles.expandIndicator}>
          <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: THEME.spacing.md,
  },

  cardCompleted: {
    backgroundColor: `${THEME.colors.success}08`,
    borderColor: THEME.colors.success,
  },

  cardContent: {
    padding: THEME.spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },

  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },

  exerciseNumberText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
  },

  titleSection: {
    flex: 1,
  },

  exerciseName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: 4,
  },

  exerciseNameCompleted: {
    color: THEME.colors.success,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  statusSection: {
    alignItems: 'center',
  },

  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },

  completedIcon: {
    color: THEME.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  playIcon: {
    fontSize: 14,
  },

  timerSection: {
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },

  timerDisplay: {
    backgroundColor: THEME.colors.warning,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },

  timerText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
  },

  expandedContent: {
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  detailsSection: {
    marginBottom: THEME.spacing.md,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },

  detailIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.sm,
    width: 20,
  },

  detailLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginRight: THEME.spacing.sm,
    minWidth: 80,
  },

  detailValue: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  muscleGroupsSection: {
    marginBottom: THEME.spacing.md,
  },

  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.xs,
  },

  muscleGroupChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  muscleGroupText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    textTransform: 'capitalize',
  },

  equipmentSection: {
    marginBottom: THEME.spacing.md,
  },

  equipmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.xs,
  },

  equipmentChip: {
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  equipmentText: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    textTransform: 'capitalize',
  },

  instructionsSection: {
    marginBottom: THEME.spacing.md,
  },

  instructionItem: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.sm,
  },

  instructionNumber: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginRight: THEME.spacing.sm,
    minWidth: 20,
  },

  instructionText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    flex: 1,
    lineHeight: 20,
  },

  tipsSection: {
    marginBottom: THEME.spacing.md,
  },

  tipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
    lineHeight: 18,
  },

  actionButtons: {
    alignItems: 'center',
    marginTop: THEME.spacing.md,
  },

  completeButton: {
    backgroundColor: THEME.colors.success,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },

  completeButtonText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
  },

  completedStatus: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
  },

  completedStatusText: {
    color: THEME.colors.success,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
  },

  expandIndicator: {
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },

  expandIcon: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
});
