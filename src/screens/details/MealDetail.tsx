import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { NutritionChart } from '../../components/charts';
import useCalculatedMetrics from '../../hooks/useCalculatedMetrics';

interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

interface MealDetailProps {
  mealId: string;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MealDetail: React.FC<MealDetailProps> = ({ mealId, onBack, onEdit, onDelete }) => {
  // Get user's calorie target - NO HARDCODED VALUES
  const calculatedMetrics = useCalculatedMetrics();
  
  // Mock meal data - in real app this would come from props or API
  const meal = {
    id: mealId,
    name: 'Breakfast',
    time: '8:30 AM',
    date: '2025-01-19',
    totalCalories: 485,
    totalProtein: 28,
    totalCarbs: 45,
    totalFat: 18,
    foods: [
      {
        id: '1',
        name: 'Greek Yogurt',
        quantity: 150,
        unit: 'g',
        calories: 130,
        protein: 15,
        carbs: 9,
        fat: 4,
        fiber: 0,
        sugar: 9,
      },
      {
        id: '2',
        name: 'Blueberries',
        quantity: 80,
        unit: 'g',
        calories: 45,
        protein: 0.5,
        carbs: 11,
        fat: 0.2,
        fiber: 2,
        sugar: 8,
      },
      {
        id: '3',
        name: 'Granola',
        quantity: 30,
        unit: 'g',
        calories: 140,
        protein: 4,
        carbs: 18,
        fat: 6,
        fiber: 3,
        sugar: 5,
      },
      {
        id: '4',
        name: 'Almonds',
        quantity: 20,
        unit: 'g',
        calories: 115,
        protein: 4,
        carbs: 4,
        fat: 10,
        fiber: 2,
        sugar: 1,
      },
      {
        id: '5',
        name: 'Honey',
        quantity: 15,
        unit: 'g',
        calories: 45,
        protein: 0,
        carbs: 12,
        fat: 0,
        fiber: 0,
        sugar: 12,
      },
    ] as FoodItem[],
  };

  const nutritionData = {
    calories: meal.totalCalories,
    protein: meal.totalProtein,
    carbs: meal.totalCarbs,
    fat: meal.totalFat,
  };

  const getMealIcon = (mealName: string) => {
    switch (mealName.toLowerCase()) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      case 'snack':
        return '🍎';
      default:
        return '🍽️';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Details</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Meal Info Card */}
        <Card style={styles.mealCard} variant="elevated">
          <View style={styles.mealHeader}>
            <View style={styles.mealInfo}>
              <View style={styles.mealTitleRow}>
                <Text style={styles.mealIcon}>{getMealIcon(meal.name)}</Text>
                <Text style={styles.mealName}>{meal.name}</Text>
              </View>
              <Text style={styles.mealTime}>
                {meal.time} • {formatDate(meal.date)}
              </Text>
            </View>

            <View style={styles.caloriesContainer}>
              <Text style={styles.caloriesValue}>{meal.totalCalories}</Text>
              <Text style={styles.caloriesLabel}>calories</Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meal.totalProtein}g</Text>
              <Text style={styles.statLabel}>Protein</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meal.totalCarbs}g</Text>
              <Text style={styles.statLabel}>Carbs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meal.totalFat}g</Text>
              <Text style={styles.statLabel}>Fat</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meal.foods.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
          </View>
        </Card>

        {/* Nutrition Chart */}
        <NutritionChart data={nutritionData} targetCalories={calculatedMetrics?.dailyCalories} style={styles.chartContainer} />

        {/* Food Items */}
        <View style={styles.foodSection}>
          <Text style={styles.sectionTitle}>Food Items</Text>

          {meal.foods.map((food, index) => (
            <Card key={food.id} style={styles.foodCard}>
              <View style={styles.foodHeader}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodQuantity}>
                    {food.quantity} {food.unit}
                  </Text>
                </View>
                <Text style={styles.foodCalories}>{food.calories} cal</Text>
              </View>

              {/* Food Macros */}
              <View style={styles.foodMacros}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{food.protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{food.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{food.fat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
                {food.fiber !== undefined && (
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{food.fiber}g</Text>
                    <Text style={styles.macroLabel}>Fiber</Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>

        {/* Meal Notes */}
        <Card style={styles.notesCard}>
          <Text style={styles.notesTitle}>📝 Meal Notes</Text>
          <Text style={styles.notesText}>
            Healthy breakfast with good balance of protein and complex carbs. Greek yogurt provides
            probiotics, berries add antioxidants, and nuts give healthy fats.
          </Text>
        </Card>

        {/* Meal Insights */}
        <Card style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>💡 Nutritional Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>✅</Text>
              <Text style={styles.insightText}>Good protein content for muscle maintenance</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>✅</Text>
              <Text style={styles.insightText}>Balanced macronutrient distribution</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>⚠️</Text>
              <Text style={styles.insightText}>Consider adding more fiber-rich foods</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <View style={styles.actionButtons}>
          <Button
            title="Edit Meal"
            onPress={onEdit || (() => {})}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title="Delete Meal"
            onPress={onDelete || (() => {})}
            variant="outline"
            style={[styles.actionButton, styles.deleteButton]}
            textStyle={styles.deleteButtonText}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  headerTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  editIcon: {
    fontSize: THEME.fontSize.md,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: THEME.spacing.md,
  },

  mealCard: {
    marginVertical: THEME.spacing.md,
  },

  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },

  mealInfo: {
    flex: 1,
  },

  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },

  mealIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },

  mealName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  mealTime: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  caloriesContainer: {
    alignItems: 'center',
    backgroundColor: THEME.colors.primary + '20',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.primary + '40',
  },

  caloriesValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  caloriesLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.primary,
    marginTop: THEME.spacing.xs / 2,
  },

  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 2,
  },

  chartContainer: {
    marginBottom: THEME.spacing.md,
  },

  foodSection: {
    marginBottom: THEME.spacing.lg,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  foodCard: {
    marginBottom: THEME.spacing.sm,
  },

  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },

  foodInfo: {
    flex: 1,
  },

  foodName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs / 2,
  },

  foodQuantity: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  foodCalories: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  foodMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  macroItem: {
    alignItems: 'center',
  },

  macroValue: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  macroLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 4,
  },

  notesCard: {
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.secondary + '10',
    borderWidth: 1,
    borderColor: THEME.colors.secondary + '30',
  },

  notesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.secondary,
    marginBottom: THEME.spacing.sm,
  },

  notesText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },

  insightsCard: {
    marginBottom: THEME.spacing.xxl,
    backgroundColor: THEME.colors.info + '10',
    borderWidth: 1,
    borderColor: THEME.colors.info + '30',
  },

  insightsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.info,
    marginBottom: THEME.spacing.sm,
  },

  insightsList: {
    gap: THEME.spacing.xs,
  },

  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  insightIcon: {
    fontSize: THEME.fontSize.sm,
    marginRight: THEME.spacing.sm,
  },

  insightText: {
    flex: 1,
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  bottomContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },

  actionButton: {
    flex: 1,
  },

  deleteButton: {
    borderColor: THEME.colors.error,
  },

  deleteButtonText: {
    color: THEME.colors.error,
  },
});
