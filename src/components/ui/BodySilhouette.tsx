import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { rf, rp } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

interface MeasurementPoint {
  id: string;
  label: string;
  value?: string;
  x: number;
  y: number;
  side: 'left' | 'right';
}

interface BodySilhouetteProps {
  gender?: 'male' | 'female';
  measurements?: {
    height?: string;
    chest?: string;
    waist?: string;
    hips?: string;
  };
  showAnimations?: boolean;
  size?: number;
  style?: any;
}

export const BodySilhouette: React.FC<BodySilhouetteProps> = ({
  gender = 'male',
  measurements,
  showAnimations = true,
  size = 300,
  style,
}) => {
  const height = size;
  const width = size * 0.6;

  // Measurement points (positioned relative to silhouette)
  const measurementPoints: MeasurementPoint[] = [
    {
      id: 'height',
      label: 'Height',
      value: measurements?.height,
      x: width + 20,
      y: height / 2,
      side: 'right',
    },
    {
      id: 'chest',
      label: 'Chest',
      value: measurements?.chest,
      x: -20,
      y: height * 0.35,
      side: 'left',
    },
    {
      id: 'waist',
      label: 'Waist',
      value: measurements?.waist,
      x: width + 20,
      y: height * 0.5,
      side: 'right',
    },
    {
      id: 'hips',
      label: 'Hips',
      value: measurements?.hips,
      x: -20,
      y: height * 0.55,
      side: 'left',
    },
  ];

  // Simple body silhouette path (front view)
  const createBodyPath = (): string => {
    const centerX = width / 2;
    const headRadius = width * 0.12;
    const shoulderWidth = width * 0.4;
    const waistWidth = width * 0.28;
    const hipWidth = gender === 'female' ? width * 0.35 : width * 0.32;

    // Head (circle represented as path)
    const headTop = headRadius + 10;
    const neckY = headTop + headRadius + 5;

    // Body proportions
    const shoulderY = neckY + 10;
    const chestY = shoulderY + height * 0.15;
    const waistY = chestY + height * 0.15;
    const hipY = waistY + height * 0.08;
    const legEndY = height - 10;

    return `
      M ${centerX - shoulderWidth / 2} ${shoulderY}
      L ${centerX - shoulderWidth / 2} ${chestY}
      Q ${centerX - waistWidth / 2} ${waistY}, ${centerX - hipWidth / 2} ${hipY}
      L ${centerX - hipWidth / 3} ${legEndY}
      L ${centerX - hipWidth / 6} ${legEndY}
      L ${centerX} ${hipY}
      L ${centerX + hipWidth / 6} ${legEndY}
      L ${centerX + hipWidth / 3} ${legEndY}
      L ${centerX + hipWidth / 2} ${hipY}
      Q ${centerX + waistWidth / 2} ${waistY}, ${centerX + shoulderWidth / 2} ${chestY}
      L ${centerX + shoulderWidth / 2} ${shoulderY}
      Z
    `.trim();
  };

  const bodyPath = createBodyPath();

  return (
    <View style={[styles.container, style]}>
      <Svg width={width + 120} height={height}>
        {/* Body silhouette */}
        <G transform={`translate(60, 0)`}>
          {/* Head */}
          <Circle
            cx={width / 2}
            cy={width * 0.12 + 10}
            r={width * 0.12}
            fill={`${ResponsiveTheme.colors.primary}20`}
            stroke={ResponsiveTheme.colors.primary}
            strokeWidth="2"
          />

          {/* Body */}
          <Path
            d={bodyPath}
            fill={`${ResponsiveTheme.colors.primary}15`}
            stroke={ResponsiveTheme.colors.primary}
            strokeWidth="2"
          />

          {/* Measurement points and lines */}
          {measurementPoints.map((point, index) => {
            const silhouetteX = point.id === 'height' || point.id === 'waist'
              ? width / 2
              : point.id === 'chest'
              ? width * 0.7
              : width * 0.65;

            const lineEndX = point.side === 'left' ? point.x + 60 : point.x;

            return (
              <G key={point.id}>
                {/* Measurement line */}
                <Line
                  x1={silhouetteX}
                  y1={point.y}
                  x2={lineEndX}
                  y2={point.y}
                  stroke={ResponsiveTheme.colors.secondary}
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />

                {/* Pulsing point indicator */}
                <PulsingPoint
                  cx={silhouetteX}
                  cy={point.y}
                  delay={index * 200}
                  showAnimation={showAnimations}
                />

                {/* Label and value */}
                <SvgText
                  x={point.side === 'left' ? point.x + 10 : point.x + 70}
                  y={point.y - 8}
                  fontSize={rf(11)}
                  fontWeight="600"
                  fill={ResponsiveTheme.colors.text}
                  textAnchor={point.side === 'left' ? 'start' : 'start'}
                >
                  {point.label}
                </SvgText>

                {point.value && (
                  <SvgText
                    x={point.side === 'left' ? point.x + 10 : point.x + 70}
                    y={point.y + 8}
                    fontSize={rf(12)}
                    fontWeight="bold"
                    fill={ResponsiveTheme.colors.primary}
                    textAnchor={point.side === 'left' ? 'start' : 'start'}
                  >
                    {point.value}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          💡 Tap measurement points to update values
        </Text>
      </View>
    </View>
  );
};

// Pulsing point component
const PulsingPoint: React.FC<{
  cx: number;
  cy: number;
  delay: number;
  showAnimation: boolean;
}> = ({ cx, cy, delay, showAnimation }) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (showAnimation) {
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.3, { duration: 600 }),
            withTiming(1, { duration: 600 })
          ),
          -1,
          true
        )
      );
    }
  }, [showAnimation, delay]);

  return (
    <>
      {/* Outer pulse ring */}
      <Circle
        cx={cx}
        cy={cy}
        r="8"
        fill="transparent"
        stroke={ResponsiveTheme.colors.secondary}
        strokeWidth="2"
        opacity="0.3"
      />

      {/* Inner point */}
      <Circle
        cx={cx}
        cy={cy}
        r="4"
        fill={ResponsiveTheme.colors.secondary}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },

  legend: {
    marginTop: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.sm,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  legendText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
});
