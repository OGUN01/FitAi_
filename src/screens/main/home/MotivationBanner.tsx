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

const QUOTES = {
  morning: [
    { text: "Rise and grind", subtext: "Your morning momentum starts now" },
    {
      text: "Make it count",
      subtext: "Every rep brings you closer to your goals",
    },
    {
      text: "Own the morning",
      subtext: "Discipline is the bridge to your dreams",
    },
  ],
  afternoon: [
    { text: "Stay focused", subtext: "Halfway there, maintain your momentum" },
    {
      text: "Push through",
      subtext: "Discomfort is temporary, results are lasting",
    },
    {
      text: "No excuses",
      subtext: "Progress happens outside your comfort zone",
    },
  ],
  evening: [
    { text: "Finish strong", subtext: "End your day with purpose" },
    {
      text: "Recover well",
      subtext: "Rest is when your body rebuilds stronger",
    },
    { text: "Reflect and grow", subtext: "Tomorrow you rise again" },
  ],
};

const GRADIENTS = {
  morning: ["#FF6B6B", "#FF8E53"] as [string, string],
  afternoon: ["#667eea", "#764ba2"] as [string, string],
  evening: ["#11998e", "#38ef7d"] as [string, string],
};

interface MotivationBannerProps {
  onPress?: () => void;
}

export const MotivationBanner: React.FC<MotivationBannerProps> = ({
  onPress,
}) => {
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

    const quotes = QUOTES[period];
    return {
      quote: quotes[dayOfYear % quotes.length],
      gradient: GRADIENTS[period],
      icon: iconName,
    };
  }, []);

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
