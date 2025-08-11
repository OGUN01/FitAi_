import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { DayMeal } from '../../ai/weeklyMealGenerator';

interface MealSessionProps {
  route: {
    params: {
      meal: DayMeal;
    };
  };
  navigation: any;
}

export const MealSession: React.FC<MealSessionProps> = ({ route, navigation }) => {
  const { meal } = route.params;
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize completed steps array
  useEffect(() => {
    setCompletedSteps(new Array(meal.items.length).fill(false));
  }, [meal.items.length]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStarted && !isPaused) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getMealTypeIcon = (type: string) => {
    switch (type) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      case 'snack':
        return '🍎';
      default:
        return '🍽️';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return THEME.colors.success;
      case 'medium':
        return THEME.colors.warning;
      case 'hard':
        return THEME.colors.error;
      default:
        return THEME.colors.textSecondary;
    }
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setCurrentStep(0);
  };

  const handleStepComplete = (stepIndex: number) => {
    const newCompletedSteps = [...completedSteps];
    newCompletedSteps[stepIndex] = true;
    setCompletedSteps(newCompletedSteps);

    // Move to next step if not the last one
    if (stepIndex < meal.items.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else {
      // All steps completed
      handleMealComplete();
    }
  };

  const handleMealComplete = () => {
    Alert.alert(
      '🎉 Meal Completed!',
      `Congratulations! You've successfully prepared "${meal.name}". Enjoy your meal!`,
      [
        {
          text: 'Finish',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleQuit = () => {
    Alert.alert(
      'Quit Meal Preparation?',
      'Are you sure you want to quit? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const progress = (completedSteps.filter(Boolean).length / meal.items.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleQuit}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Meal Preparation</Text>
          <Text style={styles.headerSubtitle}>{formatTime(sessionTime)}</Text>
        </View>
        <TouchableOpacity style={styles.pauseButton} onPress={handlePauseResume}>
          <Text style={styles.pauseIcon}>{isPaused ? '▶️' : '⏸️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progress)}% Complete ({completedSteps.filter(Boolean).length}/
          {meal.items.length} ingredients)
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!sessionStarted ? (
          // Pre-session overview
          <View style={styles.overviewContainer}>
            <Card style={styles.mealOverviewCard} variant="elevated">
              <View style={styles.mealHeader}>
                <View style={styles.mealIconContainer}>
                  <Text style={styles.mealIcon}>{getMealTypeIcon(meal.type)}</Text>
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealDescription}>{meal.description}</Text>
                </View>
              </View>

              <View style={styles.mealStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{meal.totalCalories}</Text>
                  <Text style={styles.statLabel}>Calories</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{meal.preparationTime}min</Text>
                  <Text style={styles.statLabel}>Prep Time</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: getDifficultyColor(meal.difficulty) }]}>
                    {meal.difficulty}
                  </Text>
                  <Text style={styles.statLabel}>Difficulty</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{meal.items.length}</Text>
                  <Text style={styles.statLabel}>Ingredients</Text>
                </View>
              </View>
            </Card>

            {/* Ingredients List */}
            <View style={styles.ingredientsSection}>
              <Text style={styles.sectionTitle}>Ingredients Needed</Text>
              {meal.items.map((item, index) => (
                <Card key={index} style={styles.ingredientCard}>
                  <View style={styles.ingredientHeader}>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                    <Text style={styles.ingredientQuantity}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                  <View style={styles.ingredientDetails}>
                    <Text style={styles.ingredientCalories}>{item.calories} cal</Text>
                    <Text style={styles.ingredientCategory}>{item.category}</Text>
                  </View>
                </Card>
              ))}
            </View>

            <Button
              title="Start Cooking"
              onPress={handleStartSession}
              style={styles.startButton}
              size="lg"
            />
          </View>
        ) : (
          // Active session
          <View style={styles.sessionContainer}>
            {/* Current Step */}
            <Card style={styles.currentStepCard} variant="elevated">
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>
                  Step {currentStep + 1} of {meal.items.length}
                </Text>
                <Text style={styles.stepTitle}>Prepare {meal.items[currentStep]?.name}</Text>
              </View>

              <View style={styles.stepContent}>
                <View style={styles.stepDetails}>
                  <Text style={styles.stepQuantity}>
                    {meal.items[currentStep]?.quantity} {meal.items[currentStep]?.unit}
                  </Text>
                  <Text style={styles.stepCalories}>
                    {meal.items[currentStep]?.calories} calories
                  </Text>
                  <Text style={styles.stepTime}>
                    ~{meal.items[currentStep]?.preparationTime} minutes
                  </Text>
                </View>

                {meal.items[currentStep]?.instructions && (
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsTitle}>Instructions:</Text>
                    <Text style={styles.instructionsText}>
                      {meal.items[currentStep]?.instructions}
                    </Text>
                  </View>
                )}
              </View>

              <Button
                title="Mark Complete"
                onPress={() => handleStepComplete(currentStep)}
                style={styles.completeButton}
                disabled={completedSteps[currentStep]}
              />
            </Card>

            {/* All Steps Overview */}
            <View style={styles.stepsOverview}>
              <Text style={styles.sectionTitle}>All Ingredients</Text>
              {meal.items.map((item, index) => (
                <Card
                  key={index}
                  style={[
                    styles.stepOverviewCard,
                    index === currentStep && styles.currentStepOverview,
                    completedSteps[index] && styles.completedStepOverview,
                  ]}
                >
                  <View style={styles.stepOverviewContent}>
                    <View style={styles.stepOverviewLeft}>
                      <Text style={styles.stepOverviewNumber}>{index + 1}</Text>
                      <View style={styles.stepOverviewInfo}>
                        <Text style={styles.stepOverviewName}>{item.name}</Text>
                        <Text style={styles.stepOverviewQuantity}>
                          {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.stepOverviewRight}>
                      {completedSteps[index] ? (
                        <Text style={styles.stepCompleteIcon}>✅</Text>
                      ) : index === currentStep ? (
                        <Text style={styles.stepCurrentIcon}>👉</Text>
                      ) : (
                        <Text style={styles.stepPendingIcon}>⏳</Text>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    padding: THEME.spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: THEME.colors.primary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  pauseButton: {
    padding: THEME.spacing.sm,
  },
  pauseIcon: {
    fontSize: 20,
  },
  progressContainer: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
  },
  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xs,
  },
  content: {
    flex: 1,
    padding: THEME.spacing.md,
  },
  overviewContainer: {
    gap: THEME.spacing.md,
  },
  mealOverviewCard: {
    padding: THEME.spacing.md,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  mealIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  mealIcon: {
    fontSize: 28,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  mealDescription: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  mealStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  ingredientsSection: {
    gap: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  ingredientCard: {
    padding: THEME.spacing.md,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.colors.text,
  },
  ingredientQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  ingredientDetails: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  ingredientCalories: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  ingredientCategory: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textTransform: 'capitalize',
  },
  startButton: {
    marginTop: THEME.spacing.lg,
  },
  sessionContainer: {
    gap: THEME.spacing.md,
  },
  currentStepCard: {
    padding: THEME.spacing.md,
  },
  stepHeader: {
    marginBottom: THEME.spacing.md,
  },
  stepNumber: {
    fontSize: 14,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  stepContent: {
    marginBottom: THEME.spacing.md,
  },
  stepDetails: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  stepQuantity: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  stepCalories: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  stepTime: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  instructionsText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  completeButton: {
    marginTop: THEME.spacing.sm,
  },
  stepsOverview: {
    gap: THEME.spacing.sm,
  },
  stepOverviewCard: {
    padding: THEME.spacing.md,
  },
  currentStepOverview: {
    borderColor: THEME.colors.primary,
    borderWidth: 2,
  },
  completedStepOverview: {
    backgroundColor: THEME.colors.success + '10',
  },
  stepOverviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepOverviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepOverviewNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
    marginRight: THEME.spacing.md,
  },
  stepOverviewInfo: {
    flex: 1,
  },
  stepOverviewName: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.colors.text,
  },
  stepOverviewQuantity: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  stepOverviewRight: {
    marginLeft: THEME.spacing.md,
  },
  stepCompleteIcon: {
    fontSize: 20,
  },
  stepCurrentIcon: {
    fontSize: 20,
  },
  stepPendingIcon: {
    fontSize: 16,
  },
});
