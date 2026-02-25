import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";

interface DescriptionCardProps {
  scheduledCount: number;
}

export const DescriptionCard: React.FC<DescriptionCardProps> = ({
  scheduledCount,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(50).duration(400)}>
      <GlassCard
        elevation={1}
        padding="md"
        blurIntensity="light"
        borderRadius="lg"
        style={styles.descriptionCard}
      >
        <View style={styles.descriptionContent}>
          <View style={styles.scheduledBadge}>
            <Ionicons name="calendar-outline" size={rf(14)} color="#fff" />
            <Text style={styles.scheduledText}>{scheduledCount}</Text>
          </View>
          <Text style={styles.descriptionText}>
            notifications currently scheduled
          </Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  descriptionCard: {
    marginBottom: ResponsiveTheme.spacing.lg,
    backgroundColor: "rgba(255, 107, 53, 0.1)",
  },
  descriptionContent: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  scheduledText: {
    fontSize: rf(12),
    fontWeight: "700",
    color: "#fff",
  },
  descriptionText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    flex: 1,
  },
});
