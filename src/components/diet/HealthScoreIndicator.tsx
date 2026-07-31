import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { flatColors as colors, spacing, typography } from '../../theme/aurora-tokens';
import { rf, rw, rh, rbr } from '../../utils/responsive';

interface HealthScoreIndicatorProps {
  score: number;
  category: 'excellent' | 'good' | 'moderate' | 'poor' | 'unhealthy';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const HealthScoreIndicator: React.FC<HealthScoreIndicatorProps> = ({
  score,
  category,
  size = 'medium',
  showLabel = true,
}) => {
  // Tokenized health-score scale — same successAlt→errorAlt ramp used by
  // ProductDetailsModal's getBreakdownColor so both read as one system.
  const getColorForCategory = (category: string) => {
    switch (category) {
      case 'excellent':
        return colors.successAlt;
      case 'good':
        return colors.lime;
      case 'moderate':
        return colors.yellow;
      case 'poor':
        return colors.orange;
      case 'unhealthy':
        return colors.errorAlt;
      default:
        return colors.textMuted;
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'excellent':
        return '🟢';
      case 'good':
        return '🟡';
      case 'moderate':
        return '🟠';
      case 'poor':
        return '🔴';
      case 'unhealthy':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return {
          container: { width: rw(60), height: rh(60) },
          scoreText: { fontSize: rf(14), lineHeight: rf(17) },
          labelText: { fontSize: rf(12) },
        };
      case 'large':
        return {
          container: { width: rw(100), height: rh(100) },
          scoreText: { fontSize: rf(24), lineHeight: rf(28) },
          labelText: { fontSize: rf(14) },
        };
      default:
        return {
          container: { width: rw(80), height: rh(80) },
          scoreText: { fontSize: rf(18), lineHeight: rf(21) },
          labelText: { fontSize: rf(12) },
        };
    }
  };

  const color = getColorForCategory(category);
  const icon = getIconForCategory(category);
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={styles.container}>
      <View style={[styles.scoreCircle, sizeStyles.container, { borderColor: color }]}>
        <Text style={[styles.scoreText, sizeStyles.scoreText, { color }]}>{score}</Text>
        <Text style={styles.scoreUnit}>%</Text>
      </View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.iconText}>{icon}</Text>
          <Text style={[styles.labelText, sizeStyles.labelText, { color }]}>
            {category.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreCircle: {
    borderRadius: rbr(50),
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },

  scoreText: {
    fontWeight: typography.fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },

  scoreUnit: {
    fontSize: rf(8),
    color: colors.textSecondary,
    marginTop: -2,
  },

  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  iconText: {
    fontSize: rf(12),
    marginRight: spacing.xs,
  },

  labelText: {
    fontWeight: typography.fontWeight.semibold as '600',
    textAlign: 'center',
  },
});

export default HealthScoreIndicator;
