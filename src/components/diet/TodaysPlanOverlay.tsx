import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DayMeal } from '../../types/ai';
import type { MealSchedule } from '../../utils/mealSchedule';
import { getLocalDateString } from '../../utils/weekUtils';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { MealsTimeline } from './MealsTimeline';
import { CompactIntakeSummary } from './CompactIntakeSummary';
import { flatColors as colors, flatFontSize as fontSize, spacing } from '../../theme/aurora-tokens';
import { fontFamilyForWeight } from '../../theme/fonts';

interface TodaysPlanOverlayProps {
  selectedDate: string;
  meals: DayMeal[];
  mealSchedule: MealSchedule;
  mealProgress: Record<string, { progress: number } | null>;
  consumedCalories: number;
  calorieTarget: number;
  mealCount: number;
  isGeneratingPlan: boolean;
  onBack: () => void;
  onMealPress: (meal: DayMeal) => void;
  onLogMeal: () => void;
  onGeneratePlan: () => void;
}

export const TodaysPlanOverlay: React.FC<TodaysPlanOverlayProps> = ({
  selectedDate,
  meals,
  mealSchedule,
  mealProgress,
  consumedCalories,
  calorieTarget,
  mealCount,
  isGeneratingPlan,
  onBack,
  onMealPress,
  onLogMeal,
  onGeneratePlan,
}) => {
  const date = new Date(`${selectedDate}T12:00:00`);
  const title =
    selectedDate === getLocalDateString()
      ? "Today's Plan"
      : date.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });

  return (
    <View style={styles.overlay} testID="diet-todays-plan-overlay">
      <View style={styles.header}>
        <AnimatedPressable
          style={styles.headerButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Diet"
          hapticType="light"
        >
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </AnimatedPressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle}>Your selected-day meal plan</Text>
        </View>
        <View style={styles.headerButton} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <MealsTimeline
          meals={meals}
          mealSchedule={mealSchedule}
          mealProgress={mealProgress}
          selectedDate={selectedDate}
          onMealPress={onMealPress}
          onGeneratePlan={onGeneratePlan}
          isGeneratingPlan={isGeneratingPlan}
          title="Meal timeline"
          onLogMeal={onLogMeal}
        />
        <CompactIntakeSummary
          consumedCalories={consumedCalories}
          calorieTarget={calorieTarget}
          mealCount={mealCount}
          plannedMealCount={meals.length}
          onLogMeal={onLogMeal}
          selectedDate={selectedDate}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 150,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamilyForWeight('800'),
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    // No explicit gap here — MealsTimeline's own marginBottom (spacing.lg)
    // owns the rhythm between it and CompactIntakeSummary below, so the
    // top padding and inter-section gap stay a single consistent value.
  },
});

export default TodaysPlanOverlay;
