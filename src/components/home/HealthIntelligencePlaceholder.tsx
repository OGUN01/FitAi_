import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { GlassCard } from "../ui/aurora/GlassCard";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw } from "../../utils/responsive";

interface HealthIntelligencePlaceholderProps {
  onPress?: () => void;
}

export const HealthIntelligencePlaceholder: React.FC<
  HealthIntelligencePlaceholderProps
> = ({ onPress }) => {
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
    >
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="pulse"
              size={rf(16)}
              color={colors.primary}
            />
            <Text style={styles.headerTitle}>Health Intelligence</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${colors.textMuted}40` },
            ]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: colors.textSecondary },
              ]}
            >
              No Data
            </Text>
          </View>
        </View>

        {/* Placeholder Content */}
        <View style={styles.placeholderContent}>
          <View style={styles.placeholderIconContainer}>
            <Ionicons
              name="fitness-outline"
              size={rf(28)}
              color={colors.primary}
            />
          </View>
          <View style={styles.placeholderTextBlock}>
            <Text style={styles.placeholderTitle}>Connect Health Data</Text>
            <Text style={styles.placeholderSubtitle}>
              Sync Apple Health or Health Connect to unlock recovery, sleep,
              and heart-rate insights.
            </Text>
            <View style={styles.placeholderHintRow}>
              <Ionicons
                name="phone-portrait-outline"
                size={rf(12)}
                color={colors.textMuted}
              />
              <Text style={styles.placeholderHintText}>
                Use Health Sync on your phone to get started
              </Text>
            </View>
          </View>
          {onPress ? (
            <Ionicons
              name="chevron-forward"
              size={rf(18)}
              color={colors.textMuted}
            />
          ) : null}
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  placeholderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  placeholderIconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: `${colors.primary}16`,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  placeholderTextBlock: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  placeholderSubtitle: {
    fontSize: rf(12),
    fontWeight: '400',
    color: colors.text,
    lineHeight: rf(18),
    opacity: 0.65,
  },
  placeholderHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  placeholderHintText: {
    fontSize: rf(10),
    color: colors.textMuted,
    flex: 1,
  },
});
