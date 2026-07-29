import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  surface,
  border as borderTokens,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
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
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  periodSelector: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  periodButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  periodText: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  periodTextActive: {
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.primary,
  },
});
