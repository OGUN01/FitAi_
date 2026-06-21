import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw } from "../../../../utils/responsive";import { AnimatedPressable } from "../../../../components/ui/aurora";
import { WORKOUT_TIMES } from "../../../../screens/onboarding/tabs/WorkoutPreferencesConstants";

interface WorkoutTimesSelectorProps {
  selectedTimes: string[];
  onToggleTime: (timeId: string) => void;
}

export const WorkoutTimesSelector: React.FC<WorkoutTimesSelectorProps> = ({
  selectedTimes,
  onToggleTime,
}) => {
  return (
    <>
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel}>Preferred Workout Times</Text>
      </View>
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(105) + rw(10)}
          snapToAlignment="start"
        >
          {WORKOUT_TIMES.map((time) => {
            const isSelected = selectedTimes.includes(time.value);
            return (
              <AnimatedPressable
                key={time.value}
                onPress={() => onToggleTime(time.value)}
                style={styles.consistentCardItem}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isSelected && styles.consistentCardSelected,
                  ]}
                >
                  <View style={styles.consistentCardIconCenter}>
                    <Ionicons
                      name={time.iconName as ComponentProps<typeof Ionicons>['name']}
                      size={rf(22)}
                      color={
                        isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {time.label}
                  </Text>
                  <Text style={styles.consistentCardDesc} numberOfLines={1}>
                    {time.description}
                  </Text>
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
    </>
  );
};

const styles = StyleSheet.create({
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
    minHeight: 120,
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
});
