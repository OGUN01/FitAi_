import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Button } from "../../components/ui";
import {
  AuroraBackground,
  AuroraSpinner,
  GlassHeader,
  EmptyState,
} from "../../components/ui/aurora";
import { colors, spacing } from "../../theme/aurora-tokens";
import { rp } from "../../utils/responsive";
import { NutritionChart } from "../../components/charts";
import useCalculatedMetrics from "../../hooks/useCalculatedMetrics";
import { useMealDetailLogic } from "../../hooks/useMealDetailLogic";
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
      <AuroraBackground theme="space">
        <View style={styles.loadingContainer}>
          <AuroraSpinner size="lg" />
        </View>
      </AuroraBackground>
    );
  }

  if (!meal) {
    return (
      <AuroraBackground theme="space">
        <GlassHeader title="Meal Details" onBack={onBack} />
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="restaurant-outline"
            title="Meal Not Found"
            subtitle="This meal may have been removed or is not available."
            ctaText={onBack ? "Go Back" : undefined}
            onCta={onBack}
          />
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <GlassHeader
        title="Meal Details"
        onBack={onBack}
        rightAction={
          onEdit ? (
            <Button
              title="Edit"
              onPress={onEdit}
              variant="ghost"
              size="sm"
            />
          ) : (
            <View style={styles.side} />
          )
        }
      />

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
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  side: {
    width: 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: rp(spacing.md),
  },
  chartContainer: {
    marginBottom: rp(spacing.md),
  },
});
