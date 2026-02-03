import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";

interface DietScreenHeaderProps {
  isGeneratingPlan: boolean;
  isGeneratingMeal: boolean;
  onGenerateWeeklyPlan: () => void;
  onGenerateDailyPlan: () => void;
  handleSearchFood: () => void;
  trackBStatus: { isConnected: boolean };
}

export const DietScreenHeader: React.FC<DietScreenHeaderProps> = ({
  isGeneratingPlan,
  isGeneratingMeal,
  onGenerateWeeklyPlan,
  onGenerateDailyPlan,
  handleSearchFood,
  trackBStatus,
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Nutrition Plan</Text>
      <View style={styles.dateSelector}>
        <AnimatedPressable
          style={styles.dateNavButton}
          onPress={() => Alert.alert("Prev", "Previoud Day")}
          scaleValue={0.9}
        >
          <Text style={styles.dateNavIcon}>‹</Text>
        </AnimatedPressable>
        <GlassCard
          elevation={1}
          blurIntensity="light"
          padding="sm"
          borderRadius="lg"
          style={styles.dateBadge}
        >
          <Text style={styles.dateText}>Today</Text>
          <Text style={styles.dateSubtext}>
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </GlassCard>
        <AnimatedPressable
          style={styles.dateNavButton}
          onPress={() => Alert.alert("Next", "Next Day")}
          scaleValue={0.9}
        >
          <Text style={styles.dateNavIcon}>›</Text>
        </AnimatedPressable>
      </View>
      <View style={styles.headerButtons}>
        <View style={styles.statusButton}>
          <Ionicons
            name={
              trackBStatus.isConnected ? "checkmark-circle" : "close-circle"
            }
            size={rf(16)}
            color={trackBStatus.isConnected ? "#10b981" : "#ef4444"}
          />
        </View>
        <AnimatedPressable
          style={
            [
              styles.aiButton,
              isGeneratingPlan ? styles.aiButtonDisabled : undefined,
            ] as any
          }
          onPress={onGenerateWeeklyPlan}
          disabled={isGeneratingPlan}
          scaleValue={0.95}
        >
          {isGeneratingPlan ? (
            <AuroraSpinner size="sm" theme="white" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="restaurant-outline"
                size={rf(12)}
                color={ResponsiveTheme.colors.white}
              />
              <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>Week</Text>
            </View>
          )}
        </AnimatedPressable>
        <AnimatedPressable
          style={
            [
              styles.aiButton,
              isGeneratingPlan ? styles.aiButtonDisabled : undefined,
            ] as any
          }
          onPress={onGenerateDailyPlan}
          disabled={isGeneratingMeal}
          scaleValue={0.95}
        >
          {isGeneratingMeal ? (
            <AuroraSpinner size="sm" theme="white" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="sparkles-outline"
                size={rf(12)}
                color={ResponsiveTheme.colors.white}
              />
              <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>Day</Text>
            </View>
          )}
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.addButton}
          onPress={handleSearchFood}
          scaleValue={0.95}
        >
          <Ionicons
            name="sparkles-outline"
            size={rf(20)}
            color={ResponsiveTheme.colors.white}
          />
        </AnimatedPressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
  },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: rp(12) },
  aiButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(12),
    paddingVertical: rp(8),
    borderRadius: rs(20),
    minWidth: rw(70),
    alignItems: "center",
  },
  aiButtonDisabled: { backgroundColor: ResponsiveTheme.colors.textMuted },
  aiButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(12),
    fontWeight: "600",
  },
  addButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },
  dateNavButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  dateNavIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.text,
    fontWeight: "bold",
  },
  dateBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    alignItems: "center",
  },
  dateText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  dateSubtext: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  statusButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
});
