/**
 * ProgressInsights (analytics) - Aurora 2026
 *
 * Hairline-divided insight rows with tinted icon squircles.
 * No emojis, no nested cards, Manrope type.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  border as borderTokens,
  chart,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";

interface ProgressStats {
  totalEntries: number;
  weightChange: {
    change: number;
  };
  muscleChange: {
    change: number;
  };
  bodyFatChange: {
    change: number;
  };
}

interface ProgressInsightsProps {
  stats: ProgressStats;
}

interface InsightRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
  index: number;
  last: boolean;
}

const InsightRow: React.FC<InsightRowProps> = ({
  icon,
  color,
  text,
  index,
  last,
}) => (
  <Animated.View
    entering={FadeInDown.delay(index * 60).duration(260)}
    style={[styles.insightRow, !last && styles.insightRowDivider]}
  >
    <View style={[styles.insightIconWrap, { backgroundColor: `${color}1A` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={styles.insightText}>{text}</Text>
  </Animated.View>
);

export const ProgressInsights: React.FC<ProgressInsightsProps> = ({
  stats,
}) => {
  const items: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }[] = [];

  if (stats.totalEntries === 0) {
    items.push({
      icon: "analytics-outline",
      color: chart[2],
      text: "Start tracking your measurements to see progress insights!",
    });
  } else {
    if (stats.totalEntries >= 2) {
      items.push({
        icon: "flag-outline",
        color: chart[4],
        text: `Great consistency! You have ${stats.totalEntries} measurements recorded.`,
      });
    }
    if (stats.weightChange.change < 0) {
      items.push({
        icon: "trending-down-outline",
        color: chart[1],
        text: "You're making progress with weight loss! Keep up the great work.",
      });
    }
    if (stats.muscleChange.change > 0) {
      items.push({
        icon: "barbell-outline",
        color: chart[4],
        text: "Excellent muscle gain! Your strength training is paying off.",
      });
    }
    if (stats.bodyFatChange.change < 0) {
      items.push({
        icon: "flame-outline",
        color: chart[5],
        text: "Body fat reduction detected! Your fitness routine is working.",
      });
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Insights</Text>
      <View>
        {items.map((item, idx) => (
          <InsightRow
            key={idx}
            icon={item.icon}
            color={item.color}
            text={item.text}
            index={idx}
            last={idx === items.length - 1}
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
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
  },
  insightRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: borderTokens.subtle,
  },
  insightIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  insightText: {
    flex: 1,
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
});

export default ProgressInsights;
