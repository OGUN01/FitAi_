// Analytics Card Component
// Displays key metrics and insights in a beautiful card format

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { THEME } from '../../utils/constants';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: string;
  color?: string;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = 'blue',
  onPress,
  size = 'medium'
}) => {
  const getBackgroundColor = () => {
    const colors = {
      blue: THEME.colors.primary,
      green: '#10B981',
      purple: '#8B5CF6',
      orange: '#F59E0B',
      red: '#EF4444',
      gray: '#6B7280',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { padding: 16, minHeight: 80 },
          title: { fontSize: 14 },
          value: { fontSize: 20 },
          subtitle: { fontSize: 12 },
          icon: { fontSize: 24 },
        };
      case 'large':
        return {
          container: { padding: 24, minHeight: 140 },
          title: { fontSize: 18 },
          value: { fontSize: 28 },
          subtitle: { fontSize: 16 },
          icon: { fontSize: 32 },
        };
      default:
        return {
          container: { padding: 20, minHeight: 110 },
          title: { fontSize: 16 },
          value: { fontSize: 24 },
          subtitle: { fontSize: 14 },
          icon: { fontSize: 28 },
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const cardStyle = [
    styles.card,
    sizeStyles.container,
    { backgroundColor: getBackgroundColor() }
  ];

  const CardContent = () => (
    <View style={cardStyle}>
      {/* Header with title and icon */}
      <View style={styles.header}>
        <Text style={[styles.title, sizeStyles.title]}>
          {title}
        </Text>
        
        {icon && (
          <Text style={[styles.icon, sizeStyles.icon]}>
            {icon}
          </Text>
        )}
      </View>

      {/* Main value */}
      <Text style={[styles.value, sizeStyles.value]}>
        {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
      </Text>

      {/* Subtitle and trend */}
      <View style={styles.footer}>
        {subtitle && (
          <Text style={[styles.subtitle, sizeStyles.subtitle]}>
            {subtitle}
          </Text>
        )}
        
        {trend && trendValue && (
          <View style={styles.trendContainer}>
            <Text style={styles.trendIcon}>
              {getTrendIcon()}
            </Text>
            <Text style={[styles.trendValue, sizeStyles.subtitle]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        <CardContent />
      </Pressable>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  icon: {
    color: '#fff',
  },
  value: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: 14,
    marginRight: 4,
    color: '#fff',
  },
  trendValue: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  pressable: {
    opacity: 1,
  },
});

export default AnalyticsCard;