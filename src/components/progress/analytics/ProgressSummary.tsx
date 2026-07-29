/**
 * ProgressSummary (analytics) - Aurora 2026
 *
 * Slim single-line stats strip with icons; no boxed rows, Manrope type.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  border as borderTokens,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";

interface ProgressStats {
  totalEntries: number;
  timeRange: number;
  weightChange: {
    changePercentage: number;
  };
}

interface ProgressSummaryProps {
  stats: ProgressStats;
}

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  last: boolean;
}

const SummaryRow: React.FC<RowProps> = ({ icon, text, last }) => (
  <View style={[styles.row, !last && styles.rowDivider]}>
    <Ionicons name={icon} size={16} color={colors.text.secondary} />
    <Text style={styles.rowText}>{text}</Text>
  </View>
);

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({ stats }) => {
  const rows: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    {
      icon: "trending-up-outline",
      text: `${stats.totalEntries} Total Entries`,
    },
    {
      icon: "calendar-outline",
      text: `${stats.timeRange}-Day Tracking Period`,
    },
  ];

  if (stats.weightChange.changePercentage !== 0) {
    rows.push({
      icon: "scale-outline",
      text: `${stats.weightChange.changePercentage.toFixed(1)}% Weight Change`,
    });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Summary</Text>
      <View>
        {rows.map((row, idx) => (
          <SummaryRow
            key={idx}
            icon={row.icon}
            text={row.text}
            last={idx === rows.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: borderTokens.subtle,
  },
  rowText: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
});

export default ProgressSummary;
