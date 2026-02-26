/**
 * NutritionOverview Component
 * Compact Apple Fitness-style nutrition rings with macros
 * Fixes Issues #2, #3 - Single source of truth for nutrition data
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withDelay,
  FadeIn,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Macro ring colors
const MACROS = {
  protein: {
    color: ResponsiveTheme.colors.errorLight,
    gradientEnd: "#FF8E53",
    icon: "fitness" as const,
    label: "Protein",
  },
  carbs: {
    color: ResponsiveTheme.colors.teal,
    gradientEnd: "#44A08D",
    icon: "leaf" as const,
    label: "Carbs",
  },
  fat: {
    color: ResponsiveTheme.colors.amber,
    gradientEnd: ResponsiveTheme.colors.warning,
    icon: "water" as const,
    label: "Fat",
  },
};

interface NutritionOverviewProps {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
  onPress?: () => void;
}

// Single Ring Component
const Ring: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  gradientEnd: string;
  gradientId: string;
  delay?: number;
}> = ({
  progress,
  size,
  strokeWidth,
  color,
  gradientEnd,
  gradientId,
  delay = 0,
}) => {
  const animatedProgress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  useEffect(() => {
    animatedProgress.value = withDelay(
      delay,
      withSpring(Math.min(progress, 100), { damping: 15, stiffness: 80 }),
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset:
      circumference - (circumference * animatedProgress.value) / 100,
  }));

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={gradientEnd} />
        </LinearGradient>
      </Defs>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={`${color}15`}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeLinecap="round"
        rotation="-90"
        origin={`${center}, ${center}`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
};

export const NutritionOverview: React.FC<NutritionOverviewProps> = ({
  calories,
  protein,
  carbs,
  fat,
  onPress,
}) => {
  // Calculate percentages - guard against division by zero
  const calorieProgress =
    calories.target > 0
      ? Math.min((calories.current / calories.target) * 100, 100)
      : 0;
  const caloriesRemaining = Math.max(calories.target - calories.current, 0);

  // Ring sizes
  const outerSize = rw(160);
  const strokeWidth = rw(14);

  return (
    <Animated.View entering={FadeIn.duration(400).delay(100)}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="light"
      >
        <GlassCard
          elevation={2}
          blurIntensity="light"
          padding="md"
          borderRadius="lg"
        >
          <View style={styles.container}>
            {/* Calorie Ring */}
            <View
              style={[
                styles.ringContainer,
                { width: outerSize, height: outerSize },
              ]}
            >
              <Ring
                progress={calorieProgress}
                size={outerSize}
                strokeWidth={strokeWidth}
                color={ResponsiveTheme.colors.primary}
                gradientEnd={ResponsiveTheme.colors.primaryLight}
                gradientId="calorieGrad"
                delay={0}
              />
              <View style={styles.centerContent}>
                <Text style={styles.calorieValue}>{caloriesRemaining}</Text>
                <Text style={styles.calorieLabel}>cal left</Text>
                <Text style={styles.calorieTarget}>of {calories.target}</Text>
              </View>
            </View>

            {/* Macros Column */}
            <View style={styles.macrosContainer}>
              {/* Protein */}
              <MacroRow
                icon={MACROS.protein.icon}
                label={MACROS.protein.label}
                current={protein.current}
                target={protein.target}
                color={MACROS.protein.color}
                delay={100}
              />
              {/* Carbs */}
              <MacroRow
                icon={MACROS.carbs.icon}
                label={MACROS.carbs.label}
                current={carbs.current}
                target={carbs.target}
                color={MACROS.carbs.color}
                delay={200}
              />
              {/* Fat */}
              <MacroRow
                icon={MACROS.fat.icon}
                label={MACROS.fat.label}
                current={fat.current}
                target={fat.target}
                color={MACROS.fat.color}
                delay={300}
              />
            </View>
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

// Macro Row Component
const MacroRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  current: number;
  target: number;
  color: string;
  delay: number;
}> = ({ icon, label, current, target, color, delay }) => {
  // Guard against division by zero
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    progressAnim.value = withDelay(
      delay,
      withSpring(progress, { damping: 15, stiffness: 80 }),
    );
  }, [progress]);

  return (
    <View style={styles.macroRow}>
      <View
        style={[styles.macroIconContainer, { backgroundColor: `${color}15` }]}
      >
        <Ionicons name={icon} size={rf(14)} color={color} />
      </View>
      <View style={styles.macroInfo}>
        <View style={styles.macroHeader}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={styles.macroValue}>
            {Math.round(current)}
            <Text style={styles.macroUnit}>/{target}g</Text>
          </Text>
        </View>
        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: `${progress}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.lg,
  },
  ringContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
  },
  calorieValue: {
    fontSize: rf(28),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
  },
  calorieLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  calorieTarget: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textMuted || `${ResponsiveTheme.colors.white}66`,
    marginTop: rp(2),
  },
  macrosContainer: {
    flex: 1,
    gap: ResponsiveTheme.spacing.md,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  macroIconContainer: {
    width: rw(32),
    height: rw(32),
    borderRadius: rbr(8),
    justifyContent: "center",
    alignItems: "center",
  },
  macroInfo: {
    flex: 1,
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(4),
  },
  macroLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  macroValue: {
    fontSize: rf(12),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  macroUnit: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  progressBarBg: {
    height: rh(4),
    borderRadius: rbr(2),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: rbr(2),
  },
});

export default NutritionOverview;
