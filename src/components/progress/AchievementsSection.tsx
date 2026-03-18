import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rw } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { GlassCard } from "../../components/ui/aurora/GlassCard";

interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  date: string;
  completed: boolean;
  category: string;
  points: number;
  rarity?: string;
  progress?: number;
  target?: number;
}

interface AchievementsSectionProps {
  achievements: Achievement[];
}

const ITEM_HEIGHT = 68;
const VISIBLE_COUNT = 3;

const rarityColor: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#3B82F6",
  rare: "#9333EA",
  epic: "#F97316",
  legendary: "#FFD700",
};

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
}) => {
  const sorted = [...achievements].sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    return 0;
  });

  const completedCount = achievements.filter((a) => a.completed).length;
  const containerHeight = ITEM_HEIGHT * VISIBLE_COUNT + rp(8) * (VISIBLE_COUNT - 1);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons
            name="trophy"
            size={rf(16)}
            color={ResponsiveTheme.colors.gold}
          />
          <Text style={styles.sectionTitle}>Achievements</Text>
        </View>
        <Text style={styles.countBadge}>
          {completedCount}/{achievements.length}
        </Text>
      </View>

      <GlassCard elevation={1} blurIntensity="light" padding="sm" borderRadius="lg">
        <ScrollView
          style={{ maxHeight: containerHeight }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.listContent}
        >
          {sorted.map((achievement, index) => {
            const rarity = achievement.rarity ?? "common";
            const accentColor = achievement.completed
              ? ResponsiveTheme.colors.success
              : rarityColor[rarity] ?? "#9CA3AF";
            const hasProgress =
              !achievement.completed &&
              (achievement.progress ?? 0) > 0 &&
              (achievement.target ?? 0) > 0;
            const pct = hasProgress
              ? Math.min(100, ((achievement.progress ?? 0) / (achievement.target ?? 1)) * 100)
              : 0;

            return (
              <View
                key={achievement.id}
                style={[
                  styles.row,
                  index < sorted.length - 1 && styles.rowBorder,
                ]}
              >
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
                  <Ionicons
                    name={achievement.iconName as any}
                    size={rf(18)}
                    color={accentColor}
                  />
                </View>

                {/* Text block */}
                <View style={styles.textBlock}>
                  <View style={styles.nameLine}>
                    <Text style={styles.title} numberOfLines={1}>
                      {achievement.title}
                    </Text>
                    <View style={[styles.categoryTag, { backgroundColor: `${accentColor}18` }]}>
                      <Text style={[styles.categoryText, { color: accentColor }]}>
                        {achievement.category.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.description} numberOfLines={1}>
                    {achievement.description}
                  </Text>
                  {hasProgress && (
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: accentColor }]} />
                      </View>
                      <Text style={styles.progressLabel}>
                        {achievement.progress}/{achievement.target}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Right: points + status */}
                <View style={styles.rightBlock}>
                  <Text style={[styles.pts, { color: accentColor }]}>
                    +{achievement.points}
                  </Text>
                  {achievement.completed ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={rf(16)}
                      color={ResponsiveTheme.colors.success}
                    />
                  ) : (
                    <Ionicons
                      name="lock-closed-outline"
                      size={rf(16)}
                      color={ResponsiveTheme.colors.textMuted}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  countBadge: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textMuted,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: rp(8),
    paddingVertical: rp(3),
    borderRadius: rp(10),
  },
  listContent: {
    paddingVertical: rp(4),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(10),
    paddingHorizontal: rp(8),
    gap: rw(10),
    minHeight: ITEM_HEIGHT,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  iconWrap: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: rp(2),
    overflow: "hidden",
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
  },
  title: {
    fontSize: rf(12),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    flexShrink: 1,
  },
  categoryTag: {
    paddingHorizontal: rp(5),
    paddingVertical: rp(1),
    borderRadius: rp(4),
    flexShrink: 0,
  },
  categoryText: {
    fontSize: rf(8),
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  description: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    marginTop: rp(2),
  },
  progressTrack: {
    flex: 1,
    height: rp(3),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: rp(2),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rp(2),
  },
  progressLabel: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
    flexShrink: 0,
  },
  rightBlock: {
    alignItems: "center",
    gap: rp(4),
    flexShrink: 0,
    minWidth: rw(30),
  },
  pts: {
    fontSize: rf(10),
    fontWeight: "700",
  },
});

export default AchievementsSection;
