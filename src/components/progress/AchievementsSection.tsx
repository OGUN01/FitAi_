import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { GlassCard } from "../../components/ui/aurora/GlassCard";

interface AchievementsSectionProps {
  achievements: any[];
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
}) => {
  const rarityStyleMap: Record<string, ViewStyle> = {
    common: styles.rarityCommon,
    uncommon: styles.rarityUncommon,
    rare: styles.rarityRare,
    epic: styles.rarityEpic,
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Achievements</Text>

      {achievements.map((achievement) => (
        <GlassCard
          key={achievement.id}
          style={styles.achievementCard}
          elevation={1}
          blurIntensity="light"
          padding="md"
          borderRadius="lg"
        >
          <View style={styles.achievementContent}>
            <View
              style={[
                styles.achievementIcon,
                achievement.completed && styles.achievementIconCompleted,
              ]}
            >
              <Ionicons
                name={achievement.iconName}
                size={rf(24)}
                color={
                  achievement.completed
                    ? ResponsiveTheme.colors.primary
                    : ResponsiveTheme.colors.textSecondary
                }
              />
            </View>

            <View style={styles.achievementInfo}>
              <View style={styles.achievementHeader}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <View style={styles.achievementMeta}>
                  <Text style={styles.achievementCategory}>
                    {achievement.category}
                  </Text>
                  <Text style={styles.achievementPoints}>
                    +{achievement.points} pts
                  </Text>
                </View>
              </View>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>

              {!achievement.completed &&
              (achievement.progress ?? 0) > 0 &&
              (achievement.target ?? 0) > 0 ? (
                <View style={styles.achievementProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              ((achievement.progress || 0) /
                                (achievement.target || 1)) *
                                100,
                            ),
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {achievement.progress}/{achievement.target}
                  </Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.rarityBadge,
                  rarityStyleMap[(achievement.rarity || "common")] ?? styles.rarityCommon,
                ]}
              >
                <Text style={styles.rarityText}>
                  {(achievement.rarity || "common").toUpperCase()}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.achievementDate,
                achievement.completed && styles.achievementDateCompleted,
              ]}
            >
              {achievement.date}
            </Text>
          </View>
        </GlassCard>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  achievementCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  achievementContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
  },
  achievementIcon: {
    width: rw(48),
    height: rh(48),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  achievementIconCompleted: {
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  achievementTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  achievementMeta: {
    alignItems: "flex-end",
  },
  achievementCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textTransform: "uppercase",
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  achievementPoints: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginTop: rp(2),
  },
  achievementDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  achievementProgress: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
  progressBar: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  progressText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
  rarityBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderRadius: rs(8),
    minWidth: rw(50),
    alignItems: "center",
  },
  rarityCommon: {
    backgroundColor: "rgba(176, 176, 176, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(176, 176, 176, 0.3)",
  },
  rarityUncommon: {
    backgroundColor: "rgba(33, 150, 243, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(33, 150, 243, 0.3)",
  },
  rarityRare: {
    backgroundColor: "rgba(156, 39, 176, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(156, 39, 176, 0.3)",
  },
  rarityEpic: {
    backgroundColor: "rgba(255, 152, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  rarityText: {
    fontSize: rf(10),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  achievementDate: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
  achievementDateCompleted: {
    color: ResponsiveTheme.colors.success,
  },
});
