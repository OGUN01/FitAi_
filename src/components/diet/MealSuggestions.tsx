import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  PanResponder,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { haptics } from "../../utils/haptics";
import { colors, spacing, borderRadius, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { rw } from "../../utils/responsive";
import { useProfileStore } from "../../stores/profileStore";
import {
  getCuisineDataForCountry,
  type CuisineFoodItem,
} from "../../data/regionalCuisineData";
import { useNutritionStore } from "../../stores";
import type { Meal } from "../../types/diet";

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
 * - vegetarian / vegan â†’ only isVegetarian items
 * - pescatarian â†’ vegetarian items (fish items in the DB are tagged non-veg,
 *   but the cuisine data doesn't have a separate "fish" flag, so we include
 *   all items whose name contains common fish keywords OR are vegetarian)
 * - non-veg â†’ all items
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
  const setDailyMeals = useNutritionStore((s) => s.setDailyMeals);
  const dailyMeals = useNutritionStore((s) => s.dailyMeals);

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
  // Tracks the created dailyMeal id for each suggestion so "Log this" can flip
  // it from planned (no loggedAt) to logged (loggedAt set) without a duplicate.
  const [loggedSuggestionIds, setLoggedSuggestionIds] = useState<Set<number>>(
    new Set(),
  );
  const suggestionMealIdRef = useRef<Record<number, string>>({});

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

    // Suggestions stay visible on today's plan, but they should not count as consumed
    // nutrition until the user actually logs the meal.
    const now = new Date().toISOString();
    const mealId = `suggestion_${suggestionId}_${Date.now()}`;
    suggestionMealIdRef.current[suggestionId] = mealId;
    const meal: Meal = {
      id: mealId,
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
      tags: ["suggestion", "planned"],
      isPersonalized: false,
      aiGenerated: false,
      createdAt: now,
      updatedAt: now,
    };
    addDailyMeal(meal);

    haptics.medium();
    setTimeout(() => {
      crossPlatformAlert(
        "Added to Today's Plan",
        `${suggestion.name} has been added as a planned meal suggestion`,
      );
    }, 500);
  };

  // Flip a planned suggestion into a logged meal by setting loggedAt in place.
  // Mirrors completionTrackingService.completeMeal's store update (addDailyMeal
  // with loggedAt), but reuses the existing dailyMeals entry instead of
  // inserting a duplicate. Triggers a nutrition refresh so calorie rings update.
  const handleLogSuggestion = (suggestionId: number, suggestion: MealSuggestion) => {
    const mealId = suggestionMealIdRef.current[suggestionId];
    if (!mealId) return;
    const loggedAt = new Date().toISOString();
    setDailyMeals(
      dailyMeals.map((m) =>
        m.id === mealId
          ? {
              ...m,
              loggedAt,
              updatedAt: loggedAt,
              tags: (m.tags ?? []).includes("logged")
                ? m.tags
                : [...(m.tags ?? []), "logged"],
            }
          : m,
      ),
    );
    setLoggedSuggestionIds((prev) => new Set(prev).add(suggestionId));
    haptics.medium();
    import("../../services/nutritionRefreshService")
      .then(({ nutritionRefreshService }) => nutritionRefreshService.triggerRefresh())
      .catch(() => {});
    crossPlatformAlert(
      "Meal Logged",
      `${suggestion.name} has been logged — your nutrition totals are updated.`,
    );
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
            const isLogged = loggedSuggestionIds.has(suggestion.id);
            // Ensure flip state is created/retrieved before render
            const flipValue = getCardFlipState(suggestion.id);
            const addBtnBg = flipValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [
                colors.primary.DEFAULT,
                "#22c55e",
                colors.primary.DEFAULT,
              ],
            });
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
                    <View style={styles.buttonRow}>
                      <AnimatedPressable
                        style={[
                          styles.addToPlanButton,
                          isAdded ? styles.addToPlanButtonAdded : undefined,
                        ] as StyleProp<ViewStyle>}
                        onPress={() =>
                          handleAddToPlan(suggestion.id, suggestion)
                        }
                        disabled={isAdded}
                      >
                        <Animated.View style={[
                          StyleSheet.absoluteFill,
                          { backgroundColor: addBtnBg, borderRadius: borderRadius.md },
                        ]} />
                        <Text style={styles.addToPlanButtonText}>
                          {isAdded ? "Added" : "Add to Plan"}
                        </Text>
                      </AnimatedPressable>
                      {isAdded && !isLogged && (
                        <AnimatedPressable
                          style={styles.logButton as StyleProp<ViewStyle>}
                          onPress={() =>
                            handleLogSuggestion(suggestion.id, suggestion)
                          }
                          scaleValue={0.95}
                        >
                          <Text style={styles.logButtonText}>Log this</Text>
                        </AnimatedPressable>
                      )}
                      {isLogged && (
                        <View style={styles.loggedBadge}>
                          <Text style={styles.loggedBadgeText}>✓ Logged</Text>
                        </View>
                      )}
                    </View>
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
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  suggestionsScrollContent: { paddingHorizontal: spacing.lg },
  suggestionCard: { width: rw(200), marginRight: spacing.md },
  suggestionContent: { padding: spacing.md },
  suggestionName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  suggestionMacros: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  addToPlanButton: {
    flex: 1,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  addToPlanButtonAdded: {
    backgroundColor: "#16a34a",
  },
  addToPlanButtonText: {
    color: colors.text.primary,
    fontSize: fontSize.xs,
    fontWeight: "600",
    zIndex: 1,
  },
  logButton: {
    backgroundColor: "#22c55e",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  logButtonText: {
    color: "#ffffff",
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  loggedBadge: {
    backgroundColor: "#16a34a",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  loggedBadgeText: {
    color: "#ffffff",
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: "center",
  },
});
