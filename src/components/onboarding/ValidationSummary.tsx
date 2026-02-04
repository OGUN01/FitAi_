import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { GlassCard } from "../../components/ui/aurora";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { TabValidationResult, PersonalInfoData } from "../../types/onboarding";

interface ValidationSummaryProps {
  validationResult: TabValidationResult;
  formData: PersonalInfoData;
  onUpdate: (data: Partial<PersonalInfoData>) => void;
  showCustomCountry: boolean;
  customCountry: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validationResult,
  formData,
  onUpdate,
  showCustomCountry,
  customCountry,
}) => {
  return (
    <View style={styles.validationSummary}>
      <GlassCard
        elevation={3}
        blurIntensity="default"
        padding="md"
        borderRadius="lg"
        style={styles.validationCard}
      >
        <View style={styles.validationTitleRow}>
          <Ionicons
            name={
              validationResult.is_valid ? "checkmark-circle" : "alert-circle"
            }
            size={rf(20)}
            color={
              validationResult.is_valid
                ? ResponsiveTheme.colors.secondary
                : ResponsiveTheme.colors.warning
            }
          />
          <Text
            style={[
              styles.validationTitle,
              validationResult.is_valid && styles.validationTitleSuccess,
            ]}
          >
            {validationResult.is_valid
              ? "Ready to Continue"
              : "Please Complete"}
          </Text>
        </View>
        <Text style={styles.validationPercentage} numberOfLines={1}>
          {validationResult.completion_percentage}% Complete
        </Text>

        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>
              Name: {formData.first_name} {formData.last_name}
            </Text>
            <Text style={styles.debugText}>Age: {formData.age}</Text>
            <Text style={styles.debugText}>Country: {formData.country}</Text>
            <Text style={styles.debugText}>State: {formData.state}</Text>
            <Text style={styles.debugText}>
              Valid: {validationResult.is_valid ? "YES" : "NO"}
            </Text>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => {
                const finalData =
                  showCustomCountry && customCountry
                    ? { ...formData, country: customCountry }
                    : formData;
                onUpdate(finalData);
              }}
            >
              <Text style={styles.debugButtonText}>Force Update</Text>
            </TouchableOpacity>
          </View>
        )}

        {validationResult.errors.length > 0 && (
          <View style={styles.validationErrors}>
            <Text style={styles.validationErrorTitle}>Required:</Text>
            {validationResult.errors.map((error, index) => (
              <Text key={index} style={styles.validationErrorText}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        {validationResult.warnings.length > 0 && (
          <View style={styles.validationWarnings}>
            <Text style={styles.validationWarningTitle}>Recommendations:</Text>
            {validationResult.warnings.map((warning, index) => (
              <Text key={index} style={styles.validationWarningText}>
                • {warning}
              </Text>
            ))}
          </View>
        )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  validationSummary: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  validationCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },
  validationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
    gap: ResponsiveTheme.spacing.xs,
  },
  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.warning,
  },
  validationTitleSuccess: {
    color: ResponsiveTheme.colors.secondary,
  },
  validationPercentage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  debugInfo: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginVertical: ResponsiveTheme.spacing.sm,
  },
  debugTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
  },
  debugText: {
    color: "#fff",
    fontSize: 10,
  },
  debugButton: {
    marginTop: 4,
    backgroundColor: "blue",
    padding: 4,
    borderRadius: 4,
  },
  debugButtonText: {
    color: "white",
    fontSize: 10,
  },
  validationErrors: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
  validationErrorTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  validationErrorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginBottom: 2,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  validationWarnings: {
    marginTop: ResponsiveTheme.spacing.md,
  },
  validationWarningTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  validationWarningText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.warning,
    marginBottom: 2,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
});
