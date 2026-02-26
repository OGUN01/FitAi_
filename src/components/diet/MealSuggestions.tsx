import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  PanResponder,
  Alert,
  StyleSheet,
} from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { haptics } from "../../utils/haptics";
import { ResponsiveTheme } from "../../utils/constants";
import { rw } from "../../utils/responsive";
import { useProfileStore } from "../../stores/profileStore";
import { getCuisineDataForCountry } from "../../data/regionalCuisineData";
import type { CuisineFoodItem } from "../../data/regionalCuisineData";
import { colors } from "../../theme/aurora-tokens";
import { useNutritionStore } from "../../stores";
import type { Meal } from "../../types/diet/meal";

/** Max number of meal suggestions shown at a time */
const MAX_SUGGESTIONS = 5;

interface MealSuggestion {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Filter meals from the cuisine database based on the user's diet_type.
 *
 * - vegetarian / vegan → only isVegetarian items
 * - pescatarian → vegetarian items (fish items in the DB are tagged non-veg,
 *   but the cuisine data doesn't have a separate "fish" flag, so we include
 *   all items whose name contains common fish keywords OR are vegetarian)
 * - non-veg → all items
 */
function filterMealsByDiet(
  meals: CuisineFoodItem[],
  dietType: string | undefined,
): CuisineFoodItem[] {
  switch (dietType) {
    case "vegetarian":
    case "vegan":
      return meals.filter((m) => m.isVegetarian);
    case "pescatarian": {
      const fishKeywords = [
        "fish",
        "salmon",
        "prawn",
        "shrimp",
        "tuna",
        "sea bass",
        "sushi",
      ];
      return meals.filter(
        (m) =>
          m.isVegetarian ||
          fishKeywords.some((kw) => m.name.toLowerCase().includes(kw)),
      );
    }
    case "non-veg":
    default:
      return meals;
  }
}

/** Map CuisineFoodItem[] to the card data format, capped at MAX_SUGGESTIONS */
function mapToSuggestions(items: CuisineFoodItem[]): MealSuggestion[] {
  return items.slice(0, MAX_SUGGESTIONS).map((item, idx) => ({
    id: idx + 1,
    name: item.name,
    calories: item.caloriesPerServing,
    protein: item.proteinPerServing,
    carbs: item.carbsPerServing,
    fat: item.fatPerServing,
  }));
}

export const MealSuggestions: React.FC = () => {
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const dietPreferences = useProfileStore((s) => s.dietPreferences);
  const addDailyMeal = useNutritionStore((s) => s.addDailyMeal);

  const suggestions = useMemo<MealSuggestion[]>(() => {
    const country = personalInfo?.country ?? "global";
    const dietType = dietPreferences?.diet_type;

    // For vegetarian/vegan we can use the dedicated helper for clarity,
    // but filterMealsByDiet handles all cases uniformly.
    const cuisineData = getCuisineDataForCountry(country);
    const filtered = filterMealsByDiet(cuisineData.typicalMeals, dietType);
    return mapToSuggestions(filtered);
  }, [personalInfo?.country, dietPreferences?.diet_type]);

  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(
    new Set(),
  );
  const [suggestionSwipeStates, setSuggestionSwipeStates] = useState<
    Record<number, { translateY: Animated.Value; opacity: Animated.Value }>
  >({});
  const [cardFlipStates, setCardFlipStates] = useState<
    Record<number, Animated.Value>
  >({});
  const [addedToPlan, setAddedToPlan] = useState<Set<number>>(new Set());

  const getCardFlipState = (cardId: number): Animated.Value => {
    if (!cardFlipStates[cardId]) {
      const newFlip = new Animated.Value(0);
      setCardFlipStates((prev) => ({ ...prev, [cardId]: newFlip }));
      return newFlip;
    }
    return cardFlipStates[cardId];
  };

  const getSuggestionSwipeState = (suggestionId: number) => {
    if (!suggestionSwipeStates[suggestionId]) {
      const newState = {
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(1),
      };
      setSuggestionSwipeStates((prev) => ({
        ...prev,
        [suggestionId]: newState,
      }));
      return newState;
    }
    return suggestionSwipeStates[suggestionId];
  };

  const handleAddToPlan = (suggestionId: number, suggestion: MealSuggestion) => {
    const flipValue = getCardFlipState(suggestionId);
    Animated.sequence([
      Animated.timing(flipValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(flipValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setAddedToPlan((prev) => new Set(prev).add(suggestionId));

    // Actually add the meal to nutrition store so totals update
    const now = new Date().toISOString();
    const meal: Meal = {
      id: `suggestion_${suggestionId}_${Date.now()}`,
      type: 'snack',
      name: suggestion.name,
      items: [],
      totalCalories: suggestion.calories,
      totalMacros: {
        protein: suggestion.protein,
        carbohydrates: suggestion.carbs,
        fat: suggestion.fat,
        fiber: 0,
      },
      tags: ['suggestion'],
      isPersonalized: false,
      aiGenerated: false,
      createdAt: now,
      updatedAt: now,
    };
    addDailyMeal(meal);

    haptics.medium();
    setTimeout(() => {
      Alert.alert(
        "Added to Plan",
        `${suggestion.name} has been added to your meal plan`,
      );
    }, 300);
  };

  const handleDismissSuggestion = (suggestionId: number) => {
    const swipeState = getSuggestionSwipeState(suggestionId);
    Animated.parallel([
      Animated.timing(swipeState.translateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(swipeState.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDismissedSuggestions((prev) => new Set(prev).add(suggestionId));
      haptics.medium();
    });
  };

  const createSuggestionPanResponder = (suggestionId: number) => {
    const swipeState = getSuggestionSwipeState(suggestionId);
    const DISMISS_THRESHOLD = 100;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dy > 5 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          swipeState.translateY.setValue(gestureState.dy);
          swipeState.opacity.setValue(
            1 - gestureState.dy / DISMISS_THRESHOLD / 2,
          );
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          handleDismissSuggestion(suggestionId);
        } else {
          Animated.parallel([
            Animated.spring(swipeState.translateY, {
              toValue: 0,
              tension: 100,
              friction: 10,
              useNativeDriver: true,
            }),
            Animated.timing(swipeState.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    });
  };

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissedSuggestions.has(s.id),
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Meal Suggestions</Text>
      {visibleSuggestions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No meal suggestions available for your preferences
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScrollContent}
        >
          {visibleSuggestions.map((suggestion) => {
            const panResponder = createSuggestionPanResponder(suggestion.id);
            const swipeState = getSuggestionSwipeState(suggestion.id);
            const isAdded = addedToPlan.has(suggestion.id);
            return (
              <Animated.View
                key={suggestion.id}
                {...panResponder.panHandlers}
                style={{
                  transform: [{ translateY: swipeState.translateY }],
                  opacity: swipeState.opacity,
                }}
              >
                <GlassCard
                  elevation={3}
                  style={styles.suggestionCard}
                  padding="none"
                  borderRadius="xl"
                >
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionName}>{suggestion.name}</Text>
                    <Text style={styles.suggestionMacros}>
                      {suggestion.calories} cal | {suggestion.protein}g P | {suggestion.carbs}g C | {suggestion.fat}g F
                    </Text>
                    <AnimatedPressable
                      style={styles.addToPlanButton}
                      onPress={() =>
                        handleAddToPlan(suggestion.id, suggestion)
                      }
                      disabled={isAdded}
                    >
                      <Text style={styles.addToPlanButtonText}>
                        {isAdded ? "Added" : "Add"}
                      </Text>
                    </AnimatedPressable>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  suggestionsScrollContent: { paddingHorizontal: ResponsiveTheme.spacing.lg },
  suggestionCard: { width: rw(200), marginRight: ResponsiveTheme.spacing.md },
  suggestionContent: { padding: ResponsiveTheme.spacing.md },
  suggestionName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  suggestionMacros: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  addToPlanButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    alignItems: "center",
  },
  addToPlanButtonText: {
    color: colors.text.primary,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: ResponsiveTheme.spacing.xl,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: colors.text.secondary,
    textAlign: "center",
  },
});
