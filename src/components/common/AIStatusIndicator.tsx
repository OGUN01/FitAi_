// AI Status Indicator Component
// Shows whether the app is using real AI or demo mode

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";
import { aiService } from "../../ai";

interface AIStatusIndicatorProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  onPress,
  style,
}) => {
  const status = aiService.getAIStatus();

  const getStatusColor = () => {
    return status.mode === "real"
      ? colors.success
      : colors.warning;
  };

  const getStatusIcon = () => {
    return status.mode === "real" ? "🤖" : "🎭";
  };

  const getStatusText = () => {
    return status.mode === "real" ? "AI Powered" : "Demo Mode";
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[styles.container, { borderColor: getStatusColor() }, style]}
      onPress={onPress}
      accessibilityLabel={`AI Status: ${getStatusText()}`}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityHint={onPress ? "Double tap to view AI details" : undefined}
    >
      <Text style={styles.icon}>{getStatusIcon()}</Text>
      <Text style={[styles.text, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </Component>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    backgroundColor: colors.glassHighlight,
  },

  icon: {
    fontSize: rf(14),
    marginRight: spacing.xs,
  },

  text: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
});

export default AIStatusIndicator;
