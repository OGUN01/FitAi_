import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme/aurora-tokens';
import { rp } from '../../utils/responsive';
import { DayName } from '../../stores/appStateStore';
import { WeeklyWorkoutPlan } from '../../ai';
import { WorkoutProgress } from '../../stores/fitness/types';

// Importing from screens/main/fitness as they are currently located there
// These should ideally be moved to components/fitness in a future refactor
import { WeeklyPlanOverview } from '../../screens/main/fitness/WeeklyPlanOverview';
import { EmptyPlanState } from '../../screens/main/fitness/EmptyPlanState';

/**
 * PlanSection — composition wrapper for the WEEK PLAN area.
 * Children are flat (no GlassCard wrappers); the progress row
 * (WeekProgressCard, rendered by FitnessScreen) and this week strip read as
 * one cohesive section separated by spacing.lg gaps.
 */

// Minimal shape actually consumed by PlanSection/EmptyPlanState. FitnessScreen
// passes a locally-merged profile object (personalInfo + SSOT fitnessGoals)
// that has no single exported type, so this is scoped to exactly what's read
// here rather than importing/duplicating the full onboarding profile shape.
// experience_level is typed as `string` (not the narrower EmptyPlanState
// union) because the upstream FitnessGoals type (types/user.ts) declares it
// as `string` — narrowed only at the EmptyPlanState boundary below, where the
// value is expected to genuinely be one of the three known levels.
interface PlanSectionProfile {
  fitnessGoals?: {
    experience_level?: string;
    primaryGoals?: string[];
  } | null;
}

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

interface PlanSectionProps {
  weeklyWorkoutPlan: WeeklyWorkoutPlan | null;
  workoutProgress: Record<string, WorkoutProgress>;
  selectedDay: DayName;
  onDayPress: (day: DayName) => void;
  onViewFullPlan: () => void;
  /** Omit for custom plans — regenerate is an AI-plan-only action. */
  onRegeneratePlan?: () => void;
  isGeneratingPlan: boolean;
  profile: PlanSectionProfile | null;
  onGeneratePlan: () => void;
}

export const PlanSection: React.FC<PlanSectionProps> = ({
  weeklyWorkoutPlan,
  workoutProgress,
  selectedDay,
  onDayPress,
  onViewFullPlan,
  onRegeneratePlan,
  isGeneratingPlan,
  profile,
  onGeneratePlan,
}) => {
  return (
    <View style={styles.section}>
      {weeklyWorkoutPlan ? (
        <WeeklyPlanOverview
          plan={weeklyWorkoutPlan}
          workoutProgress={workoutProgress}
          selectedDay={selectedDay}
          onDayPress={onDayPress}
          onViewFullPlan={onViewFullPlan}
          onRegeneratePlan={onRegeneratePlan}
          isRegenerating={isGeneratingPlan}
        />
      ) : (
        <EmptyPlanState
          experienceLevel={profile?.fitnessGoals?.experience_level as ExperienceLevel | undefined}
          primaryGoals={profile?.fitnessGoals?.primaryGoals}
          isGenerating={isGeneratingPlan}
          onGeneratePlan={onGeneratePlan}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: rp(spacing.lg),
    marginBottom: rp(spacing.lg),
    gap: rp(spacing.lg),
  },
});
