import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { flatColors as colors } from '../../../theme/aurora-tokens';
import { rf, rp, rbr } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';

interface WaterProgressSectionProps {
  currentLiters: number;
  goalLiters: number;
  progress: number;
  isGoalReached: boolean;
}

export const WaterProgressSection: React.FC<WaterProgressSectionProps> = ({
  currentLiters,
  goalLiters,
  progress,
  isGoalReached,
}) => {
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressInfo}>
        <Text style={styles.progressLabel}>Today's Progress</Text>
        <Text style={styles.progressValue}>
          {currentLiters.toFixed(1)}
          <Text style={styles.progressGoal}> / {goalLiters.toFixed(1)}L</Text>
        </Text>
      </View>
      <View style={styles.progressBar}>
        <LinearGradient
          colors={
            isGoalReached
              ? [colors.successAlt, colors.successAltDark]
              : [colors.secondary, colors.primary]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress}%` }]}
        />
      </View>
      {isGoalReached && (
        <View style={styles.goalReachedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.successAlt} />
          <Text style={styles.goalReachedText}>Daily goal achieved!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  progressSection: {
    marginBottom: rp(24),
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rp(8),
  },
  progressLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: hexToRgba(colors.white, 0.7),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressValue: {
    fontSize: rf(22),
    fontWeight: '700',
    color: colors.white,
  },
  progressGoal: {
    fontSize: rf(13),
    fontWeight: '500',
    color: hexToRgba(colors.white, 0.6),
  },
  progressBar: {
    height: rp(12),
    backgroundColor: colors.glassHighlight,
    borderRadius: rbr(6),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: rbr(6),
  },
  goalReachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(6),
    marginTop: rp(8),
  },
  goalReachedText: {
    fontSize: rf(13),
    color: colors.successAlt,
    fontWeight: '500',
  },
});
