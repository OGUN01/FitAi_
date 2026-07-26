import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
  Vibration,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rp } from '../../utils/responsive';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  pullThreshold?: number;
  maxPullDistance?: number;
  hapticFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  refreshing = false,
  pullThreshold = 80,
  maxPullDistance = 120,
  hapticFeedback = true,
  style,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const [currentPullDistance, setCurrentPullDistance] = useState(0);
  const pullDistance = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  // Track the latest contentOffset.y so the PanResponder can decide whether
  // the ScrollView is scrolled to top before hijacking the gesture. Reading
  // this from a ref avoids stale-closure bugs that would otherwise hijack
  // pull-down gestures while the user is mid-scroll.
  const scrollOffsetRef = useRef(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only handle if the ScrollView is at the very top AND the user is
      // pulling down. This prevents hijacking mid-scroll gestures.
      const atTop = scrollOffsetRef.current <= 0;
      return atTop && gestureState.dy > 0 && !isRefreshing;
    },

    onPanResponderGrant: () => {
      pullDistance.setValue(0);
    },

    onPanResponderMove: (_, gestureState) => {
      if (isRefreshing) return;

      const { dy } = gestureState;
      if (dy > 0) {
        // Apply resistance to the pull
        const resistance = Math.min(dy * 0.5, maxPullDistance);
        pullDistance.setValue(resistance);
        setCurrentPullDistance(resistance);

        // Update refresh state
        const shouldRefresh = resistance >= pullThreshold;
        if (shouldRefresh !== canRefresh) {
          setCanRefresh(shouldRefresh);
          if (hapticFeedback) {
            Vibration.vibrate(10);
          }
        }

        // Animate rotation and scale
        const progress = Math.min(resistance / pullThreshold, 1);
        rotationValue.setValue(progress * 360);
        scaleValue.setValue(progress);
      }
    },

    onPanResponderRelease: () => {
      if (canRefresh && !isRefreshing) {
        triggerRefresh();
      } else {
        resetPull();
      }
    },
  });

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setCanRefresh(false);

    // Animate to refresh position
    Animated.timing(pullDistance, {
      toValue: pullThreshold,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // Start rotation animation
    const rotationAnimation = Animated.loop(
      Animated.timing(rotationValue, {
        toValue: 360,
        duration: 1000,
        useNativeDriver: true,
      }),
    );
    rotationAnimation.start();

    try {
      await onRefresh();
    } finally {
      rotationAnimation.stop();
      setIsRefreshing(false);
      resetPull();
    }
  };

  const resetPull = () => {
    Animated.parallel([
      Animated.timing(pullDistance, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotationValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setCanRefresh(false);
  };

  const getRefreshText = () => {
    if (isRefreshing) return "Refreshing...";
    if (canRefresh) return "Release to refresh";
    return "Pull to refresh";
  };

  const getRefreshIconName = (): React.ComponentProps<typeof Ionicons>["name"] => {
    if (isRefreshing) return "refresh";
    if (canRefresh) return "arrow-up";
    return "arrow-down";
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    scrollOffsetRef.current = contentOffset.y;
    // Reset pull state if scrolled away from top
    if (contentOffset.y > 0 && (canRefresh || currentPullDistance > 0)) {
      resetPull();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Refresh Indicator */}
      <Animated.View
        style={[
          styles.refreshContainer,
          {
            height: pullDistance,
            opacity: pullDistance.interpolate({
              inputRange: [0, pullThreshold],
              outputRange: [0, 1],
              extrapolate: "clamp",
            }),
          },
        ]}
      >
        <View style={styles.refreshContent}>
          <Animated.View
            style={[
              styles.refreshIconWrap,
              {
                transform: [
                  {
                    rotate: rotationValue.interpolate({
                      inputRange: [0, 360],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                  { scale: scaleValue },
                ],
              },
            ]}
          >
            <Ionicons
              name={getRefreshIconName()}
              size={rf(24)}
              color={canRefresh ? colors.primary : colors.textSecondary}
            />
          </Animated.View>
          <Text
            style={[
              styles.refreshText,
              {
                color: canRefresh
                  ? colors.primary
                  : colors.textSecondary,
              },
            ]}
            numberOfLines={1}
          >
            {getRefreshText()}
          </Text>
        </View>
      </Animated.View>

      {/*
        ScrollView with contentOffset tracking. The pull-down PanResponder
        only engages when contentOffset.y === 0, so it can never hijack a
        mid-scroll gesture. The animated indicator above the ScrollView
        grows/shrinks in sync with pullDistance so the refresh indicator and
        the content translate together — the previous implementation wrapped
        children in a translated Animated.View which left the indicator
        visually disconnected from the scroll content.
      */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{
          transform: [{ translateY: pullDistance }],
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        {...panResponder.panHandlers}
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  refreshContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: colors.background,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: rp(10),
  },

  refreshContent: {
    alignItems: "center",
    justifyContent: "center",
  },

  refreshIconWrap: {
    marginBottom: rp(4),
  },

  refreshText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium as "500",
  },

  scrollView: {
    flex: 1,
  },
});

