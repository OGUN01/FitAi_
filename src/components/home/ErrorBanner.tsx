import React from "react";
import { View, Text } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { Button } from "../ui";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";

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
    <GlassCard
      style={{
        padding: spacing.md,
        alignItems: "center",
        borderColor: colors.error,
        borderWidth: 1,
      }}
      elevation={1}
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
      <Button
        title="Tap to Retry"
        onPress={onRetry}
        variant="outline"
        size="sm"
      />
    </GlassCard>
  </View>
);
