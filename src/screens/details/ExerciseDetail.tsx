import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import {
  AuroraBackground,
  AuroraSpinner,
  GlassHeader,
  EmptyState,
  AnimatedPressable,
} from '../../components/ui/aurora';
import { colors, spacing, typography, borderRadius } from '../../theme/aurora-tokens';
import { rf, rp } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';
import { titleCaseExerciseName } from '../../utils/textFormat';
import { useExerciseData } from './hooks/useExerciseData';
import { useExerciseVisual } from './hooks/useExerciseVisual';
import { useStepAnimation } from './hooks/useStepAnimation';
import { ExerciseInfoCard } from './components/ExerciseInfoCard';
import { ExerciseAnimation } from './components/ExerciseAnimation';
import { InstructionsList } from './components/InstructionsList';
import { ExerciseTipsCard } from './components/ExerciseTipsCard';

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
  const exercise = useExerciseData(exerciseId);
  const { isLoading, visualData, loadError, retry } = useExerciseVisual(exercise?.name);

  const displayInstructions: ExerciseInstruction[] =
    visualData?.instructions && visualData.instructions.length > 0
      ? visualData.instructions.map((inst: string, index: number) => ({
          step: index + 1,
          title: `Step ${index + 1}`,
          description: inst,
          tips: [],
        }))
      : exercise?.instructions || [];

  const { currentStep, isPlaying, setIsPlaying, animateToStep } = useStepAnimation(
    displayInstructions.length
  );

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
            ctaText={onBack ? 'Go Back' : undefined}
            onCta={onBack}
          />
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <GlassHeader title="Exercise Guide" onBack={onBack} rightAction={null} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ExerciseInfoCard
          name={titleCaseExerciseName(visualData?.name || exercise.name)}
          description={exercise.description || `Targets: ${displayTargetMuscles.join(', ')}`}
          difficulty={exercise.difficulty}
          sets={exercise.sets}
          reps={exercise.reps}
          weight={exercise.weight}
          restTime={exercise.restTime}
          targetMuscles={displayTargetMuscles}
        />

        {loadError && !visualData ? (
          <View style={styles.visualErrorWrap}>
            <Ionicons name="cloud-offline-outline" size={rf(24)} color={colors.error.DEFAULT} />
            <Text style={styles.visualErrorText} numberOfLines={2}>
              Couldn't load exercise animation
            </Text>
            <AnimatedPressable
              onPress={retry}
              style={styles.visualRetryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry loading animation"
            >
              <Text style={styles.visualRetryText}>Retry</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <ExerciseAnimation
            gifUrl={visualData?.gifUrl}
            isPlaying={isPlaying}
            currentStep={currentStep}
            instructionsCount={displayInstructions.length}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onStepChange={animateToStep}
          />
        )}

        <InstructionsList instructions={displayInstructions} currentStep={currentStep} />

        <ExerciseTipsCard tips={exercise.tips} safetyTips={exercise.safetyTips} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
        <Button
          title="Start Exercise"
          onPress={onStartExercise ?? (() => {})}
          disabled={!onStartExercise}
          variant="primary"
          size="lg"
          fullWidth
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
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
  visualErrorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rp(spacing.lg),
    gap: rp(spacing.sm),
  },
  visualErrorText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    textAlign: 'center',
  },
  visualRetryBtn: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.md,
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.15),
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    minHeight: 44,
    justifyContent: 'center',
  },
  visualRetryText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
});
