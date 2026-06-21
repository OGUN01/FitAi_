/**
 * DashboardSkeleton
 * Reusable premium shimmer skeleton for card-list dashboards (Progress,
 * Analytics, Achievements, Diet). Mirrors the common dashboard shape — header
 * row + a section title + N stacked cards + a list section — so the screen
 * feels structured during initial load instead of showing a bare spinner.
 *
 * Built on the aurora SkeletonLoader system; token-based; no new deps.
 */

import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import {
  SkeletonCard,
  SkeletonListItem,
  SkeletonLoader,
} from "./SkeletonLoader";
import { spacing } from "../../../theme/aurora-tokens";
import { rp, rh, rw, rbr } from "../../../utils/responsive";

export interface DashboardSkeletonProps {
  /** Number of stacked cards in the main list. @default 3 */
  cardCount?: number;
  /** Number of list items in the trailing list section. @default 4 */
  listItemCount?: number;
  /** Show a header row (avatar + title + action pill). @default true */
  showHeader?: boolean;
  /** Show a period/filter selector row (segmented pills). @default false */
  showFilterRow?: boolean;
  /** Extra container style. */
  style?: ViewStyle;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  cardCount = 3,
  listItemCount = 4,
  showHeader = true,
  showFilterRow = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {showHeader && (
        <View style={styles.header}>
          <SkeletonLoader variant="avatar" />
          <View style={styles.headerText}>
            <SkeletonLoader variant="title" width="60%" />
          </View>
          <SkeletonLoader
            variant="button"
            width={rw(44)}
            height={rw(44)}
            borderRadius={rbr(22)}
          />
        </View>
      )}

      {showFilterRow && (
        <View style={styles.filterRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader
              key={i}
              variant="button"
              width={rw(90)}
              height={rh(36)}
              borderRadius={rbr(18)}
            />
          ))}
        </View>
      )}

      {/* Section title */}
      <SkeletonLoader variant="title" width="40%" style={styles.sectionTitle} />

      {/* Stacked cards */}
      <View style={styles.cardStack}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonCard key={i} showThumbnail={i === 0} />
        ))}
      </View>

      {/* Trailing list section */}
      {listItemCount > 0 && (
        <View style={styles.listSection}>
          <SkeletonLoader variant="title" width="35%" style={styles.sectionTitle} />
          {Array.from({ length: listItemCount }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </View>
      )}
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
    marginBottom: rp(spacing.sm),
  },
  headerText: {
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
  },
  sectionTitle: {
    marginBottom: rp(spacing.sm),
  },
  cardStack: {
    gap: rp(spacing.md),
  },
  listSection: {
    gap: rp(spacing.md),
    marginTop: rp(spacing.sm),
  },
});

export default DashboardSkeleton;
