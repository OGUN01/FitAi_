import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
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
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.headerTitle}>Health Intelligence</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${ResponsiveTheme.colors.textMuted}40` },
            ]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: ResponsiveTheme.colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: ResponsiveTheme.colors.textSecondary },
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
              color={ResponsiveTheme.colors.primary}
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
                color={ResponsiveTheme.colors.textMuted}
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
              color={ResponsiveTheme.colors.textMuted}
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
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: ResponsiveTheme.spacing.xs,
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
    gap: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  placeholderIconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: `${ResponsiveTheme.colors.primary}16`,
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
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  placeholderSubtitle: {
    fontSize: rf(12),
    fontWeight: '400',
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(18),
    opacity: 0.65,
  },
  placeholderHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  placeholderHintText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    flex: 1,
  },
});
