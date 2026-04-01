import React, { useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { WaterIntakeModal } from "./WaterIntakeModal";

interface HydrationPanelProps {
  waterConsumedLiters: number;
  waterGoalLiters: number;
  waterIntakeML: number;
  waterGoalML: number;
  showWaterIntakeModal: boolean;
  setShowWaterIntakeModal: (show: boolean) => void;
  hydrationAddWater: (amount: number) => Promise<void> | void;
}

export const HydrationPanel: React.FC<HydrationPanelProps> = ({
  waterConsumedLiters,
  waterGoalLiters,
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

  const effectiveGoalML = waterGoalML ?? 0;
  const effectiveGoalLiters = waterGoalLiters ?? 0;

  const waterProgress =
    effectiveGoalLiters > 0
      ? Math.min(waterConsumedLiters / effectiveGoalLiters, 1)
      : 0;

  const animatedProgressWidth = useRef(
    new Animated.Value(waterProgress),
  ).current;

  React.useEffect(() => {
    Animated.timing(animatedProgressWidth, {
      toValue: waterProgress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [waterProgress]);

  const progressWidth = animatedProgressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const isGoalReached = waterIntakeML >= effectiveGoalML;

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
          <View style={styles.amountRow}>
            <Text style={styles.waterAmountConsumed}>
              {waterConsumedLiters.toFixed(2)}L
            </Text>
            <Text style={styles.waterTargetAmount}>
              of {effectiveGoalLiters.toFixed(2)}L goal
            </Text>
            {isGoalReached && (
              <Text style={styles.goalReachedBadge}>✓ Goal reached!</Text>
            )}
          </View>

          {/* Animated progress bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressWidth,
                  backgroundColor: isGoalReached
                    ? ResponsiveTheme.colors.success
                    : ResponsiveTheme.colors.primary,
                },
              ]}
            />
          </View>

          <View style={styles.waterQuickAddButtons}>
            {/* +250ml button with ripple */}
            <AnimatedPressable
              onPress={() => {
                triggerRipple(waterButton1Ripple);
                hydrationAddWater(250);
              }}
              style={styles.waterQuickAddButton}
            >
              <Text style={styles.waterQuickAddButtonText}>+250ml</Text>
              <Animated.View
                style={[
                  styles.rippleOverlay,
                  {
                    opacity: waterButton1Ripple.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.4, 0],
                    }),
                    transform: [
                      {
                        scale: waterButton1Ripple.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.1, 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </AnimatedPressable>

            {/* +500ml button with ripple */}
            <AnimatedPressable
              onPress={() => {
                triggerRipple(waterButton2Ripple);
                hydrationAddWater(500);
              }}
              style={styles.waterQuickAddButton}
            >
              <Text style={styles.waterQuickAddButtonText}>+500ml</Text>
              <Animated.View
                style={[
                  styles.rippleOverlay,
                  {
                    opacity: waterButton2Ripple.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.4, 0],
                    }),
                    transform: [
                      {
                        scale: waterButton2Ripple.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.1, 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </AnimatedPressable>

            {/* Custom amount button */}
            <AnimatedPressable
              onPress={() => setShowWaterIntakeModal(true)}
              style={[styles.waterQuickAddButton, styles.waterCustomButton]}
            >
              <Text
                style={[
                  styles.waterQuickAddButtonText,
                  styles.waterCustomButtonText,
                ]}
              >
                Custom
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </GlassCard>

      <WaterIntakeModal
        visible={showWaterIntakeModal}
        onClose={() => setShowWaterIntakeModal(false)}
        onAddWater={hydrationAddWater}
        currentIntakeML={waterIntakeML}
        goalML={effectiveGoalML}
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
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  waterAmountConsumed: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  waterTargetAmount: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },
  goalReachedBadge: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "700",
    color: ResponsiveTheme.colors.success,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: ResponsiveTheme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    minWidth: 4,
  },
  waterQuickAddButtons: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },
  waterQuickAddButton: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.sm,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  waterCustomButton: {
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.primary}35`,
  },
  waterQuickAddButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: "600",
  },
  waterCustomButtonText: {
    color: ResponsiveTheme.colors.primary,
  },
  rippleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: 999,
    opacity: 0,
  },
});
