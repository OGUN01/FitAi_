import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../ui';

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
  showLabel = true 
}) => {
  const getColorForCategory = (category: string) => {
    switch (category) {
      case 'excellent': return '#22c55e'; // Green
      case 'good': return '#84cc16'; // Light green
      case 'moderate': return '#eab308'; // Yellow
      case 'poor': return '#f97316'; // Orange
      case 'unhealthy': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'moderate': return '🟠';
      case 'poor': return '🔴';
      case 'unhealthy': return '🔴';
      default: return '⚪';
    }
  };

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return {
          container: { width: 60, height: 60 },
          scoreText: { fontSize: 14 },
          labelText: { fontSize: 10 }
        };
      case 'large':
        return {
          container: { width: 100, height: 100 },
          scoreText: { fontSize: 24 },
          labelText: { fontSize: 14 }
        };
      default:
        return {
          container: { width: 80, height: 80 },
          scoreText: { fontSize: 18 },
          labelText: { fontSize: 12 }
        };
    }
  };

  const color = getColorForCategory(category);
  const icon = getIconForCategory(category);
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={styles.container}>
      <View style={[
        styles.scoreCircle, 
        sizeStyles.container,
        { borderColor: color }
      ]}>
        <Text style={[styles.scoreText, sizeStyles.scoreText, { color }]}>
          {score}
        </Text>
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
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  scoreText: {
    fontWeight: THEME.fontWeight.bold as '700',
    lineHeight: 20,
  },

  scoreUnit: {
    fontSize: 8,
    color: THEME.colors.textSecondary,
    marginTop: -2,
  },

  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },

  iconText: {
    fontSize: 12,
    marginRight: THEME.spacing.xs,
  },

  labelText: {
    fontWeight: THEME.fontWeight.semibold as '600',
    textAlign: 'center',
  },
});

export default HealthScoreIndicator;