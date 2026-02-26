import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp, rbr, rs } from "../../../utils/responsive";
import { colors } from "../../../theme/aurora-tokens";

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
      <View style={[styles.placeholder, { height, width }]}>
        <Text style={styles.placeholderEmoji}>🚨</Text>
        <Text style={styles.placeholderText}>Exercise Not Found</Text>
        <Text style={styles.placeholderSubtext}>ID: {exerciseId}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.gifContainer, { height, width }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading demonstration...</Text>
        </View>
      )}

      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>Failed to load demonstration</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={onToggleFullscreen}
            activeOpacity={0.8}
            style={styles.gifTouchArea}
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
              <Text style={styles.zoomHintText}>🔍 Tap to zoom</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playbackOverlay}
            onPress={onTogglePlayback}
            activeOpacity={0.7}
          >
            <View style={styles.playbackButton}>
              <Text style={styles.playbackIcon}>{isPlaying ? "⏸️" : "▶️"}</Text>
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
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: ResponsiveTheme.borderRadius.lg,
    borderTopRightRadius: ResponsiveTheme.borderRadius.lg,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "20",
    shadowColor: ResponsiveTheme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  gif: {
    borderTopLeftRadius: ResponsiveTheme.borderRadius.lg,
    borderTopRightRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: ResponsiveTheme.colors.primary + "10",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    zIndex: 2,
  },

  loadingText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  playbackOverlay: {
    position: "absolute",
    top: ResponsiveTheme.spacing.sm,
    right: ResponsiveTheme.spacing.sm,
    zIndex: 3,
  },

  playbackButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: rbr(20),
    width: rs(40),
    height: rs(40),
    justifyContent: "center",
    alignItems: "center",
  },

  playbackIcon: {
    fontSize: rf(16),
  },

  placeholder: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: ResponsiveTheme.borderRadius.lg,
    borderTopRightRadius: ResponsiveTheme.borderRadius.lg,
  },

  placeholderEmoji: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  placeholderText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
    fontWeight: "500",
  },

  placeholderSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },

  errorEmoji: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  retryButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  retryButtonText: {
    color: ResponsiveTheme.colors.surface,
    fontSize: ResponsiveTheme.fontSize.sm,
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

  zoomHintText: {
    color: colors.text.primary,
    fontSize: rf(10),
    fontWeight: "500",
  },
});
