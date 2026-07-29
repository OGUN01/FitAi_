import React from "react";
import { View, Text, StyleSheet, Modal, FlatList, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import {
  colors,
  surface,
  border as borderTokens,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
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
              color={colors.text.secondary}
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
              <View style={styles.modalActivityCard}>
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
    backgroundColor: colors.background.DEFAULT,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: borderTokens.subtle,
  },
  modalTitle: {
    ...typography.variants.sectionTitle,
    fontFamily: "Manrope_700Bold",
    color: colors.text.primary,
  },
  modalCloseButton: {
    width: Math.max(rw(32), 44),
    height: Math.max(rh(32), 44),
    borderRadius: Math.max(rs(16), 22),
    backgroundColor: surface[2],
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalActivityCard: {
    marginBottom: spacing.md,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    padding: spacing.md,
  },
  activityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: rw(40),
    height: rh(40),
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
    width: rw(24),
    height: rh(24),
    borderRadius: rs(12),
    backgroundColor: colors.success.DEFAULT,
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
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  endFooter: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  endText: {
    ...typography.variants.caption2,
    color: colors.text.tertiary,
    fontStyle: "italic",
  },
  emptyModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyModalText: {
    ...typography.variants.cardHeadline,
    fontFamily: "Manrope_500Medium",
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  emptyModalSubtext: {
    ...typography.variants.caption2,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
