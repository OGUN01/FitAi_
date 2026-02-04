import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard, AnimatedPressable } from "../../components/ui/aurora";
import { Input } from "../../components/ui";
import { ResponsiveTheme } from "../../utils/constants";
import { COUNTRIES_WITH_STATES } from "./PersonalInfoConstants";
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
              label="State/Province"
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
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xl,
    marginHorizontal: -ResponsiveTheme.spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
  locationField: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  inputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
  },
  countryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },
  countryOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    minWidth: "30%",
    alignItems: "center",
    justifyContent: "center",
  },
  countryOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },
  countryOptionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textAlign: "center",
    flexShrink: 1,
  },
  countryOptionTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  errorText: {
    color: ResponsiveTheme.colors.error,
    fontSize: ResponsiveTheme.fontSize.xs,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  stateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
  },
  stateOption: {
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    marginBottom: ResponsiveTheme.spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  stateOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },
  stateOptionText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textAlign: "center",
    flexShrink: 1,
  },
  stateOptionTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
});
