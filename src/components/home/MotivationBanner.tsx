/**
 * MotivationBanner Component
 * Nike-inspired bold motivational quote with gradient background
 * Rotating daily quotes with time-of-day contextual messages
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";

// Motivational quotes categorized by time of day
const QUOTES = {
  morning: [
    { text: "Rise and grind.", subtext: "Your morning sets your momentum" },
    { text: "Make today count.", subtext: "Every rep brings you closer" },
    { text: "Champions wake up early.", subtext: "You're already ahead" },
    { text: "Own the morning.", subtext: "Own the day" },
    { text: "Your body is ready.", subtext: "Is your mind?" },
  ],
  afternoon: [
    { text: "Stay locked in.", subtext: "Halfway there, don't stop now" },
    {
      text: "Push through.",
      subtext: "Discomfort is temporary, pride is forever",
    },
    { text: "No shortcuts.", subtext: "Only hard work" },
    { text: "Keep moving.", subtext: "Progress over perfection" },
    { text: "You've got this.", subtext: "Finish what you started" },
  ],
  evening: [
    { text: "End strong.", subtext: "Champions finish their day right" },
    { text: "One more rep.", subtext: "That's where growth happens" },
    { text: "Reflect & recover.", subtext: "Tomorrow you rise again" },
    { text: "Rest is earned.", subtext: "You put in the work" },
    { text: "Sleep is training.", subtext: "Recovery builds strength" },
  ],
};

// Gradient colors for different times
const GRADIENTS = {
  morning: ["#FF6B6B", "#FF8E53"],
  afternoon: ["#667eea", "#764ba2"],
  evening: ["#4CAF50", "#2E7D32"],
};

interface MotivationBannerProps {
  onPress?: () => void;
  userName?: string;
}

export const MotivationBanner: React.FC<MotivationBannerProps> = ({
  onPress,
  userName,
}) => {
  // Get time period and corresponding quote
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
      iconName = "sunny";
    } else if (hour >= 12 && hour < 18) {
      period = "afternoon";
      iconName = "partly-sunny";
    } else {
      period = "evening";
      iconName = "moon";
    }

    const quotes = QUOTES[period];
    const selectedQuote = quotes[dayOfYear % quotes.length];

    return {
      quote: selectedQuote,
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
        colors={gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={rf(18)} color="rgba(255,255,255,0.9)" />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.quoteText}>{quote.text}</Text>
          <Text style={styles.subtextText}>{quote.subtext}</Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={rf(16)}
          color="rgba(255,255,255,0.6)"
        />
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
    alignItems: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.sm,
  },
  iconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  textContainer: {
    flex: 1,
  },
  quoteText: {
    fontSize: rf(16),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  subtextText: {
    fontSize: rf(11),
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
});

export default MotivationBanner;
