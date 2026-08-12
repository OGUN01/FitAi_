import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rp } from "../../utils/responsive";

interface WarningBannerProps {
  platformName: string;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({
  platformName,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Ionicons name="information-circle" size={rf(24)} color={colors.warning} />
        <View style={styles.text}>
          <Text style={styles.title}>Development Build Required</Text>
          <Text style={styles.description}>
            {platformName} integration requires a development or production
            build. Running in Expo Go - wearable features are simulated.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningTint,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
    borderRadius: borderRadius.card,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  text: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.warning,
    marginBottom: rp(4),
  },
  description: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(18),
  },
});
