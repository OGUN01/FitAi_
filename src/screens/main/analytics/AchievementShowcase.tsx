import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rp } from "../../../utils/responsive";
import { SectionHeader } from "../home/SectionHeader";
import { useAchievementStore } from "../../../stores/achievementStore";
import { buildAchievementViewModels } from "../../../utils/achievementViewModel";

interface AchievementShowcaseProps {}

const ITEM_HEIGHT = 64;
const VISIBLE_COUNT = 3;

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = () => {
  // SSOT fix: achievementStore is the single source of truth for all achievements.
  // achievements = Achievement[] (definitions), userAchievements = Map<id, UserAchievement> (progress).
  // Previously a bespoke static list was computed from DataRetrievalService — diverging from the store.
  const achievements = useAchievementStore((s) => s.achievements);
  const userAchievements = useAchievementStore((s) => s.userAchievements);

  const achievementItems = useMemo(
    () => buildAchievementViewModels(achievements, userAchievements),
    [achievements, userAchievements],
  );
  const displayAchievements = achievementItems.slice(0, 6);
  const completedCount = achievementItems.filter(
    (item) => item.completed,
  ).length;
  const containerHeight =
    ITEM_HEIGHT * VISIBLE_COUNT + rp(8) * (VISIBLE_COUNT - 1);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SectionHeader
          title="Achievements"
          icon="trophy"
          iconColor={ResponsiveTheme.colors.gold}
        />
        <Text style={styles.countBadge}>
          {completedCount}/{achievementItems.length}
        </Text>
      </View>

      <GlassCard
        elevation={1}
        blurIntensity="light"
        padding="sm"
        borderRadius="lg"
      >
        <ScrollView
          style={{ maxHeight: containerHeight }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.listContent}
        >
          {displayAchievements.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.row,
                index < displayAchievements.length - 1 && styles.rowBorder,
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: item.completed
                      ? `${ResponsiveTheme.colors.success}22`
                      : `${ResponsiveTheme.colors.info}22`,
                  },
                ]}
              >
                <Ionicons
                  name={item.iconName as keyof typeof Ionicons.glyphMap}
                  size={rf(18)}
                  color={
                    item.completed
                      ? ResponsiveTheme.colors.success
                      : ResponsiveTheme.colors.info
                  }
                />
              </View>
              <View style={styles.textBlock}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.categoryTag,
                      {
                        backgroundColor: item.completed
                          ? `${ResponsiveTheme.colors.success}20`
                          : `${ResponsiveTheme.colors.info}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color: item.completed
                            ? ResponsiveTheme.colors.success
                            : ResponsiveTheme.colors.info,
                        },
                      ]}
                    >
                      {item.categoryLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
              <View style={styles.rightBlock}>
                <Text
                  style={[
                    styles.pts,
                    {
                      color: item.completed
                        ? ResponsiveTheme.colors.success
                        : ResponsiveTheme.colors.info,
                    },
                  ]}
                >
                  +{item.points}
                </Text>
                {item.completed ? (
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
          ))}
        </ScrollView>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.sm,
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
  listContent: { paddingVertical: rp(4) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(10),
    paddingHorizontal: rp(4),
    gap: rw(10),
    height: ITEM_HEIGHT,
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
  textBlock: { flex: 1, gap: rp(2), overflow: "hidden" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: rw(6) },
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
  categoryText: { fontSize: rf(8), fontWeight: "700", letterSpacing: 0.4 },
  description: { fontSize: rf(10), color: ResponsiveTheme.colors.textMuted },
  rightBlock: { alignItems: "center", gap: rp(3), flexShrink: 0 },
  pts: { fontSize: rf(10), fontWeight: "700" },
});

export default AchievementShowcase;
