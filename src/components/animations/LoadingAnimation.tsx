import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { THEME } from '../../utils/constants';

interface LoadingAnimationProps {
  type?: 'spinner' | 'dots' | 'pulse' | 'wave';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  style?: any;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'spinner',
  size = 'md',
  color = THEME.colors.primary,
  text,
  style,
}) => {
  const animationValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const dotValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const getSizeValue = () => {
    switch (size) {
      case 'sm':
        return 24;
      case 'md':
        return 40;
      case 'lg':
        return 60;
      default:
        return 40;
    }
  };

  const sizeValue = getSizeValue();

  useEffect(() => {
    if (type === 'spinner') {
      const spinAnimation = Animated.loop(
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }

    if (type === 'pulse') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }

    if (type === 'dots') {
      const dotAnimations = dotValues.map((dotValue, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(dotValue, {
              toValue: 1,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(dotValue, {
              toValue: 0,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        )
      );

      const staggeredAnimation = Animated.stagger(100, dotAnimations);
      staggeredAnimation.start();
      return () => staggeredAnimation.stop();
    }

    if (type === 'wave') {
      const waveAnimation = Animated.loop(
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        })
      );
      waveAnimation.start();
      return () => waveAnimation.stop();
    }
  }, [type, animationValue, pulseValue, dotValues]);

  const renderSpinner = () => {
    const spin = animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={[
          styles.spinner,
          {
            width: sizeValue,
            height: sizeValue,
            borderColor: color + '30',
            borderTopColor: color,
            transform: [{ rotate: spin }],
          },
        ]}
      />
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {dotValues.map((dotValue, index) => {
          const scale = dotValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1.2],
          });

          const opacity = dotValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 1],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: color,
                  width: sizeValue / 4,
                  height: sizeValue / 4,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const renderPulse = () => {
    return (
      <Animated.View
        style={[
          styles.pulse,
          {
            width: sizeValue,
            height: sizeValue,
            backgroundColor: color,
            transform: [{ scale: pulseValue }],
          },
        ]}
      />
    );
  };

  const renderWave = () => {
    const bars = Array.from({ length: 5 }, (_, index) => {
      const delay = index * 0.1;
      const scaleY = animationValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 1, 0.3],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              width: sizeValue / 8,
              height: sizeValue,
              transform: [{ scaleY }],
            },
          ]}
        />
      );
    });

    return <View style={styles.waveContainer}>{bars}</View>;
  };

  const renderAnimation = () => {
    switch (type) {
      case 'spinner':
        return renderSpinner();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'wave':
        return renderWave();
      default:
        return renderSpinner();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {renderAnimation()}
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  spinner: {
    borderWidth: 3,
    borderRadius: 50,
    borderStyle: 'solid',
  },

  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  dot: {
    borderRadius: 50,
  },

  pulse: {
    borderRadius: 50,
  },

  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  waveBar: {
    borderRadius: 2,
  },

  text: {
    marginTop: THEME.spacing.sm,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    textAlign: 'center',
  },
});
