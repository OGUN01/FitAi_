import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf } from "../../utils/responsive";

interface AboutFitAISocialButtonsProps {
  onSocialPress: (platform: string) => void;
}

export const AboutFitAISocialButtons: React.FC<
  AboutFitAISocialButtonsProps
> = ({ onSocialPress }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(750).duration(400)}
      style={styles.socialGrid}
    >
      <AnimatedPressable
        onPress={() => onSocialPress("twitter")}
        scaleValue={0.95}
        hapticFeedback={false}
        style={styles.socialButtonWrapper}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.socialButton}
        >
          <Ionicons name="logo-twitter" size={rf(20)} color="#1DA1F2" />
          <Text style={styles.socialText}>Twitter</Text>
        </GlassCard>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => onSocialPress("instagram")}
        scaleValue={0.95}
        hapticFeedback={false}
        style={styles.socialButtonWrapper}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.socialButton}
        >
          <Ionicons name="logo-instagram" size={rf(20)} color="#E4405F" />
          <Text style={styles.socialText}>Instagram</Text>
        </GlassCard>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => onSocialPress("facebook")}
        scaleValue={0.95}
        hapticFeedback={false}
        style={styles.socialButtonWrapper}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.socialButton}
        >
          <Ionicons name="logo-facebook" size={rf(20)} color="#1877F2" />
          <Text style={styles.socialText}>Facebook</Text>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  socialGrid: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },
  socialButtonWrapper: {
    flex: 1,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  socialText: {
    fontSize: rf(12),
    fontWeight: "500",
    color: "#fff",
  },
});
