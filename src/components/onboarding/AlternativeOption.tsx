import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { SmartAlternative, RiskLevel } from "../../services/validationEngine";

// ============================================================================
// TYPES
// ============================================================================

interface AlternativeOptionProps {
  alternative: SmartAlternative;
  isSelected: boolean;
  onSelect: (alternative: SmartAlternative) => void;
}

// ============================================================================
// RISK LEVEL STYLES
// ============================================================================

const getRiskStyles = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case "blocked":
      return {
        background: "#F3F4F6",
        border: "#9CA3AF",
        badgeBg: "#E5E7EB",
        badgeText: "#6B7280",
        text: "#9CA3AF",
      };
    case "dangerous":
      return {
        background: "#FEE2E2",
        border: "#EF4444",
        badgeBg: "#FEE2E2",
        badgeText: "#DC2626",
        text: "#DC2626",
      };
    case "caution":
      return {
        background: "#FEF3C7",
        border: "#F59E0B",
        badgeBg: "#FEF3C7",
        badgeText: "#D97706",
        text: "#D97706",
      };
    case "moderate":
      return {
        background: "#FEF9C3",
        border: "#EAB308",
        badgeBg: "#FEF9C3",
        badgeText: "#CA8A04",
        text: "#CA8A04",
      };
    case "safe":
      return {
        background: "#DCFCE7",
        border: "#22C55E",
        badgeBg: "#DCFCE7",
        badgeText: "#16A34A",
        text: "#16A34A",
      };
    case "easy":
      return {
        background: "#DBEAFE",
        border: "#3B82F6",
        badgeBg: "#DBEAFE",
        badgeText: "#2563EB",
        text: "#2563EB",
      };
    default:
      return {
        background: "#F3F4F6",
        border: "#9CA3AF",
        badgeBg: "#E5E7EB",
        badgeText: "#6B7280",
        text: "#6B7280",
      };
  }
};

const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    flame: "flame",
    flash: "flash",
    fitness: "fitness",
    "shield-checkmark": "shield-checkmark",
    leaf: "leaf",
    walk: "walk",
    bicycle: "bicycle",
    barbell: "barbell",
    scale: "scale",
  };
  return iconMap[iconName] || "ellipse";
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AlternativeOption: React.FC<AlternativeOptionProps> = ({
  alternative,
  isSelected,
  onSelect,
}) => {
  const riskStyles = getRiskStyles(alternative.riskLevel);
  const isBlocked = alternative.isBlocked;

  if (isBlocked) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.blockedContainer]}
        disabled
        activeOpacity={1}
      >
        {/* Left: Locked icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: "rgba(255,255,255,0.05)" },
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={rf(18)}
            color="rgba(255,255,255,0.25)"
          />
        </View>

        {/* Middle: Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.label,
              { color: "rgba(255,255,255,0.25)", fontSize: rf(12) },
            ]}
            numberOfLines={1}
          >
            {alternative.label}
          </Text>
          <Text style={styles.blockedText}>{alternative.blockReason}</Text>
        </View>

        {/* Right: LOCKED badge */}
        <View
          style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.05)" }]}
        >
          <Text style={[styles.badgeText, { color: "rgba(255,255,255,0.2)" }]}>
            LOCKED
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isSelected
            ? `${riskStyles.border}15`
            : "transparent",
          borderColor: isSelected ? riskStyles.border : "transparent",
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={() => onSelect(alternative)}
      activeOpacity={0.7}
    >
      {/* Left: Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${riskStyles.border}20` },
        ]}
      >
        <Ionicons
          name={getIconName(alternative.icon)}
          size={rf(18)}
          color={riskStyles.border}
        />
      </View>

      {/* Middle: Content */}
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.label,
              alternative.isUserOriginal && styles.labelBold,
            ]}
            numberOfLines={1}
          >
            {alternative.label}
          </Text>
          {alternative.isRecommended && (
            <View style={styles.recommendedBadge}>
              <Ionicons name="star" size={rf(10)} color="#16A34A" />
            </View>
          )}
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.rate}>{alternative.weeklyRate} kg/week</Text>
          <Text style={styles.separator}>•</Text>
          {/* Calories: red + warning icon when this route goes below the user's BMR */}
          <View style={styles.caloriesRow}>
            {alternative.isBelowBMR && (
              <Ionicons
                name="warning"
                size={rf(10)}
                color="#EF4444"
                style={{ marginRight: 2 }}
              />
            )}
            <Text
              style={[
                styles.calories,
                alternative.isBelowBMR && { color: "#EF4444", fontWeight: "700" },
              ]}
            >
              {alternative.dailyCalories} cal
            </Text>
          </View>
          {alternative.requiresExercise && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.exercise}>
                {alternative.exerciseDescription}
              </Text>
            </>
          )}
        </View>

        {/* Below-BMR warning sub-label */}
        {alternative.isBelowBMR && (
          <Text style={styles.belowBMRWarning}>
            ⚠ Requires eating below your BMR — not sustainable long-term
          </Text>
        )}

        {/* Annotation A: exercise cards eat at safe minimum (BMR) */}
        {alternative.requiresExercise && !alternative.isFrequencyUpgrade && (
          <Text style={styles.bmrAnnotation}>Eating at your safe minimum (BMR)</Text>
        )}

        {/* Annotation B: diet cards already include the user's workout plan in TDEE */}
        {alternative.workoutPlanInclusive && !alternative.requiresExercise && (
          <Text style={styles.workoutInclusiveNote}>✓ Includes your workout plan</Text>
        )}

        {/* Annotation C: gainer frequency upgrade motivational note */}
        {alternative.motivationalNote && (
          <Text style={styles.motivationalNote}>{alternative.motivationalNote}</Text>
        )}

        {/* Timeline */}
        <Text style={styles.timeline}>
          {alternative.timelineWeeks > 0 ? `${alternative.timelineWeeks} weeks to goal` : "Ongoing"}
        </Text>
      </View>

      {/* Right: Badge */}
      <View style={[styles.badge, { backgroundColor: riskStyles.badgeBg }]}>
        <Text style={[styles.badgeText, { color: riskStyles.badgeText }]}>
          {alternative.badge}
        </Text>
      </View>

      {/* Selected checkmark */}
      {isSelected && (
        <View
          style={[styles.checkmark, { backgroundColor: riskStyles.border }]}
        >
          <Ionicons name="checkmark" size={rf(12)} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: rp(12),
    borderRadius: rp(12),
    marginBottom: rp(8),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  blockedContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  iconContainer: {
    width: rf(36),
    height: rf(36),
    borderRadius: rf(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: rp(12),
  },
  content: {
    flex: 1,
    marginRight: rp(8),
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    marginBottom: rp(2),
  },
  label: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelBold: {
    fontWeight: "700",
  },
  recommendedBadge: {
    backgroundColor: "rgba(22, 163, 74, 0.15)",
    padding: rp(2),
    borderRadius: rp(4),
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: rp(4),
    marginBottom: rp(2),
  },
  rate: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  separator: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
  },
  calories: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
  },
  caloriesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  belowBMRWarning: {
    fontSize: rf(9),
    color: "#EF4444",
    fontStyle: "italic",
    marginBottom: rp(1),
    lineHeight: rf(12),
  },
  bmrAnnotation: {
    fontSize: rf(9),
    color: "#22C55E",
    fontStyle: "italic",
    marginBottom: rp(1),
    lineHeight: rf(12),
  },
  workoutInclusiveNote: {
    fontSize: rf(9),
    color: "#6EE7B7",
    marginBottom: rp(1),
    lineHeight: rf(12),
  },
  motivationalNote: {
    fontSize: rf(9),
    color: "#60A5FA",
    fontWeight: "600",
    marginBottom: rp(1),
    lineHeight: rf(12),
  },
  exercise: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.primary,
    fontWeight: "500",
  },
  timeline: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
  },

  badge: {
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rp(6),
    marginLeft: rp(4),
  },
  badgeText: {
    fontSize: rf(10),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  checkmark: {
    position: "absolute",
    top: rp(8),
    right: rp(8),
    width: rf(18),
    height: rf(18),
    borderRadius: rf(9),
    justifyContent: "center",
    alignItems: "center",
  },
  blockedText: {
    fontSize: rf(11),
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
});

export default AlternativeOption;
