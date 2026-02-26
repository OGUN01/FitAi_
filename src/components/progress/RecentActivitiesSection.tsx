import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rs, rbr } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";

interface RecentActivitiesSectionProps {
  recentActivities: any[];
  onViewAll: () => void;
}

export const RecentActivitiesSection: React.FC<
  RecentActivitiesSectionProps
> = ({ recentActivities, onViewAll }) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        {recentActivities.length > 3 && (
          <AnimatedPressable onPress={onViewAll} scaleValue={0.97}>
            <Text style={styles.viewAllText}>View All</Text>
          </AnimatedPressable>
        )}
      </View>

      {recentActivities.length > 0 ? (
        recentActivities.slice(0, 3).map((activity, index) => {
          // Ensure activity name is a string
          let activityName = activity.name;
          if (Array.isArray(activityName)) {
            activityName = activityName.join(", ");
          } else if (typeof activityName !== "string") {
            activityName = String(activityName || "Unknown Activity");
          }

          return (
            <GlassCard
              key={activity.id}
              style={styles.activityCard}
              elevation={1}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
            >
              <View style={styles.activityContent}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={
                      activity.type === "workout"
                        ? "barbell-outline"
                        : "restaurant-outline"
                    }
                    size={rf(20)}
                    color={ResponsiveTheme.colors.primary}
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{activityName}</Text>
                  <Text style={styles.activityDetails}>
                    {activity.type === "workout"
                      ? `${activity.duration || "Unknown"} min • ${
                          activity.calories || 0
                        } cal`
                      : `${activity.calories || 0} calories consumed`}
                  </Text>
                  <Text style={styles.activityDate}>
                    {new Date(activity.completedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.activityBadge}>
                  <Ionicons
                    name="checkmark"
                    size={rf(14)}
                    color={ResponsiveTheme.colors.white}
                  />
                </View>
              </View>
            </GlassCard>
          );
        })
      ) : (
        <GlassCard
          style={styles.emptyCard}
          elevation={1}
          blurIntensity="light"
          padding="md"
          borderRadius="lg"
        >
          <Text style={styles.emptyText}>No recent activities yet</Text>
          <Text style={styles.emptySubtext}>
            Complete workouts and meals to see them here
          </Text>
        </GlassCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  viewAllText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  activityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    padding: ResponsiveTheme.spacing.md,
  },
  activityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: rs(40),
    height: rs(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(2),
  },
  activityDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(2),
  },
  activityDate: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textTertiary,
  },
  activityBadge: {
    width: rs(24),
    height: rs(24),
    borderRadius: rbr(12),
    backgroundColor: ResponsiveTheme.colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  emptySubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textTertiary,
    textAlign: "center",
  },
});
