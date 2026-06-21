import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../../../components/ui/aurora";
import { HEALTH_HABITS } from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { CompactTogglePill } from "../../onboarding/shared/CompactTogglePill";
import { DietPreferencesData } from "../../../types/onboarding";

interface HealthHabitsSectionProps {
  formData: DietPreferencesData;
  toggleHealthHabit: (habitKey: keyof DietPreferencesData) => void;
  showInfoTooltip: (title: string, description: string) => void;
}

export const HealthHabitsSection: React.FC<HealthHabitsSectionProps> = ({
  formData,
  toggleHealthHabit,
  showInfoTooltip,
}) => {
  // Helper to format category title
  const formatCategoryTitle = (category: string) => {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
          Health Habits
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Tap to toggle your current habits
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {Object.entries(HEALTH_HABITS).map(([category, habits]) => (
          <View key={category} style={styles.habitCategoryCompact}>
            <Text style={styles.habitCategoryTitleCompact}>
              {formatCategoryTitle(category)}
            </Text>

            {/* 2-Column Grid */}
            <View style={styles.habitPillGrid}>
              {habits.map((habit) => {
                const isActive = formData[
                  habit.key as keyof DietPreferencesData
                ] as boolean;

                return (
                  <CompactTogglePill
                    key={habit.key}
                    isActive={isActive}
                    iconName={habit.iconName}
                    title={habit.title}
                    description={habit.description}
                    onToggle={() =>
                      toggleHealthHabit(habit.key as keyof DietPreferencesData)
                    }
                    onInfoPress={() =>
                      showInfoTooltip(habit.title, habit.description)
                    }
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>
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
  habitCategoryCompact: {
    marginBottom: spacing.lg,
  },
  habitCategoryTitleCompact: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  habitPillGrid: {
    gap: spacing.xs,
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
});
