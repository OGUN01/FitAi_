import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard, AnimatedPressable } from "../../components/ui/aurora";
import { Input } from "../../components/ui";import { COUNTRIES_WITH_STATES } from "./PersonalInfoConstants";
import { PersonalInfoData } from "../../types/onboarding";

interface LocationFieldsProps {
  formData: PersonalInfoData;
  availableStates: string[];
  showCustomCountry: boolean;
  customCountry: string;
  actions: {
    handleCountryChange: (country: string) => void;
    updateField: <K extends keyof PersonalInfoData>(
      field: K,
      value: PersonalInfoData[K],
    ) => void;
    setCustomCountry: (value: string) => void;
    hasFieldError: (field: string) => boolean;
    getFieldError: (field: string) => string | undefined;
  };
}

export const LocationFields: React.FC<LocationFieldsProps> = ({
  formData,
  availableStates,
  showCustomCountry,
  customCountry,
  actions,
}) => {
  const {
    handleCountryChange,
    updateField,
    setCustomCountry,
    hasFieldError,
    getFieldError,
  } = actions;

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Location
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <View style={styles.locationField}>
          <Text style={styles.inputLabel} numberOfLines={1}>
            Country *
          </Text>
          <View style={styles.countryGrid}>
            {COUNTRIES_WITH_STATES.map((country) => (
              <AnimatedPressable
                key={country.name}
                style={[
                  styles.countryOption,
                  formData.country === country.name
                    ? styles.countryOptionSelected
                    : {},
                ]}
                onPress={() => handleCountryChange(country.name)}
                scaleValue={0.95}
              >
                <Text
                  style={[
                    styles.countryOptionText,
                    formData.country === country.name &&
                      styles.countryOptionTextSelected,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {country.name}
                </Text>
              </AnimatedPressable>
            ))}
            <AnimatedPressable
              style={[
                styles.countryOption,
                formData.country === "Other"
                  ? styles.countryOptionSelected
                  : {},
              ]}
              onPress={() => handleCountryChange("Other")}
              scaleValue={0.95}
            >
              <Text
                style={[
                  styles.countryOptionText,
                  formData.country === "Other" &&
                    styles.countryOptionTextSelected,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Other
              </Text>
            </AnimatedPressable>
          </View>
          {hasFieldError("country") && (
            <Text style={styles.errorText}>{getFieldError("country")}</Text>
          )}
        </View>

        {showCustomCountry && (
          <View style={styles.locationField}>
            <Input
              label="Country Name"
              placeholder="Enter your country"
              value={customCountry}
              onChangeText={setCustomCountry}
            />
          </View>
        )}

        {availableStates.length > 0 && (
          <View style={styles.locationField}>
            <Text style={styles.inputLabel} numberOfLines={1}>
              State/Province *
            </Text>
            <View style={styles.stateGrid}>
              {availableStates.map((state) => (
                <AnimatedPressable
                  key={state}
                  style={[
                    styles.stateOption,
                    formData.state === state ? styles.stateOptionSelected : {},
                  ]}
                  onPress={() => updateField("state", state)}
                  scaleValue={0.95}
                >
                  <Text
                    style={[
                      styles.stateOptionText,
                      formData.state === state &&
                        styles.stateOptionTextSelected,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {state}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
            {hasFieldError("state") && (
              <Text style={styles.errorText}>{getFieldError("state")}</Text>
            )}
          </View>
        )}

        {showCustomCountry && (
          <View style={styles.locationField}>
            <Input
              label="State/Province *"
              placeholder="Enter your state or province"
              value={formData.state}
              onChangeText={(value) => updateField("state", value)}
            />
          </View>
        )}

        <View style={styles.locationField}>
          <Input
            label="Region/City (Optional)"
            placeholder="e.g., Mumbai, Los Angeles, London"
            value={formData.region || ""}
            onChangeText={(value) => updateField("region", value)}
          />
        </View>
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginHorizontal: -spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: spacing.lg,
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
  locationField: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    flexShrink: 1,
  },
  countryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  countryOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.backgroundTertiary,
    minWidth: "30%",
    alignItems: "center",
    justifyContent: "center",
  },
  countryOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  countryOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    textAlign: "center",
    flexShrink: 1,
  },
  countryOptionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  stateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  stateOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  stateOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  stateOptionText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    textAlign: "center",
    flexShrink: 1,
  },
  stateOptionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});
