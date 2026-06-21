import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

const safeString = (value: any, fallback: string = ""): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isNaN(value)) return fallback;
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

export const showWorkoutCompleteAlert = (
  workout: any,
  finalStats: any,
  totalExercises: number,
  recentAchievements: any[],
  onViewAchievements: () => void,
  onViewProgress: () => void,
  onDone: () => void,
) => {
  const durationMins = Math.max(1, Math.round(finalStats.totalDuration / 60));
  let completionMessage =
    `Outstanding performance! You completed "${safeString(workout.title, "Workout")}" in ${safeString(durationMins)} minute${durationMins !== 1 ? "s" : ""}.\n\n` +
    `Stats:\n` +
    `- Exercises: ${safeString(finalStats.exercisesCompleted)}/${safeString(totalExercises)}\n` +
    `- Sets: ${safeString(finalStats.setsCompleted)}\n` +
    `- Calories: ~${safeString(finalStats.caloriesBurned)}`;

  if (recentAchievements.length > 0) {
    completionMessage += `\n\nAchievements Earned:\n`;
    recentAchievements.forEach((achievement) => {
      completionMessage += `- ${achievement.title}\n`;
    });
  }

  crossPlatformAlert("Workout Complete!", completionMessage, [
    {
      text: "View Achievements",
      onPress: onViewAchievements,
      style: "default",
    },
    {
      text: "View Progress",
      onPress: onViewProgress,
    },
    {
      text: "Done",
      onPress: onDone,
      style: "default",
    },
  ]);
};

export const showWorkoutCompleteErrorAlert = (
  workout: any,
  stats: any,
  onDone: () => void,
) => {
  crossPlatformAlert(
    "Workout Complete!",
    `Great job! You completed "${safeString(workout.title, "Workout")}" in ${safeString(Math.max(1, Math.round(stats.totalDuration / 60)))} minutes.\n\nNote: Progress may not have been saved.`,
    [{ text: "Done", onPress: onDone }],
  );
};

/**
 * P1 race fix: shown when the workout_sessions row WAS persisted to Supabase
 * but a later step (achievements, deload check, analytics update, rating dialog)
 * threw. The workout is saved — re-tapping Finish would risk a duplicate insert,
 * so we keep the button disabled and tell the user the truth: the workout is
 * safe, only the post-completion stats refresh had an issue.
 */
export const showWorkoutPartialSuccessAlert = (
  workout: any,
  stats: any,
  onDone: () => void,
) => {
  crossPlatformAlert(
    "Workout Saved",
    `Your workout "${safeString(workout.title, "Workout")}" (${safeString(Math.max(1, Math.round(stats.totalDuration / 60)))} min) was saved successfully, but there was an issue updating your stats and achievements. Your workout data is safe — you can continue.`,
    [{ text: "OK", onPress: onDone }],
  );
};

export const showExitWorkoutAlert = (
  hasProgress: boolean,
  exercisesCompleted: number,
  totalExercises: number,
  setsCompleted: number,
  onSaveAndExit: () => void,
  onExit: () => void,
) => {
  // crossPlatformAlert works on all platforms including web
  // No need to skip the dialog on web

  if (hasProgress) {
    crossPlatformAlert(
      "Save Progress?",
      `You've completed ${safeString(exercisesCompleted)}/${safeString(totalExercises)} exercises and ${safeString(setsCompleted)} sets.\n\nYour progress will be saved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save & Exit",
          onPress: onSaveAndExit,
        },
      ],
    );
  } else {
    crossPlatformAlert(
      "Exit Workout?",
      "Are you sure you want to exit? No progress has been made.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit",
          style: "destructive",
          onPress: onExit,
        },
      ],
    );
  }
};
