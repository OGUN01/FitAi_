/**
 * HomeSkeleton
 * Premium shimmer skeleton mirroring the real HomeScreen render order so
 * content doesn't visibly "pop" into a different shape on cold load. Uses the
 * aurora SkeletonLoader system (SkeletonLoader) so it shares one design
 * language with the rest of the app.
 *
 * Layout mirrors HomeScreen.tsx exactly:
 * header → TodayHero (flat text + CTA) → DailyProgressRings (one hero ring +
 * chip row) → HealthIntelligenceHub (recovery number + vitals row) →
 * QuickActions (horizontal circular icons) → BodyProgressCard → weekly strip.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { SkeletonLoader } from "../../../components/ui/aurora/SkeletonLoader";
import { flatColors as colors, spacing, borderRadius, border } from "../../../theme/aurora-tokens";
import { rp, rh, rw, rbr } from "../../../utils/responsive";

export const HomeSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header: avatar + greeting + streak pill */}
      <View style={styles.header}>
        <SkeletonLoader variant="avatar" />
        <View style={styles.headerText}>
          <SkeletonLoader variant="text" width="50%" />
          <SkeletonLoader variant="text" width="80%" style={styles.subText} />
        </View>
        <SkeletonLoader
          variant="button"
          width={rw(44)}
          height={rw(44)}
          borderRadius={rbr(22)}
        />
      </View>

      {/* TodayHero: flat coach text lines + full-width CTA bar (borderless) */}
      <View style={styles.heroBlock}>
        <SkeletonLoader variant="text" width="90%" height={rh(20)} />
        <SkeletonLoader variant="text" width="45%" height={rh(14)} style={styles.heroMeta} />
        <SkeletonLoader
          variant="button"
          width="100%"
          height={rh(52)}
          borderRadius={rbr(16)}
          style={styles.heroCta}
        />
      </View>

      {/* DailyProgressRings: one large concentric hero ring + chip row,
          inside the same hairline-bordered surface as the real card. */}
      <View style={styles.surfaceCard}>
        <View style={styles.ringHero}>
          <SkeletonLoader
            variant="thumbnail"
            width={rw(180)}
            height={rw(180)}
            borderRadius={rbr(90)}
          />
        </View>
        <View style={styles.chipRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.chip}>
              <SkeletonLoader variant="text" width="70%" height={rh(14)} />
              <SkeletonLoader variant="text" width="50%" height={rh(10)} style={styles.chipLabel} />
            </View>
          ))}
        </View>
      </View>

      {/* HealthIntelligenceHub: header row + big recovery number + vitals row */}
      <View style={styles.surfaceCard}>
        <View style={styles.hubHeader}>
          <SkeletonLoader variant="text" width="55%" height={rh(16)} />
        </View>
        <View style={styles.hubScore}>
          <SkeletonLoader variant="text" width={rw(80)} height={rh(48)} />
        </View>
        <View style={styles.chipRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.chip}>
              <SkeletonLoader variant="text" width="70%" height={rh(14)} />
              <SkeletonLoader variant="text" width="50%" height={rh(10)} style={styles.chipLabel} />
            </View>
          ))}
        </View>
      </View>

      {/* QuickActions: horizontal row of circular icon placeholders */}
      <View style={styles.quickActionsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.quickAction}>
            <SkeletonLoader
              variant="thumbnail"
              width={rw(56)}
              height={rw(56)}
              borderRadius={rbr(28)}
            />
            <SkeletonLoader variant="text" width={rw(48)} height={rh(9)} style={styles.quickActionLabel} />
          </View>
        ))}
      </View>

      {/* BodyProgressCard-shaped block */}
      <View style={styles.surfaceCard}>
        <SkeletonLoader variant="text" width="40%" height={rh(16)} />
        <SkeletonLoader variant="text" width="100%" height={rh(60)} style={styles.bodyProgressChart} />
        <SkeletonLoader variant="text" width="60%" height={rh(10)} />
      </View>

      {/* Weekly mini calendar strip */}
      <View style={styles.weekRow}>
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonLoader
            key={i}
            variant="button"
            width={rw(34)}
            height={rh(48)}
            borderRadius={rbr(8)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.md),
    gap: rp(spacing.lg),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
  },
  headerText: {
    flex: 1,
    gap: rp(spacing.xs),
  },
  subText: {
    marginTop: rp(spacing.xs),
  },
  heroBlock: {
    gap: rp(spacing.sm),
  },
  heroMeta: {
    marginBottom: rp(spacing.xs),
  },
  heroCta: {
    marginTop: rp(spacing.xs),
  },
  // Mirrors the flat Editorial-Dark surface used by DailyProgressRings /
  // HealthIntelligenceHub / BodyProgressCard (hairline border, no blur).
  surfaceCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: rp(spacing.md),
    gap: rp(spacing.md),
  },
  ringHero: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.xs),
  },
  hubHeader: {
    alignItems: "flex-start",
  },
  hubScore: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.sm),
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: rp(spacing.sm),
    borderTopWidth: 1,
    borderTopColor: border.subtle,
  },
  chip: {
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  chipLabel: {
    marginTop: rp(2),
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: rp(spacing.md),
  },
  quickAction: {
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  quickActionLabel: {
    marginTop: rp(2),
  },
  bodyProgressChart: {
    marginVertical: rp(spacing.xs),
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default HomeSkeleton;
