/**
 * HomeSkeleton
 * Premium shimmer skeleton mirroring the HomeScreen layout so the dashboard
 * feels structured (not a bare spinner) during initial load. Uses the aurora
 * SkeletonLoader system (SkeletonCard / SkeletonText / SkeletonLoader) so it
 * shares one design language with the rest of the app.
 *
 * Layout mirrors HomeScreen's order: header → rings row → coaching card →
 * workout card → quick actions → hydration → weekly calendar.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import {
  SkeletonCard,
  SkeletonLoader,
  SkeletonText,
} from "../../../components/ui/aurora/SkeletonLoader";
import { spacing } from "../../../theme/aurora-tokens";
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

      {/* Daily progress rings row */}
      <View style={styles.ringsRow}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.ringPlaceholder}>
            <SkeletonLoader
              variant="thumbnail"
              width={rw(76)}
              height={rw(76)}
              borderRadius={rbr(38)}
            />
            <SkeletonLoader
              variant="text"
              width="60%"
              height={rh(10)}
              style={styles.ringLabel}
            />
          </View>
        ))}
      </View>

      {/* Smart coaching card */}
      <SkeletonCard showThumbnail={false} />

      {/* Today's workout card */}
      <SkeletonCard showThumbnail />

      {/* Quick actions (2-up) */}
      <View style={styles.quickActionsRow}>
        {Array.from({ length: 2 }).map((_, i) => (
          <View key={i} style={styles.quickAction}>
            <SkeletonLoader
              variant="button"
              height={rh(72)}
              borderRadius={rbr(12)}
            />
          </View>
        ))}
      </View>

      {/* Hydration tracker card */}
      <SkeletonText lines={2} showTitle spacing={rp(spacing.sm)} />

      {/* Weekly mini calendar */}
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
  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: rp(spacing.sm),
  },
  ringPlaceholder: {
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  ringLabel: {
    marginTop: rp(spacing.xs),
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: rp(spacing.md),
  },
  quickAction: {
    flex: 1,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default HomeSkeleton;
