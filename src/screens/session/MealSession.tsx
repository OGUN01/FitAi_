import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "../../components/ui";
import { colors, spacing } from "../../theme/aurora-tokens";
import { gradientProgressRing } from "../../theme/gradients";
import { rf, rp, rbr, rh } from '../../utils/responsive';
import { useMealSessionLogic } from "../../hooks/useMealSessionLogic";
import { MealOverviewCard } from "../../components/session/MealOverviewCard";
import { IngredientsList } from "../../components/session/IngredientsList";
import { CurrentStepCard } from "../../components/session/CurrentStepCard";
import { StepsOverview } from "../../components/session/StepsOverview";
import { DayMeal } from "../../types/ai";
import { AuroraBackground } from "../../components/ui/aurora";
import { AnimatedPressable } from "../../components/ui/aurora";

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
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AnimatedPressable
            style={styles.backButton}
            onPress={actions.handleQuit}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary.DEFAULT} />
          </AnimatedPressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Meal Preparation</Text>
            <Text style={styles.headerSubtitle}>
              {helpers.formatTime(state.sessionTime)}
            </Text>
          </View>
          <AnimatedPressable
            style={styles.pauseButton}
            onPress={actions.handlePauseResume}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            accessibilityLabel={state.isPaused ? "Resume session" : "Pause session"}
            accessibilityRole="button"
          >
            <Ionicons
              name={state.isPaused ? "play" : "pause"}
              size={24}
              color={colors.primary.DEFAULT}
            />
          </AnimatedPressable>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={gradientProgressRing.primary.colors as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
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
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: rf(14),
    color: colors.text.secondary,
    marginTop: rp(2),
  },
  pauseButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  progressContainer: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    backgroundColor: colors.background.secondary,
  },
  progressBar: {
    height: rh(8),
    backgroundColor: colors.background.tertiary,
    borderRadius: rbr(4),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rbr(4),
  },
  progressText: {
    fontSize: rf(12),
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: rp(spacing.xs),
  },
  content: {
    flex: 1,
    padding: rp(spacing.md),
  },
  overviewContainer: {
    gap: rp(spacing.md),
  },
  startButton: {
    marginTop: rp(spacing.lg),
  },
  sessionContainer: {
    gap: rp(spacing.md),
  },
});
