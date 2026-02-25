import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import {
  SmartAlternative,
  SmartAlternativesResult,
} from "../../services/validationEngine";
import { AlternativeOption } from "./AlternativeOption";
import { BMRInfoModal } from "./BMRInfoModal";
import { GlassCard } from "../ui/aurora/GlassCard";

// ============================================================================
// TYPES
// ============================================================================

interface RateComparisonCardProps {
  alternativesResult: SmartAlternativesResult;
  selectedAlternativeId: string | null;
  onSelectAlternative: (alternative: SmartAlternative) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const RateComparisonCard: React.FC<RateComparisonCardProps> = ({
  alternativesResult,
  selectedAlternativeId,
  onSelectAlternative,
}) => {
  const [showBMRModal, setShowBMRModal] = useState(false);
  const [showExerciseOptions, setShowExerciseOptions] = useState(false);

  const {
    alternatives,
    userBMR,
    originalRequestedRate,
    weightToLose,
    targetWeight,
    rateAtBMR,
  } = alternativesResult;

  // Separate diet-only and exercise options
  const dietOptions = alternatives.filter((alt) => !alt.requiresExercise);
  const exerciseOptions = alternatives.filter((alt) => alt.requiresExercise);

  // Find the user's original option to show the warning
  const userOriginal = alternatives.find((alt) => alt.isUserOriginal);
  const belowBMR = userOriginal && userOriginal.bmrDifference < 0;

  return (
    <>
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="lg"
        borderRadius="lg"
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="scale-outline"
              size={rf(20)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.headerTitle}>Your Weight Loss Plan</Text>
          </View>
        </View>

        {/* Goal Summary */}
        <View style={styles.goalSummary}>
          <Text style={styles.goalText}>
            Your Goal:{" "}
            <Text style={styles.goalHighlight}>
              {typeof originalRequestedRate === 'number' ? originalRequestedRate.toFixed(2) : originalRequestedRate} kg/week
            </Text>{" "}
            • Target:{" "}
            <Text style={styles.goalHighlight}>{targetWeight} kg</Text>
          </Text>
          <Text style={styles.weightToLose}>
            {weightToLose != null ? weightToLose.toFixed(1) : "--"} kg to lose
          </Text>
        </View>

        {/* BMR Warning Banner */}
        {belowBMR && (
          <TouchableOpacity
            style={styles.warningBanner}
            onPress={() => setShowBMRModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.warningContent}>
              <Ionicons
                name="warning"
                size={rf(18)}
                color="#F59E0B"
                style={styles.warningIcon}
              />
              <Text style={styles.warningText}>
                This pace requires eating below your BMR ({userBMR} cal)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowBMRModal(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="information-circle"
                size={rf(20)}
                color={ResponsiveTheme.colors.primary}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Section: Choose Your Approach */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CHOOSE YOUR APPROACH</Text>
        </View>

        {/* Diet-Only Options */}
        <View style={styles.optionsList}>
          {dietOptions.map((alternative) => (
            <AlternativeOption
              key={alternative.id}
              alternative={alternative}
              isSelected={selectedAlternativeId === alternative.id}
              onSelect={onSelectAlternative}
            />
          ))}
        </View>

        {/* Exercise Options Section */}
        {exerciseOptions.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.exerciseDivider}
              onPress={() => setShowExerciseOptions(!showExerciseOptions)}
              activeOpacity={0.7}
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
                    onSelect={onSelectAlternative}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* Safe Rate Info */}
        <View style={styles.safeRateInfo}>
          <Ionicons
            name="shield-checkmark"
            size={rf(14)}
            color="#22C55E"
            style={styles.safeRateIcon}
          />
          <Text style={styles.safeRateText}>
            Safe rate at your BMR:{" "}
            <Text style={styles.safeRateValue}>{rateAtBMR} kg/week</Text>
          </Text>
        </View>
      </GlassCard>

      {/* BMR Info Modal */}
      <BMRInfoModal
        visible={showBMRModal}
        onClose={() => setShowBMRModal(false)}
        userBMR={userBMR}
      />
    </>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: rp(12),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(12),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
  },
  headerTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
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
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: rp(10),
    padding: rp(12),
    marginBottom: rp(16),
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  warningIcon: {
    marginRight: rp(8),
  },
  warningText: {
    fontSize: rf(12),
    color: "#D97706",
    flex: 1,
    lineHeight: rf(18),
  },
  infoButton: {
    marginLeft: rp(8),
  },
  sectionHeader: {
    marginBottom: rp(12),
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
    marginVertical: rp(16),
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
    marginTop: rp(16),
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
});

export default RateComparisonCard;
