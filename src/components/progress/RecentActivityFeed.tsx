import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rs, rbr, rp, rh } from "../../utils/responsive";

/**
 * RecentActivityFeed Component
 *
 * Shows recent workouts, meals, and achievements
 * Clean, card-based layout with safe data handling
 */

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

const ActivityCard: React.FC<{
  activity: ActivityItem;
  onPress?: (activity: ActivityItem) => void;
}> = ({ activity, onPress }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "workout":
        return "💪";
      case "meal":
        return "🍽️";
      case "achievement":
        return "🏆";
      default:
        return "📋";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "workout":
        return colors.success;
      case "meal":
        return colors.primary;
      case "achievement":
        return colors.warning;
      default:
        return colors.textMuted;
    }
  };

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

    if (details.duration) {
      parts.push(`${details.duration} min`);
    }
    if (details.calories) {
      parts.push(`${details.calories} cal`);
    }
    if (details.exercises) {
      parts.push(`${details.exercises} exercises`);
    }
    if (details.meals) {
      parts.push(`${details.meals} meals`);
    }

    return parts.length > 0 ? parts.join(" • ") : null;
  };

  return (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() => onPress?.(activity)}
      activeOpacity={0.7}
    >
      <View style={styles.activityHeader}>
        <View style={styles.activityIconContainer}>
          <Text style={styles.activityIcon}>
            {getActivityIcon(activity.type)}
          </Text>
        </View>

        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>{activity.title}</Text>

          {activity.description && (
            <Text style={styles.activityDescription}>
              {activity.description}
            </Text>
          )}

          {formatDetails(activity) && (
            <Text style={styles.activityDetails}>
              {formatDetails(activity)}
            </Text>
          )}
        </View>

        <View style={styles.activityMeta}>
          <Text style={styles.activityTime}>
            {formatTimestamp(activity.timestamp)}
          </Text>
          <View
            style={[
              styles.activityIndicator,
              { backgroundColor: getActivityColor(activity.type) },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>📊</Text>
    <Text style={styles.emptyTitle}>No Recent Activity</Text>
    <Text style={styles.emptyDescription}>
      Complete a workout or log a meal to see your activity here
    </Text>
  </View>
);

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities = [],
  onActivityPress,
  onViewAll,
  maxItems = 5,
}) => {
  // Real activity tracking from workout sessions and meal logs pending implementation
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
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.activityList}
        showsVerticalScrollIndicator={false}
      >
        {limitedActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={onActivityPress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

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
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  viewAllButton: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
  activityList: {
    maxHeight: rh(300),
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  activityIconContainer: {
    marginRight: spacing.sm,
  },
  activityIcon: {
    fontSize: rf(20),
  },
  activityContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  activityDescription: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  activityDetails: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
  },
  activityMeta: {
    alignItems: "flex-end",
  },
  activityTime: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  activityIndicator: {
    width: rs(8),
    height: rs(8),
    borderRadius: rbr(4),
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: rf(48),
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
  },
});
