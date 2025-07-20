import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { THEME } from '../../utils/constants';

interface RatingSelectorProps {
  value: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  type?: 'stars' | 'difficulty' | 'satisfaction' | 'intensity';
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

export const RatingSelector: React.FC<RatingSelectorProps> = ({
  value,
  onRatingChange,
  maxRating = 5,
  type = 'stars',
  label,
  showValue = true,
  disabled = false,
  size = 'md',
  style,
}) => {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [animatedValues] = useState(
    Array.from({ length: maxRating }, () => new Animated.Value(1))
  );

  const getIcon = (index: number, isActive: boolean) => {
    const rating = hoveredRating || value;
    const isHighlighted = index < rating;

    switch (type) {
      case 'stars':
        return isHighlighted ? '⭐' : '☆';
      case 'difficulty':
        return isHighlighted ? '🔥' : '○';
      case 'satisfaction':
        return isHighlighted ? '😊' : '😐';
      case 'intensity':
        return isHighlighted ? '💪' : '○';
      default:
        return isHighlighted ? '⭐' : '☆';
    }
  };

  const getColor = (index: number) => {
    const rating = hoveredRating || value;
    const isHighlighted = index < rating;

    if (!isHighlighted) return THEME.colors.textMuted;

    switch (type) {
      case 'stars':
        return THEME.colors.warning;
      case 'difficulty':
        return rating <= 2 ? THEME.colors.success : 
               rating <= 4 ? THEME.colors.warning : THEME.colors.error;
      case 'satisfaction':
        return rating <= 2 ? THEME.colors.error :
               rating <= 4 ? THEME.colors.warning : THEME.colors.success;
      case 'intensity':
        return rating <= 2 ? THEME.colors.info :
               rating <= 4 ? THEME.colors.warning : THEME.colors.error;
      default:
        return THEME.colors.primary;
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 24;
      case 'md':
        return 32;
      case 'lg':
        return 40;
      default:
        return 32;
    }
  };

  const getLabel = () => {
    if (!showValue) return '';

    switch (type) {
      case 'difficulty':
        if (value === 0) return 'Not rated';
        if (value <= 2) return 'Easy';
        if (value <= 4) return 'Moderate';
        return 'Hard';
      case 'satisfaction':
        if (value === 0) return 'Not rated';
        if (value <= 2) return 'Poor';
        if (value <= 4) return 'Good';
        return 'Excellent';
      case 'intensity':
        if (value === 0) return 'Not rated';
        if (value <= 2) return 'Light';
        if (value <= 4) return 'Moderate';
        return 'Intense';
      default:
        return `${value}/${maxRating}`;
    }
  };

  const handlePress = (rating: number) => {
    if (disabled) return;

    // Animate the pressed item
    Animated.sequence([
      Animated.timing(animatedValues[rating - 1], {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues[rating - 1], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onRatingChange(rating);
  };

  const handlePressIn = (rating: number) => {
    if (disabled) return;
    setHoveredRating(rating);
  };

  const handlePressOut = () => {
    if (disabled) return;
    setHoveredRating(0);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.ratingContainer}>
        <View style={styles.iconsContainer}>
          {Array.from({ length: maxRating }, (_, index) => {
            const rating = index + 1;
            const isActive = rating <= (hoveredRating || value);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.iconButton,
                  { width: getSize(), height: getSize() },
                  disabled && styles.iconButtonDisabled,
                ]}
                onPress={() => handlePress(rating)}
                onPressIn={() => handlePressIn(rating)}
                onPressOut={handlePressOut}
                disabled={disabled}
              >
                <Animated.Text
                  style={[
                    styles.icon,
                    {
                      fontSize: getSize() * 0.8,
                      color: getColor(index),
                      transform: [{ scale: animatedValues[index] }],
                    },
                  ]}
                >
                  {getIcon(index, isActive)}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showValue && (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{getLabel()}</Text>
            <Text style={styles.numericValue}>({value}/{maxRating})</Text>
          </View>
        )}
      </View>

      {/* Description based on type */}
      {type !== 'stars' && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            {type === 'difficulty' && 'Rate how challenging this was'}
            {type === 'satisfaction' && 'How satisfied are you?'}
            {type === 'intensity' && 'Rate the workout intensity'}
          </Text>
        </View>
      )}

      {/* Scale Labels */}
      <View style={styles.scaleContainer}>
        <Text style={styles.scaleText}>
          {type === 'difficulty' && 'Easy'}
          {type === 'satisfaction' && 'Poor'}
          {type === 'intensity' && 'Light'}
          {type === 'stars' && '1'}
        </Text>
        <Text style={styles.scaleText}>
          {type === 'difficulty' && 'Hard'}
          {type === 'satisfaction' && 'Excellent'}
          {type === 'intensity' && 'Intense'}
          {type === 'stars' && maxRating.toString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: THEME.spacing.sm,
  },

  label: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  ratingContainer: {
    alignItems: 'center',
  },

  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.xs,
    marginBottom: THEME.spacing.sm,
  },

  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  iconButtonDisabled: {
    opacity: 0.5,
  },

  icon: {
    textAlign: 'center',
  },

  valueContainer: {
    alignItems: 'center',
    gap: THEME.spacing.xs / 2,
  },

  valueText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  numericValue: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  descriptionContainer: {
    marginTop: THEME.spacing.sm,
    alignItems: 'center',
  },

  descriptionText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.sm,
  },

  scaleText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },
});
