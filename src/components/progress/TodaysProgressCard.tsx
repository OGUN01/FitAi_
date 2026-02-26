import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { GlassCard } from "../../components/ui/aurora/GlassCard";

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
      <GlassCard
        style={styles.todaysCard}
        elevation={2}
        blurIntensity="light"
        padding="lg"
        borderRadius="lg"
      >
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
              color={ResponsiveTheme.colors.primary}
              style={{
                marginBottom: ResponsiveTheme.spacing.xs,
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
              color={ResponsiveTheme.colors.primary}
              style={{
                marginBottom: ResponsiveTheme.spacing.xs,
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
              color={ResponsiveTheme.colors.primary}
              style={{
                marginBottom: ResponsiveTheme.spacing.xs,
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
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  todaysCard: {
    padding: ResponsiveTheme.spacing.lg,
  },
  todaysHeader: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  todaysDate: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
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
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  todaysStatValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
});
