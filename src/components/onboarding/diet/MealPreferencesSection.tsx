import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh, rs, rbr, rp } from "../../../utils/responsive";
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
                color={colors.warning}
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
                          ? colors.primary
                          : colors.textSecondary
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
                color={colors.primary}
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
  warningCardInline: {
    backgroundColor: `${colors.warning}10`,
    marginBottom: spacing.md,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.warning,
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
  consistentCardItemDisabled: {
    opacity: 0.7,
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
  consistentCardDisabled: {
    opacity: 0.8,
  },
  consistentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: spacing.xs,
  },
  miniToggle: {
    width: rs(24),
    height: rs(14),
    borderRadius: rbr(7),
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    paddingHorizontal: rp(1),
  },
  miniToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniToggleThumb: {
    width: rs(10),
    height: rs(10),
    borderRadius: rbr(5),
    backgroundColor: colors.textSecondary,
  },
  miniToggleThumbActive: {
    backgroundColor: colors.white,
    alignSelf: "flex-end",
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
  infoCardInline: {
    backgroundColor: `${colors.primary}05`,
    marginTop: spacing.md,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
});
