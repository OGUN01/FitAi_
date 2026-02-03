import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../../components/ui/aurora";
import { CompactTogglePill } from "../shared/CompactTogglePill";
import { WorkoutPreferencesData } from "../../../types/onboarding";

interface StyleSectionProps {
  formData: WorkoutPreferencesData;
  updateField: <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => void;
  showInfoTooltip: (title: string, description: string) => void;
}

export const StyleSection: React.FC<StyleSectionProps> = ({
  formData,
  updateField,
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
        <Text style={styles.sectionTitle}>Workout Style Preferences</Text>
        <Text style={styles.sectionSubtitle}>
          Tap to toggle your workout preferences
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <View style={styles.stylePreferencesCompactGrid}>
          {[
            {
              key: "enjoys_cardio",
              title: "Enjoys Cardio",
              iconName: "heart-outline",
              description: "Running, cycling, aerobic exercises",
            },
            {
              key: "enjoys_strength_training",
              title: "Enjoys Strength Training",
              iconName: "barbell-outline",
              description: "Weight lifting, resistance exercises",
            },
            {
              key: "enjoys_group_classes",
              title: "Enjoys Group Classes",
              iconName: "people-outline",
              description: "Fitness classes, group workouts",
            },
            {
              key: "prefers_outdoor_activities",
              title: "Prefers Outdoor",
              iconName: "leaf-outline",
              description: "Hiking, outdoor sports, fresh air",
            },
            {
              key: "needs_motivation",
              title: "Needs Motivation",
              iconName: "megaphone-outline",
              description: "Coaching, accountability, encouragement",
            },
            {
              key: "prefers_variety",
              title: "Prefers Variety",
              iconName: "shuffle-outline",
              description: "Different exercises, avoiding routine",
            },
          ].map((preference) => {
            const isActive = formData[
              preference.key as keyof WorkoutPreferencesData
            ] as boolean;

            return (
              <CompactTogglePill
                key={preference.key}
                isActive={isActive}
                iconName={preference.iconName}
                title={preference.title}
                description={preference.description}
                onToggle={() =>
                  updateField(
                    preference.key as keyof WorkoutPreferencesData,
                    !isActive as any,
                  )
                }
                onInfoPress={() =>
                  showInfoTooltip(preference.title, preference.description)
                }
              />
            );
          })}
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
  stylePreferencesCompactGrid: {
    gap: ResponsiveTheme.spacing.xs,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
