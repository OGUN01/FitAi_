import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, surface, border, borderRadius } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw } from "../../utils/responsive";

interface HowItWorksCardProps {
  platformName: string;
}

export const HowItWorksCard: React.FC<HowItWorksCardProps> = ({
  platformName,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>How It Works</Text>
      <View style={styles.step}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>1</Text>
        </View>
        <Text style={styles.stepText}>
          Your smartwatch syncs data to {platformName}
        </Text>
      </View>
      <View style={styles.step}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>2</Text>
        </View>
        <Text style={styles.stepText}>
          FitAI reads your steps, heart rate, and workouts
        </Text>
      </View>
      <View style={styles.step}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>3</Text>
        </View>
        <Text style={styles.stepText}>
          Your progress updates automatically in the app
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.card,
  },
  title: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: rw(28),
    height: rw(28),
    borderRadius: rbr(14),
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  stepNumberText: {
    fontSize: rf(14),
    fontWeight: "700",
    // Near-black on the orange (colors.primary) badge background — white
    // text here was ~2.9:1, failing WCAG AA (needs 3:1 minimum for this size).
    color: colors.background,
  },
  stepText: {
    flex: 1,
    fontSize: rf(14),
    color: colors.textSecondary,
  },
});
