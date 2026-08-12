import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  // Filled-circle Ionicons glyph, colored via getColorForCategory — matches
  // the vector-icon language used by every other status indicator in this
  // family (StatusPill, MealsTimeline, DietActionDock) instead of emoji,
  // which renders inconsistently across OS/font versions.
  const getIconNameForCategory = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'excellent':
      case 'good':
        return 'checkmark-circle';
      case 'moderate':
        return 'alert-circle';
      case 'poor':
      case 'unhealthy':
        return 'close-circle';
      default:
        return 'ellipse-outline';
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
  const iconName = getIconNameForCategory(category);
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={styles.container}>
      <View style={[styles.scoreCircle, sizeStyles.container, { borderColor: color }]}>
        <Text style={[styles.scoreText, sizeStyles.scoreText, { color }]}>{score}</Text>
        <Text style={styles.scoreUnit}>%</Text>
      </View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Ionicons name={iconName} size={rf(12)} color={color} style={styles.iconGlyph} />
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

  iconGlyph: {
    marginRight: spacing.xs,
  },

  labelText: {
    fontWeight: typography.fontWeight.semibold as '600',
    textAlign: 'center',
  },
});

export default HealthScoreIndicator;
