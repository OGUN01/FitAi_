import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { rf, rw } from "../../../../utils/responsive";
import { ResponsiveTheme } from "../../../../utils/constants";
import { AnimatedPressable } from "../../../../components/ui/aurora";
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
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
  durationPill: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    minWidth: rw(70),
    alignItems: "center",
  },
  durationPillSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },
  durationPillText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  durationPillTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
});
