/**
 * OnboardingCompleteModal - World-Class Completion Experience
 * 
 * Premium glassmorphic modal shown after completing onboarding.
 * Follows UIUX methodology: No emojis, proper icons, animations, haptics.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedRN, { 
  FadeInUp, 
  ZoomIn,
} from 'react-native-reanimated';
import { GlassCard } from './aurora/GlassCard';
import { AnimatedPressable } from './aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

interface OnboardingCompleteModalProps {
  visible: boolean;
  userName: string;
  onGetStarted: () => void;
  stats?: {
    workoutsPerWeek?: number;
    calorieTarget?: number;
    goal?: string;
  };
}

// Animated checkmark component
const AnimatedCheckmark: React.FC = () => {
  const scale = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Delay start for entrance animation
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.checkmarkContainer,
        {
          transform: [
            { scale },
            {
              rotate: rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['-180deg', '0deg'],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.checkmarkGradient}
      >
        <Ionicons name="checkmark" size={rf(48)} color="#fff" />
      </LinearGradient>
    </Animated.View>
  );
};

// Floating particle effect
const FloatingParticle: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -rh(60),
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.8,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1600,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: (Math.random() - 0.5) * rw(40),
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          transform: [{ translateY }, { translateX }],
          opacity,
        },
      ]}
    />
  );
};

export const OnboardingCompleteModal: React.FC<OnboardingCompleteModalProps> = ({
  visible,
  userName,
  onGetStarted,
  stats,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const modalWidth = Math.min(screenWidth - 40, 340);
  
  useEffect(() => {
    if (visible) {
      console.log('🎯 OnboardingCompleteModal: Modal visible, screenWidth:', screenWidth, 'modalWidth:', modalWidth);
      haptics.success();
    }
  }, [visible, screenWidth, modalWidth]);

  const handleGetStarted = () => {
    console.log('🎯 OnboardingCompleteModal: handleGetStarted called');
    haptics.medium();
    console.log('🎯 OnboardingCompleteModal: Calling onGetStarted prop...');
    onGetStarted();
    console.log('🎯 OnboardingCompleteModal: onGetStarted completed');
  };

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      {/* Full screen container to ensure proper layout */}
      <View style={styles.fullScreenContainer}>
        {/* Solid dark overlay to properly hide background */}
        <View style={styles.overlay}>
          {/* Floating particles - positioned absolutely */}
          <View style={styles.particlesContainer} pointerEvents="none">
            {[...Array(8)].map((_, i) => (
              <FloatingParticle
                key={i}
                delay={i * 200}
                color={['#10b981', '#667eea', '#FF6B6B', '#4ECDC4'][i % 4]}
              />
            ))}
          </View>

          {/* Modal content - centered */}
          <View style={[styles.modalContainer, { width: modalWidth }]}>
          <GlassCard elevation={5} blurIntensity="heavy" padding="lg" borderRadius="xl">
            {/* Success Icon with Animation */}
            <AnimatedRN.View entering={ZoomIn.delay(200).duration(400)}>
              <AnimatedCheckmark />
            </AnimatedRN.View>

            {/* Title */}
            <AnimatedRN.View entering={FadeInUp.delay(400).duration(400)}>
              <Text style={styles.title}>You're All Set!</Text>
            </AnimatedRN.View>

            {/* Subtitle */}
            <AnimatedRN.View entering={FadeInUp.delay(500).duration(400)}>
              <Text style={styles.subtitle}>
                Welcome to FitAI, <Text style={styles.userName}>{userName}</Text>
              </Text>
              <Text style={styles.description}>
                Your personalized fitness journey begins now. We've crafted a unique experience just for you.
              </Text>
            </AnimatedRN.View>

            {/* Stats Preview */}
            {stats && (
              <AnimatedRN.View 
                entering={FadeInUp.delay(600).duration(400)}
                style={styles.statsContainer}
              >
                <View style={styles.statsRow}>
                  {stats.goal && (
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 107, 107, 0.15)' }]}>
                        <Ionicons name="flag" size={rf(18)} color="#FF6B6B" />
                      </View>
                      <Text style={styles.statLabel}>Goal</Text>
                      <Text style={styles.statValue} numberOfLines={1}>{stats.goal}</Text>
                    </View>
                  )}
                  {stats.workoutsPerWeek && (
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: 'rgba(102, 126, 234, 0.15)' }]}>
                        <Ionicons name="barbell" size={rf(18)} color="#667eea" />
                      </View>
                      <Text style={styles.statLabel}>Weekly</Text>
                      <Text style={styles.statValue}>{stats.workoutsPerWeek} workouts</Text>
                    </View>
                  )}
                  {stats.calorieTarget && (
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="flame" size={rf(18)} color="#10b981" />
                      </View>
                      <Text style={styles.statLabel}>Target</Text>
                      <Text style={styles.statValue}>{stats.calorieTarget} cal</Text>
                    </View>
                  )}
                </View>
              </AnimatedRN.View>
            )}

            {/* Features Preview */}
            <AnimatedRN.View 
              entering={FadeInUp.delay(700).duration(400)}
              style={styles.featuresContainer}
            >
              {[
                { icon: 'sparkles', text: 'AI-powered workout plans', color: '#667eea' },
                { icon: 'nutrition', text: 'Smart meal recommendations', color: '#10b981' },
                { icon: 'trending-up', text: 'Progress tracking & insights', color: '#FF6B6B' },
              ].map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons 
                    name={feature.icon as keyof typeof Ionicons.glyphMap} 
                    size={rf(16)} 
                    color={feature.color} 
                  />
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </AnimatedRN.View>

            {/* CTA Button */}
            <AnimatedRN.View 
              entering={FadeInUp.delay(800).duration(400)}
              style={styles.buttonContainer}
            >
              <AnimatedPressable
                onPress={handleGetStarted}
                scaleValue={0.96}
                hapticFeedback={true}
                hapticType="medium"
                style={styles.button}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Start Your Journey</Text>
                  <Ionicons name="arrow-forward" size={rf(20)} color="#fff" />
                </LinearGradient>
              </AnimatedPressable>
            </AnimatedRN.View>
          </GlassCard>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalContainer: {
    alignSelf: 'center',
  },
  checkmarkContainer: {
    alignSelf: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  checkmarkGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: rf(26),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  subtitle: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  userName: {
    color: '#667eea',
    fontWeight: '700',
  },
  description: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  statsContainer: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: ResponsiveTheme.spacing.xs,
  },
  statItem: {
    flex: 1,
    minWidth: 70,
    maxWidth: 100,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 10,
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: ResponsiveTheme.spacing.xl,
    gap: ResponsiveTheme.spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },
  featureText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.text,
  },
  buttonContainer: {
    width: '100%',
    flexShrink: 0,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});

export default OnboardingCompleteModal;

