import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ProgressBarProps {
  progressAnimation: Animated.Value;
  percentage: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progressAnimation,
  percentage,
}) => {
  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={["#E55A2B", "#7C3AED", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressGradient}
          />
        </Animated.View>
      </View>
      <Text style={styles.progressText}>{percentage}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressBarContainer: {
    marginBottom: 30,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "rgba(75, 85, 99, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 10,
  },
});
