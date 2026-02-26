import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
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
        return ResponsiveTheme.colors.success;
      case "meal":
        return ResponsiveTheme.colors.primary;
      case "achievement":
        return ResponsiveTheme.colors.warning;
      default:
        return ResponsiveTheme.colors.textMuted;
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  viewAllButton: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.primary,
  },
  activityList: {
    maxHeight: rh(300),
  },
  activityCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  activityIconContainer: {
    marginRight: ResponsiveTheme.spacing.sm,
  },
  activityIcon: {
    fontSize: rf(20),
  },
  activityContent: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  activityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  activityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.normal,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  activityDetails: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textMuted,
  },
  activityMeta: {
    alignItems: "flex-end",
  },
  activityTime: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  activityIndicator: {
    width: rs(8),
    height: rs(8),
    borderRadius: rbr(4),
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xxl,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  emptyIcon: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.normal,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
  },
});
