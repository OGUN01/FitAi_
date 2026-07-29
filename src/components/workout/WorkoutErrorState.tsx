/**
 * FitAI — Workout Error State (Aurora, 2026 session redesign)
 *
 * Flat dark empty-state for missing workout data / empty workouts: tinted
 * icon anchor, typographic title + muted subtitle, and one gradient "Go Back"
 * CTA. Behavior (icon choice, copy, onGoBack) is unchanged.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../ui/aurora';
import { flatColors as colors, spacing, typography } from '../../theme/aurora-tokens';
import { rf, rw, rp, rbr } from '../../utils/responsive';

interface WorkoutErrorStateProps {
  errorType: 'no-data' | 'no-exercises';
  onGoBack: () => void;
}

export const WorkoutErrorState: React.FC<WorkoutErrorStateProps> = ({ errorType, onGoBack }) => {
  const config =
    errorType === 'no-data'
      ? {
          icon: 'alert-circle-outline' as const,
          iconColor: colors.error,
          iconTint: colors.errorTint,
          title: 'No Workout Data',
          subtitle: 'Unable to load workout information',
        }
      : {
          icon: 'barbell-outline' as const,
          iconColor: colors.primary,
          iconTint: colors.primaryTint,
          title: 'No Exercises Found',
          subtitle: 'This workout appears to be empty',
        };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.errorContainer}>
        <View style={[styles.iconContainer, { backgroundColor: config.iconTint }]}>
          <Ionicons name={config.icon} size={rf(36)} color={config.iconColor} />
        </View>
        <Text
          style={styles.errorText}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {config.title}
        </Text>
        <Text style={styles.errorSubtext} numberOfLines={3}>
          {config.subtitle}
        </Text>
        <AnimatedPressable
          onPress={onGoBack}
          scaleValue={0.97}
          springConfig="snappy"
          hapticType="medium"
          style={styles.errorButton}
          accessibilityRole="button"
          accessibilityLabel="Go Back"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.errorButtonGradient}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: rw(72),
    height: rw(72),
    borderRadius: rw(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: rf(24),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.text,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: rf(14),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: spacing.xl,
  },
  errorButton: {
    borderRadius: rbr(16),
    overflow: 'hidden',
    minWidth: rw(160),
  },
  errorButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    minHeight: Math.max(rp(52), 52),
  },
  errorButtonText: {
    fontSize: rf(16),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.white,
    letterSpacing: 0.3,
  },
});
