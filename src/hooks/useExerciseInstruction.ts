import { useState, useMemo } from "react";
import { exerciseFilterService } from "../services/exerciseFilterService";

export const useExerciseInstruction = (
  exerciseId: string,
  exerciseName?: string,
) => {
  const [activeTab, setActiveTab] = useState<"instructions" | "details">(
    "instructions",
  );

  const exercise = useMemo(
    () => exerciseFilterService.getExerciseById(exerciseId),
    [exerciseId],
  );

  const displayName = exerciseName || exercise?.name || "Exercise";

  return {
    activeTab,
    setActiveTab,
    exercise,
    displayName,
  };
};
