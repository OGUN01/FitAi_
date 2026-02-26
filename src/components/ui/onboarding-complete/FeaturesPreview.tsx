import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedRN, { FadeInUp } from "react-native-reanimated";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";

const FEATURES = [
  {
    icon: "sparkles",
    text: "AI-powered workout plans",
    color: ResponsiveTheme.colors.primary,
  },
  {
    icon: "nutrition",
    text: "Smart meal recommendations",
    color: ResponsiveTheme.colors.successAlt,
  },
  {
    icon: "trending-up",
    text: "Progress tracking & insights",
    color: ResponsiveTheme.colors.errorLight,
  },
];

export const FeaturesPreview: React.FC = () => {
  return (
    <AnimatedRN.View
      entering={FadeInUp.delay(700).duration(400)}
      style={styles.featuresContainer}
    >
      {FEATURES.map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <Ionicons
            name={feature.icon as keyof typeof Ionicons.glyphMap}
            size={rf(16)}
            color={feature.color}
          />
          <Text style={styles.featureText}>{feature.text}</Text>
        </View>
      ))}
    </AnimatedRN.View>
  );
};

const styles = StyleSheet.create({
  featuresContainer: {
    marginBottom: ResponsiveTheme.spacing.xl,
    gap: ResponsiveTheme.spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },
  featureText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.text,
  },
});
