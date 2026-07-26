import React from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { rw } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, flatShadows as shadows } from "../../theme/aurora-tokens";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  text?: string;
  style?: ViewStyle;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "large",
  color = colors.primary,
  text,
  style,
  overlay = false,
}) => {
  if (overlay) {
    return (
      <View
        style={[styles.overlay, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={text || "Loading"}
      >
        <View style={styles.overlayContent}>
          <ActivityIndicator size={size} color={color} />
          {text && <Text style={styles.overlayText} numberOfLines={2}>{text}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={text || "Loading"}
    >
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text} numberOfLines={2}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },

  text: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    // Above content but below modals/dialogs (zIndex.modal is 1400). The
    // previous zIndex:1000 meant a spinner shown inside a modal could be
    // hidden behind the modal backdrop.
    zIndex: 1500,
    elevation: 1500,
  },

  overlayContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    minWidth: rw(120),
    ...shadows.lg,
  },

  overlayText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: "center",
  },
});
