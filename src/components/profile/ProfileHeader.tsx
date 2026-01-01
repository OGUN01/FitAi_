/**
 * ProfileHeader - Hero Section with Avatar and User Info
 * 
 * Features:
 * - Animated avatar with edit badge
 * - User name and member since date
 * - Floating streak badge with glow effect
 * - Gradient background
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { gradientAuroraSpace, toLinearGradientProps } from '../../theme/gradients';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh, rs } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

interface ProfileHeaderProps {
  userName: string;
  memberSince?: string;
  streak: number;
  onEditPress: () => void;
  onStreakPress?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userName,
  memberSince,
  streak,
  onEditPress,
  onStreakPress,
}) => {
  const avatarScale = useRef(new RNAnimated.Value(1)).current;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarPress = useCallback(() => {
    // Scale animation on tap
    RNAnimated.sequence([
      RNAnimated.timing(avatarScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      RNAnimated.spring(avatarScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    haptics.medium();
    onEditPress();
  }, [avatarScale, onEditPress]);

  return (
    <LinearGradient
      {...toLinearGradientProps(gradientAuroraSpace)}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Animated Avatar */}
        <Animated.View 
          entering={FadeIn.delay(100).duration(400)}
          style={styles.avatarContainer}
        >
          <AnimatedPressable
            onPress={handleAvatarPress}
            scaleValue={0.95}
            hapticFeedback={false} // We handle haptics manually
          >
            <RNAnimated.View style={{ transform: [{ scale: avatarScale }] }}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {getInitials(userName)}
                </Text>
              </LinearGradient>
              <View style={styles.editBadge}>
                <Ionicons name="create-outline" size={rf(18)} color="#fff" />
              </View>
            </RNAnimated.View>
          </AnimatedPressable>
        </Animated.View>

        {/* User Info */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.userName}>{userName || 'Fitness Champion'}</Text>
          <Text style={styles.memberSince}>
            {memberSince && memberSince !== 'Recently' 
              ? `Member since ${memberSince}` 
              : 'Just joined today'}
          </Text>
        </Animated.View>

        {/* Streak Badge */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <AnimatedPressable
            onPress={onStreakPress}
            scaleValue={0.95}
            hapticFeedback={true}
            hapticType="light"
          >
            <GlassCard 
              elevation={2} 
              blurIntensity="medium" 
              padding="sm" 
              borderRadius="lg" 
              style={styles.streakBadge}
            >
              <View style={styles.streakIconContainer}>
                <Ionicons name="flame" size={rf(18)} color="#FF6B6B" />
              </View>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </GlassCard>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.xxl,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  content: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  avatar: {
    width: rw(110),
    height: rw(110),
    borderRadius: rw(55),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: rf(42),
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: ResponsiveTheme.colors.background,
    shadowColor: ResponsiveTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  userName: {
    fontSize: rf(26),
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
    letterSpacing: 0.5,
  },
  memberSince: {
    fontSize: rf(14),
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  streakIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: rf(18),
    fontWeight: '700',
    color: '#fff',
  },
  streakLabel: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
});

export default ProfileHeader;

