import { useState, useEffect } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { DayMeal } from "../types/ai";
import completionTrackingService from "../services/completionTracking";
import { ResponsiveTheme } from "../utils/constants";

interface UseMealSessionLogicProps {
  meal: DayMeal;
  navigation: any;
}

export const useMealSessionLogic = ({
  meal,
  navigation,
}: UseMealSessionLogicProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize completed steps array
  useEffect(() => {
    setCompletedSteps(new Array(meal.items?.length ?? 0).fill(false));
  }, [meal.items?.length]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStarted && !isPaused) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getMealTypeIcon = (type: string) => {
    switch (type) {
      case "breakfast":
        return "🌅";
      case "lunch":
        return "☀️";
      case "dinner":
        return "🌙";
      case "snack":
        return "🍎";
      default:
        return "🍽️";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return ResponsiveTheme.colors.success;
      case "medium":
        return ResponsiveTheme.colors.warning;
      case "hard":
        return ResponsiveTheme.colors.error;
      default:
        return ResponsiveTheme.colors.textSecondary;
    }
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setCurrentStep(0);
  };

  const handleStepComplete = (stepIndex: number) => {
    const newCompletedSteps = [...completedSteps];
    newCompletedSteps[stepIndex] = true;
    setCompletedSteps(newCompletedSteps);

    // Move to next step if not the last one
    if (stepIndex < (meal.items?.length ?? 0) - 1) {
      setCurrentStep(stepIndex + 1);
    } else {
      // All steps completed
      handleMealComplete();
    }
  };

  const handleMealComplete = async () => {
    try {
      await completionTrackingService.completeMeal(meal.id, {
        completedAt: new Date().toISOString(),
        source: "meal_session",
        sessionTime,
      });
      crossPlatformAlert(
        "🎉 Meal Completed!",
        `Congratulations! You've successfully prepared "${meal.name}". Enjoy your meal!`,
        [
          {
            text: "Finish",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      console.error("[MealSession] completeMeal failed:", error);
      crossPlatformAlert("Error", "Failed to record meal completion. Please try again.");
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleQuit = () => {
    crossPlatformAlert(
      "Quit Meal Preparation?",
      "Are you sure you want to quit? Your progress will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Quit",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const progress =
    (completedSteps.filter(Boolean).length / (meal.items?.length || 1)) * 100;

  return {
    state: {
      currentStep,
      completedSteps,
      sessionStarted,
      sessionTime,
      isPaused,
      progress,
      currentItem: meal.items[currentStep],
    },
    actions: {
      handleStartSession,
      handleStepComplete,
      handlePauseResume,
      handleQuit,
    },
    helpers: {
      formatTime,
      getMealTypeIcon,
      getDifficultyColor,
    },
  };
};
