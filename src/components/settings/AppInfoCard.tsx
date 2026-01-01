/**
 * AppInfoCard - App Information Footer Component
 * 
 * Shows:
 * - App logo with gradient
 * - App name and version
 * - Tagline (using Ionicons, NOT emojis per methodology)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../ui/aurora/GlassCard';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';

interface AppInfoCardProps {
  version?: string;
  animationDelay?: number;
}

export const AppInfoCard: React.FC<AppInfoCardProps> = ({
  version = '1.0.0',
  animationDelay = 0,
}) => {
  return (
    <Animated.View 
      entering={FadeIn.delay(animationDelay).duration(400)}
      style={styles.container}
    >
      <GlassCard 
        elevation={1} 
        padding="lg" 
        blurIntensity="light" 
        borderRadius="lg"
        style={styles.card}
      >
        <View style={styles.content}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Text style={styles.logoText}>F</Text>
          </LinearGradient>
          
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.appName}>FitAI</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{version}</Text>
              </View>
            </View>
            <Text style={styles.tagline}>
              Your AI-powered fitness companion
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerText}>Made with</Text>
            <Ionicons name="heart" size={rf(14)} color="#FF6B6B" style={styles.heartIcon} />
            <Text style={styles.footerText}>for fitness enthusiasts</Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoText: {
    fontSize: rf(24),
    fontWeight: '800',
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: rf(18),
    fontWeight: '700',
    color: '#fff',
  },
  versionBadge: {
    marginLeft: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: rf(4),
  },
  versionText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  tagline: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
  },
  footer: {
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textMuted,
  },
  heartIcon: {
    marginHorizontal: rf(4),
  },
});

export default AppInfoCard;

