import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  useWindowDimensions,
  PanResponder,
  StyleSheet,
} from "react-native";
import { Achievement } from "../../services/achievementEngine";
import {
  surface,
  chart,
  colors,
  typography,
  spacing,
} from "../../theme/aurora-tokens";
import { rf, rp } from "../../utils/responsive";
import { hexToRgba, getReadableTextColor } from "../../utils/colors";
import useAchievementStore from "../../stores/achievementStore";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { TIER_COLOR_MAP as tierColorMap } from "../../data/achievements/tierColors";
import { DialogShell } from "../ui/CustomDialog";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface AchievementCelebrationProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

// Solid-color "gradient" (both stops equal) derived from the shared tier map
// so this stays in lockstep with tierColorMap instead of hand-duplicating it.
const tierGradientMap: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(tierColorMap).map(([tier, color]) => [tier, [color, color]]),
) as Record<string, [string, string]>;

// WCAG relative-luminance check so text/icons stay legible against whichever
// tier accent they're placed on (bright tiers like gold/silver need a dark
// label; darker tiers like platinum read fine with white). Re-exported here
// (moved to src/utils/colors.ts as the single source of truth) so existing
// imports from AchievementCard/AchievementDetailModal keep working.
export { getReadableTextColor };

const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  visible,
  achievement,
  onClose,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { markCelebrationShown } = useAchievementStore();
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const confettiAnimations = useRef<Animated.CompositeAnimation[]>([]);

  const confetti = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(-50),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(0.4 + Math.random() * 0.6),
      color: [chart[1], chart[2], chart[3], chart[4], chart[5], chart[6]][i % 6],
    })),
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dy > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.8) {
          handleClose();
        } else if (reducedMotionRef.current) {
          slideAnim.setValue(0);
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible && achievement) {
      slideAnim.setValue(reducedMotion ? 0 : screenHeight);
      scaleAnim.setValue(reducedMotion ? 1 : 0);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);

      if (reducedMotion) {
        confettiAnimations.current.forEach((anim) => anim.stop());
        confettiAnimations.current = [];

        const timer = setTimeout(() => {
          handleClose();
        }, 8000);

        return () => clearTimeout(timer);
      }

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();

      startConfettiAnimation();

      const timer = setTimeout(() => {
        handleClose();
      }, 8000);

      return () => {
        clearTimeout(timer);
        pulseAnimation.stop();
        confettiAnimations.current.forEach((anim) => anim.stop());
        confettiAnimations.current = [];
      };
    }
  }, [visible, achievement, reducedMotion, screenHeight]);

  const startConfettiAnimation = () => {
    confettiAnimations.current.forEach((anim) => anim.stop());
    confettiAnimations.current = [];

    confetti.forEach((item) => {
      item.x.setValue(Math.random() * screenWidth);
      item.y.setValue(-50);
      item.rotation.setValue(0);

      const animation = Animated.parallel([
        Animated.timing(item.y, {
          toValue: screenHeight + 100,
          duration: 2500 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.timing(item.rotation, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ),
      ]);
      confettiAnimations.current.push(animation);
      animation.start();
    });
  };

  const handleClose = () => {
    if (achievement) {
      markCelebrationShown(achievement.id);
    }

    if (reducedMotionRef.current) {
      onClose();
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible || !achievement) {
    return null;
  }

  const tierColor = tierColorMap[achievement.tier] ?? chart[1];
  const tierGradient = tierGradientMap[achievement.tier] ?? [chart[1], chart[1]];
  const closeTextColor = getReadableTextColor(tierColor);
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <DialogShell visible={visible} animationType="none" onRequestClose={handleClose} bare>
      <View style={styles.overlay}>
        {/* Confetti particle burst */}
        {!reducedMotion && confetti.map((item, index) => (
          <Animated.View
            key={index}
            accessibilityLabel="Celebration confetti"
            accessibilityRole="image"
            accessible={false}
            style={[
              styles.confetti,
              {
                backgroundColor: item.color,
                transform: [
                  { translateX: item.x },
                  { translateY: item.y },
                  { scale: item.scale },
                  {
                    rotate: item.rotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {/* Achievement Modal */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.achievementCard,
              {
                backgroundColor: surface[2],
                transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
              },
            ]}
          >
            {/* Tier gradient hero ring */}
            <View style={[styles.heroRing, { borderColor: tierColor }]}>
              <Animated.Text
                style={[
                  styles.achievementIcon,
                  {
                    transform: [{ rotate: spin }],
                  },
                ]}
              >
                {achievement.icon}
              </Animated.Text>
            </View>

            {/* Tier Badge */}
            <View
              style={[
                styles.tierBadge,
                { backgroundColor: hexToRgba(tierColor, 0.18) },
              ]}
            >
              <Text style={[styles.tierText, { color: tierColor }]} numberOfLines={1}>
                {achievement.tier} Achievement
              </Text>
            </View>

            {/* Achievement Details */}
            <View style={styles.detailsContainer}>
              <Text style={styles.celebrationText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                Achievement Unlocked!
              </Text>

              <Text style={styles.titleText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                {achievement.title}
              </Text>

              <Text style={styles.descriptionText} numberOfLines={4}>
                {achievement.description}
              </Text>

              {/* Reward */}
              <View style={styles.rewardContainer}>
                <Text style={styles.rewardText} numberOfLines={2}>
                  {achievement.reward.description}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <AnimatedPressable
              onPress={handleClose}
              scaleValue={0.95}
              style={[styles.closeButton, { backgroundColor: tierColor }]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss celebration"
              accessibilityHint="Closes the achievement celebration"
            >
              <Text style={[styles.closeButtonText, { color: closeTextColor }]}>
                Awesome!
              </Text>
            </AnimatedPressable>

            {/* Swipe Indicator */}
            <View style={styles.swipeIndicatorContainer}>
              <View style={styles.swipeIndicator} />
              <Text style={styles.swipeText}>Swipe down to close</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </DialogShell>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  confetti: {
    position: "absolute",
    width: rp(10),
    height: rp(10),
    borderRadius: rp(5),
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  achievementCard: {
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    maxWidth: rp(320),
    width: "100%",
  },
  heroRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  achievementIcon: {
    fontSize: rf(48),
  },
  tierBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  tierText: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(12),
    textTransform: "capitalize",
  },
  detailsContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  celebrationText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: rf(24),
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  titleText: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(20),
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  descriptionText: {
    ...typography.variants.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  rewardContainer: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: spacing.md,
    width: "100%",
  },
  rewardText: {
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.primary,
    textAlign: "center",
  },
  closeButton: {
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignSelf: "center",
  },
  closeButtonText: {
    fontFamily: "Manrope_700Bold",
    color: colors.text.primary,
    fontSize: rf(16),
  },
  swipeIndicatorContainer: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  swipeIndicator: {
    width: 32,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  swipeText: {
    ...typography.variants.caption,
    color: "rgba(255,255,255,0.5)",
    marginTop: spacing.xs,
  },
});

export default AchievementCelebration;
