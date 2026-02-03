import React from "react";
import { View, Text } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";

interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onRetry }) => (
  <View
    style={{
      paddingHorizontal: ResponsiveTheme.spacing.md,
      marginBottom: ResponsiveTheme.spacing.md,
    }}
  >
    <GlassCard
      style={{
        padding: ResponsiveTheme.spacing.md,
        alignItems: "center",
        borderColor: ResponsiveTheme.colors.error,
        borderWidth: 1,
      }}
      elevation={1}
    >
      <Text
        style={{
          color: ResponsiveTheme.colors.error,
          marginBottom: ResponsiveTheme.spacing.sm,
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
