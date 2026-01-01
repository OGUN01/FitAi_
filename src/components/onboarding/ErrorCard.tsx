import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { rf, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="alert-circle" size={rf(20)} color="#EF4444" />
        </View>
        <Text style={styles.headerTitle}>Action Required</Text>
      </View>
      
      {/* Error Items */}
      {errors.map((error, index) => (
        <View key={index} style={styles.errorItem}>
          <Text style={styles.errorMessage}>
            {error.message}
          </Text>
          
          {error.recommendations && error.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              {error.recommendations.map((rec, i) => (
                <View key={i} style={styles.recommendationItem}>
                  <Ionicons name="bulb-outline" size={rf(12)} color={ResponsiveTheme.colors.textMuted} />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
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
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.alternativeGradient}
                  >
                    <Text style={styles.alternativeButtonText}>{alt.description}</Text>
                    <Ionicons name="chevron-forward" size={rf(16)} color="#F59E0B" />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Fix Issues Button */}
      <TouchableOpacity
        style={styles.fixButton}
        onPress={() => onAdjust(errors[0])}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fixButtonGradient}
        >
          <Ionicons name="build" size={rf(16)} color="#fff" />
          <Text style={styles.fixButtonText}>Fix Issues</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  headerIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ResponsiveTheme.spacing.sm,
  },

  headerTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: '#FCA5A5',
    letterSpacing: -0.3,
  },

  errorItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  errorMessage: {
    fontSize: rf(13),
    fontWeight: '500',
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(18),
  },

  recommendationsContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.xs,
  },

  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ResponsiveTheme.spacing.xs,
  },

  recommendationText: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  alternativesContainer: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  alternativesTitle: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  alternativeButton: {
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: ResponsiveTheme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },

  alternativeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  alternativeButtonText: {
    flex: 1,
    fontSize: rf(13),
    color: '#FCD34D',
    fontWeight: '500',
  },

  fixButton: {
    marginTop: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: 'hidden',
  },

  fixButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.xs,
  },

  fixButtonText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: '#fff',
  },
});
