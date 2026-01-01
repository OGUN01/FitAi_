/**
 * GuestPromptBanner Component
 * Compact inline banner for guest sign-up
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw } from '../../../utils/responsive';

interface GuestPromptBannerProps {
  onSignUpPress: () => void;
}

export const GuestPromptBanner: React.FC<GuestPromptBannerProps> = ({
  onSignUpPress,
}) => {
  return (
    <AnimatedPressable
      onPress={onSignUpPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
    >
      <GlassCard 
        elevation={1} 
        blurIntensity="light" 
        padding="sm" 
        borderRadius="lg"
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={rf(16)} color={ResponsiveTheme.colors.primary} />
          </View>
          <Text style={styles.text}>Create account to save progress</Text>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </View>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${ResponsiveTheme.colors.primary}08`,
    borderColor: `${ResponsiveTheme.colors.primary}20`,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },
  iconCircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  button: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  buttonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: '#fff',
  },
});

export default GuestPromptBanner;
