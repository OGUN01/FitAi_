/**
 * ConnectedAccountsCard - Shows linked social accounts
 * 
 * Features:
 * - Google account connection status
 * - Apple account connection status (iOS only)
 * - Connect/disconnect functionality
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw, rh } from '../../../utils/responsive';
import { haptics } from '../../../utils/haptics';

interface ConnectedAccount {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  isConnected: boolean;
  email?: string;
}

interface ConnectedAccountsCardProps {
  isGoogleConnected: boolean;
  googleEmail?: string;
  onGooglePress: () => void;
  onApplePress?: () => void;
  animationDelay?: number;
}

export const ConnectedAccountsCard: React.FC<ConnectedAccountsCardProps> = ({
  isGoogleConnected,
  googleEmail,
  onGooglePress,
  onApplePress,
  animationDelay = 0,
}) => {
  const accounts: ConnectedAccount[] = [
    {
      id: 'google',
      name: 'Google',
      icon: 'logo-google',
      iconColor: '#fff',
      bgColor: '#EA4335',
      isConnected: isGoogleConnected,
      email: googleEmail,
    },
    ...(Platform.OS === 'ios' ? [{
      id: 'apple',
      name: 'Apple',
      icon: 'logo-apple' as keyof typeof Ionicons.glyphMap,
      iconColor: '#fff',
      bgColor: '#000',
      isConnected: false,
      email: undefined,
    }] : []),
  ];

  return (
    <Animated.View 
      entering={FadeInRight.delay(animationDelay).duration(400)}
      style={styles.container}
    >
      <Text style={styles.sectionTitle}>Connected Accounts</Text>
      <GlassCard 
        elevation={1} 
        padding="none" 
        blurIntensity="light" 
        borderRadius="lg"
        style={styles.card}
      >
        {accounts.map((account, index) => (
          <React.Fragment key={account.id}>
            <AnimatedPressable
              onPress={() => {
                haptics.light();
                if (account.id === 'google') {
                  onGooglePress();
                } else if (account.id === 'apple' && onApplePress) {
                  onApplePress();
                }
              }}
              scaleValue={0.98}
              hapticFeedback={false}
            >
              <View style={styles.row}>
                {/* Provider Icon */}
                <View style={[styles.iconContainer, { backgroundColor: account.bgColor }]}>
                  <Ionicons name={account.icon} size={rf(18)} color={account.iconColor} />
                </View>
                
                {/* Info */}
                <View style={styles.infoContainer}>
                  <Text style={styles.providerName}>{account.name}</Text>
                  {account.isConnected && account.email ? (
                    <Text style={styles.email} numberOfLines={1}>{account.email}</Text>
                  ) : (
                    <Text style={styles.notConnected}>Not connected</Text>
                  )}
                </View>

                {/* Status/Action */}
                <View style={[
                  styles.statusBadge,
                  account.isConnected ? styles.connectedBadge : styles.disconnectedBadge
                ]}>
                  <Text style={[
                    styles.statusText,
                    account.isConnected ? styles.connectedText : styles.disconnectedText
                  ]}>
                    {account.isConnected ? 'Connected' : 'Connect'}
                  </Text>
                </View>
              </View>
            </AnimatedPressable>
            
            {index < accounts.length - 1 && (
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
              </View>
            )}
          </React.Fragment>
        ))}
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  card: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },
  iconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  providerName: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#fff',
  },
  email: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  notConnected: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  connectedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  disconnectedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: '600',
  },
  connectedText: {
    color: '#4CAF50',
  },
  disconnectedText: {
    color: ResponsiveTheme.colors.textSecondary,
  },
  dividerContainer: {
    paddingLeft: rw(36) + ResponsiveTheme.spacing.md * 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});

export default ConnectedAccountsCard;









