import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";

interface ProgressHeaderProps {
  navigation?: {
    goBack: () => void;
  };
  trackBStatus: { isConnected: boolean };
  showAnalytics: boolean;
  setShowAnalytics: (show: boolean) => void;
  onAddEntry: () => void;
  onShare: () => void;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = React.memo(({
  navigation,
  trackBStatus,
  showAnalytics,
  setShowAnalytics,
  onAddEntry,
  onShare,
}) => {
  return (
    <View style={styles.header}>
      {/* Back button */}
      {navigation && (
        <AnimatedPressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          scaleValue={0.95}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons
            name="arrow-back"
            size={rf(20)}
            color={colors.text}
          />
        </AnimatedPressable>
      )}
      <Text style={styles.title}>Progress</Text>
      <View style={styles.headerButtons}>
        {/* Track B Status Indicator - Only show when connected */}
        {trackBStatus.isConnected && (
          <View style={styles.statusButton}>
            <Ionicons
              name="checkmark-circle"
              size={rf(16)}
              color={colors.success}
            />
          </View>
        )}
        <AnimatedPressable
          style={styles.addButton}
          onPress={onAddEntry}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="medium"
          accessibilityRole="button"
          accessibilityLabel="Add entry"
        >
          <Ionicons
            name="add"
            size={rf(16)}
            color={colors.white}
          />
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.shareButton}
          onPress={onShare}
          scaleValue={0.95}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons
            name="share-outline"
            size={rf(20)}
            color={colors.text}
          />
        </AnimatedPressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  backButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rh(40), 44),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(12),
  },
  statusButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  analyticsButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  analyticsButtonActive: {
    backgroundColor: colors.primary,
  },
  addButton: {
    width: Math.max(rs(36), 44),
    height: Math.max(rs(36), 44),
    borderRadius: Math.max(rs(18), 22),
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  shareButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rh(40), 44),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
});
