import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { rf, rw, rp, rbr } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { ValidationResult } from "../../services/validationEngine";
import {
  SmartAlternative,
  SmartAlternativesResult,
} from "../../services/validationEngine";
import { AlternativeOption } from "./AlternativeOption";
import { BMRInfoModal } from "./BMRInfoModal";

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
  const checkScale = useSharedValue(1);
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
    checkScale.value = withSpring(newValue ? 1.1 : 1, { damping: 15 }, () => {
      checkScale.value = withSpring(1);
    });
  };

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  // Separate diet-only vs exercise alternatives
  const dietOptions =
    smartAlternatives?.alternatives.filter((alt) => !alt.requiresExercise) ??
    [];
  const exerciseOptions =
    smartAlternatives?.alternatives.filter((alt) => alt.requiresExercise) ?? [];

  const userOriginal = smartAlternatives?.alternatives.find(
    (alt) => alt.isUserOriginal,
  );
  const belowBMR = userOriginal && userOriginal.bmrDifference < 0;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="options"
            size={rf(20)}
            color={ResponsiveTheme.colors.warningAlt}
          />
        </View>
        <Text style={styles.headerTitle}>Choose Your Pace</Text>
      </View>

      {/* ── Goal Summary (from RateComparisonCard) ── */}
      {smartAlternatives && (
        <View style={styles.goalSummary}>
          <Text style={styles.goalText}>
            Your Goal:{" "}
            <Text style={styles.goalHighlight}>
              {typeof smartAlternatives.originalRequestedRate === "number"
                ? smartAlternatives.originalRequestedRate.toFixed(2)
                : smartAlternatives.originalRequestedRate}{" "}
              kg/week
            </Text>
            {"  •  "}Target:{" "}
            <Text style={styles.goalHighlight}>
              {smartAlternatives.targetWeight} kg
            </Text>
          </Text>
          <Text style={styles.weightToLose}>
            {smartAlternatives.weightToLose != null
              ? smartAlternatives.weightToLose.toFixed(1)
              : "--"}{" "}
            kg to lose
          </Text>
        </View>
      )}

      {/* ── BMR Warning Banner (from RateComparisonCard) ── */}
      {belowBMR && smartAlternatives && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => setShowBMRModal(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open BMR warning details"
        >
          <View style={styles.warningContent}>
            <Ionicons
              name="warning"
              size={rf(18)}
              color="#F59E0B"
              style={styles.warningIcon}
            />
            <Text style={styles.warningBannerText}>
              This pace requires eating below your BMR (
              {smartAlternatives.userBMR} cal)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowBMRModal(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="More info about BMR warning"
          >
            <Ionicons
              name="information-circle"
              size={rf(20)}
              color={ResponsiveTheme.colors.primary}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* ── Warning Context Messages ── */}
      {warningsWithAlternatives.map((warning, index) => (
        <View key={`actionable-${index}`} style={styles.warningItem}>
          <Text style={styles.warningMessage}>{warning.message}</Text>

          {warning.impact && (
            <View style={styles.impactContainer}>
              <Ionicons
                name="flash-outline"
                size={rf(12)}
                color={ResponsiveTheme.colors.warningAlt}
              />
              <Text style={styles.impactText}>{warning.impact}</Text>
            </View>
          )}

          {warning.risks && warning.risks.length > 0 && (
            <View style={styles.risksContainer}>
              <View style={styles.riskHeader}>
                <Ionicons
                  name="warning-outline"
                  size={rf(12)}
                  color={ResponsiveTheme.colors.warning}
                />
                <Text style={styles.risksTitle}>Risks</Text>
              </View>
              {warning.risks.map((risk, i) => (
                <Text key={i} style={styles.riskText}>
                  {risk}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* ── Inline Rate Picker (from RateComparisonCard) ── */}
      {smartAlternatives && dietOptions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SELECT YOUR RATE</Text>
          </View>

          <View style={styles.optionsList}>
            {dietOptions.map((alternative) => (
              <AlternativeOption
                key={alternative.id}
                alternative={alternative}
                isSelected={selectedAlternativeId === alternative.id}
                onSelect={onSelectAlternative ?? (() => { if (__DEV__) console.warn('WarningCard: onSelectAlternative not provided'); })}
              />
            ))}
          </View>

          {/* Exercise Options Toggle */}
          {exerciseOptions.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.exerciseDivider}
                onPress={() => setShowExerciseOptions(!showExerciseOptions)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  showExerciseOptions
                    ? "Hide exercise options"
                    : "Show exercise options"
                }
              >
                <View style={styles.dividerLine} />
                <View style={styles.dividerContent}>
                  <Ionicons
                    name="fitness-outline"
                    size={rf(14)}
                    color={ResponsiveTheme.colors.textSecondary}
                  />
                  <Text style={styles.dividerText}>
                    {showExerciseOptions ? "HIDE" : "OR ADD"} EXERCISE
                  </Text>
                  <Ionicons
                    name={showExerciseOptions ? "chevron-up" : "chevron-down"}
                    size={rf(14)}
                    color={ResponsiveTheme.colors.textSecondary}
                  />
                </View>
                <View style={styles.dividerLine} />
              </TouchableOpacity>

              {showExerciseOptions && (
                <View style={styles.optionsList}>
                  {exerciseOptions.map((alternative) => (
                    <AlternativeOption
                      key={alternative.id}
                      alternative={alternative}
                      isSelected={selectedAlternativeId === alternative.id}
                      onSelect={onSelectAlternative ?? (() => { if (__DEV__) console.warn('WarningCard: onSelectAlternative not provided'); })}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Safe Rate Footer */}
          <View style={styles.safeRateInfo}>
            <Ionicons
              name="shield-checkmark"
              size={rf(14)}
              color="#22C55E"
              style={styles.safeRateIcon}
            />
            <Text style={styles.safeRateText}>
              Safe rate at your BMR:{" "}
              <Text style={styles.safeRateValue}>
                {smartAlternatives.rateAtBMR} kg/week
              </Text>
            </Text>
          </View>
        </>
      )}

      {/* ── Non-Actionable Warnings (info only) ── */}
      {warningsWithoutAlternatives.map((warning, index) => (
        <View key={`info-${index}`} style={styles.warningItem}>
          <Text style={styles.warningMessage}>{warning.message}</Text>

          {warning.impact && (
            <View style={styles.impactContainer}>
              <Ionicons
                name="flash-outline"
                size={rf(12)}
                color={ResponsiveTheme.colors.warningAlt}
              />
              <Text style={styles.impactText}>{warning.impact}</Text>
            </View>
          )}

          {warning.risks && warning.risks.length > 0 && (
            <View style={styles.risksContainer}>
              <View style={styles.riskHeader}>
                <Ionicons
                  name="warning-outline"
                  size={rf(12)}
                  color={ResponsiveTheme.colors.warning}
                />
                <Text style={styles.risksTitle}>Risks</Text>
              </View>
              {warning.risks.map((risk, i) => (
                <Text key={i} style={styles.riskText}>
                  {risk}
                </Text>
              ))}
            </View>
          )}

          {warning.recommendations && warning.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              {warning.recommendations.map((rec, i) => (
                <View key={i} style={styles.recommendationItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(14)}
                    color={ResponsiveTheme.colors.successAlt}
                  />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* ── Acknowledgment Checkbox — only for non-actionable warnings ── */}
      {warningsWithoutAlternatives.length > 0 && (
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={handleAcknowledgmentToggle}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              styles.checkboxBox,
              acknowledged && styles.checkboxBoxChecked,
              animatedCheckStyle,
            ]}
          >
            {acknowledged && (
              <Ionicons
                name="checkmark"
                size={rf(14)}
                color={ResponsiveTheme.colors.white}
              />
            )}
          </Animated.View>
          <Text style={styles.checkboxLabel}>
            I understand and will focus on consistency
          </Text>
        </TouchableOpacity>
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
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: ResponsiveTheme.colors.warningTint,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.warning}4D`,
    borderRadius: rbr(ResponsiveTheme.borderRadius.lg),
    padding: rp(ResponsiveTheme.spacing.md),
    marginBottom: rp(ResponsiveTheme.spacing.md),
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(ResponsiveTheme.spacing.md),
  },
  headerIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: `${ResponsiveTheme.colors.warningAlt}26`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(ResponsiveTheme.spacing.sm),
  },
  headerTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.warning,
    letterSpacing: -0.3,
  },

  // Goal Summary (from RateComparisonCard)
  goalSummary: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: rp(10),
    padding: rp(12),
    marginBottom: rp(12),
  },
  goalText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
  goalHighlight: {
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  weightToLose: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
    marginTop: rp(4),
  },

  // BMR Warning Banner (from RateComparisonCard)
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: rp(10),
    padding: rp(12),
    marginBottom: rp(12),
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  warningIcon: {
    marginRight: rp(8),
  },
  warningBannerText: {
    fontSize: rf(12),
    color: "#D97706",
    flex: 1,
    lineHeight: rf(18),
  },
  infoButton: {
    marginLeft: rp(8),
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  // Warning Context
  warningItem: {
    marginBottom: rp(ResponsiveTheme.spacing.md),
  },
  warningMessage: {
    fontSize: rf(13),
    fontWeight: "500",
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(18),
  },
  impactContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: rp(ResponsiveTheme.spacing.xs),
    gap: rp(ResponsiveTheme.spacing.xs),
  },
  impactText: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.warning,
    fontWeight: "500",
  },
  risksContainer: {
    marginTop: rp(ResponsiveTheme.spacing.sm),
    backgroundColor: `${ResponsiveTheme.colors.warning}1A`,
    padding: rp(ResponsiveTheme.spacing.sm),
    borderRadius: rbr(ResponsiveTheme.borderRadius.sm),
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(ResponsiveTheme.spacing.xs),
    marginBottom: rp(ResponsiveTheme.spacing.xs),
  },
  risksTitle: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  riskText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
    marginLeft: rp(ResponsiveTheme.spacing.sm),
  },

  // Inline Rate Picker (from RateComparisonCard)
  sectionHeader: {
    marginBottom: rp(10),
    marginTop: rp(4),
  },
  sectionTitle: {
    fontSize: rf(11),
    fontWeight: "700",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  optionsList: {
    gap: rp(0),
  },
  exerciseDivider: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    marginVertical: rp(12),
    gap: rp(12),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    paddingHorizontal: rp(8),
  },
  dividerText: {
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  safeRateInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: rp(8),
    padding: rp(10),
    marginTop: rp(12),
  },
  safeRateIcon: {
    marginRight: rp(6),
  },
  safeRateText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
  },
  safeRateValue: {
    fontWeight: "700",
    color: "#22C55E",
  },

  // Recommendations (non-actionable warnings)
  recommendationsContainer: {
    marginTop: rp(ResponsiveTheme.spacing.sm),
    gap: rp(ResponsiveTheme.spacing.xs),
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rp(ResponsiveTheme.spacing.xs),
  },
  recommendationText: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  // Acknowledgment Checkbox
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: rp(ResponsiveTheme.spacing.md),
    paddingTop: rp(ResponsiveTheme.spacing.md),
    borderTopWidth: 1,
    borderTopColor: `${ResponsiveTheme.colors.warning}33`,
  },
  checkboxBox: {
    width: rw(22),
    height: rw(22),
    borderRadius: rbr(ResponsiveTheme.borderRadius.sm),
    borderWidth: 2,
    borderColor: `${ResponsiveTheme.colors.warning}80`,
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(ResponsiveTheme.spacing.sm),
  },
  checkboxBoxChecked: {
    borderColor: ResponsiveTheme.colors.successAlt,
    backgroundColor: ResponsiveTheme.colors.successAlt,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
  },
});
