import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rp, rbr } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { ValidationResult } from "../../services/validationEngine";

// ============================================================================
// TYPES
// ============================================================================

interface ErrorCardProps {
  errors: ValidationResult[];
  onAdjust: (alternative: any) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ErrorCard: React.FC<ErrorCardProps> = ({ errors, onAdjust }) => {
  // OB-UX-004: Add loading state for Fix Issues button
  const [isLoading, setIsLoading] = useState(false);

  const handleFixIssues = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onAdjust(errors[0]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="alert-circle" size={rf(20)} color={ResponsiveTheme.colors.errorAlt} />
        </View>
        <Text style={styles.headerTitle}>Action Required</Text>
      </View>

      {/* Error Items */}
      {errors.map((error, index) => (
        <View key={index} style={styles.errorItem}>
          <Text style={styles.errorMessage}>{error.message}</Text>

          {error.recommendations && error.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              {error.recommendations.map((rec, i) => (
                <View key={i} style={styles.recommendationItem}>
                  <Ionicons
                    name="bulb-outline"
                    size={rf(12)}
                    color={ResponsiveTheme.colors.textMuted}
                  />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          {error.alternatives && error.alternatives.length > 0 && (
            <View style={styles.alternativesContainer}>
              <Text style={styles.alternativesTitle}>Choose an option:</Text>
              {error.alternatives.map((alt, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onAdjust(alt)}
                  style={styles.alternativeButton}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[
                      "rgba(245, 158, 11, 0.15)",
                      "rgba(245, 158, 11, 0.05)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.alternativeGradient}
                  >
                    <Text style={styles.alternativeButtonText}>
                      {alt.description}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={rf(16)}
                      color={ResponsiveTheme.colors.warningAlt}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Fix Issues Button */}
      <TouchableOpacity
        style={[styles.fixButton, isLoading && styles.fixButtonDisabled]}
        onPress={handleFixIssues}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        <LinearGradient
          colors={isLoading ? [ResponsiveTheme.colors.neutral, ResponsiveTheme.colors.textTertiary] : [ResponsiveTheme.colors.errorAlt, ResponsiveTheme.colors.error]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fixButtonGradient}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={ResponsiveTheme.colors.white} />
          ) : (
            <Ionicons name="build" size={rf(16)} color={ResponsiveTheme.colors.white} />
          )}
          <Text style={styles.fixButtonText}>
            {isLoading ? "Processing..." : "Fix Issues"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: ResponsiveTheme.colors.errorTint,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.errorAlt}4D`,
    borderRadius: rbr(ResponsiveTheme.borderRadius.lg),
    padding: rp(ResponsiveTheme.spacing.md),
    marginBottom: rp(ResponsiveTheme.spacing.md),
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(ResponsiveTheme.spacing.md),
  },

  headerIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: `${ResponsiveTheme.colors.errorAlt}26`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(ResponsiveTheme.spacing.sm),
  },

  headerTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.errorLight,
    letterSpacing: -0.3,
  },

  errorItem: {
    marginBottom: rp(ResponsiveTheme.spacing.sm),
  },

  errorMessage: {
    fontSize: rf(13),
    fontWeight: "500",
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(18),
  },

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

  alternativesContainer: {
    marginTop: rp(ResponsiveTheme.spacing.md),
  },

  alternativesTitle: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: rp(ResponsiveTheme.spacing.sm),
  },

  alternativeButton: {
    borderRadius: rbr(ResponsiveTheme.borderRadius.md),
    overflow: "hidden",
    marginBottom: rp(ResponsiveTheme.spacing.xs),
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.warningAlt}4D`,
  },

  alternativeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: rp(ResponsiveTheme.spacing.sm),
    paddingHorizontal: rp(ResponsiveTheme.spacing.md),
  },

  alternativeButtonText: {
    flex: 1,
    fontSize: rf(13),
    color: ResponsiveTheme.colors.warning,
    fontWeight: "500",
  },

  fixButton: {
    marginTop: rp(ResponsiveTheme.spacing.md),
    borderRadius: rbr(ResponsiveTheme.borderRadius.md),
    overflow: "hidden",
  },

  fixButtonDisabled: {
    opacity: 0.7,
  },

  fixButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(ResponsiveTheme.spacing.sm),
    gap: rp(ResponsiveTheme.spacing.xs),
  },

  fixButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
});
