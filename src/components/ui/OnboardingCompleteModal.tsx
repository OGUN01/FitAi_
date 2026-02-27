/**
 * OnboardingCompleteModal - World-Class Completion Experience
 *
 * Premium glassmorphic modal shown after completing onboarding.
 * Follows UIUX methodology: No emojis, proper icons, animations, haptics.
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AnimatedRN, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { GlassCard } from "./aurora/GlassCard";
import { AnimatedPressable } from "./aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

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
                outputRange: ["-180deg", "0deg"],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[ResponsiveTheme.colors.successAlt, ResponsiveTheme.colors.successAltDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.checkmarkGradient}
      >
        <Ionicons name="checkmark" size={rf(48)} color={ResponsiveTheme.colors.white} />
      </LinearGradient>
    </Animated.View>
  );
};

// Floating particle effect
const FloatingParticle: React.FC<{ delay: number; color: string }> = ({
  delay,
  color,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animationRef: Animated.CompositeAnimation | null = null;
    const timeout = setTimeout(() => {
      animationRef = Animated.loop(
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
        ]),
      );
      animationRef.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      animationRef?.stop();
    };
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

export const OnboardingCompleteModal: React.FC<
  OnboardingCompleteModalProps
> = ({ visible, userName, onGetStarted, stats }) => {
  const { width: screenWidth } = useWindowDimensions();
  const modalWidth = Math.min(screenWidth - 40, 340);

  useEffect(() => {
    if (visible) {
      haptics.success();
    }
  }, [visible, screenWidth, modalWidth]);

  const handleGetStarted = () => {

    haptics.medium();

    onGetStarted();

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
                color={[ResponsiveTheme.colors.successAlt, ResponsiveTheme.colors.primary, ResponsiveTheme.colors.errorLight, ResponsiveTheme.colors.teal][i % 4]}
              />
            ))}
          </View>

          {/* Modal content - centered */}
          <View style={[styles.modalContainer, { width: modalWidth }]}>
            <GlassCard
              elevation={5}
              blurIntensity="heavy"
              padding="lg"
              borderRadius="xl"
            >
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
                  Welcome to FitAI,{" "}
                  <Text style={styles.userName}>{userName}</Text>
                </Text>
                <Text style={styles.description}>
                  Your personalized fitness journey begins now. We've crafted a
                  unique experience just for you.
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
                        <View
                          style={[
                            styles.statIcon,
                            { backgroundColor: ResponsiveTheme.colors.errorTint },
                          ]}
                        >
                          <Ionicons name="flag" size={rf(18)} color={ResponsiveTheme.colors.errorLight} />
                        </View>
                        <Text style={styles.statLabel}>Goal</Text>
                        <Text style={styles.statValue} numberOfLines={1}>
          {stats.goal.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </Text>
                      </View>
                    )}
                    {stats.workoutsPerWeek && (
                      <View style={styles.statItem}>
                        <View
                          style={[
                            styles.statIcon,
                            { backgroundColor: ResponsiveTheme.colors.primaryTint },
                          ]}
                        >
                          <Ionicons
                            name="barbell"
                            size={rf(18)}
                            color={ResponsiveTheme.colors.primary}
                          />
                        </View>
                        <Text style={styles.statLabel}>Weekly</Text>
                        <Text style={styles.statValue}>
                          {stats.workoutsPerWeek} workouts
                        </Text>
                      </View>
                    )}
                    {stats.calorieTarget !== undefined && stats.calorieTarget > 0 && (
                      <View style={styles.statItem}>
                        <View
                          style={[
                            styles.statIcon,
                            { backgroundColor: ResponsiveTheme.colors.successTint },
                          ]}
                        >
                          <Ionicons
                            name="flame"
                            size={rf(18)}
                            color={ResponsiveTheme.colors.successAlt}
                          />
                        </View>
                        <Text style={styles.statLabel}>Target</Text>
                        <Text style={styles.statValue}>
                          {stats.calorieTarget} cal
                        </Text>
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
                  {
                    icon: "sparkles",
                    text: "AI-powered workout plans",
                    color: ResponsiveTheme.colors.primary,
                  },
                  {
                    icon: "nutrition",
                    text: "Smart meal recommendations",
                    color: ResponsiveTheme.colors.successAlt,
                  },
                  {
                    icon: "trending-up",
                    text: "Progress tracking & insights",
                    color: ResponsiveTheme.colors.errorLight,
                  },
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
                    colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>Start Your Journey</Text>
                    <Ionicons name="arrow-forward" size={rf(20)} color={ResponsiveTheme.colors.white} />
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: rp(20),
    paddingVertical: rp(40),
    backgroundColor: ResponsiveTheme.colors.background,
  },
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
    width: rp(8),
    height: rp(8),
    borderRadius: rbr(4),
  },
  modalContainer: {
    alignSelf: "center",
  },
  checkmarkContainer: {
    alignSelf: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  checkmarkGradient: {
    width: rp(80),
    height: rp(80),
    borderRadius: rbr(40),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: ResponsiveTheme.colors.successAlt,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.4)',
  },
  title: {
    fontSize: rf(26),
    fontWeight: ResponsiveTheme.fontWeight.extrabold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  subtitle: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  userName: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
  description: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  statsContainer: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: ResponsiveTheme.spacing.xs,
  },
  statItem: {
    flex: 1,
    minWidth: rp(70),
    maxWidth: rp(100),
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  statIcon: {
    width: rp(32),
    height: rp(32),
    borderRadius: rbr(16),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  statLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(2),
  },
  statValue: {
    fontSize: rf(10),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
  featuresContainer: {
    marginBottom: ResponsiveTheme.spacing.xl,
    gap: ResponsiveTheme.spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },
  featureText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.text,
  },
  buttonContainer: {
    width: "100%",
    flexShrink: 0,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  button: {
    width: "100%",
    borderRadius: rbr(12),
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(8),
    paddingVertical: rp(16),
    paddingHorizontal: rp(24),
    minHeight: rp(56),
  },
  buttonText: {
    fontSize: rf(16),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    letterSpacing: 0.3,
  },
});

export default OnboardingCompleteModal;
