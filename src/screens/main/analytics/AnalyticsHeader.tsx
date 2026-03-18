/**
 * AnalyticsHeader Component
 * Screen title with period selector and navigation buttons
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rp, rs } from "../../../utils/responsive";
import { PeriodSelector, Period } from "./PeriodSelector";
import { haptics } from "../../../utils/haptics";
import { crossPlatformAlert } from "../../../utils/crossPlatformAlert";

interface AnalyticsHeaderProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
  onProgressPress?: () => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  selectedPeriod,
  onPeriodChange,
  onProgressPress,
}) => {
  const insets = useSafeAreaInsets();

  // Calculate top padding - use insets on Android where SafeAreaView may not work properly
  const topPadding =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight || 0) +
        ResponsiveTheme.spacing.sm
      : ResponsiveTheme.spacing.md;

  // Get period label for display
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "quarter":
        return "This Quarter";
      case "year":
        return "This Year";
      default:
        return "Overview";
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Title Row */}
      <Animated.View entering={Platform.OS !== 'web' ? FadeInDown.delay(100) : undefined} style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <LinearGradient
            colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Ionicons name="analytics" size={rf(18)} color={ResponsiveTheme.colors.white} />
          </LinearGradient>
          <View>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>{getPeriodLabel()}</Text>
          </View>
        </View>

        {/* Right side: Navigation icons + AI badge */}
        <View style={styles.titleRight}>
          {/* Progress Screen Button */}
          {onProgressPress && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                haptics.light();
                onProgressPress();
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Progress"
            >
              <Ionicons
                name="fitness-outline"
                size={rf(18)}
                color={ResponsiveTheme.colors.primary}
              />
            </TouchableOpacity>
          )}



          {/* AI Badge */}
          <TouchableOpacity
            style={styles.badge}
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              crossPlatformAlert(
                "AI Insights",
                "AI Insights coming soon! Complete workouts and log meals to unlock AI-powered analytics.",
                [{ text: "Got it", style: "default" }],
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="AI Insights"
          >
            <Text style={styles.badgeText}>AI</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Period Selector */}
      <Animated.View
        entering={Platform.OS !== 'web' ? FadeInDown.delay(200) : undefined}
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
    // paddingTop is applied dynamically via style prop to handle safe area
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
    flex: 1,
    minWidth: 0,
  },
  titleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    flexShrink: 0,
  },
  navButton: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(8),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassHighlight,
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
    marginTop: rp(-2),
  },
  badge: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: ResponsiveTheme.colors.warningTint,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.warningTint,
  },
  badgeText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: ResponsiveTheme.colors.gold,
    letterSpacing: 0.5,
    textAlign: "center",
    lineHeight: rf(11),
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  periodSelectorWrapper: {
    alignSelf: "stretch",
  },
});

export default AnalyticsHeader;
