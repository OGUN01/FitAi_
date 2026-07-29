import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rs, rbr } from "../../utils/responsive";
import {
  colors,
  surface,
  border as borderTokens,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
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
            <View key={activity.id} style={styles.activityCard}>
              <View style={styles.activityContent}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={
                      activity.type === "workout"
                        ? "barbell-outline"
                        : "restaurant-outline"
                    }
                    size={rf(20)}
                    color={colors.primary.DEFAULT}
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
                    color={colors.text.primary}
                  />
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recent activities yet</Text>
          <Text style={styles.emptySubtext}>
            Complete workouts and meals to see them here
          </Text>
        </View>
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
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
  },
  viewAllText: {
    ...typography.variants.caption2,
    fontFamily: "Manrope_500Medium",
    color: colors.primary.DEFAULT,
  },
  activityCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  activityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: rs(40),
    height: rs(40),
    borderRadius: borderRadius.lg,
    backgroundColor: surface[2],
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    marginBottom: rp(2),
  },
  activityDetails: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginBottom: rp(2),
  },
  activityDate: {
    ...typography.variants.caption,
    color: colors.text.tertiary,
  },
  activityBadge: {
    width: rs(24),
    height: rs(24),
    borderRadius: rbr(12),
    backgroundColor: colors.success.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  emptyText: {
    ...typography.variants.cardHeadline,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.variants.caption2,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
