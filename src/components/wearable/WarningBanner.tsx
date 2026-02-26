import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp } from "../../utils/responsive";

interface WarningBannerProps {
  platformName: string;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({
  platformName,
}) => {
  return (
    <GlassCard elevation={1} style={styles.card}>
      <View style={styles.content}>
        <Ionicons name="information-circle" size={rf(24)} color="#FFA726" />
        <View style={styles.text}>
          <Text style={styles.title}>Development Build Required</Text>
          <Text style={styles.description}>
            {platformName} integration requires a development or production
            build. Running in Expo Go - wearable features are simulated.
          </Text>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: "rgba(255, 167, 38, 0.15)",
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  text: {
    flex: 1,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  title: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#FFA726",
    marginBottom: rp(4),
  },
  description: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
});
