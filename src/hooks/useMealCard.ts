import { useMemo, useState } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { haptics } from "../utils/haptics";
import { DayMeal, MealItem } from "../types/ai";
import { colors } from "../theme/aurora-tokens";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export const mealTypeGradients: Record<
  string,
  { colors: readonly [string, string, ...string[]]; icon: string }
> = {
  breakfast: {
    colors: ["#FF6B35", "#FFB74D"] as const,
    icon: "sunny",
  },
  lunch: {
    colors: ["#4CAF50", "#81C784"] as const,
    icon: "restaurant",
  },
  dinner: {
    colors: ["#FF6B35", "#FF8A5C"] as const,
    icon: "moon",
  },
  snack: {
    colors: ["#00D4FF", "#00FFFF"] as const,
    icon: "nutrition",
  },
  morning_snack: {
    colors: ["#FF9800", "#FFCC80"] as const,
    icon: "cafe",
  },
  afternoon_snack: {
    colors: ["#00D4FF", "#00FFFF"] as const,
    icon: "nutrition",
  },
};

export const macroColors = {
  protein: "#FF6B6B",
  carbs: "#4ECDC4",
  fat: "#FFC107",
};

interface UseMealCardProps {
  meal: DayMeal;
  progress?: number;
  macroTargets?: MacroTargets;
  onPress?: () => void;
  onStartMeal?: () => void;
  onCompleteMeal?: () => void;
}

export const useMealCard = ({
  meal,
  progress = 0,
  macroTargets,
  onPress,
  onStartMeal,
  onCompleteMeal,
}: UseMealCardProps) => {
  // Expand/collapse state for food items
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  // Get meal type config
  const mealConfig = mealTypeGradients[meal.type] || mealTypeGradients.lunch;

  // Get food items (items or foods alias)
  const foodItems: MealItem[] = meal.items || meal.foods || [];

  // Calculate macro percentages of daily target
  const macroPercentages = useMemo(() => {
    if (!macroTargets) {
      return { protein: 0, carbs: 0, fat: 0 };
    }

    const protein = meal.totalMacros?.protein || 0;
    const carbs = meal.totalMacros?.carbohydrates || 0;
    const fat = meal.totalMacros?.fat || 0;

    return {
      protein: Math.round(
        macroTargets.protein > 0
          ? Math.min((protein / macroTargets.protein) * 100, 100)
          : 0,
      ),
      carbs: Math.round(
        macroTargets.carbs > 0
          ? Math.min((carbs / macroTargets.carbs) * 100, 100)
          : 0,
      ),
      fat: Math.round(
        macroTargets.fat > 0
          ? Math.min((fat / macroTargets.fat) * 100, 100)
          : 0,
      ),
    };
  }, [meal.totalMacros, macroTargets]);

  // Completion state
  const isCompleted = progress >= 100;
  const isInProgress = progress > 0 && progress < 100;

  // Prep & cooking time
  const prepTime = meal.preparationTime || meal.prepTime || 0;
  const cookTime = meal.cookingTime || meal.cookTime || 0;
  const totalTime = prepTime + cookTime;

  // Fiber
  const fiber = meal.totalMacros?.fiber || 0;

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.95]),
  }));

  // Handlers
  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    pressed.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    haptics.selection();
    onPress?.();
  };

  const handleStartPress = () => {
    haptics.medium();
    onStartMeal?.();
  };

  const handleCompletePress = () => {
    if (!isCompleted) {
      haptics.success();
      onCompleteMeal?.();
    }
  };

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    haptics.light();
    setIsExpanded(!isExpanded);
  };

  return {
    state: {
      isExpanded,
      isCompleted,
      isInProgress,
    },
    data: {
      mealConfig,
      foodItems,
      macroPercentages,
      prepTime,
      cookTime,
      totalTime,
      fiber,
      animatedStyle,
    },
    actions: {
      handlePressIn,
      handlePressOut,
      handlePress,
      handleStartPress,
      handleCompletePress,
      toggleExpanded,
    },
  };
};
