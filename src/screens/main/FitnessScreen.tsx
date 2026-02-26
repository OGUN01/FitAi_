/**
 * FitnessScreen - World-Class Workout Tab
 *
 * REDESIGNED: Following HomeScreen pattern with modular components
 * Refactored to use useFitnessLogic hook for better maintainability.
 */

import React from "react";
import { View, StyleSheet, RefreshControl } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { WorkoutStartDialog } from "../../components/ui/CustomDialog";
import { ResponsiveTheme } from "../../utils/constants";
import { rh } from "../../utils/responsive";

// Hook
import { useFitnessLogic } from "../../hooks/useFitnessLogic";

// Modular Components
import {
  FitnessHeader,
  TodayWorkoutCard,
  WorkoutHistoryList,
  SuggestedWorkouts,
  RecoveryTipsModal,
} from "./fitness";
import { PlanSection } from "../../components/fitness/PlanSection";
import { GuestSignUpScreen } from "./GuestSignUpScreen";

interface FitnessScreenProps {
  navigation: any;
}

export const FitnessScreen: React.FC<FitnessScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, actions, setShowGuestSignUp } = useFitnessLogic(navigation);

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.animatedContainer}
        >
          <Animated.ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={actions.handleRefresh}
                tintColor={ResponsiveTheme.colors.primary}
                colors={[ResponsiveTheme.colors.primary]}
              />
            }
          >
            {/* 1. Header */}
            <FitnessHeader
              userName={state.userName || ""}
              weekNumber={state.weeklyWorkoutPlan?.weekNumber || 1}
              totalWorkouts={state.weekStats.totalWorkouts}
              completedWorkouts={state.weekStats.completedCount}
              onCalendarPress={actions.handleCalendarPress}
            />

            {/* 2. Selected Day's Workout Card (syncs with calendar selection) */}
            {state.weeklyWorkoutPlan && (
              <View style={styles.section}>
                <TodayWorkoutCard
                  workout={state.selectedDayWorkout as any}
                  isRestDay={state.isSelectedDayRestDay || (!state.selectedDayWorkout && !!state.weeklyWorkoutPlan)}
                  isCompleted={state.selectedDayProgress === 100}
                  progress={state.selectedDayProgress || 0}
                  onStartWorkout={actions.handleStartSelectedDayWorkout}
                  onViewDetails={actions.handleViewWorkoutDetails}
                  onRecoveryTips={actions.handleRecoveryTips}
                  selectedDay={state.selectedDay as any}
                  isToday={state.isSelectedDayToday}
                />
              </View>
            )}

            {/* 3. Weekly Plan Overview OR Empty State */}
            <PlanSection
              weeklyWorkoutPlan={state.weeklyWorkoutPlan}
              workoutProgress={state.workoutProgress}
              selectedDay={state.selectedDay}
              onDayPress={actions.setSelectedDay as any}
              onViewFullPlan={actions.handleViewFullPlan}
              onRegeneratePlan={actions.handleRegeneratePlan}
              isGeneratingPlan={state.isGeneratingPlan}
              profile={state.profile}
              onGeneratePlan={actions.generateWeeklyWorkoutPlan}
            />

            {/* 4. Workout History (from real data) */}
            <View style={styles.section}>
              <WorkoutHistoryList
                workouts={state.completedWorkouts}
                onRepeatWorkout={actions.handleRepeatWorkout}
                onDeleteWorkout={actions.handleDeleteWorkout}
                onViewWorkout={actions.handleViewHistoryWorkout}
              />
            </View>

            {/* 5. Suggested Workouts (if plan exists and has upcoming) */}
            {state.suggestedWorkouts.length > 0 && (
              <View style={styles.sectionNoHorizontalPadding}>
                <SuggestedWorkouts
                  workouts={state.suggestedWorkouts}
                  onStartWorkout={actions.handleStartSuggestedWorkout}
                />
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: insets.bottom + rh(90) }} />
          </Animated.ScrollView>
        </Animated.View>

        {/* Guest Sign Up Overlay */}
        {state.showGuestSignUp && (
          <GuestSignUpScreen
            onBack={() => setShowGuestSignUp(false)}
            onSignUpSuccess={() => setShowGuestSignUp(false)}
          />
        )}

        <WorkoutStartDialog
          visible={state.showWorkoutStartDialog}
          workoutTitle={state.selectedWorkout?.title || ""}
          onCancel={actions.handleWorkoutStartCancel}
          onConfirm={actions.handleWorkoutStartConfirm}
        />

        {/* Recovery Tips Modal */}
        <RecoveryTipsModal
          visible={state.showRecoveryTipsModal}
          onClose={actions.handleCloseRecoveryTips}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionNoHorizontalPadding: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
});

export default FitnessScreen;
