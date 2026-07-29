/**
 * CustomPlanEmptyState
 *
 * Premium flat empty state for the Fitness tab "My Plan" segment when the user
 * has no custom weekly schedule yet. 2026 redesign: no boxed cards.
 *
 * Structure:
 *  - Centered hero: large calendar icon in a subtle primary-tinted circular
 *    disc, bold headline "No Custom Schedule", one-line muted subtitle, one
 *    full-width primary gradient CTA ("Build Schedule") + a secondary text
 *    button ("Browse Templates"). testIDs preserved.
 *  - Below: "MY LIBRARY" flat preview aggregating the user's all-time stats —
 *    templates count, workouts completed, total exercises across templates, and
 *    last-edited timestamp. If the library is empty, shows three flat
 *    onboarding action rows instead (Create First Template / Browse Community /
 *    Generate with AI).
 *
 * Data sources mirror MyWorkoutsCard: subscribe to the stable `completedSessions`
 * array reference on fitnessStore (Zustand v5 Object.is snapshot equality),
 * derive workout stats via useMemo, and load templates once on mount via
 * workoutTemplateService.getTemplates(userId). There is no standalone
 * `getAllTimeWorkoutStats` selector — we derive here to avoid the infinite
 * re-render trap documented in MyWorkoutsCard.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing, borderRadius } from '../../theme/aurora-tokens';
import { FONT_FAMILY } from '../../theme/fonts';
import { rf, rw, rp } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';
import { useFitnessStore } from '../../stores/fitnessStore';
import { workoutTemplateService } from '../../services/workoutTemplateService';
import { getCurrentUserId } from '../../services/authUtils';

interface CustomPlanEmptyStateProps {
  /** "Build Schedule" primary CTA — opens BuildMethodLanding overlay. */
  onBuildSchedule: () => void;
  /** "Browse Templates" secondary CTA — opens TemplateLibrary overlay. */
  onBrowseTemplates: () => void;
}

/**
 * Format a relative "Last edited" label from an ISO timestamp.
 * - < 1h ago  → "Just now"
 * - < 24h     → "Xh ago"
 * - < 7d      → "Xd ago"
 * - < 14d     → "Last week"
 * - otherwise → "MMM d" (e.g. "Jul 3")
 *
 * Kept local — no existing util formats a relative last-edited label.
 */
const formatLastEdited = (iso: string | null): string | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const now = Date.now();
  const minutes = Math.max(0, Math.floor((now - then) / 60000));
  if (minutes < 60) return 'Just now';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 14) return 'Last week';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const CustomPlanEmptyState: React.FC<CustomPlanEmptyStateProps> = ({
  onBuildSchedule,
  onBrowseTemplates,
}) => {
  // Subscribe to the stable `completedSessions` array reference (only changes
  // when a session is added/removed) — never pass a selector returning a fresh
  // object literal (see MyWorkoutsCard header comment on the re-render trap).
  const completedSessions = useFitnessStore((s) => s.completedSessions);

  const workoutStats = useMemo(() => {
    return {
      workouts: completedSessions.length,
      totalCalories: completedSessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
    };
  }, [completedSessions]);

  // Templates loaded async on mount. `null` = loading, number = resolved.
  const [templates, setTemplates] = useState<Awaited<
    ReturnType<typeof workoutTemplateService.getTemplates>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    const userId = getCurrentUserId();
    if (!userId) {
      setTemplates([]);
      return;
    }
    workoutTemplateService
      .getTemplates(userId)
      .then((rows) => {
        if (!cancelled) setTemplates(rows);
      })
      .catch(() => {
        // Service already logs the Supabase error; surface a safe empty list.
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Library preview metrics derived from templates + completed sessions.
  const libraryPreview = useMemo(() => {
    const templateCount = templates?.length ?? 0;
    // Sum exercise counts across all templates (each template.exercises[]).
    const exerciseCount = templates?.reduce((sum, t) => sum + (t.exercises?.length ?? 0), 0) ?? 0;
    // Most recently updated template drives the "Last edited" label.
    const lastEditedIso = templates?.[0]?.updatedAt ?? null;
    return {
      templateCount,
      exerciseCount,
      workouts: workoutStats.workouts,
      lastEdited: formatLastEdited(lastEditedIso),
    };
  }, [templates, workoutStats.workouts]);

  const hasLibrary = libraryPreview.templateCount > 0;

  return (
    <Animated.View entering={FadeInUp.delay(120).duration(450)}>
      {/* ── Centered hero: gradient icon orb + glow, headline, subtitle, CTAs ─── */}
      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.iconWrap}>
          <View style={styles.iconGlow} />
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconOrb}
          >
            <Ionicons name="calendar-outline" size={rf(42)} color={colors.white} />
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.heroText}>
          <Text style={styles.headline}>No Custom Schedule</Text>
          <Text style={styles.explanation} numberOfLines={3}>
            Build your own weekly workout schedule — pick exercises for each day, or start from a
            template.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360).duration(500)} style={styles.ctaColumn}>
          <AnimatedPressable
            onPress={onBuildSchedule}
            scaleValue={0.97}
            springConfig="snappy"
            hapticType="medium"
            style={styles.primaryCta}
            accessibilityRole="button"
            testID="build-schedule-button"
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryCtaGradient}
            >
              <Ionicons name="construct-outline" size={rf(18)} color={colors.white} />
              <Text style={styles.primaryCtaText} numberOfLines={1}>
                Build Schedule
              </Text>
            </LinearGradient>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={onBrowseTemplates}
            scaleValue={0.97}
            springConfig="snappy"
            hapticType="light"
            style={styles.secondaryCta}
            accessibilityRole="button"
            testID="browse-templates-button"
          >
            <Ionicons name="library-outline" size={rf(15)} color={colors.primary} />
            <Text style={styles.secondaryCtaText} numberOfLines={1}>
              Browse Templates
            </Text>
          </AnimatedPressable>
        </Animated.View>
      </View>

      {/* ── Below: MY LIBRARY flat preview ──────────────────────────────── */}
      <Animated.View entering={FadeInUp.delay(440).duration(450)}>
        <Text style={styles.libraryLabel}>MY LIBRARY</Text>

        {hasLibrary ? (
          <View style={styles.libraryBody}>
            <View style={styles.libraryGrid}>
              <PreviewStat
                value={String(libraryPreview.templateCount)}
                label="Templates"
                icon="library-outline"
                tint={colors.secondary}
              />
              <PreviewStat
                value={String(libraryPreview.workouts)}
                label="Workouts"
                icon="checkmark-done-outline"
                tint={colors.primary}
              />
              <PreviewStat
                value={String(libraryPreview.exerciseCount)}
                label="Exercises"
                icon="barbell-outline"
                tint={colors.purple}
              />
            </View>

            {libraryPreview.lastEdited ? (
              <View style={styles.lastEditedRow}>
                <Ionicons name="time-outline" size={rf(12)} color={colors.textSecondary} />
                <Text style={styles.lastEditedText}>Last edited {libraryPreview.lastEdited}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.libraryBody}>
            <Text style={styles.libraryEmptyTitle}>Your library is empty</Text>
            <Text style={styles.libraryEmptySubtitle}>
              Start building templates to reuse across weeks.
            </Text>

            <View style={styles.emptyActions}>
              <AnimatedPressable
                onPress={onBuildSchedule}
                scaleValue={0.97}
                springConfig="snappy"
                hapticType="light"
                style={styles.emptyActionRow}
                accessibilityRole="button"
                accessibilityLabel="Create first template"
              >
                <View
                  style={[
                    styles.emptyActionIcon,
                    { backgroundColor: hexToRgba(colors.primary, 0.12) },
                  ]}
                >
                  <Ionicons name="add-circle-outline" size={rf(15)} color={colors.primary} />
                </View>
                <Text style={styles.emptyActionText}>Create First Template</Text>
                <Ionicons name="chevron-forward" size={rf(14)} color={colors.textTertiary} />
              </AnimatedPressable>

              <AnimatedPressable
                onPress={onBrowseTemplates}
                scaleValue={0.97}
                springConfig="snappy"
                hapticType="light"
                style={styles.emptyActionRow}
                accessibilityRole="button"
                accessibilityLabel="Browse community templates"
              >
                <View
                  style={[
                    styles.emptyActionIcon,
                    { backgroundColor: hexToRgba(colors.secondary, 0.12) },
                  ]}
                >
                  <Ionicons name="people-outline" size={rf(15)} color={colors.secondary} />
                </View>
                <Text style={styles.emptyActionText}>Browse Community</Text>
                <Ionicons name="chevron-forward" size={rf(14)} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

interface PreviewStatProps {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}

const PreviewStat: React.FC<PreviewStatProps> = ({ value, label, icon, tint }) => (
  <View style={styles.previewStat} accessibilityRole="text">
    <View style={[styles.previewStatIcon, { backgroundColor: hexToRgba(tint, 0.12) }]}>
      <Ionicons name={icon} size={rf(15)} color={tint} />
    </View>
    <Text
      style={styles.previewStatValue}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {value}
    </Text>
    <Text style={styles.previewStatLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: rp(spacing.xl),
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rp(spacing.lg),
  },
  iconGlow: {
    position: 'absolute',
    width: rp(150),
    height: rp(150),
    borderRadius: 999,
    backgroundColor: hexToRgba(colors.primary, 0.18),
    transform: [{ scale: 1.1 }],
  },
  iconOrb: {
    width: rp(100),
    height: rp(100),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  heroText: {
    alignItems: 'center',
    width: '100%',
  },
  headline: {
    color: colors.text,
    fontSize: rf(24),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: rp(spacing.xs),
    letterSpacing: -0.3,
  },
  explanation: {
    color: colors.textSecondary,
    fontSize: rf(14),
    textAlign: 'center',
    lineHeight: rf(20),
  },
  ctaColumn: {
    width: '100%',
    alignItems: 'center',
    marginTop: rp(spacing.xl),
  },
  primaryCta: {
    width: '100%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    minHeight: 52,
  },
  primaryCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xl),
    minHeight: 52,
  },
  primaryCtaText: {
    color: colors.white,
    fontSize: rf(16),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xs),
    minHeight: 44,
    marginTop: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
  },
  secondaryCtaText: {
    color: colors.primary,
    fontSize: rf(14),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: '600',
  },
  libraryLabel: {
    color: colors.textSecondary,
    fontSize: rf(12),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: rp(spacing.lg),
    marginBottom: rp(spacing.sm),
    paddingHorizontal: rp(spacing.xs),
  },
  libraryBody: {
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xs),
  },
  libraryGrid: {
    flexDirection: 'row',
    gap: rp(spacing.sm),
  },
  previewStat: {
    flex: 1,
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.xs),
    alignItems: 'flex-start',
  },
  previewStatIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  previewStatValue: {
    fontSize: rf(20),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700',
    color: colors.text,
  },
  previewStatLabel: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  lastEditedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    marginTop: rp(spacing.md),
  },
  lastEditedText: {
    color: colors.textSecondary,
    fontSize: rf(12),
  },
  libraryEmptyTitle: {
    color: colors.text,
    fontSize: rf(16),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: '600',
    marginBottom: rp(spacing.xs),
  },
  libraryEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: rf(14),
    lineHeight: rf(20),
    marginBottom: rp(spacing.md),
  },
  emptyActions: {
    gap: rp(spacing.xs),
  },
  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.sm),
    minHeight: 52,
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.xs),
  },
  emptyActionIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActionText: {
    flex: 1,
    color: colors.text,
    fontSize: rf(14),
    fontWeight: '500',
  },
});

export default CustomPlanEmptyState;
