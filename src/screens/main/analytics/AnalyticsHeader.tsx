/**
 * AnalyticsHeader Component
 * Screen title with period selector and navigation buttons
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  chart,
  colors,
  typography,
  spacing,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { PeriodSelector, Period } from "./PeriodSelector";
import { haptics } from "../../../utils/haptics";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

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
  const reducedMotion = useReducedMotion();

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
    <View style={styles.container}>
      <Animated.View
        entering={
          Platform.OS !== "web" && !reducedMotion
            ? FadeInDown.delay(100).duration(350)
            : undefined
        }
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
        </View>
      </Animated.View>

      <Animated.View
        entering={
          Platform.OS !== "web" && !reducedMotion
            ? FadeInDown.delay(200).duration(350)
            : undefined
        }
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
    // Top safe-area inset is handled natively by AnalyticsScreen's
    // SafeAreaView edges={["top", "bottom"]}.
    paddingTop: spacing.md,
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
  periodSelectorWrapper: {
    alignSelf: "stretch",
  },
});

export default AnalyticsHeader;
