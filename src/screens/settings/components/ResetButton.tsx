import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";

interface ResetButtonProps {
  onPress: () => void;
}

export const ResetButton: React.FC<ResetButtonProps> = ({ onPress }) => {
  return (
    <Animated.View entering={FadeInDown.delay(350).duration(400)}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="light"
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.actionCard}
        >
          <View style={styles.actionContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: "rgba(244, 67, 54, 0.15)" },
              ]}
            >
              <Ionicons name="refresh-outline" size={rf(20)} color="#F44336" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Reset to Defaults</Text>
              <Text style={styles.actionDescription}>
                Restore all notification settings
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={rf(18)}
              color={ResponsiveTheme.colors.textMuted}
            />
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },
  actionTextContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  actionTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
});
