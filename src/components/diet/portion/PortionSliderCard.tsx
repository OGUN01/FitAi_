import React from "react";
import { View, Text, StyleSheet, TextInput, Keyboard } from "react-native";
import { Card } from "../../ui";
import { ResponsiveTheme } from "../../../utils/constants";
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
            placeholderTextColor={ResponsiveTheme.colors.textMuted}
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
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  currentPortionDisplay: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  currentPortionGrams: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.primary,
  },
  currentPortionLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  adjustmentRatio: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: "italic",
    marginTop: ResponsiveTheme.spacing.xs,
  },
  slider: {
    width: "100%",
    height: rh(40),
    marginVertical: ResponsiveTheme.spacing.md,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
  manualInputContainer: {
    marginTop: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  manualInputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },
  manualInputRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },
  manualInput: {
    width: rw(100),
    height: rh(48),
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    backgroundColor: ResponsiveTheme.colors.background,
  },
  manualInputUnit: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "600",
  },
});
