import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { rf } from "../../utils/responsive";

interface ParticleBurstProps {
  particleCount?: number;
  colors?: string[];
  duration?: number;
  radius?: number;
  autoPlay?: boolean;
  style?: ViewStyle;
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
}

const ParticleItem: React.FC<{
  particle: Particle;
  progress: Animated.SharedValue<number>;
  radius: number;
}> = ({ particle, progress, radius }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [0, Math.cos(particle.angle) * radius],
      Extrapolate.CLAMP,
    );

    const translateY = interpolate(
      progress.value,
      [0, 1],
      [0, Math.sin(particle.angle) * radius],
      Extrapolate.CLAMP,
    );

    const opacity = interpolate(
      progress.value,
      [0, 0.2, 0.8, 1],
      [0, 1, 1, 0],
      Extrapolate.CLAMP,
    );

    const scale = interpolate(
      progress.value,
      [0, 0.5, 1],
      [0, 1.2, 0.5],
      Extrapolate.CLAMP,
    );

    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const ParticleBurst: React.FC<ParticleBurstProps> = ({
  particleCount = 12,
  colors = ["#4CAF50", "#FF6B35", "#2196F3", "#FF9800", "#9C27B0"],
  duration = 1500,
  radius = 100,
  autoPlay = true,
  style,
}) => {
  const progress = useSharedValue(0);

  // Generate particles
  const particles: Particle[] = [];
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    particles.push({
      id: i,
      angle,
      distance: radius,
      size: rf(8 + Math.random() * 8),
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 100,
    });
  }

  useEffect(() => {
    if (autoPlay) {
      progress.value = 0;
      progress.value = withDelay(
        200,
        withSequence(
          withTiming(1, {
            duration,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, { duration: 0 }),
        ),
      );
    }
  }, [autoPlay]);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {particles.map((particle) => (
        <ParticleItem
          key={particle.id}
          particle={particle}
          progress={progress}
          radius={radius}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },

  particle: {
    position: "absolute",
  },
});
