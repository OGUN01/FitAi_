import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { Button, THEME } from "../../components/ui";
import { DayWorkout } from "../../types/ai";
import { WorkoutTimer } from "../../components/fitness/WorkoutTimer";
import { ExerciseGifPlayer } from "../../components/fitness/ExerciseGifPlayer";
import { ExerciseInstructionModal } from "../../components/fitness/ExerciseInstructionModal";
import { ExerciseSessionModal } from "../../components/fitness/ExerciseSessionModal";
import completionTrackingService from "../../services/completionTracking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exerciseFilterService } from "../../services/exerciseFilterService";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { useWorkoutAchievements } from "../../hooks/useWorkoutAchievements";
import { useWorkoutAnimations } from "../../hooks/useWorkoutAnimations";
import { WorkoutHeader } from "../../components/workout/WorkoutHeader";
import { WorkoutProgressBar } from "../../components/workout/WorkoutProgressBar";
import { ExerciseCard } from "../../components/workout/ExerciseCard";
import { WorkoutNavigation } from "../../components/workout/WorkoutNavigation";
import { AchievementNotifications } from "../../components/workout/AchievementNotifications";

interface WorkoutSessionScreenProps {
  route: {
    params: {
      workout: DayWorkout;
      sessionId?: string;
    };
  };
  navigation: any;
}

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

const parseDurationFromReps = (reps: any): number => {
  if (!reps) return 0;
  const str = String(reps).toLowerCase().trim();

  if (
    str.includes("-") ||
    str.includes("to") ||
    str.match(/^\d+\s*[-–]\s*\d+$/)
  ) {
    return 0;
  }

  const mmss = str.match(/^(\d+):(\d{1,2})$/);
  if (mmss) {
    const m = parseInt(mmss[1], 10);
    const s = parseInt(mmss[2], 10);
    if (!Number.isNaN(m) && !Number.isNaN(s)) return m * 60 + s;
  }

  const sec = str.match(/^(\d+)\s*(seconds|second|secs|sec|s)$/);
  if (sec) {
    const v = parseInt(sec[1], 10);
    return Number.isNaN(v) ? 0 : v;
  }

  const min = str.match(/^(\d+)\s*(minutes|minute|mins|min|m)$/);
  if (min) {
    const v = parseInt(min[1], 10);
    return Number.isNaN(v) ? 0 : v * 60;
  }

  const pure = parseInt(str, 10);
  if (!Number.isNaN(pure) && str === pure.toString()) {
    return pure;
  }

  return 0;
};

const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

export const WorkoutSessionScreen: React.FC<WorkoutSessionScreenProps> = ({
  route,
  navigation,
}) => {
  const { workout, sessionId } = route.params;
  const insets = useSafeAreaInsets();

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>No Workout Data</Text>
          <Text style={styles.errorSubtext}>
            Unable to load workout information
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!workout.exercises || workout.exercises.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🏋️‍♂️</Text>
          <Text style={styles.errorText}>No Exercises Found</Text>
          <Text style={styles.errorSubtext}>
            This workout appears to be empty
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const session = useWorkoutSession(workout, sessionId);
  const achievements = useWorkoutAchievements();
  const animations = useWorkoutAnimations();

  const derivedExerciseDuration = useMemo(() => {
    const repsDuration = parseDurationFromReps(session.currentExercise.reps);
    const restSeconds = safeNumber(session.currentExercise.restTime, 0);
    return repsDuration || restSeconds || 30;
  }, [session.currentExercise.reps, session.currentExercise.restTime]);

  const getExerciseName = useCallback((exerciseId: string): string => {
    if (!exerciseId) return "Exercise";
    const exercise = exerciseFilterService.getExerciseById(exerciseId);
    if (exercise?.name) {
      return exercise.name;
    }
    return safeString(exerciseId, "Exercise")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      session.setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (session.nextExercisePreviewTimeoutRef.current) {
        clearTimeout(session.nextExercisePreviewTimeoutRef.current);
      }
    };
  }, []);

  const handleSetComplete = useCallback(
    async (setIndex: number) => {
      await session.handleSetComplete(setIndex, async (percentage) => {
        await achievements.trackMilestone(
          percentage,
          workout.category || "General",
          session.workoutStats.exercisesCompleted,
          session.totalExercises,
          Math.round(
            (new Date().getTime() - session.workoutStartTime.getTime()) / 60000,
          ),
        );
      });

      const allSetsCompleted =
        session.currentProgress.completedSets.every(Boolean);

      if (allSetsCompleted) {
        await achievements.trackExerciseCompletion(
          session.currentExercise.name ||
            session.currentExercise.exerciseName ||
            "Exercise",
          workout.category || "General",
          session.currentProgress.completedSets.length,
          session.currentExerciseIndex,
          session.totalExercises,
        );
      } else {
        await achievements.trackSetCompletion(
          session.currentExercise.name ||
            session.currentExercise.exerciseName ||
            "Exercise",
          setIndex + 1,
          session.currentProgress.completedSets.length,
          workout.category || "General",
        );
      }
    },
    [session, achievements, workout.category],
  );

  const goToNextExercise = useCallback(() => {
    if (session.currentExerciseIndex < session.totalExercises - 1) {
      animations.animateTransition(() => {
        session.goToNextExercise();
      });
    } else {
      completeWorkout();
    }
  }, [session, animations]);

  const goToPreviousExercise = useCallback(() => {
    if (session.currentExerciseIndex > 0) {
      animations.animateTransition(() => {
        session.goToPreviousExercise();
      });
    }
  }, [session, animations]);

  const completeWorkout = useCallback(async () => {
    try {
      const finalStats = {
        ...session.workoutStats,
        totalDuration: Math.round(
          (new Date().getTime() - session.workoutStartTime.getTime()) / 60000,
        ),
      };

      const success = await completionTrackingService.completeWorkout(
        workout.id || "unknown",
        {
          sessionId: sessionId || "unknown",
          duration: finalStats.totalDuration,
          exercisesCompleted: finalStats.exercisesCompleted,
          totalExercises: session.totalExercises,
          completedAt: new Date().toISOString(),
          stats: finalStats,
        },
      );

      if (success) {
        await achievements.trackWorkoutCompletion(
          workout.category || "General",
          finalStats.totalDuration,
          finalStats.caloriesBurned,
          finalStats.exercisesCompleted,
          finalStats.setsCompleted,
          session.totalExercises,
          workout.title,
        );

        let completionMessage =
          `Outstanding performance! You completed "${safeString(workout.title, "Workout")}" in ${safeString(finalStats.totalDuration)} minutes.\n\n` +
          `📊 Stats:\n` +
          `• Exercises: ${safeString(finalStats.exercisesCompleted)}/${safeString(session.totalExercises)}\n` +
          `• Sets: ${safeString(finalStats.setsCompleted)}\n` +
          `• Calories: ~${safeString(finalStats.caloriesBurned)}`;

        if (achievements.recentAchievements.length > 0) {
          completionMessage += `\n\n🏆 Achievements Earned:\n`;
          achievements.recentAchievements.forEach((achievement) => {
            completionMessage += `• ${achievement.icon} ${achievement.title}\n`;
          });
        }

        Alert.alert("🎉 Workout Complete!", completionMessage, [
          {
            text: "View Achievements",
            onPress: () => navigation.navigate("Analytics"),
            style: "default",
          },
          {
            text: "View Progress",
            onPress: () => navigation.navigate("Progress"),
          },
          {
            text: "Done",
            onPress: () => navigation.goBack(),
            style: "default",
          },
        ]);
      } else {
        throw new Error("Failed to save workout completion");
      }
    } catch (error) {
      console.error("🚨 Error completing workout:", error);
      Alert.alert(
        "Workout Complete!",
        `Great job! You completed "${safeString(workout.title, "Workout")}" in ${safeString(session.workoutStats.totalDuration)} minutes.\n\nNote: Progress may not have been saved.`,
        [{ text: "Done", onPress: () => navigation.goBack() }],
      );
    }
  }, [workout, sessionId, session, achievements, navigation]);

  const exitWorkout = useCallback(async () => {
    const hasProgress =
      session.workoutStats.exercisesCompleted > 0 ||
      session.workoutStats.setsCompleted > 0;

    if (Platform.OS === "web") {
      if (hasProgress) {
        try {
          const progressPercentage =
            session.totalExercises > 0
              ? Math.round(
                  (session.workoutStats.exercisesCompleted /
                    session.totalExercises) *
                    100,
                )
              : 0;
          await completionTrackingService.updateWorkoutProgress(
            workout.id || "unknown",
            progressPercentage,
            {
              sessionId: sessionId || "unknown",
              partialCompletion: true,
              exitedAt: new Date().toISOString(),
              stats: session.workoutStats,
            },
          );
        } catch (error) {
          console.error("❌ Failed to save progress:", error);
        }
      }
      navigation.goBack();
      return;
    }

    if (hasProgress) {
      Alert.alert(
        "Save Progress?",
        `You've completed ${safeString(session.workoutStats.exercisesCompleted)}/${safeString(session.totalExercises)} exercises and ${safeString(session.workoutStats.setsCompleted)} sets.\n\nYour progress will be saved.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save & Exit",
            onPress: async () => {
              try {
                const progressPercentage =
                  session.totalExercises > 0
                    ? Math.round(
                        (session.workoutStats.exercisesCompleted /
                          session.totalExercises) *
                          100,
                      )
                    : 0;
                await completionTrackingService.updateWorkoutProgress(
                  workout.id || "unknown",
                  progressPercentage,
                  {
                    sessionId: sessionId || "unknown",
                    partialCompletion: true,
                    exitedAt: new Date().toISOString(),
                    stats: session.workoutStats,
                  },
                );
              } catch (error) {
                console.error("❌ Failed to save progress:", error);
              }
              navigation.goBack();
            },
          },
        ],
      );
    } else {
      Alert.alert(
        "Exit Workout?",
        "Are you sure you want to exit? No progress has been made.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Exit",
            style: "destructive",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    }
  }, [session, workout.id, sessionId, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <WorkoutHeader
        workoutTitle={workout.title}
        currentExercise={session.currentExerciseIndex + 1}
        totalExercises={session.totalExercises}
        duration={session.workoutStats.totalDuration}
        calories={session.workoutStats.caloriesBurned}
        onExit={exitWorkout}
        paddingTop={Math.max(insets.top, 12)}
      />

      <WorkoutProgressBar
        progress={session.overallProgress}
        fadeAnim={animations.fadeAnim}
      />

      <WorkoutTimer
        isVisible={session.isRestTime}
        duration={session.restTimeRemaining}
        title="Rest Time"
        onComplete={() => {
          session.setIsRestTime(false);
          if (parseDurationFromReps(session.currentExercise.reps) > 0) {
            session.setShowExerciseTimer(true);
          } else {
            session.setShowExerciseSession(true);
          }
        }}
        onCancel={() => session.setIsRestTime(false)}
      />

      <WorkoutTimer
        isVisible={session.showExerciseTimer}
        duration={derivedExerciseDuration}
        title={safeString(session.currentExercise.name || "Exercise Timer")}
        onComplete={session.completeSetAfterTimer}
        onCancel={() => session.setShowExerciseTimer(false)}
      >
        <ExerciseGifPlayer
          exerciseId={safeString(session.currentExercise.exerciseId, "")}
          exerciseName={safeString(session.currentExercise.name, "")}
          height={180}
          width={220}
          showTitle={false}
          showInstructions={false}
          style={{ marginBottom: THEME.spacing.md }}
        />
      </WorkoutTimer>

      {session.showNextExercisePreview && session.nextExercise && (
        <View style={styles.nextExercisePreview}>
          <Text style={styles.nextExerciseTitle}>Next Up:</Text>
          <Text style={styles.nextExerciseName}>
            {safeString(
              session.nextExercise.name ||
                getExerciseName(session.nextExercise.exerciseId),
              "Next Exercise",
            )}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.exerciseContainer,
            {
              opacity: animations.fadeAnim,
              transform: [{ scale: animations.scaleAnim }],
            },
          ]}
        >
          <ExerciseGifPlayer
            exerciseId={safeString(session.currentExercise.exerciseId, "")}
            exerciseName={safeString(session.currentExercise.name, "")}
            height={280}
            width={320}
            showTitle={false}
            showInstructions={true}
            onInstructionsPress={() => session.setShowInstructionModal(true)}
            style={styles.exerciseGifPlayer}
          />

          <ExerciseCard
            exerciseName={
              session.currentExercise.name ||
              getExerciseName(session.currentExercise.exerciseId)
            }
            sets={safeNumber(session.currentExercise.sets, 3)}
            reps={safeString(session.currentExercise.reps, "0")}
            weight={session.currentExercise.weight}
            restTime={session.currentExercise.restTime}
            notes={session.currentExercise.notes}
            completedSets={session.currentProgress.completedSets}
            isCompleted={session.currentProgress.isCompleted}
            setsCompleted={session.workoutStats.setsCompleted}
            totalDuration={session.workoutStats.totalDuration}
            caloriesBurned={session.workoutStats.caloriesBurned}
            onSetComplete={handleSetComplete}
            onStartExercise={() => {
              if (parseDurationFromReps(session.currentExercise.reps) > 0) {
                session.setShowExerciseTimer(true);
              } else {
                session.setShowExerciseSession(true);
              }
            }}
            isTimeBased={
              parseDurationFromReps(session.currentExercise.reps) > 0
            }
            repsDisplay={safeString(session.currentExercise.reps, "0")}
          />
        </Animated.View>
      </ScrollView>

      <ExerciseInstructionModal
        isVisible={session.showInstructionModal}
        onClose={() => session.setShowInstructionModal(false)}
        exerciseId={safeString(session.currentExercise.exerciseId, "")}
        exerciseName={safeString(session.currentExercise.name, "")}
      />

      <ExerciseSessionModal
        isVisible={session.showExerciseSession}
        onComplete={session.completeSetFromSession}
        onCancel={() => session.setShowExerciseSession(false)}
        exerciseId={safeString(session.currentExercise.exerciseId, "")}
        exerciseName={safeString(
          session.currentExercise.name ||
            getExerciseName(session.currentExercise.exerciseId),
          "Current Exercise",
        )}
        reps={safeString(session.currentExercise.reps, "")}
        currentSet={
          (session.exerciseProgress[
            session.currentExerciseIndex
          ]?.completedSets?.filter(Boolean).length || 0) + 1
        }
        totalSets={safeNumber(session.currentExercise.sets, 3)}
      />

      <WorkoutNavigation
        currentExercise={session.currentExerciseIndex}
        totalExercises={session.totalExercises}
        onPrevious={goToPreviousExercise}
        onNext={goToNextExercise}
      />

      <AchievementNotifications
        showCelebration={achievements.showCelebration}
        celebrationAchievement={achievements.celebrationAchievement}
        onCloseCelebration={achievements.hideCelebration}
        showAchievementToast={achievements.showAchievementToast}
        toastAchievement={achievements.toastAchievement}
        achievementToastAnim={achievements.achievementToastAnim}
        showMiniToast={achievements.showMiniToast}
        miniToastText={achievements.miniToastText}
        miniToastAnim={achievements.miniToastAnim}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
  },

  errorEmoji: {
    fontSize: 64,
    marginBottom: THEME.spacing.lg,
  },

  errorText: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.error,
    textAlign: "center",
    marginBottom: THEME.spacing.md,
  },

  errorSubtext: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginBottom: THEME.spacing.xl,
  },

  errorButton: {
    minWidth: 120,
  },

  nextExercisePreview: {
    backgroundColor: THEME.colors.primary + "20",
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
  },

  nextExerciseTitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold,
    marginBottom: THEME.spacing.xs,
  },

  nextExerciseName: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },

  content: {
    flex: 1,
    paddingHorizontal: THEME.spacing.lg,
  },

  exerciseContainer: {
    marginTop: THEME.spacing.lg,
    alignItems: "center",
  },

  exerciseGifPlayer: {
    marginBottom: THEME.spacing.lg,
    alignSelf: "center",
    elevation: 4,
  },
});
