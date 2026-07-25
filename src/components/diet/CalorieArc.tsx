import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { flatColors as colors } from '../../theme/aurora-tokens';

export interface CalorieArcProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export const CalorieArc: React.FC<CalorieArcProps> = ({
  consumed,
  target,
  size = 158,
  strokeWidth = 12,
  children,
}) => {
  const ratio = target > 0 ? Math.min(1, Math.max(0, consumed / target)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const visibleLength = circumference * 0.75;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: target, now: consumed }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.backgroundTertiary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${visibleLength} ${circumference}`}
          rotation="135"
          origin={`${size / 2}, ${size / 2}`}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={consumed > target && target > 0 ? colors.error : colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${visibleLength * ratio} ${circumference}`}
          rotation="135"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View pointerEvents="none" style={styles.center}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
