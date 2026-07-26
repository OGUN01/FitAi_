import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { rf, rp, rbr, rs } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";

interface GifPlayerContentProps {
  exercise: any;
  exerciseId: string;
  height: number;
  width: number;
  isLoading: boolean;
  hasError: boolean;
  isPlaying: boolean;
  onImageLoad: () => void;
  onImageError: () => void;
  onTogglePlayback: () => void;
  onToggleFullscreen: () => void;
  onRetry: () => void;
}

export const GifPlayerContent: React.FC<GifPlayerContentProps> = ({
  exercise,
  exerciseId,
  height,
  width,
  isLoading,
  hasError,
  isPlaying,
  onImageLoad,
  onImageError,
  onTogglePlayback,
  onToggleFullscreen,
  onRetry,
}) => {
  if (!exercise || !exercise.gifUrl) {
    return (
      <View style={[styles.placeholder, { height, width }]} accessibilityRole="text">
        <Text style={styles.placeholderText}>Exercise Not Found</Text>
        <Text style={styles.placeholderSubtext}>No demo available</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.gifContainer,
        { height, width },
        // boxShadow is web-only; native uses shadow* props above. Including it
        // on native logs a warning, so gate via Platform.
        Platform.OS === "web" && { boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" },
      ]}
    >
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading demonstration...</Text>
        </View>
      )}

      {hasError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={rf(32)} color={colors.error} />
          <Text style={styles.errorText}>Failed to load demonstration</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading exercise demonstration"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={onToggleFullscreen}
            activeOpacity={0.8}
            style={styles.gifTouchArea}
            accessibilityRole="button"
            accessibilityLabel="Open fullscreen demonstration"
          >
            <Image
              source={{ uri: exercise.gifUrl }}
              style={[
                styles.gif,
                {
                  height,
                  width,
                  maxWidth: "100%",
                  maxHeight: "100%",
                },
              ]}
              onLoad={onImageLoad}
              onError={onImageError}
              contentFit="contain"
              transition={300}
              cachePolicy="memory-disk"
            />

            <View style={styles.zoomHint}>
              <Text style={styles.zoomHintText}>Tap to zoom</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playbackOverlay}
            onPress={onTogglePlayback}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause demonstration" : "Play demonstration"}
          >
            <View style={styles.playbackButton}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={rf(16)}
                color="white"
              />
            </View>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  gifContainer: {
    position: "relative",
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    alignSelf: "center",
    borderWidth: 1,
    // Was hardcoded "rgba(255, 107, 53, 0.2)" — hexToRgba tracks colors.primary.
    borderColor: hexToRgba(colors.primary, 0.2),
    // Native shadow props (ignored on web — web gets boxShadow via inline style
    // at the call site to avoid the RN warning).
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  gif: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    // Was hardcoded "rgba(255, 107, 53, 0.1)" — hexToRgba tracks colors.primary.
    borderColor: hexToRgba(colors.primary, 0.1),
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    zIndex: 2,
  },

  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  playbackOverlay: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 3,
  },

  playbackButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: Math.max(rbr(20), 22),
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    justifyContent: "center",
    alignItems: "center",
  },

  placeholder: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },

  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
    fontWeight: "500",
  },

  placeholderSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },

  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },

  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
  },

  retryButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },

  gifTouchArea: {
    position: "relative",
  },

  zoomHint: {
    position: "absolute",
    bottom: rp(8),
    right: rp(8),
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
  },

  // White text on dark rgba(0,0,0,0.7) — colors.text (dark) was failing
  // contrast on this dark overlay.
  zoomHintText: {
    color: "white",
    fontSize: rf(10),
    fontWeight: "500",
  },
});
