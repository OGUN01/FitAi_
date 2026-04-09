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
import { rf, rw, rp } from "../../../utils/responsive";
import { PeriodSelector, Period } from "./PeriodSelector";
import { haptics } from "../../../utils/haptics";

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



          {/* Honest status badge - do not render fake CTA for unavailable insights */}
          <View
            style={styles.badge}
            accessibilityRole="text"
            accessibilityLabel="AI insights coming soon"
          >
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>AI Soon</Text>
          </View>
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
    width: Math.max(rw(32), 44),
    height: Math.max(rw(32), 44),
    borderRadius: Math.max(rw(8), 12),
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
    height: Math.max(rw(24), 30),
    borderRadius: Math.max(rw(12), 15),
    backgroundColor: "rgba(255, 193, 7, 0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.25)",
  },
  badgeDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
    backgroundColor: ResponsiveTheme.colors.gold,
  },
  badgeText: {
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.gold,
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: rf(10),
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  periodSelectorWrapper: {
    alignSelf: "stretch",
  },
});

export default AnalyticsHeader;
