import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Card, Button, THEME } from '../ui';
import { Workout } from '../../types/workout';

interface WorkoutCardProps {
  workout: Workout;
  onStart: () => void;
  onViewDetails?: () => void;
  isInProgress?: boolean;
  progress?: number; // 0-100
  style?: any;
  animatedValue?: Animated.Value;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  workout,
  onStart,
  onViewDetails,
  isInProgress = false,
  progress = 0,
  style,
  animatedValue,
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return THEME.colors.success;
      case 'intermediate': return THEME.colors.warning;
      case 'advanced': return THEME.colors.error;
      default: return THEME.colors.textSecondary;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      strength: '💪',
      cardio: '🏃',
      flexibility: '🧘',
      hiit: '🔥',
      yoga: '🕉️',
      pilates: '🤸',
      hybrid: '⚡',
    };
    return icons[category] || '🏋️';
  };

  const getEquipmentText = (equipment: string[]) => {
    if (equipment.length === 0 || equipment.includes('none')) {
      return 'No equipment';
    }
    if (equipment.length === 1) {
      return equipment[0].replace('_', ' ');
    }
    return `${equipment.length} equipment types`;
  };

  const getMuscleGroupText = (groups: string[]) => {
    if (groups.length === 0) return 'Full body';
    if (groups.length <= 2) {
      return groups.join(', ').replace(/_/g, ' ');
    }
    return `${groups.length} muscle groups`;
  };

  const cardContent = (
    <Card style={[styles.card, style]} variant="elevated">
      {/* Progress Bar */}
      {progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      )}

      <TouchableOpacity
        style={styles.cardContent}
        onPress={onViewDetails}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.categoryIcon}>
                  {getCategoryIcon(workout.category)}
                </Text>
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={2}>
                  {workout.title}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={[
                    styles.difficultyBadge,
                    { backgroundColor: getDifficultyColor(workout.difficulty) }
                  ]}>
                    <Text style={styles.difficultyText}>
                      {workout.difficulty.toUpperCase()}
                    </Text>
                  </View>
                  {workout.aiGenerated && (
                    <View style={styles.aiPillBadge}>
                      <Text style={styles.aiPillText}>✨ AI</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Text style={styles.description} numberOfLines={3}>
              {workout.description}
            </Text>
          </View>
        </View>

        {/* Progress Bar (if workout is in progress) */}
        {isInProgress && (
          <View style={styles.progressSection}>
            <View style={styles.workoutProgressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
          </View>
        )}

        {/* Workout Details */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>⏱️</Text>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{workout.duration} min</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🔥</Text>
            <Text style={styles.detailLabel}>Calories</Text>
            <Text style={styles.detailValue}>{workout.estimatedCalories}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🎯</Text>
            <Text style={styles.detailLabel}>Exercises</Text>
            <Text style={styles.detailValue}>{workout.exercises.length}</Text>
          </View>
        </View>

        {/* Equipment & Target Muscles */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏋️</Text>
            <Text style={styles.infoText}>{getEquipmentText(workout.equipment)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>💪</Text>
            <Text style={styles.infoText}>{getMuscleGroupText(workout.targetMuscleGroups)}</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionSection}>
          <Button
            title={isInProgress ? "Continue Workout" : "Start Workout"}
            onPress={onStart}
            variant={isInProgress ? "secondary" : "primary"}
            style={styles.startButton}
            size="lg"
          />
        </View>

        {/* Additional Info */}
        {workout.tags && workout.tags.length > 0 && (
          <View style={styles.tagsSection}>
            {workout.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {workout.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{workout.tags.length - 3} more</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );

  // Wrap with animation if provided
  if (animatedValue) {
    return (
      <Animated.View
        style={{
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          }],
        }}
      >
        {cardContent}
      </Animated.View>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    marginBottom: THEME.spacing.lg,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: THEME.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  progressContainer: {
    height: 4,
    backgroundColor: THEME.colors.border,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  progressBar: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },
  
  cardContent: {
    padding: THEME.spacing.lg,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  
  titleSection: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },
  
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },

  categoryIcon: {
    fontSize: 24,
  },

  titleContainer: {
    flex: 1,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
    marginTop: THEME.spacing.xs,
  },
  
  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    flex: 1,
  },
  
  aiPillBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: THEME.spacing.sm,
  },
  
  aiPillText: {
    color: THEME.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  
  description: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  difficultyText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.bold,
  },
  
  progressSection: {
    marginBottom: THEME.spacing.md,
  },

  workoutProgressBar: {
    height: 6,
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: 3,
    marginBottom: THEME.spacing.xs,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  
  progressText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  detailIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  
  detailLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  
  detailValue: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  infoSection: {
    marginBottom: THEME.spacing.md,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  
  infoIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.sm,
    width: 20,
  },
  
  infoText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  
  actionSection: {
    marginBottom: THEME.spacing.sm,
  },
  
  startButton: {
    width: '100%',
  },
  
  tagsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: THEME.spacing.sm,
  },
  
  tag: {
    backgroundColor: THEME.colors.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: THEME.spacing.xs,
    marginBottom: THEME.spacing.xs,
  },
  
  tagText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  
  moreTagsText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
});