import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";

interface HowItWorksCardProps {
  platformName: string;
}

export const HowItWorksCard: React.FC<HowItWorksCardProps> = ({
  platformName,
}) => {
  return (
    <GlassCard elevation={1} style={styles.card}>
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
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  title: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  stepNumber: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  stepNumberText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#fff",
  },
  stepText: {
    flex: 1,
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
  },
});
