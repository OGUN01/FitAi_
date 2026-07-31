import { flatColors as colors, spacing, borderRadius, typography } from "../../../theme/aurora-tokens";
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rp } from "../../../utils/responsive";
import { Alternative } from "../../../hooks/adjustment-wizard";
import { MetricPill } from "./MetricPill";

interface AlternativeCardProps {
  alternative: Alternative;
  index: number;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}

export const AlternativeCard: React.FC<AlternativeCardProps> = ({
  alternative,
  index: _index,
  isSelected,
  isRecommended,
  onSelect,
}) => {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    borderOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`${alternative.name} alternative`}
      accessibilityState={{ selected: isSelected }}
    >
      <Animated.View style={[styles.alternativeCard, animatedCardStyle]}>
        {/* Selection ring — flat 2px accent hairline (Editorial Dark), replaces
            the old gradient glow border. Fades in/out with selection state. */}
        <Animated.View
          style={[styles.selectionBorder, animatedBorderStyle]}
          pointerEvents="none"
        />

        {/* Card Content — flat surface + hairline border, no blur/frosted glass. */}
        <View style={styles.cardSurface}>
          <View style={styles.cardInner}>
            {/* Header Row */}
            <View style={styles.cardHeader}>
              {/* Icon Circle */}
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${alternative.iconColor}20` },
                ]}
              >
                <Ionicons
                  name={alternative.icon}
                  size={rf(22)}
                  color={alternative.iconColor}
                />
              </View>

              {/* Title & Badge */}
              <View style={styles.titleContainer}>
                <Text
                  style={[
                    styles.cardTitle,
                    isSelected && styles.cardTitleSelected,
                  ]}
                  numberOfLines={1}
                >
                  {alternative.name}
                </Text>
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Ionicons name="star" size={rf(10)} color={colors.warningAlt} />
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}
              </View>

              {/* Selection Indicator */}
              <View
                style={[
                  styles.selectionIndicator,
                  isSelected && styles.selectionIndicatorActive,
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={rf(14)} color={colors.white} />
                )}
              </View>
            </View>

            {/* Approach Description */}
            <Text style={styles.approachText}>{alternative.approach}</Text>

            {/* Metrics Grid */}
            <View style={styles.metricsGrid}>
              {alternative.newTimeline && (
                <MetricPill
                  icon="calendar-outline"
                  label="Timeline"
                  value={`${alternative.newTimeline} wks`}
                  color={colors.blue}
                />
              )}
              {alternative.newTargetWeight && (
                <MetricPill
                  icon="fitness-outline"
                  label="Target"
                  value={`${alternative.newTargetWeight} kg`}
                  color={colors.successAlt}
                />
              )}
              <MetricPill
                icon="flame-outline"
                label="Calories"
                value={`${alternative.dailyCalories != null && !isNaN(alternative.dailyCalories) ? alternative.dailyCalories : "--"}`}
                color={colors.orange}
              />
              {alternative.newWorkoutFrequency && (
                <MetricPill
                  icon="barbell-outline"
                  label="Workouts"
                  value={`${alternative.newWorkoutFrequency}×/wk`}
                  color={colors.accent}
                />
              )}
              <MetricPill
                icon="trending-down-outline"
                label="Rate"
                value={`${alternative.weeklyRate != null ? alternative.weeklyRate.toFixed(2) : "--"} kg/wk`}
                color={colors.pink}
              />
            </View>

            {/* Pros & Cons Row */}
            <View style={styles.prosConsRow}>
              {/* Pros */}
              <View style={styles.prosSection}>
                <View style={styles.prosHeader}>
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(14)}
                    color={colors.successAlt}
                  />
                  <Text style={styles.prosTitle}>Benefits</Text>
                </View>
                {(alternative.pros || []).slice(0, 2).map((pro, i) => (
                  <Text key={i} style={styles.prosText} numberOfLines={1}>
                    {pro}
                  </Text>
                ))}
              </View>

              {/* Divider */}
              <View style={styles.prosConsDivider} />

              {/* Cons */}
              <View style={styles.consSection}>
                <View style={styles.consHeader}>
                  <Ionicons name="alert-circle" size={rf(14)} color={colors.warningAlt} />
                  <Text style={styles.consTitle}>Trade-offs</Text>
                </View>
                {(alternative.cons || []).slice(0, 2).map((con, i) => (
                  <Text key={i} style={styles.consText} numberOfLines={1}>
                    {con}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  alternativeCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  // Flat accent selection ring — 2px hairline, no gradient glow.
  selectionBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  // Flat surface + hairline border replaces the BlurView glass wrapper.
  cardSurface: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInner: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: rf(15),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: rp(2),
  },
  cardTitleSelected: {
    color: colors.primary,
  },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningTint,
    paddingVertical: rp(2),
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: "flex-start",
  },
  recommendedText: {
    fontSize: rf(9),
    fontWeight: typography.fontWeight.semibold,
    color: colors.warningAlt,
    marginLeft: rp(3),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectionIndicator: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionIndicatorActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  approachText: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: rf(16),
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  prosConsRow: {
    flexDirection: "row",
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  prosSection: {
    flex: 1,
  },
  consSection: {
    flex: 1,
  },
  prosConsDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  prosHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(4),
  },
  consHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(4),
  },
  prosTitle: {
    fontSize: rf(10),
    fontWeight: typography.fontWeight.semibold,
    color: colors.successAlt,
    marginLeft: rp(4),
    textTransform: "uppercase",
  },
  consTitle: {
    fontSize: rf(10),
    fontWeight: typography.fontWeight.semibold,
    color: colors.warningAlt,
    marginLeft: rp(4),
    textTransform: "uppercase",
  },
  prosText: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
  consText: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
});
