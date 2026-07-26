/**
 * CommunityTemplatesTab
 *
 * Standalone content component for the "Community" tab of the Phase 7 template
 * library redesign. Renders a sort-chip row (Trending / Top Rated / New) and
 * a paginated FlatList of public templates fetched via
 * `workoutTemplateService.getPublicTemplates({ sort, limit:30, offset })`.
 *
 * Each card shows a gradient thumbnail, name, author, rating average, fork
 * count, exercise count, duration, and difficulty. Tapping a card opens the
 * `TemplateDetailSheet` (Phase 7 component #3) passed in via the
 * `onOpenTemplate` prop — the parent owns sheet state so a single sheet is
 * shared across the whole library.
 *
 * Pagination: `onEndReached` advances `offset` by `PAGE_SIZE` and appends. We
 * stop fetching once a page returns fewer than `PAGE_SIZE` rows (the service
 * range-query caps at the public-template catalog size).
 *
 * Premium gating: `subscriptionStore.isPremium()` gates the "Community" tab at
 * the parent level (parent renders this tab only when premium). We do NOT
 * re-check here — the parent is the single gate.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  workoutTemplateService,
  type WorkoutTemplate,
  type CommunitySortOption,
} from "../../../services/workoutTemplateService";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import { EmptyState } from "../../ui/aurora/EmptyState";
import {
  SkeletonLoader,
} from "../../ui/aurora/SkeletonLoader";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { animations } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { rf, rh, rp, rw } from "../../../utils/responsive";

// ----------------------------------------------------------------------------
// TYPES & CONSTANTS
// ----------------------------------------------------------------------------

interface CommunityTemplatesTabProps {
  /** Open the shared TemplateDetailSheet with this template. */
  onOpenTemplate: (template: WorkoutTemplate) => void;
  /** Optional category filter inherited from the Collections chip row. */
  category?: string;
  /** Optional difficulty filter. */
  difficulty?: "beginner" | "intermediate" | "advanced";
  /** Optional extra container style. */
  style?: ViewStyle;
}

/**
 * Threshold for "Featured": templates with this many forks (or more) appear in
 * the Featured section when sort=trending. Tuned low so a fresh community has
 * some featured content; raise once volume grows.
 */
const FEATURED_FORK_THRESHOLD = 1;
const FEATURED_MAX = 5;

interface SortChip {
  id: CommunitySortOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SORT_CHIPS: SortChip[] = [
  { id: "trending", label: "Trending", icon: "flame-outline" },
  { id: "top", label: "Top Rated", icon: "star-outline" },
  { id: "new", label: "New", icon: "time-outline" },
];

const PAGE_SIZE = 30;
const MAX_PAGES = 10; // hard ceiling: 300 public templates

/** Narrow a typography.fontWeight token to RN's literal fontWeight union. */
const fw = (w: string): TextStyle["fontWeight"] =>
  w as TextStyle["fontWeight"];

// ----------------------------------------------------------------------------
// DIFFICULTY HELPERS
// ----------------------------------------------------------------------------

const DIFFICULTY_TINT: Record<
  NonNullable<WorkoutTemplate["difficulty"]>,
  string
> = {
  beginner: colors.success,
  intermediate: colors.secondary,
  advanced: colors.error,
};

const DIFFICULTY_LABEL: Record<
  NonNullable<WorkoutTemplate["difficulty"]>,
  string
> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const CommunityTemplatesTab: React.FC<CommunityTemplatesTabProps> = ({
  onOpenTemplate,
  category,
  difficulty,
  style,
}) => {
  const [sort, setSort] = useState<CommunitySortOption>("trending");
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageCountRef = useRef(1);

  // Reset + fetch whenever sort/category/difficulty changes.
  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    pageCountRef.current = 1;
    setHasMore(true);
    try {
      const rows = await workoutTemplateService.getPublicTemplates({
        sort,
        category,
        difficulty,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setTemplates(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("[CommunityTemplatesTab] fetch failed:", err);
      setTemplates([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [sort, category, difficulty]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  const fetchNextPage = useCallback(async () => {
    if (loadingMore || !hasMore || pageCountRef.current >= MAX_PAGES) return;
    setLoadingMore(true);
    const nextOffset = pageCountRef.current * PAGE_SIZE;
    try {
      const rows = await workoutTemplateService.getPublicTemplates({
        sort,
        category,
        difficulty,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      pageCountRef.current += 1;
      setTemplates((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("[CommunityTemplatesTab] paginate failed:", err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [sort, category, difficulty, loadingMore, hasMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFirstPage();
    setRefreshing(false);
  }, [fetchFirstPage]);

  const handleSortChange = useCallback((next: CommunitySortOption) => {
    if (next === sort) return;
    haptics.selection();
    setSort(next);
  }, [sort]);

  // ── Featured: a curated slice of the trending list (high fork_count) shown
  // above the paginated list when sort=trending. We derive it from the first
  // page so we don't issue a second request. Once the community grows, this
  // can be swapped for a dedicated `getFeaturedTemplates` service call.
  const featured: WorkoutTemplate[] = useMemo(() => {
    if (sort !== "trending") return [];
    return templates
      .filter((t) => (t.forkCount ?? 0) >= FEATURED_FORK_THRESHOLD)
      .slice(0, FEATURED_MAX);
  }, [templates, sort]);

  const handleCardPress = useCallback((tpl: WorkoutTemplate) => {
    haptics.light();
    onOpenTemplate(tpl);
  }, [onOpenTemplate]);

  // ── Loading skeleton (first page only) ───────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, style]} testID="community-tab-loading">
        <SkeletonLoader variant="button" style={styles.sortSkeleton} />
        <View style={styles.listGap}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </View>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (templates.length === 0) {
    return (
      <View style={[styles.container, style]} testID="community-tab-empty">
        <SortRow sort={sort} onSelect={handleSortChange} />
        <EmptyState
          icon="people-outline"
          title="No community templates yet"
          subtitle="Be the first to share a workout with the community!"
          iconColor={colors.secondary}
        />
      </View>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, style]} testID="community-tab-list">
      <SortRow sort={sort} onSelect={handleSortChange} />

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <CommunityCard
            template={item}
            index={index}
            onPress={handleCardPress}
          />
        )}
        contentContainerStyle={styles.list}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          featured.length > 0 ? (
            <View style={styles.featuredWrap} testID="community-featured-section">
              <View style={styles.featuredHeader}>
                <Ionicons name="flame" size={rf(typography.fontSize.body)} color={colors.amber} />
                <Text style={styles.featuredTitle}>Featured</Text>
              </View>
              <Text style={styles.featuredSubtitle}>
                Most-forked templates this week
              </Text>
              <View style={styles.featuredList}>
                {featured.map((tpl, i) => (
                  <CommunityCard
                    key={tpl.id}
                    template={tpl}
                    index={i}
                    onPress={handleCardPress}
                  />
                ))}
              </View>
              <View style={styles.featuredDivider}>
                <Text style={styles.featuredDividerText}>All templates</Text>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? <SkeletonCard compact /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ----------------------------------------------------------------------------
// SORT ROW (segmented chips)
// ----------------------------------------------------------------------------

interface SortRowProps {
  sort: CommunitySortOption;
  onSelect: (next: CommunitySortOption) => void;
}

const SortRow: React.FC<SortRowProps> = ({ sort, onSelect }) => (
  <View style={styles.sortRow}>
    {SORT_CHIPS.map((chip) => {
      const active = chip.id === sort;
      return (
        <AnimatedPressable
          key={chip.id}
          onPress={() => onSelect(chip.id)}
          scaleValue={0.96}
          springConfig="snappy"
          hapticType="selection"
          style={[styles.sortChip, active && styles.sortChipActive]}
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${chip.label}`}
          accessibilityState={{ selected: active }}
          testID={`sort-chip-${chip.id}`}
        >
          <Ionicons
            name={chip.icon}
            size={rf(typography.fontSize.caption)}
            color={active ? colors.text : colors.textSecondary}
            style={styles.sortChipIcon}
          />
          <Text
            style={[
              styles.sortChipText,
              active && styles.sortChipTextActive,
            ]}
          >
            {chip.label}
          </Text>
        </AnimatedPressable>
      );
    })}
  </View>
);

// ----------------------------------------------------------------------------
// COMMUNITY CARD
// ----------------------------------------------------------------------------

interface CommunityCardProps {
  template: WorkoutTemplate;
  index: number;
  onPress: (tpl: WorkoutTemplate) => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({
  template,
  index,
  onPress,
}) => {
  const duration = template.estimatedDurationMinutes ?? 0;
  const exerciseCount = template.exercises.length;
  const difficulty = template.difficulty;
  const tint = difficulty ? DIFFICULTY_TINT[difficulty] : colors.primary;
  const difficultyLabel = difficulty
    ? DIFFICULTY_LABEL[difficulty]
    : "Any level";

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 40, 320)).duration(
        animations.duration.normal,
      )}
    >
      <GlassCard
        elevation={2}
        padding="none"
        borderRadius="xl"
        pressable
        onPress={() => onPress(template)}
        contentStyle={styles.cardContent}
        style={styles.card}
      >
        <View style={styles.cardRow}>
          {/* Gradient thumbnail with icon */}
          <LinearGradient
            colors={[colors.primary, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.thumbnail}
          >
            <Ionicons name="barbell" size={rf(22)} color={colors.white} />
          </LinearGradient>

          {/* Body */}
          <View style={styles.cardBody}>
            <Text
              style={styles.cardName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {template.name}
            </Text>

            {template.authorName ? (
              <View style={styles.authorRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={rf(13)}
                  color={colors.textSecondary}
                />
                <Text style={styles.authorText} numberOfLines={1}>
                  {template.authorName}
                </Text>
              </View>
            ) : null}

            <View style={styles.statRow}>
              <StatPill
                icon="star"
                value={
                  template.ratingAvg && template.ratingAvg > 0
                    ? template.ratingAvg.toFixed(1)
                    : "—"
                }
                tint={colors.amber}
              />
              <StatPill
                icon="git-branch-outline"
                value={String(template.forkCount ?? 0)}
                tint={colors.secondary}
              />
              <StatPill
                icon="barbell-outline"
                value={`${exerciseCount}`}
                tint={colors.primary}
              />
              {duration > 0 ? (
                <StatPill
                  icon="time-outline"
                  value={`${duration}m`}
                  tint={colors.neutral}
                />
              ) : null}
            </View>

            {/* Difficulty badge */}
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: `${tint}1F` },
              ]}
            >
              <Text style={[styles.difficultyText, { color: tint }]}>
                {difficultyLabel}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

// ----------------------------------------------------------------------------
// STAT PILL (small inline metric)
// ----------------------------------------------------------------------------

interface StatPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  tint: string;
}

const StatPill: React.FC<StatPillProps> = ({ icon, value, tint }) => (
  <View style={styles.statPill} accessible={false}>
    <Ionicons name={icon} size={rf(12)} color={tint} />
    <Text style={[styles.statPillText, { color: tint }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

// ----------------------------------------------------------------------------
// SKELETON CARD
// ----------------------------------------------------------------------------

const SkeletonCard: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <View style={styles.skeletonCard}>
    <SkeletonLoader
      variant="thumbnail"
      width={rw(56)}
      height={rw(56)}
      borderRadius={borderRadius.lg}
    />
    <View style={styles.skeletonBody}>
      <SkeletonLoader variant="title" width="70%" />
      <SkeletonLoader variant="text" width="45%" style={styles.skeletonGap} />
      {!compact ? (
        <View style={styles.skeletonPillRow}>
          <SkeletonLoader
            variant="button"
            width={rw(64)}
            height={rh(18)}
            borderRadius={borderRadius.full}
          />
          <SkeletonLoader
            variant="button"
            width={rw(64)}
            height={rh(18)}
            borderRadius={borderRadius.full}
          />
        </View>
      ) : null}
    </View>
  </View>
);

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: rp(spacing.md),
  },
  sortSkeleton: {
    width: "100%",
    height: rh(40),
    marginBottom: rp(spacing.md),
  },
  sortRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.md),
  },
  sortChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: Math.max(rp(40), 44),
  },
  sortChipActive: {
    backgroundColor: `${colors.primary}26`,
    borderColor: colors.primary,
  },
  sortChipIcon: {},
  sortChipText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.medium),
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.text,
    fontWeight: fw(typography.fontWeight.semibold),
  },
  list: {
    paddingBottom: rp(spacing.xl),
    gap: rp(spacing.sm),
  },
  listGap: {
    gap: rp(spacing.sm),
  },
  card: {
    marginBottom: 0,
  },
  cardContent: {
    padding: rp(spacing.sm),
  },
  cardRow: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    alignItems: "center",
  },
  thumbnail: {
    width: rw(56),
    height: rw(56),
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: rp(spacing.xs),
  },
  cardName: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
    color: colors.text,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
  },
  authorText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.textSecondary,
    flex: 1,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.xs),
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(spacing.xxs),
    borderRadius: borderRadius.full,
  },
  statPillText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  difficultyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    borderRadius: borderRadius.full,
  },
  difficultyText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  // Skeleton
  skeletonCard: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    alignItems: "center",
    padding: rp(spacing.sm),
    backgroundColor: colors.glassSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  skeletonBody: {
    flex: 1,
    gap: rp(spacing.xs),
  },
  skeletonGap: {
    marginTop: rp(spacing.xxs),
  },
  skeletonPillRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.xs),
  },
  // Featured section (Phase 10 — sort=trending header)
  featuredWrap: {
    marginBottom: rp(spacing.md),
  },
  featuredHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xxs),
  },
  featuredTitle: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.bold),
    color: colors.text,
  },
  featuredSubtitle: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.textSecondary,
    marginBottom: rp(spacing.sm),
  },
  featuredList: {
    gap: rp(spacing.sm),
  },
  featuredDivider: {
    marginTop: rp(spacing.md),
    paddingTop: rp(spacing.sm),
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  featuredDividerText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default CommunityTemplatesTab;
