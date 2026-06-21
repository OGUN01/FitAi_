import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rs, rbr } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
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
                    color={colors.primary}
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
                    color={colors.white}
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
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  activityCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  activityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: rs(40),
    height: rs(40),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: rp(2),
  },
  activityDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
  activityDate: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  activityBadge: {
    width: rs(24),
    height: rs(24),
    borderRadius: rbr(12),
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
