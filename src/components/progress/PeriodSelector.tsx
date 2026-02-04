import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";

interface PeriodSelectorProps {
  periods: { id: string; label: string }[];
  selectedPeriod: string;
  onSelect: (id: string) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periods,
  selectedPeriod,
  onSelect,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <AnimatedPressable
            key={period.id}
            onPress={() => onSelect(period.id)}
            style={
              selectedPeriod === period.id
                ? [styles.periodButton, styles.periodButtonActive]
                : styles.periodButton
            }
            scaleValue={0.97}
            hapticFeedback={true}
            hapticType="selection"
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === period.id && styles.periodTextActive,
              ]}
            >
              {period.label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  periodSelector: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.xs,
    gap: ResponsiveTheme.spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    alignItems: "center",
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  periodButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  periodText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
  },
  periodTextActive: {
    color: ResponsiveTheme.colors.white,
  },
});
