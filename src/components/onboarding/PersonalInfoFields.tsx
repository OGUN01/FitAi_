import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../../components/ui/aurora";
import { Input, SegmentedControl } from "../../components/ui";import { GENDER_OPTIONS } from "./PersonalInfoConstants";
import { PersonalInfoData } from "../../types/onboarding";

interface PersonalInfoFieldsProps {
  formData: PersonalInfoData;
  actions: {
    updateField: <K extends keyof PersonalInfoData>(
      field: K,
      value: PersonalInfoData[K],
    ) => void;
    handleAgeChange: (text: string) => void;
    hasFieldError: (field: string) => boolean;
    getFieldError: (field: string) => string | undefined;
  };
}

export const PersonalInfoFields: React.FC<PersonalInfoFieldsProps> = ({
  formData,
  actions,
}) => {
  const { updateField, handleAgeChange, hasFieldError, getFieldError } =
    actions;

  return (
    <>
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Full Name
          </Text>
        </View>
        <View style={styles.edgeToEdgeContentPadded}>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="First Name"
                placeholder="John"
                testID="onboarding-first-name"
                value={formData.first_name}
                onChangeText={(value) => updateField("first_name", value)}
                error={
                  hasFieldError("first name")
                    ? getFieldError("first name")
                    : undefined
                }
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Last Name"
                placeholder="Doe"
                testID="onboarding-last-name"
                value={formData.last_name}
                onChangeText={(value) => updateField("last_name", value)}
                error={
                  hasFieldError("last name")
                    ? getFieldError("last name")
                    : undefined
                }
              />
            </View>
          </View>
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>

      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Demographics
          </Text>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          <View style={styles.ageRow}>
            <View style={styles.ageField}>
              <Input
                label="Age"
                placeholder="25"
                testID="onboarding-age"
                value={formData.age > 0 ? formData.age.toString() : ""}
                onChangeText={handleAgeChange}
                keyboardType="numeric"
                error={hasFieldError("age") ? getFieldError("age") : undefined}
              />
            </View>
          </View>

          <View style={styles.genderField}>
            <Text style={styles.inputLabel} numberOfLines={1}>
              Gender *
            </Text>
            <SegmentedControl
              options={GENDER_OPTIONS.map((opt) => ({
                id: opt.value,
                label: opt.label,
                value: opt.value,
              }))}
              selectedId={formData.gender}
              onSelect={(id) =>
                updateField("gender", id as PersonalInfoData["gender"])
              }
              gradient={[colors.primary, colors.accent]}
              style={styles.genderSegmentedControl}
            />
            {hasFieldError("gender") && (
              <Text style={styles.errorText}>{getFieldError("gender")}</Text>
            )}
          </View>
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    </>
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
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  ageRow: {
    marginBottom: spacing.md,
  },
  ageField: {
    width: "50%",
  },
  genderField: {
    marginTop: spacing.xs,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    flexShrink: 1,
  },
  genderSegmentedControl: {
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
