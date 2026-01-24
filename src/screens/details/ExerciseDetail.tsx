import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { Button, Card, THEME } from "../../components/ui";
import { useFitnessStore } from "../../stores/fitnessStore";
import { EXERCISES } from "../../data/exercises";
import {
  exerciseVisualService,
  ExerciseData,
} from "../../services/exerciseVisualService";

const { width: screenWidth } = Dimensions.get("window");

interface ExerciseInstruction {
  step: number;
  title: string;
  description: string;
  tips: string[];
}

interface ExerciseDetailProps {
  exerciseId: string;
  onBack?: () => void;
  onStartExercise?: () => void;
}

export const ExerciseDetail: React.FC<ExerciseDetailProps> = ({
  exerciseId,
  onBack,
  onStartExercise,
}) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [visualData, setVisualData] = useState<ExerciseData | null>(null);
  const animationValue = React.useRef(new Animated.Value(0)).current;

  const { weeklyWorkoutPlan } = useFitnessStore();

  // Find exercise from the current workout plan or static database
  const exercise = useMemo(() => {
    // First try to find in current workout plan
    if (weeklyWorkoutPlan?.workouts) {
      for (const workout of weeklyWorkoutPlan.workouts) {
        if (workout.exercises) {
          for (const ex of workout.exercises) {
            // WorkoutSet has exercise property or direct id match
            const exId = ex.id || (ex as any).exercise?.id;
            if (exId === exerciseId) {
              const exerciseInfo = (ex as any).exercise || ex;
              return {
                id: exerciseId,
                name: exerciseInfo.name || "Exercise",
                description: exerciseInfo.description || "",
                difficulty: exerciseInfo.difficulty || "intermediate",
                targetMuscles:
                  exerciseInfo.targetMuscles || exerciseInfo.muscleGroups || [],
                equipment: exerciseInfo.equipment || [],
                instructions: (exerciseInfo.instructions || []).map(
                  (inst: string, index: number) => ({
                    step: index + 1,
                    title: `Step ${index + 1}`,
                    description: inst,
                    tips: [],
                  }),
                ),
                sets: ex.sets || 3,
                reps: ex.reps?.toString() || "10-12",
                restTime: ex.restTime ? `${ex.restTime} seconds` : "60 seconds",
                weight: ex.weight || "",
                tips: exerciseInfo.tips || exerciseInfo.formTips || [],
                safetyTips: exerciseInfo.safetyConsiderations || [],
                commonMistakes: [],
              };
            }
          }
        }
      }
    }

    // Then try static exercise database
    const staticExercise = EXERCISES.find(
      (ex) =>
        ex.id === exerciseId ||
        ex.name.toLowerCase() === exerciseId.toLowerCase(),
    );
    if (staticExercise) {
      return {
        id: staticExercise.id,
        name: staticExercise.name,
        description: staticExercise.description,
        difficulty: staticExercise.difficulty,
        targetMuscles: staticExercise.muscleGroups,
        equipment: staticExercise.equipment,
        instructions: (staticExercise.instructions || []).map(
          (inst: string, index: number) => ({
            step: index + 1,
            title: `Step ${index + 1}`,
            description: inst,
            tips: [],
          }),
        ),
        sets: staticExercise.sets || 3,
        reps: staticExercise.reps || "10-12",
        restTime: staticExercise.restTime
          ? `${staticExercise.restTime} seconds`
          : "60 seconds",
        weight: "",
        tips: staticExercise.tips || [],
        safetyTips: [],
        commonMistakes: [],
      };
    }

    // Not found - return null
    return null;
  }, [weeklyWorkoutPlan, exerciseId]);

  // Fetch visual data (GIF) from exercise visual service
  useEffect(() => {
    async function fetchVisualData() {
      if (!exercise) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await exerciseVisualService.findExercise(exercise.name);
        if (result) {
          setVisualData(result.exercise);
        }
      } catch (error) {
        console.error("Failed to fetch exercise visual data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVisualData();
  }, [exercise?.name]);

  // Animation for step transitions
  const animateToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    Animated.timing(animationValue, {
      toValue: stepIndex,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Auto-play animation
  React.useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && exercise?.instructions?.length) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % exercise.instructions.length;
          animateToStep(nextStep);
          return nextStep;
        });
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, exercise?.instructions?.length]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return THEME.colors.success;
      case "intermediate":
        return THEME.colors.warning;
      case "advanced":
        return THEME.colors.error;
      default:
        return THEME.colors.textSecondary;
    }
  };

  const formatDifficulty = (difficulty: string) => {
    return (
      difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase()
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading exercise...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Exercise not found
  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercise Guide</Text>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyTitle}>Exercise Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This exercise may have been removed or is not available.
          </Text>
          <Button
            title="Go Back"
            onPress={onBack || (() => {})}
            variant="primary"
            style={{ marginTop: THEME.spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Merge visual data instructions if available
  const displayInstructions: ExerciseInstruction[] =
    visualData?.instructions && visualData.instructions.length > 0
      ? visualData.instructions.map((inst: string, index: number) => ({
          step: index + 1,
          title: `Step ${index + 1}`,
          description: inst,
          tips: [],
        }))
      : exercise.instructions;

  // Merge target muscles from visual data if available
  const displayTargetMuscles =
    visualData?.targetMuscles && visualData.targetMuscles.length > 0
      ? visualData.targetMuscles
      : exercise.targetMuscles;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Guide</Text>
        <TouchableOpacity style={styles.favoriteButton}>
          <Text style={styles.favoriteIcon}>♡</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Info */}
        <Card style={styles.exerciseCard} variant="elevated">
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>
                {visualData?.name || exercise.name}
              </Text>
              <Text style={styles.exerciseDescription}>
                {exercise.description ||
                  `Targets: ${displayTargetMuscles.join(", ")}`}
              </Text>
            </View>
            <View style={styles.difficultyBadge}>
              <Text
                style={[
                  styles.difficultyText,
                  { color: getDifficultyColor(exercise.difficulty) },
                ]}
              >
                {formatDifficulty(exercise.difficulty)}
              </Text>
            </View>
          </View>

          {/* Exercise Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.sets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.reps}</Text>
              <Text style={styles.statLabel}>Reps</Text>
            </View>
            {exercise.weight && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{exercise.weight}</Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.restTime}</Text>
              <Text style={styles.statLabel}>Rest</Text>
            </View>
          </View>

          {/* Target Muscles */}
          {displayTargetMuscles.length > 0 && (
            <View style={styles.musclesContainer}>
              <Text style={styles.musclesTitle}>Target Muscles</Text>
              <View style={styles.musclesList}>
                {displayTargetMuscles.map((muscle: string, index: number) => (
                  <View key={index} style={styles.muscleTag}>
                    <Text style={styles.muscleText}>{muscle}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Animation/GIF Display */}
        <Card style={styles.animationCard}>
          <View style={styles.animationContainer}>
            {visualData?.gifUrl ? (
              <Image
                source={{ uri: visualData.gifUrl }}
                style={styles.exerciseGif}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.animationPlaceholder}>
                <Text style={styles.animationEmoji}>🏋️‍♂️</Text>
                <Text style={styles.animationText}>Exercise Animation</Text>
              </View>
            )}

            {/* Animation Controls */}
            {displayInstructions.length > 1 && (
              <View style={styles.animationControls}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => setIsPlaying(!isPlaying)}
                >
                  <Text style={styles.playButtonText}>
                    {isPlaying ? "⏸️" : "▶️"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.stepIndicators}>
                  {displayInstructions.map((_, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.stepIndicator,
                        currentStep === index && styles.stepIndicatorActive,
                      ]}
                      onPress={() => animateToStep(index)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Instructions */}
        {displayInstructions.length > 0 && (
          <Card style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>
              Step-by-Step Instructions
            </Text>

            {displayInstructions.map(
              (instruction: ExerciseInstruction, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.instructionItem,
                    currentStep === index && styles.instructionItemActive,
                  ]}
                >
                  <View style={styles.instructionHeader}>
                    <View
                      style={[
                        styles.stepNumber,
                        currentStep === index && styles.stepNumberActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNumberText,
                          currentStep === index && styles.stepNumberTextActive,
                        ]}
                      >
                        {instruction.step}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.instructionTitle,
                        currentStep === index && styles.instructionTitleActive,
                      ]}
                    >
                      {instruction.title}
                    </Text>
                  </View>

                  <Text style={styles.instructionDescription}>
                    {instruction.description}
                  </Text>

                  {instruction.tips.length > 0 && (
                    <View style={styles.tipsContainer}>
                      <Text style={styles.tipsTitle}>Tips:</Text>
                      {instruction.tips.map((tip: string, tipIndex: number) => (
                        <Text key={tipIndex} style={styles.tipText}>
                          • {tip}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ),
            )}
          </Card>
        )}

        {/* Tips */}
        {exercise.tips.length > 0 && (
          <Card style={styles.safetyCard}>
            <Text style={styles.safetyTitle}>Tips</Text>
            {exercise.tips.map((tip: string, index: number) => (
              <Text key={index} style={styles.safetyTip}>
                • {tip}
              </Text>
            ))}
          </Card>
        )}

        {/* Safety Tips */}
        {exercise.safetyTips.length > 0 && (
          <Card style={styles.mistakesCard}>
            <Text style={styles.mistakesTitle}>Safety Considerations</Text>
            {exercise.safetyTips.map((tip: string, index: number) => (
              <Text key={index} style={styles.mistakeText}>
                • {tip}
              </Text>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Start Exercise Button */}
      <View style={styles.bottomContainer}>
        <Button
          title="Start Exercise"
          onPress={onStartExercise || (() => {})}
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },

  emptyTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  emptySubtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },

  favoriteIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: THEME.spacing.md,
  },

  exerciseCard: {
    marginVertical: THEME.spacing.md,
  },

  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: THEME.spacing.md,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  exerciseDescription: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },

  difficultyBadge: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.md,
    marginLeft: THEME.spacing.md,
  },

  difficultyText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  statLabel: {
    fontSize: THEME.fontSize.xs,
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
  },

  muscleTag: {
    backgroundColor: THEME.colors.primary + "20",
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.primary + "40",
  },

  muscleText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },

  animationCard: {
    marginBottom: THEME.spacing.md,
  },

  animationContainer: {
    alignItems: "center",
  },

  exerciseGif: {
    width: screenWidth - 64,
    height: 200,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.md,
  },

  animationPlaceholder: {
    width: screenWidth - 64,
    height: 200,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.md,
  },

  animationEmoji: {
    fontSize: 48,
    marginBottom: THEME.spacing.sm,
  },

  animationText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  animationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.md,
  },

  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  playButtonText: {
    fontSize: 20,
  },

  stepIndicators: {
    flexDirection: "row",
    gap: THEME.spacing.xs,
  },

  stepIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.surface,
  },

  stepIndicatorActive: {
    backgroundColor: THEME.colors.primary,
  },

  instructionsCard: {
    marginBottom: THEME.spacing.md,
  },

  instructionsTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  instructionItem: {
    marginBottom: THEME.spacing.lg,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },

  instructionItemActive: {
    backgroundColor: THEME.colors.primary + "10",
    borderColor: THEME.colors.primary + "30",
  },

  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: THEME.spacing.sm,
  },

  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: THEME.spacing.sm,
  },

  stepNumberActive: {
    backgroundColor: THEME.colors.primary,
  },

  stepNumberText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.textSecondary,
  },

  stepNumberTextActive: {
    color: THEME.colors.white,
  },

  instructionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  instructionTitleActive: {
    color: THEME.colors.primary,
  },

  instructionDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.sm,
  },

  tipsContainer: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },

  tipsTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  tipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: THEME.spacing.xs / 2,
  },

  safetyCard: {
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.success + "10",
    borderWidth: 1,
    borderColor: THEME.colors.success + "30",
  },

  safetyTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.success,
    marginBottom: THEME.spacing.sm,
  },

  safetyTip: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.xs,
  },

  mistakesCard: {
    marginBottom: THEME.spacing.xxl,
    backgroundColor: THEME.colors.warning + "10",
    borderWidth: 1,
    borderColor: THEME.colors.warning + "30",
  },

  mistakesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.warning,
    marginBottom: THEME.spacing.sm,
  },

  mistakeText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.xs,
  },

  bottomContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
});
