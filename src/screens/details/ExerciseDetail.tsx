import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Button } from "../../components/ui";
import {
  AuroraBackground,
  AuroraSpinner,
  GlassHeader,
  EmptyState,
} from "../../components/ui/aurora";
import { colors, spacing } from "../../theme/aurora-tokens";
import { rp, rw } from "../../utils/responsive";
import { useExerciseData } from "./hooks/useExerciseData";
import { useExerciseVisual } from "./hooks/useExerciseVisual";
import { useStepAnimation } from "./hooks/useStepAnimation";
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
      <AuroraBackground theme="space">
        <View style={styles.loadingContainer}>
          <AuroraSpinner size="lg" />
        </View>
      </AuroraBackground>
    );
  }

  if (!exercise) {
    return (
      <AuroraBackground theme="space">
        <GlassHeader title="Exercise Guide" onBack={onBack} />
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="barbell-outline"
            title="Exercise Not Found"
            subtitle="This exercise may have been removed or is not available."
            ctaText={onBack ? "Go Back" : undefined}
            onCta={onBack}
          />
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <GlassHeader
        title="Exercise Guide"
        onBack={onBack}
        rightAction={
          <View style={styles.side} />
        }
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
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  side: {
    width: rw(44),
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: rp(spacing.md),
  },
  bottomContainer: {
    padding: rp(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
});
