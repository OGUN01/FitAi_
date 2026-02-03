import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { rf, rw } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { ValidationResult } from "../../services/validationEngine";

// ============================================================================
// TYPES
// ============================================================================

interface WarningCardProps {
  warnings: ValidationResult[];
  onAcknowledgmentChange?: (acknowledged: boolean) => void;
  onAdjust?: (warning: ValidationResult) => void; // NEW: For opening AdjustmentWizard
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WarningCard: React.FC<WarningCardProps> = ({
  warnings,
  onAcknowledgmentChange,
  onAdjust,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const checkScale = useSharedValue(1);

  // Check if any warning has alternatives (actionable warnings)
  const warningsWithAlternatives = warnings.filter(
    (w) => w.alternatives && w.alternatives.length > 0,
  );
  const warningsWithoutAlternatives = warnings.filter(
    (w) => !w.alternatives || w.alternatives.length === 0,
  );
  const hasActionableWarnings = warningsWithAlternatives.length > 0;

  // Auto-acknowledge if no warnings require checkbox (all have alternatives)
  useEffect(() => {
    if (warningsWithoutAlternatives.length === 0 && hasActionableWarnings) {
      // All warnings have alternatives, no checkbox needed
      onAcknowledgmentChange?.(true);
    }
  }, [warningsWithoutAlternatives.length, hasActionableWarnings]);

  const handleAcknowledgmentToggle = () => {
    const newValue = !acknowledged;
    setAcknowledged(newValue);
    onAcknowledgmentChange?.(newValue);
    checkScale.value = withSpring(newValue ? 1.1 : 1, { damping: 15 }, () => {
      checkScale.value = withSpring(1);
    });
  };

  const handleAdjustPlan = async (warning: ValidationResult) => {
    if (isLoading || !onAdjust) return;
    setIsLoading(true);
    try {
      await onAdjust(warning);
    } finally {
      setIsLoading(false);
    }
  };

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  // Determine header based on warning types
  const headerTitle = hasActionableWarnings
    ? "Choose Your Pace"
    : "Important Considerations";
  const headerIcon = hasActionableWarnings ? "options" : "information-circle";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name={headerIcon} size={rf(20)} color="#F59E0B" />
        </View>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      {/* Actionable Warnings (with alternatives) - Show "Adjust Plan" button */}
      {warningsWithAlternatives.map((warning, index) => (
        <View key={`actionable-${index}`} style={styles.warningItem}>
          <Text style={styles.warningMessage}>{warning.message}</Text>

          {warning.impact && (
            <View style={styles.impactContainer}>
              <Ionicons name="flash-outline" size={rf(12)} color="#F59E0B" />
              <Text style={styles.impactText}>{warning.impact}</Text>
            </View>
          )}

          {warning.risks && warning.risks.length > 0 && (
            <View style={styles.risksContainer}>
              <View style={styles.riskHeader}>
                <Ionicons
                  name="warning-outline"
                  size={rf(12)}
                  color="#F97316"
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

          {/* Adjust Plan Button for warnings with alternatives */}
          <TouchableOpacity
            style={[
              styles.adjustButton,
              isLoading && styles.adjustButtonDisabled,
            ]}
            onPress={() => handleAdjustPlan(warning)}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <LinearGradient
              colors={
                isLoading ? ["#9CA3AF", "#6B7280"] : ["#F59E0B", "#D97706"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.adjustButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="options-outline" size={rf(16)} color="#fff" />
              )}
              <Text style={styles.adjustButtonText}>
                {isLoading ? "Loading..." : "Adjust Plan"}
              </Text>
              <Ionicons name="chevron-forward" size={rf(16)} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ))}

      {/* Non-actionable Warnings (without alternatives) - Show info only */}
      {warningsWithoutAlternatives.map((warning, index) => (
        <View key={`info-${index}`} style={styles.warningItem}>
          <Text style={styles.warningMessage}>{warning.message}</Text>

          {warning.impact && (
            <View style={styles.impactContainer}>
              <Ionicons name="flash-outline" size={rf(12)} color="#F59E0B" />
              <Text style={styles.impactText}>{warning.impact}</Text>
            </View>
          )}

          {warning.risks && warning.risks.length > 0 && (
            <View style={styles.risksContainer}>
              <View style={styles.riskHeader}>
                <Ionicons
                  name="warning-outline"
                  size={rf(12)}
                  color="#F97316"
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
                    color="#10B981"
                  />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Acknowledgment Checkbox - Only show if there are non-actionable warnings */}
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
              <Ionicons name="checkmark" size={rf(14)} color="#fff" />
            )}
          </Animated.View>
          <Text style={styles.checkboxLabel}>
            I understand and will focus on consistency
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  headerIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },

  headerTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#FCD34D",
    letterSpacing: -0.3,
  },

  warningItem: {
    marginBottom: ResponsiveTheme.spacing.md,
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
    marginTop: ResponsiveTheme.spacing.xs,
    gap: ResponsiveTheme.spacing.xs,
  },

  impactText: {
    flex: 1,
    fontSize: rf(12),
    color: "#FBBF24",
    fontWeight: "500",
  },

  risksContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  risksTitle: {
    fontSize: rf(11),
    fontWeight: "600",
    color: "#F97316",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  riskText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  recommendationsContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.xs,
  },

  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ResponsiveTheme.spacing.xs,
  },

  recommendationText: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  // Adjust Plan Button
  adjustButton: {
    marginTop: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
  },

  adjustButtonDisabled: {
    opacity: 0.7,
  },

  adjustButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.xs,
  },

  adjustButtonText: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },

  // Checkbox
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(245, 158, 11, 0.2)",
  },

  checkboxBox: {
    width: rw(22),
    height: rw(22),
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.5)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },

  checkboxBoxChecked: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },

  checkboxLabel: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
  },
});
