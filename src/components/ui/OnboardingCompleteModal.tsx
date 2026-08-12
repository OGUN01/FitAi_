/**
 * OnboardingCompleteModal - World-Class Completion Experience
 *
 * Full-screen Editorial Dark payoff shown after completing onboarding:
 * flat surface + hairline, one accent CTA (GlassButton), celebration
 * particles as the purposeful brand moment. No glass, no filler gradients.
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedRN, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { GlassButton } from "./aurora/GlassButton";
import { flatColors as colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { useReducedMotion, getAccessibleDuration } from "../../utils/accessibility/hooks";

interface OnboardingCompleteModalProps {
  visible: boolean;
  /** Real first name only — omitted (never placeholder-substituted) when the
   * profile value is unavailable. */
  userName?: string;
  onGetStarted: () => void;
  /** Shows the CTA's loading spinner + disables interaction while the async
   * handoff to MainNavigation is in flight (mirrors GlassButton's own
   * `loading` semantics). @default false */
  loading?: boolean;
  stats?: {
    workoutsPerWeek?: number;
    calorieTarget?: number;
    goal?: string;
  };
}

// Animated checkmark component
const AnimatedCheckmark: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => {
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const rotation = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    // Reduce Motion: skip the spring/rotate spin and land straight on the
    // settled end state (scale=1, rotation=1) — see aurora/Confetti and
    // aurora/AnimatedPressable for the same skip-to-end-state pattern.
    if (reduceMotion) {
      scale.setValue(1);
      rotation.setValue(1);
      return;
    }

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
  }, [reduceMotion]);

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
      <View style={styles.checkmarkDisc}>
        <Ionicons name="checkmark" size={rf(48)} color={colors.white} />
      </View>
    </Animated.View>
  );
};

// Floating particle effect
const FloatingParticle: React.FC<{ delay: number; color: string; reduceMotion: boolean }> = ({
  delay,
  color,
  reduceMotion,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reduce Motion: skip the infinite float/fade/drift loop entirely —
    // particles are a purely decorative celebration flourish, so under
    // Reduce Motion they simply stay at their settled (invisible) state.
    if (reduceMotion) return;

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
  }, [delay, reduceMotion]);

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
> = ({ visible, userName, onGetStarted, loading = false, stats }) => {
  const { width: screenWidth } = useWindowDimensions();
  const modalWidth = Math.min(screenWidth - 40, 340);
  const reduceMotion = useReducedMotion();
  // Reduce Motion: land immediately (no staggered delay) with a short,
  // near-instant fade instead of the full 400ms entrance.
  const entranceDelay = (ms: number) => (reduceMotion ? 0 : ms);
  const entranceDuration = getAccessibleDuration(400, reduceMotion);

  useEffect(() => {
    if (visible) {
      haptics.success();
    }
  }, [visible, screenWidth, modalWidth]);

  const handleGetStarted = () => {

    haptics.medium();

    onGetStarted();

  };

  // NOTE: do NOT early-return on !visible — see CustomDialog's DialogShell
  // for the same pattern. The native Modal relies on its `visible` prop
  // transitioning true→false to play animationType="fade"'s fade-out;
  // unmounting on that same render pass skips the fade-out entirely.
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
                color={[colors.successAlt, colors.primary, colors.errorLight, colors.teal][i % 4]}
                reduceMotion={reduceMotion}
              />
            ))}
          </View>

          {/* Modal content - centered flat surface with hairline edge */}
          <View style={[styles.modalContainer, { width: modalWidth }]}>
            <View style={styles.surface}>
              {/* Success Icon with Animation */}
              <AnimatedRN.View entering={ZoomIn.delay(entranceDelay(200)).duration(entranceDuration)}>
                <AnimatedCheckmark reduceMotion={reduceMotion} />
              </AnimatedRN.View>

              {/* Title */}
              <AnimatedRN.View entering={FadeInUp.delay(entranceDelay(400)).duration(entranceDuration)}>
                <Text style={styles.title}>You're All Set!</Text>
              </AnimatedRN.View>

              {/* Subtitle */}
              <AnimatedRN.View entering={FadeInUp.delay(entranceDelay(500)).duration(entranceDuration)}>
                <Text style={styles.subtitle}>
                  Welcome to FitAI
                  {userName ? (
                    <>
                      , <Text style={styles.userName}>{userName}</Text>
                    </>
                  ) : null}
                </Text>
                <Text style={styles.description}>
                  Your personalized fitness journey begins now. We've crafted a
                  unique experience just for you.
                </Text>
              </AnimatedRN.View>

              {/* Stats Preview */}
              {stats && (
                <AnimatedRN.View
                  entering={FadeInUp.delay(entranceDelay(600)).duration(entranceDuration)}
                  style={styles.statsContainer}
                >
                  <View style={styles.statsRow}>
                    {stats.goal && (
                      <View style={styles.statItem}>
                        <View
                          style={[
                            styles.statIcon,
                            { backgroundColor: colors.errorTint },
                          ]}
                        >
                          <Ionicons name="flag" size={rf(18)} color={colors.errorLight} />
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
                            { backgroundColor: colors.primaryTint },
                          ]}
                        >
                          <Ionicons
                            name="barbell"
                            size={rf(18)}
                            color={colors.primary}
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
                            { backgroundColor: colors.successTint },
                          ]}
                        >
                          <Ionicons
                            name="flame"
                            size={rf(18)}
                            color={colors.successAlt}
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
                entering={FadeInUp.delay(entranceDelay(700)).duration(entranceDuration)}
                style={styles.featuresContainer}
              >
                {[
                  {
                    icon: "sparkles",
                    text: "AI-powered workout plans",
                    color: colors.primary,
                  },
                  {
                    icon: "nutrition",
                    text: "Smart meal recommendations",
                    color: colors.successAlt,
                  },
                  {
                    icon: "trending-up",
                    text: "Progress tracking & insights",
                    color: colors.errorLight,
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
                entering={FadeInUp.delay(entranceDelay(800)).duration(entranceDuration)}
                style={styles.buttonContainer}
              >
                <GlassButton
                  label="Start Your Journey"
                  onPress={handleGetStarted}
                  icon="arrow-forward"
                  fullWidth
                  loading={loading}
                  hapticType="medium"
                  accessibilityLabel="Start Your Journey"
                />
              </AnimatedRN.View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: rp(20),
    paddingVertical: rp(40),
    backgroundColor: colors.background,
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
  // Editorial Dark flat surface: depth from hairline + type hierarchy, never
  // from blur or cast shadows.
  surface: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  checkmarkContainer: {
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  checkmarkDisc: {
    width: rp(80),
    height: rp(80),
    borderRadius: rbr(40),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.successAlt,
  },
  title: {
    fontSize: rf(26),
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: rf(16),
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  userName: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  description: {
    fontSize: rf(13),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    marginBottom: spacing.lg,
  },
  statsContainer: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: spacing.xs,
  },
  statItem: {
    flex: 1,
    minWidth: rp(70),
    maxWidth: rp(100),
    alignItems: "center",
    backgroundColor: colors.backgroundTertiary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statIcon: {
    width: rp(32),
    height: rp(32),
    borderRadius: rbr(16),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
  statValue: {
    fontSize: rf(10),
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  featuresContainer: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  featureText: {
    fontSize: rf(13),
    color: colors.text,
  },
  buttonContainer: {
    width: "100%",
    flexShrink: 0,
    marginTop: spacing.sm,
  },
});

export default OnboardingCompleteModal;
