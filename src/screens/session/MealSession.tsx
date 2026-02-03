import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Button, THEME } from "../../components/ui";
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
          {state.completedSteps.filter(Boolean).length}/{meal.items.length}{" "}
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
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
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
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
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
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginTop: THEME.spacing.xs,
  },
  content: {
    flex: 1,
    padding: THEME.spacing.md,
  },
  overviewContainer: {
    gap: THEME.spacing.md,
  },
  startButton: {
    marginTop: THEME.spacing.lg,
  },
  sessionContainer: {
    gap: THEME.spacing.md,
  },
});
