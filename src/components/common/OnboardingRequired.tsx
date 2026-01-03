/**
 * OnboardingRequired Component
 * 
 * Display component shown when calculated metrics from onboarding are not available.
 * Instead of showing hardcoded fallback values, this component prompts users
 * to complete onboarding to get their personalized targets.
 * 
 * Usage:
 * ```tsx
 * const { hasCalculatedMetrics } = useCalculatedMetrics();
 * 
 * if (!hasCalculatedMetrics) {
 *   return <OnboardingRequired feature="water goal" />;
 * }
 * ```
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { haptics } from '../../utils/haptics';

interface OnboardingRequiredProps {
  /** The feature/metric that requires onboarding */
  feature?: string;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Callback when user taps to complete onboarding */
  onCompleteOnboarding?: () => void;
  /** Custom message to display */
  message?: string;
}

export const OnboardingRequired: React.FC<OnboardingRequiredProps> = ({
  feature = 'this feature',
  compact = false,
  onCompleteOnboarding,
  message,
}) => {
  const handlePress = () => {
    haptics.light();
    onCompleteOnboarding?.();
  };

  if (compact) {
    return (
      <AnimatedPressable
        onPress={onCompleteOnboarding ? handlePress : undefined}
        style={styles.compactContainer}
      >
        <Ionicons name="information-circle-outline" size={rf(14)} color={ResponsiveTheme.colors.textMuted} />
        <Text style={styles.compactText}>
          {message || `Complete onboarding for ${feature}`}
        </Text>
        {onCompleteOnboarding && (
          <Ionicons name="chevron-forward" size={rf(14)} color={ResponsiveTheme.colors.primary} />
        )}
      </AnimatedPressable>
    );
  }

  return (
    <GlassCard style={styles.container} intensity={0.1}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[ResponsiveTheme.colors.primaryFaded, ResponsiveTheme.colors.primary]}
          style={styles.iconGradient}
        >
          <Ionicons name="clipboard-outline" size={rf(28)} color="#fff" />
        </LinearGradient>
      </View>
      
      <Text style={styles.title}>Complete Your Profile</Text>
      
      <Text style={styles.description}>
        {message || `Your ${feature} will be calculated based on your personal information, activity level, and location.`}
      </Text>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={rf(16)} color={ResponsiveTheme.colors.success} />
          <Text style={styles.benefitText}>Personalized nutrition targets</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={rf(16)} color={ResponsiveTheme.colors.success} />
          <Text style={styles.benefitText}>Climate-adjusted hydration goals</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={rf(16)} color={ResponsiveTheme.colors.success} />
          <Text style={styles.benefitText}>BMI-specific recommendations</Text>
        </View>
      </View>

      {onCompleteOnboarding && (
        <AnimatedPressable onPress={handlePress} style={styles.button}>
          <LinearGradient
            colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryDark || ResponsiveTheme.colors.primary]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Complete Onboarding</Text>
            <Ionicons name="arrow-forward" size={rf(16)} color="#fff" />
          </LinearGradient>
        </AnimatedPressable>
      )}
    </GlassCard>
  );
};

/**
 * MetricPlaceholder
 * 
 * Inline placeholder for individual metrics when data is not available.
 * Shows a subtle indicator instead of a hardcoded value.
 */
export const MetricPlaceholder: React.FC<{
  size?: 'small' | 'medium' | 'large';
  label?: string;
}> = ({ size = 'medium', label }) => {
  const fontSize = size === 'small' ? rf(14) : size === 'large' ? rf(24) : rf(18);
  
  return (
    <View style={styles.metricPlaceholder}>
      <Text style={[styles.metricDash, { fontSize }]}>--</Text>
      {label && <Text style={styles.metricLabel}>{label}</Text>}
    </View>
  );
};

/**
 * LoadingMetric
 * 
 * Shows a loading state for metrics while data is being fetched.
 */
export const LoadingMetric: React.FC<{
  size?: 'small' | 'medium' | 'large';
}> = ({ size = 'medium' }) => {
  const width = size === 'small' ? rw(30) : size === 'large' ? rw(60) : rw(45);
  const height = size === 'small' ? rh(16) : size === 'large' ? rh(28) : rh(20);
  
  return (
    <View style={[styles.loadingMetric, { width, height }]}>
      <View style={styles.loadingShimmer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: rp(20),
    alignItems: 'center',
    marginVertical: rh(10),
  },
  iconContainer: {
    marginBottom: rh(16),
  },
  iconGradient: {
    width: rw(60),
    height: rw(60),
    borderRadius: rw(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: rf(18),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(8),
    textAlign: 'center',
  },
  description: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: rh(16),
    paddingHorizontal: rp(10),
  },
  benefitsList: {
    alignSelf: 'stretch',
    marginBottom: rh(20),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rh(8),
    paddingHorizontal: rp(10),
  },
  benefitText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: rw(8),
  },
  button: {
    alignSelf: 'stretch',
    borderRadius: rp(12),
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rh(14),
    paddingHorizontal: rp(20),
    gap: rw(8),
  },
  buttonText: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#fff',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rh(8),
    paddingHorizontal: rp(12),
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderRadius: rp(8),
    gap: rw(6),
  },
  compactText: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textMuted,
  },
  // Metric placeholder styles
  metricPlaceholder: {
    alignItems: 'center',
  },
  metricDash: {
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    marginTop: rh(2),
  },
  // Loading metric styles
  loadingMetric: {
    backgroundColor: `${ResponsiveTheme.colors.textMuted}20`,
    borderRadius: rp(4),
    overflow: 'hidden',
  },
  loadingShimmer: {
    flex: 1,
    backgroundColor: `${ResponsiveTheme.colors.textMuted}30`,
  },
});

export default OnboardingRequired;






