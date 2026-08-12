import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../../components/ui/aurora/AnimatedPressable";
import {
  surface,
  border,
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../../theme/aurora-tokens";
import { rf, rw } from "../../../../utils/responsive";
import { hexToRgba } from "../../../../utils/colors";

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
    <Animated.View entering={FadeInDown.delay(delay).duration(350)}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={!!onPress}
        hapticType="light"
        disabled={!onPress}
      >
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View
                style={[
                  styles.chartIconContainer,
                  { backgroundColor: hexToRgba(iconColor, 0.14) },
                ]}
              >
                <Ionicons name={icon} size={rf(16)} color={iconColor} />
              </View>
              <Text style={styles.chartTitle} numberOfLines={1}>{title}</Text>
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
                    <Text style={styles.legendText} numberOfLines={1}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {children}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.lg,
  },
  chartHeader: {
    marginBottom: spacing.md,
  },
  chartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chartIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  chartTitle: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: rf(15),
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: 4,
  },
  legendText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(11),
    color: colors.text.secondary,
  },
});
