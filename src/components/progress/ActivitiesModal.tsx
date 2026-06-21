import React from "react";
import { View, Text, StyleSheet, Modal, FlatList, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";

interface ActivitiesModalProps {
  visible: boolean;
  onClose: () => void;
  activities: any[];
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
}

export const ActivitiesModal: React.FC<ActivitiesModalProps> = ({
  visible,
  onClose,
  activities,
  onLoadMore,
  loadingMore,
  hasMore,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      {...(Platform.OS === 'ios' ? { presentationStyle: 'pageSheet' as const } : {})}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>All Activities</Text>
        <AnimatedPressable
          onPress={onClose}
          style={styles.modalCloseButton}
          scaleValue={0.95}
          accessibilityRole="button"
          accessibilityLabel="Close activities"
        >
            <Ionicons
              name="close"
              size={rf(20)}
              color={colors.textSecondary}
            />
          </AnimatedPressable>
        </View>

        <FlatList
          data={activities}
          keyExtractor={(item, index) => item?.id?.toString() || String(index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalContent}
          renderItem={({ item: activity }) => {
            // Ensure activity name is a string
            let activityName = activity.name;
            if (Array.isArray(activityName)) {
              activityName = activityName.join(", ");
            } else if (typeof activityName !== "string") {
              activityName = String(activityName || "Unknown Activity");
            }

            return (
              <GlassCard
                style={styles.modalActivityCard}
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
          }}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={() =>
            loadingMore ? (
              <View style={styles.loadingFooter}>
                <AuroraSpinner size="sm" theme="primary" />
                <Text style={styles.loadingText}>
                  Loading more activities...
                </Text>
              </View>
            ) : !hasMore && activities.length > 0 ? (
              <View style={styles.endFooter}>
                <Text style={styles.endText}>You've reached the end!</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyModalContainer}>
              <Text style={styles.emptyModalText}>No activities found</Text>
              <Text style={styles.emptyModalSubtext}>
                Complete workouts and meals to see them here
              </Text>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  modalCloseButton: {
    width: Math.max(rw(32), 44),
    height: Math.max(rh(32), 44),
    borderRadius: Math.max(rs(16), 22),
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalActivityCard: {
    marginBottom: spacing.md,
  },
  activityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: rw(40),
    height: rh(40),
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
    width: rw(24),
    height: rh(24),
    borderRadius: rs(12),
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  endFooter: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  endText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  emptyModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyModalText: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyModalSubtext: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
