import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../utils/responsive";
import {
  colors,
  surface,
  border as borderTokens,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";

interface ProgressHeaderProps {
  navigation?: {
    goBack: () => void;
  };
  trackBStatus: { isConnected: boolean };
  onAddEntry: () => void;
  onShare: () => void;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = React.memo(({
  navigation,
  trackBStatus,
  onAddEntry,
  onShare,
}) => {
  return (
    <View style={styles.header}>
      {navigation && (
        <AnimatedPressable
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          scaleValue={0.97}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text.primary} />
        </AnimatedPressable>
      )}

      <Text style={styles.title}>Progress</Text>

      <View style={styles.headerButtons}>
        {trackBStatus.isConnected && (
          <View style={styles.iconButton} accessibilityLabel="Connected">
            <Ionicons name="checkmark-circle" size={rf(18)} color={colors.success.DEFAULT} />
          </View>
        )}

        <AnimatedPressable
          style={styles.addButton}
          onPress={onAddEntry}
          scaleValue={0.97}
          hapticFeedback={true}
          hapticType="light"
          accessibilityRole="button"
          accessibilityLabel="Add entry"
        >
          <Ionicons name="add" size={rf(20)} color={colors.text.primary} />
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.iconButton}
          onPress={onShare}
          scaleValue={0.97}
          hapticFeedback={true}
          hapticType="light"
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons name="share-outline" size={rf(19)} color={colors.text.primary} />
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.variants.pageTitle,
    color: colors.text.primary,
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ProgressHeader;
