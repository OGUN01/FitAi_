import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";

const COMPATIBLE_DEVICES = {
  android: [
    { name: "Samsung Galaxy Watch", icon: "watch-outline" },
    { name: "Google Pixel Watch", icon: "watch-outline" },
    { name: "Fitbit (via app)", icon: "fitness-outline" },
    { name: "Garmin (via app)", icon: "fitness-outline" },
    { name: "Xiaomi Mi Band", icon: "fitness-outline" },
    { name: "Wear OS devices", icon: "watch-outline" },
  ],
  ios: [
    { name: "Apple Watch", icon: "watch-outline" },
    { name: "Fitbit (via app)", icon: "fitness-outline" },
    { name: "Garmin (via app)", icon: "fitness-outline" },
    { name: "Oura Ring", icon: "ellipse-outline" },
    { name: "Whoop", icon: "fitness-outline" },
  ],
};

interface CompatibleDevicesCardProps {
  platformName: string;
  isIOS: boolean;
}

export const CompatibleDevicesCard: React.FC<CompatibleDevicesCardProps> = ({
  platformName,
  isIOS,
}) => {
  const devices = isIOS ? COMPATIBLE_DEVICES.ios : COMPATIBLE_DEVICES.android;

  return (
    <GlassCard elevation={1} style={styles.card}>
      <Text style={styles.title}>Compatible Devices</Text>
      <Text style={styles.subtitle}>
        {platformName} automatically syncs data from these devices:
      </Text>
      <View style={styles.list}>
        {devices.map((device, index) => (
          <View key={index} style={styles.item}>
            <Ionicons
              name={device.icon as keyof typeof Ionicons.glyphMap}
              size={rf(18)}
              color={colors.primary}
            />
            <Text style={styles.name}>{device.name}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glassSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: rf(13),
    color: colors.text,
    marginLeft: spacing.xs,
  },
});
