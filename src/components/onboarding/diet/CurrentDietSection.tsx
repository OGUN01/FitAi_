import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh } from "../../../utils/responsive";
import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import { DIET_TYPE_OPTIONS } from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { DietPreferencesData } from "../../../types/onboarding";

interface CurrentDietSectionProps {
  formData: DietPreferencesData;
  updateField: <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => void;
  showInfoTooltip: (title: string, description: string) => void;
}

export const CurrentDietSection: React.FC<CurrentDietSectionProps> = ({
  formData,
  updateField,
  showInfoTooltip,
}) => {
  const handleInfoPress =
    (title: string, description: string) => (event: any) => {
      event.stopPropagation?.();
      showInfoTooltip(title, description);
    };

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      {/* Title with padding */}
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Current Diet Type
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          What best describes your current eating habits?
        </Text>
      </View>

      {/* Scroll container - inset from card edges */}
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(105) + rw(10)}
          snapToAlignment="start"
        >
          {DIET_TYPE_OPTIONS.map((option) => {
            const isSelected = formData.diet_type === option.id;
            return (
              <AnimatedPressable
                key={option.id}
                onPress={() =>
                  updateField(
                    "diet_type",
                    option.id as DietPreferencesData["diet_type"],
                  )
                }
                style={styles.consistentCardItem}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isSelected && styles.consistentCardSelected,
                  ]}
                >
                  {/* Icon + Info row */}
                  <View style={styles.consistentCardHeader}>
                    <Ionicons
                      name={option.iconName as ComponentProps<typeof Ionicons>['name']}
                      size={rf(22)}
                      color={
                        isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <TouchableOpacity
                      onPress={handleInfoPress(
                        option.title,
                        option.description,
                      )}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`More info about ${option.title}`}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={rf(14)}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {/* Title */}
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {option.title}
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
      {/* Bottom padding inside card */}
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
  consistentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
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
  sectionBottomPad: {
    height: spacing.lg,
  },
});
