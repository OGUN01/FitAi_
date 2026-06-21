import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { rf, rp, rbr } from "../../../utils/responsive";
import { flatColors as colors } from "../../../theme/aurora-tokens";

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
            colors={[
              colors.primaryDark,
              colors.secondary,
              colors.pink,
            ]}
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
    marginBottom: rp(30),
  },
  progressBarBackground: {
    height: rp(8),
    backgroundColor: colors.glassBorder,
    borderRadius: rbr(4),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: rbr(4),
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    fontSize: rf(18),
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    marginTop: rp(10),
  },
});
