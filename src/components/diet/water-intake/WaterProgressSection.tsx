import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp } from "../../../utils/responsive";

interface WaterProgressSectionProps {
  currentLiters: number;
  goalLiters: number;
  progress: number;
  isGoalReached: boolean;
}

export const WaterProgressSection: React.FC<WaterProgressSectionProps> = ({
  currentLiters,
  goalLiters,
  progress,
  isGoalReached,
}) => {
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressInfo}>
        <Text style={styles.progressLabel}>Today's Progress</Text>
        <Text style={styles.progressValue}>
          {currentLiters.toFixed(1)}L / {goalLiters.toFixed(1)}L
        </Text>
      </View>
      <View style={styles.progressBar}>
        <LinearGradient
          colors={
            isGoalReached
              ? ["#10b981", "#059669"]
              : [ResponsiveTheme.colors.primary, "#8B5CF6"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress}%` }]}
        />
      </View>
      {isGoalReached && (
        <View style={styles.goalReachedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.goalReachedText}>Daily goal achieved!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  progressSection: {
    marginBottom: rp(24),
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(8),
  },
  progressLabel: {
    fontSize: rf(14),
    color: "rgba(255,255,255,0.7)",
  },
  progressValue: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#fff",
  },
  progressBar: {
    height: rp(8),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: rp(4),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rp(4),
  },
  goalReachedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    marginTop: rp(8),
  },
  goalReachedText: {
    fontSize: rf(13),
    color: "#10b981",
    fontWeight: "500",
  },
});
