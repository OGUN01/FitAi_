import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Button } from "../../components/ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf } from '../../utils/responsive';
import { NutritionChart } from "../../components/charts";
import useCalculatedMetrics from "../../hooks/useCalculatedMetrics";
import { useMealDetailLogic } from "../../hooks/useMealDetailLogic";
import { MealDetailHeader } from "../../components/details/MealDetailHeader";
import { MealInfoCard } from "../../components/details/MealInfoCard";
import { FoodItemsList } from "../../components/details/FoodItemsList";
import { MealInsights } from "../../components/details/MealInsights";
import { MealActions } from "../../components/details/MealActions";

interface MealDetailProps {
  mealId: string;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MealDetail: React.FC<MealDetailProps> = ({
  mealId,
  onBack,
  onEdit,
  onDelete,
}) => {
  const calculatedMetrics = useCalculatedMetrics();
  const {
    meal,
    nutritionData,
    insights,
    isGeneratingPlan,
    getMealIcon,
    formatDate,
  } = useMealDetailLogic(mealId);

  if (isGeneratingPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading meal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!meal) {
    return (
      <SafeAreaView style={styles.container}>
        <MealDetailHeader onBack={onBack} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>Meal Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This meal may have been removed or is not available.
          </Text>
          <Button
            title="Go Back"
            onPress={onBack ?? (() => {})}
            disabled={!onBack}
            variant="primary"
            style={{ marginTop: ResponsiveTheme.spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MealDetailHeader onBack={onBack} onEdit={onEdit} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <MealInfoCard
          meal={meal}
          mealIcon={getMealIcon(meal.name)}
          formattedDate={formatDate(meal.date)}
        />

        {nutritionData && (
          <NutritionChart
            data={nutritionData}
            targetCalories={calculatedMetrics?.dailyCalories ?? undefined}
            style={styles.chartContainer}
          />
        )}

        <FoodItemsList foods={meal.foods} />

        <MealInsights insights={insights} notes={meal.notes} />
      </ScrollView>

      <MealActions onEdit={onEdit} onDelete={onDelete} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.xl,
  },

  emptyIcon: {
    fontSize: rf(64),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  emptyTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  emptySubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  chartContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
});
