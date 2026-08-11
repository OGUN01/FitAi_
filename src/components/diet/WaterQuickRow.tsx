import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ProgressRing } from '../ui/aurora/ProgressRing';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../../theme/aurora-tokens';
import { rf, rh, rw } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW } from '../../utils/colors';
import { fontFamilyForWeight } from '../../theme/fonts';

export interface WaterQuickRowProps {
  intakeML: number;
  goalML: number;
  onAddWater: (ml: number) => void;
  onOpenDetails: () => void;
  testID?: string;
}

const safe = (n: number): number => (Number.isFinite(n) ? n : 0);
const GLASS_ML = 250;

const QUICK_AMOUNTS = [250, 500, 1000] as const;

const formatAmount = (ml: number): string => (ml >= 1000 ? '+1L' : `+${ml}`);

const WaterQuickRowComponent: React.FC<WaterQuickRowProps> = ({
  intakeML,
  goalML,
  onAddWater,
  onOpenDetails,
  testID,
}) => {
  const intake = safe(intakeML);
  const goal = safe(goalML);
  const pct = goal > 0 ? Math.min(100, (intake / goal) * 100) : 0;
  const intakeL = (intake / 1000).toFixed(1);
  const goalL = (goal / 1000).toFixed(1);
  const glasses = Math.round(intake / GLASS_ML);
  const isGoalReached = goal > 0 && intake >= goal;

  const [expanded, setExpanded] = useState(false);
  const expandHeight = useSharedValue(0);
  const expandOpacity = useSharedValue(0);

  const EXPAND_TARGET = Math.max(rh(48), 48);

  const openExpand = () => {
    expandHeight.value = withSpring(EXPAND_TARGET, {
      damping: 18,
      stiffness: 200,
    });
    expandOpacity.value = withTiming(1, { duration: 150 });
  };

  const closeExpand = () => {
    expandOpacity.value = withTiming(0, { duration: 120 });
    expandHeight.value = withSpring(0, { damping: 18, stiffness: 200 });
  };

  const toggleExpand = () => {
    if (expanded) {
      closeExpand();
      setExpanded(false);
    } else {
      openExpand();
      setExpanded(true);
    }
  };

  const selectAmount = (ml: number) => {
    onAddWater(ml);
    closeExpand();
    setExpanded(false);
  };

  const expandStyle = useAnimatedStyle(() => ({
    height: expandHeight.value,
    opacity: expandOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(250).duration(400)}
      style={styles.container}
      testID={testID}
    >
      {/* Body: ring + label/caption. Tapping opens the water tracker modal. */}
      <AnimatedPressable
        onPress={onOpenDetails}
        scaleValue={0.99}
        hapticType="light"
        accessibilityRole="button"
        accessibilityLabel="Open water tracker"
        style={styles.body}
      >
        <ProgressRing
          progress={pct}
          size={rw(52)}
          strokeWidth={rw(7)}
          color={colors.info}
          showText={false}
          backgroundColor={colors.backgroundTertiary}
        >
          <Ionicons name="water" size={rf(18)} color={colors.info} />
        </ProgressRing>
        <View style={styles.textBlock}>
          <Text style={styles.label} numberOfLines={1}>
            Water
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {goal > 0 ? (
              <>
                <Text
                  style={[
                    styles.captionCurrent,
                    isGoalReached && styles.captionCurrentReached,
                  ]}
                >
                  {intakeL}
                </Text>
                <Text style={styles.captionGoal}> / {goalL} L</Text>
              </>
            ) : (
              <Text style={styles.captionCurrent}>{intakeL} L</Text>
            )}
          </Text>
        </View>
        <View style={styles.glassesChip}>
          <Text style={styles.glasses} numberOfLines={1}>
            {glasses} glass{glasses === 1 ? '' : 'es'}
          </Text>
        </View>
      </AnimatedPressable>

      {/* Quick-add cluster: default +250 chip + chevron; expands to a row of pills */}
      <View style={styles.quickAddCluster}>
        <View style={styles.quickAddTop}>
          <AnimatedPressable
            onPress={() => selectAmount(250)}
            scaleValue={0.94}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Add 250 ml water"
            style={styles.quickAdd}
          >
            <Text style={styles.quickAddText} numberOfLines={1}>
              +250
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={toggleExpand}
            scaleValue={0.94}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Collapse quick add options' : 'Expand quick add options'
            }
            style={styles.chevron}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={rf(16)}
              color={colors.info}
            />
          </AnimatedPressable>
        </View>
        <Animated.View
          style={[styles.expandedRow, expandStyle]}
          pointerEvents={expanded ? 'auto' : 'none'}
        >
          <View style={styles.pillsRow}>
            {QUICK_AMOUNTS.map((ml, index) => (
              <Animated.View
                key={ml}
                entering={ZoomIn.delay(index * 40).duration(200)}
                style={styles.pillWrap}
              >
                <AnimatedPressable
                  onPress={() => selectAmount(ml)}
                  scaleValue={0.94}
                  hapticType="light"
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${ml} ml water`}
                  style={styles.pill}
                >
                  <Text style={styles.pillText} numberOfLines={1}>
                    {formatAmount(ml)}
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// Memoized: DietScreen re-renders on every keystroke of its unrelated local
// input state (label-scan grams, photo weight, etc.); this component's props
// are plain primitives, so it should skip re-rendering when they haven't
// actually changed.
export const WaterQuickRow = React.memo(WaterQuickRowComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    minHeight: Math.max(rh(56), 56),
    borderRadius: borderRadius.lg,
    backgroundColor: hexToRgba(colors.surface, 0.5),
    borderWidth: 1,
    borderColor: hexToRgba(colors.info, 0.06),
  },
  body: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    minHeight: Math.max(rh(44), 44),
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  label: {
    fontSize: rf(fontSize.sm),
    fontFamily: fontFamilyForWeight('bold'),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
  },
  caption: {
    fontSize: rf(fontSize.xs),
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
  captionCurrent: {
    fontVariant: ['tabular-nums'] as any,
    color: colors.text,
  },
  captionCurrentReached: {
    color: colors.success,
  },
  captionGoal: {
    color: colors.textMuted,
  },
  glassesChip: {
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.info, TINT_ALPHA_LOW),
  },
  glasses: {
    fontSize: rf(fontSize.micro),
    color: colors.textMuted,
  },
  quickAddCluster: {
    alignItems: 'flex-end' as const,
  },
  quickAddTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  quickAdd: {
    minWidth: rw(56),
    minHeight: Math.max(rh(44), 44),
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.info, TINT_ALPHA_LOW),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  quickAddText: {
    fontSize: rf(fontSize.xs),
    fontWeight: '700' as const,
    color: colors.info,
  },
  chevron: {
    width: Math.max(rh(44), 44),
    height: Math.max(rh(44), 44),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.info, TINT_ALPHA_LOW),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  expandedRow: {
    overflow: 'hidden' as const,
    marginTop: spacing.xs,
  },
  pillsRow: {
    flexDirection: 'row' as const,
    gap: spacing.xs,
    justifyContent: 'flex-end' as const,
  },
  pillWrap: {
    // wrapper to host the per-pill stagger entering animation
  },
  pill: {
    minHeight: Math.max(rh(44), 44),
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.info, TINT_ALPHA_LOW),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  pillText: {
    fontSize: rf(fontSize.xs),
    fontWeight: '700' as const,
    color: colors.info,
  },
});

export default WaterQuickRow;
