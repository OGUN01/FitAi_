import React from "react";
import { View, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { DayName } from "../../stores/appStateStore";

// Importing from screens/main/fitness as they are currently located there
// These should ideally be moved to components/fitness in a future refactor
import { WeeklyPlanOverview } from "../../screens/main/fitness/WeeklyPlanOverview";
import { EmptyPlanState } from "../../screens/main/fitness/EmptyPlanState";

interface PlanSectionProps {
  weeklyWorkoutPlan: any;
  workoutProgress: any;
  selectedDay: any;
  onDayPress: (day: DayName) => void;
  onViewFullPlan: () => void;
  onRegeneratePlan: () => void;
  isGeneratingPlan: boolean;
  profile: any;
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
          experienceLevel={profile?.fitnessGoals?.experience_level}
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
});
