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
          <Ionicons
            name="fitness-outline"
            size={rf(48)}
            color={ResponsiveTheme.colors.textMuted}
          />
          <Text style={styles.placeholderTitle}>Connect Health Data</Text>
          <Text style={styles.placeholderSubtitle}>
            Connect to Health Connect or Apple Health to see your recovery metrics and health insights.
          </Text>
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.xl,
    gap: ResponsiveTheme.spacing.sm,
  },
  placeholderTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  placeholderSubtitle: {
    fontSize: rf(12),
    fontWeight: '400',
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    lineHeight: rf(18),
    opacity: 0.65,
  },
});
