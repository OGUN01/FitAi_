/**
 * FitAI — Next Exercise Preview (Aurora, 2026 session redesign)
 *
 * Slim flat "UP NEXT" strip shown during inter-exercise rest. No card chrome —
 * a typographic eyebrow + exercise name on a plain row with a hairline top
 * rule, so it reads as part of the session canvas rather than a floating card.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';
import { rf, rp } from '../../utils/responsive';

interface NextExercisePreviewProps {
  exerciseName: string;
}

export const NextExercisePreview: React.FC<NextExercisePreviewProps> = ({ exerciseName }) => (
  <View style={styles.container}>
    <View style={styles.rule} />
    <View style={styles.row}>
      <Ionicons name="arrow-forward" size={rf(14)} color={colors.primary.DEFAULT} />
      <Text style={styles.eyebrow} numberOfLines={1}>
        Up Next
      </Text>
      <Text
        style={styles.nextExerciseName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {exerciseName}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: rp(spacing.sm),
  },
  rule: {
    height: 1,
    backgroundColor: hexToRgba(colors.text.primary, 0.08),
    marginHorizontal: rp(spacing.lg),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
    paddingVertical: rp(spacing.sm),
    minHeight: Math.max(rp(44), 44),
  },
  eyebrow: {
    fontSize: rf(11),
    color: colors.primary.DEFAULT,
    fontWeight: String(typography.fontWeight.bold) as any,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  nextExerciseName: {
    flex: 1,
    fontSize: rf(15),
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.semibold) as any,
    letterSpacing: 0.2,
  },
});
