import React from "react";
import { View, Text, StyleSheet, TextInput, Keyboard } from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { rh, rw } from "../../../utils/responsive";
import { CustomSlider } from "./CustomSlider";
import { PortionAdjustment } from "../../../hooks/usePortionAdjustment";

interface PortionSliderCardProps {
  currentAdjustment: PortionAdjustment;
  minGrams: number;
  maxGrams: number;
  currentFoodIndex: number;
  getServingSizeLabel: (grams: number) => string;
  updateAdjustment: (index: number, adjustedGrams: number) => void;
}

export const PortionSliderCard: React.FC<PortionSliderCardProps> = ({
  currentAdjustment,
  minGrams,
  maxGrams,
  currentFoodIndex,
  getServingSizeLabel,
  updateAdjustment,
}) => {
  return (
    <Card style={styles.sliderCard}>
      <Text style={styles.sectionTitle}>Adjust Portion Size</Text>

      <View style={styles.currentPortionDisplay}>
        <Text style={styles.currentPortionGrams}>
          {currentAdjustment.adjustedGrams}g
        </Text>
        <Text style={styles.currentPortionLabel}>
          {getServingSizeLabel(currentAdjustment.adjustedGrams)}
        </Text>
        {currentAdjustment.adjustmentRatio !== 1.0 && (
          <Text style={styles.adjustmentRatio}>
            ({currentAdjustment.adjustmentRatio > 1 ? "+" : ""}
            {Math.round((currentAdjustment.adjustmentRatio - 1) * 100)}%)
          </Text>
        )}
      </View>

      <CustomSlider
        style={styles.slider}
        minimumValue={minGrams}
        maximumValue={maxGrams}
        value={currentAdjustment.adjustedGrams}
        onValueChange={(value) => updateAdjustment(currentFoodIndex, value)}
      />

      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{minGrams}g</Text>
        <Text style={styles.sliderLabel}>{maxGrams}g</Text>
      </View>

      <View style={styles.manualInputContainer}>
        <Text style={styles.manualInputLabel}>
          ⚖️ Have a scale? Enter exact grams:
        </Text>
        <View style={styles.manualInputRow}>
          <TextInput
            style={styles.manualInput}
            keyboardType="numeric"
            placeholder="Enter grams"
            placeholderTextColor={colors.textMuted}
            value={String(currentAdjustment.adjustedGrams)}
            onChangeText={(text) => {
              const numValue = parseInt(text.replace(/[^0-9]/g, ""), 10);
              if (!isNaN(numValue) && numValue >= 1 && numValue <= 2000) {
                updateAdjustment(currentFoodIndex, numValue);
              }
            }}
            onBlur={() => Keyboard.dismiss()}
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <Text style={styles.manualInputUnit}>grams</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  sliderCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  currentPortionDisplay: {
    alignItems: "center" as const,
    marginBottom: spacing.lg,
  },
  currentPortionGrams: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.primary,
  },
  currentPortionLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  adjustmentRatio: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  slider: {
    width: "100%",
    height: rh(40),
    marginVertical: spacing.md,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  manualInputContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manualInputLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  manualInputRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
  },
  manualInput: {
    width: rw(100),
    height: rh(48),
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    backgroundColor: colors.background,
  },
  manualInputUnit: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
