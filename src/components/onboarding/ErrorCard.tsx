import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { rf } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Card } from '../ui';
import { ValidationResult } from '../../services/validationEngine';

// ============================================================================
// TYPES
// ============================================================================

interface ErrorCardProps {
  errors: ValidationResult[];
  onAdjust: (alternative: any) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ErrorCard: React.FC<ErrorCardProps> = ({ errors, onAdjust }) => {
  return (
    <Card style={styles.container}>
      <Text style={styles.header}>
        ⛔ Action Required
      </Text>
      
      {errors.map((error, index) => (
        <View key={index} style={styles.errorItem}>
          <Text style={styles.errorMessage}>
            {error.message}
          </Text>
          
          {error.recommendations && error.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              {error.recommendations.map((rec, i) => (
                <Text key={i} style={styles.recommendationText}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
          
          {error.alternatives && error.alternatives.length > 0 && (
            <View style={styles.alternativesContainer}>
              <Text style={styles.alternativesTitle}>
                Choose an option:
              </Text>
              {error.alternatives.map((alt, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onAdjust(alt)}
                  style={styles.alternativeButton}
                >
                  <Text style={styles.alternativeButtonText}>{alt.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </Card>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 2,
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  header: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: '#B91C1C',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  errorItem: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  errorMessage: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: '#7F1D1D',
    lineHeight: rf(22),
  },

  recommendationsContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  recommendationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#6B7280',
    marginTop: ResponsiveTheme.spacing.xs,
    lineHeight: rf(18),
  },

  alternativesContainer: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  alternativesTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: '#7F1D1D',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  alternativeButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  alternativeButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#92400E',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});

