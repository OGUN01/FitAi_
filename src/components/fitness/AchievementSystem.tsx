import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rbr, rs } from "../../utils/responsive";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import { useAchievementStore } from "../../stores/achievementStore";

interface Achievement {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string;
  value: number;
}

interface AchievementSystemProps {
  workoutStats?: {
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    workoutsByType: Record<string, number>;
  };
}

export const AchievementSystem: React.FC<AchievementSystemProps> = ({
  workoutStats,
}) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkInProgress = useRef(false);

  // Load user achievements
  const loadAchievements = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) {
        console.error("[AchievementSystem] Supabase error:", error);
        setError(error.message);
      } else {
        setAchievements(data || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load achievements",
      );
    } finally {
      setLoading(false);
    }
  };

  // Check and award new achievements
  const checkForNewAchievements = async () => {
    if (!user?.id || !workoutStats) return;
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    try {
    const newAchievements: Omit<Achievement, "id" | "earned_at">[] = [];

    // First Workout Achievement
    if (
      workoutStats.totalWorkouts >= 1 &&
      !achievements.find((a) => a.type === "first_workout")
    ) {
      newAchievements.push({
        user_id: user.id,
        type: "first_workout",
        title: "First Steps",
        description: "Completed your first workout!",
        icon: "🎯",
        value: 10,
      });
    }

    // Workout Milestones
    const workoutMilestones = [
      {
        count: 5,
        type: "workouts_5",
        title: "Getting Started",
        description: "Completed 5 workouts",
        icon: "🌟",
        value: 25,
      },
      {
        count: 10,
        type: "workouts_10",
        title: "Consistent",
        description: "Completed 10 workouts",
        icon: "💪",
        value: 50,
      },
      {
        count: 25,
        type: "workouts_25",
        title: "Dedicated",
        description: "Completed 25 workouts",
        icon: "🏆",
        value: 100,
      },
      {
        count: 50,
        type: "workouts_50",
        title: "Committed",
        description: "Completed 50 workouts",
        icon: "🥇",
        value: 200,
      },
    ];

    for (const milestone of workoutMilestones) {
      if (
        workoutStats.totalWorkouts >= milestone.count &&
        !achievements.find((a) => a.type === milestone.type)
      ) {
        newAchievements.push({
          user_id: user.id,
          type: milestone.type,
          title: milestone.title,
          description: milestone.description,
          icon: milestone.icon,
          value: milestone.value,
        });
      }
    }

    // Calorie Burn Achievements
    const calorieMilestones = [
      {
        calories: 1000,
        type: "calories_1k",
        title: "Calorie Crusher",
        description: "Burned 1,000 calories",
        icon: "🔥",
        value: 50,
      },
      {
        calories: 5000,
        type: "calories_5k",
        title: "Inferno",
        description: "Burned 5,000 calories",
        icon: "🌋",
        value: 150,
      },
      {
        calories: 10000,
        type: "calories_10k",
        title: "Furnace",
        description: "Burned 10,000 calories",
        icon: "⚡",
        value: 300,
      },
    ];

    for (const milestone of calorieMilestones) {
      if (
        workoutStats.totalCalories >= milestone.calories &&
        !achievements.find((a) => a.type === milestone.type)
      ) {
        newAchievements.push({
          user_id: user.id,
          type: milestone.type,
          title: milestone.title,
          description: milestone.description,
          icon: milestone.icon,
          value: milestone.value,
        });
      }
    }

    // Variety Achievement
    if (
      Object.keys(workoutStats.workoutsByType).length >= 3 &&
      !achievements.find((a) => a.type === "variety")
    ) {
      newAchievements.push({
        user_id: user.id,
        type: "variety",
        title: "Well-Rounded",
        description: "Tried 3 different workout types",
        icon: "🎨",
        value: 75,
      });
    }

    // Award new achievements
    if (newAchievements.length > 0) {
      try {
        const { error } = await supabase
          .from("achievements")
          .insert(newAchievements);

        if (!error) {
          const titles = newAchievements.map((a) => a.title).join(", ");
          crossPlatformAlert(
            "🎉 Achievement Unlocked!",
            `Congratulations! You earned: ${titles}`,
            [{ text: "Awesome!" }],
          );

          loadAchievements();
          useAchievementStore
            .getState()
            .reconcileWithCurrentData(user.id)
            .catch((e) => {
              console.error(
                "[AchievementSystem] Failed to sync achievements to store:",
                e,
              );
            });
        }
      } catch (err) {
        console.error("Failed to award achievements:", err);
      }
    }
    } finally {
      checkInProgress.current = false;
    }
  };

  useEffect(() => {
    loadAchievements();
  }, [user?.id]);

  useEffect(() => {
    if (workoutStats && achievements.length >= 0) {
      checkForNewAchievements();
    }
  }, [workoutStats, user?.id]);

  const getTotalPoints = () => {
    return achievements.reduce(
      (total, achievement) => total + achievement.value,
      0,
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card style={styles.container} variant="elevated">
        <Text style={styles.loadingText}>Loading achievements...</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.container} variant="elevated">
        <Text style={styles.errorText}>⚠️ {error}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container} variant="elevated">
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{getTotalPoints()} pts</Text>
        </View>
      </View>

      {achievements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No Achievements Yet</Text>
          <Text style={styles.emptyDescription}>
            Complete workouts to start earning achievements and points!
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.achievementsList}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <View style={styles.achievementIcon}>
                  <Text style={styles.achievementEmoji}>
                    {achievement.icon}
                  </Text>
                </View>

                <View style={styles.achievementContent}>
                  <Text style={styles.achievementTitle}>
                    {achievement.title}
                  </Text>
                  <Text style={styles.achievementDescription}>
                    {achievement.description}
                  </Text>
                  <Text style={styles.achievementDate}>
                    Earned on {formatDate(achievement.earned_at)}
                  </Text>
                </View>

                <View style={styles.achievementValue}>
                  <Text style={styles.achievementPoints}>
                    +{achievement.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    margin: spacing.md,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },

  pointsBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },

  pointsText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },

  emptyIcon: {
    fontSize: rf(48),
    marginBottom: spacing.md,
  },

  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
  },

  achievementsList: {
    gap: spacing.md,
  },

  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  achievementIcon: {
    width: rs(48),
    height: rs(48),
    borderRadius: rbr(24),
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },

  achievementEmoji: {
    fontSize: rf(24),
  },

  achievementContent: {
    flex: 1,
  },

  achievementTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  achievementDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  achievementDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  achievementValue: {
    alignItems: "center",
  },

  achievementPoints: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },

  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
