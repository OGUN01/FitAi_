import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
} from "react-native";
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
    toggleStepCompletion,
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
      console.log("🍽️ Marking meal as completed:", meal.name, "ID:", meal.id);
      const success = await completionTrackingService.completeMeal(meal.id, {
        completedAt: new Date().toISOString(),
        source: "cooking_session",
        allStepsCompleted: completedSteps.size === cookingFlow.steps.length,
        totalSteps: cookingFlow.steps.length,
        completedSteps: completedSteps.size,
      });

      if (success) {
        console.log("✅ Meal completion tracked successfully");
      } else {
        console.warn("⚠️ Failed to track meal completion, but continuing...");
      }
    } catch (error) {
      console.error("❌ Error tracking meal completion:", error);
    }

    const completionMessage = mealMotivationService.getCompletionMessage(
      meal,
      {},
    );

    Alert.alert("🎉 Cooking Complete!", completionMessage, [
      {
        text: "Enjoy Your Meal! 🍽️",
        onPress: () => {
          console.log("🔙 Navigating back to diet screen with completion flag");
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
    return Math.round((completedStepsCount / totalSteps) * 100);
  })();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            haptics.light();
            navigation.goBack();
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
        onToggleComplete={() => toggleStepCompletion(currentStepIndex)}
        onNext={goToNextStep}
        onFinish={completeCooking}
      />

      <IngredientDetailModal
        visible={showIngredientModal}
        onClose={() => setShowIngredientModal(false)}
        ingredientName={selectedIngredient || ""}
        meal={meal}
        onMealComplete={(mealId) => {
          console.log(
            "🍽️ CookingSessionScreen: Meal completed from ingredient modal:",
            mealId,
          );
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  mealName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
  },
  mealMeta: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
});
