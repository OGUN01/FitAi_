import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
  const {
    cookingFlow,
    currentStepIndex,
    setCurrentStepIndex,
    completedSteps,
    markStepComplete,
    goToNextStep,
    goToPreviousStep,
    scrollViewRef,
  } = useCookingFlow(meal);

  const handleIngredientPress = (ingredient: string) => {
    setSelectedIngredient(ingredient);
    setShowIngredientModal(true);
  };

  const completeCooking = useCallback(async () => {
    if (!cookingFlow) return;

    try {
      const success = await completionTrackingService.completeMeal(meal.id, {
        completedAt: new Date().toISOString(),
        source: "cooking_session",
        allStepsCompleted: completedSteps.size === cookingFlow.steps.length,
        totalSteps: cookingFlow.steps.length,
        completedSteps: completedSteps.size,
      });

      if (success) {
      } else {
      }
    } catch (error) {
      console.error("❌ Error tracking meal completion:", error);
    }

    const completionMessage = mealMotivationService.getCompletionMessage(
      meal,
      {},
    );

    crossPlatformAlert("🎉 Cooking Complete!", completionMessage, [
      {
        text: "Enjoy Your Meal! 🍽️",
        onPress: () => {
          navigation.navigate("Diet", {
            mealCompleted: true,
            completedMealId: meal.id,
            timestamp: Date.now(),
          });
        },
      },
    ]);
  }, [cookingFlow, completedSteps, meal, navigation]);

  const mealProgress = (() => {
    if (!cookingFlow) return 0;
    const totalSteps = cookingFlow.steps.length;
    const completedStepsCount = completedSteps.size;
    return totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;
  })();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
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
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealMeta}>
            Prep: {meal.preparationTime}m • Cook: {meal.cookingTime || 10}m •{" "}
            {meal.difficulty}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            onStartTimer={startTimer}
            onStopTimer={stopTimer}
            formatTimer={formatTimer}
          />
        )}
        {cookingFlow && (
          <StepsList
            cookingFlow={cookingFlow}
            currentStepIndex={currentStepIndex}
            completedSteps={completedSteps}
            onStepPress={setCurrentStepIndex}
            scrollViewRef={scrollViewRef}
          />
        )}
      </ScrollView>

      <NavigationButtons
        cookingFlow={cookingFlow}
        currentStepIndex={currentStepIndex}
        completedSteps={completedSteps}
        onPrevious={goToPreviousStep}
        onToggleComplete={() => markStepComplete(currentStepIndex)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rp(20),
    paddingVertical: rp(16),
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerContent: {
    flex: 1,
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
});
