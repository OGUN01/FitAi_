/**
 * MuscleHeatmap — Phase 11 (Part A, deliverable 2).
 *
 * Visual heatmap of muscle-group training volume over the last 4 weeks.
 * Grid of muscle groups (rows) × weeks (columns). Cell color intensity =
 * total volume that week (green low → orange mid → red high). Tap a cell to
 * surface a tooltip with the exact volume.
 *
 * Built as a simple View-based grid (no Skia dependency) so it renders in
 * the node test environment and on low-end devices without GPU overhead.
 *
 * All colors / radii / spacing from aurora-tokens. Haptics on cell tap.
 * Reduce-motion respected (no animation when enabled — cells render at
 * their final intensity immediately).
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export interface MuscleVolumeEntry {
  /** Lowercase muscle group key (e.g. "chest", "quadriceps"). */
  muscle: string;
  /** Per-week total volume (sets × reps × weight), oldest → newest. */
  weeklyVolumes: number[];
}

export interface MuscleHeatmapProps {
  /** One entry per muscle group row. */
  data: MuscleVolumeEntry[];
  /** Week labels aligned with weeklyVolumes (oldest → newest). @default ["W-3","W-2","W-1","W"] */
  weekLabels?: string[];
  /** Test ID prefix. */
  testID?: string;
}

// ----------------------------------------------------------------------------
// COLOR INTENSITY — green (low) → orange (mid) → red (high)
// ----------------------------------------------------------------------------

/** Map a 0..1 intensity to a fill color. 0 = empty glass, 1 = max red. */
function intensityColor(intensity: number): string {
  if (intensity <= 0) return colors.glass.backgroundLight;
  if (intensity < 0.34) return colors.success.DEFAULT; // green
  if (intensity < 0.67) return colors.warning.DEFAULT; // orange
  return colors.error.DEFAULT; // red
}

/** Human-readable volume label. */
function formatVolume(volume: number): string {
  if (volume <= 0) return "—";
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}t`;
  return `${Math.round(volume)}kg`;
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

const DEFAULT_WEEK_LABELS = ["W-3", "W-2", "W-1", "W"];

export const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({
  data,
  weekLabels = DEFAULT_WEEK_LABELS,
  testID,
}) => {
  const reduceMotion = useReducedMotion();
  const [activeCell, setActiveCell] = useState<{
    muscleIndex: number;
    weekIndex: number;
  } | null>(null);

  // Compute the max volume across all cells so intensities are relative.
  const maxVolume = Math.max(1, ...data.flatMap((d) => d.weeklyVolumes));

  const handleCellPress = useCallback(
    (muscleIndex: number, weekIndex: number) => {
      haptics.selection();
      setActiveCell((cur) =>
        cur && cur.muscleIndex === muscleIndex && cur.weekIndex === weekIndex
          ? null
          : { muscleIndex, weekIndex },
      );
    },
    [],
  );

  if (data.length === 0) {
    return (
      <View style={styles.emptyState} testID={`${testID ?? "muscle-heatmap"}-empty`}>
        <Ionicons name="grid-outline" size={rf(24)} color={colors.text.tertiary} />
        <Text style={styles.emptyText}>No muscle volume recorded yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID ?? "muscle-heatmap"}>
      {/* Column headers (weeks) */}
      <View style={styles.headerRow}>
        <View style={styles.muscleLabelCol} />
        {weekLabels.map((label, i) => (
          <View key={`wk_${i}`} style={styles.weekHeaderCell}>
            <Text style={styles.weekHeaderText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Rows: one per muscle group */}
      {data.map((entry, muscleIndex) => (
        <View key={`muscle_${entry.muscle}`} style={styles.row}>
          <View style={styles.muscleLabelCol}>
            <Text style={styles.muscleLabelText} numberOfLines={1}>
              {capitalize(entry.muscle)}
            </Text>
          </View>
          {entry.weeklyVolumes.map((volume, weekIndex) => {
            const intensity = volume / maxVolume;
            const isActive =
              activeCell?.muscleIndex === muscleIndex &&
              activeCell?.weekIndex === weekIndex;
            return (
              <Pressable
                key={`cell_${muscleIndex}_${weekIndex}`}
                onPress={() => handleCellPress(muscleIndex, weekIndex)}
                accessibilityRole="button"
                accessibilityLabel={`${capitalize(entry.muscle)} week ${weekLabels[weekIndex] ?? weekIndex + 1}: ${formatVolume(volume)}`}
                accessibilityHint="Double tap to see exact volume"
                style={[
                  styles.cell,
                  {
                    backgroundColor: intensityColor(intensity),
                    opacity: reduceMotion ? 1 : isActive ? 1 : 0.92,
                  },
                ]}
                testID={`${testID ?? "muscle-heatmap"}-cell-${muscleIndex}-${weekIndex}`}
              >
                {isActive && (
                  <Text style={styles.cellValueText}>
                    {formatVolume(volume)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={[styles.legendSwatch, { backgroundColor: colors.glass.backgroundLight }]} />
        <View style={[styles.legendSwatch, { backgroundColor: colors.success.DEFAULT }]} />
        <View style={[styles.legendSwatch, { backgroundColor: colors.warning.DEFAULT }]} />
        <View style={[styles.legendSwatch, { backgroundColor: colors.error.DEFAULT }]} />
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

// Cast a typography weight token to RN's TextStyle fontWeight (TS strict).
const fw = (
  w: (typeof typography.fontWeight)[keyof typeof typography.fontWeight],
): TextStyle["fontWeight"] => String(w) as TextStyle["fontWeight"];

const cellSize = rw(40);

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(spacing.xs),
  },
  muscleLabelCol: {
    width: rw(84),
    paddingRight: rp(spacing.xs),
  },
  weekHeaderCell: {
    width: cellSize,
    alignItems: "center",
  },
  weekHeaderText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  } as TextStyle,
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(spacing.xxs),
    minHeight: rp(44), // tap target ≥ 44dp
  },
  muscleLabelText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.medium),
  } as TextStyle,
  cell: {
    width: cellSize,
    height: cellSize,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginHorizontal: 0,
  },
  cellValueText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.bold),
  } as TextStyle,
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    marginTop: rp(spacing.sm),
    alignSelf: "flex-end",
  },
  legendText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  legendSwatch: {
    width: rw(12),
    height: rw(12),
    borderRadius: borderRadius.xs,
  } as ViewStyle,
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.lg),
    gap: rp(spacing.xs),
  },
  emptyText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
  },
});

export default MuscleHeatmap;
