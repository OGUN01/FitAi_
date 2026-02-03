import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../../components/ui/aurora";
import { DIET_READINESS_OPTIONS } from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { CompactTogglePill } from "../../onboarding/shared/CompactTogglePill";
import { DietPreferencesData } from "../../../types/onboarding";

interface DietReadinessSectionProps {
  formData: DietPreferencesData;
  toggleDietReadiness: (dietKey: keyof DietPreferencesData) => void;
  showInfoTooltip: (
    title: string,
    description: string,
    benefits?: string[],
  ) => void;
}

export const DietReadinessSection: React.FC<DietReadinessSectionProps> = ({
  formData,
  toggleDietReadiness,
  showInfoTooltip,
}) => {
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
          Diet Readiness
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Are you ready to try any of these specialized diets? (Optional)
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {DIET_READINESS_OPTIONS.map((option) => {
          const isReady = formData[
            option.key as keyof DietPreferencesData
          ] as boolean;

          return (
            <CompactTogglePill
              key={option.key}
              isActive={isReady}
              iconName={option.iconName}
              title={option.title}
              description={option.description}
              onToggle={() =>
                toggleDietReadiness(option.key as keyof DietPreferencesData)
              }
              onInfoPress={() =>
                showInfoTooltip(
                  option.title,
                  option.description,
                  option.benefits,
                )
              }
            />
          );
        })}
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
  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
