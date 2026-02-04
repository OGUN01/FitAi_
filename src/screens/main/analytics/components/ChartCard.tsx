import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rw } from "../../../../utils/responsive";

interface ChartCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  legend?: { color: string; label: string }[];
  delay?: number;
  onPress?: () => void;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  icon,
  iconColor,
  legend,
  delay = 0,
  onPress,
  children,
}) => {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={!!onPress}
        hapticType="light"
        disabled={!onPress}
      >
        <GlassCard
          elevation={2}
          blurIntensity="light"
          padding="lg"
          borderRadius="lg"
        >
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View
                style={[
                  styles.chartIconContainer,
                  { backgroundColor: `${iconColor}20` },
                ]}
              >
                <Ionicons name={icon} size={rf(16)} color={iconColor} />
              </View>
              <Text style={styles.chartTitle}>{title}</Text>
            </View>

            {legend && (
              <View style={styles.legendContainer}>
                {legend.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {children}
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chartHeader: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  chartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  chartIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(8),
    justifyContent: "center",
    alignItems: "center",
  },
  chartTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.2,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  legendDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
  },
  legendText: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
});
