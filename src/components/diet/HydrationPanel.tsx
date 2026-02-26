import React, { useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { WaterIntakeModal } from "./WaterIntakeModal";

interface HydrationPanelProps {
  waterConsumedLiters: number;
  waterGoalLiters: number;
  handleAddWater: () => void;
  waterIntakeML: number;
  waterGoalML: number;
  showWaterIntakeModal: boolean;
  setShowWaterIntakeModal: (show: boolean) => void;
  hydrationAddWater: (amount: number) => Promise<void> | void;
}

export const HydrationPanel: React.FC<HydrationPanelProps> = ({
  waterConsumedLiters,
  waterGoalLiters,
  handleAddWater,
  waterIntakeML,
  waterGoalML,
  showWaterIntakeModal,
  setShowWaterIntakeModal,
  hydrationAddWater,
}) => {
  const waterButton1Ripple = useRef(new Animated.Value(0)).current;
  const waterButton2Ripple = useRef(new Animated.Value(0)).current;

  const triggerRipple = (rippleAnim: Animated.Value) => {
    rippleAnim.setValue(0);
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.section}>
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>Hydration</Text>
        <View style={styles.waterTrackerContainer}>
          <Text style={styles.waterAmountConsumed}>
            {waterConsumedLiters.toFixed(2)}L
          </Text>
          <Text style={styles.waterTargetAmount}>
            of {waterGoalLiters?.toFixed(2)}L goal
          </Text>
          <View style={styles.waterQuickAddButtons}>
            <AnimatedPressable
              onPress={() => {
                triggerRipple(waterButton1Ripple);
                hydrationAddWater(250);
              }}
              style={styles.waterQuickAddButton}
            >
              <Text style={styles.waterQuickAddButtonText}>+250ml</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => {
                triggerRipple(waterButton2Ripple);
                hydrationAddWater(500);
              }}
              style={styles.waterQuickAddButton}
            >
              <Text style={styles.waterQuickAddButtonText}>+500ml</Text>
            </AnimatedPressable>
          </View>
        </View>
      </GlassCard>

      <WaterIntakeModal
        visible={showWaterIntakeModal}
        onClose={() => setShowWaterIntakeModal(false)}
        onAddWater={hydrationAddWater}
        currentIntakeML={waterIntakeML}
        goalML={waterGoalML || 2500}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  waterTrackerContainer: { marginTop: ResponsiveTheme.spacing.md },
  waterAmountConsumed: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  waterTargetAmount: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  waterQuickAddButtons: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  waterQuickAddButton: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  waterQuickAddButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
  },
});
