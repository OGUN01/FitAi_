import { useState, useCallback, useEffect } from "react";
import { Platform, Vibration, Animated } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { useAchievementStore } from "../stores/achievementStore";
import { trackAchievementActivity } from "../stores/achievementStore";

export const useWorkoutAchievements = () => {
  const { user } = useAuthStore();
  const {
    showCelebration,
    celebrationAchievement,
    hideCelebration,
    checkProgress,
  } = useAchievementStore();

  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [showAchievementToast, setShowAchievementToast] = useState(false);
  const [toastAchievement, setToastAchievement] = useState<any>(null);
  const [achievementToastAnim] = useState(new Animated.Value(0));
  const [miniToastText, setMiniToastText] = useState("");
  const [showMiniToast, setShowMiniToast] = useState(false);
  const [miniToastAnim] = useState(new Animated.Value(0));

  const showAchievementMiniToast = useCallback(
    (message: string) => {
      setMiniToastText(message);
      setShowMiniToast(true);

      Animated.sequence([
        Animated.timing(miniToastAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(miniToastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowMiniToast(false);
      });
    },
    [miniToastAnim],
  );

  const showAchievementNotification = useCallback(
    (achievement: any) => {
      setToastAchievement(achievement);
      setShowAchievementToast(true);

      Animated.sequence([
        Animated.timing(achievementToastAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(achievementToastAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowAchievementToast(false);
      });
    },
    [achievementToastAnim],
  );

  useEffect(() => {
    if (showCelebration && celebrationAchievement) {

      showAchievementNotification(celebrationAchievement);
      setRecentAchievements((prev) => [...prev, celebrationAchievement]);

      if (Platform.OS !== "web") {
        Vibration.vibrate([100, 50, 100]);
      }
    }
  }, [showCelebration, celebrationAchievement, showAchievementNotification]);

  const trackSetCompletion = useCallback(
    async (
      exerciseName: string,
      setNumber: number,
      totalSets: number,
      workoutType: string,
    ) => {
      if (!user?.id) return;

      try {
        await checkProgress(user.id, {
          action: "set_completed",
          exercise: exerciseName,
          setNumber,
          totalSets,
          workoutType,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
      }
    },
    [user?.id, checkProgress],
  );

  const trackExerciseCompletion = useCallback(
    async (
      exerciseName: string,
      workoutType: string,
      setsCompleted: number,
      exerciseIndex: number,
      totalExercises: number,
    ) => {
      if (!user?.id) return;

      try {
        await checkProgress(user.id, {
          action: "exercise_completed",
          exercise: exerciseName,
          exerciseType: workoutType,
          setsCompleted,
          exerciseIndex: exerciseIndex + 1,
          totalExercises,
          timestamp: new Date().toISOString(),
        });

        showAchievementMiniToast(
          `Exercise ${exerciseIndex + 1} of ${totalExercises} Complete! 💪`,
        );
      } catch (error) {
      }
    },
    [user?.id, checkProgress, showAchievementMiniToast],
  );

  const trackMilestone = useCallback(
    async (
      percentage: number,
      workoutType: string,
      exercisesCompleted: number,
      totalExercises: number,
      timeElapsed?: number,
    ) => {
      if (!user?.id) return;

      try {
        if (percentage === 50) {
          await checkProgress(user.id, {
            action: "workout_halfway",
            workoutType,
            exercisesCompleted,
            totalExercises,
            timeElapsed: timeElapsed || 0,
          });
          showAchievementMiniToast("Halfway There! 🔥 Keep Going!");
        } else if (percentage === 75) {
          await checkProgress(user.id, {
            action: "workout_three_quarters",
            workoutType,
            exercisesCompleted,
            totalExercises,
          });
          showAchievementMiniToast("Almost Done! 💪 Final Push!");
        }
      } catch (error) {
      }
    },
    [user?.id, checkProgress, showAchievementMiniToast],
  );

  const trackWorkoutCompletion = useCallback(
    async (
      workoutType: string,
      duration: number,
      caloriesBurned: number,
      exercisesCompleted: number,
      setsCompleted: number,
      totalExercises: number,
      workoutTitle: string,
    ) => {
      if (!user?.id) return;

      try {
        trackAchievementActivity.workoutCompleted(user.id, {
          workoutType,
          duration,
          caloriesBurned,
          exercisesCompleted,
          setsCompleted,
          totalWorkouts: 1,
          completionRate: exercisesCompleted / totalExercises,
          workoutTitle,
        });

        await checkProgress(user.id, {
          action: "workout_completed",
          workoutType,
          duration,
          caloriesBurned,
          exercisesCompleted,
          setsCompleted,
          completionRate: exercisesCompleted / totalExercises,
          isConsistent: true,
        });
      } catch (error) {
      }
    },
    [user?.id, checkProgress],
  );

  return {
    showCelebration,
    celebrationAchievement,
    hideCelebration,
    recentAchievements,
    showAchievementToast,
    toastAchievement,
    achievementToastAnim,
    miniToastText,
    showMiniToast,
    miniToastAnim,
    showAchievementMiniToast,
    trackSetCompletion,
    trackExerciseCompletion,
    trackMilestone,
    trackWorkoutCompletion,
  };
};
