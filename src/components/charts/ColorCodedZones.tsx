import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { rf, rp } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

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
  style?: any;
}

export const ColorCodedZones: React.FC<ColorCodedZonesProps> = ({
  zones,
  maxHR = 180,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Zone bars */}
      <View style={styles.zonesContainer}>
        {zones.map((zone, index) => {
          const animatedStyle = useAnimatedStyle(() => ({
            width: withDelay(
              index * 100,
              withSpring(`${zone.percentage}%`, {
                damping: 20,
                stiffness: 90,
              })
            ),
          }));

          return (
            <View key={zone.zone} style={styles.zoneRow}>
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
                    <Text style={styles.zonePercentage}>{zone.percentage}%</Text>
                  )}
                </Animated.View>
              </View>

              {/* Percentage label (if too small to show inside) */}
              {zone.percentage <= 10 && zone.percentage > 0 && (
                <Text style={styles.zonePercentageOutside}>{zone.percentage}%</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Recommended Training Distribution:</Text>
        <View style={styles.legendGrid}>
          <Text style={styles.legendItem}>Zone 1: Warm-up/Recovery (20%)</Text>
          <Text style={styles.legendItem}>Zone 2: Fat Burn - Primary (35%)</Text>
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
  zone1: '#8B9DC3', // Light blue - Recovery
  zone2: '#4CAF50', // Green - Fat burn
  zone3: '#FFC107', // Yellow - Cardio
  zone4: '#FF9800', // Orange - Hard
  zone5: '#F44336', // Red - Max
};

// Helper function to calculate zones based on max HR
// Returns recommended training distribution percentages for a balanced workout plan
export const calculateHeartRateZones = (maxHR: number): HeartRateZone[] => {
  return [
    {
      zone: 1,
      name: 'Recovery',
      range: '50-60%',
      color: HEART_RATE_ZONE_COLORS.zone1,
      percentage: 20, // Warm-up/cool-down
      bpm: `${Math.round(maxHR * 0.5)}-${Math.round(maxHR * 0.6)}`,
    },
    {
      zone: 2,
      name: 'Fat Burn',
      range: '60-70%',
      color: HEART_RATE_ZONE_COLORS.zone2,
      percentage: 35, // Primary fat burning zone
      bpm: `${Math.round(maxHR * 0.6)}-${Math.round(maxHR * 0.7)}`,
    },
    {
      zone: 3,
      name: 'Cardio',
      range: '70-80%',
      color: HEART_RATE_ZONE_COLORS.zone3,
      percentage: 25, // Cardiovascular fitness
      bpm: `${Math.round(maxHR * 0.7)}-${Math.round(maxHR * 0.8)}`,
    },
    {
      zone: 4,
      name: 'Hard',
      range: '80-90%',
      color: HEART_RATE_ZONE_COLORS.zone4,
      percentage: 15, // Performance training
      bpm: `${Math.round(maxHR * 0.8)}-${Math.round(maxHR * 0.9)}`,
    },
    {
      zone: 5,
      name: 'Max',
      range: '90-100%',
      color: HEART_RATE_ZONE_COLORS.zone5,
      percentage: 5, // Peak performance (use sparingly)
      bpm: `${Math.round(maxHR * 0.9)}-${maxHR}`,
    },
  ];
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  zonesContainer: {
    gap: ResponsiveTheme.spacing.md,
  },

  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },

  zoneInfo: {
    width: 100,
  },

  zoneNumber: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  zoneName: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  zoneBPM: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  zoneBarContainer: {
    flex: 1,
    height: 32,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: 'hidden',
  },

  zoneBar: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  zonePercentage: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  zonePercentageOutside: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.textSecondary,
    width: 40,
    textAlign: 'right',
  },

  legend: {
    marginTop: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.primary}30`,
  },

  legendTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  legendGrid: {
    gap: ResponsiveTheme.spacing.xs,
  },

  legendItem: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
