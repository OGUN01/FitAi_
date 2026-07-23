import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  PanResponder,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { rf, rp, rh, rw, dimensions } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { hapticSwipeAction } from "../../utils/haptics";

const SCREEN_WIDTH = dimensions.screenWidth;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export interface SwipeableCard {
  id: string;
  title: string;
  description: string;
  iconName: string; // Ionicons name instead of emoji
  gradient: string[];
  details?: string[];
}

interface SwipeableCardStackProps {
  cards: SwipeableCard[];
  onSwipeLeft?: (card: SwipeableCard) => void;
  onSwipeRight?: (card: SwipeableCard) => void;
  onCardChange?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

export const SwipeableCardStack: React.FC<SwipeableCardStackProps> = ({
  cards,
  onSwipeLeft,
  onSwipeRight,
  onCardChange,
  style,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

  const handleSwipeLeft = () => {
    if (currentIndex < cards.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onSwipeLeft?.(currentCard);
      onCardChange?.(newIndex);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex < cards.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onSwipeRight?.(currentCard);
      onCardChange?.(newIndex);
    }
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number; startY: number }
  >({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY * 0.2; // Reduced vertical movement
    },
    onEnd: (event) => {
      const shouldSwipeLeft = translateX.value < -SWIPE_THRESHOLD;
      const shouldSwipeRight = translateX.value > SWIPE_THRESHOLD;

      if (shouldSwipeLeft) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5);
        translateY.value = withSpring(0);
        runOnJS(hapticSwipeAction)();
        runOnJS(handleSwipeLeft)();
      } else if (shouldSwipeRight) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5);
        translateY.value = withSpring(0);
        runOnJS(hapticSwipeAction)();
        runOnJS(handleSwipeRight)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  // Web-compatible PanResponder for gesture handling
  const startPositionRef = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        startPositionRef.current = { x: translateX.value, y: translateY.value };
      },
      onPanResponderMove: (evt, gestureState) => {
        translateX.value = startPositionRef.current.x + gestureState.dx;
        translateY.value = startPositionRef.current.y + gestureState.dy * 0.2;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const shouldSwipeLeft = translateX.value < -SWIPE_THRESHOLD;
        const shouldSwipeRight = translateX.value > SWIPE_THRESHOLD;

        if (shouldSwipeLeft) {
          translateX.value = withSpring(-SCREEN_WIDTH * 1.5);
          translateY.value = withSpring(0);
          hapticSwipeAction();
          handleSwipeLeft();
        } else if (shouldSwipeRight) {
          translateX.value = withSpring(SCREEN_WIDTH * 1.5);
          translateY.value = withSpring(0);
          hapticSwipeAction();
          handleSwipeRight();
        } else {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
        }
      },
    }),
  ).current;

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolate.CLAMP,
    );

    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [1, 0.8],
      Extrapolate.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  const leftIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    );

    return { opacity };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    );

    return { opacity };
  });

  // Reset animation when card changes
  React.useEffect(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }, [currentIndex]);

  if (!currentCard) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.completedContainer}>
          <Text style={styles.completedIcon}>✅</Text>
          <Text style={styles.completedText}>All cards reviewed!</Text>
          <Text style={styles.completedSubtext}>
            You've gone through all {cards.length} options
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Next card (background) */}
      {nextCard && (
        <View style={[styles.card, styles.cardBackground]}>
          <LinearGradient
            colors={nextCard.gradient as unknown as readonly [string, string, ...string[]]}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={nextCard.iconName as ComponentProps<typeof Ionicons>['name']}
              size={rf(36)}
              color={colors.white}
              style={styles.cardIcon}
            />
            <Text style={styles.cardTitle}>{nextCard.title}</Text>
          </LinearGradient>
        </View>
      )}

      {/* Current card (foreground) - Platform-specific gesture handling */}
      {Platform.OS === "web" ? (
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.card, cardAnimatedStyle]}
        >
          <LinearGradient
            colors={currentCard.gradient as unknown as readonly [string, string, ...string[]]}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Swipe indicators */}
            <Animated.View
              style={[
                styles.swipeIndicator,
                styles.swipeLeft,
                leftIndicatorStyle,
              ]}
            >
              <Text style={styles.swipeIndicatorText}>👎 SKIP</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.swipeIndicator,
                styles.swipeRight,
                rightIndicatorStyle,
              ]}
            >
              <Text style={styles.swipeIndicatorText}>👍 LIKE</Text>
            </Animated.View>

            {/* Card content */}
            <View style={styles.cardContent}>
              <Ionicons
                name={currentCard.iconName as ComponentProps<typeof Ionicons>['name']}
                size={rf(36)}
                color={colors.white}
                style={styles.cardIcon}
              />
              <Text style={styles.cardTitle}>{currentCard.title}</Text>
              <Text style={styles.cardDescription}>
                {currentCard.description}
              </Text>

              {currentCard.details && currentCard.details.length > 0 && (
                <View style={styles.detailsContainer}>
                  {currentCard.details.map((detail) => (
                    <Text
                      key={`detail-web-${detail.substring(0, 30)}`}
                      style={styles.detailText}
                    >
                      • {detail}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentIndex + 1} / {cards.length}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.card, cardAnimatedStyle]}>
            <LinearGradient
              colors={currentCard.gradient as unknown as readonly [string, string, ...string[]]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Swipe indicators */}
              <Animated.View
                style={[
                  styles.swipeIndicator,
                  styles.swipeLeft,
                  leftIndicatorStyle,
                ]}
              >
                <Text style={styles.swipeIndicatorText}>👎 SKIP</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.swipeIndicator,
                  styles.swipeRight,
                  rightIndicatorStyle,
                ]}
              >
                <Text style={styles.swipeIndicatorText}>👍 LIKE</Text>
              </Animated.View>

              {/* Card content */}
              <View style={styles.cardContent}>
                <Ionicons
                  name={currentCard.iconName as ComponentProps<typeof Ionicons>['name']}
                  size={rf(36)}
                  color={colors.white}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardTitle}>{currentCard.title}</Text>
                <Text style={styles.cardDescription}>
                  {currentCard.description}
                </Text>

                {currentCard.details && currentCard.details.length > 0 && (
                  <View style={styles.detailsContainer}>
                    {currentCard.details.map((detail) => (
                      <Text
                        key={`detail-native-${detail.substring(0, 30)}`}
                        style={styles.detailText}
                      >
                        • {detail}
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  {currentIndex + 1} / {cards.length}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </PanGestureHandler>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          ← Swipe left to skip • Swipe right to like →
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: rh(240), // Reduced from 400
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  card: {
    width: SCREEN_WIDTH * 0.8, // Slightly narrower
    height: rh(200), // Reduced from 350
    borderRadius: borderRadius.xl,
    position: "absolute",
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
  },

  cardBackground: {
    transform: [{ scale: 0.95 }],
    opacity: 0.5,
  },

  cardGradient: {
    flex: 1,
    padding: spacing.md, // Reduced from xl
    justifyContent: "center",
    alignItems: "center",
  },

  cardContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  cardIcon: {
    marginBottom: spacing.sm, // Reduced from md
  },

  cardTitle: {
    fontSize: fontSize.xl, // Reduced from xxl
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: "center",
    marginBottom: spacing.xs, // Reduced from sm
  },

  cardDescription: {
    fontSize: fontSize.sm, // Reduced from md
    color: colors.glassHighlight,
    textAlign: "center",
    lineHeight: rf(18),
    paddingHorizontal: spacing.md,
  },

  detailsContainer: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
    paddingHorizontal: spacing.xl,
  },

  detailText: {
    fontSize: fontSize.sm,
    color: colors.glassHighlight,
    marginBottom: spacing.xs,
  },

  swipeIndicator: {
    position: "absolute",
    top: spacing.sm, // Reduced from xl
    padding: spacing.xs, // Reduced from md
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },

  swipeLeft: {
    left: spacing.sm, // Reduced from xl
    borderColor: colors.error,
    backgroundColor: colors.errorTint,
  },

  swipeRight: {
    right: spacing.sm, // Reduced from xl
    borderColor: colors.success,
    backgroundColor: colors.successTint,
  },

  swipeIndicatorText: {
    fontSize: fontSize.xs, // Reduced from md
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  progressContainer: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },

  progressText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },

  instructions: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
  },

  instructionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: "italic",
  },

  completedContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },

  completedIcon: {
    fontSize: rf(64),
    marginBottom: spacing.md,
  },

  completedText: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  completedSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
