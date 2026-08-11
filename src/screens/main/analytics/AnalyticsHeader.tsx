/**
 * AnalyticsHeader Component
 * Screen title with period selector and navigation buttons
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  surface,
  border,
  chart,
  colors,
  typography,
  spacing,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
import { PeriodSelector, Period } from "./PeriodSelector";
import { haptics } from "../../../utils/haptics";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";

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

  // Top spacing so the title clears the status bar. The wrapping SafeAreaView
  // in AnalyticsScreen owns only the bottom edge (edges={["bottom"]}) — earlier
  // relying on its top edge left the title overlapping the status bar on some
  // devices, so the header is the sole owner of top padding here.
  //
  // Robustness: useSafeAreaInsets().top can report 0 (e.g. before
  // SafeAreaProvider measures, or certain Expo Go / device configs), which let
  // the title render behind the status bar. Fall back to StatusBar.currentHeight
  // (Android) and a 24px floor so the title always clears the bar even when the
  // inset is unavailable. Same approach as FitnessHeader.
  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  const topInset = Math.max(insets.top, statusBarHeight, 24);
  const topPadding = topInset + spacing.md;

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
      <Animated.View
        entering={Platform.OS !== "web" ? FadeInDown.delay(100).duration(350) : undefined}
        style={styles.titleRow}
      >
        <View style={styles.titleLeft}>
          {/* Flat accent tile — the old identical-stop LinearGradient was just
              a flat fill with extra cost. */}
          <View style={[styles.iconContainer, { backgroundColor: chart[1] }]}>
            <Ionicons name="analytics" size={rf(18)} color={colors.text.primary} />
          </View>
          <View>
            <Text style={styles.title} numberOfLines={1}>
              Analytics
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {getPeriodLabel()}
            </Text>
          </View>
        </View>

        <View style={styles.titleRight}>
          {onProgressPress && (
            <AnimatedPressable
              style={styles.navButton}
              onPress={() => {
                haptics.light();
                onProgressPress();
              }}
              scaleValue={0.9}
              hapticFeedback={false}
              accessibilityRole="button"
              accessibilityLabel="Progress"
            >
              <Ionicons
                name="fitness-outline"
                size={rf(18)}
                color={chart[1]}
              />
            </AnimatedPressable>
          )}

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

      <Animated.View
        entering={Platform.OS !== "web" ? FadeInDown.delay(200).duration(350) : undefined}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
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
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  titleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...typography.variants.pageTitle,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typography.variants.caption,
    color: colors.text.secondary,
  },
  badge: {
    height: 30,
    borderRadius: 15,
    backgroundColor: hexToRgba(chart[5], 0.09),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: hexToRgba(chart[5], 0.19),
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: chart[5],
  },
  badgeText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: rf(10),
    color: chart[5],
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
