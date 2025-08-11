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
import { DayMeal } from '../../ai/weeklyMealGenerator';
import completionTrackingService from '../../services/completionTracking';
import { useAuth } from '../../hooks/useAuth';
import { useNutritionData } from '../../hooks/useNutritionData';

interface MealSessionScreenProps {
  route: {
    params: {
      meal: DayMeal;
      logId?: string;
    };
  };
  navigation: any;
}

interface IngredientProgress {
  itemIndex: number;
  isCompleted: boolean;
  notes?: string;
}

export const MealSessionScreen: React.FC<MealSessionScreenProps> = ({ route, navigation }) => {
  const { meal, logId } = route.params;
  const { user } = useAuth();
  const { loadDailyNutrition } = useNutritionData();

  // State management
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [ingredientProgress, setIngredientProgress] = useState<IngredientProgress[]>(
    meal.items.map((_, index) => ({
      itemIndex: index,
      isCompleted: false,
    }))
  );
  const [mealStartTime] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(1));

  const totalSteps = meal.items.length;
  const completedSteps = ingredientProgress.filter((ip) => ip.isCompleted).length;
  const overallProgress = completedSteps / totalSteps;

  // Animation when changing steps
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStepIndex]);

  // Handle ingredient completion
  const handleIngredientComplete = async (itemIndex: number) => {
    const newProgress = [...ingredientProgress];
    newProgress[itemIndex].isCompleted = !newProgress[itemIndex].isCompleted;

    setIngredientProgress(newProgress);

    // Update overall meal progress
    const completedItems = newProgress.filter((ip) => ip.isCompleted).length;
    const progressPercentage = Math.round((completedItems / totalSteps) * 100);

    try {
      await completionTrackingService.updateMealProgress(meal.id, progressPercentage, {
        logId,
        itemIndex,
        completedItems,
        totalItems: totalSteps,
      });
    } catch (error) {
      console.error('Failed to update meal progress:', error);
    }
  };

  // Navigate to next step
  const goToNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStepIndex(currentStepIndex + 1);
      });
    } else {
      completeMeal();
    }
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStepIndex(currentStepIndex - 1);
      });
    }
  };

  // Complete meal
  const completeMeal = async () => {
    const preparationTime = Math.round((new Date().getTime() - mealStartTime.getTime()) / 60000);

    try {
      // Mark meal as completed in the tracking service
      const success = await completionTrackingService.completeMeal(
        meal.id,
        {
          logId,
          preparationTime,
          itemsCompleted: completedSteps,
          totalItems: totalSteps,
          completedAt: new Date().toISOString(),
        },
        user?.id || 'dev-user-001'
      );

      if (success) {
        // Refresh nutrition data to update calorie display
        try {
          await loadDailyNutrition();
          console.log('✅ Daily nutrition data refreshed after meal completion');
        } catch (refreshError) {
          console.warn('⚠️ Failed to refresh nutrition data:', refreshError);
        }

        Alert.alert(
          '🍽️ Meal Complete!',
          `Delicious! You prepared "${meal.name}" in ${preparationTime} minutes.\n\nCalories: ~${meal.totalCalories}\nIngredients used: ${completedSteps}/${totalSteps}`,
          [
            {
              text: 'View Nutrition',
              onPress: () => {
                navigation.navigate('Diet');
              },
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
              style: 'default',
            },
          ]
        );
      } else {
        throw new Error('Failed to save meal completion');
      }
    } catch (error) {
      console.error('Error completing meal:', error);
      Alert.alert(
        'Meal Complete!',
        `Delicious! You prepared "${meal.name}" in ${preparationTime} minutes.\n\nNote: Progress may not have been saved.`,
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  // Exit meal preparation
  const exitMeal = async () => {
    const hasProgress = completedSteps > 0;

    if (hasProgress) {
      Alert.alert(
        'Exit Meal Preparation?',
        `You've completed ${completedSteps}/${totalSteps} ingredients. Your progress will be saved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save & Exit',
            onPress: async () => {
              try {
                const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
                await completionTrackingService.updateMealProgress(meal.id, progressPercentage, {
                  logId,
                  partialCompletion: true,
                  exitedAt: new Date().toISOString(),
                });
              } catch (error) {
                console.error('Failed to save progress:', error);
              }
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Exit Meal Preparation?',
        'Are you sure you want to exit? No progress has been made.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    }
  };

  const currentItem = meal.items[currentStepIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={exitMeal} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.mealTitle}>{meal.name}</Text>
          <Text style={styles.progressText}>
            Step {currentStepIndex + 1} of {totalSteps}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.timerText}>
            {Math.round((new Date().getTime() - mealStartTime.getTime()) / 60000)}m
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${overallProgress * 100}%` }]} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
          {/* Current Ingredient/Step */}
          <Card style={styles.stepCard} variant="elevated">
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{currentItem.name}</Text>
              <View style={styles.stepDetails}>
                <Text style={styles.stepDetailText}>
                  Quantity: {currentItem.quantity || '1 serving'}
                </Text>
                {currentItem.calories && (
                  <Text style={styles.stepDetailText}>{currentItem.calories} cal</Text>
                )}
              </View>
            </View>

            {/* Ingredient Status */}
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  ingredientProgress[currentStepIndex]?.isCompleted && styles.statusButtonCompleted,
                ]}
                onPress={() => handleIngredientComplete(currentStepIndex)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    ingredientProgress[currentStepIndex]?.isCompleted &&
                      styles.statusButtonTextCompleted,
                  ]}
                >
                  {ingredientProgress[currentStepIndex]?.isCompleted ? '✓ Added' : 'Mark as Added'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Preparation Notes */}
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Preparation Notes</Text>
              <Text style={styles.notesText}>
                {currentItem.preparation ||
                  meal.instructions ||
                  'Add this ingredient to your meal preparation.'}
              </Text>
            </View>
          </Card>

          {/* Meal Overview */}
          <Card style={styles.overviewCard} variant="outlined">
            <Text style={styles.overviewTitle}>Meal Overview</Text>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{meal.totalCalories || 0}</Text>
                <Text style={styles.overviewLabel}>Calories</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{meal.preparationTime || 30}</Text>
                <Text style={styles.overviewLabel}>Minutes</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{meal.difficulty || 'Easy'}</Text>
                <Text style={styles.overviewLabel}>Difficulty</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>
                  {completedSteps}/{totalSteps}
                </Text>
                <Text style={styles.overviewLabel}>Progress</Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <Button
          title="Previous"
          onPress={goToPreviousStep}
          variant="outline"
          disabled={currentStepIndex === 0}
          style={styles.navButton}
        />

        <Button
          title={currentStepIndex === totalSteps - 1 ? 'Finish Meal' : 'Next'}
          onPress={goToNextStep}
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

  mealTitle: {
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

  stepContainer: {
    marginTop: THEME.spacing.lg,
  },

  stepCard: {
    padding: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },

  stepHeader: {
    marginBottom: THEME.spacing.lg,
  },

  stepTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  stepDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.spacing.lg,
  },

  stepDetailText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },

  statusContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },

  statusButton: {
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.border,
    borderWidth: 2,
    borderColor: THEME.colors.border,
  },

  statusButtonCompleted: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },

  statusButtonText: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },

  statusButtonTextCompleted: {
    color: THEME.colors.surface,
  },

  notesContainer: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.lg,
    borderRadius: 12,
  },

  notesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  notesText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },

  overviewCard: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },

  overviewTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: '600',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  overviewItem: {
    alignItems: 'center',
  },

  overviewValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  overviewLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
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
