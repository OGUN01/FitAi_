import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../utils/responsive";
import {
  colors,
  surface,
  border as borderTokens,
  spacing,
  typography,
} from "../../theme/aurora-tokens";

interface TodaysProgress {
  workoutProgress: number;
  totalMeals: number;
  mealsCompleted: number;
  caloriesConsumed: number;
  targetCalories: number;
}

interface TodaysData {
  workout?: boolean;
  progress?: TodaysProgress;
}

interface CalculatedMetrics {
  dailyCalories: number | null;
}

interface TodaysProgressCardProps {
  todaysData: TodaysData | null;
  calculatedMetrics: CalculatedMetrics | null;
}

export const TodaysProgressCard: React.FC<TodaysProgressCardProps> = ({
  todaysData,
  calculatedMetrics,
}) => {
  if (!todaysData) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Today's Progress</Text>
      <View style={styles.todaysCard}>
        <View style={styles.todaysHeader}>
          <Text style={styles.todaysDate}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>

        <View style={styles.todaysStats}>
          {/* Workout Progress */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="barbell-outline"
              size={rf(24)}
              color={colors.primary.DEFAULT}
              style={{
                marginBottom: spacing.xs,
              }}
            />
            <View style={styles.todaysStatContent}>
              <Text style={styles.todaysStatLabel}>Workout</Text>
              <Text style={styles.todaysStatValue}>
                {todaysData.workout
                  ? `${todaysData.progress?.workoutProgress ?? 0}%`
                  : "Rest Day"}
              </Text>
            </View>
          </View>

          {/* Meals Progress */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="restaurant-outline"
              size={rf(24)}
              color={colors.primary.DEFAULT}
              style={{
                marginBottom: spacing.xs,
              }}
            />
            <View style={styles.todaysStatContent}>
              <Text style={styles.todaysStatLabel}>Meals</Text>
              <Text style={styles.todaysStatValue}>
                {(todaysData.progress?.totalMeals ?? 0) > 0
                  ? `${todaysData.progress?.mealsCompleted ?? 0}/${todaysData.progress?.totalMeals ?? 0}`
                  : (todaysData.progress?.mealsCompleted ?? 0) > 0
                    ? `${todaysData.progress?.mealsCompleted ?? 0} logged`
                    : "No meals"}
              </Text>
            </View>
          </View>

          {/* Calories Progress */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="flame-outline"
              size={rf(24)}
              color={colors.primary.DEFAULT}
              style={{
                marginBottom: spacing.xs,
              }}
            />
            <View style={styles.todaysStatContent}>
              <Text style={styles.todaysStatLabel}>Calories</Text>
              <Text style={styles.todaysStatValue}>
                {(calculatedMetrics?.dailyCalories ??
                  todaysData.progress?.targetCalories ?? 0) > 0
                  ? `${todaysData.progress?.caloriesConsumed ?? 0}/${
                      calculatedMetrics?.dailyCalories ??
                      todaysData.progress?.targetCalories ?? 0
                    }`
                  : (todaysData.progress?.caloriesConsumed ?? 0) > 0
                    ? `${todaysData.progress?.caloriesConsumed ?? 0} cal`
                    : "No data"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  todaysCard: {
    padding: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  todaysHeader: {
    marginBottom: spacing.md,
  },
  todaysDate: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    textAlign: "center",
  },
  todaysStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  todaysStat: {
    alignItems: "center",
    flex: 1,
  },
  todaysStatContent: {
    alignItems: "center",
  },
  todaysStatLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  todaysStatValue: {
    ...typography.variants.cardHeadline,
    fontSize: 15,
    color: colors.text.primary,
  },
});
