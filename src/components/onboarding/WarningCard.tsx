/**
 * WarningCard — S5 "Choose your pace" ("Editorial Dark", no cards)
 *
 * Rebuilt on the fresh pattern: transparent background, hairline separators,
 * ink type scale (small-caps SectionLabels + 13–15px body in ink2). Accent
 * appears ONLY on the selected pace option (handled inside AlternativeOption)
 * and on the agreement check. No tinted backgrounds, no borders, no radius,
 * no fontWeight hacks, no glass checkbox.
 *
 * Selection / acknowledgment / auto-ack logic — UNCHANGED.
 */

import React, { useState, useEffect, useRef } from "react";
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

// ============================================================================
// TYPES
// ============================================================================

interface WarningCardProps {
  warnings: ValidationResult[];
  onAcknowledgmentChange?: (acknowledged: boolean) => void;
  // SmartAlternatives data (previously in RateComparisonCard)
  smartAlternatives?: SmartAlternativesResult | null;
  selectedAlternativeId?: string | null;
  onSelectAlternative?: (alternative: SmartAlternative) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WarningCard: React.FC<WarningCardProps> = ({
  warnings,
  onAcknowledgmentChange,
  smartAlternatives,
  selectedAlternativeId,
  onSelectAlternative,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showBMRModal, setShowBMRModal] = useState(false);
  const [showExerciseOptions, setShowExerciseOptions] = useState(false);
  const autoAckFiredRef = useRef(false);

  // Split warnings: actionable (with alternatives) vs info-only
  const warningsWithAlternatives = warnings.filter(
    (w) => w.alternatives && w.alternatives.length > 0,
  );
  const warningsWithoutAlternatives = warnings.filter(
    (w) => !w.alternatives || w.alternatives.length === 0,
  );
  const hasActionableWarnings = warningsWithAlternatives.length > 0;
  const noInfoWarnings = warningsWithoutAlternatives.length === 0;
  const noWarningsAtAll = warnings.length === 0;

  // If no non-actionable warnings remain, auto-acknowledge — guard prevents re-fire on parent re-render
  useEffect(() => {
    if ((noInfoWarnings && hasActionableWarnings) || (noWarningsAtAll && smartAlternatives)) {
      if (!autoAckFiredRef.current) {
        autoAckFiredRef.current = true;
        onAcknowledgmentChange?.(true);
      }
    } else {
      autoAckFiredRef.current = false;
    }
  }, [noInfoWarnings, hasActionableWarnings, noWarningsAtAll, !!smartAlternatives]);

  const handleAcknowledgmentToggle = () => {
    const newValue = !acknowledged;
    setAcknowledged(newValue);
    onAcknowledgmentChange?.(newValue);
  };

  const goalMode = smartAlternatives?.goalMode ?? "loss";

  // Diet-only options (all modes)
  const dietOptions =
    smartAlternatives?.alternatives.filter((alt) => !alt.requiresExercise) ?? [];

  // For weight loss: promoted boost card shown inline between KEEP MY GOAL and other diet cards
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

  return (
    <View style={styles.container}>
      {/* ── Section label ── */}
      <SectionLabel>Choose your pace</SectionLabel>

      {/* ── Goal Summary (hairline-bounded quiet text, no box) ── */}
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
            {"   ·   "}Target{"  "}
            <Text style={styles.goalValue}>
              {smartAlternatives.targetWeight} kg
            </Text>
          </Text>
          <Text style={styles.goalCaption}>
            {smartAlternatives.weightToLose != null
              ? smartAlternatives.weightToLose.toFixed(1)
              : "--"}{" "}
            {goalMode === "gain" ? "kg to gain" : goalMode === "maintenance" ? "kg to balance" : "kg to lose"}
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

      {/* ── Inline Rate Picker ── */}
      {smartAlternatives && (dietOptions.length > 0 || goalBoostOption) && (
        <View style={styles.rateSection}>
          <SectionLabel>
            {goalMode === "maintenance" ? "Your balance" : "Select your rate"}
          </SectionLabel>

          {/* WEIGHT LOSS LAYOUT */}
          {goalMode === "loss" && (
            <View>
              {/* 1. KEEP MY GOAL (identified by isUserOriginal flag, not position) */}
              {(() => {
                const keepMyGoalCard = dietOptions.find((alt) => alt.isUserOriginal === true);
                return keepMyGoalCard ? (
                  <Animated.View entering={FadeInDown.duration(250).delay(80)}>
                    <AlternativeOption
                      key={keepMyGoalCard.id}
                      alternative={keepMyGoalCard}
                      isSelected={selectedAlternativeId === keepMyGoalCard.id}
                      onSelect={onSelectAlternative ?? (() => {})}
                    />
                  </Animated.View>
                ) : null;
              })()}

              {/* 2. Unlock hint + promoted boost row */}
              {goalBoostOption && (
                <Animated.View entering={FadeInDown.duration(250).delay(140)}>
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

              {/* 3. Remaining diet options (AGGRESSIVE, CHALLENGING, AT YOUR BMR, COMFORTABLE) */}
              <View>
                {dietOptions.filter((alt) => alt.isUserOriginal !== true).map((alternative, i) => (
                  <Animated.View
                    key={alternative.id}
                    entering={FadeInDown.duration(250).delay(200 + i * 60)}
                  >
                    <AlternativeOption
                      alternative={alternative}
                      isSelected={selectedAlternativeId === alternative.id}
                      onSelect={onSelectAlternative ?? (() => {})}
                    />
                  </Animated.View>
                ))}
              </View>

              {/* 4. Other boost options in collapsible toggle (LIGHT BOOST, CARDIO BOOST) */}
              {otherExerciseOptions.filter(a => !a.isFrequencyUpgrade).length > 0 && (
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

              {/* Safe rate note — quiet caption, no box */}
              <View style={styles.safeRateRow}>
                <Ionicons name="shield-checkmark" size={13} color={tokens.ink3} />
                <Text style={styles.safeRateText}>
                  Safe rate at your BMR:{" "}
                  <Text style={styles.safeRateValue}>{smartAlternatives.rateAtBMR} kg/week</Text>
                </Text>
              </View>
            </View>
          )}

          {/* WEIGHT GAIN LAYOUT */}
          {goalMode === "gain" && (
            <View>
              <View>
                {dietOptions.map((alternative, i) => (
                  <Animated.View
                    key={alternative.id}
                    entering={FadeInDown.duration(250).delay(80 + i * 60)}
                  >
                    <AlternativeOption
                      alternative={alternative}
                      isSelected={selectedAlternativeId === alternative.id}
                      onSelect={onSelectAlternative ?? (() => {})}
                    />
                  </Animated.View>
                ))}
              </View>

              {/* Frequency upgrade options */}
              {frequencyUpgradeOptions.length > 0 && (
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
            </View>
          )}

          {/* MAINTENANCE LAYOUT */}
          {goalMode === "maintenance" && (
            <View>
              {dietOptions.map((alternative, i) => (
                <Animated.View
                  key={alternative.id}
                  entering={FadeInDown.duration(250).delay(80 + i * 60)}
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
// STYLES — transparent bg, hairlines only, ink type scale, zero fontWeight
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
  goalCaption: {
    marginTop: 4,
    ...typeScale.caption,
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

  // Rate picker
  rateSection: {
    marginTop: 24,
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
  },
  safeRateText: {
    fontFamily: font.regular,
    fontSize: 12,
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
