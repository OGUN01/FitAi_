/**
 * InlineValidationBanner — surfaces builder validation warnings inline (no
 * popups) above the day-block list in WeeklyBuilderScreen (Phase 6.2).
 *
 * Subscribes to `workoutBuilderStore.validationWarnings`. Renders nothing
 * (or a subtle "Plan looks balanced ✓" chip) when the plan is clean, and a
 * collapsible stack of warning cards otherwise. Each card has a severity
 * color strip + icon + message + optional fixAction button.
 *
 * Interaction:
 *  - Tap header → expand/collapse the full list (default collapsed to a count
 *    chip + the top warning).
 *  - Tap fixAction button → opens the picker (Phase 4) filtered to the
 *    fixAction payload. v1 fallback: haptic + console.log when the picker
 *    isn't wired (per spec — picker ships in Phase 4 and reads
 *    pickerContext/pickerOpen on the store).
 *  - Haptic `warning` fires once whenever a NEW warning appears (tracked via
 *    a ref to the previous warning-id set).
 *  - Entrance animation: FadeInDown spring.
 *
 * All colors / spacing / radii come from aurora-tokens. Animations use
 * springConfig presets + haptics from src/utils/haptics.ts.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import type { TextStyle } from "react-native";

/**
 * Cast a typography font-weight token to RN's TextStyle['fontWeight'] without
 * using `any` (TS strict). The token values are string literals ("300"…"800")
 * that RN accepts, but `String(...)` widens them to `string`, which RN's
 * TextStyle union rejects.
 */
const fw = (w: typeof typography.fontWeight[keyof typeof typography.fontWeight]): TextStyle["fontWeight"] =>
  String(w) as TextStyle["fontWeight"];
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import type { ValidationWarning } from "../../../types/workout";
import { haptics } from "../../../utils/haptics";
import { workoutBuilderAi } from "../../../ai/workoutBuilderAi";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";

// ----------------------------------------------------------------------------
// SEVERITY → TOKEN MAPPING
// ----------------------------------------------------------------------------

interface SeverityStyle {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}

const SEVERITY_STYLES: Record<ValidationWarning["severity"], SeverityStyle> = {
  info: {
    color: colors.info.DEFAULT,
    icon: "information-circle-outline",
    tint: "rgba(33, 150, 243, 0.12)",
  },
  warning: {
    color: colors.warning.DEFAULT,
    icon: "warning-outline",
    tint: "rgba(255, 152, 0, 0.12)",
  },
  error: {
    color: colors.error.DEFAULT,
    icon: "alert-circle-outline",
    tint: "rgba(244, 67, 54, 0.12)",
  },
};

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const InlineValidationBanner: React.FC = () => {
  const warnings = useWorkoutBuilderStore((s) => s.validationWarnings);
  const openPicker = useWorkoutBuilderStore((s) => s.openPicker);
  const draft = useWorkoutBuilderStore((s) => s.draft);
  const applyAiSuggestions = useWorkoutBuilderStore((s) => s.applyAiSuggestions);

  const [expanded, setExpanded] = useState(false);
  const [fixingDayIndex, setFixingDayIndex] = useState<number | null>(null);

  // ── Phase 9: AI-powered "Fix Imbalance" for replace_exercise ──
  // Fetches an AI suggestion for a replacement exercise and applies it.
  const handleAiReplace = useCallback(
    async (warning: ValidationWarning) => {
      const payload = warning.fixAction?.payload as {
        exerciseId?: string;
        dayIndex?: number;
        muscleGroup?: string;
      } | undefined;
      const dayIndex = payload?.dayIndex ?? warning.dayIndex ?? 0;
      if (!draft) return;
      const day = draft.workouts[dayIndex];
      if (!day) return;

      setFixingDayIndex(dayIndex);
      haptics.light();
      try {
        const currentExercises = day.plannedExercises ?? [];
        const result = await workoutBuilderAi.suggestDay({
          dayIndex,
          currentExercises,
          goals: [`replace ${payload?.exerciseId ?? "exercise"}`],
        });
        if (result.success && result.data && result.data.suggestions.length > 0) {
          // Apply the top AI suggestion as the replacement.
          applyAiSuggestions(dayIndex, [result.data.suggestions[0]]);
          haptics.success();
        } else {
          // AI failed or returned nothing — fall back to opening the picker.
          openPicker({ dayIndex });
        }
      } catch (err) {
        console.error("[InlineValidationBanner] AI replace failed:", err);
        openPicker({ dayIndex });
      } finally {
        setFixingDayIndex(null);
      }
    },
    [draft, applyAiSuggestions, openPicker],
  );

  // Track previous warning IDs so we fire a single haptic when a NEW warning
  // appears (not on every re-render that preserves the same set).
  const prevWarningIdsRef = useRef<Set<string>>(new Set(warnings.map((w) => w.id)));

  useEffect(() => {
    const currentIds = new Set(warnings.map((w) => w.id));
    const prevIds = prevWarningIdsRef.current;
    // A "new" warning is one in `currentIds` but not in `prevIds`. We only
    // haptic when at least one new warning appeared AND the warning count
    // didn't drop to zero (going to zero is a success, handled below).
    const hasNew = [...currentIds].some((id) => !prevIds.has(id));
    if (hasNew && warnings.length > 0) {
      haptics.warning();
    } else if (prevIds.size > 0 && warnings.length === 0) {
      // Cleared all warnings — positive confirmation.
      haptics.success();
    }
    prevWarningIdsRef.current = currentIds;
  }, [warnings]);

  // ── Empty state: render a subtle "balanced" chip ──
  // Only claim "balanced" when validation has actually run (draft exists). If
  // the draft is null we surface a neutral "No plan to validate yet" chip so
  // we don't falsely claim balance.
  if (warnings.length === 0) {
    const hasDraft = Boolean(draft);
    return (
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.emptyWrap}
      >
        <View style={styles.balancedChip}>
          <Ionicons
            name={hasDraft ? "checkmark-circle" : "information-circle-outline"}
            size={rf(14)}
            color={hasDraft ? colors.success.DEFAULT : colors.text.secondary}
          />
          <Text style={styles.balancedText}>
            {hasDraft ? "Plan looks balanced" : "No plan to validate yet"}
          </Text>
        </View>
      </Animated.View>
    );
  }

  const topWarning = warnings[0];
  const topSeverity = SEVERITY_STYLES[topWarning.severity];
  const errorCount = warnings.filter((w) => w.severity === "error").length;
  const warningCount = warnings.filter((w) => w.severity === "warning").length;

  const headerLabel =
    errorCount > 0
      ? `${errorCount} error${errorCount > 1 ? "s" : ""}${
          warningCount > 0 ? ` · ${warningCount} warning${warningCount > 1 ? "s" : ""}` : ""
        }`
      : `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={styles.container}
    >
      <GlassCard
        blurIntensity="default"
        elevation={2}
        padding="sm"
        borderRadius="lg"
        showBorder
        style={styles.card}
      >
        {/* Header row — tap to expand/collapse */}
        <Pressable
          onPress={() => {
            haptics.selection();
            setExpanded((e) => !e);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Validation: ${headerLabel}. ${
            expanded ? "Collapse" : "Expand"
          } for details.`}
          accessibilityState={{ expanded }}
          style={styles.header}
        >
          <View style={[styles.severityDot, { backgroundColor: topSeverity.color }]} />
          <Ionicons
            name={topSeverity.icon}
            size={rf(18)}
            color={topSeverity.color}
          />
          <Text style={styles.headerLabel} numberOfLines={1}>
            {headerLabel}
          </Text>
          <Text style={styles.topMessage} numberOfLines={1}>
            {topWarning.message}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={rf(16)}
            color={colors.text.tertiary}
            style={styles.chevron}
          />
        </Pressable>

        {/* Expanded list — full warning cards */}
        {expanded && (
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            scrollEnabled={warnings.length > 3}
            nestedScrollEnabled
          >
            {warnings.map((w, idx) => (
              <WarningCard
                key={w.id}
                warning={w}
                index={idx}
                isFixing={fixingDayIndex === (w.dayIndex ?? -1)}
                onFix={() => {
                  // Phase 9: replace_exercise uses AI to suggest a replacement;
                  // other action types fall through to the picker/store.
                  if (w.fixAction?.type === "replace_exercise") {
                    void handleAiReplace(w);
                  } else {
                    handleFixAction(w, openPicker);
                  }
                }}
              />
            ))}
          </ScrollView>
        )}
      </GlassCard>
    </Animated.View>
  );
};

// ----------------------------------------------------------------------------
// WARNING CARD
// ----------------------------------------------------------------------------

interface WarningCardProps {
  warning: ValidationWarning;
  index: number;
  isFixing: boolean;
  onFix: () => void;
}

const WarningCard: React.FC<WarningCardProps> = ({ warning, index, isFixing, onFix }) => {
  const style = SEVERITY_STYLES[warning.severity];

  return (
    <Animated.View
      entering={FadeInDown.springify().delay(index * 30)}
      style={[styles.warningCard, { backgroundColor: style.tint }]}
    >
      {/* Severity color strip (left edge) */}
      <View style={[styles.strip, { backgroundColor: style.color }]} />

      <View style={styles.warningBody}>
        <View style={styles.warningHeader}>
          <Ionicons name={style.icon} size={rf(16)} color={style.color} />
          <Text style={styles.warningMessage}>{warning.message}</Text>
        </View>

        {warning.fixAction && (
          <GlassButton
            label={isFixing ? "Fixing…" : warning.fixAction.label}
            onPress={onFix}
            loading={isFixing}
            disabled={isFixing}
            variant={
              warning.severity === "error"
                ? "error"
                : warning.severity === "warning"
                  ? "warning"
                  : "secondary"
            }
            hapticType="light"
            style={styles.fixBtn}
            textStyle={styles.fixBtnText}
          />
        )}
      </View>
    </Animated.View>
  );
};

// ----------------------------------------------------------------------------
// FIX ACTION HANDLER
// ----------------------------------------------------------------------------

/**
 * Wire a warning's fixAction to the appropriate store action. The picker
 * (Phase 4) is wired for `add_exercise` / `replace_exercise` — opening it
 * filtered to the relevant day lets the user complete the fix. Destructive
 * actions (`remove_exercise`) and advisory ones (`adjust_volume`) do not
 * auto-execute; the user acts on them via the exercise row's own menu.
 */
function handleFixAction(
  warning: ValidationWarning,
  openPicker: (ctx: { dayIndex: number; slotIndex?: number }) => void,
): void {
  const action = warning.fixAction;
  if (!action) return;

  haptics.selection();

  switch (action.type) {
    case "add_exercise": {
      const payload = action.payload as { muscleGroup?: string; dayIndex?: number } | undefined;
      // Open the picker on the day that originated the warning, or the first
      // active day if no dayIndex is set. The picker (Phase 4) reads
      // pickerContext to filter by muscle group.
      const dayIndex = payload?.dayIndex ?? warning.dayIndex ?? 0;
      openPicker({ dayIndex });
      break;
    }
    case "replace_exercise": {
      const payload = action.payload as {
        exerciseId?: string;
        suggestedReplacementId?: string;
        dayIndex?: number;
      } | undefined;
      const dayIndex = payload?.dayIndex ?? warning.dayIndex ?? 0;
      // Open the picker on the relevant day; the suggested replacement id is
      // carried in the payload for the picker to pre-select (Phase 4 feature).
      openPicker({ dayIndex });
      break;
    }
    case "remove_exercise": {
      // Destructive — don't auto-execute. The user can remove via the
      // exercise row's own menu. Selection haptic already fired above.
      break;
    }
    case "adjust_volume": {
      // Advisory — the user adjusts volume via the exercise editor (Phase 5).
      // No direct store mutation here; selection haptic confirms the tap.
      break;
    }
    default:
      console.error("[InlineValidationBanner] unhandled fixAction type:", (action as { type: string }).type);
  }
}

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginBottom: rp(spacing.sm),
  },
  emptyWrap: {
    marginBottom: rp(spacing.sm),
  },
  balancedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    alignSelf: "flex-start",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    minHeight: Math.max(rp(36), 36),
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(76, 175, 80, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.4)",
  },
  balancedText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  card: {
    backgroundColor: colors.glass.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.xxs),
    minHeight: Math.max(rp(44), 44),
  },
  severityDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  headerLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
    flexShrink: 0,
  },
  topMessage: {
    flex: 1,
    flexShrink: 1,
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    marginLeft: rp(spacing.xs),
  },
  chevron: {
    marginLeft: rp(spacing.xs),
    flexShrink: 0,
  },
  listScroll: {
    marginTop: rp(spacing.sm),
    maxHeight: rp(240),
  },
  listContent: {
    gap: rp(spacing.xs),
  },
  warningCard: {
    flexDirection: "row",
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  strip: {
    width: rw(4),
    alignSelf: "stretch",
  },
  warningBody: {
    flex: 1,
    padding: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rp(spacing.xs),
  },
  warningMessage: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
  },
  fixBtn: {
    alignSelf: "flex-start",
    minHeight: Math.max(rf(32), 44),
  },
  fixBtnText: {
    fontSize: rf(typography.fontSize.micro),
  },
});

export default InlineValidationBanner;
