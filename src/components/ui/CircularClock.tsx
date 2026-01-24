import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path, G, Text as SvgText, Rect } from "react-native-svg";
import { rf, rp, rw, rh } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

interface CircularClockProps {
  sleepTime: string; // Format: "HH:MM" (24-hour)
  wakeTime: string; // Format: "HH:MM" (24-hour)
  size?: number;
  style?: any;
}

export const CircularClock: React.FC<CircularClockProps> = ({
  sleepTime,
  wakeTime,
  size: rawSize = 200,
  style,
}) => {
  // Round all values to prevent precision errors on Android
  const size = Math.round(rawSize);
  const radius = Math.round(size / 2);
  const centerX = radius;
  const centerY = radius;
  const clockRadius = Math.round(radius - 35);
  const arcWidth = 16;

  // Convert time string to minutes from midnight - with NaN protection
  const timeToMinutes = (time: string): number => {
    if (!time || typeof time !== "string") return 0;
    const parts = time.split(":").map(Number);
    const hours = Number.isFinite(parts[0]) ? parts[0] : 0;
    const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;
    return hours * 60 + minutes;
  };

  // Convert minutes to angle (0 degrees = 12 o'clock)
  const minutesToAngle = (minutes: number): number => {
    return (minutes / (24 * 60)) * 360 - 90; // -90 to start from 12 o'clock
  };

  // Convert angle to SVG path coordinates - round to prevent precision errors
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
  ) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: Math.round(centerX + radius * Math.cos(angleInRadians)),
      y: Math.round(centerY + radius * Math.sin(angleInRadians)),
    };
  };

  // Create arc path for sleep duration
  const createArcPath = (
    startAngle: number,
    endAngle: number,
    radius: number,
  ) => {
    let adjustedEndAngle = endAngle;

    // Handle overnight sleep (crosses midnight)
    if (endAngle < startAngle) {
      adjustedEndAngle = endAngle + 360;
    }

    const start = polarToCartesian(centerX, centerY, radius, startAngle);
    const end = polarToCartesian(centerX, centerY, radius, adjustedEndAngle);

    const largeArcFlag = adjustedEndAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      1,
      end.x,
      end.y,
    ].join(" ");
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

  // Hour markers positioned outside the ring
  const hourMarkers = [
    { hour: 0, label: "12AM" },
    { hour: 6, label: "6AM" },
    { hour: 12, label: "12PM" },
    { hour: 18, label: "6PM" },
  ].map(({ hour, label }) => {
    const angle = minutesToAngle(hour * 60);
    const pos = polarToCartesian(centerX, centerY, clockRadius + 25, angle);
    return { hour, label, x: pos.x, y: pos.y };
  });

  // Format time for display (convert 24h to 12h with AM/PM)
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={clockRadius}
          fill={`${ResponsiveTheme.colors.surface}30`}
          stroke={ResponsiveTheme.colors.border}
          strokeWidth="1"
          opacity={0.5}
        />

        {/* Wake period (golden arc) - rest of the day */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={clockRadius}
          fill="transparent"
          stroke={`${ResponsiveTheme.colors.warning}50`}
          strokeWidth={arcWidth}
        />

        {/* Sleep period (purple arc) */}
        <Path
          d={sleepArcPath}
          fill="transparent"
          stroke={ResponsiveTheme.colors.primary}
          strokeWidth={arcWidth}
          strokeLinecap="round"
        />

        {/* Hour markers - positioned outside */}
        {hourMarkers.map(({ hour, label, x, y }) => (
          <SvgText
            key={hour}
            x={x}
            y={y}
            fontSize={rf(9)}
            fill={ResponsiveTheme.colors.textMuted}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontWeight="500"
          >
            {label}
          </SvgText>
        ))}

        {/* Center content */}
        <SvgText
          x={centerX}
          y={centerY - 6}
          fontSize={rf(20)}
          fontWeight="bold"
          fill={ResponsiveTheme.colors.text}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {sleepHours}h {sleepMins}m
        </SvgText>

        <SvgText
          x={centerX}
          y={centerY + 16}
          fontSize={rf(10)}
          fill={ResponsiveTheme.colors.textSecondary}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          Sleep Duration
        </SvgText>
      </Svg>

      {/* Legend - improved design */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: ResponsiveTheme.colors.primary },
            ]}
          />
          <View style={styles.legendTextContainer}>
            <Text style={styles.legendTime}>{formatTime(sleepTime)}</Text>
            <Text style={styles.legendLabel}>Bedtime</Text>
          </View>
        </View>
        <View style={styles.legendDivider} />
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: ResponsiveTheme.colors.warning },
            ]}
          />
          <View style={styles.legendTextContainer}>
            <Text style={styles.legendTime}>{formatTime(wakeTime)}</Text>
            <Text style={styles.legendLabel}>Wake up</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.lg,
    backgroundColor: `${ResponsiveTheme.colors.surface}30`,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },

  legendDot: {
    width: rw(10),
    height: rw(10),
    borderRadius: rw(5),
  },

  legendTextContainer: {
    alignItems: "flex-start",
  },

  legendTime: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  legendLabel: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
  },

  legendDivider: {
    width: 1,
    height: rh(30),
    backgroundColor: `${ResponsiveTheme.colors.border}50`,
    marginHorizontal: ResponsiveTheme.spacing.sm,
  },
});
