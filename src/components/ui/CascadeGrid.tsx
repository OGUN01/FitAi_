import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ResponsiveTheme } from '../../utils/constants';

interface CascadeGridProps {
  children: React.ReactNode[];
  columns?: number;
  staggerDelay?: number;
  animationType?: 'fade' | 'scale' | 'slide' | 'all';
  style?: ViewStyle;
}

const CascadeItem: React.FC<{
  children: React.ReactNode;
  index: number;
  delay: number;
  animationType: 'fade' | 'scale' | 'slide' | 'all';
}> = ({ children, index, delay, animationType }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const animationDelay = index * delay;

    if (animationType === 'fade' || animationType === 'all') {
      opacity.value = withDelay(
        animationDelay,
        withTiming(1, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      opacity.value = 1;
    }

    if (animationType === 'scale' || animationType === 'all') {
      scale.value = withDelay(
        animationDelay,
        withSpring(1, {
          damping: 15,
          stiffness: 150,
        })
      );
    } else {
      scale.value = 1;
    }

    if (animationType === 'slide' || animationType === 'all') {
      translateY.value = withDelay(
        animationDelay,
        withSpring(0, {
          damping: 20,
          stiffness: 120,
        })
      );
    } else {
      translateY.value = 0;
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.item, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

export const CascadeGrid: React.FC<CascadeGridProps> = ({
  children,
  columns = 1,
  staggerDelay = 100,
  animationType = 'all',
  style,
}) => {
  const childArray = React.Children.toArray(children);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.grid, { gap: ResponsiveTheme.spacing.md }]}>
        {childArray.map((child, index) => (
          <View
            key={index}
            style={[
              styles.gridItem,
              { width: columns === 1 ? '100%' : `${(100 / columns) - 2}%` },
            ]}
          >
            <CascadeItem
              index={index}
              delay={staggerDelay}
              animationType={animationType}
            >
              {child}
            </CascadeItem>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  gridItem: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  item: {
    width: '100%',
  },
});
