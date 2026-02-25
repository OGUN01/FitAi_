// Hook for AI Meals Panel logic and state management

import { useState } from "react";
import { Alert } from "react-native";

export interface MealGenerationOption {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack" | "custom";
  title: string;
  emoji: string;
  description: string;
  color: string;
  suggestions: string[];
  estimatedTime: string;
}

export interface QuickActionOption {
  id: string;
  title: string;
  emoji: string;
  description: string;
  action: string;
}

export const mealOptions: MealGenerationOption[] = [
  {
    id: "breakfast",
    type: "breakfast",
    title: "Breakfast",
    emoji: "🌅",
    description: "Energizing morning meals to start your day right",
    color: "#f59e0b",
    suggestions: ["High protein", "Quick prep", "Fiber rich", "Brain boosting"],
    estimatedTime: "15-30 min",
  },
  {
    id: "lunch",
    type: "lunch",
    title: "Lunch",
    emoji: "☀️",
    description: "Balanced midday meals for sustained energy",
    color: "#10b981",
    suggestions: [
      "Balanced macros",
      "Office friendly",
      "Meal prep",
      "Light & fresh",
    ],
    estimatedTime: "20-45 min",
  },
  {
    id: "dinner",
    type: "dinner",
    title: "Dinner",
    emoji: "🌙",
    description: "Satisfying evening meals for recovery",
    color: "#FF8A5C",
    suggestions: [
      "Family friendly",
      "Comfort food",
      "Recovery focused",
      "Lean protein",
    ],
    estimatedTime: "30-60 min",
  },
  {
    id: "snack",
    type: "snack",
    title: "Healthy Snack",
    emoji: "🍎",
    description: "Smart snacking options for any time",
    color: "#f97316",
    suggestions: ["Pre-workout", "Post-workout", "Office snack", "Sweet treat"],
    estimatedTime: "5-15 min",
  },
  {
    id: "custom",
    type: "custom",
    title: "Custom Meal",
    emoji: "✨",
    description: "Personalized meal based on your specific needs",
    color: "#ec4899",
    suggestions: [
      "Goal-specific",
      "Dietary needs",
      "Cuisine preference",
      "Macros focused",
    ],
    estimatedTime: "Variable",
  },
];

export const quickActions: QuickActionOption[] = [
  {
    id: "daily_plan",
    title: "Full Day Plan",
    emoji: "📅",
    description: "Generate complete daily meal plan",
    action: "daily_plan",
  },
  {
    id: "meal_prep",
    title: "Meal Prep",
    emoji: "📦",
    description: "Batch cooking for the week",
    action: "meal_prep",
  },
  {
    id: "goal_focused",
    title: "Goal-Focused",
    emoji: "🎯",
    description: "Meals optimized for your goals",
    action: "goal_focused",
  },
  {
    id: "quick_easy",
    title: "Quick & Easy",
    emoji: "⚡",
    description: "Fast meals under 20 minutes",
    action: "quick_easy",
  },
];

export const useAIMealsPanel = (
  onGenerateMeal: (mealType: string, options?: any) => Promise<void>,
  profile?: any,
) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const handleMealGeneration = async (
    option: MealGenerationOption,
    customOptions?: any,
  ) => {
    try {
      const generationOptions = {
        mealType: option.type,
        userPreferences: profile,
        customOptions: customOptions || {},
        suggestions: selectedOptions,
      };

      await onGenerateMeal(option.type, generationOptions);

      // Reset selections after successful generation
      setSelectedOptions([]);
    } catch (error) {
      Alert.alert(
        "Generation Failed",
        "Failed to generate meal. Please try again.",
      );
    }
  };

  const handleQuickAction = async (action: QuickActionOption) => {
    try {
      await onGenerateMeal(action.action, {
        userPreferences: profile,
        actionType: action.action,
      });
    } catch (error) {
      Alert.alert(
        "Action Failed",
        `Failed to execute ${action.title}. Please try again.`,
      );
    }
  };

  const toggleSuggestion = (suggestion: string) => {
    setSelectedOptions((prev) =>
      prev.includes(suggestion)
        ? prev.filter((s) => s !== suggestion)
        : [...prev, suggestion],
    );
  };

  const getProfileStatus = () => {
    if (!profile)
      return { status: "incomplete", message: "Profile not available" };

    const missingItems = [];
    if (!profile.personalInfo) missingItems.push("Personal Info");
    if (!profile.fitnessGoals) missingItems.push("Fitness Goals");
    if (!profile.dietPreferences) missingItems.push("Diet Preferences");

    if (missingItems.length === 0) {
      return {
        status: "complete",
        message: "Profile complete - ready for personalized meals!",
      };
    } else {
      return {
        status: "partial",
        message: `Missing: ${missingItems.join(", ")}. Meals will be less personalized.`,
      };
    }
  };

  return {
    selectedOptions,
    handleMealGeneration,
    handleQuickAction,
    toggleSuggestion,
    getProfileStatus,
  };
};
