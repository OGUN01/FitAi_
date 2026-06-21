import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../../theme/aurora-tokens";
import { rf, rw, rbr } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

interface NotificationsHeaderProps {
  onBack?: () => void;
}

export const NotificationsHeader: React.FC<NotificationsHeaderProps> = ({
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
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.backButton}>
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </View>
      </AnimatedPressable>
      <View style={styles.headerCenter}>
        <Ionicons
          name="notifications-outline"
          size={rf(18)}
          color={colors.primary}
        />
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <View style={styles.headerSpacer} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(20),
    backgroundColor: colors.glassBorder,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: colors.text,
  },
  headerSpacer: {
    width: rw(40),
  },
});
