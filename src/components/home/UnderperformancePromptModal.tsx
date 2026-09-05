/**
 * UnderperformancePromptModal — Goal Engine Phase E
 *
 * The Phase E under-performance response, surfaced on Home:
 *
 *   1. 14-day adherence prompt — the honest number ("your plan promised
 *      X kg this fortnight; your logged days delivered Y") and three buttons:
 *      Keep pushing / Rebuild a plan I'll actually hit / Don't ask again.
 *      NOTHING auto-changes — no plan mutation, no target change. The numbers
 *      come from the Phase D ledger (Σnet_deficit / Σplanned_deficit over
 *      logged, non-maintenance days — see energyResponseService.ts).
 *
 *   2. Safety check-in — intake < 1000 kcal for 3+ consecutive logged days.
 *      Supportive, never scolding; mentions professional care. Single dismiss
 *      button: it is always-on, ignores every acknowledgment, and has nothing
 *      to negotiate.
 *
 * Visual language mirrors HealthConnectDisclosureModal (DialogShell + GlassCard
 * + GlassButton) so it reads as the same app's modal, not an Alert bolt-on.
 */

import React from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../ui/aurora/GlassCard';
import { GlassButton } from '../ui/aurora/GlassButton';
import { DialogShell } from '../ui/CustomDialog';
import { flatColors as colors, spacing, flatFontSize as fontSize } from '../../theme/aurora-tokens';
import { fontFamilyForWeight } from '../../theme/fonts';
import { rf, rp } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';
import type {
  AdherenceSnapshot,
  SafetyStreak,
  EnergyResponseCheck,
} from '../../services/energyResponseService';

interface UnderperformancePromptModalProps {
  /** The active check to render. Null = not shown. */
  check: EnergyResponseCheck | null;
  /** "Keep pushing" / safety dismiss — closes the prompt, changes nothing. */
  onKeepPushing: () => void;
  /** "Rebuild a plan I'll actually hit" — closes the prompt and navigates. */
  onRebuild: () => void;
  /** "Don't ask again" — persists an acknowledgment, closes the prompt. */
  onDontAskAgain: () => void;
  /** Backdrop / hardware-back dismiss (same as Keep pushing). */
  onDismiss: () => void;
}

const formatKg = (kg: number): string => {
  const abs = Math.abs(kg);
  const body = abs >= 10 ? abs.toFixed(1) : abs.toFixed(2);
  return `${body} kg`;
};

/** "0.63" → "63%", "0.07" → "7.0%" — one decimal below 10, integers above. */
const formatPercent = (ratio: number): string => {
  const pct = ratio * 100;
  return pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
};

export const UnderperformancePromptModal: React.FC<UnderperformancePromptModalProps> = ({
  check,
  onKeepPushing,
  onRebuild,
  onDontAskAgain,
  onDismiss,
}) => {
  if (!check) return null;

  const handleKeepPushing = () => {
    haptics.light();
    onKeepPushing();
  };
  const handleRebuild = () => {
    haptics.medium();
    onRebuild();
  };
  const handleDontAskAgain = () => {
    haptics.light();
    onDontAskAgain();
  };

  // ── Safety check-in (simpler card, single dismiss) ──────────────────────
  if (check.kind === 'safety') {
    const streak: SafetyStreak = check.streak;
    return (
      <DialogShell visible animationType="fade" onRequestClose={onDismiss} bare>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
          <View style={styles.dialogWrapper}>
            <GlassCard
              elevation={5}
              blurIntensity="heavy"
              padding="lg"
              borderRadius="xl"
              style={styles.surface}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="heart-half-outline" size={rf(40)} color={colors.primary} />
              </View>

              <Text style={styles.title}>We&apos;ve noticed something, and we care</Text>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.bodyText}>
                  Your food logs for the last {streak.streakLength} days have all been under 1,000
                  kcal. Everyone hits tight weeks — but eating this little for several days in a row
                  can work against you: energy, mood, sleep and training feel it first.
                </Text>
                <Text style={styles.bodySecondary}>
                  If keeping intake this low feels hard right now, consider talking to a doctor or a
                  registered dietitian — that&apos;s a strong move, not a failure. FitAI is built
                  around sustainable plans, and we&apos;re always in your corner.
                </Text>
              </ScrollView>

              <GlassButton
                label="Thanks for looking out"
                onPress={handleKeepPushing}
                variant="primary"
                fullWidth
              />
            </GlassCard>
          </View>
        </View>
      </DialogShell>
    );
  }

  // ── 14-day adherence prompt (honest number + 3 buttons) ─────────────────
  const snapshot: AdherenceSnapshot = check.snapshot;
  const ratioPct = snapshot.adherenceRatio != null ? formatPercent(snapshot.adherenceRatio) : null;

  return (
    <DialogShell visible animationType="fade" onRequestClose={onDismiss} bare>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View style={styles.dialogWrapper}>
          <GlassCard
            elevation={5}
            blurIntensity="heavy"
            padding="lg"
            borderRadius="xl"
            style={styles.surface}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="stats-chart-outline" size={rf(40)} color={colors.primary} />
            </View>

            <Text style={styles.title}>A check-in on your plan</Text>
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.bodyText}>
                It&apos;s been two weeks, so here&apos;s the honest math. Over the last 14 days your
                plan promised <Text style={styles.bodyStrong}>{formatKg(snapshot.promisedKg)}</Text>{' '}
                of progress across the days you logged, and your logged days actually delivered{' '}
                <Text style={styles.bodyStrong}>{formatKg(snapshot.actualKg)}</Text> — about{' '}
                <Text style={styles.bodyStrong}>{ratioPct ?? '—'} of the plan</Text>.
              </Text>
              <Text style={styles.bodySecondary}>
                Counted over {snapshot.eligibleDays} logged day
                {snapshot.eligibleDays === 1 ? '' : 's'} (days without logs aren&apos;t counted
                against you). Nothing changes unless you choose it.
              </Text>
            </ScrollView>

            <View style={styles.actions}>
              <GlassButton
                label="Keep pushing"
                onPress={handleKeepPushing}
                variant="secondary"
                fullWidth
              />
              <GlassButton
                label="Rebuild a plan I'll actually hit"
                onPress={handleRebuild}
                variant="primary"
                fullWidth
              />
              <Pressable
                onPress={handleDontAskAgain}
                style={styles.dontAskButton}
                accessibilityRole="button"
                accessibilityLabel="Don't ask again"
              >
                <Text style={styles.dontAskText}>Don&apos;t ask again</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </View>
    </DialogShell>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rp(spacing.lg),
  },
  dialogWrapper: {
    width: '88%',
    maxWidth: 420,
  },
  surface: {
    backgroundColor: colors.surface,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: rp(spacing.sm),
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamilyForWeight('700'),
    color: colors.text,
    textAlign: 'center',
    marginBottom: rp(spacing.sm),
  },
  scrollArea: {
    maxHeight: rp(220),
    marginBottom: rp(spacing.md),
  },
  scrollContent: {
    paddingBottom: rp(spacing.xs),
  },
  bodyText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyForWeight('regular'),
    color: colors.text,
    lineHeight: rf(20),
    marginBottom: rp(spacing.sm),
  },
  bodyStrong: {
    fontFamily: fontFamilyForWeight('semibold'),
    color: colors.primary,
  },
  bodySecondary: {
    fontSize: fontSize.xs,
    fontFamily: fontFamilyForWeight('regular'),
    color: colors.textSecondary,
    lineHeight: rf(18),
    marginBottom: rp(spacing.xs),
  },
  actions: {
    gap: rp(spacing.sm),
    marginTop: rp(spacing.xs),
  },
  dontAskButton: {
    alignSelf: 'center',
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
  },
  dontAskText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyForWeight('medium'),
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default UnderperformancePromptModal;
