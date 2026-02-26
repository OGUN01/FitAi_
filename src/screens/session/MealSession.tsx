import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rh } from '../../utils/responsive';
import { useMealSessionLogic } from "../../hooks/useMealSessionLogic";
import { MealOverviewCard } from "../../components/session/MealOverviewCard";
import { IngredientsList } from "../../components/session/IngredientsList";
import { CurrentStepCard } from "../../components/session/CurrentStepCard";
import { StepsOverview } from "../../components/session/StepsOverview";
import { DayMeal } from "../../types/ai";

interface MealSessionProps {
  route: {
    params: {
      meal: DayMeal;
    };
  };
  navigation: any;
}

export const MealSession: React.FC<MealSessionProps> = ({
  route,
  navigation,
}) => {
  const { meal } = route.params;
  const { state, actions, helpers } = useMealSessionLogic({ meal, navigation });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={actions.handleQuit}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Meal Preparation</Text>
          <Text style={styles.headerSubtitle}>
            {helpers.formatTime(state.sessionTime)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={actions.handlePauseResume}
        >
          <Text style={styles.pauseIcon}>{state.isPaused ? "▶️" : "⏸️"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${state.progress}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(state.progress)}% Complete (
          {state.completedSteps.filter(Boolean).length}/{meal.items?.length ?? 0}{" "}
          ingredients)
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!state.sessionStarted ? (
          <View style={styles.overviewContainer}>
            <MealOverviewCard
              meal={meal}
              getMealTypeIcon={helpers.getMealTypeIcon}
              getDifficultyColor={helpers.getDifficultyColor}
            />
            <IngredientsList meal={meal} />
            <Button
              title="Start Cooking"
              onPress={actions.handleStartSession}
              style={styles.startButton}
              size="lg"
            />
          </View>
        ) : (
          <View style={styles.sessionContainer}>
            <CurrentStepCard
              meal={meal}
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
              onStepComplete={actions.handleStepComplete}
            />
            <StepsOverview
              meal={meal}
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },
  backButton: {
    padding: ResponsiveTheme.spacing.sm,
  },
  backIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.primary,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  pauseButton: {
    padding: ResponsiveTheme.spacing.sm,
  },
  pauseIcon: {
    fontSize: rf(20),
  },
  progressContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.surface,
  },
  progressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.border,
    borderRadius: rbr(4),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  progressText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.xs,
  },
  content: {
    flex: 1,
    padding: ResponsiveTheme.spacing.md,
  },
  overviewContainer: {
    gap: ResponsiveTheme.spacing.md,
  },
  startButton: {
    marginTop: ResponsiveTheme.spacing.lg,
  },
  sessionContainer: {
    gap: ResponsiveTheme.spacing.md,
  },
});
