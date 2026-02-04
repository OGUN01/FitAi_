import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { Alternative } from "../../../hooks/useAdjustmentWizard";
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
  index,
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
    >
      <Animated.View style={[styles.alternativeCard, animatedCardStyle]}>
        {/* Selection Border Glow */}
        <Animated.View style={[styles.selectionBorder, animatedBorderStyle]}>
          <LinearGradient
            colors={[
              ResponsiveTheme.colors.primary,
              ResponsiveTheme.colors.secondary,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.selectionGradient}
          />
        </Animated.View>

        {/* Card Content */}
        <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
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
                    <Ionicons name="star" size={rf(10)} color="#F59E0B" />
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
                  <Ionicons name="checkmark" size={rf(14)} color="#fff" />
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
                  color="#3B82F6"
                />
              )}
              {alternative.newTargetWeight && (
                <MetricPill
                  icon="fitness-outline"
                  label="Target"
                  value={`${alternative.newTargetWeight} kg`}
                  color="#10B981"
                />
              )}
              <MetricPill
                icon="flame-outline"
                label="Calories"
                value={`${alternative.dailyCalories != null && !isNaN(alternative.dailyCalories) ? alternative.dailyCalories : "--"}`}
                color="#F97316"
              />
              {alternative.newWorkoutFrequency && (
                <MetricPill
                  icon="barbell-outline"
                  label="Workouts"
                  value={`${alternative.newWorkoutFrequency}×/wk`}
                  color="#8B5CF6"
                />
              )}
              <MetricPill
                icon="trending-down-outline"
                label="Rate"
                value={`${alternative.weeklyRate != null ? alternative.weeklyRate.toFixed(2) : "--"} kg/wk`}
                color="#EC4899"
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
                    color="#10B981"
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
                  <Ionicons name="alert-circle" size={rf(14)} color="#F59E0B" />
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
        </BlurView>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  alternativeCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  selectionBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: 2,
  },
  selectionGradient: {
    flex: 1,
    borderRadius: ResponsiveTheme.borderRadius.lg - 2,
  },
  cardBlur: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardInner: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: "rgba(30, 30, 45, 0.85)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  iconCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    alignItems: "center",
    justifyContent: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: 2,
  },
  cardTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 2,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    alignSelf: "flex-start",
  },
  recommendedText: {
    fontSize: rf(9),
    fontWeight: "600",
    color: "#F59E0B",
    marginLeft: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectionIndicator: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionIndicatorActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  approachText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    lineHeight: rf(16),
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  prosConsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: ResponsiveTheme.borderRadius.sm,
    padding: ResponsiveTheme.spacing.sm,
  },
  prosSection: {
    flex: 1,
  },
  consSection: {
    flex: 1,
  },
  prosConsDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: ResponsiveTheme.spacing.sm,
  },
  prosHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  consHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  prosTitle: {
    fontSize: rf(10),
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 4,
    textTransform: "uppercase",
  },
  consTitle: {
    fontSize: rf(10),
    fontWeight: "600",
    color: "#F59E0B",
    marginLeft: 4,
    textTransform: "uppercase",
  },
  prosText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 2,
  },
  consText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 2,
  },
});
