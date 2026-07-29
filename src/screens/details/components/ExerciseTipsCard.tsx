/**
 * ExerciseTipsCard — flat tips + safety rows for the exercise detail screen.
 *
 * No card wrapper: uppercase muted eyebrows over flat rows, each row led by
 * a small icon bullet (checkmark for coaching tips, warning for safety).
 * Props are unchanged from the previous implementation.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../../theme/aurora-tokens';
import { rf, rp } from '../../../utils/responsive';

interface ExerciseTipsCardProps {
  tips: string[];
  safetyTips: string[];
}

export const ExerciseTipsCard: React.FC<ExerciseTipsCardProps> = ({ tips, safetyTips }) => {
  return (
    <>
      {tips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>TIPS</Text>
          {tips.map((tip: string, index: number) => (
            <View key={index} style={styles.tipRow}>
              <Ionicons
                name="checkmark-circle"
                size={rf(14)}
                color={colors.success.DEFAULT}
                style={styles.bulletIcon}
              />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {safetyTips.length > 0 && (
        <View style={styles.sectionLast}>
          <Text style={styles.eyebrow}>SAFETY CONSIDERATIONS</Text>
          {safetyTips.map((tip: string, index: number) => (
            <View key={index} style={styles.tipRow}>
              <Ionicons
                name="warning"
                size={rf(14)}
                color={colors.warning.DEFAULT}
                style={styles.bulletIcon}
              />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: rp(spacing.lg),
  },
  sectionLast: {
    // Extra bottom room so the last row clears the sticky Start Exercise CTA.
    marginBottom: rp(spacing.xxl),
  },
  eyebrow: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    letterSpacing: 1.2,
    marginBottom: rp(spacing.sm),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
  },
  bulletIcon: {
    marginTop: rp(3),
  },
  tipText: {
    flex: 1,
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.relaxed,
  },
});
