import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../../components/ui/aurora";
import { MultiSelectWithCustom } from "../../../components/advanced/MultiSelectWithCustom";
import {
  ALLERGY_OPTIONS,
  RESTRICTION_OPTIONS,
} from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { DietPreferencesData } from "../../../types/onboarding";

interface AllergiesAndRestrictionsSectionProps {
  formData: DietPreferencesData;
  updateField: <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => void;
}

export const AllergiesAndRestrictionsSection: React.FC<
  AllergiesAndRestrictionsSectionProps
> = ({ formData, updateField }) => {
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
          Allergies & Dietary Restrictions
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {/* Allergies */}
        <View style={styles.allergyFieldInline}>
          <MultiSelectWithCustom
            options={ALLERGY_OPTIONS}
            selectedValues={formData.allergies}
            onSelectionChange={(values) => updateField("allergies", values)}
            label="Food Allergies"
            placeholder="Select any food allergies"
            searchable={true}
            allowCustom={true}
            customLabel="Add Custom Allergy"
            customPlaceholder="Enter your specific allergy"
          />
        </View>

        {/* Dietary Restrictions */}
        <View style={styles.allergyFieldInline}>
          <MultiSelectWithCustom
            options={RESTRICTION_OPTIONS}
            selectedValues={formData.restrictions}
            onSelectionChange={(values) => updateField("restrictions", values)}
            label="Dietary Restrictions (Optional)"
            placeholder="Select any dietary restrictions"
            searchable={true}
            allowCustom={true}
            customLabel="Add Custom Restriction"
            customPlaceholder="Enter your specific dietary need"
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
  allergyFieldInline: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
