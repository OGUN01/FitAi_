import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh } from "../../../utils/responsive";
import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import { Slider } from "../../../components/ui";
import { COOKING_SKILL_LEVELS } from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { DietPreferencesData } from "../../../types/onboarding";

const COOKING_METHODS = [
  { value: "grilling", label: "Grilling", icon: "flame-outline" },
  { value: "steaming", label: "Steaming", icon: "water-outline" },
  { value: "air_frying", label: "Air Frying", icon: "flash-outline" },
  { value: "sauteing", label: "Sauteing", icon: "restaurant-outline" },
  { value: "baking", label: "Baking", icon: "cube-outline" },
  { value: "boiling", label: "Boiling", icon: "beaker-outline" },
  { value: "stir_frying", label: "Stir Frying", icon: "bonfire-outline" },
  { value: "slow_cooking", label: "Slow Cooking", icon: "time-outline" },
  { value: "pressure_cooking", label: "Pressure Cook", icon: "speedometer-outline" },
  { value: "raw_no_cook", label: "Raw / No Cook", icon: "leaf-outline" },
];

interface CookingPreferencesSectionProps {
  formData: DietPreferencesData;
  updateField: <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => void;
}

export const CookingPreferencesSection: React.FC<
  CookingPreferencesSectionProps
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
          Cooking Preferences
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Help us suggest recipes that match your cooking style
        </Text>
      </View>

      {/* Cooking Skill Level */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel} numberOfLines={1}>
          Cooking Skill Level
        </Text>
      </View>
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(105) + rw(10)}
          snapToAlignment="start"
          pagingEnabled={false}
        >
          {COOKING_SKILL_LEVELS.map((skill) => {
            const isSelected = formData.cooking_skill_level === skill.level;
            return (
              <AnimatedPressable
                key={skill.level}
                onPress={() => {
                  updateField(
                    "cooking_skill_level",
                    skill.level as DietPreferencesData["cooking_skill_level"],
                  );
                  if (skill.level === "not_applicable") {
                    updateField("max_prep_time_minutes", null);
                  } else if (formData.max_prep_time_minutes === null) {
                    updateField("max_prep_time_minutes", 30);
                  }
                }}
                style={styles.consistentCardItem}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isSelected && styles.consistentCardSelected,
                  ]}
                >
                  {/* Icon */}
                  <View style={styles.consistentCardIconCenter}>
                    <Ionicons
                      name={skill.iconName as ComponentProps<typeof Ionicons>['name']}
                      size={rf(22)}
                      color={
                        isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </View>
                  {/* Title */}
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {skill.title}
                  </Text>
                  {/* Description */}
                  <Text
                    style={styles.consistentCardDesc}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {skill.description}
                  </Text>
                  {/* Selection indicator */}
                  <View
                    style={[
                      styles.consistentCardIndicator,
                      isSelected && styles.consistentCardIndicatorSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={rf(12)}
                        color={colors.white}
                      />
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Max Prep Time */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel}>
          {formData.cooking_skill_level === "not_applicable"
            ? "Maximum Cooking Time: Not Applicable"
            : `Maximum Cooking Time: ${formData.max_prep_time_minutes ?? 30} minutes`}
        </Text>
        {formData.cooking_skill_level === "not_applicable" ? (
          <GlassCard
            elevation={1}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.disabledCardInline}
          >
            <View style={styles.disabledContent}>
              <Ionicons
                name="information-circle-outline"
                size={rf(16)}
                color={colors.textSecondary}
              />
              <Text
                style={styles.disabledText}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                This field is not applicable since your meals are prepared by
                others. We'll suggest meals based on your dietary preferences
                without cooking time constraints.
              </Text>
            </View>
          </GlassCard>
        ) : (
          <Slider
            value={formData.max_prep_time_minutes ?? 30}
            onValueChange={(value) =>
              updateField("max_prep_time_minutes", value)
            }
            minimumValue={15}
            maximumValue={120}
            step={15}
            showTooltip={true}
            formatValue={(val) => `${val} min`}
          />
        )}
      </View>

      {/* Budget Level */}
      <View style={styles.edgeToEdgeContentPadded}>
        <Slider
          value={
            formData.budget_level === "low"
              ? 1
              : formData.budget_level === "medium"
                ? 2
                : 3
          }
          onValueChange={(value) => {
            const budgetLevel =
              value === 1 ? "low" : value === 2 ? "medium" : "high";
            updateField(
              "budget_level",
              budgetLevel as DietPreferencesData["budget_level"],
            );
          }}
          minimumValue={1}
          maximumValue={3}
          step={1}
          label="Food Budget"
          showTooltip={true}
          formatValue={(val) => {
            if (val === 1) return "Budget ($50-100/wk)";
            if (val === 2) return "Moderate ($100-200/wk)";
            return "Premium ($200+/wk)";
          }}
        />
      </View>

      {/* Preferred Cooking Methods */}
      {formData.cooking_skill_level !== "not_applicable" && (
        <View style={styles.edgeToEdgeContentPadded}>
          <Text style={styles.fieldLabel} numberOfLines={1}>
            Preferred Cooking Methods
          </Text>
          <Text
            style={styles.methodsHint}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Select all methods you enjoy (leave empty for any)
          </Text>
          <View style={styles.methodsGrid}>
            {COOKING_METHODS.map((method) => {
              const isSelected = (formData.cooking_methods || []).includes(
                method.value,
              );
              return (
                <AnimatedPressable
                  key={method.value}
                  onPress={() => {
                    const current = formData.cooking_methods || [];
                    const updated = isSelected
                      ? current.filter((m) => m !== method.value)
                      : [...current, method.value];
                    updateField("cooking_methods", updated);
                  }}
                  scaleValue={0.97}
                >
                  <View
                    style={[
                      styles.methodChip,
                      isSelected && styles.methodChipSelected,
                    ]}
                  >
                    <Ionicons
                      name={method.icon as ComponentProps<typeof Ionicons>['name']}
                      size={rf(14)}
                      color={
                        isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.methodChipText,
                        isSelected && styles.methodChipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {method.label}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
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
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
    flexShrink: 1,
  },
  scrollContainerInset: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: "hidden",
    borderRadius: borderRadius.md,
  },
  scrollContentInset: {
    paddingVertical: spacing.sm,
    gap: rw(10),
  },
  consistentCardItem: {
    width: rw(105),
  },
  consistentCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: spacing.sm,
    minHeight: rh(12),
    alignItems: "center",
  },
  consistentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  consistentCardIconCenter: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  consistentCardTitle: {
    fontSize: rf(11),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  consistentCardTitleSelected: {
    color: colors.primary,
  },
  consistentCardDesc: {
    fontSize: rf(9),
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: rf(12),
  },
  consistentCardIndicator: {
    width: rf(18),
    height: rf(18),
    borderRadius: rf(9),
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  consistentCardIndicatorSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabledCardInline: {
    backgroundColor: `${colors.textSecondary}10`,
    marginBottom: spacing.lg,
  },
  disabledContent: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  disabledText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: rf(16),
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
  methodsHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  methodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rw(8),
    marginBottom: spacing.lg,
  },
  methodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    paddingHorizontal: rw(12),
    paddingVertical: rh(0.8),
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  methodChipSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  methodChipText: {
    fontSize: rf(11),
    color: colors.textSecondary,
  },
  methodChipTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
});
