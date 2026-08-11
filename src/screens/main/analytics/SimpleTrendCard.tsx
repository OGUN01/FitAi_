import React from "react";
import { View, Text, StyleSheet } from "react-native";
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
import { rf, rh } from "../../../utils/responsive";
import { TrendData } from "../../../hooks/useProgressTrendsLogic";
import { haptics } from "../../../utils/haptics";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";

interface SimpleTrendCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend: TrendData | null;
  unit: string;
  color: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  /** When true (e.g. weight), a falling value is the positive/green outcome —
   * matches the "down is good" convention used by MetricSummaryGrid and
   * WeightJourneySection so the same data doesn't read as "good" on one
   * screen and "bad" on another. Defaults to false (higher = positive). */
  lowerIsBetter?: boolean;
}

export const SimpleTrendCard: React.FC<SimpleTrendCardProps> = ({
  title,
  icon,
  trend,
  unit,
  color,
  ctaLabel,
  onCtaPress,
  lowerIsBetter = false,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400)}
      style={styles.panel}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={rf(18)} color={color} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {trend ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel} numberOfLines={1}>
                Current
              </Text>
              <Text
                style={[styles.statValue, { color }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {trend.data.length > 0
                  ? trend.data[trend.data.length - 1]?.toFixed(1)
                  : "--"}{" "}
                {unit}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel} numberOfLines={1}>
                Avg
              </Text>
              <Text
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {trend.avg.toFixed(1)} {unit}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel} numberOfLines={1}>
                Change
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: (
                      lowerIsBetter ? trend.change <= 0 : trend.change >= 0
                    )
                      ? chart[4]
                      : chart[6],
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {trend.change >= 0 ? "+" : ""}
                {trend.change.toFixed(1)} {unit}
              </Text>
            </View>
          </View>

          <View style={styles.miniChart}>
            {trend.data.slice(-7).map((value, index, arr) => {
              const max = Math.max(...arr);
              const min = Math.min(...arr);
              const range = max - min || 1;
              const height = ((value - min) / range) * 36 + 8;
              return (
                <View
                  key={index}
                  style={[styles.chartBar, { height, backgroundColor: color }]}
                />
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText} numberOfLines={1}>
            Not enough data yet
          </Text>
          <Text style={styles.noDataSubtext} numberOfLines={2}>
            Keep tracking to see your trends
          </Text>
          {ctaLabel && onCtaPress ? (
            <AnimatedPressable
              style={[styles.ctaButton, { backgroundColor: color }]}
              onPress={() => {
                haptics.light();
                onCtaPress();
              }}
              scaleValue={0.95}
              hapticFeedback={false}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
            >
              <Text style={styles.ctaButtonText} numberOfLines={1}>
                {ctaLabel}
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: rf(36),
    height: rf(36),
    borderRadius: rf(10),
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  statLabel: {
    ...typography.variants.caption,
    color: colors.text.secondary,
  },
  statValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(16),
    color: colors.text.primary,
    marginTop: spacing.xxs,
  },
  miniChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: rh(44),
    paddingTop: spacing.sm,
  },
  chartBar: {
    width: 8,
    borderRadius: 4,
    opacity: 0.85,
  },
  noDataContainer: {
    alignItems: "flex-start",
    paddingVertical: spacing.md,
  },
  noDataText: {
    ...typography.variants.body,
    color: colors.text.primary,
  },
  noDataSubtext: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  ctaButton: {
    marginTop: spacing.md,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },
  ctaButtonText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: rf(13),
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
});
