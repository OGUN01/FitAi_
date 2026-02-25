/**
 * MotivationBanner Component
 * Professional motivational quote - compact design
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";
import { useProfileStore } from "../../../stores/profileStore";

type GoalCategory = "weight_loss" | "muscle_gain" | "general";

const QUOTES = {
  morning: [
    {
      text: "Rise and grind",
      subtext: "Your morning momentum starts now",
      goals: ["weight_loss"] as GoalCategory[],
    },
    {
      text: "Make it count",
      subtext: "Every rep brings you closer to your goals",
      goals: ["muscle_gain"] as GoalCategory[],
    },
    {
      text: "Own the morning",
      subtext: "Discipline is the bridge to your dreams",
      goals: ["general"] as GoalCategory[],
    },
  ],
  afternoon: [
    {
      text: "Stay focused",
      subtext: "Halfway there, maintain your momentum",
      goals: ["muscle_gain"] as GoalCategory[],
    },
    {
      text: "Push through",
      subtext: "Discomfort is temporary, results are lasting",
      goals: ["weight_loss"] as GoalCategory[],
    },
    {
      text: "No excuses",
      subtext: "Progress happens outside your comfort zone",
      goals: ["weight_loss"] as GoalCategory[],
    },
  ],
  evening: [
    {
      text: "Finish strong",
      subtext: "End your day with purpose",
      goals: ["muscle_gain"] as GoalCategory[],
    },
    {
      text: "Recover well",
      subtext: "Rest is when your body rebuilds stronger",
      goals: ["general"] as GoalCategory[],
    },
    {
      text: "Reflect and grow",
      subtext: "Tomorrow you rise again",
      goals: ["general"] as GoalCategory[],
    },
  ],
};

const GRADIENTS = {
  morning: ["#FF6B6B", "#FF8E53"] as [string, string],
  afternoon: ["#FF6B35", "#FF8A5C"] as [string, string],
  evening: ["#11998e", "#38ef7d"] as [string, string],
};

interface MotivationBannerProps {
  onPress?: () => void;
}

export const MotivationBanner: React.FC<MotivationBannerProps> = ({
  onPress,
}) => {
  const workoutPreferences = useProfileStore(
    (state) => state.workoutPreferences,
  );

  const { quote, gradient, icon } = useMemo(() => {
    const hour = new Date().getHours();
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000,
    );

    let period: "morning" | "afternoon" | "evening";
    let iconName: keyof typeof Ionicons.glyphMap;

    if (hour >= 5 && hour < 12) {
      period = "morning";
      iconName = "sunny-outline";
    } else if (hour >= 12 && hour < 18) {
      period = "afternoon";
      iconName = "partly-sunny-outline";
    } else {
      period = "evening";
      iconName = "moon-outline";
    }

    const userGoals = workoutPreferences?.primary_goals ?? [];
    const allQuotes = QUOTES[period];

    let filteredQuotes = allQuotes;
    if (userGoals.length > 0) {
      const matched = allQuotes.filter((q) =>
        q.goals.some(
          (g) => g === "general" || (userGoals as string[]).includes(g),
        ),
      );
      if (matched.length > 0) {
        filteredQuotes = matched;
      }
    }

    return {
      quote: filteredQuotes[dayOfYear % filteredQuotes.length],
      gradient: GRADIENTS[period],
      icon: iconName,
    };
  }, [workoutPreferences]);

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
      style={styles.container}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={rf(16)} color="rgba(255,255,255,0.95)" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.quoteText}>{quote.text}</Text>
          <Text style={styles.subtextText}>{quote.subtext}</Text>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.sm,
  },
  iconContainer: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  quoteText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  subtextText: {
    fontSize: rf(11),
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },
});

export default MotivationBanner;
