import { logger } from '../utils/logger';
import { useState, useEffect } from "react";
import { exerciseFilterService } from "../services/exerciseFilterService";

interface UseExerciseGifPlayerProps {
  exerciseId: string;
  exerciseName?: string;
  autoPlay?: boolean;
}

export const useExerciseGifPlayer = ({
  exerciseId,
  exerciseName,
  autoPlay = true,
}: UseExerciseGifPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Direct lookup by exercise ID with fallbacks, then name-based fuzzy match
  let exercise = exerciseFilterService.getExerciseById(exerciseId);

  // Fallback: Try case-insensitive and trimmed lookup if first attempt fails
  if (!exercise && exerciseId) {
    const cleanId = exerciseId.trim();
    const allIds = exerciseFilterService.getAllExerciseIds();
    const matchingId = allIds.find(
      (id) => id.toLowerCase() === cleanId.toLowerCase(),
    );
    if (matchingId) {
      exercise = exerciseFilterService.getExerciseById(matchingId);
    }
  }

  // Name-based fuzzy match using exerciseName prop
  if (!exercise && exerciseName) {
    exercise = exerciseFilterService.getExerciseByName(exerciseName);
  }

  // Try using exerciseId itself as a name (e.g. "sun_salutation" -> "Sun Salutation")
  if (!exercise && exerciseId) {
    exercise = exerciseFilterService.getExerciseByName(exerciseId);
  }

  // 🐛 DEBUG: Log exercise lookup details (DISABLED TO STOP SPAM)
  if (exerciseId && !exercise) {
  }

  // Always prioritize database name over passed name to avoid showing IDs
  const displayName = exercise?.name || exerciseName || "Exercise";

  useEffect(() => {
    if (exercise?.gifUrl) {
      setIsLoading(false);
      setHasError(false);
    } else {
      setIsLoading(false);
      setHasError(true);
      logger.warn('Exercise not found in database', { exerciseId });
    }
  }, [exercise, exerciseId]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    logger.error('GIF load error', { exerciseId });
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const retryLoad = () => {
    setHasError(false);
    setIsLoading(true);
  };

  return {
    exercise,
    displayName,
    isLoading,
    hasError,
    isPlaying,
    isFullscreen,
    handleImageLoad,
    handleImageError,
    togglePlayback,
    toggleFullscreen,
    retryLoad,
  };
};
