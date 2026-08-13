/**
 * WarningCard — S5 "Choose your pace" ("Editorial Dark" + volt pace panel)
 *
 * The pace decision is the ONE moment on the review screen where a single tap
 * re-derives the whole plan — so it gets the screen's single contrasting
 * block: a low-alpha volt panel (accent tint + accent hairline border) that
 * sits apart from the surrounding hairline-only sections, with a why-line up
 * top so the user understands what this choice drives ("daily calories,
 * weekly deficit and timeline").
 *
 * Inside the panel (weight-loss mode) the pace ladder renders as named tiers
 * — Relaxed (~0.5), Comfortable (~1.0), Recommended (the engine's safe capped
 * rate) and Your goal (the user's pick, with its engine safety verdict) —
 * each row carrying a big tabular rate number, engine-composed cal/day and
 * weeks-to-goal. Tier derivation lives in review/goalRateTiers.ts (composed
 * from engine outputs, never forked math); selection flows through the
 * existing onSelectAlternative → handleRateSelection channel, which persists
 * weekly_weight_loss_goal (SSOT) and re-runs the ValidationEngine, so every
 * downstream number re-derives from the same source.
 *
 * Gain / maintenance modes keep their AlternativeOption lists, now inside the
 * same panel so the decision block reads consistently across goal modes.
 *
 * Selection / acknowledgment / auto-ack logic — UNCHANGED.
 */

import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  ValidationResult,
  SmartAlternative,
  SmartAlternativesResult,
} from "../../services/validationEngine";
import { AlternativeOption } from "./AlternativeOption";
import { BMRInfoModal } from "./BMRInfoModal";
import { SectionLabel, tokens, font, type as typeScale } from "./fresh";
import {
  buildLossPaceTiers,
  hasSelectablePaceTier,
  isPaceTierSelected,
  type PaceTier,
} from "./review/goalRateTiers";

// ============================================================================
// TYPES
// ============================================================================

interface WarningCardProps {
  warnings: ValidationResult[];
  onAcknowledgmentChange?: (acknowledged: boolean) => void;
  // SmartAlternatives data (previously in RateComparisonCard)
  smartAlternatives?: SmartAlternativesResult | null;
  selectedAlternativeId?: string | null;
  /** SSOT rate from workoutPreferences.weekly_weight_loss_goal — used to mark
      the active tier when it is a composed tier (never an engine card id). */
  selectedWeeklyRate?: number | null;
  onSelectAlternative?: (alternative: SmartAlternative) => void;
}

const formatCalories = (cal: number | null | undefined): string =>
  cal != null && !isNaN(cal) ? Number(cal).toLocaleString() : "—";

// ============================================================================
// PACE TIER ROW — one rung of the pace ladder (loss mode)
// ============================================================================

interface PaceTierRowProps {
  tier: PaceTier;
  isSelected: boolean;
  onSelect: (alternative: SmartAlternative) => void;
  delay: number;
}

const PaceTierRow: React.FC<PaceTierRowProps> = ({
  tier,
  isSelected,
  onSelect,
  delay,
}) => {
  // Engine-blocked pick: visible for honesty, locked from selection.
  if (tier.blocked) {
    return (
      <Animated.View entering={FadeInDown.duration(250).delay(delay)}>
        <View
          style={[styles.tierRow, styles.tierRowBlocked]}
          accessibilityState={{ disabled: true }}
        >
          <Ionicons
            name="lock-closed"
            size={15}
            color={tokens.ink3}
            style={styles.tierLock}
          />
          <View style={styles.tierLeft}>
            <View style={styles.tierTitleRow}>
              <Text style={[styles.tierTitle, styles.tierTitleBlocked]}>
                {tier.title}
              </Text>
              {tier.badge && (
                <Text style={[styles.tierBadge, styles.tierBadgeDanger]}>{tier.badge}</Text>
              )}
            </View>
            <Text style={styles.tierMeta}>
              {tier.warning ?? "Not safely deliverable at your numbers"}
            </Text>
          </View>
          <View style={styles.tierRateBlock}>
            <Text style={[styles.tierRate, styles.tierRateBlocked]}>
              {tier.rate.toFixed(2)}
            </Text>
            <Text style={styles.tierRateUnit}>kg/wk</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(250).delay(delay)}>
      <Pressable
        onPress={() => onSelect(tier.alternative)}
        style={({ pressed }) => [
          styles.tierRow,
          isSelected && styles.tierRowSelected,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${tier.title}: ${tier.rate.toFixed(2)} kilograms per week`}
        accessibilityHint="Updates your calories, deficit and timeline"
      >
        <View style={styles.tierLeft}>
          <View style={styles.tierTitleRow}>
            <Text style={[styles.tierTitle, isSelected && styles.tierTitleSelected]}>
              {tier.title}
            </Text>
            {tier.badge && (
              <Text
                style={[
                  styles.tierBadge,
                  tier.tone === "accent" && styles.tierBadgeAccent,
                  tier.tone === "danger" && styles.tierBadgeDanger,
                ]}
              >
                {tier.badge}
              </Text>
            )}
          </View>
          <Text style={styles.tierNote}>
            {tier.note}
          </Text>
          <Text style={styles.tierMeta}>
            {formatCalories(tier.dailyCalories)} cal/day
            {"  ·  "}
            {tier.timelineWeeks > 0 ? `${tier.timelineWeeks} weeks to goal` : "Ongoing"}
          </Text>
          {tier.warning && (
            <Text style={styles.tierWarning}>
              {tier.warning}
            </Text>
          )}
        </View>
        <View style={styles.tierRateBlock}>
          <Text style={[styles.tierRate, isSelected && styles.tierRateSelected]}>
            {tier.rate.toFixed(2)}
          </Text>
          <Text style={styles.tierRateUnit}>kg/wk</Text>
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={tokens.accent}
            style={styles.tierCheck}
          />
        )}
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export const WarningCard: React.FC<WarningCardProps> = ({
  warnings,
  onAcknowledgmentChange,
  smartAlternatives,
  selectedAlternativeId,
  selectedWeeklyRate,
  onSelectAlternative,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showBMRModal, setShowBMRModal] = useState(false);
  const [showExerciseOptions, setShowExerciseOptions] = useState(false);

  // Split warnings: actionable (with alternatives) vs info-only
  const warningsWithAlternatives = warnings.filter(
    (w) => w.alternatives && w.alternatives.length > 0,
  );
  const warningsWithoutAlternatives = warnings.filter(
    (w) => !w.alternatives || w.alternatives.length === 0,
  );

  // S03: auto-acknowledgment is owned by useAdvancedReviewForm (single owner).
  // The child-side effect raced the parent's reset effect and lost, leaving
  // users with an un-acknowledgeable disabled CTA. Manual taps still flow
  // through handleAcknowledgmentToggle below.

  const handleAcknowledgmentToggle = () => {
    const newValue = !acknowledged;
    setAcknowledged(newValue);
    onAcknowledgmentChange?.(newValue);
  };

  const goalMode = smartAlternatives?.goalMode ?? "loss";

  // Loss-mode pace ladder (Relaxed / Comfortable / Recommended / Your goal),
  // composed from engine outputs. Empty for gain/maintenance modes.
  const paceTiers = useMemo(
    () => buildLossPaceTiers(smartAlternatives),
    [smartAlternatives],
  );

  // S15: every pace option blocked (or none offered) — say so honestly instead
  // of rendering a dead picker the user can tap through into engine errors.
  const selectableCount =
    smartAlternatives?.alternatives.filter((a) => !a.isBlocked).length ?? 1;
  const noSelectableOptions =
    (!!smartAlternatives && selectableCount === 0) ||
    (goalMode === "loss" &&
      !!smartAlternatives &&
      paceTiers.length > 0 &&
      !hasSelectablePaceTier(paceTiers));

  // Diet-only options (gain / maintenance layouts)
  const dietOptions =
    smartAlternatives?.alternatives.filter((alt) => !alt.requiresExercise) ?? [];

  // For weight loss: promoted boost card shown inline below the tier ladder
  const goalBoostOption = goalMode === "loss"
    ? (smartAlternatives?.alternatives.find(a => a.id === smartAlternatives?.bestBoostOptionId) ?? null)
    : null;

  // Exercise options excluding the promoted boost (shown in collapsible toggle)
  const otherExerciseOptions =
    smartAlternatives?.alternatives.filter(
      (alt) => alt.requiresExercise && alt.id !== goalBoostOption?.id
    ) ?? [];

  // For weight gain: frequency upgrade options
  const frequencyUpgradeOptions = otherExerciseOptions.filter(a => a.isFrequencyUpgrade);

  const userOriginal = smartAlternatives?.alternatives.find(
    (alt) => alt.isUserOriginal,
  );
  const belowBMR = userOriginal && userOriginal.bmrDifference < 0;

  // Auto-expand other exercise options when one is selected.
  // M2: include smartAlternatives in deps so the check re-runs if cards regenerate
  // while selectedAlternativeId is unchanged (e.g. tab remount with same stored goal).
  useEffect(() => {
    if (selectedAlternativeId && otherExerciseOptions.some(o => o.id === selectedAlternativeId)) {
      setShowExerciseOptions(true);
    }
  }, [selectedAlternativeId, smartAlternatives]);

  // Shared context rendering for a warning: message + impact + risks
  // (hairline-free quiet body blocks — no tinted containers).
  const renderWarningContext = (warning: ValidationResult, keyPrefix: string) => (
    <View style={styles.warningItem}>
      <Text style={styles.warningMessage}>{warning.message}</Text>

      {warning.impact && (
        <View style={styles.metaRow}>
          <Ionicons name="flash-outline" size={12} color={tokens.ink3} />
          <Text style={styles.metaText}>{warning.impact}</Text>
        </View>
      )}

      {warning.risks && warning.risks.length > 0 && (
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>What to watch</Text>
          {warning.risks.map((risk, i) => (
            <Text key={`${keyPrefix}-risk-${i}`} style={styles.metaItem}>
              {risk}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const panelWhy =
    goalMode === "gain"
      ? "One choice — it sets your daily surplus and timeline."
      : goalMode === "maintenance"
        ? "One choice — it sets your daily calories from here."
        : "One choice — it sets your daily calories, weekly deficit and timeline.";

  const panelTitle =
    goalMode === "maintenance" ? "Your balance" : "Select your rate";

  const showPanel =
    !!smartAlternatives &&
    (paceTiers.length > 0 || dietOptions.length > 0 || !!goalBoostOption);

  return (
    <View style={styles.container}>
      {/* ── Section label ── */}
      <SectionLabel>Choose your pace</SectionLabel>

      {/* ── Goal Summary (hairline-bounded quiet text, no box) ──
          Only the requested rate is shown here — the WeightManagementSection
          hero above already anchors target weight and kg-to-lose/gain. */}
      {smartAlternatives && (
        <Animated.View style={styles.goalSummary} entering={FadeInDown.duration(250)}>
          <Text style={styles.goalText}>
            Your goal{"  "}
            <Text style={styles.goalValue}>
              {typeof smartAlternatives.originalRequestedRate === "number"
                ? smartAlternatives.originalRequestedRate.toFixed(2)
                : smartAlternatives.originalRequestedRate}{" "}
              kg/week
            </Text>
          </Text>
        </Animated.View>
      )}

      {/* ── BMR Warning Callout (hairline-separated, tappable → info modal) ── */}
      {belowBMR && smartAlternatives && (
        <Pressable
          style={({ pressed }) => [styles.callout, pressed && styles.pressed]}
          onPress={() => setShowBMRModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Open BMR warning details"
        >
          <Ionicons name="warning" size={16} color={tokens.danger} />
          <Text style={styles.calloutText}>
            This pace requires eating below your BMR (
            {smartAlternatives.userBMR} cal)
          </Text>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={tokens.ink3}
          />
        </Pressable>
      )}

      {/* ── Warning Context Messages ── */}
      {warningsWithAlternatives.map((warning, index) => (
        <View key={`actionable-${index}`}>
          {renderWarningContext(warning, `a${index}`)}
        </View>
      ))}

      {/* ── Volt pace panel — the screen's single contrasting block ── */}
      {showPanel && (
        <Animated.View
          style={styles.pacePanel}
          entering={FadeInDown.duration(300).delay(80)}
        >
          {/* Panel header — accent mark + why-line (why this block exists) */}
          <View style={styles.paceHeader}>
            <Ionicons name="speedometer-outline" size={15} color={tokens.accent} />
            <Text style={styles.paceTitle}>{panelTitle}</Text>
          </View>
          <Text style={styles.paceWhy}>{panelWhy}</Text>

          {/* WEIGHT LOSS LAYOUT — named pace tiers */}
          {goalMode === "loss" && (
            <View style={styles.tierList}>
              {paceTiers.map((tier, i) => (
                <PaceTierRow
                  key={tier.key}
                  tier={tier}
                  isSelected={isPaceTierSelected(
                    tier,
                    selectedAlternativeId,
                    selectedWeeklyRate,
                  )}
                  onSelect={onSelectAlternative ?? (() => {})}
                  delay={140 + i * 60}
                />
              ))}
            </View>
          )}

          {/* WEIGHT GAIN LAYOUT — engine surplus cards */}
          {goalMode === "gain" && (
            <View>
              {dietOptions.map((alternative, i) => (
                <Animated.View
                  key={alternative.id}
                  entering={FadeInDown.duration(250).delay(140 + i * 60)}
                >
                  <AlternativeOption
                    alternative={alternative}
                    isSelected={selectedAlternativeId === alternative.id}
                    onSelect={onSelectAlternative ?? (() => {})}
                  />
                </Animated.View>
              ))}
            </View>
          )}

          {/* MAINTENANCE LAYOUT — maintain / recomp */}
          {goalMode === "maintenance" && (
            <View>
              {dietOptions.map((alternative, i) => (
                <Animated.View
                  key={alternative.id}
                  entering={FadeInDown.duration(250).delay(140 + i * 60)}
                >
                  <AlternativeOption
                    alternative={alternative}
                    isSelected={selectedAlternativeId === alternative.id}
                    onSelect={onSelectAlternative ?? (() => {})}
                  />
                </Animated.View>
              ))}
            </View>
          )}

          {/* Unlock hint + promoted boost row (loss mode) */}
          {goalMode === "loss" && goalBoostOption && (
            <Animated.View entering={FadeInDown.duration(250).delay(320)}>
              <Pressable
                style={({ pressed }) => [styles.unlockHint, pressed && styles.pressed]}
                onPress={() => onSelectAlternative?.(goalBoostOption)}
                accessibilityRole="button"
                accessibilityLabel="Unlock your goal with exercise"
              >
                <Ionicons name="lock-open-outline" size={12} color={tokens.ink3} />
                <Text style={styles.unlockHintText}>
                  Closer to your goal with exercise ↓
                </Text>
              </Pressable>
              <AlternativeOption
                key={goalBoostOption.id}
                alternative={goalBoostOption}
                isSelected={selectedAlternativeId === goalBoostOption.id}
                onSelect={onSelectAlternative ?? (() => {})}
              />
            </Animated.View>
          )}

          {/* Other boost options in collapsible toggle (loss mode) */}
          {goalMode === "loss" &&
            otherExerciseOptions.filter(a => !a.isFrequencyUpgrade).length > 0 && (
            <View>
              <Pressable
                style={({ pressed }) => [styles.exerciseDivider, pressed && styles.pressed]}
                onPress={() => setShowExerciseOptions(!showExerciseOptions)}
                accessibilityRole="button"
                accessibilityLabel={showExerciseOptions ? "Hide exercise options" : "Show exercise options"}
              >
                <View style={styles.dividerLine} />
                <View style={styles.dividerContent}>
                  <Ionicons name="fitness-outline" size={13} color={tokens.ink3} />
                  <Text style={styles.dividerText}>
                    {showExerciseOptions ? "HIDE" : "OR ADD"} EXERCISE
                  </Text>
                  <Ionicons
                    name={showExerciseOptions ? "chevron-up" : "chevron-down"}
                    size={13}
                    color={tokens.ink3}
                  />
                </View>
                <View style={styles.dividerLine} />
              </Pressable>

              {showExerciseOptions && (
                <View>
                  {otherExerciseOptions.filter(a => !a.isFrequencyUpgrade).map((alternative, i) => (
                    <Animated.View
                      key={alternative.id}
                      entering={FadeInDown.duration(200).delay(i * 50)}
                    >
                      <AlternativeOption
                        alternative={alternative}
                        isSelected={selectedAlternativeId === alternative.id}
                        onSelect={onSelectAlternative ?? (() => {})}
                      />
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Frequency upgrade options (gain mode) */}
          {goalMode === "gain" && frequencyUpgradeOptions.length > 0 && (
            <View>
              <Pressable
                style={({ pressed }) => [styles.exerciseDivider, pressed && styles.pressed]}
                onPress={() => setShowExerciseOptions(!showExerciseOptions)}
                accessibilityRole="button"
                accessibilityLabel={showExerciseOptions ? "Hide training options" : "Add more training days"}
              >
                <View style={styles.dividerLine} />
                <View style={styles.dividerContent}>
                  <Ionicons name="barbell-outline" size={13} color={tokens.ink3} />
                  <Text style={styles.dividerText}>
                    {showExerciseOptions ? "HIDE" : "OR ADD MORE"} TRAINING
                  </Text>
                  <Ionicons
                    name={showExerciseOptions ? "chevron-up" : "chevron-down"}
                    size={13}
                    color={tokens.ink3}
                  />
                </View>
                <View style={styles.dividerLine} />
              </Pressable>

              {showExerciseOptions && (
                <View>
                  {frequencyUpgradeOptions.map((alternative, i) => (
                    <Animated.View
                      key={alternative.id}
                      entering={FadeInDown.duration(200).delay(i * 50)}
                    >
                      <AlternativeOption
                        alternative={alternative}
                        isSelected={selectedAlternativeId === alternative.id}
                        onSelect={onSelectAlternative ?? (() => {})}
                      />
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Safe rate footnote — quiet caption inside the panel */}
          {goalMode === "loss" && (
            <View style={styles.safeRateRow}>
              <Ionicons name="shield-checkmark" size={13} color={tokens.ink3} />
              <Text style={styles.safeRateText}>
                Safe rate at your BMR:{" "}
                <Text style={styles.safeRateValue}>{smartAlternatives.rateAtBMR} kg/week</Text>
                {" — faster needs exercise or drops below what your body needs"}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* ── S15: infeasible-goal guidance — no safe pace exists at these numbers ── */}
      {noSelectableOptions && (
        <View style={styles.warningItem}>
          <Text style={styles.warningMessage}>
            No safe pace fits this goal at your current numbers
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="flag-outline" size={12} color={tokens.ink3} />
            <Text style={styles.metaText}>
              {goalMode === "gain"
                ? "Try a smaller weight-gain target — you can set the next milestone after reaching it."
                : "Try a slightly higher target weight or a smaller weekly change — safe options will reappear here automatically."}
            </Text>
          </View>
        </View>
      )}

      {/* ── Non-Actionable Warnings (info only) ── */}
      {warningsWithoutAlternatives.map((warning, index) => (
        <View key={`info-${index}`}>
          {renderWarningContext(warning, `i${index}`)}

          {warning.recommendations && warning.recommendations.length > 0 && (
            <View style={styles.metaBlock}>
              {warning.recommendations.map((rec, i) => (
                <View key={`i${index}-rec-${i}`} style={styles.metaRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={13}
                    color={tokens.ink3}
                  />
                  <Text style={styles.metaText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* ── Acknowledgment — fresh hairline row + standard fresh checkbox ── */}
      {warningsWithoutAlternatives.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.ackRow, pressed && styles.pressed]}
          onPress={handleAcknowledgmentToggle}
          accessibilityRole="button"
          accessibilityState={{ selected: acknowledged }}
          accessibilityLabel="I understand and will focus on consistency"
        >
          <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
            {acknowledged && (
              <Ionicons name="checkmark" size={13} color={tokens.accent} />
            )}
          </View>
          <Text style={styles.ackLabel}>
            I understand and will focus on consistency
          </Text>
        </Pressable>
      )}

      {/* ── BMR Info Modal ── */}
      {smartAlternatives && (
        <BMRInfoModal
          visible={showBMRModal}
          onClose={() => setShowBMRModal(false)}
          userBMR={smartAlternatives.userBMR}
        />
      )}
    </View>
  );
};

// ============================================================================
// STYLES — hairlines + ink scale elsewhere; the pace panel is the ONE
// volt-tinted block on the screen (accent at low alpha, never a fill).
// ============================================================================

const styles = StyleSheet.create({
  container: {
    // Transparent — this is a section, not a card.
  },
  pressed: {
    opacity: 0.6,
  },

  // Goal summary — hairline-bounded quiet text
  goalSummary: {
    marginTop: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.hairline,
  },
  goalText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink2,
  },
  goalValue: {
    fontFamily: font.semibold,
    color: tokens.ink,
  },

  // BMR warning — hairline callout (not a tinted banner)
  callout: {
    marginTop: 12,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.hairline,
  },
  calloutText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.danger,
  },

  // Warning context
  warningItem: {
    marginTop: 14,
  },
  warningMessage: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.ink2,
  },
  metaBlock: {
    marginTop: 10,
    gap: 4,
  },
  metaLabel: {
    ...typeScale.sectionLabel,
    marginBottom: 2,
  },
  metaItem: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.ink2,
  },

  // ── Volt pace panel — the distinct decision block ──
  pacePanel: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.24)",
    backgroundColor: "rgba(255,107,53,0.06)",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  paceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paceTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: tokens.accent,
  },
  paceWhy: {
    marginTop: 6,
    marginBottom: 14,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.ink2,
  },

  // Tier ladder
  tierList: {
    gap: 8,
  },
  tierRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tierRowSelected: {
    borderColor: "rgba(255,107,53,0.55)",
    backgroundColor: tokens.accentDim,
  },
  tierRowBlocked: {
    opacity: 0.55,
  },
  tierLock: {
    marginRight: 2,
  },
  tierLeft: {
    flex: 1,
    justifyContent: "center",
  },
  tierTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierTitle: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: tokens.ink2,
    flexShrink: 1,
  },
  tierTitleSelected: {
    color: tokens.ink,
  },
  tierTitleBlocked: {
    color: tokens.ink3,
  },
  tierBadge: {
    fontFamily: font.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  tierBadgeAccent: {
    color: tokens.accent,
  },
  tierBadgeDanger: {
    color: tokens.danger,
  },
  tierNote: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink2,
  },
  tierMeta: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  tierWarning: {
    marginTop: 4,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: tokens.danger,
  },
  tierRateBlock: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  tierRate: {
    fontFamily: font.semibold,
    fontSize: 24,
    color: tokens.ink,
    fontVariant: ["tabular-nums"],
  },
  tierRateSelected: {
    color: tokens.accent,
  },
  tierRateBlocked: {
    color: tokens.ink3,
  },
  tierRateUnit: {
    fontFamily: font.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  tierCheck: {
    marginLeft: 2,
  },

  unlockHint: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  unlockHintText: {
    fontFamily: font.semibold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: tokens.ink2,
  },
  exerciseDivider: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    marginVertical: 8,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.hairline,
  },
  dividerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  dividerText: {
    fontFamily: font.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  safeRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,107,53,0.16)",
  },
  safeRateText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: tokens.ink3,
  },
  safeRateValue: {
    fontFamily: font.semibold,
    color: tokens.ink,
  },

  // Acknowledgment — hairline row + fresh checkbox (no glass)
  ackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    paddingVertical: 14,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: tokens.hairline,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: tokens.ink3,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: tokens.accent,
    backgroundColor: tokens.accentDim,
  },
  ackLabel: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    color: tokens.ink2,
  },
});
