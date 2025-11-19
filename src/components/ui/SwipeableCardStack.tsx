import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { hapticSwipeAction } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export interface SwipeableCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string[];
  details?: string[];
}

interface SwipeableCardStackProps {
  cards: SwipeableCard[];
  onSwipeLeft?: (card: SwipeableCard) => void;
  onSwipeRight?: (card: SwipeableCard) => void;
  onCardChange?: (index: number) => void;
  style?: any;
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

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [1, 0.8],
      Extrapolate.CLAMP
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
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
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
            colors={nextCard.gradient as any}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.cardIcon}>{nextCard.icon}</Text>
            <Text style={styles.cardTitle}>{nextCard.title}</Text>
          </LinearGradient>
        </View>
      )}

      {/* Current card (foreground) */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <LinearGradient
            colors={currentCard.gradient as any}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Swipe indicators */}
            <Animated.View style={[styles.swipeIndicator, styles.swipeLeft, leftIndicatorStyle]}>
              <Text style={styles.swipeIndicatorText}>👎 SKIP</Text>
            </Animated.View>

            <Animated.View style={[styles.swipeIndicator, styles.swipeRight, rightIndicatorStyle]}>
              <Text style={styles.swipeIndicatorText}>👍 LIKE</Text>
            </Animated.View>

            {/* Card content */}
            <View style={styles.cardContent}>
              <Text style={styles.cardIcon}>{currentCard.icon}</Text>
              <Text style={styles.cardTitle}>{currentCard.title}</Text>
              <Text style={styles.cardDescription}>{currentCard.description}</Text>

              {currentCard.details && currentCard.details.length > 0 && (
                <View style={styles.detailsContainer}>
                  {currentCard.details.map((detail, index) => (
                    <Text key={index} style={styles.detailText}>
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
    height: rh(400),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  card: {
    width: SCREEN_WIDTH * 0.85,
    height: rh(350),
    borderRadius: ResponsiveTheme.borderRadius.xl,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },

  cardBackground: {
    transform: [{ scale: 0.95 }],
    opacity: 0.5,
  },

  cardGradient: {
    flex: 1,
    padding: ResponsiveTheme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  cardIcon: {
    fontSize: rf(64),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  cardTitle: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  cardDescription: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: rf(22),
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  detailsContainer: {
    marginTop: ResponsiveTheme.spacing.lg,
    alignSelf: 'stretch',
    paddingHorizontal: ResponsiveTheme.spacing.xl,
  },

  detailText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  swipeIndicator: {
    position: 'absolute',
    top: ResponsiveTheme.spacing.xl,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 3,
  },

  swipeLeft: {
    left: ResponsiveTheme.spacing.xl,
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },

  swipeRight: {
    right: ResponsiveTheme.spacing.xl,
    borderColor: '#44FF44',
    backgroundColor: 'rgba(68, 255, 68, 0.2)',
  },

  swipeIndicatorText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  progressContainer: {
    position: 'absolute',
    bottom: ResponsiveTheme.spacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },

  instructions: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },

  instructionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: 'italic',
  },

  completedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: ResponsiveTheme.spacing.xl,
  },

  completedIcon: {
    fontSize: rf(64),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  completedText: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  completedSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
