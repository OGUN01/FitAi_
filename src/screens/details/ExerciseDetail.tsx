import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Button, Card, THEME } from "../../components/ui";

const { width: screenWidth } = Dimensions.get("window");

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
  const animationValue = React.useRef(new Animated.Value(0)).current;

  // Mock exercise data
  const exercise = {
    id: exerciseId,
    name: "Bench Press",
    description:
      "A compound upper body exercise that primarily targets the chest, shoulders, and triceps",
    difficulty: "Intermediate",
    targetMuscles: ["Chest", "Triceps", "Shoulders"],
    equipment: ["Barbell", "Bench"],
    instructions: [
      {
        step: 1,
        title: "Setup Position",
        description:
          "Lie flat on the bench with your feet firmly planted on the ground. Your eyes should be directly under the barbell.",
        tips: [
          "Keep your back flat against the bench",
          "Maintain a slight arch in your lower back",
        ],
      },
      {
        step: 2,
        title: "Grip the Bar",
        description:
          "Grip the barbell with hands slightly wider than shoulder-width apart. Use an overhand grip.",
        tips: [
          "Wrap your thumbs around the bar",
          "Keep wrists straight and strong",
        ],
      },
      {
        step: 3,
        title: "Unrack the Weight",
        description:
          "Lift the bar off the rack and position it directly over your chest with arms fully extended.",
        tips: ["Move slowly and controlled", "Engage your core for stability"],
      },
      {
        step: 4,
        title: "Lower the Bar",
        description:
          "Slowly lower the bar to your chest, keeping your elbows at about a 45-degree angle.",
        tips: [
          "Control the descent",
          "Touch your chest lightly",
          "Keep your shoulders back",
        ],
      },
      {
        step: 5,
        title: "Press Up",
        description:
          "Drive the bar back up to the starting position, focusing on pushing through your chest.",
        tips: [
          "Exhale during the press",
          "Keep the bar path straight",
          "Fully extend your arms",
        ],
      },
    ],
    sets: 4,
    reps: "8-10",
    restTime: "2-3 minutes",
    weight: "135-155 lbs",
    safetyTips: [
      "Always use a spotter when lifting heavy weights",
      "Warm up thoroughly before starting",
      "Never bounce the bar off your chest",
      "Keep your feet on the ground throughout the movement",
    ],
    commonMistakes: [
      "Arching the back excessively",
      "Flaring elbows too wide",
      "Pressing the bar toward the face",
      "Using too much weight too soon",
    ],
  };

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

    if (isPlaying) {
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
  }, [isPlaying, exercise.instructions.length]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return THEME.colors.success;
      case "Intermediate":
        return THEME.colors.warning;
      case "Advanced":
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
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDescription}>
                {exercise.description}
              </Text>
            </View>
            <View style={styles.difficultyBadge}>
              <Text
                style={[
                  styles.difficultyText,
                  { color: getDifficultyColor(exercise.difficulty) },
                ]}
              >
                {exercise.difficulty}
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
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.weight}</Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exercise.restTime}</Text>
              <Text style={styles.statLabel}>Rest</Text>
            </View>
          </View>

          {/* Target Muscles */}
          <View style={styles.musclesContainer}>
            <Text style={styles.musclesTitle}>Target Muscles</Text>
            <View style={styles.musclesList}>
              {exercise.targetMuscles.map((muscle, index) => (
                <View key={index} style={styles.muscleTag}>
                  <Text style={styles.muscleText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Animation/Video Placeholder */}
        <Card style={styles.animationCard}>
          <View style={styles.animationContainer}>
            <View style={styles.animationPlaceholder}>
              <Text style={styles.animationEmoji}>🏋️‍♂️</Text>
              <Text style={styles.animationText}>Exercise Animation</Text>
            </View>

            {/* Animation Controls */}
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
                {exercise.instructions.map((_, index) => (
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
          </View>
        </Card>

        {/* Instructions */}
        <Card style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>
            Step-by-Step Instructions
          </Text>

          {exercise.instructions.map((instruction, index) => (
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
                  <Text style={styles.tipsTitle}>💡 Tips:</Text>
                  {instruction.tips.map((tip, tipIndex) => (
                    <Text key={tipIndex} style={styles.tipText}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </Card>

        {/* Safety Tips */}
        <Card style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>⚠️ Safety Tips</Text>
          {exercise.safetyTips.map((tip, index) => (
            <Text key={index} style={styles.safetyTip}>
              • {tip}
            </Text>
          ))}
        </Card>

        {/* Common Mistakes */}
        <Card style={styles.mistakesCard}>
          <Text style={styles.mistakesTitle}>❌ Common Mistakes</Text>
          {exercise.commonMistakes.map((mistake, index) => (
            <Text key={index} style={styles.mistakeText}>
              • {mistake}
            </Text>
          ))}
        </Card>
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
    backgroundColor: THEME.colors.error + "10",
    borderWidth: 1,
    borderColor: THEME.colors.error + "30",
  },

  safetyTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.error,
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
