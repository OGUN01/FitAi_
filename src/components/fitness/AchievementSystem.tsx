import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, THEME } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

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

export const AchievementSystem: React.FC<AchievementSystemProps> = ({ workoutStats }) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user achievements
  const loadAchievements = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setAchievements(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  // Check and award new achievements
  const checkForNewAchievements = async () => {
    if (!user?.id || !workoutStats) return;

    const newAchievements: Omit<Achievement, 'id' | 'earned_at'>[] = [];

    // First Workout Achievement
    if (workoutStats.totalWorkouts >= 1 && !achievements.find(a => a.type === 'first_workout')) {
      newAchievements.push({
        user_id: user.id,
        type: 'first_workout',
        title: 'First Steps',
        description: 'Completed your first workout!',
        icon: '🎯',
        value: 10,
      });
    }

    // Workout Milestones
    const workoutMilestones = [
      { count: 5, type: 'workouts_5', title: 'Getting Started', description: 'Completed 5 workouts', icon: '🌟', value: 25 },
      { count: 10, type: 'workouts_10', title: 'Consistent', description: 'Completed 10 workouts', icon: '💪', value: 50 },
      { count: 25, type: 'workouts_25', title: 'Dedicated', description: 'Completed 25 workouts', icon: '🏆', value: 100 },
      { count: 50, type: 'workouts_50', title: 'Committed', description: 'Completed 50 workouts', icon: '🥇', value: 200 },
    ];

    for (const milestone of workoutMilestones) {
      if (workoutStats.totalWorkouts >= milestone.count && !achievements.find(a => a.type === milestone.type)) {
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
      { calories: 1000, type: 'calories_1k', title: 'Calorie Crusher', description: 'Burned 1,000 calories', icon: '🔥', value: 50 },
      { calories: 5000, type: 'calories_5k', title: 'Inferno', description: 'Burned 5,000 calories', icon: '🌋', value: 150 },
      { calories: 10000, type: 'calories_10k', title: 'Furnace', description: 'Burned 10,000 calories', icon: '⚡', value: 300 },
    ];

    for (const milestone of calorieMilestones) {
      if (workoutStats.totalCalories >= milestone.calories && !achievements.find(a => a.type === milestone.type)) {
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
    if (Object.keys(workoutStats.workoutsByType).length >= 3 && !achievements.find(a => a.type === 'variety')) {
      newAchievements.push({
        user_id: user.id,
        type: 'variety',
        title: 'Well-Rounded',
        description: 'Tried 3 different workout types',
        icon: '🎨',
        value: 75,
      });
    }

    // Award new achievements
    if (newAchievements.length > 0) {
      try {
        const { error } = await supabase
          .from('achievements')
          .insert(newAchievements);

        if (!error) {
          // Show achievement notification
          const titles = newAchievements.map(a => a.title).join(', ');
          Alert.alert(
            '🎉 Achievement Unlocked!',
            `Congratulations! You earned: ${titles}`,
            [{ text: 'Awesome!' }]
          );
          
          // Reload achievements
          loadAchievements();
        }
      } catch (err) {
        console.error('Failed to award achievements:', err);
      }
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
    return achievements.reduce((total, achievement) => total + achievement.value, 0);
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
                  <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
                </View>
                
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  <Text style={styles.achievementDate}>
                    Earned on {formatDate(achievement.earned_at)}
                  </Text>
                </View>
                
                <View style={styles.achievementValue}>
                  <Text style={styles.achievementPoints}>+{achievement.value}</Text>
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
    padding: THEME.spacing.lg,
    margin: THEME.spacing.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  pointsBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg,
  },

  pointsText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },

  emptyTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  emptyDescription: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  achievementsList: {
    gap: THEME.spacing.md,
  },

  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },

  achievementEmoji: {
    fontSize: 24,
  },

  achievementContent: {
    flex: 1,
  },

  achievementTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  achievementDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },

  achievementDate: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },

  achievementValue: {
    alignItems: 'center',
  },

  achievementPoints: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  loadingText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: THEME.spacing.xl,
  },

  errorText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.error,
    textAlign: 'center',
    paddingVertical: THEME.spacing.xl,
  },
});
