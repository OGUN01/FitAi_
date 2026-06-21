import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../../theme/aurora-tokens";
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { rf, rw } from "../../../../utils/responsive";import { AnimatedPressable } from "../../../../components/ui/aurora";
import { formatTime } from "../../../../hooks/useWorkoutPreferences";

interface DurationSelectorProps {
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
}

const DURATIONS = [15, 30, 45, 60, 75, 90, 120];

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  selectedDuration,
  onDurationChange,
}) => {
  return (
    <>
      <View style={styles.edgeToEdgeContentPadded}>
        <Text style={styles.fieldLabel}>
          Workout Duration: {formatTime(selectedDuration)}
        </Text>
      </View>
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(70) + rw(10)}
          snapToAlignment="start"
        >
          {DURATIONS.map((minutes) => {
            const isSelected = selectedDuration === minutes;
            return (
              <AnimatedPressable
                key={minutes}
                style={
                  isSelected
                    ? [styles.durationPill, styles.durationPillSelected]
                    : styles.durationPill
                }
                onPress={() => onDurationChange(minutes)}
                scaleValue={0.97}
              >
                <Text
                  style={[
                    styles.durationPillText,
                    isSelected && styles.durationPillTextSelected,
                  ]}
                >
                  {formatTime(minutes)}
                </Text>
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
  durationPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.backgroundTertiary,
    minWidth: rw(70),
    alignItems: "center",
  },
  durationPillSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  durationPillText: {
    fontSize: rf(12),
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  durationPillTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});
