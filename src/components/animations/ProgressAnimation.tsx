import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { THEME } from "../../utils/constants";

interface ProgressAnimationProps {
  progress: number; // 0-100
  type?: "linear" | "circular" | "ring";
  size?: "sm" | "md" | "lg";
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  label?: string;
  duration?: number;
  style?: any;
}

export const ProgressAnimation: React.FC<ProgressAnimationProps> = ({
  progress,
  type = "linear",
  size = "md",
  color = THEME.colors.primary,
  backgroundColor = THEME.colors.surface,
  showPercentage = true,
  label,
  duration = 1000,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  const getSizeValues = () => {
    switch (size) {
      case "sm":
        return { height: 6, circularSize: 60, strokeWidth: 4 };
      case "md":
        return { height: 8, circularSize: 80, strokeWidth: 6 };
      case "lg":
        return { height: 12, circularSize: 120, strokeWidth: 8 };
      default:
        return { height: 8, circularSize: 80, strokeWidth: 6 };
    }
  };

  const { height, circularSize, strokeWidth } = getSizeValues();

  useEffect(() => {
    // Animate to the new progress value
    Animated.timing(animatedValue, {
      toValue: progress,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Continuous rotation for circular progress
    if (type === "circular" || type === "ring") {
      const rotationAnimation = Animated.loop(
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotationAnimation.start();
      return () => rotationAnimation.stop();
    }
  }, [progress, duration, type, animatedValue, rotationValue]);

  const renderLinearProgress = () => {
    const progressWidth = animatedValue.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
      extrapolate: "clamp",
    });

    return (
      <View style={[styles.linearContainer, style]}>
        {label && <Text style={styles.label}>{label}</Text>}

        <View style={styles.progressRow}>
          <View style={[styles.linearTrack, { height, backgroundColor }]}>
            <Animated.View
              style={[
                styles.linearFill,
                {
                  height,
                  backgroundColor: color,
                  width: progressWidth,
                },
              ]}
            />
          </View>

          {showPercentage && (
            <Text style={[styles.percentageText, { color }]}>
              {Math.round(progress)}%
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderCircularProgress = () => {
    const radius = (circularSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const strokeDashoffset = animatedValue.interpolate({
      inputRange: [0, 100],
      outputRange: [circumference, 0],
      extrapolate: "clamp",
    });

    const rotation = rotationValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View
        style={[
          styles.circularContainer,
          { width: circularSize, height: circularSize },
          style,
        ]}
      >
        <Animated.View
          style={[
            styles.circularProgress,
            {
              width: circularSize,
              height: circularSize,
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          {/* Background Circle */}
          <View
            style={[
              styles.circularTrack,
              {
                width: circularSize,
                height: circularSize,
                borderRadius: circularSize / 2,
                borderWidth: strokeWidth,
                borderColor: backgroundColor,
              },
            ]}
          />

          {/* Progress Circle */}
          <Animated.View
            style={[
              styles.circularFill,
              {
                width: circularSize,
                height: circularSize,
                borderRadius: circularSize / 2,
                borderWidth: strokeWidth,
                borderColor: color,
                borderTopColor: "transparent",
                borderRightColor: "transparent",
                transform: [
                  { rotate: "-90deg" },
                  {
                    rotateZ: animatedValue.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0deg", "360deg"],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>

        {/* Center Content */}
        <View style={styles.circularCenter}>
          {showPercentage && (
            <Animated.Text style={[styles.circularPercentage, { color }]}>
              {Math.round(progress)}%
            </Animated.Text>
          )}
          {label && (
            <Text
              style={[
                styles.circularLabel,
                { color: THEME.colors.textSecondary },
              ]}
            >
              {label}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderRingProgress = () => {
    const radius = (circularSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
      <View
        style={[
          styles.ringContainer,
          { width: circularSize, height: circularSize },
          style,
        ]}
      >
        {/* Multiple rings for visual effect */}
        {[0.6, 0.8, 1].map((multiplier, index) => {
          const ringSize = circularSize * multiplier;
          const ringRadius = (ringSize - strokeWidth) / 2;
          const ringCircumference = 2 * Math.PI * ringRadius;

          const strokeDashoffset = animatedValue.interpolate({
            inputRange: [0, 100],
            outputRange: [
              ringCircumference,
              ringCircumference * (1 - progress / 100),
            ],
            extrapolate: "clamp",
          });

          return (
            <View
              key={index}
              style={[
                styles.ring,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  borderWidth: strokeWidth / (index + 1),
                  borderColor: backgroundColor,
                  position: "absolute",
                  top: (circularSize - ringSize) / 2,
                  left: (circularSize - ringSize) / 2,
                },
              ]}
            />
          );
        })}

        {/* Center Content */}
        <View style={styles.ringCenter}>
          {showPercentage && (
            <Text style={[styles.ringPercentage, { color }]}>
              {Math.round(progress)}%
            </Text>
          )}
          {label && (
            <Text
              style={[styles.ringLabel, { color: THEME.colors.textSecondary }]}
            >
              {label}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderProgress = () => {
    switch (type) {
      case "linear":
        return renderLinearProgress();
      case "circular":
        return renderCircularProgress();
      case "ring":
        return renderRingProgress();
      default:
        return renderLinearProgress();
    }
  };

  return renderProgress();
};

const styles = StyleSheet.create({
  linearContainer: {
    width: "100%",
  },

  label: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.sm,
  },

  linearTrack: {
    flex: 1,
    borderRadius: THEME.borderRadius.sm,
    overflow: "hidden",
  },

  linearFill: {
    borderRadius: THEME.borderRadius.sm,
  },

  percentageText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    minWidth: 40,
    textAlign: "right",
  },

  circularContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  circularProgress: {
    position: "absolute",
  },

  circularTrack: {
    position: "absolute",
  },

  circularFill: {
    position: "absolute",
  },

  circularCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  circularPercentage: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
  },

  circularLabel: {
    fontSize: THEME.fontSize.xs,
    marginTop: THEME.spacing.xs / 2,
  },

  ringContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  ring: {
    borderStyle: "solid",
  },

  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  ringPercentage: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
  },

  ringLabel: {
    fontSize: THEME.fontSize.xs,
    marginTop: THEME.spacing.xs / 2,
  },
});
