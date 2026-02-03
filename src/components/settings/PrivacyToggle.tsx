import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface PrivacyToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  animationDelay: number;
}

export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  icon,
  iconColor,
  title,
  description,
  value,
  onToggle,
  animationDelay,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <GlassCard
        elevation={1}
        padding="md"
        blurIntensity="light"
        borderRadius="lg"
        style={styles.toggleCard}
      >
        <View style={styles.toggleContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}15` },
            ]}
          >
            <Ionicons name={icon} size={rf(18)} color={iconColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.toggleTitle}>{title}</Text>
            <Text style={styles.toggleDescription} numberOfLines={2}>
              {description}
            </Text>
          </View>
          <Switch
            value={value}
            onValueChange={() => {
              haptics.light();
              onToggle();
            }}
            trackColor={{
              false: "rgba(255, 255, 255, 0.1)",
              true: `${ResponsiveTheme.colors.primary}50`,
            }}
            thumbColor={
              value
                ? ResponsiveTheme.colors.primary
                : "rgba(255, 255, 255, 0.4)"
            }
            ios_backgroundColor="rgba(255, 255, 255, 0.1)"
          />
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toggleCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  toggleTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
});
