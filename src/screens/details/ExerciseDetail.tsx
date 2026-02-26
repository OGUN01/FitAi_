import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Button } from "../../components/ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf } from '../../utils/responsive';
import { useExerciseData } from "./hooks/useExerciseData";
import { useExerciseVisual } from "./hooks/useExerciseVisual";
import { useStepAnimation } from "./hooks/useStepAnimation";
import { ExerciseHeader } from "./components/ExerciseHeader";
import { ExerciseInfoCard } from "./components/ExerciseInfoCard";
import { ExerciseAnimation } from "./components/ExerciseAnimation";
import { InstructionsList } from "./components/InstructionsList";
import { ExerciseTipsCard } from "./components/ExerciseTipsCard";

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
  const [isFavorited, setIsFavorited] = useState(false);

  const exercise = useExerciseData(exerciseId);
  const { isLoading, visualData } = useExerciseVisual(exercise?.name);

  const displayInstructions: ExerciseInstruction[] =
    visualData?.instructions && visualData.instructions.length > 0
      ? visualData.instructions.map((inst: string, index: number) => ({
          step: index + 1,
          title: `Step ${index + 1}`,
          description: inst,
          tips: [],
        }))
      : exercise?.instructions || [];

  const { currentStep, isPlaying, setIsPlaying, animateToStep } =
    useStepAnimation(displayInstructions.length);

  const displayTargetMuscles =
    visualData?.targetMuscles && visualData.targetMuscles.length > 0
      ? visualData.targetMuscles
      : exercise?.targetMuscles || [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading exercise...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <ExerciseHeader
          onBack={onBack}
          isFavorited={false}
          onToggleFavorite={() => {}}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyTitle}>Exercise Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This exercise may have been removed or is not available.
          </Text>
          <Button
            title="Go Back"
            onPress={onBack ?? (() => {})}
            disabled={!onBack}
            variant="primary"
            style={{ marginTop: ResponsiveTheme.spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ExerciseHeader
        onBack={onBack}
        isFavorited={isFavorited}
        onToggleFavorite={() => setIsFavorited(!isFavorited)}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ExerciseInfoCard
          name={visualData?.name || exercise.name}
          description={
            exercise.description ||
            `Targets: ${displayTargetMuscles.join(", ")}`
          }
          difficulty={exercise.difficulty}
          sets={exercise.sets}
          reps={exercise.reps}
          weight={exercise.weight}
          restTime={exercise.restTime}
          targetMuscles={displayTargetMuscles}
        />

        <ExerciseAnimation
          gifUrl={visualData?.gifUrl}
          isPlaying={isPlaying}
          currentStep={currentStep}
          instructionsCount={displayInstructions.length}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onStepChange={animateToStep}
        />

        <InstructionsList
          instructions={displayInstructions}
          currentStep={currentStep}
        />

        <ExerciseTipsCard
          tips={exercise.tips}
          safetyTips={exercise.safetyTips}
        />
      </ScrollView>

      <View style={styles.bottomContainer}>
        <Button
          title="Start Exercise"
          onPress={onStartExercise ?? (() => {})}
          disabled={!onStartExercise}
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
    backgroundColor: ResponsiveTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.xl,
  },
  emptyIcon: {
    fontSize: rf(64),
    marginBottom: ResponsiveTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },
  bottomContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.background,
  },
});
