/**
 * AchievementShowcase Component
 * Shows achievements section - empty state until real achievements are earned
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rp } from "../../../utils/responsive";
import { SectionHeader } from "../home/SectionHeader";
import DataRetrievalService from "../../../services/dataRetrieval";

interface AchievementShowcaseProps {
  achievements?: string[];
  onAchievementPress?: (achievement: any) => void;
  onSeeAllPress?: () => void;
}

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = () => {
  // Compute achievements from DataRetrievalService (same source as Progress screen)
  const weeklyProgress = useMemo(() => DataRetrievalService.getWeeklyProgress(), []);

  const achievements = useMemo(() => {
    const items = [
      {
        id: "first-workout",
        title: "First Workout",
        icon: "barbell-outline" as keyof typeof Ionicons.glyphMap,
        completed: (weeklyProgress?.workoutsCompleted ?? 0) > 0,
        color: ResponsiveTheme.colors.info,
      },
      {
        id: "first-meal",
        title: "First Meal",
        icon: "restaurant-outline" as keyof typeof Ionicons.glyphMap,
        completed: (weeklyProgress?.mealsCompleted ?? 0) > 0,
        color: ResponsiveTheme.colors.success,
      },
      {
        id: "meal-streak",
        title: "Meal Master",
        icon: "nutrition-outline" as keyof typeof Ionicons.glyphMap,
        completed: (weeklyProgress?.mealsCompleted ?? 0) >= 5,
        color: ResponsiveTheme.colors.warning,
      },
      {
        id: "week-streak",
        title: "Week Warrior",
        icon: "flame-outline" as keyof typeof Ionicons.glyphMap,
        completed: (weeklyProgress?.streak ?? 0) >= 7,
        color: ResponsiveTheme.colors.errorLight,
      },
    ];
    return items;
  }, [weeklyProgress]);

  const completedAchievements = achievements.filter((a) => a.completed);
  const hasAchievements = completedAchievements.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionHeader title="Achievements" icon="trophy" iconColor={ResponsiveTheme.colors.gold} />
      </View>

      <GlassCard
        elevation={1}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        {hasAchievements ? (
          <View style={styles.achievementsList}>
            {completedAchievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <View
                  style={[
                    styles.achievementIconContainer,
                    { backgroundColor: `${achievement.color}20` },
                  ]}
                >
                  <Ionicons
                    name={achievement.icon}
                    size={rf(18)}
                    color={achievement.color}
                  />
                </View>
                <View style={styles.achievementTextContainer}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementStatus}>Completed</Text>
                </View>
                <Ionicons
                  name="checkmark-circle"
                  size={rf(18)}
                  color={ResponsiveTheme.colors.success}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="trophy-outline"
                size={rf(28)}
                color={ResponsiveTheme.colors.textMuted}
              />
            </View>
            <Text style={styles.emptyText}>No achievements yet</Text>
            <Text style={styles.emptySubtext}>Complete goals to earn badges</Text>
          </View>
        )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    zIndex: 2,
  },
  headerContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  emptyIconContainer: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    backgroundColor: "rgba(255,215,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptyText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(4),
  },
  emptySubtext: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textMuted,
  },
  achievementsList: {
    gap: ResponsiveTheme.spacing.sm,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  achievementIconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    justifyContent: "center",
    alignItems: "center",
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  achievementStatus: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.success,
  },
});

export default AchievementShowcase;
