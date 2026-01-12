import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image'; // ✅ Use Expo Image for GIF animation support
import { Card, THEME } from '../ui';
import { exerciseFilterService } from '../../services/exerciseFilterService';

interface ExerciseGifPlayerProps {
  exerciseId: string; // Direct exercise ID - no more complex matching!
  exerciseName?: string; // Display name (optional, can be creative)
  height?: number;
  width?: number;
  showTitle?: boolean;
  showInstructions?: boolean;
  onInstructionsPress?: () => void;
  autoPlay?: boolean;
  style?: any;
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

  // Direct lookup by exercise ID with fallbacks
  let exercise = exerciseFilterService.getExerciseById(exerciseId);

  // Fallback: Try case-insensitive and trimmed lookup if first attempt fails
  if (!exercise && exerciseId) {
    const cleanId = exerciseId.trim();
    const allIds = exerciseFilterService.getAllExerciseIds();
    const matchingId = allIds.find((id) => id.toLowerCase() === cleanId.toLowerCase());
    if (matchingId) {
      exercise = exerciseFilterService.getExerciseById(matchingId);
      console.log(`🔄 Used fallback lookup: "${exerciseId}" → "${matchingId}"`);
    }
  }

  // 🐛 DEBUG: Log exercise lookup details (DISABLED TO STOP SPAM)
  if (exerciseId && !exercise) {
    console.log(`🔍 ExerciseGifPlayer - Exercise NOT FOUND for ID: "${exerciseId}"`);
  }

  // Always prioritize database name over passed name to avoid showing IDs
  const displayName = exercise?.name || exerciseName || 'Exercise';

  useEffect(() => {
    if (exercise?.gifUrl) {
      setIsLoading(false);
      setHasError(false);
    } else {
      setIsLoading(false);
      setHasError(true);
      console.error(`🚨 EXERCISE NOT FOUND: ID "${exerciseId}" not in database`);
    }
  }, [exercise, exerciseId]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error(`🚨 GIF LOAD ERROR: Failed to load GIF for exercise ID "${exerciseId}"`);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderFullscreenModal = () => {
    if (!exercise || !exercise.gifUrl) return null;

    const screenDimensions = Dimensions.get('window');
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
            <TouchableOpacity style={styles.closeButton} onPress={toggleFullscreen}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.fullscreenTitle}>{displayName}</Text>

            <Image
              source={{ uri: exercise.gifUrl }}
              style={[styles.fullscreenGif, { width: modalWidth, height: modalHeight * 0.8 }]}
              contentFit="contain"
              transition={300}
              cachePolicy="memory-disk"
            />

            <Text style={styles.fullscreenHint}>🔍 Maximum quality view • Tap × to close</Text>
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
              <Text style={styles.infoChipText}>🏋️ {exercise.equipments?.[0] || 'Equipment'}</Text>
            </View>
          )}
          {exercise.targetMuscles?.length > 0 && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>💪 {exercise.targetMuscles?.[0] || 'Muscle'}</Text>
            </View>
          )}
        </View>

        {/* Instructions button */}
        {showInstructions && onInstructionsPress && (
          <TouchableOpacity style={styles.instructionsButton} onPress={onInstructionsPress}>
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
            <ActivityIndicator size="large" color={THEME.colors.primary} />
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
                    maxWidth: '100%',
                    maxHeight: '100%',
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
                <Text style={styles.playbackIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <>
      <Card style={StyleSheet.flatten([styles.container, style])} variant="elevated">
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
    overflow: 'hidden',
    alignSelf: 'center',
  },

  gifContainer: {
    position: 'relative',
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
    alignSelf: 'center',
    // Enhanced visual quality perception
    borderWidth: 1,
    borderColor: THEME.colors.primary + '20',
    shadowColor: THEME.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  gif: {
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
    // Enhanced sharpness perception
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: THEME.colors.primary + '10',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.backgroundSecondary,
    zIndex: 2,
  },

  loadingText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.sm,
  },

  playbackOverlay: {
    position: 'absolute',
    top: THEME.spacing.sm,
    right: THEME.spacing.sm,
    zIndex: 3,
  },

  playbackButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  playbackIcon: {
    fontSize: 16,
  },

  placeholder: {
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
    fontWeight: '500',
  },

  placeholderSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },

  errorEmoji: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },

  errorText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.error,
    textAlign: 'center',
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
    fontWeight: '600',
  },

  exerciseInfo: {
    padding: THEME.spacing.lg,
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },

  exerciseTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    flex: 1,
    marginRight: THEME.spacing.sm,
  },

  qualityIndicator: {
    backgroundColor: THEME.colors.success + '20',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },

  qualityText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.success,
    fontWeight: '600',
  },

  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },

  infoChip: {
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.lg,
  },

  infoChipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },

  instructionsButton: {
    backgroundColor: THEME.colors.primary + '10',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '30',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignSelf: 'flex-start',
  },

  instructionsButtonText: {
    color: THEME.colors.primary,
    fontSize: THEME.fontSize.sm,
    fontWeight: '600',
  },

  // Zoom and Fullscreen Styles
  gifTouchArea: {
    position: 'relative',
  },

  zoomHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  zoomHintText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },

  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullscreenContainer: {
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },

  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },

  fullscreenTitle: {
    color: 'white',
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    textTransform: 'capitalize',
  },

  fullscreenGif: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  fullscreenHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: THEME.fontSize.sm,
    textAlign: 'center',
    marginTop: THEME.spacing.md,
  },
});
