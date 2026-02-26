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
import { ResponsiveTheme } from "../../utils/constants";
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
      ? ResponsiveTheme.colors.success
      : ResponsiveTheme.colors.warning;
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
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 1,
    backgroundColor: ResponsiveTheme.colors.glassHighlight,
  },

  icon: {
    fontSize: rf(14),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  text: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});

export default AIStatusIndicator;
