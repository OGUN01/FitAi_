import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
import { FeatureItem } from "../../hooks/useAboutFitAILogic";

interface AboutFitAIFeatureCardProps {
  feature: FeatureItem;
  index: number;
}

export const AboutFitAIFeatureCard: React.FC<AboutFitAIFeatureCardProps> = ({
  feature,
  index,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(300 + index * 50).duration(400)}
      style={styles.featureWrapper}
    >
      <GlassCard
        elevation={1}
        padding="md"
        blurIntensity="light"
        borderRadius="lg"
        style={styles.featureCard}
      >
        <View
          style={[
            styles.featureIcon,
            { backgroundColor: `${feature.color}15` },
          ]}
        >
          <Ionicons name={feature.icon} size={rf(20)} color={feature.color} />
        </View>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  featureWrapper: {
    width: "48.5%",
  },
  featureCard: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.lg,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  featureIcon: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  featureTitle: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(15),
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },
});
