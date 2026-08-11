/**
 * ConcentricRings — Apple Fitness-style nested progress rings for the Diet
 * dashboard. One single SVG, three concentric animated rings:
 *
 *   outer  → calories  (gradient primary→secondary, the hero metric)
 *   middle → protein    (solid blue)
 *   inner  → carbs      (solid amber)
 *
 * Center shows kcal remaining (or overflow / set-a-goal states). A compact
 * macro legend below the rings carries fat (not a ring — rendered as a dash,
 * not a dot, so it's not mistaken for a ring) + reaffirms P/C values so each
 * ring's meaning is unambiguous. Each legend item has a 2px mini progress bar
 * so the legend doubles as a second data viz, not a static table.
 *
 * Uses one shared SVG (no per-ring gradient-id collisions), shared spring
 * tokens (springConfig.smooth) for the draw-on, a count-up + tabular-nums
 * hero number so digits don't reflow, and a staggered legend cascade.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  withSpring,
  runOnJS,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { MACRO_PILL_COLORS } from './macroColors';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import {
  flatColors as colors,
  spacing,
  flatFontSize as fontSize,
  typography,
  flatShadows as shadows,
} from '../../theme/aurora-tokens';
import { springConfig } from '../../theme/animations';
import { fontFamilyForWeight } from '../../theme/fonts';
import { rf, rw } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

// ============================================================================
// TYPES
// ============================================================================

export interface RingValue {
  current: number;
  target: number;
}

export interface ConcentricRingsProps {
  calories: RingValue;
  protein: RingValue;
  carbs: RingValue;
  fat: RingValue;
  testID?: string;
}

// ============================================================================
// GEOMETRY
// ============================================================================

const SIZE = 240; // logical svg box (scaled by rw at render)
const CENTER = SIZE / 2;

// outer → middle → inner. Strokes thinned + radii opened so the inner ring
// clears the hero number (4-digit kcal values at rf(30) need ~36px half-width;
// carbs inner edge at r64 - sw/2 = 59 leaves comfortable margin).
const RINGS = [
  { key: 'calories', radius: 114, strokeWidth: 16 },
  { key: 'protein', radius: 87, strokeWidth: 13 },
  { key: 'carbs', radius: 64, strokeWidth: 10 },
] as const;

// ============================================================================
// ANIMATED PRIMITIVE
// ============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingProps {
  radius: number;
  strokeWidth: number;
  progress: number; // 0-100
  stroke: string;
  backgroundColor: string;
  /** Fired (once, via the parent guard) the first time the spring crosses 100%. */
  onComplete?: () => void;
}

const Ring: React.FC<RingProps> = ({
  radius,
  strokeWidth,
  progress,
  stroke,
  backgroundColor,
  onComplete,
}) => {
  const animatedProgress = useSharedValue(0);
  const circumference = Math.round(radius * 2 * Math.PI);

  useEffect(() => {
    // springConfig.smooth — premium settle, shared across the tab.
    animatedProgress.value = withSpring(progress, {
      damping: springConfig.smooth.damping,
      stiffness: springConfig.smooth.stiffness,
      overshootClamping: false,
    });
  }, [progress, animatedProgress]);

  // Celebration: fire ONCE when the spring first crosses 100% (only rings
  // whose target is exactly 100 ever reach it). The parent's firedRef caps
  // it to a single haptic even if several rings complete together.
  useAnimatedReaction(
    () => animatedProgress.value,
    (val, prev) => {
      'worklet';
      if (val >= 100 && (prev === null || prev === undefined || prev < 100)) {
        if (onComplete) runOnJS(onComplete)();
      }
    },
  );

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const current = Math.round(animatedProgress.value);
    return {
      strokeDashoffset: Math.round(circumference - (circumference * current) / 100),
    };
  });

  return (
    <>
      {/* Track (background band) */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {/* Progress arc (animated draw-on) */}
      <AnimatedCircle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        strokeLinecap="round"
        animatedProps={animatedProps}
        rotation="-90"
        origin={`${CENTER}, ${CENTER}`}
      />
    </>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

// `safe` filters non-finite (NaN/undefined/Infinity) AND clamps negatives to
// 0 so a defensively-negative current can never animate a ring backwards or
// produce a negative-width legend bar.
const safe = (n: number): number => (Number.isFinite(n) ? Math.max(0, n) : 0);
const pct = (current: number, target: number): number =>
  target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;

const ConcentricRingsComponent: React.FC<ConcentricRingsProps> = ({
  calories,
  protein,
  carbs,
  fat,
  testID,
}) => {
  const cCur = safe(calories?.current);
  const cTgt = safe(calories?.target);
  const pCur = safe(protein?.current);
  const pTgt = safe(protein?.target);
  const cbCur = safe(carbs?.current);
  const cbTgt = safe(carbs?.target);
  const fCur = safe(fat?.current);
  const fTgt = safe(fat?.target);

  const isZeroTarget = cTgt <= 0;
  const overflow = !isZeroTarget && cCur > cTgt;
  // Fresh-day state: a goal is set but nothing logged yet. Showing both the
  // hero number AND an "of X kcal" subline renders the same value twice
  // ("1856 / of 1856") — reads as a placeholder. Reframe as the goal instead.
  const isFreshDay = !isZeroTarget && cCur === 0;

  const calProgress = isZeroTarget ? 0 : Math.min(100, (cCur / cTgt) * 100);
  const proProgress = pct(pCur, pTgt);
  const carbProgress = pct(cbCur, cbTgt);

  const scale = rw(1);
  const box = SIZE * scale;

  // Hero number: tabular-nums so digits don't reflow as the count-up animates.
  const heroNumberStyle = styles.heroNumber;

  // One celebration haptic for the whole ring group — fires the first time
  // any ring's spring crosses 100%. Guarded so a multi-ring completion or a
  // spring overshoot never fires more than once.
  const firedRef = useRef(false);
  const handleRingComplete = () => {
    if (!firedRef.current) {
      firedRef.current = true;
      haptics.celebration();
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.container} testID={testID}>
      <View style={[styles.ringBox, { width: box, height: box }]}>
        <Svg width={box} height={box} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Defs>
            <SvgLinearGradient id="caloriesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
              <Stop offset="100%" stopColor={colors.secondary} stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>

          {/* Calories — outer, gradient (or red on overflow) */}
          <Ring
            radius={RINGS[0].radius}
            strokeWidth={RINGS[0].strokeWidth}
            progress={calProgress}
            stroke={overflow ? colors.error : 'url(#caloriesGradient)'}
            backgroundColor={colors.surface}
            onComplete={handleRingComplete}
          />

          {/* Protein — middle, solid */}
          <Ring
            radius={RINGS[1].radius}
            strokeWidth={RINGS[1].strokeWidth}
            progress={proProgress}
            stroke={MACRO_PILL_COLORS.protein}
            backgroundColor={colors.surface}
            onComplete={handleRingComplete}
          />

          {/* Carbs — inner, solid */}
          <Ring
            radius={RINGS[2].radius}
            strokeWidth={RINGS[2].strokeWidth}
            progress={carbProgress}
            stroke={MACRO_PILL_COLORS.carbs}
            backgroundColor={colors.surface}
            onComplete={handleRingComplete}
          />
        </Svg>

        <View style={styles.center}>
          {isZeroTarget ? (
            <>
              <Text style={styles.heroNumber}>—</Text>
              <Text style={styles.heroCaption}>Set a goal</Text>
            </>
          ) : overflow ? (
            <>
              <AnimatedNumber value={Math.round(cCur - cTgt)} prefix="+" style={heroNumberStyle} />
              <Text style={[styles.heroCaption, { color: colors.error }]}>over target</Text>
              <Text style={styles.heroTarget}>of {Math.round(cTgt)} kcal</Text>
            </>
          ) : isFreshDay ? (
            <>
              <AnimatedNumber value={Math.round(cTgt)} style={heroNumberStyle} />
              <Text style={styles.heroCaption}>kcal goal</Text>
            </>
          ) : (
            <>
              <AnimatedNumber value={Math.round(Math.max(0, cTgt - cCur))} style={heroNumberStyle} />
              <Text style={styles.heroCaption}>kcal left</Text>
              <Text style={styles.heroTarget}>of {Math.round(cTgt)} kcal</Text>
            </>
          )}
        </View>
      </View>

      {/* Macro legend — Protein/Carbs are rings (round dot), so their legend
          rows stay numeric-only (the ring already shows their progress; a
          second 2px bar restated the same fill). Fat is tracked but not a
          ring (dash glyph), so it keeps the 2px mini bar as its only
          progress viz. Cascades in after the rings draw. */}
      <View style={styles.legend}>
        <Animated.View entering={FadeIn.delay(400).duration(300)}>
          <LegendItem
            color={MACRO_PILL_COLORS.protein}
            label="Protein"
            current={pCur}
            target={pTgt}
            glyph="dot"
          />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(480).duration(300)}>
          <LegendItem
            color={MACRO_PILL_COLORS.carbs}
            label="Carbs"
            current={cbCur}
            target={cbTgt}
            glyph="dot"
          />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(560).duration(300)}>
          <LegendItem
            color={MACRO_PILL_COLORS.fat}
            label="Fat"
            current={fCur}
            target={fTgt}
            glyph="dash"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// LEGEND
// ============================================================================

interface LegendItemProps {
  color: string;
  label: string;
  current: number;
  target: number;
  glyph: 'dot' | 'dash';
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label, current, target, glyph }) => {
  const progress = pct(current, target);
  return (
    <View style={styles.legendItem}>
      {glyph === 'dot' ? (
        <View style={[styles.legendDot, { backgroundColor: color }]} />
      ) : (
        // Fat is tracked but not a ring — a dash signals "not a ring".
        <View style={[styles.legendDash, { backgroundColor: color }]} />
      )}
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>
        {target > 0 ? `${Math.round(current)}/${Math.round(target)}g` : '—'}
      </Text>
      {/* Mini progress bar only for non-ring macros (Fat) — ringed macros
          already show this exact fill on the ring above. */}
      {glyph === 'dash' ? (
        <View style={styles.legendBarTrack}>
          <View
            style={[
              styles.legendBarFill,
              { width: `${progress}%`, backgroundColor: color },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
};

// Memoized: DietScreen re-renders on every keystroke of its unrelated local
// input state (label-scan grams, photo weight, etc.); the three-ring SVG/
// gradient computation here is expensive enough that it shouldn't re-run
// unless its own primitive/object props actually changed.
export const ConcentricRings = React.memo(ConcentricRingsComponent);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  ringBox: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    // Lightest flat shadow — separation on Editorial Dark comes from the
    // surface step + hairlines, not cast shadows.
    ...(shadows.sm as object),
  },
  center: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNumber: {
    fontSize: rf(30),
    fontFamily: fontFamilyForWeight('extrabold'),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.text,
    fontVariant: ['tabular-nums'] as any,
  },
  heroCaption: {
    fontSize: rf(fontSize.xs),
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroTarget: {
    fontSize: rf(fontSize.micro),
    color: colors.textMuted,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  legendItem: {
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: rw(72),
  },
  legendDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
    marginBottom: spacing.xxs,
  },
  legendDash: {
    width: rw(14),
    height: rw(3),
    borderRadius: rw(1.5),
    marginBottom: spacing.xxs,
  },
  legendLabel: {
    fontSize: rf(fontSize.xs),
    color: colors.textSecondary,
    fontFamily: fontFamilyForWeight('600'),
    fontWeight: '600' as any,
  },
  legendValue: {
    fontSize: rf(fontSize.sm),
    color: colors.text,
    fontFamily: fontFamilyForWeight('600'),
    fontWeight: '600' as any,
  },
  legendBarTrack: {
    width: '100%',
    height: 2,
    backgroundColor: colors.surface,
    borderRadius: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  legendBarFill: {
    height: '100%',
    borderRadius: 1,
  },
});

export default ConcentricRings;
