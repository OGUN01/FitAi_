import { useState, useRef, useEffect } from "react";
import { Dimensions, PanResponder } from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { PanGestureHandlerGestureEvent } from "react-native-gesture-handler";
import { hapticSwipeAction } from "../utils/haptics";
import { SwipeableCard } from "../components/ui/swipeable/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface UseSwipeableCardStackProps {
  cards: SwipeableCard[];
  onSwipeLeft?: (card: SwipeableCard) => void;
  onSwipeRight?: (card: SwipeableCard) => void;
  onCardChange?: (index: number) => void;
}

export const useSwipeableCardStack = ({
  cards,
  onSwipeLeft,
  onSwipeRight,
  onCardChange,
}: UseSwipeableCardStackProps) => {
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
      translateY.value = ctx.startY + event.translationY * 0.2;
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

  useEffect(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }, [currentIndex]);

  return {
    currentIndex,
    currentCard,
    nextCard,
    translateX,
    translateY,
    gestureHandler,
    panResponder,
    cardAnimatedStyle,
    leftIndicatorStyle,
    rightIndicatorStyle,
  };
};
