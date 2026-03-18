import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rp } from "../../../utils/responsive";
import { SectionHeader } from "../home/SectionHeader";
import { useAchievementStore } from "../../../stores/achievementStore";

interface AchievementShowcaseProps {
  onAchievementPress?: (achievement: any) => void;
  onSeeAllPress?: () => void;
}

const ITEM_HEIGHT = 64;
const VISIBLE_COUNT = 3;

// Map achievement categories to Ionicons names
const CATEGORY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  fitness: "barbell-outline",
  workout: "barbell-outline",
  nutrition: "restaurant-outline",
  streak: "flame-outline",
  consistency: "flame-outline",
  milestone: "trophy-outline",
  wellness: "heart-outline",
  challenge: "flash-outline",
  social: "people-outline",
  exploration: "compass-outline",
  special: "star-outline",
  default: "star-outline",
};

// Map achievement tiers to reward point approximations
const TIER_PTS: Record<string, number> = {
  bronze: 25,
  silver: 50,
  gold: 100,
  platinum: 200,
  diamond: 400,
  legendary: 750,
};

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = () => {
  // SSOT fix: achievementStore is the single source of truth for all achievements.
  // achievements = Achievement[] (definitions), userAchievements = Map<id, UserAchievement> (progress).
  // Previously a bespoke static list was computed from DataRetrievalService — diverging from the store.
  const achievements = useAchievementStore((s) => s.achievements);
  const userAchievements = useAchievementStore((s) => s.userAchievements);

  const displayAchievements = useMemo(() => {
    if (!achievements || achievements.length === 0) return [];

    return [...achievements]
      .map((a) => {
        const ua = userAchievements.get(a.id);
        const isCompleted = ua?.isCompleted ?? false;
        const progress = ua ? ua.progress / Math.max(ua.maxProgress, 1) : 0;
        // Use fitCoinsEarned from reward if available, otherwise pts from tier
        const pts = typeof a.reward?.value === "number" ? a.reward.value : TIER_PTS[a.tier] ?? 25;
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          icon: (CATEGORY_ICON_MAP[a.category] ?? CATEGORY_ICON_MAP.default) as keyof typeof Ionicons.glyphMap,
          category: a.category.toUpperCase(),
          tier: a.tier,
          pts,
          color: isCompleted ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.info,
          completed: isCompleted,
          progress,
        };
      })
      .sort((a, b) => {
        // Completed first, then by progress descending
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        return b.progress - a.progress;
      })
      .slice(0, 6);
  }, [achievements, userAchievements]);

  const completedCount = displayAchievements.filter((a) => a.completed).length;
  const containerHeight = ITEM_HEIGHT * VISIBLE_COUNT + rp(8) * (VISIBLE_COUNT - 1);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SectionHeader title="Achievements" icon="trophy" iconColor={ResponsiveTheme.colors.gold} />
        <Text style={styles.countBadge}>{completedCount}/{displayAchievements.length}</Text>
      </View>

      <GlassCard elevation={1} blurIntensity="light" padding="sm" borderRadius="lg">
        <ScrollView
          style={{ maxHeight: containerHeight }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.listContent}
        >
          {displayAchievements.map((item, index) => (
            <View key={item.id} style={[styles.row, index < displayAchievements.length - 1 && styles.rowBorder]}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={rf(18)} color={item.color} />
              </View>
              <View style={styles.textBlock}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.categoryTag, { backgroundColor: `${item.color}20` }]}>
                    <Text style={[styles.categoryText, { color: item.color }]}>{item.category}</Text>
                  </View>
                </View>
                <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
              </View>
              <View style={styles.rightBlock}>
                <Text style={[styles.pts, { color: item.color }]}>+{item.pts}</Text>
                {item.completed
                  ? <Ionicons name="checkmark-circle" size={rf(16)} color={ResponsiveTheme.colors.success} />
                  : <Ionicons name="lock-closed-outline" size={rf(16)} color={ResponsiveTheme.colors.textMuted} />
                }
              </View>
            </View>
          ))}
        </ScrollView>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: ResponsiveTheme.spacing.md, paddingHorizontal: ResponsiveTheme.spacing.lg, zIndex: 2 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: ResponsiveTheme.spacing.sm },
  countBadge: { fontSize: rf(11), fontWeight: "600", color: ResponsiveTheme.colors.textMuted, backgroundColor: "rgba(255,255,255,0.07)", paddingHorizontal: rp(8), paddingVertical: rp(3), borderRadius: rp(10) },
  listContent: { paddingVertical: rp(4) },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: rp(10), paddingHorizontal: rp(4), gap: rw(10), height: ITEM_HEIGHT },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  iconWrap: { width: rw(36), height: rw(36), borderRadius: rw(18), justifyContent: "center", alignItems: "center", flexShrink: 0 },
  textBlock: { flex: 1, gap: rp(2), overflow: "hidden" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: rw(6) },
  title: { fontSize: rf(12), fontWeight: "700", color: ResponsiveTheme.colors.text, flexShrink: 1 },
  categoryTag: { paddingHorizontal: rp(5), paddingVertical: rp(1), borderRadius: rp(4), flexShrink: 0 },
  categoryText: { fontSize: rf(8), fontWeight: "700", letterSpacing: 0.4 },
  description: { fontSize: rf(10), color: ResponsiveTheme.colors.textMuted },
  rightBlock: { alignItems: "center", gap: rp(3), flexShrink: 0 },
  pts: { fontSize: rf(10), fontWeight: "700" },
});

export default AchievementShowcase;
