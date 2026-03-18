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

const CATEGORY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  fitness: "barbell-outline",
  workout: "barbell-outline",
  nutrition: "restaurant-outline",
  streak: "flame-outline",
  consistency: "flame-outline",
  milestone: "trophy-outline",
  wellness: "heart-outline",
  default: "star-outline",
};

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = () => {
  // SSOT fix: achievementStore is the single source of truth for all achievements.
  // Previously DataRetrievalService raw progress numbers were used to compute a
  // bespoke static list inline — diverging from the canonical store.
  const { achievements: rawAchievements } = useAchievementStore();

  const achievements = useMemo(() => {
    if (!rawAchievements || rawAchievements.length === 0) return [];
    return [...rawAchievements]
      .sort((a, b) => {
        if (a.isEarned && !b.isEarned) return -1;
        if (!a.isEarned && b.isEarned) return 1;
        const aP = a.targetValue > 0 ? (a.currentProgress ?? 0) / a.targetValue : 0;
        const bP = b.targetValue > 0 ? (b.currentProgress ?? 0) / b.targetValue : 0;
        return bP - aP;
      })
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        icon: (CATEGORY_ICON_MAP[(a.category ?? "").toLowerCase()] ??
          CATEGORY_ICON_MAP.default) as keyof typeof Ionicons.glyphMap,
        category: (a.category ?? "GENERAL").toUpperCase(),
        pts: a.points ?? 0,
        color: a.isEarned ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.info,
        completed: !!a.isEarned,
      }));
  }, [rawAchievements]);

  const completedCount = achievements.filter((a) => a.completed).length;
  const containerHeight = ITEM_HEIGHT * VISIBLE_COUNT + rp(8) * (VISIBLE_COUNT - 1);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SectionHeader title="Achievements" icon="trophy" iconColor={ResponsiveTheme.colors.gold} />
        <Text style={styles.countBadge}>{completedCount}/{achievements.length}</Text>
      </View>

      <GlassCard elevation={1} blurIntensity="light" padding="sm" borderRadius="lg">
        <ScrollView
          style={{ maxHeight: containerHeight }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.listContent}
        >
          {achievements.map((item, index) => (
            <View key={item.id} style={[styles.row, index < achievements.length - 1 && styles.rowBorder]}>
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
