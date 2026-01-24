import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
  Vibration,
} from "react-native";
import { THEME } from "../../utils/constants";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  pullThreshold?: number;
  maxPullDistance?: number;
  hapticFeedback?: boolean;
  style?: any;
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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only handle if scrolled to top and pulling down
      return gestureState.dy > 0 && !isRefreshing;
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

  const getRefreshIcon = () => {
    if (isRefreshing) return "⟳";
    if (canRefresh) return "↑";
    return "↓";
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
          <Animated.Text
            style={[
              styles.refreshIcon,
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
                color: canRefresh
                  ? THEME.colors.primary
                  : THEME.colors.textSecondary,
              },
            ]}
          >
            {getRefreshIcon()}
          </Animated.Text>
          <Text
            style={[
              styles.refreshText,
              {
                color: canRefresh
                  ? THEME.colors.primary
                  : THEME.colors.textSecondary,
              },
            ]}
          >
            {getRefreshText()}
          </Text>
        </View>
      </Animated.View>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const { contentOffset } = event.nativeEvent;
          // Reset pull state if scrolled away from top
          if (contentOffset.y > 0 && (canRefresh || currentPullDistance > 0)) {
            resetPull();
          }
        }}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={{
            transform: [{ translateY: pullDistance }],
          }}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  refreshContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 10,
  },

  refreshContent: {
    alignItems: "center",
    justifyContent: "center",
  },

  refreshIcon: {
    fontSize: 24,
    marginBottom: 4,
  },

  refreshText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium as "500",
  },

  scrollView: {
    flex: 1,
  },
});
