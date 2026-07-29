import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  chart,
  colors,
  typography,
  spacing,
} from "../../../theme/aurora-tokens";
import { rf, rp } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
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
  bronze: colors.text.muted,
  silver: chart[2],
  gold: chart[5],
  platinum: chart[3],
  diamond: chart[1],
  legendary: chart[5],
};

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  isLoading = false,
  isInitialized = false,
}) => {
  const achievements = useAchievementStore((s) => s.achievements);
  const userAchievements = useAchievementStore((s) => s.userAchievements);

  const achievementItems = useMemo(
    () => buildAchievementViewModels(achievements, userAchievements),
    [achievements, userAchievements],
  );

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
          iconColor={chart[5]}
        />
        {!showLoadingState && !showEmptyState && (
          <Text style={styles.countBadge} numberOfLines={1}>
            {completedCount}/{achievementItems.length}
          </Text>
        )}
      </View>

      <View style={styles.panel}>
        {showLoadingState ? (
          <View style={styles.stateContainer}>
            <Ionicons
              name="hourglass-outline"
              size={rf(24)}
              color={colors.text.muted}
            />
            <Text style={styles.stateTitle} numberOfLines={1}>
              Loading achievements...
            </Text>
            <Text style={styles.stateSubtitle} numberOfLines={2}>
              Checking your latest progress and unlocks.
            </Text>
          </View>
        ) : showEmptyState ? (
          <View style={styles.stateContainer}>
            <Ionicons
              name="trophy-outline"
              size={rf(24)}
              color={colors.text.muted}
            />
            <Text style={styles.stateTitle} numberOfLines={1}>
              No achievements yet
            </Text>
            <Text style={styles.stateSubtitle} numberOfLines={2}>
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
                ? chart[4]
                : (rarityColor[item.tier] ?? colors.text.muted);
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
                      { backgroundColor: hexToRgba(accentColor, 0.12) },
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
                          { backgroundColor: hexToRgba(accentColor, 0.1) },
                        ]}
                      >
                        <Text
                          style={[styles.categoryText, { color: accentColor }]}
                          numberOfLines={1}
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
                        <Text style={styles.progressLabel} numberOfLines={1}>
                          {item.progress}/{item.target}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.rightBlock}>
                    <Text style={[styles.pts, { color: accentColor }]} numberOfLines={1}>
                      +{item.points}
                    </Text>
                    {item.completed ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={rf(16)}
                        color={chart[4]}
                      />
                    ) : (
                      <Ionicons
                        name="lock-closed-outline"
                        size={rf(16)}
                        color={colors.text.muted}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    zIndex: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  countBadge: {
    ...typography.variants.caption,
    color: colors.text.muted,
    backgroundColor: hexToRgba("#FFFFFF", 0.07),
    paddingHorizontal: rp(8),
    paddingVertical: rp(3),
    borderRadius: rp(10),
  },
  panel: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  stateContainer: {
    minHeight: ITEM_HEIGHT * 2,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  stateTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(14),
    color: colors.text.primary,
    textAlign: "center",
  },
  stateSubtitle: {
    ...typography.variants.caption,
    color: colors.text.secondary,
    textAlign: "center",
  },
  listContent: { paddingVertical: rp(4) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(10),
    paddingHorizontal: rp(8),
    gap: spacing.sm,
    minHeight: ITEM_HEIGHT,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: border.subtle,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  textBlock: { flex: 1, minWidth: 0, gap: rp(2), overflow: "hidden" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(12),
    color: colors.text.primary,
    flexShrink: 1,
  },
  categoryTag: {
    paddingHorizontal: rp(5),
    paddingVertical: rp(1),
    borderRadius: rp(4),
    flexShrink: 0,
  },
  categoryText: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(11),
    letterSpacing: 0.4,
  },
  description: {
    ...typography.variants.caption,
    color: colors.text.secondary,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: rp(2),
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: border.subtle,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressLabel: {
    ...typography.variants.caption,
    color: colors.text.muted,
    flexShrink: 0,
  },
  rightBlock: {
    alignItems: "center",
    gap: rp(3),
    flexShrink: 0,
    minWidth: 30,
  },
  pts: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(12),
  },
});

export default AchievementShowcase;
