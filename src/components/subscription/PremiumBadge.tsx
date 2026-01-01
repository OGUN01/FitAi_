// Premium Badge Component
// Shows premium status and trial information

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

interface PremiumBadgeProps {
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showTrial?: boolean;
  variant?: 'badge' | 'banner' | 'inline';
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  onPress,
  size = 'medium',
  showTrial = true,
  variant = 'badge'
}) => {
  const { subscriptionStatus, trialInfo } = useSubscriptionStore();

  const isPremium = subscriptionStatus.isPremium;
  const isTrialActive = trialInfo.daysRemaining > 0;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          containerPadding: { paddingHorizontal: 8, paddingVertical: 4 },
          textStyle: { fontSize: 12 },
          iconStyle: { fontSize: 14 },
        };
      case 'large':
        return {
          containerPadding: { paddingHorizontal: 16, paddingVertical: 8 },
          textStyle: { fontSize: 16, fontWeight: '700' as const },
          iconStyle: { fontSize: 18 },
        };
      default:
        return {
          containerPadding: { paddingHorizontal: 12, paddingVertical: 6 },
          textStyle: { fontSize: 14, fontWeight: '600' as const },
          iconStyle: { fontSize: 16 },
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (variant === 'badge') {
    if (!isPremium && !isTrialActive) {
      return (
        <Pressable onPress={onPress}>
          <LinearGradient colors={['#FBBF24', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.badgeContainer, sizeStyles.containerPadding]}>
            <Text style={[styles.icon, sizeStyles.iconStyle]}>⭐</Text>
            <Text style={[styles.badgeText, sizeStyles.textStyle]}>Upgrade</Text>
          </LinearGradient>
        </Pressable>
      );
    }

    if (isTrialActive && showTrial) {
      return (
        <LinearGradient colors={['#60A5FA', '#A78BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.badgeContainer, sizeStyles.containerPadding]}>
          <Text style={[styles.icon, sizeStyles.iconStyle]}>🎁</Text>
          <Text style={[styles.badgeText, sizeStyles.textStyle]}>Trial: {trialInfo.daysRemaining}d</Text>
        </LinearGradient>
      );
    }

    if (isPremium) {
      const gradientColors = (subscriptionStatus.plan === 'lifetime' ? ['#A855F7', '#EC4899'] : ['#4ADE80', '#3B82F6']) as readonly [string, string, ...string[]];
      return (
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.badgeContainer, sizeStyles.containerPadding]}>
          <Text style={[styles.icon, sizeStyles.iconStyle]}>👑</Text>
          <Text style={[styles.badgeText, sizeStyles.textStyle, styles.capitalize]}>{subscriptionStatus.plan === 'lifetime' ? 'Lifetime' : 'Premium'}</Text>
        </LinearGradient>
      );
    }
    return null;
  }

  if (variant === 'banner') {
    if (!isPremium && !isTrialActive) {
      return (
        <Pressable onPress={onPress}>
          <LinearGradient colors={['#FBBF24', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextContainer}>
                <View style={styles.bannerHeader}>
                  <Text style={styles.bannerIcon}>⭐</Text>
                  <Text style={styles.bannerTitle}>Upgrade to Premium</Text>
                </View>
                <Text style={styles.bannerSubtitle}>Unlock unlimited AI workouts, advanced analytics, and more!</Text>
              </View>
              <View style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Upgrade</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      );
    }

    if (isTrialActive && showTrial) {
      return (
        <LinearGradient colors={['#60A5FA', '#A78BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <View style={styles.bannerHeader}>
                <Text style={styles.bannerIcon}>🎁</Text>
                <Text style={styles.bannerTitle}>Free Trial Active</Text>
              </View>
              <Text style={styles.bannerSubtitle}>{trialInfo.daysRemaining} days remaining - Enjoy all premium features!</Text>
            </View>
            <View style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>{trialInfo.daysRemaining}d left</Text>
            </View>
          </View>
        </LinearGradient>
      );
    }

    if (isPremium) {
      const gradientColors = (subscriptionStatus.plan === 'lifetime' ? ['#A855F7', '#EC4899'] : ['#4ADE80', '#3B82F6']) as readonly [string, string, ...string[]];
      return (
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <View style={styles.bannerHeader}>
                <Text style={styles.bannerIcon}>👑</Text>
                <Text style={[styles.bannerTitle, styles.capitalize]}>{subscriptionStatus.plan === 'lifetime' ? 'Lifetime Premium' : 'Premium Active'}</Text>
              </View>
              <Text style={styles.bannerSubtitle}>You have access to all premium features{subscriptionStatus.expiryDate && subscriptionStatus.plan !== 'lifetime' && ` until ${new Date(subscriptionStatus.expiryDate).toLocaleDateString()}`}</Text>
            </View>
            <View style={styles.bannerButton}>
              <Text style={[styles.bannerButtonText, styles.capitalize]}>{subscriptionStatus.plan}</Text>
            </View>
          </View>
        </LinearGradient>
      );
    }
    return null;
  }

  if (variant === 'inline') {
    if (!isPremium && !isTrialActive) {
      return (
        <Pressable onPress={onPress} style={styles.inlineContainer}>
          <Text style={styles.inlineIconYellow}>⭐</Text>
          <Text style={styles.inlineTextYellow}>Upgrade to Premium</Text>
        </Pressable>
      );
    }

    if (isTrialActive && showTrial) {
      return (
        <View style={styles.inlineContainer}>
          <Text style={styles.inlineIconBlue}>🎁</Text>
          <Text style={styles.inlineTextBlue}>Trial: {trialInfo.daysRemaining} days left</Text>
        </View>
      );
    }

    if (isPremium) {
      const isPurple = subscriptionStatus.plan === 'lifetime';
      return (
        <View style={styles.inlineContainer}>
          <Text style={styles.inlineIconYellow}>👑</Text>
          <Text style={[isPurple ? styles.inlineTextPurple : styles.inlineTextGreen, styles.capitalize]}>{subscriptionStatus.plan === 'lifetime' ? 'Lifetime' : 'Premium'}</Text>
        </View>
      );
    }
    return null;
  }

  return null;
};

const styles = StyleSheet.create({
  badgeContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 9999 },
  badgeText: { color: '#FFFFFF' },
  icon: { marginRight: 4 },
  banner: { padding: 16, borderRadius: 16, marginHorizontal: 16, marginVertical: 8 },
  bannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTextContainer: { flex: 1 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center' },
  bannerIcon: { fontSize: 24, marginRight: 8 },
  bannerTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  bannerSubtitle: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, marginTop: 4 },
  bannerButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8 },
  bannerButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  inlineContainer: { flexDirection: 'row', alignItems: 'center' },
  inlineIconYellow: { fontSize: 16, marginRight: 4 },
  inlineIconBlue: { fontSize: 16, marginRight: 4 },
  inlineTextYellow: { color: '#D97706', fontSize: 14, fontWeight: '500' },
  inlineTextBlue: { color: '#2563EB', fontSize: 14, fontWeight: '500' },
  inlineTextPurple: { color: '#9333EA', fontSize: 14, fontWeight: '500' },
  inlineTextGreen: { color: '#16A34A', fontSize: 14, fontWeight: '500' },
  capitalize: { textTransform: 'capitalize' },
});

export default PremiumBadge;
