import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { DayMeal } from "../../types/ai";
import { completionTrackingService } from "../../services/completionTracking";
import { mealMotivationService } from "../../features/nutrition/MealMotivation";
import { haptics } from "../../utils/haptics";
import IngredientDetailModal from "../../components/nutrition/IngredientDetailModal";
import { useCookingVideo } from "../../hooks/useCookingVideo";
import { useCookingTimer } from "../../hooks/useCookingTimer";
import { useCookingFlow } from "../../hooks/useCookingFlow";
import VideoSection from "../../components/cooking/VideoSection";
import IngredientsSection from "../../components/cooking/IngredientsSection";
import CurrentStepDisplay from "../../components/cooking/CurrentStepDisplay";
import StepsList from "../../components/cooking/StepsList";
import NavigationButtons from "../../components/cooking/NavigationButtons";
import { colors } from "../../theme/aurora-tokens";
import { rf, rp } from "../../utils/responsive";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { AuroraBackground } from "../../components/ui/aurora";
import { AnimatedPressable } from "../../components/ui/aurora";

interface CookingSessionScreenProps {
  route: {
    params: {
      meal: DayMeal;
    };
  };
  navigation: any;
}

export default function CookingSessionScreen({
  route,
  navigation,
}: CookingSessionScreenProps) {
  const { meal } = route.params;

  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(
    null,
  );
  const [showIngredientModal, setShowIngredientModal] = useState(false);

  const { cookingVideo, isLoadingVideo, videoError, searchForCookingVideo } =
    useCookingVideo(meal.name);
  const { cookingTimer, startTimer, stopTimer, formatTimer } =
    useCookingTimer();
  // useCookingTimer's countdown is untied to any step index — a timer started
  // on step N keeps running (and its "Timer Complete!" alert still fires)
  // after the user navigates to a different step, with no indication which
  // step it belongs to. Tag the timer with the step that started it here and
  // auto-stop it when the user navigates away, so a running timer can never
  // outlive the step it was started for.
  const timerStepIndexRef = useRef<number | null>(null);
  const {
    cookingFlow,
    currentStepIndex,
    setCurrentStepIndex,
    completedSteps,
    markStepComplete,
    toggleStepComplete,
    goToNextStep,
    goToPreviousStep,
    scrollViewRef,
    registerStepRef,
  } = useCookingFlow(meal);

  const handleStartTimer = useCallback(
    (minutes: number) => {
      timerStepIndexRef.current = currentStepIndex;
      startTimer(minutes);
    },
    [currentStepIndex, startTimer],
  );

  const handleStopTimer = useCallback(() => {
    timerStepIndexRef.current = null;
    stopTimer();
  }, [stopTimer]);

  // Auto-stop a running timer the instant the user navigates away from the
  // step that started it (Next/Previous/tapping a StepsList row) — otherwise
  // it silently keeps counting down under whichever step is now current.
  useEffect(() => {
    if (
      timerStepIndexRef.current !== null &&
      timerStepIndexRef.current !== currentStepIndex
    ) {
      timerStepIndexRef.current = null;
      stopTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  const handleIngredientPress = useCallback((ingredient: string) => {
    setSelectedIngredient(ingredient);
    setShowIngredientModal(true);
  }, []);

  const completeCooking = useCallback(async () => {
    if (!cookingFlow) return;

    // The "Next Step" flow marks the step being LEFT as complete, so the
    // final step is only ever added here when the user goes straight from
    // "Next" to "Finish Cooking" without separately tapping "Mark Complete".
    // Compute the true final set synchronously so both the completion
    // payload and allStepsCompleted reflect it immediately.
    const finalCompletedSteps = new Set(completedSteps);
    finalCompletedSteps.add(currentStepIndex);
    markStepComplete(currentStepIndex);

    try {
      const success = await completionTrackingService.completeMeal(meal.id, {
        completedAt: new Date().toISOString(),
        source: "cooking_session",
        allStepsCompleted: finalCompletedSteps.size === cookingFlow.steps.length,
        totalSteps: cookingFlow.steps.length,
        completedSteps: finalCompletedSteps.size,
      });

      if (!success) {
        console.warn("completeMeal returned false — meal completion not recorded", meal.id);
      }
    } catch (error) {
      console.error("Error tracking meal completion:", error);
    }

    const completionMessage = mealMotivationService.getCompletionMessage(
      meal,
      {},
    );

    crossPlatformAlert("Cooking Complete!", completionMessage, [
      {
        text: "Enjoy Your Meal!",
        onPress: () => {
          navigation.navigate("Diet", {
            mealCompleted: true,
            completedMealId: meal.id,
            timestamp: Date.now(),
          });
        },
      },
    ]);
  }, [cookingFlow, completedSteps, currentStepIndex, markStepComplete, meal, navigation]);

  // cookingTime is optional on DayMeal — never fabricate one for display.
  useEffect(() => {
    if (meal.cookingTime == null) {
      console.warn(
        "CookingSessionScreen: meal.cookingTime is missing; cook time omitted from header",
        meal.id,
      );
    }
  }, [meal.id, meal.cookingTime]);

  const mealProgress = useMemo(() => {
    if (!cookingFlow) return 0;
    const totalSteps = cookingFlow.steps.length;
    const completedStepsCount = completedSteps.size;
    return totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;
  }, [cookingFlow, completedSteps]);

  return (
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              crossPlatformAlert(
                "Leave Cooking Session?",
                "Are you sure you want to exit? Your cooking progress will be lost.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Leave",
                    style: "destructive",
                    onPress: () => {
                      haptics.light();
                      navigation.goBack();
                    },
                  },
                ],
              );
            }}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.closeButton}
            accessibilityLabel="Close cooking session"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={rf(22)} color={colors.text.primary} />
          </AnimatedPressable>
          <View style={styles.headerContent}>
            <Text
              style={styles.mealName}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {meal.name}
            </Text>
            <Text
              style={styles.mealMeta}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Prep: {meal.preparationTime}m
              {meal.cookingTime != null ? ` • Cook: ${meal.cookingTime}m` : ""}{" "}
              • {meal.difficulty}
            </Text>
          </View>
        </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <VideoSection
          cookingVideo={cookingVideo}
          isLoadingVideo={isLoadingVideo}
          videoError={videoError}
          onRetry={searchForCookingVideo}
        />
        <IngredientsSection
          meal={meal}
          onIngredientPress={handleIngredientPress}
        />
        {cookingFlow && (
          <CurrentStepDisplay
            cookingFlow={cookingFlow}
            currentStepIndex={currentStepIndex}
            meal={meal}
            cookingTimer={cookingTimer}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            formatTimer={formatTimer}
            completedSteps={completedSteps}
          />
        )}
        {cookingFlow && (
          <StepsList
            cookingFlow={cookingFlow}
            currentStepIndex={currentStepIndex}
            completedSteps={completedSteps}
            onStepPress={setCurrentStepIndex}
            registerStepRef={registerStepRef}
          />
        )}
      </ScrollView>

      <NavigationButtons
        cookingFlow={cookingFlow}
        currentStepIndex={currentStepIndex}
        completedSteps={completedSteps}
        onPrevious={goToPreviousStep}
        onToggleComplete={() => toggleStepComplete(currentStepIndex)}
        onNext={goToNextStep}
        onFinish={completeCooking}
      />

      <IngredientDetailModal
        visible={showIngredientModal}
        onClose={() => setShowIngredientModal(false)}
        ingredientName={selectedIngredient || ""}
        meal={meal}
        onMealComplete={(mealId) => {
          navigation.navigate("Diet", {
            mealCompleted: true,
            completedMealId: mealId,
            timestamp: Date.now(),
          });
        }}
        mealProgress={mealProgress}
      />
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rp(20),
    paddingVertical: rp(16),
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: rp(16),
  },
  mealName: {
    fontSize: rf(20),
    fontWeight: "700",
    color: colors.text.primary,
  },
  mealMeta: {
    fontSize: rf(14),
    color: colors.text.secondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: rp(100),
  },
});
