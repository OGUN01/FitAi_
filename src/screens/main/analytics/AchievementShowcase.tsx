import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rp } from "../../../utils/responsive";
import { SectionHeader } from "../home/SectionHeader";
import { useAchievementStore } from "../../../stores/achievementStore";
import { buildAchievementViewModels } from "../../../utils/achievementViewModel";

interface AchievementShowcaseProps {
  isLoading?: boolean;
  isInitialized?: boolean;
}

const ITEM_HEIGHT = 68;
const VISIBLE_COUNT = 3;

const rarityColor: Record<string, string> = {
  bronze: "#9CA3AF",
  silver: "#3B82F6",
  gold: "#FFD700",
  platinum: "#9333EA",
  diamond: "#F97316",
  legendary: "#FFD700",
};

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  isLoading = false,
  isInitialized = false,
}) => {
  // SSOT: achievementStore is the single source of truth for all achievements.
  const achievements = useAchievementStore((s) => s.achievements);
  const userAchievements = useAchievementStore((s) => s.userAchievements);

  const achievementItems = useMemo(
    () => buildAchievementViewModels(achievements, userAchievements),
    [achievements, userAchievements],
  );

  // Show completed first, then nearly-complete (sorted by percentComplete desc — from buildAchievementViewModels)
  const displayAchievements = achievementItems.slice(0, 6);
  const completedCount = achievementItems.filter((item) => item.completed).length;
  const containerHeight =
    ITEM_HEIGHT * VISIBLE_COUNT + rp(8) * (VISIBLE_COUNT - 1);
  const showLoadingState = isLoading || !isInitialized;
  const showEmptyState = isInitialized && achievementItems.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SectionHeader
          title="Achievements"
          icon="trophy"
          iconColor={ResponsiveTheme.colors.gold}
        />
        {!showLoadingState && !showEmptyState && (
          <Text style={styles.countBadge}>
            {completedCount}/{achievementItems.length}
          </Text>
        )}
      </View>

      <GlassCard
        elevation={1}
        blurIntensity="light"
        padding="sm"
        borderRadius="lg"
      >
        {showLoadingState ? (
          <View style={styles.stateContainer}>
            <Ionicons
              name="hourglass-outline"
              size={rf(24)}
              color={ResponsiveTheme.colors.textMuted}
            />
            <Text style={styles.stateTitle}>Loading achievements...</Text>
            <Text style={styles.stateSubtitle}>
              Checking your latest progress and unlocks.
            </Text>
          </View>
        ) : showEmptyState ? (
          <View style={styles.stateContainer}>
            <Ionicons
              name="trophy-outline"
              size={rf(24)}
              color={ResponsiveTheme.colors.textMuted}
            />
            <Text style={styles.stateTitle}>No achievements yet</Text>
            <Text style={styles.stateSubtitle}>
              Complete workouts and log meals to start unlocking milestones.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ maxHeight: containerHeight }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.listContent}
          >
            {displayAchievements.map((item, index) => {
              const accentColor = item.completed
                ? ResponsiveTheme.colors.success
                : (rarityColor[item.tier] ?? "#9CA3AF");
              const hasProgress =
                !item.completed && item.progress > 0 && item.target > 0;
              const pct = hasProgress
                ? Math.min(100, (item.progress / Math.max(item.target, 1)) * 100)
                : 0;

              return (
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
                      { backgroundColor: `${accentColor}20` },
                    ]}
                  >
                    <Ionicons
                      name={item.iconName as keyof typeof Ionicons.glyphMap}
                      size={rf(18)}
                      color={accentColor}
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
                          { backgroundColor: `${accentColor}18` },
                        ]}
                      >
                        <Text
                          style={[styles.categoryText, { color: accentColor }]}
                        >
                          {item.categoryLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.description} numberOfLines={1}>
                      {item.description}
                    </Text>
                    {hasProgress && (
                      <View style={styles.progressRow}>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${pct}%`, backgroundColor: accentColor },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressLabel}>
                          {item.progress}/{item.target}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.rightBlock}>
                    <Text style={[styles.pts, { color: accentColor }]}>
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
              );
            })}
          </ScrollView>
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
  stateContainer: {
    minHeight: ITEM_HEIGHT * 2,
    justifyContent: "center",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
  },
  stateTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
  stateSubtitle: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },
  listContent: { paddingVertical: rp(4) },
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
    gap: rp(3),
    flexShrink: 0,
    minWidth: rw(30),
  },
  pts: { fontSize: rf(10), fontWeight: "700" },
});

export default AchievementShowcase;
