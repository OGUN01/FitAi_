/**
 * AnalyticsHeader Component
 * Screen title with period selector
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";
import { PeriodSelector, Period } from "./PeriodSelector";

interface AnalyticsHeaderProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  // Get period label for display
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "year":
        return "This Year";
      default:
        return "Overview";
    }
  };

  return (
    <View style={styles.container}>
      {/* Title Row */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Ionicons name="analytics" size={rf(18)} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>{getPeriodLabel()}</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={rf(12)} color="#FFD700" />
          <Text style={styles.badgeText}>AI</Text>
        </View>
      </Animated.View>

      {/* Period Selector */}
      <Animated.View
        entering={FadeInDown.delay(200)}
        style={styles.periodSelectorWrapper}
      >
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={onPeriodChange}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.sm,
    paddingBottom: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.sm,
    alignItems: "stretch",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  iconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: rf(20),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: -2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,215,0,0.12)",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: ResponsiveTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },
  badgeText: {
    fontSize: rf(10),
    fontWeight: "700",
    color: "#FFD700",
  },
  periodSelectorWrapper: {
    alignSelf: "stretch",
  },
});

export default AnalyticsHeader;
