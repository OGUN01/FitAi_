import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface AboutFitAIHeaderProps {
  onBack?: () => void;
}

export const AboutFitAIHeader: React.FC<AboutFitAIHeaderProps> = ({
  onBack,
}) => {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onBack?.();
        }}
        scaleValue={0.9}
        hapticFeedback={false}
      >
        <View style={styles.backButton}>
          <Ionicons name="chevron-back" size={rf(20)} color="#fff" />
        </View>
      </AnimatedPressable>
      <View style={styles.headerCenter}>
        <Ionicons
          name="information-circle-outline"
          size={rf(18)}
          color={ResponsiveTheme.colors.primary}
        />
        <Text style={styles.headerTitle}>About FitAI</Text>
      </View>
      <View style={styles.headerSpacer} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#fff",
  },
  headerSpacer: {
    width: rw(40),
  },
});
