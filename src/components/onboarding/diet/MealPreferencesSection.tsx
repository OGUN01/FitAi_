import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh, rs, rbr, rp } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import { DietPreferencesData } from "../../../types/onboarding";

interface MealPreferencesSectionProps {
  formData: DietPreferencesData;
  getEnabledMealsCount: () => number;
  toggleMealPreference: (mealKey: keyof DietPreferencesData) => void;
}

export const MealPreferencesSection: React.FC<MealPreferencesSectionProps> = ({
  formData,
  getEnabledMealsCount,
  toggleMealPreference,
}) => {
  const enabledCount = getEnabledMealsCount();

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
          Meal Preferences
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Which meals would you like us to plan for you? ({enabledCount}/4
          enabled)
        </Text>
      </View>

      {enabledCount === 1 && (
        <View style={styles.edgeToEdgeContentPadded}>
          <GlassCard
            elevation={2}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.warningCardInline}
          >
            <View style={styles.warningContent}>
              <Ionicons
                name="alert-circle-outline"
                size={rf(18)}
                color={ResponsiveTheme.colors.warning}
              />
              <Text
                style={styles.warningText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                At least one meal type must remain enabled
              </Text>
            </View>
          </GlassCard>
        </View>
      )}

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
          {[
            {
              key: "breakfast_enabled",
              title: "Breakfast",
              iconName: "sunny-outline",
              description: "Start your day right",
            },
            {
              key: "lunch_enabled",
              title: "Lunch",
              iconName: "partly-sunny-outline",
              description: "Midday fuel",
            },
            {
              key: "dinner_enabled",
              title: "Dinner",
              iconName: "moon-outline",
              description: "Evening nourishment",
            },
            {
              key: "snacks_enabled",
              title: "Snacks",
              iconName: "fast-food-outline",
              description: "Healthy snacking",
            },
          ].map((meal) => {
            const isEnabled = formData[
              meal.key as keyof DietPreferencesData
            ] as boolean;
            const isLastEnabled = enabledCount === 1 && isEnabled;

            return (
              <AnimatedPressable
                key={meal.key}
                onPress={() =>
                  !isLastEnabled &&
                  toggleMealPreference(meal.key as keyof DietPreferencesData)
                }
                style={
                  isLastEnabled
                    ? [
                        styles.consistentCardItem,
                        styles.consistentCardItemDisabled,
                      ]
                    : styles.consistentCardItem
                }
                disabled={isLastEnabled}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isEnabled && styles.consistentCardSelected,
                    isLastEnabled && styles.consistentCardDisabled,
                  ]}
                >
                  {/* Icon + Toggle row */}
                  <View style={styles.consistentCardHeader}>
                    <Ionicons
                      name={meal.iconName as ComponentProps<typeof Ionicons>['name']}
                      size={rf(22)}
                      color={
                        isEnabled
                          ? ResponsiveTheme.colors.primary
                          : ResponsiveTheme.colors.textSecondary
                      }
                    />
                    <View
                      style={[
                        styles.miniToggle,
                        isEnabled && styles.miniToggleActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.miniToggleThumb,
                          isEnabled && styles.miniToggleThumbActive,
                        ]}
                      />
                    </View>
                  </View>
                  {/* Title */}
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isEnabled && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {meal.title}
                  </Text>
                  {/* Description */}
                  <Text style={styles.consistentCardDesc} numberOfLines={2}>
                    {meal.description}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {!formData.breakfast_enabled && (
        <View style={styles.edgeToEdgeContentPadded}>
          <GlassCard
            elevation={2}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.infoCardInline}
          >
            <View style={styles.infoContent}>
              <Ionicons
                name="bulb-outline"
                size={rf(18)}
                color={ResponsiveTheme.colors.primary}
              />
              <Text
                style={styles.infoText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                Meal plans will only include lunch and dinner
              </Text>
            </View>
          </GlassCard>
        </View>
      )}
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
  warningCardInline: {
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.warning,
  },
  scrollContainerInset: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.sm,
    overflow: "hidden",
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  scrollContentInset: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(10),
  },
  consistentCardItem: {
    width: rw(105),
  },
  consistentCardItemDisabled: {
    opacity: 0.7,
  },
  consistentCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: ResponsiveTheme.spacing.sm,
    minHeight: rh(12),
    alignItems: "center",
  },
  consistentCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },
  consistentCardDisabled: {
    opacity: 0.8,
  },
  consistentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  miniToggle: {
    width: rs(24),
    height: rs(14),
    borderRadius: rbr(7),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    paddingHorizontal: rp(1),
  },
  miniToggleActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  miniToggleThumb: {
    width: rs(10),
    height: rs(10),
    borderRadius: rbr(5),
    backgroundColor: ResponsiveTheme.colors.textSecondary,
  },
  miniToggleThumbActive: {
    backgroundColor: ResponsiveTheme.colors.white,
    alignSelf: "flex-end",
  },
  consistentCardTitle: {
    fontSize: rf(11),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  consistentCardTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },
  consistentCardDesc: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
    lineHeight: rf(12),
  },
  infoCardInline: {
    backgroundColor: `${ResponsiveTheme.colors.primary}05`,
    marginTop: ResponsiveTheme.spacing.md,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
