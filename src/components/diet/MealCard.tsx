import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Card, THEME } from '../ui';
import { DayMeal } from '../../ai/weeklyMealGenerator';

interface MealCardProps {
  meal: DayMeal;
  onViewDetails?: (meal: DayMeal) => void;
  onStartMeal?: (meal: DayMeal) => void;
  progress?: number;
  style?: any;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onViewDetails,
  onStartMeal,
  progress = 0,
  style,
}) => {
  const getMealTypeIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return THEME.colors.success;
      case 'medium': return THEME.colors.warning;
      case 'hard': return THEME.colors.error;
      default: return THEME.colors.textSecondary;
    }
  };

  const getMealTypeColor = (type: string) => {
    switch (type) {
      case 'breakfast': return '#FF9500';
      case 'lunch': return '#34C759';
      case 'dinner': return '#5856D6';
      case 'snack': return '#FF3B30';
      default: return THEME.colors.primary;
    }
  };

  const isCompleted = progress >= 100;
  const isInProgress = progress > 0 && progress < 100;

  return (
    <Card style={[styles.card, style]} variant="elevated">
      {/* Progress Bar */}
      {progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      )}
      
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <View style={[styles.iconContainer, { backgroundColor: getMealTypeColor(meal.type) + '15' }]}>
                <Text style={styles.mealTypeIcon}>
                  {getMealTypeIcon(meal.type)}
                </Text>
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={2}>
                  {meal.name}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.mealTypeBadge}>
                    <Text style={[styles.mealTypeText, { color: getMealTypeColor(meal.type) }]}>
                      {meal.type.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[
                    styles.difficultyBadge,
                    { backgroundColor: getDifficultyColor(meal.difficulty) }
                  ]}>
                    <Text style={styles.difficultyText}>
                      {meal.difficulty.toUpperCase()}
                    </Text>
                  </View>
                  {meal.aiGenerated && (
                    <View style={styles.aiPillBadge}>
                      <Text style={styles.aiPillText}>✨ AI</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Text style={styles.description} numberOfLines={3}>
              {meal.description}
            </Text>
          </View>
        </View>

        {/* Nutrition Stats */}
        <View style={styles.nutritionSection}>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{meal.totalCalories}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{Math.round(meal.totalMacros.protein)}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{Math.round(meal.totalMacros.carbohydrates)}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{Math.round(meal.totalMacros.fat)}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Meal Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>⏱️</Text>
            <Text style={styles.detailText}>{meal.preparationTime} min</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🥘</Text>
            <Text style={styles.detailText}>{meal.items.length} ingredients</Text>
          </View>
        </View>

        {/* Progress Bar (if meal is in progress) */}
        {isInProgress && (
          <View style={styles.progressSection}>
            <View style={styles.mealProgressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {onStartMeal && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                isCompleted && styles.completedButton
              ]}
              onPress={() => {
                console.log('🔴 MealCard: Start Meal button pressed for:', meal.name);
                console.log('🔴 MealCard: onStartMeal function available:', !!onStartMeal);
                if (onStartMeal) {
                  onStartMeal(meal);
                } else {
                  console.error('❌ MealCard: onStartMeal function not provided');
                }
              }}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[
                styles.actionButtonText,
                styles.primaryButtonText,
                isCompleted && styles.completedButtonText
              ]}>
                {isCompleted ? '✓ Completed' : isInProgress ? 'Continue' : 'Start Meal'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );
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
    padding: THEME.spacing.xl,
  },
  
  header: {
    marginBottom: THEME.spacing.lg,
  },
  
  titleSection: {
    flex: 1,
  },
  
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  
  mealTypeIcon: {
    fontSize: 24,
  },
  
  titleContainer: {
    flex: 1,
  },
  
  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: '700',
    color: THEME.colors.text,
    lineHeight: 28,
    marginBottom: THEME.spacing.xs,
  },
  
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
    marginTop: THEME.spacing.xs,
  },
  
  mealTypeBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: THEME.colors.background,
    borderRadius: 6,
  },
  
  mealTypeText: {
    fontSize: THEME.fontSize.xs,
    fontWeight: '600',
  },
  
  difficultyBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: 6,
  },
  
  difficultyText: {
    fontSize: THEME.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.surface,
  },
  
  aiPillBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: THEME.colors.primary + '20',
    borderRadius: 12,
  },
  
  aiPillText: {
    fontSize: THEME.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  
  description: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  
  nutritionSection: {
    marginBottom: THEME.spacing.lg,
  },
  
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.background,
    borderRadius: 12,
    padding: THEME.spacing.md,
  },
  
  nutritionItem: {
    alignItems: 'center',
  },
  
  nutritionValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  
  nutritionLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: THEME.spacing.lg,
  },
  
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  detailIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.sm,
  },
  
  detailText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  
  progressSection: {
    marginBottom: THEME.spacing.md,
  },
  
  mealProgressBar: {
    height: 6,
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: 3,
    marginBottom: THEME.spacing.xs,
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.success,
    borderRadius: 3,
  },
  
  progressText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  
  actionSection: {
    marginTop: THEME.spacing.md,
  },
  
  actionButton: {
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  primaryButton: {
    backgroundColor: THEME.colors.primary,
  },
  
  completedButton: {
    backgroundColor: THEME.colors.success,
  },
  
  actionButtonText: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
  },
  
  primaryButtonText: {
    color: THEME.colors.surface,
  },
  
  completedButtonText: {
    color: THEME.colors.surface,
  },
});
