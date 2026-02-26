import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image"; // ✅ Use Expo Image for GIF animation support
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rs } from "../../utils/responsive";
import { exerciseFilterService } from "../../services/exerciseFilterService";

interface ExerciseGifPlayerProps {
  exerciseId: string; // Direct exercise ID - no more complex matching!
  exerciseName?: string; // Display name (optional, can be creative)
  height?: number;
  width?: number;
  showTitle?: boolean;
  showInstructions?: boolean;
  onInstructionsPress?: () => void;
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ExerciseGifPlayer: React.FC<ExerciseGifPlayerProps> = ({
  exerciseId,
  exerciseName,
  height = 200,
  width = 350,
  showTitle = true,
  showInstructions = true,
  onInstructionsPress,
  autoPlay = true,
  style,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Direct lookup by exercise ID with fallbacks (memoized to avoid side effects in render)
  const exercise = useMemo(() => {
    let result = exerciseFilterService.getExerciseById(exerciseId);

    // Fallback: Try case-insensitive and trimmed lookup if first attempt fails
    if (!result && exerciseId) {
      const cleanId = exerciseId.trim();
      const allIds = exerciseFilterService.getAllExerciseIds();
      const matchingId = allIds.find(
        (id) => id.toLowerCase() === cleanId.toLowerCase(),
      );
      if (matchingId) {
        result = exerciseFilterService.getExerciseById(matchingId);
      }
    }

    return result;
  }, [exerciseId]);


  // Always prioritize database name over passed name to avoid showing IDs
  const displayName = exercise?.name || exerciseName || "Exercise";

  useEffect(() => {
    if (exercise?.gifUrl) {
      setIsLoading(false);
      setHasError(false);
    } else {
      setIsLoading(false);
      setHasError(true);
      console.error(
        `🚨 EXERCISE NOT FOUND: ID "${exerciseId}" not in database`,
      );
    }
  }, [exercise, exerciseId]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error(
      `🚨 GIF LOAD ERROR: Failed to load GIF for exercise ID "${exerciseId}"`,
    );
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderFullscreenModal = () => {
    if (!exercise || !exercise.gifUrl) return null;

    const screenDimensions = Dimensions.get("window");
    const modalWidth = screenDimensions.width * 0.9;
    const modalHeight = screenDimensions.height * 0.7;

    return (
      <Modal
        visible={isFullscreen}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleFullscreen}
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
        <View style={styles.fullscreenOverlay}>
          <View style={styles.fullscreenContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={toggleFullscreen}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.fullscreenTitle}>{displayName}</Text>

            <Image
              source={{ uri: exercise.gifUrl }}
              style={[
                styles.fullscreenGif,
                { width: modalWidth, height: modalHeight * 0.8 },
              ]}
              contentFit="contain"
              transition={300}
              cachePolicy="memory-disk"
            />

            <Text style={styles.fullscreenHint}>
              🔍 Maximum quality view • Tap × to close
            </Text>
          </View>
        </View>
      </Modal>
    );
  };

  const renderExerciseInfo = () => {
    if (!exercise) return null;

    return (
      <View style={styles.exerciseInfo}>
        {showTitle && (
          <View style={styles.titleRow}>
            <Text style={styles.exerciseTitle} numberOfLines={2}>
              {displayName}
            </Text>
            {/* Quality indicator */}
            <View style={styles.qualityIndicator}>
              <Text style={styles.qualityText}>🎬 Demo</Text>
            </View>
          </View>
        )}

        {/* Equipment and muscle info */}
        <View style={styles.infoRow}>
          {exercise.equipments?.length > 0 && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                🏋️ {exercise.equipments?.[0] || "Equipment"}
              </Text>
            </View>
          )}
          {exercise.targetMuscles?.length > 0 && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                💪 {exercise.targetMuscles?.[0] || "Muscle"}
              </Text>
            </View>
          )}
        </View>

        {/* Instructions button */}
        {showInstructions && onInstructionsPress && (
          <TouchableOpacity
            style={styles.instructionsButton}
            onPress={onInstructionsPress}
          >
            <Text style={styles.instructionsButtonText}>
              📋 View Instructions ({exercise.instructions?.length || 0} steps)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderGifPlayer = () => {
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
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={toggleFullscreen}
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
                onLoad={handleImageLoad}
                onError={handleImageError}
                contentFit="contain" // Expo Image prop (was resizeMode)
                transition={300} // Smooth loading transition
                cachePolicy="memory-disk" // Better caching for GIFs
              />

              {/* Zoom hint overlay */}
              <View style={styles.zoomHint}>
                <Text style={styles.zoomHintText}>🔍 Tap to zoom</Text>
              </View>
            </TouchableOpacity>

            {/* Playback controls overlay */}
            <TouchableOpacity
              style={styles.playbackOverlay}
              onPress={togglePlayback}
              activeOpacity={0.7}
            >
              <View style={styles.playbackButton}>
                <Text style={styles.playbackIcon}>
                  {isPlaying ? "⏸️" : "▶️"}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <>
      <Card
        style={StyleSheet.flatten([styles.container, style])}
        variant="elevated"
      >
        {renderGifPlayer()}
        {renderExerciseInfo()}
      </Card>
      {renderFullscreenModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    overflow: "hidden",
    alignSelf: "center",
  },

  gifContainer: {
    position: "relative",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: ResponsiveTheme.borderRadius.lg,
    borderTopRightRadius: ResponsiveTheme.borderRadius.lg,
    alignSelf: "center",
    // Enhanced visual quality perception
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
    // Enhanced sharpness perception
    backgroundColor: "#ffffff",
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

  exerciseInfo: {
    padding: ResponsiveTheme.spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  exerciseTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  qualityIndicator: {
    backgroundColor: ResponsiveTheme.colors.success + "20",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  qualityText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.success,
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  infoChip: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  infoChipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
  },

  instructionsButton: {
    backgroundColor: ResponsiveTheme.colors.primary + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "30",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignSelf: "flex-start",
  },

  instructionsButtonText: {
    color: ResponsiveTheme.colors.primary,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
  },

  // Zoom and Fullscreen Styles
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
    color: "white",
    fontSize: rf(10),
    fontWeight: "500",
  },

  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },

  fullscreenContainer: {
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
  },

  closeButton: {
    position: "absolute",
    top: rp(20),
    right: rp(20),
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: rbr(20),
    width: rs(40),
    height: rs(40),
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    color: "white",
    fontSize: rf(20),
    fontWeight: "bold",
  },

  fullscreenTitle: {
    color: "white",
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    textTransform: "capitalize",
  },

  fullscreenGif: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  fullscreenHint: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: ResponsiveTheme.fontSize.sm,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.md,
  },
});
