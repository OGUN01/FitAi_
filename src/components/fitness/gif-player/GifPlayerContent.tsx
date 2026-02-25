import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { THEME } from "../../ui";
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
          <ActivityIndicator size="large" color={THEME.colors.primary} />
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
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: THEME.colors.primary + "20",
    shadowColor: THEME.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  gif: {
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: THEME.colors.primary + "10",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.backgroundSecondary,
    zIndex: 2,
  },

  loadingText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.sm,
  },

  playbackOverlay: {
    position: "absolute",
    top: THEME.spacing.sm,
    right: THEME.spacing.sm,
    zIndex: 3,
  },

  playbackButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  playbackIcon: {
    fontSize: 16,
  },

  placeholder: {
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
  },

  placeholderEmoji: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },

  placeholderText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginBottom: THEME.spacing.sm,
    fontWeight: "500",
  },

  placeholderSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: "center",
  },

  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },

  errorEmoji: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },

  errorText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.error,
    textAlign: "center",
    marginBottom: THEME.spacing.md,
  },

  retryButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },

  retryButtonText: {
    color: THEME.colors.surface,
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
  },

  gifTouchArea: {
    position: "relative",
  },

  zoomHint: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  zoomHintText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: "500",
  },
});
