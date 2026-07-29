/**
 * RecentActivityFeed - Aurora 2026
 *
 * Flat surface.1 rows with icon squircle + content + time/indicator.
 * No emojis, no drop shadows, Manrope type, chart-palette accents.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border as borderTokens,
  chart,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface ActivityItem {
  id: string;
  type: "workout" | "meal" | "achievement";
  title: string;
  description?: string;
  timestamp: Date;
  details?: {
    duration?: number;
    calories?: number;
    exercises?: number;
    meals?: number;
    badge?: string;
  };
}

interface RecentActivityFeedProps {
  activities?: ActivityItem[];
  onActivityPress?: (activity: ActivityItem) => void;
  onViewAll?: () => void;
  maxItems?: number;
}

const TYPE_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  workout: { icon: "barbell-outline", color: chart[4] },
  meal: { icon: "restaurant-outline", color: chart[1] },
  achievement: { icon: "trophy-outline", color: chart[5] },
};

const getTypeMeta = (type: string) =>
  TYPE_META[type] ?? { icon: "ellipse-outline", color: colors.text.muted };

const formatTimestamp = (timestamp: Date) => {
  try {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
    if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    return "Just now";
  } catch {
    return "Recently";
  }
};

const formatDetails = (activity: ActivityItem) => {
  const { details } = activity;
  if (!details) return null;

  const parts: string[] = [];
  if (details.duration) parts.push(`${details.duration} min`);
  if (details.calories) parts.push(`${details.calories} cal`);
  if (details.exercises) parts.push(`${details.exercises} exercises`);
  if (details.meals) parts.push(`${details.meals} meals`);

  return parts.length > 0 ? parts.join(" • ") : null;
};

const ActivityRow: React.FC<{
  activity: ActivityItem;
  index: number;
  onPress?: (activity: ActivityItem) => void;
}> = React.memo(({ activity, index, onPress }) => {
  const meta = getTypeMeta(activity.type);
  const detailsText = formatDetails(activity);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(260)}>
      <TouchableOpacity
        style={styles.activityCard}
        onPress={() => {
          haptics.light();
          onPress?.(activity);
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={activity.title}
      >
        <View
          style={[
            styles.activityIconWrap,
            { backgroundColor: `${meta.color}1A` },
          ]}
        >
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>

        <View style={styles.activityContent}>
          <Text style={styles.activityTitle} numberOfLines={1}>
            {activity.title}
          </Text>
          {activity.description && (
            <Text style={styles.activityDescription} numberOfLines={1}>
              {activity.description}
            </Text>
          )}
          {detailsText && (
            <Text style={styles.activityDetails}>{detailsText}</Text>
          )}
        </View>

        <View style={styles.activityMeta}>
          <Text style={styles.activityTime}>
            {formatTimestamp(activity.timestamp)}
          </Text>
          <View
            style={[
              styles.activityIndicator,
              { backgroundColor: meta.color },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrap}>
      <Ionicons
        name="pulse-outline"
        size={28}
        color={colors.text.muted}
      />
    </View>
    <Text style={styles.emptyTitle}>No Recent Activity</Text>
    <Text style={styles.emptyDescription}>
      Complete a workout or log a meal to see your activity here
    </Text>
  </View>
);

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = React.memo(({
  activities = [],
  onActivityPress,
  onViewAll,
  maxItems = 5,
}) => {
  const displayActivities = activities;
  const limitedActivities = displayActivities.slice(0, maxItems);

  if (limitedActivities.length === 0) {
    return <EmptyState />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {onViewAll && displayActivities.length > maxItems && (
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              onViewAll();
            }}
            accessibilityRole="button"
            accessibilityLabel="View all activities"
          >
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.activityList}
        showsVerticalScrollIndicator={false}
      >
        {limitedActivities.map((activity, index) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            index={index}
            onPress={onActivityPress}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
  },
  viewAllButton: {
    ...typography.variants.caption2,
    fontFamily: "Manrope_600SemiBold",
    color: colors.primary.DEFAULT,
  },
  activityList: {
    maxHeight: rh(300),
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: surface[1],
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  activityTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  activityDescription: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginBottom: spacing.xxs,
  },
  activityDetails: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
  activityMeta: {
    alignItems: "flex-end",
  },
  activityTime: {
    ...typography.variants.caption,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  activityIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: surface[1],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  emptyDescription: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    textAlign: "center",
  },
});

export default RecentActivityFeed;
