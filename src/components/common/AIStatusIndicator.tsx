// AI Status Indicator Component
// Shows whether the app is using real AI or demo mode

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rh } from "../../utils/responsive";
import { aiService } from "../../ai";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";

interface AIStatusIndicatorProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  onPress,
  style,
}) => {
  const status = aiService.getAIStatus();

  const statusColor = status.mode === "real" ? colors.success : colors.warning;
  const statusText = status.mode === "real" ? "AI Powered" : "Demo Mode";
  const statusIcon = status.mode === "real" ? "sparkles" : "flask-outline";

  const Component = onPress ? AnimatedPressable : View;

  return (
    <Component
      style={[styles.container, { borderColor: statusColor }, style]}
      onPress={onPress}
      accessibilityLabel={`AI Status: ${statusText}`}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityHint={onPress ? "Double tap to view AI details" : undefined}
    >
      <Ionicons name={statusIcon as any} size={rf(14)} color={statusColor} style={styles.icon} />
      <Text style={[styles.text, { color: statusColor }]} numberOfLines={1}>
        {statusText}
      </Text>
    </Component>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Math.max(rh(36), 44),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    backgroundColor: colors.glassHighlight,
  },

  icon: {
    marginRight: spacing.xs,
  },

  text: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
});

export default AIStatusIndicator;
