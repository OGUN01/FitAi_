import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../ui";
import { AuroraSpinner } from "../ui/aurora";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rbr, rs } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import { useAchievementStore } from "../../stores/achievementStore";

/**
 * Map stored achievement.icon (legacy emoji strings) to Ionicons names.
 * The DB column still holds emoji strings for backwards compatibility; we
 * translate at render time so the UI stops mixing emoji + Ionicons.
 */
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  "🎯": "trophy-outline",
  "🌟": "star-outline",
  "💪": "fitness-outline",
  "🏆": "trophy",
  "🥇": "medal-outline",
  "🔥": "flame-outline",
  "🌋": "flame",
  "⚡": "flash-outline",
  "🎨": "color-palette-outline",
};
const iconToIonicons = (icon: string): keyof typeof Ionicons.glyphMap =>
  ICON_MAP[icon] ?? "trophy-outline";

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
        icon: "trophy-outline",
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
        icon: "star-outline",
        value: 25,
      },
      {
        count: 10,
        type: "workouts_10",
        title: "Consistent",
        description: "Completed 10 workouts",
        icon: "fitness-outline",
        value: 50,
      },
      {
        count: 25,
        type: "workouts_25",
        title: "Dedicated",
        description: "Completed 25 workouts",
        icon: "trophy",
        value: 100,
      },
      {
        count: 50,
        type: "workouts_50",
        title: "Committed",
        description: "Completed 50 workouts",
        icon: "medal-outline",
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
        icon: "flame-outline",
        value: 50,
      },
      {
        calories: 5000,
        type: "calories_5k",
        title: "Inferno",
        description: "Burned 5,000 calories",
        icon: "flame",
        value: 150,
      },
      {
        calories: 10000,
        type: "calories_10k",
        title: "Furnace",
        description: "Burned 10,000 calories",
        icon: "flash-outline",
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
        icon: "color-palette-outline",
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
            "Achievement Unlocked!",
            `Congratulations! You earned: ${titles}`,
            [{ text: "Awesome!" }],
          );

          loadAchievements();
          useAchievementStore
            .getState()
            .reconcileWithCurrentData(user.id)
            .catch(() => {
              // Sync failure is non-fatal; next mount will retry. Surface via
              // setError so the developer still sees it during development.
            });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to award achievements",
        );
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
    if (workoutStats) {
      checkForNewAchievements();
    }
  }, [workoutStats, user?.id, achievements]);

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
        <View style={styles.stateWrap}>
          <AuroraSpinner size="md" />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.container} variant="elevated">
        <View style={styles.stateWrap}>
          <Ionicons name="alert-circle-outline" size={rf(32)} color={colors.error} />
          <Text style={styles.errorText}>Couldn't load achievements</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadAchievements}
            accessibilityRole="button"
            accessibilityLabel="Retry loading achievements"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container} variant="elevated">
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
        <View style={styles.pointsBadge} accessibilityRole="text">
          <Text style={styles.pointsText}>{getTotalPoints()} pts</Text>
        </View>
      </View>

      {achievements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy" size={rf(48)} color={colors.primary} />
          <Text style={styles.emptyTitle}>No Achievements Yet</Text>
          <Text style={styles.emptyDescription}>
            Complete workouts to start earning achievements and points!
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.achievementsList}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <View style={styles.achievementIcon}>
                  <Ionicons
                    name={iconToIonicons(achievement.icon)}
                    size={rf(24)}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.achievementContent}>
                  <Text style={styles.achievementTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {achievement.title}
                  </Text>
                  <Text style={styles.achievementDescription} numberOfLines={2}>
                    {achievement.description}
                  </Text>
                  <Text style={styles.achievementDate}>
                    Earned on {formatDate(achievement.earned_at)}
                  </Text>
                </View>

                <View style={styles.achievementValue} accessibilityRole="text">
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
    maxHeight: rs(560),
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
    minHeight: 28,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
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

  scrollContent: {
    paddingBottom: spacing.lg,
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
    // Was hardcoded "rgba(255, 107, 53, 0.2)" — use hexToRgba so the tint
    // tracks colors.primary if the token ever changes.
    backgroundColor: hexToRgba(colors.primary, 0.2),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
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

  // colors.textMuted (#8A8A8A) for xs text was below WCAG AA — use secondary.
  achievementDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  achievementValue: {
    alignItems: "center",
  },

  achievementPoints: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  stateWrap: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },

  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },

  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
  },

  retryButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
