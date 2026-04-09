import { useMemo } from "react";
import { useFitnessStore } from "../../../stores/fitnessStore";
import { EXERCISES } from "../../../data/exercises";

interface ExerciseInstruction {
  step: number;
  title: string;
  description: string;
  tips: string[];
}

export interface ExerciseData {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  targetMuscles: string[];
  equipment: string[];
  instructions: ExerciseInstruction[];
  sets: number;
  reps: string;
  restTime: string;
  weight: string;
  tips: string[];
  safetyTips: string[];
  commonMistakes: string[];
}

export function useExerciseData(exerciseId: string): ExerciseData | null {
  const { weeklyWorkoutPlan } = useFitnessStore();

  const exercise = useMemo(() => {
    // First try to find in current workout plan
    if (weeklyWorkoutPlan?.workouts) {
      for (const workout of weeklyWorkoutPlan.workouts) {
        if (workout.exercises) {
          for (const ex of workout.exercises) {
            // WorkoutSet has exercise property or direct id match
            const exId = ex.id || (ex as unknown as Record<string, { id?: string }>).exercise?.id;
            if (exId === exerciseId) {
              type ExerciseLike = { name?: string; description?: string; difficulty?: string; targetMuscles?: string[]; muscleGroups?: string[]; equipment?: string[]; instructions?: string[]; tips?: string[]; formTips?: string[]; safetyConsiderations?: string[] };
              const exerciseInfo = ((ex as unknown as { exercise?: ExerciseLike }).exercise || ex) as ExerciseLike;
              return {
                id: exerciseId,
                name: exerciseInfo.name || "Exercise",
                description: exerciseInfo.description || "",
                difficulty: exerciseInfo.difficulty || "intermediate",
                targetMuscles:
                  exerciseInfo.targetMuscles || exerciseInfo.muscleGroups || [],
                equipment: exerciseInfo.equipment || [],
                instructions: (exerciseInfo.instructions || []).map(
                  (inst: string, index: number) => ({
                    step: index + 1,
                    title: `Step ${index + 1}`,
                    description: inst,
                    tips: [],
                  }),
                ),
                sets: ex.sets || 3,
                reps: ex.reps?.toString() || "10-12",
                restTime: ex.restTime ? `${ex.restTime} seconds` : "60 seconds",
                weight: ex.weight?.toString() || "",
                tips: exerciseInfo.tips || exerciseInfo.formTips || [],
                safetyTips: exerciseInfo.safetyConsiderations || [],
                commonMistakes: [],
              };
            }
          }
        }
      }
    }

    // Then try static exercise database
    const staticExercise = EXERCISES.find(
      (ex) =>
        ex.id === exerciseId ||
        ex.name.toLowerCase() === exerciseId.toLowerCase(),
    );
    if (staticExercise) {
      return {
        id: staticExercise.id,
        name: staticExercise.name,
        description: staticExercise.description,
        difficulty: staticExercise.difficulty,
        targetMuscles: staticExercise.muscleGroups,
        equipment: staticExercise.equipment,
        instructions: (staticExercise.instructions || []).map(
          (inst: string, index: number) => ({
            step: index + 1,
            title: `Step ${index + 1}`,
            description: inst,
            tips: [],
          }),
        ),
        sets: staticExercise.sets || 3,
        reps: staticExercise.reps?.toString() || "10-12",
        restTime: staticExercise.restTime
          ? `${staticExercise.restTime} seconds`
          : "60 seconds",
        weight: "",
        tips: staticExercise.tips || [],
        safetyTips: [],
        commonMistakes: [],
      };
    }

    // Not found - return null
    return null;
  }, [weeklyWorkoutPlan, exerciseId]);

  return exercise;
}
