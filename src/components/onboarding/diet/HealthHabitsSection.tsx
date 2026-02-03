import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
  habitCategoryCompact: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  habitCategoryTitleCompact: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  habitPillGrid: {
    gap: ResponsiveTheme.spacing.xs,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
