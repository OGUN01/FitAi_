/**
 * CustomPlanEmptyState
 *
 * Premium empty state for the Fitness tab "My Plan" segment when the user has
 * no custom weekly schedule yet. Replaces the hand-rolled dashed Pressable at
 * FitnessScreen.tsx (the old `customPlanCta` block).
 *
 * Structure:
 *  - Top glass card: animated gradient icon disc, headline "No Custom Schedule",
 *    short explanation, two CTAs (Build Schedule primary orange, Browse
 *    Templates secondary).
 *  - Below: "MY LIBRARY" preview card aggregating the user's all-time stats —
 *    templates count, workouts completed, total exercises across templates, and
 *    last-edited timestamp. If the library is empty, shows three onboarding
 *    actions instead (Create First Template / Browse Community / Generate with
 *    AI).
 *
 * Data sources mirror MyWorkoutsCard: subscribe to the stable `completedSessions`
 * array reference on fitnessStore (Zustand v5 Object.is snapshot equality),
 * derive workout stats via useMemo, and load templates once on mount via
 * workoutTemplateService.getTemplates(userId). There is no standalone
 * `getAllTimeWorkoutStats` selector — we derive here to avoid the infinite
 * re-render trap documented in MyWorkoutsCard.
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, type TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import { GlassCard } from "../ui/aurora/GlassCard";
import { GlassButton } from "../ui/aurora/GlassButton";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { rf, rw, rp } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";

/** Narrow a typography.fontWeight token to RN's literal fontWeight union. */
const fw = (w: string): TextStyle["fontWeight"] =>
  w as TextStyle["fontWeight"];
import { useFitnessStore } from "../../stores/fitnessStore";
import { workoutTemplateService } from "../../services/workoutTemplateService";
import { getCurrentUserId } from "../../services/authUtils";

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
  if (minutes < 60) return "Just now";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 14) return "Last week";
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      totalCalories: completedSessions.reduce(
        (sum, s) => sum + s.caloriesBurned,
        0,
      ),
    };
  }, [completedSessions]);

  // Templates loaded async on mount. `null` = loading, number = resolved.
  const [templates, setTemplates] = useState<
    Awaited<ReturnType<typeof workoutTemplateService.getTemplates>> | null
  >(null);

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
    const exerciseCount =
      templates?.reduce((sum, t) => sum + (t.exercises?.length ?? 0), 0) ?? 0;
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
      {/* ── Top: empty-schedule headline card ───────────────────────────── */}
      <GlassCard
        elevation={3}
        blurIntensity="default"
        padding="lg"
        borderRadius="xl"
      >
        <View style={styles.topRow}>
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.iconDiscWrap}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconDisc}
            >
              <Ionicons
                name="calendar-outline"
                size={rf(28)}
                color={colors.white}
              />
            </LinearGradient>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(280).duration(500)}
            style={styles.topText}
          >
            <Text style={styles.headline}>No Custom Schedule</Text>
            <Text style={styles.explanation} numberOfLines={4}>
              Build your own weekly workout schedule — pick exercises for each
              day, or start from a template.
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.delay(360).duration(500)}
          style={styles.ctaRow}
        >
          <GlassButton
            label="Build Schedule"
            onPress={onBuildSchedule}
            variant="primary"
            icon="construct-outline"
            fullWidth
            hapticType="medium"
            testID="build-schedule-button"
          />
          <View style={styles.ctaSpacer} />
          <GlassButton
            label="Browse Templates"
            onPress={onBrowseTemplates}
            variant="secondary"
            icon="library-outline"
            fullWidth
            hapticType="light"
            testID="browse-templates-button"
          />
        </Animated.View>
      </GlassCard>

      {/* ── Below: MY LIBRARY preview card ──────────────────────────────── */}
      <Animated.View entering={FadeInUp.delay(440).duration(450)}>
        <Text style={styles.libraryLabel}>MY LIBRARY</Text>

        <GlassCard
          elevation={2}
          blurIntensity="light"
          padding="none"
          borderRadius="xl"
        >
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
                  <Ionicons
                    name="time-outline"
                    size={rf(12)}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.lastEditedText}>
                    Last edited {libraryPreview.lastEdited}
                  </Text>
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
                  style={styles.emptyActionChip}
                  accessibilityRole="button"
                  accessibilityLabel="Create first template"
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={rf(14)}
                    color={colors.primary}
                  />
                  <Text style={styles.emptyActionText}>Create First Template</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={onBrowseTemplates}
                  scaleValue={0.97}
                  springConfig="snappy"
                  hapticType="light"
                  style={styles.emptyActionChip}
                  accessibilityRole="button"
                  accessibilityLabel="Browse community templates"
                >
                  <Ionicons
                    name="people-outline"
                    size={rf(14)}
                    color={colors.secondary}
                  />
                  <Text style={styles.emptyActionText}>Browse Community</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={onBuildSchedule}
                  scaleValue={0.97}
                  springConfig="snappy"
                  hapticType="light"
                  style={styles.emptyActionChip}
                  accessibilityRole="button"
                  accessibilityLabel="Generate with AI"
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={rf(14)}
                    color={colors.purple}
                  />
                  <Text style={styles.emptyActionText}>Generate with AI</Text>
                </AnimatedPressable>
              </View>
            </View>
          )}
        </GlassCard>
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
    <Text style={styles.previewStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
      {value}
    </Text>
    <Text style={styles.previewStatLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
    marginBottom: rp(spacing.lg),
  },
  iconDiscWrap: {
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  iconDisc: {
    width: rw(56),
    height: rw(56),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  topText: {
    flex: 1,
  },
  headline: {
    color: colors.text,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.bold),
    marginBottom: rp(spacing.xs),
  },
  explanation: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.caption),
    // Hardcoded rf(20) — was rf(caption) * lineHeight.normal which is fine
    // when normal is a number, but defensive against future type drift.
    lineHeight: rf(20),
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  ctaSpacer: {
    width: rp(spacing.sm),
  },
  libraryLabel: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: rp(spacing.lg),
    marginBottom: rp(spacing.sm),
    paddingHorizontal: rp(spacing.xs),
  },
  libraryBody: {
    padding: rp(spacing.lg),
  },
  libraryGrid: {
    flexDirection: "row",
    gap: rp(spacing.sm),
  },
  previewStat: {
    flex: 1,
    backgroundColor: colors.glassSurface,
    borderRadius: borderRadius.lg,
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.sm),
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  previewStatIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  previewStatValue: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.bold),
    color: colors.text,
  },
  // Use colors.text (primary) for WCAG AA on glassSurface — colors.textSecondary
  // (#B0B0B0) on glassSurface was ~3.5:1, below AA.
  previewStatLabel: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text,
    marginTop: rp(2),
  },
  lastEditedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.md),
  },
  lastEditedText: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.micro),
  },
  libraryEmptyTitle: {
    color: colors.text,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
    marginBottom: rp(spacing.xs),
  },
  libraryEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: rf(typography.fontSize.caption) * (typography.lineHeight.normal ?? 1.4),
    marginBottom: rp(spacing.md),
  },
  emptyActions: {
    gap: rp(spacing.sm),
  },
  emptyActionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    minHeight: 44,
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    backgroundColor: colors.glassSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  emptyActionText: {
    color: colors.text,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.medium),
  },
});

export default CustomPlanEmptyState;
