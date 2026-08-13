/**
 * TemplateDetailSheet
 *
 * Full preview of a single workout template in a `DetentBottomSheet` (Phase 1
 * primitive). Used by the Phase 7 template library for both "My Templates" and
 * "Community" tabs — the same sheet renders either set of actions.
 *
 * Layout:
 *   - Header: name (large), author (community only), difficulty + category
 *     badges
 *   - Stats grid: exercise count, duration, estimated calories (MET calc with
 *     user weight from profileStore), muscle balance radar (mini)
 *   - Exercise list: name + sets×reps + rest + target weight
 *   - Tags row + description
 *   - Actions row:
 *       "Start Now"      — startTemplateSession → WorkoutSession
 *       "Use in Schedule"— navigate to WeeklyBuilder (v1: minimal wiring)
 *       "Fork to Library"— community only (forkTemplate + confetti)
 *       "Share"          — own templates only (v1: placeholder, haptic + log)
 *
 * Muscle balance: derived directly from the template's
 * `targetMuscleGroups[]` + per-exercise set counts, normalized to 0..100 across
 * the 8 radar axes (Chest/Back/Shoulders/Biceps/Triceps/Legs/Glutes/Core). We
 * map the worker-side lowercase muscle names to the radar's PascalCase axes
 * here so the radar gets a complete, normalized dataset even for templates
 * that were never part of a weekly plan.
 *
 * Reduce-motion is respected by both the radar and the confetti (each has its
 * own internal guard — we just pass props through).
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  workoutTemplateService,
  type WorkoutTemplate,
  type TemplateExercise,
} from "../../../services/workoutTemplateService";
import { calculateWorkoutCalories } from "../../../services/calorieCalculator";
import { shareTemplate } from "../../../services/templateShareService";
import { DetentBottomSheet } from "../../ui/aurora/DetentBottomSheet";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { Confetti } from "../../ui/aurora/Confetti";
import { MuscleBalanceRadar } from "../../charts/MuscleBalanceRadar";
import { TemplateRatingSheet } from "./TemplateRatingSheet";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { animations } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { crossPlatformAlert } from "../../../utils/crossPlatformAlert";
import { getCurrentUserId } from "../../../services/authUtils";
import { rf, rp, rw, rs } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

// ----------------------------------------------------------------------------
// TYPES & CONSTANTS
// ----------------------------------------------------------------------------

export interface TemplateDetailSheetProps {
  /** Controls visibility. */
  visible: boolean;
  /** Close handler. */
  onClose: () => void;
  /** The template to preview. null hides content but keeps the sheet mounted. */
  template: WorkoutTemplate | null;
  /** True when the template is a public/community one (enables "Fork"). */
  isCommunity: boolean;
  /** True when the template belongs to the current user (enables "Share"). */
  isOwned: boolean;
  /** User weight in kg for calorie estimation. null = skip calorie calc. */
  userWeightKg?: number | null;
  /** "Start Now" — start a workout session from this template. */
  onStart: (template: WorkoutTemplate) => void;
  /** "Use in Schedule" — navigate to the weekly builder with this template. */
  onUseInSchedule: (template: WorkoutTemplate) => void;
  /** "Fork to Library" success callback (parent refreshes its list). */
  onForkComplete?: () => void;
  /**
   * "Rate" success callback (parent can refresh the template's rating_avg).
   * Fires after the user submits a rating via the embedded TemplateRatingSheet.
   */
  onRated?: (templateId: string, rating: number) => void;
  /** Test ID prefix. */
  testID?: string;
}

/** Narrow a typography.fontWeight token to RN's literal fontWeight union. */
const fw = (w: string): TextStyle["fontWeight"] =>
  w as TextStyle["fontWeight"];

/** 12% tint for badge backgrounds (was `${tint}1F`). */
const BADGE_TINT_ALPHA = 0.12;

const DIFFICULTY_TINT: Record<
  NonNullable<WorkoutTemplate["difficulty"]>,
  string
> = {
  beginner: colors.success,
  intermediate: colors.secondary,
  advanced: colors.error,
};

const DIFFICULTY_LABEL: Record<
  NonNullable<WorkoutTemplate["difficulty"]>,
  string
> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Map worker-side lowercase muscle names (used in `targetMuscleGroups[]`)
 * to the 8 PascalCase axes the MuscleBalanceRadar expects. Multiple input
 * names collapse into one axis (e.g. "quadriceps" + "hamstrings" → "Legs").
 */
const MUSCLE_TO_AXIS: Record<string, string> = {
  chest: "Chest",
  pectorals: "Chest",
  back: "Back",
  lats: "Back",
  "lower_back": "Back",
  shoulders: "Shoulders",
  delts: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quadriceps: "Legs",
  quads: "Legs",
  hamstrings: "Legs",
  legs: "Legs",
  glutes: "Glutes",
  core: "Core",
  abs: "Core",
};

const RADAR_AXES = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Glutes",
  "Core",
] as const;

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const TemplateDetailSheet: React.FC<TemplateDetailSheetProps> = ({
  visible,
  onClose,
  template,
  isCommunity,
  isOwned,
  userWeightKg,
  onStart,
  onUseInSchedule,
  onForkComplete,
  onRated,
  testID,
}) => {
  const reducedMotion = useReducedMotion();
  const [forking, setForking] = React.useState(false);
  const [forked, setForked] = React.useState(false);
  const [confettiTrigger, setConfettiTrigger] = React.useState(false);
  // Local fork-count mirror: we optimistically bump it after a fork so the
  // stats grid reflects the new count before the parent list refetches.
  const [localForkCount, setLocalForkCount] = React.useState<number | null>(
    null,
  );
  // Share state: the share-sheet call is async + can be dismissed by the OS.
  // We track a "shared" flag to surface a confirmation after the sheet closes.
  const [shared, setShared] = React.useState(false);
  // Rating sheet visibility (embedded — community templates only).
  const [ratingSheetVisible, setRatingSheetVisible] = React.useState(false);
  // Local rating mirror: optimistically reflect the user's submitted rating.
  const [localRatingAvg, setLocalRatingAvg] = React.useState<number | null>(
    null,
  );
  const [localRatingCount, setLocalRatingCount] = React.useState<number | null>(
    null,
  );

  // Reset transient state when a different template is shown.
  React.useEffect(() => {
    if (visible) {
      setForking(false);
      setForked(false);
      setConfettiTrigger(false);
      setLocalForkCount(null);
      setShared(false);
      setRatingSheetVisible(false);
      setLocalRatingAvg(null);
      setLocalRatingCount(null);
    }
  }, [visible, template?.id]);

  // Derived: the display values prefer optimistic local state over the
  // template prop so the UI feels instant after a fork / rate.
  const displayForkCount = localForkCount ?? template?.forkCount ?? 0;
  const displayRatingAvg = localRatingAvg ?? template?.ratingAvg ?? 0;
  const displayRatingCount = localRatingCount ?? template?.ratingCount ?? 0;
  const displayUserId = useMemo(() => {
    // Lazily read the current user id once per template. We don't re-read on
    // every render — getCurrentUserId() hits the auth store which is cheap
    // but not free. Cache via useMemo keyed on template id.
    if (!template) return null;
    try {
      return getCurrentUserId();
    } catch {
      return null;
    }
  }, [template?.id]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const exerciseCount = template?.exercises.length ?? 0;
  const durationMin = template?.estimatedDurationMinutes ?? 0;

  // Calorie estimate via MET calc (returns 0 if no weight available — per
  // CLAUDE.md §8, we surface that as 0 rather than a hardcoded fallback).
  const calorieEstimate = useMemo(() => {
    if (!template || !userWeightKg || userWeightKg <= 0) return 0;
    const inputs = template.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets,
      reps:
        ex.repRange[0] === ex.repRange[1]
          ? ex.repRange[0]
          : `${ex.repRange[0]}-${ex.repRange[1]}`,
      restTime: ex.restSeconds,
      weight: ex.targetWeightKg,
    }));
    const result = calculateWorkoutCalories(inputs, userWeightKg);
    return result.totalCalories;
  }, [template, userWeightKg]);

  // Muscle balance radar data: aggregate set counts per axis, normalize to 0..100.
  const radarData = useMemo(() => {
    if (!template) return {};
    const axisSets: Record<string, number> = {};
    for (const axis of RADAR_AXES) axisSets[axis] = 0;

    // Per-exercise sets (the strongest signal) — weighted by sets.
    for (const ex of template.exercises) {
      const muscles = resolveMusclesForExercise(ex);
      for (const m of muscles) {
        const axis = MUSCLE_TO_AXIS[m.toLowerCase()];
        if (axis) axisSets[axis] += ex.sets;
      }
    }
    // Fallback: if exercises had no resolved muscles, use template-level groups.
    if (Object.values(axisSets).every((v) => v === 0)) {
      for (const m of template.targetMuscleGroups) {
        const axis = MUSCLE_TO_AXIS[m.toLowerCase()];
        if (axis) axisSets[axis] += 3; // nominal 3 sets when only group is known
      }
    }

    const max = Math.max(1, ...Object.values(axisSets));
    const normalized: Record<string, number> = {};
    for (const axis of RADAR_AXES) {
      normalized[axis] = Math.round((axisSets[axis] / max) * 100);
    }
    return normalized;
  }, [template]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (!template) return;
    haptics.medium();
    onStart(template);
  }, [template, onStart]);

  const handleUseInSchedule = useCallback(() => {
    if (!template) return;
    haptics.light();
    onUseInSchedule(template);
  }, [template, onUseInSchedule]);

  const handleFork = useCallback(async () => {
    if (!template || forking || forked) return;
    setForking(true);
    haptics.medium();
    try {
      // forkTemplate needs the current user's id; we read it lazily here so the
      // sheet stays decoupled from auth plumbing. The service logs on failure.
      const userId = getCurrentUserId();
      if (!userId) {
        haptics.warning();
        return;
      }
      await workoutTemplateService.forkTemplate(template.id, userId);
      setForked(true);
      setConfettiTrigger(true);
      // Optimistically bump the displayed fork count so the stats grid
      // reflects the user's fork before the parent list refetches.
      setLocalForkCount((prev) =>
        prev == null ? (template.forkCount ?? 0) + 1 : prev + 1,
      );
      haptics.celebration();
      onForkComplete?.();
    } catch (err) {
      console.error("[TemplateDetailSheet] fork failed:", err);
      haptics.error();
    } finally {
      setForking(false);
    }
  }, [template, forking, forked, onForkComplete]);

  const handleShare = useCallback(async () => {
    if (!template) return;
    haptics.light();
    try {
      // shareTemplate opens the native share sheet with a recipient-safe HTTPS
      // link. A dismissed sheet returns null, so cancellation stays quiet.
      const sharedLink = await shareTemplate(template.id, template.name);
      if (sharedLink) {
        setShared(true);
      }
    } catch (err) {
      console.error("[TemplateDetailSheet] share failed:", err);
      haptics.error();
      crossPlatformAlert(
        "Share failed",
        "Could not open the share sheet. Please try again.",
      );
    }
  }, [template]);

  const handleOpenRating = useCallback(() => {
    if (!template) return;
    haptics.light();
    setRatingSheetVisible(true);
  }, [template]);

  const handleRated = useCallback(
    (templateId: string, rating: number) => {
      // Optimistically reflect the new rating. The exact new avg depends on
      // whether this was a first rating or an update; we approximate by
      // bumping the count by 1 and nudging the avg toward the user's rating.
      // The parent's onRated callback will refresh from the server.
      setLocalRatingCount((prevCount) => {
        const baseCount = prevCount ?? template?.ratingCount ?? 0;
        const baseAvg = localRatingAvg ?? template?.ratingAvg ?? 0;
        const newCount = baseCount + 1;
        // Weighted: new avg = (old_avg * old_count + new_rating) / new_count.
        // If the user already rated (count doesn't grow), avg just shifts.
        const newAvg =
          baseCount === 0
            ? rating
            : (baseAvg * baseCount + rating) / newCount;
        setLocalRatingAvg(Math.round(newAvg * 100) / 100);
        return newCount;
      });
      onRated?.(templateId, rating);
    },
    [template, localRatingAvg, onRated],
  );

  const handleCloseRating = useCallback(() => {
    setRatingSheetVisible(false);
  }, []);

  const handleConfettiComplete = useCallback(() => {
    setConfettiTrigger(false);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DetentBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.5, 0.95]}
      initialSnapIndex={1}
      testID={testID}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {template ? (
          <View testID={`${testID ?? "template-detail"}-${template.id}`}>
            {/* Header */}
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(60).duration(300)}>
              <Text
                style={styles.name}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {template.name}
              </Text>

              {/* Author (community templates) — v2 author profiles placeholder.
                  Tap is a no-op; the row is styled to look disabled with a
                  "coming soon" note so users know the affordance exists. */}
              {isCommunity && template.authorName ? (
                <View style={styles.authorRow}>
                  <Ionicons
                    name="person-circle-outline"
                    size={rf(typography.fontSize.caption)}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.authorText} numberOfLines={1}>
                    {template.authorName}
                  </Text>
                  <View style={styles.authorBadge}>
                    <Text style={styles.authorBadgeText}>Profiles soon</Text>
                  </View>
                </View>
              ) : null}

              {/* Lineage: if this template was forked from another, show the
                  source author so the chain is visible. Only applies to the
                  user's own forked templates (community templates show their
                  own author above). */}
              {!isCommunity && template.parentTemplateId && template.authorName ? (
                <View style={styles.lineageRow}>
                  <Ionicons
                    name="git-branch-outline"
                    size={rf(typography.fontSize.caption)}
                    color={colors.secondary}
                  />
                  <Text style={styles.lineageText} numberOfLines={1}>
                    Forked from {template.authorName}
                  </Text>
                </View>
              ) : null}

              <View style={styles.badgeRow}>
                {template.difficulty ? (
                  <Badge
                    label={DIFFICULTY_LABEL[template.difficulty]}
                    tint={DIFFICULTY_TINT[template.difficulty]}
                  />
                ) : null}
                {template.category ? (
                  <Badge label={template.category} tint={colors.primary} />
                ) : null}
                {isCommunity ? (
                  <Badge label="Community" tint={colors.secondary} />
                ) : null}
              </View>
            </Animated.View>

            {/* Stats grid */}
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(120).duration(300)}>
              <View style={styles.statsGrid}>
                <StatTile
                  icon="barbell-outline"
                  value={String(exerciseCount)}
                  label="Exercises"
                  tint={colors.primary}
                />
                <StatTile
                  icon="time-outline"
                  value={durationMin > 0 ? `${durationMin}m` : "—"}
                  label="Duration"
                  tint={colors.secondary}
                />
                <StatTile
                  icon="flame-outline"
                  value={calorieEstimate > 0 ? String(calorieEstimate) : "—"}
                  label="Calories"
                  tint={colors.amber}
                />
                <StatTile
                  icon="git-branch-outline"
                  value={String(displayForkCount)}
                  label="Forks"
                  tint={colors.purple}
                />
                <StatTile
                  icon="star-outline"
                  value={
                    displayRatingAvg > 0
                      ? displayRatingAvg.toFixed(1)
                      : "—"
                  }
                  label={`${displayRatingCount} rating${
                    displayRatingCount === 1 ? "" : "s"
                  }`}
                  tint={colors.amber}
                />
              </View>
            </Animated.View>

            {/* Muscle balance radar (mini) */}
            {exerciseCount > 0 ? (
              <Animated.View
                entering={reducedMotion ? undefined : FadeInDown.delay(180).duration(300)}
                style={styles.radarWrap}
              >
                <Text style={styles.sectionTitle}>Muscle Balance</Text>
                <MuscleBalanceRadar
                  data={radarData}
                  size={Math.min(rs(220), rp(240))}
                  accessibilityLabel={`${template.name} muscle balance`}
                />
              </Animated.View>
            ) : null}

            {/* Exercise list */}
            {exerciseCount > 0 ? (
              <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(240).duration(300)}>
                <Text style={styles.sectionTitle}>Exercises</Text>
                <GlassCard
                  elevation={1}
                  padding="none"
                  borderRadius="xl"
                  contentStyle={styles.exerciseListContainer}
                >
                  {template.exercises.map((ex, idx) => (
                    <ExerciseRow
                      key={`${ex.exerciseId}-${idx}`}
                      exercise={ex}
                      isLast={idx === template.exercises.length - 1}
                    />
                  ))}
                </GlassCard>
              </Animated.View>
            ) : null}

            {/* Tags */}
            {template.tags && template.tags.length > 0 ? (
              <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(300).duration(300)}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagsRow}>
                  {template.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {/* Description */}
            {template.description ? (
              <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(360).duration(300)}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>
                  {template.description}
                </Text>
              </Animated.View>
            ) : null}

            {/* Actions — primary actions stay full-width; secondary actions
                (Fork/Rate/Share) collapse into a 2-column grid so the section
                doesn't grow to 5 stacked full-width buttons. */}
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.delay(420).duration(300)}
              style={styles.actions}
            >
              <GlassButton
                label="Start Now"
                onPress={handleStart}
                variant="primary"
                icon="play-outline"
                fullWidth
                hapticType="medium"
                testID="detail-start-button"
              />

              <View style={styles.actionRow}>
                <GlassButton
                  label="Use in Schedule"
                  onPress={handleUseInSchedule}
                  variant="secondary"
                  icon="calendar-outline"
                  fullWidth
                  hapticType="light"
                  testID="detail-schedule-button"
                />
              </View>

              {/* Secondary actions grid (2 per row). Hidden if none apply. */}
              {isCommunity || isOwned ? (
                <View style={styles.secondaryActionsGrid}>
                  {isCommunity ? (
                    <GlassButton
                      label={forked ? "Forked" : "Fork"}
                      onPress={handleFork}
                      variant={forked ? "success" : "secondary"}
                      icon={forked ? "checkmark-circle-outline" : "git-branch-outline"}
                      loading={forking}
                      disabled={forked}
                      hapticType="medium"
                      style={styles.secondaryActionBtn}
                      testID="detail-fork-button"
                    />
                  ) : null}
                  {isCommunity ? (
                    <GlassButton
                      label="Rate"
                      onPress={handleOpenRating}
                      variant="secondary"
                      icon="star-outline"
                      hapticType="light"
                      style={styles.secondaryActionBtn}
                      testID="detail-rate-button"
                    />
                  ) : null}
                  {isOwned ? (
                    <GlassButton
                      label={shared ? "Shared" : "Share"}
                      onPress={handleShare}
                      variant={shared ? "success" : "secondary"}
                      icon={shared ? "checkmark-circle-outline" : "share-outline"}
                      hapticType="light"
                      style={styles.secondaryActionBtn}
                      testID="detail-share-button"
                    />
                  ) : null}
                </View>
              ) : null}
            </Animated.View>
          </View>
        ) : null}
      </ScrollView>

      {/* Confetti overlay — mounted at sheet root (not inside ScrollView) so it
          stays fixed over the viewport instead of scrolling with the content. */}
      <Confetti
        trigger={confettiTrigger}
        onComplete={handleConfettiComplete}
        style={styles.confetti}
      />

      {/* Embedded rating sheet — community templates only. Renders above this
          detail sheet so the rating flow stays within the preview context. */}
      <TemplateRatingSheet
        visible={ratingSheetVisible}
        onClose={handleCloseRating}
        template={template}
        userId={displayUserId}
        onRated={handleRated}
        testID="detail-rating-sheet"
      />
    </DetentBottomSheet>
  );
};

// ----------------------------------------------------------------------------
// EXERCISE ROW
// ----------------------------------------------------------------------------

interface ExerciseRowProps {
  exercise: TemplateExercise;
  isLast: boolean;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({ exercise, isLast }) => {
  const repText =
    exercise.repRange[0] === exercise.repRange[1]
      ? String(exercise.repRange[0])
      : `${exercise.repRange[0]}-${exercise.repRange[1]}`;

  // Rest time: seconds when sub-minute, "Xm Ys" when longer. The previous
  // Math.round(restSeconds / 60) showed "1m" for 30s and "2m" for 90s.
  const restLabel =
    exercise.restSeconds < 60
      ? `${exercise.restSeconds}s`
      : `${Math.floor(exercise.restSeconds / 60)}m${
          exercise.restSeconds % 60 > 0 ? ` ${exercise.restSeconds % 60}s` : ""
        }`;

  return (
    <View style={[styles.exerciseRow, isLast && styles.exerciseRowLast]}>
      <Text style={styles.exerciseName} numberOfLines={1}>
        {exercise.name}
      </Text>
      <View style={styles.exerciseMeta}>
        <Text style={styles.exerciseMetaText}>
          {exercise.sets}×{repText}
        </Text>
        {exercise.restSeconds > 0 ? (
          <Text style={styles.exerciseMetaText}>
            {" · "}{restLabel} rest
          </Text>
        ) : null}
        {exercise.targetWeightKg ? (
          <Text style={styles.exerciseMetaText}>
            {" · "}{exercise.targetWeightKg}kg
          </Text>
        ) : null}
      </View>
    </View>
  );
};

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

/**
 * Resolve the muscle groups for a template exercise. Templates don't carry
 * muscle groups per-exercise (only the template-level `targetMuscleGroups`),
 * so for the radar we fall back to the template-level list via the parent's
 * radarData useMemo — this helper is kept for future per-exercise resolution.
 */
function resolveMusclesForExercise(ex: TemplateExercise): string[] {
  // TemplateExercise has no muscleGroups field — return empty so the caller
  // falls back to the template-level targetMuscleGroups in radarData.
  // (Future: resolve via CURATED_EXERCISES lookup by exerciseId.)
  void ex;
  return [];
}

// ----------------------------------------------------------------------------
// BADGE
// ----------------------------------------------------------------------------

interface BadgeProps {
  label: string;
  tint: string;
}

const Badge: React.FC<BadgeProps> = ({ label, tint }) => (
  <View style={[styles.badge, { backgroundColor: hexToRgba(tint, BADGE_TINT_ALPHA) }]}>
    <Text style={[styles.badgeText, { color: tint }]}>{label}</Text>
  </View>
);

// ----------------------------------------------------------------------------
// STAT TILE
// ----------------------------------------------------------------------------

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tint: string;
}

const StatTile: React.FC<StatTileProps> = ({ icon, value, label, tint }) => (
  <View style={styles.statTile}>
    <View style={[styles.statTileIcon, { backgroundColor: hexToRgba(tint, BADGE_TINT_ALPHA) }]}>
      <Ionicons name={icon} size={rf(typography.fontSize.body)} color={tint} />
    </View>
    <Text style={styles.statTileValue} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.statTileLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: rp(spacing.xl),
  },
  confetti: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 12,
    pointerEvents: "none",
  },
  name: {
    color: colors.text,
    fontSize: rf(typography.fontSize.h2),
    fontWeight: fw(typography.fontWeight.bold),
    marginBottom: rp(spacing.xs),
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    marginBottom: rp(spacing.sm),
  },
  authorText: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.caption),
    flex: 1,
  },
  authorBadge: {
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(spacing.xxs),
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  authorBadgeText: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.micro),
    fontStyle: "italic",
  },
  lineageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    marginBottom: rp(spacing.sm),
  },
  lineageText: {
    color: colors.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.medium),
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.lg),
  },
  badge: {
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.lg),
  },
  statTile: {
    flex: 1,
    minWidth: rw(72),
    backgroundColor: colors.glassSurface,
    borderRadius: borderRadius.lg,
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.xs),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: rp(96),
  },
  statTileIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rp(spacing.xs),
  },
  statTileValue: {
    color: colors.text,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.bold),
  },
  statTileLabel: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(spacing.xxs),
  },
  radarWrap: {
    alignItems: "center",
    marginBottom: rp(spacing.lg),
    maxWidth: "100%",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.semibold),
    marginBottom: rp(spacing.sm),
  },
  exerciseListContainer: {
    overflow: "hidden",
  },
  exerciseRow: {
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  exerciseRowLast: {
    borderBottomWidth: 0,
  },
  exerciseName: {
    color: colors.text,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.medium),
    marginBottom: rp(spacing.xxs),
  },
  exerciseMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  exerciseMetaText: {
    color: colors.primary,
    fontSize: rf(typography.fontSize.caption),
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.lg),
  },
  tag: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
  },
  tagText: {
    color: colors.text,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.medium),
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: rf(typography.fontSize.body),
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
    marginBottom: rp(spacing.lg),
  },
  actions: {
    marginTop: rp(spacing.sm),
    gap: rp(spacing.sm),
  },
  actionRow: {
    marginTop: rp(spacing.sm),
  },
  // Secondary actions (Fork/Rate/Share) lay out 2-per-row so the section
  // doesn't stack 5 full-width buttons into an over-tall tail.
  secondaryActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.sm),
    marginTop: rp(spacing.sm),
  },
  secondaryActionBtn: {
    flexGrow: 1,
    flexBasis: rp(140),
    minWidth: rp(120),
  },
});

export default TemplateDetailSheet;
