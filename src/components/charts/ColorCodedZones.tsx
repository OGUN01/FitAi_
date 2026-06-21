import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { rp } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";

interface HeartRateZone {
  zone: number;
  name: string;
  range: string;
  color: string;
  percentage: number; // Time spent in this zone (0-100)
  bpm: string; // Heart rate range for this zone
}

interface ColorCodedZonesProps {
  zones: HeartRateZone[];
  maxHR?: number; // Maximum heart rate for calculations
  style?: StyleProp<ViewStyle>;
}

interface ZoneRowProps {
  zone: HeartRateZone;
  index: number;
}

const ZoneRow: React.FC<ZoneRowProps> = ({ zone, index }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withDelay(
      index * 100,
      withSpring(`${zone.percentage}%`, {
        damping: 20,
        stiffness: 90,
      }),
    ),
  }));

  return (
    <View style={styles.zoneRow}>
      {/* Zone info */}
      <View style={styles.zoneInfo}>
        <Text style={styles.zoneNumber}>Zone {zone.zone}</Text>
        <Text style={styles.zoneName}>{zone.name}</Text>
        <Text style={styles.zoneBPM}>{zone.bpm} bpm</Text>
      </View>

      {/* Zone bar */}
      <View style={styles.zoneBarContainer}>
        <Animated.View
          style={[
            styles.zoneBar,
            { backgroundColor: zone.color },
            animatedStyle,
          ]}
        >
          {zone.percentage > 10 && (
            <Text style={styles.zonePercentage}>
              {zone.percentage}%
            </Text>
          )}
        </Animated.View>
      </View>

      {/* Percentage label (if too small to show inside) */}
      {zone.percentage <= 10 && zone.percentage > 0 && (
        <Text style={styles.zonePercentageOutside}>
          {zone.percentage}%
        </Text>
      )}
    </View>
  );
};

export const ColorCodedZones: React.FC<ColorCodedZonesProps> = ({
  zones,
  maxHR = 180,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Zone bars */}
      <View style={styles.zonesContainer}>
        {zones.map((zone, index) => (
          <ZoneRow key={zone.zone} zone={zone} index={index} />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>
          Recommended Training Distribution:
        </Text>
        <View style={styles.legendGrid}>
          <Text style={styles.legendItem}>Zone 1: Warm-up/Recovery (20%)</Text>
          <Text style={styles.legendItem}>
            Zone 2: Fat Burn - Primary (35%)
          </Text>
          <Text style={styles.legendItem}>Zone 3: Cardio Fitness (25%)</Text>
          <Text style={styles.legendItem}>Zone 4: Performance (15%)</Text>
          <Text style={styles.legendItem}>Zone 5: Peak Effort (5%)</Text>
        </View>
      </View>
    </View>
  );
};

// Default color palette for zones
export const HEART_RATE_ZONE_COLORS = {
  zone1: colors.info, // Light blue - Recovery
  zone2: colors.success, // Green - Fat burn
  zone3: colors.warning, // Yellow - Cardio
  zone4: colors.warning, // Orange - Hard
  zone5: colors.error, // Red - Max
};

// Helper function to calculate zones based on max HR
// Returns recommended training distribution percentages for a balanced workout plan
export const calculateHeartRateZones = (maxHR: number): HeartRateZone[] => {
  return [
    {
      zone: 1,
      name: "Recovery",
      range: "50-60%",
      color: HEART_RATE_ZONE_COLORS.zone1,
      percentage: 20, // Warm-up/cool-down
      bpm: `${Math.round(maxHR * 0.5)}-${Math.round(maxHR * 0.6)}`,
    },
    {
      zone: 2,
      name: "Fat Burn",
      range: "60-70%",
      color: HEART_RATE_ZONE_COLORS.zone2,
      percentage: 35, // Primary fat burning zone
      bpm: `${Math.round(maxHR * 0.6)}-${Math.round(maxHR * 0.7)}`,
    },
    {
      zone: 3,
      name: "Cardio",
      range: "70-80%",
      color: HEART_RATE_ZONE_COLORS.zone3,
      percentage: 25, // Cardiovascular fitness
      bpm: `${Math.round(maxHR * 0.7)}-${Math.round(maxHR * 0.8)}`,
    },
    {
      zone: 4,
      name: "Hard",
      range: "80-90%",
      color: HEART_RATE_ZONE_COLORS.zone4,
      percentage: 15, // Performance training
      bpm: `${Math.round(maxHR * 0.8)}-${Math.round(maxHR * 0.9)}`,
    },
    {
      zone: 5,
      name: "Max",
      range: "90-100%",
      color: HEART_RATE_ZONE_COLORS.zone5,
      percentage: 5, // Peak performance (use sparingly)
      bpm: `${Math.round(maxHR * 0.9)}-${maxHR}`,
    },
  ];
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  zonesContainer: {
    gap: spacing.md,
  },

  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  zoneInfo: {
    width: rp(100),
  },

  zoneNumber: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },

  zoneName: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },

  zoneBPM: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  zoneBarContainer: {
    flex: 1,
    height: rp(32),
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },

  zoneBar: {
    height: "100%",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: spacing.sm,
    borderRadius: borderRadius.md,
  },

  zonePercentage: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  zonePercentageOutside: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    width: rp(40),
    textAlign: "right",
  },

  legend: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },

  legendTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  legendGrid: {
    gap: spacing.xs,
  },

  legendItem: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
