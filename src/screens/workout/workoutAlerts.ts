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
    `📊 Stats:\n` +
    `• Exercises: ${safeString(finalStats.exercisesCompleted)}/${safeString(totalExercises)}\n` +
    `• Sets: ${safeString(finalStats.setsCompleted)}\n` +
    `• Calories: ~${safeString(finalStats.caloriesBurned)}`;

  if (recentAchievements.length > 0) {
    completionMessage += `\n\n🏆 Achievements Earned:\n`;
    recentAchievements.forEach((achievement) => {
      completionMessage += `• ${achievement.icon} ${achievement.title}\n`;
    });
  }

  crossPlatformAlert("🎉 Workout Complete!", completionMessage, [
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
