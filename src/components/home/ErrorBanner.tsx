import React from "react";
import { View, Text } from "react-native";
import { GlassButton } from "../ui/aurora/GlassButton";
import {
  flatColors as colors,
  spacing,
  borderRadius,
} from "../../theme/aurora-tokens";

interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onRetry }) => (
  <View
    style={{
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    }}
  >
    <View
      style={{
        padding: spacing.md,
        alignItems: "center",
        backgroundColor: colors.backgroundSecondary,
        borderColor: colors.error,
        borderWidth: 1,
        borderRadius: borderRadius.lg,
      }}
    >
      <Text
        style={{
          color: colors.error,
          marginBottom: spacing.sm,
          textAlign: "center",
        }}
      >
        {error}
      </Text>
      <GlassButton
        label="Tap to Retry"
        onPress={onRetry}
        variant="error"
        accessibilityLabel="Tap to Retry"
      />
    </View>
  </View>
);
