import { useState, useEffect } from "react";
import {
  exerciseVisualService,
  ExerciseData,
} from "../../../services/exerciseVisualService";

export function useExerciseVisual(exerciseName?: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [visualData, setVisualData] = useState<ExerciseData | null>(null);

  useEffect(() => {
    async function fetchVisualData() {
      if (!exerciseName) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await exerciseVisualService.findExercise(exerciseName);
        if (result) {
          setVisualData(result.exercise);
        }
      } catch (error) {
        console.error("Failed to fetch exercise visual data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVisualData();
  }, [exerciseName]);

  return { isLoading, visualData };
}
