import React, { useState } from "react";
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

export const MealSuggestions: React.FC = () => {
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

  const handleAddToPlan = (suggestionId: number, suggestionName: string) => {
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
    haptics.medium();
    setTimeout(() => {
      Alert.alert(
        "Added to Plan",
        `${suggestionName} has been added to your meal plan`,
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

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Meal Suggestions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsScrollContent}
      >
        {[
          {
            id: 1,
            name: "Grilled Chicken Salad",
            icon: "restaurant-outline",
            cookTime: "15 min",
            difficulty: "Easy",
            calories: 320,
            protein: 35,
            carbs: 20,
            fat: 10,
          },
          {
            id: 2,
            name: "Salmon with Quinoa",
            icon: "fish-outline",
            cookTime: "25 min",
            difficulty: "Medium",
            calories: 450,
            protein: 40,
            carbs: 35,
            fat: 15,
          },
          {
            id: 3,
            name: "Veggie Buddha Bowl",
            icon: "leaf-outline",
            cookTime: "20 min",
            difficulty: "Easy",
            calories: 380,
            protein: 18,
            carbs: 55,
            fat: 12,
          },
        ]
          .filter((s) => !dismissedSuggestions.has(s.id))
          .map((suggestion) => {
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
                    <AnimatedPressable
                      style={styles.addToPlanButton}
                      onPress={() =>
                        handleAddToPlan(suggestion.id, suggestion.name)
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
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  suggestionsScrollContent: { paddingHorizontal: ResponsiveTheme.spacing.lg },
  suggestionCard: { width: rw(200), marginRight: ResponsiveTheme.spacing.md },
  suggestionContent: { padding: ResponsiveTheme.spacing.md },
  suggestionName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  addToPlanButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    alignItems: "center",
  },
  addToPlanButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
  },
});
