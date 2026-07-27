import { useState, useEffect, useCallback } from "react";
import {
  exerciseVisualService,
  ExerciseData,
} from "../../../services/exerciseVisualService";

export function useExerciseVisual(exerciseName?: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [visualData, setVisualData] = useState<ExerciseData | null>(null);
  const [loadError, setLoadError] = useState(false);

  const fetchVisualData = useCallback(async () => {
    if (!exerciseName) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setLoadError(false);
      const result = await exerciseVisualService.findExercise(exerciseName);
      if (result) {
        setVisualData(result.exercise);
      }
    } catch (error) {
      console.error("Failed to fetch exercise visual data:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [exerciseName]);

  useEffect(() => {
    fetchVisualData();
  }, [fetchVisualData]);

  const retry = useCallback(() => {
    fetchVisualData();
  }, [fetchVisualData]);

  return { isLoading, visualData, loadError, retry };
}
