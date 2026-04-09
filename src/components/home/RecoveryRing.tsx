import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp } from "../../utils/responsive";
import { getRecoveryColor } from "../../utils/healthUtils";

interface RecoveryRingProps {
  score: number;
  size: number;
}

export const RecoveryRing: React.FC<RecoveryRingProps> = ({ score, size }) => {
  const { color, gradient } = getRecoveryColor(score);
  const strokeWidth = rw(8);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="recoveryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradient[0]} />
            <Stop offset="100%" stopColor={gradient[1]} />
          </LinearGradient>
        </Defs>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ResponsiveTheme.colors.glassHighlight}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#recoveryGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringScore, { color }]}>{score}</Text>
        <Text style={styles.ringLabel}>Recovery</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ringContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
  },
  ringScore: {
    fontSize: rf(28),
    fontWeight: "800",
  },
  ringLabel: {
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(-2),
  },
});
