import React, { memo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { GlassCard } from "../ui/aurora/GlassCard";
import { colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rbr, rh } from "../../utils/responsive";
import { useMealCard, MacroTargets } from "../../hooks/useMealCard";
import { MealHeader } from "./meal/MealHeader";
import { NutritionBreakdown } from "./meal/NutritionBreakdown";
import { MealMetadata } from "./meal/MealMetadata";
import { MealTags } from "./meal/MealTags";
import { IngredientsList } from "./meal/IngredientsList";
import { MealActions } from "./meal/MealActions";
import { DayMeal } from "../../types/ai";

export interface PremiumMealCardProps {
  meal: DayMeal;
  mealTime: string;
  onPress?: () => void;
  onStartMeal?: () => void;
  onCompleteMeal?: () => void;
  progress?: number;
  macroTargets?: MacroTargets;
  style?: StyleProp<ViewStyle>;
}

export const PremiumMealCard: React.FC<PremiumMealCardProps> = memo((props) => {
  const { state, data, actions } = useMealCard(props);
  const { meal, mealTime } = props;

  return (
    <Animated.View style={[data.animatedStyle, props.style]}>
      <View>
        <GlassCard
          elevation={3}
          blurIntensity="light"
          padding="none"
          borderRadius="xl"
        >
          {/* Gradient Accent Strip */}
          <LinearGradient
            colors={data.mealConfig.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentStrip}
          />

          <View style={styles.cardContent}>
            <Pressable
              onPressIn={actions.handlePressIn}
              onPressOut={actions.handlePressOut}
              onPress={actions.handlePress}
            >
            <MealHeader
              meal={meal}
              mealTime={mealTime}
              mealConfig={data.mealConfig}
            />
            <NutritionBreakdown
              meal={meal}
              macroPercentages={data.macroPercentages}
              fiber={data.fiber}
            />

            <MealMetadata
              meal={meal}
              prepTime={data.prepTime}
              cookTime={data.cookTime}
              totalTime={data.totalTime}
            />

            <MealTags meal={meal} />

            <IngredientsList
              foodItems={data.foodItems}
              isExpanded={state.isExpanded}
              toggleExpanded={actions.toggleExpanded}
              mealConfig={data.mealConfig}
            />
            </Pressable>

            <MealActions
              onStartMeal={props.onStartMeal}
              onCompleteMeal={props.onCompleteMeal}
              isCompleted={state.isCompleted}
              isInProgress={state.isInProgress}
              progress={props.progress || 0}
              mealConfig={data.mealConfig}
              onStartPress={actions.handleStartPress}
              onCompletePress={actions.handleCompletePress}
            />

            {/* Progress Indicator */}
            {state.isInProgress && (
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${props.progress || 0}%` },
                  ]}
                />
              </View>
            )}
          </View>

          {/* Completed Overlay */}
          {state.isCompleted && (
            <View style={styles.completedOverlay}>
              <Ionicons
                name="checkmark-circle"
                size={rf(32)}
                color={colors.success.DEFAULT}
              />
            </View>
          )}
        </GlassCard>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  accentStrip: {
    height: rh(4),
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  cardContent: {
    padding: spacing.lg,
  },
  progressBarContainer: {
    height: rh(4),
    backgroundColor: colors.glass.background,
    borderRadius: rbr(2),
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.success.DEFAULT,
    borderRadius: rbr(2),
  },
  completedOverlay: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
  },
});

export default PremiumMealCard;
