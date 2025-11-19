import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { rf, rp } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

interface CircularClockProps {
  sleepTime: string; // Format: "HH:MM" (24-hour)
  wakeTime: string; // Format: "HH:MM" (24-hour)
  size?: number;
  style?: any;
}

export const CircularClock: React.FC<CircularClockProps> = ({
  sleepTime,
  wakeTime,
  size = 200,
  style,
}) => {
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;
  const clockRadius = radius - 30;

  // Convert time string to minutes from midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to angle (0 degrees = 12 o'clock)
  const minutesToAngle = (minutes: number): number => {
    return (minutes / (24 * 60)) * 360 - 90; // -90 to start from 12 o'clock
  };

  // Convert angle to SVG path coordinates
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Create arc path for sleep duration
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    let adjustedEndAngle = endAngle;

    // Handle overnight sleep (crosses midnight)
    if (endAngle < startAngle) {
      adjustedEndAngle = endAngle + 360;
    }

    const start = polarToCartesian(centerX, centerY, radius, startAngle);
    const end = polarToCartesian(centerX, centerY, radius, adjustedEndAngle);

    const largeArcFlag = adjustedEndAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y,
    ].join(' ');
  };

  const sleepMinutes = timeToMinutes(sleepTime);
  const wakeMinutes = timeToMinutes(wakeTime);

  const sleepAngle = minutesToAngle(sleepMinutes);
  const wakeAngle = minutesToAngle(wakeMinutes);

  const sleepArcPath = createArcPath(sleepAngle, wakeAngle, clockRadius);

  // Calculate sleep duration in hours
  let sleepDuration = wakeMinutes - sleepMinutes;
  if (sleepDuration < 0) {
    sleepDuration += 24 * 60; // Add 24 hours if crossing midnight
  }
  const sleepHours = Math.floor(sleepDuration / 60);
  const sleepMins = sleepDuration % 60;

  // Hour markers (24-hour clock)
  const hourMarkers = [0, 6, 12, 18].map((hour) => {
    const angle = minutesToAngle(hour * 60);
    const pos = polarToCartesian(centerX, centerY, clockRadius + 15, angle);
    return { hour, x: pos.x, y: pos.y };
  });

  // Format time for display (convert 24h to 12h with AM/PM)
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size}>
        {/* Clock circle background */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={clockRadius}
          fill="transparent"
          stroke={ResponsiveTheme.colors.border}
          strokeWidth="2"
        />

        {/* Wake period (light arc) - rest of the day */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={clockRadius}
          fill="transparent"
          stroke={`${ResponsiveTheme.colors.warning}40`}
          strokeWidth="20"
        />

        {/* Sleep period (dark arc) */}
        <Path
          d={sleepArcPath}
          fill="transparent"
          stroke={ResponsiveTheme.colors.primary}
          strokeWidth="20"
          strokeLinecap="round"
        />

        {/* Hour markers */}
        {hourMarkers.map(({ hour, x, y }) => (
          <SvgText
            key={hour}
            x={x}
            y={y}
            fontSize={rf(12)}
            fill={ResponsiveTheme.colors.textMuted}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {hour}
          </SvgText>
        ))}

        {/* Center text - sleep duration */}
        <SvgText
          x={centerX}
          y={centerY - 10}
          fontSize={rf(24)}
          fontWeight="bold"
          fill={ResponsiveTheme.colors.text}
          textAnchor="middle"
        >
          {sleepHours}h {sleepMins}m
        </SvgText>

        <SvgText
          x={centerX}
          y={centerY + 15}
          fontSize={rf(12)}
          fill={ResponsiveTheme.colors.textSecondary}
          textAnchor="middle"
        >
          Sleep Duration
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: ResponsiveTheme.colors.primary }]} />
          <Text style={styles.legendText}>😴 {formatTime(sleepTime)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: ResponsiveTheme.colors.warning }]} />
          <Text style={styles.legendText}>☀️ {formatTime(wakeTime)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.md,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },

  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  legendText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
