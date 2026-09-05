/**
 * CardioBlockCard — live-session cardio logging (Workout Engine v2 Phase 4B.2).
 *
 * Cardio blocks previously had ZERO runtime representation — CardioBlock was
 * a plan-only object consumed exclusively by planning/estimation services
 * (energy/planBurn.ts, safetyGates.ts). This is the first UI that lets a user
 * actually mark one done during a session.
 *
 * Intensity is fixed at logging time (set when the block was planned) — this
 * card shows it read-only using the EXACT segmented-pill visual language
 * CardioBlockEditor.tsx already establishes in the builder (same tokens, same
 * shape), not a new pattern. The only user input here is an optional actual-
 * duration adjustment (+/- 5 min from the planned duration) before marking
 * complete — CardioBlock has no pace/HR fields, so nothing beyond duration is
 * captured; inventing those fields now would be scope creep the type doesn't
 * support.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, AnimatedPressable } from '../ui/aurora';
import { colors, spacing, borderRadius, typography, border } from '../../theme/aurora-tokens';
import { rf, rp } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

export interface CardioBlockCardData {
  blockId: string;
  name: string;
  plannedDurationMinutes: number;
  intensity: 'low' | 'moderate' | 'high';
  distanceKm?: number;
  completed: boolean;
  actualDurationMinutes?: number;
}

interface CardioBlockCardProps {
  block: CardioBlockCardData;
  /** Called when the user marks this block complete. Passes the actual
   * duration only when it differs from the plan (undefined = use planned). */
  onComplete: (actualDurationMinutes?: number) => void;
  testID?: string;
}

const INTENSITY_LABELS: Record<CardioBlockCardData['intensity'], string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

const DURATION_STEP = 5;
const MIN_DURATION = 1;

export const CardioBlockCard: React.FC<CardioBlockCardProps> = ({
  block,
  onComplete,
  testID,
}) => {
  const [durationMinutes, setDurationMinutes] = useState(block.plannedDurationMinutes);

  if (block.completed) {
    return (
      <View testID={testID}>
        <GlassCard
          blurIntensity="light"
          elevation={1}
          padding="md"
          borderRadius="lg"
          style={styles.card}
        >
          <View style={styles.completedRow}>
            <Ionicons name="checkmark-circle" size={rf(20)} color={colors.success.DEFAULT} />
            <Text style={styles.completedText} numberOfLines={1}>
              {block.name} — {block.actualDurationMinutes ?? block.plannedDurationMinutes} min done
            </Text>
          </View>
        </GlassCard>
      </View>
    );
  }

  return (
    <View testID={testID}>
      <GlassCard
        blurIntensity="default"
        elevation={2}
        padding="md"
        borderRadius="lg"
        showBorder
        style={styles.card}
      >
      <View style={styles.headerRow}>
        <Ionicons name="flame-outline" size={rf(18)} color={colors.primary.DEFAULT} />
        <Text style={styles.title} numberOfLines={1}>
          {block.name}
        </Text>
      </View>

      {block.distanceKm ? (
        <Text style={styles.subtext}>{block.distanceKm} km planned</Text>
      ) : null}

      {/* Intensity — read-only, matches CardioBlockEditor.tsx's segmented
          pill exactly (same tokens/shape), just non-interactive here. */}
      <View style={styles.intensityRow}>
        {(['low', 'moderate', 'high'] as const).map((level) => {
          const selected = block.intensity === level;
          return (
            <View
              key={level}
              style={[styles.intensityPill, selected && styles.intensityPillSelected]}
              accessibilityRole="text"
              accessibilityLabel={
                selected ? `${INTENSITY_LABELS[level]} intensity (planned)` : undefined
              }
            >
              <Text
                style={[styles.intensityPillText, selected && styles.intensityPillTextSelected]}
              >
                {INTENSITY_LABELS[level]}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.durationRow}>
        <Text style={styles.durationLabel}>Duration</Text>
        <View style={styles.stepper}>
          <AnimatedPressable
            onPress={() => {
              haptics.selection();
              setDurationMinutes((prev) => Math.max(MIN_DURATION, prev - DURATION_STEP));
            }}
            style={styles.stepperButton}
            scaleValue={0.9}
            springConfig="snappy"
            accessibilityRole="button"
            accessibilityLabel={`Decrease duration by ${DURATION_STEP} minutes`}
          >
            <Ionicons name="remove" size={rf(18)} color={colors.text.primary} />
          </AnimatedPressable>
          <Text style={styles.durationValue}>{durationMinutes} min</Text>
          <AnimatedPressable
            onPress={() => {
              haptics.selection();
              setDurationMinutes((prev) => prev + DURATION_STEP);
            }}
            style={styles.stepperButton}
            scaleValue={0.9}
            springConfig="snappy"
            accessibilityRole="button"
            accessibilityLabel={`Increase duration by ${DURATION_STEP} minutes`}
          >
            <Ionicons name="add" size={rf(18)} color={colors.text.primary} />
          </AnimatedPressable>
        </View>
      </View>

      <Pressable
        onPress={() => {
          haptics.success();
          onComplete(
            durationMinutes !== block.plannedDurationMinutes ? durationMinutes : undefined,
          );
        }}
        style={styles.completeButton}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${block.name} complete`}
      >
        <Ionicons name="checkmark" size={rf(18)} color={colors.background.DEFAULT} />
        <Text style={styles.completeButtonText}>Mark Complete</Text>
      </Pressable>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: rp(spacing.md),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  title: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle['fontWeight'],
    flexShrink: 1,
  },
  subtext: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    marginBottom: rp(spacing.xs),
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
  },
  completedText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
    flexShrink: 1,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.md),
  },
  intensityPill: {
    flex: 1,
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  intensityPillSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  intensityPillText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle['fontWeight'],
  },
  intensityPillTextSelected: {
    color: colors.background.DEFAULT,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rp(spacing.md),
  },
  durationLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.sm),
  },
  stepperButton: {
    width: rp(36),
    height: rp(36),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle['fontWeight'],
    minWidth: rp(56),
    textAlign: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xs),
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    minHeight: 44,
  },
  completeButtonText: {
    color: colors.background.DEFAULT,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle['fontWeight'],
  },
});
