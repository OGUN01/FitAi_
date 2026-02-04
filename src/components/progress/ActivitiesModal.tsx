import React from "react";
import { View, Text, StyleSheet, Modal, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>All Activities</Text>
          <AnimatedPressable
            onPress={onClose}
            style={styles.modalCloseButton}
            scaleValue={0.95}
          >
            <Ionicons
              name="close"
              size={rf(20)}
              color={ResponsiveTheme.colors.textSecondary}
            />
          </AnimatedPressable>
        </View>

        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
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
    backgroundColor: ResponsiveTheme.colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },
  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  modalCloseButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: rs(16),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: ResponsiveTheme.spacing.lg,
  },
  modalActivityCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  activityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: rw(40),
    height: rh(40),
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
    width: rw(24),
    height: rh(24),
    borderRadius: rs(12),
    backgroundColor: ResponsiveTheme.colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.lg,
  },
  loadingText: {
    marginLeft: ResponsiveTheme.spacing.sm,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
  endFooter: {
    paddingVertical: ResponsiveTheme.spacing.lg,
    alignItems: "center",
  },
  endText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textTertiary,
    fontStyle: "italic",
  },
  emptyModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xxl,
  },
  emptyModalText: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptyModalSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textTertiary,
    textAlign: "center",
  },
});
