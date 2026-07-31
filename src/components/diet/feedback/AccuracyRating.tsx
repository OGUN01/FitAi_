import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../../theme/aurora-tokens';
import { rf } from '../../../utils/responsive';

interface AccuracyRatingProps {
  rating: number;
  onRatingChange: (rating: 1 | 2 | 3 | 4 | 5) => void;
}

export const AccuracyRating: React.FC<AccuracyRatingProps> = ({ rating, onRatingChange }) => {
  const getRatingLabel = (rating: number): string => {
    switch (rating) {
      case 1:
        return 'Very Poor - Completely wrong';
      case 2:
        return 'Poor - Mostly wrong';
      case 3:
        return 'Fair - Some mistakes';
      case 4:
        return 'Good - Mostly correct';
      case 5:
        return 'Excellent - Perfect recognition';
      default:
        return '';
    }
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>How accurate is this recognition?</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star as 1 | 2 | 3 | 4 | 5)}
            style={styles.starButton}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={rf(28)}
              color={star <= rating ? colors.amberBright : colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingLabel}>{getRatingLabel(rating)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Editorial Dark section: flat surface + hairline (replaces old ui/Card).
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },

  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },

  starButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ratingLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
