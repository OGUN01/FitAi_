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
import { getFallbackGifUrl } from "../../services/exercise-visual/urlUtils";

interface ExerciseGifPlayerProps {
  exerciseId: string; // Direct exercise ID - no more complex matching!
  exerciseName?: string; // Display name (optional, can be creative)
  height?: number;
  width?: number;
  showTitle?: boolean;
  showInstructions?: boolean;
  onInstructionsPress?: () => void;
  autoPlay?: boolean;
  /** When false, hides the pause/play button and "Tap to zoom" hint. Use inside modals. */
  showControls?: boolean;
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
  showControls = true,
  style,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const getFallbackDisplayName = (value: string) =>
    value
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  // Direct lookup by exercise ID with fallbacks, then name-based fuzzy match
  const exercise = useMemo(() => {
    // 1. Direct ID lookup
    let result = exerciseFilterService.getExerciseById(exerciseId);

    // 2. Case-insensitive ID fallback
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

    // 3. Name-based fuzzy match using exerciseName prop
    if (!result && exerciseName) {
      result = exerciseFilterService.getExerciseByName(exerciseName);
    }

    // 4. Try using exerciseId itself as a name (e.g. "sun_salutation" -> "Sun Salutation")
    if (!result && exerciseId) {
      result = exerciseFilterService.getExerciseByName(exerciseId);
    }

    return result;
  }, [exerciseId, exerciseName]);


  // Always prioritize database name over passed name to avoid showing IDs
  const displayName =
    exercise?.name ||
    exerciseName ||
    (exerciseId ? getFallbackDisplayName(exerciseId) : "") ||
    "Exercise";

  useEffect(() => {
    // Reset fallback whenever exercise changes
    setFallbackUrl(null);
    if (exercise?.gifUrl) {
      setIsLoading(true);
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
    // If we haven't tried a fallback yet, swap to a Giphy-based fallback URL silently
    if (!fallbackUrl) {
      const fb = getFallbackGifUrl(displayName || exerciseId);
      console.warn(
        `⚠️ GIF load failed for "${exerciseId}", trying fallback: ${fb}`,
      );
      setFallbackUrl(fb);
      setIsLoading(true); // show spinner while fallback loads
    } else {
      // Fallback also failed — show error UI
      setHasError(true);
      console.error(
        `🚨 GIF LOAD ERROR: Both primary and fallback GIFs failed for exercise ID "${exerciseId}"`,
      );
    }
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
        <StatusBar barStyle="light-content" />
        <View style={styles.fullscreenOverlay}>
          <View style={styles.fullscreenContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={toggleFullscreen}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Close ${displayName} fullscreen view`}
            >
              <Text style={styles.closeButtonText}>X</Text>
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
              Maximum quality view - tap X to close
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
              <Text style={styles.qualityText}>Demo</Text>
            </View>
          </View>
        )}

        {/* Equipment and muscle info */}
        <View style={styles.infoRow}>
          {exercise.equipments?.length > 0 && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                Equipment: {exercise.equipments?.[0] || "Equipment"}
              </Text>
            </View>
          )}
          {exercise.targetMuscles?.length > 0 && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                Target: {exercise.targetMuscles?.[0] || "Muscle"}
              </Text>
            </View>
          )}
        </View>

        {/* Instructions button */}
        {showInstructions && onInstructionsPress && (
          <TouchableOpacity
            style={styles.instructionsButton}
            onPress={onInstructionsPress}
            accessibilityRole="button"
            accessibilityLabel={`View ${displayName} instructions`}
          >
            <Text style={styles.instructionsButtonText}>
              View Instructions
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
          <Text style={styles.placeholderText}>Demo unavailable</Text>
          <Text style={styles.placeholderSubtext}>
            We could not load the movement demo for {displayName}.
          </Text>
          {showInstructions && onInstructionsPress ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onInstructionsPress}
              accessibilityRole="button"
              accessibilityLabel={`View ${displayName} instructions`}
            >
              <Text style={styles.retryButtonText}>View Instructions</Text>
            </TouchableOpacity>
          ) : null}
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
            <Text style={styles.errorEmoji}>!</Text>
            <Text style={styles.errorText}>Failed to load demonstration</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading exercise demonstration"
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
                source={{ uri: fallbackUrl ?? exercise.gifUrl }}
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

              {/* Zoom hint overlay — hidden when showControls=false */}
              {showControls && (
                <View style={styles.zoomHint}>
                  <Text style={styles.zoomHintText}>Tap to zoom</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Playback controls overlay — hidden when showControls=false */}
            {showControls && (
              <TouchableOpacity
                style={styles.playbackOverlay}
                onPress={togglePlayback}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? "Pause exercise demonstration" : "Play exercise demonstration"}
              >
                <View style={styles.playbackButton}>
                  <Text style={styles.playbackIcon}>
                    {isPlaying ? "||" : ">"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
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
    borderRadius: Math.max(rbr(20), 22),
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
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

  placeholderText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
    fontWeight: "600",
  },

  placeholderSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
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
    minHeight: 44,
    borderRadius: ResponsiveTheme.borderRadius.md,
    justifyContent: "center",
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
    minHeight: 44,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignSelf: "flex-start",
    justifyContent: "center",
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
    borderRadius: Math.max(rbr(20), 22),
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
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
