import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { THEME } from '../../utils/constants';

/**
 * RecentActivityFeed Component
 *
 * Shows recent workouts, meals, and achievements
 * Clean, card-based layout with safe data handling
 */

interface ActivityItem {
  id: string;
  type: 'workout' | 'meal' | 'achievement';
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
  maxItems?: number;
}

const ActivityCard: React.FC<{
  activity: ActivityItem;
  onPress?: (activity: ActivityItem) => void;
}> = ({ activity, onPress }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'workout':
        return '💪';
      case 'meal':
        return '🍽️';
      case 'achievement':
        return '🏆';
      default:
        return '📋';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'workout':
        return THEME.colors.success;
      case 'meal':
        return THEME.colors.primary;
      case 'achievement':
        return THEME.colors.warning;
      default:
        return THEME.colors.textMuted;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    try {
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
      if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      return 'Just now';
    } catch {
      return 'Recently';
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

    return parts.length > 0 ? parts.join(' • ') : null;
  };

  return (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() => onPress?.(activity)}
      activeOpacity={0.7}
    >
      <View style={styles.activityHeader}>
        <View style={styles.activityIconContainer}>
          <Text style={styles.activityIcon}>{getActivityIcon(activity.type)}</Text>
        </View>

        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>{activity.title}</Text>

          {activity.description && (
            <Text style={styles.activityDescription}>{activity.description}</Text>
          )}

          {formatDetails(activity) && (
            <Text style={styles.activityDetails}>{formatDetails(activity)}</Text>
          )}
        </View>

        <View style={styles.activityMeta}>
          <Text style={styles.activityTime}>{formatTimestamp(activity.timestamp)}</Text>
          <View
            style={[styles.activityIndicator, { backgroundColor: getActivityColor(activity.type) }]}
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
  maxItems = 5,
}) => {
  // Use only real activities - no mock data
  // TODO: Implement real activity tracking from workout sessions and meal logs
  const displayActivities = activities;
  const limitedActivities = displayActivities.slice(0, maxItems);

  if (limitedActivities.length === 0) {
    return <EmptyState />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {displayActivities.length > maxItems && (
          <TouchableOpacity>
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.activityList} showsVerticalScrollIndicator={false}>
        {limitedActivities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} onPress={onActivityPress} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  viewAllButton: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.primary,
  },
  activityList: {
    maxHeight: 300,
  },
  activityCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIconContainer: {
    marginRight: THEME.spacing.sm,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
    marginRight: THEME.spacing.sm,
  },
  activityTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  activityDescription: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.normal,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },
  activityDetails: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textMuted,
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityTime: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.xs,
  },
  activityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xxl,
    paddingHorizontal: THEME.spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },
  emptyTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.normal,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
