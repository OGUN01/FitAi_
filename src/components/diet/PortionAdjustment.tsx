import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../../theme/aurora-tokens';
import { GlassButton } from '../ui/aurora/GlassButton';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { AuroraSpinner } from '../ui/aurora/AuroraSpinner';
import { RangeSlider } from '../onboarding/aurora/RangeSlider';
import { RecognizedFood } from '../../services/foodRecognitionService';
import { rf, rh, rw, rbr } from '../../utils/responsive';
import { crossPlatformAlert } from '../../utils/crossPlatformAlert';

interface PortionAdjustmentProps {
  visible: boolean;
  recognizedFoods: RecognizedFood[];
  onClose: () => void;
  onAdjustmentComplete: (adjustedFoods: RecognizedFood[]) => void;
}

interface PortionAdjustmentData {
  foodId: string;
  originalGrams: number;
  adjustedGrams: number;
  adjustmentRatio: number;
}

export const PortionAdjustment: React.FC<PortionAdjustmentProps> = ({
  visible,
  recognizedFoods,
  onClose,
  onAdjustmentComplete,
}) => {
  const [adjustments, setAdjustments] = useState<PortionAdjustmentData[]>([]);
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  // Local text state for the manual gram input while it is being edited, so
  // the user can clear/retype without the controlled value snapping back.
  // null = not editing (input mirrors adjustedGrams).
  const [gramInputText, setGramInputText] = useState<string | null>(null);

  // Initialize adjustments when foods change
  React.useEffect(() => {
    if (recognizedFoods.length > 0) {
      setAdjustments(
        recognizedFoods.map((food) => ({
          foodId: food.id,
          originalGrams: food.userGrams ?? food.estimatedGrams,
          adjustedGrams: food.userGrams ?? food.estimatedGrams,
          adjustmentRatio: 1.0,
        }))
      );
      setCurrentFoodIndex(0);
      setGramInputText(null);
    }
  }, [recognizedFoods]);

  // Discard any in-progress gram text when switching foods (blur normally
  // commits first; this covers the card swap happening without a blur event).
  React.useEffect(() => {
    setGramInputText(null);
  }, [currentFoodIndex]);

  const updateAdjustment = (index: number, adjustedGrams: number) => {
    const originalGrams = recognizedFoods[index].userGrams ?? recognizedFoods[index].estimatedGrams;
    const adjustmentRatio = adjustedGrams / originalGrams;

    setAdjustments((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              adjustedGrams: Math.round(adjustedGrams),
              adjustmentRatio: Math.round(adjustmentRatio * 100) / 100,
            }
          : item
      )
    );
  };

  const applyAdjustments = async () => {
    setIsProcessing(true);

    try {
      const adjustedFoods: RecognizedFood[] = recognizedFoods.map((food, index) => {
        const adjustment = adjustments[index];
        if (!adjustment || adjustment.adjustmentRatio === 1.0) {
          return food; // No adjustment needed
        }

        // Scale nutrition values based on portion adjustment
        const scaledNutrition = {
          calories: Math.round(food.nutrition.calories * adjustment.adjustmentRatio),
          protein: Math.round(food.nutrition.protein * adjustment.adjustmentRatio * 10) / 10,
          carbs: Math.round(food.nutrition.carbs * adjustment.adjustmentRatio * 10) / 10,
          fat: Math.round(food.nutrition.fat * adjustment.adjustmentRatio * 10) / 10,
          fiber: food.nutrition.fiber
            ? Math.round(food.nutrition.fiber * adjustment.adjustmentRatio * 10) / 10
            : undefined,
          sugar: food.nutrition.sugar
            ? Math.round(food.nutrition.sugar * adjustment.adjustmentRatio * 10) / 10
            : undefined,
          sodium: food.nutrition.sodium
            ? Math.round(food.nutrition.sodium * adjustment.adjustmentRatio)
            : undefined,
        };

        return {
          ...food,
          userGrams: adjustment.adjustedGrams,
          nutrition: scaledNutrition,
        } as RecognizedFood;
      });

      onAdjustmentComplete(adjustedFoods);

      // Show summary of adjustments
      const changedFoods = adjustments.filter((adj) => adj.adjustmentRatio !== 1.0);
      if (changedFoods.length > 0) {
        crossPlatformAlert(
          'Portions Adjusted!',
          `Updated portion sizes for ${changedFoods.length} food item${changedFoods.length !== 1 ? 's' : ''}.\n\nNutrition values have been recalculated automatically.`,
          [{ text: 'Perfect!' }]
        );
      }
    } catch (error) {
      console.error('Error applying portion adjustments:', error);
      crossPlatformAlert('Error', 'Failed to apply portion adjustments. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getServingSizeLabel = (grams: number): string => {
    if (grams < 50) return 'Very Small';
    if (grams < 100) return 'Small';
    if (grams < 150) return 'Medium';
    if (grams < 250) return 'Large';
    if (grams < 350) return 'Very Large';
    return 'Extra Large';
  };

  const getCommonPortionSizes = (foodName: string): { label: string; grams: number }[] => {
    const name = foodName.toLowerCase();

    // Common portion sizes for different food types
    if (name.includes('rice') || name.includes('biryani') || name.includes('pulao')) {
      return [
        { label: 'Small bowl', grams: 100 },
        { label: 'Medium bowl', grams: 150 },
        { label: 'Large bowl', grams: 200 },
        { label: 'Full plate', grams: 300 },
      ];
    }

    if (name.includes('roti') || name.includes('naan') || name.includes('chapati')) {
      return [
        { label: '1 piece', grams: 40 },
        { label: '2 pieces', grams: 80 },
        { label: '3 pieces', grams: 120 },
        { label: '4 pieces', grams: 160 },
      ];
    }

    if (name.includes('dal') || name.includes('curry') || name.includes('sabji')) {
      return [
        { label: 'Small serving', grams: 80 },
        { label: 'Medium serving', grams: 120 },
        { label: 'Large serving', grams: 180 },
        { label: 'Extra serving', grams: 240 },
      ];
    }

    // Generic portions
    return [
      { label: 'Small portion', grams: 75 },
      { label: 'Medium portion', grams: 150 },
      { label: 'Large portion', grams: 225 },
      { label: 'Extra large', grams: 300 },
    ];
  };

  const currentFood = recognizedFoods[currentFoodIndex];
  const currentAdjustment = adjustments[currentFoodIndex];

  if (!currentFood || !currentAdjustment) {
    return null;
  }

  const effectiveGrams = currentFood.userGrams ?? currentFood.estimatedGrams;
  const minGrams = Math.max(20, Math.round(effectiveGrams * 0.3));
  const maxGrams = Math.round(effectiveGrams * 3);
  const commonPortions = getCommonPortionSizes(currentFood.name);

  // Calculate updated nutrition for preview
  const previewNutrition = {
    calories: Math.round(currentFood.nutrition.calories * currentAdjustment.adjustmentRatio),
    protein:
      Math.round(currentFood.nutrition.protein * currentAdjustment.adjustmentRatio * 10) / 10,
    carbs: Math.round(currentFood.nutrition.carbs * currentAdjustment.adjustmentRatio * 10) / 10,
    fat: Math.round(currentFood.nutrition.fat * currentAdjustment.adjustmentRatio * 10) / 10,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Adjust Portion Sizes</Text>
          <AnimatedPressable
            onPress={onClose}
            style={styles.closeButton}
            scaleValue={0.9}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Close portion adjustment"
          >
            <Ionicons name="close" size={rf(20)} color={colors.text} />
          </AnimatedPressable>
        </View>

        <View style={styles.progressIndicator}>
          <Text style={styles.progressText}>
            Food {currentFoodIndex + 1} of {recognizedFoods.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentFoodIndex + 1) / recognizedFoods.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Food Info */}
          <GlassCard padding="lg" borderRadius="lg" showBorder style={styles.foodCard}>
            <View style={styles.foodHeader}>
              <Text style={styles.foodName}>{currentFood.name}</Text>
              <View style={styles.originalBadge}>
                <Text style={styles.originalText}>AI Estimate: {currentFood.estimatedGrams}g</Text>
              </View>
            </View>

            {/* Nutrition Preview */}
            <View style={styles.nutritionPreview}>
              <Text style={styles.previewTitle}>Updated Nutrition:</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                  <Text style={styles.nutritionValue}>{previewNutrition.calories}</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                  <Text style={styles.nutritionValue}>{previewNutrition.protein}g</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                  <Text style={styles.nutritionValue}>{previewNutrition.carbs}g</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                  <Text style={styles.nutritionValue}>{previewNutrition.fat}g</Text>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Portion Size Slider */}
          <GlassCard padding="lg" borderRadius="lg" showBorder style={styles.sliderCard}>
            <Text style={styles.sectionTitle}>Adjust Portion Size</Text>

            <View style={styles.currentPortionDisplay}>
              <Text style={styles.currentPortionGrams}>{currentAdjustment.adjustedGrams}g</Text>
              <Text style={styles.currentPortionLabel}>
                {getServingSizeLabel(currentAdjustment.adjustedGrams)}
              </Text>
              {currentAdjustment.adjustmentRatio !== 1.0 && (
                <Text style={styles.adjustmentRatio}>
                  ({currentAdjustment.adjustmentRatio > 1 ? '+' : ''}
                  {Math.round((currentAdjustment.adjustmentRatio - 1) * 100)}%)
                </Text>
              )}
            </View>

            <RangeSlider
              min={minGrams}
              max={maxGrams}
              step={1}
              value={currentAdjustment.adjustedGrams}
              onChange={(value) => updateAdjustment(currentFoodIndex, value)}
              accentColor={colors.primary}
              showValue={false}
            />

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>{minGrams}g</Text>
              <Text style={styles.sliderLabel}>{maxGrams}g</Text>
            </View>

            {/* Manual Gram Input - For users with weighing scales */}
            <View style={styles.manualInputContainer}>
              <View style={styles.manualInputLabelRow}>
                <Ionicons name="scale-outline" size={rf(14)} color={colors.textSecondary} />
                <Text style={styles.manualInputLabel}>Have a scale? Enter exact grams:</Text>
              </View>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualInput}
                  keyboardType="numeric"
                  placeholder="Enter grams"
                  placeholderTextColor={colors.textMuted}
                  value={gramInputText ?? String(currentAdjustment.adjustedGrams)}
                  onFocus={() => setGramInputText(String(currentAdjustment.adjustedGrams))}
                  onChangeText={(text) => {
                    // Keep raw text locally so the field can be cleared and
                    // retyped; only commit numerically valid values, clamped
                    // to the same min/max as the slider above.
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setGramInputText(cleaned);
                    const numValue = parseInt(cleaned, 10);
                    if (!isNaN(numValue)) {
                      const clamped = Math.max(minGrams, Math.min(maxGrams, numValue));
                      updateAdjustment(currentFoodIndex, clamped);
                    }
                  }}
                  onBlur={() => {
                    const numValue = parseInt(gramInputText ?? '', 10);
                    if (!isNaN(numValue)) {
                      const clamped = Math.max(minGrams, Math.min(maxGrams, numValue));
                      updateAdjustment(currentFoodIndex, clamped);
                    }
                    setGramInputText(null);
                    Keyboard.dismiss();
                  }}
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <Text style={styles.manualInputUnit}>grams</Text>
              </View>
            </View>
          </GlassCard>

          {/* Quick Portion Buttons */}
          <GlassCard padding="lg" borderRadius="lg" showBorder style={styles.quickPortionsCard}>
            <Text style={styles.sectionTitle}>Common Portions</Text>
            <View style={styles.quickPortionsGrid}>
              {commonPortions.map((portion, index) => (
                <AnimatedPressable
                  key={index}
                  style={[
                    styles.quickPortionButton,
                    currentAdjustment.adjustedGrams === portion.grams &&
                      styles.quickPortionButtonActive,
                  ]}
                  onPress={() => updateAdjustment(currentFoodIndex, portion.grams)}
                  scaleValue={0.96}
                  hapticType="light"
                  accessibilityRole="button"
                  accessibilityLabel={`${portion.label}, ${portion.grams} grams`}
                  accessibilityState={{
                    selected: currentAdjustment.adjustedGrams === portion.grams,
                  }}
                >
                  <Text
                    style={[
                      styles.quickPortionLabel,
                      currentAdjustment.adjustedGrams === portion.grams &&
                        styles.quickPortionLabelActive,
                    ]}
                  >
                    {portion.label}
                  </Text>
                  <Text
                    style={[
                      styles.quickPortionGrams,
                      currentAdjustment.adjustedGrams === portion.grams &&
                        styles.quickPortionGramsActive,
                    ]}
                  >
                    {portion.grams}g
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </GlassCard>

          {/* Reset Button */}
          <GlassCard padding="lg" borderRadius="lg" showBorder style={styles.resetCard}>
            <AnimatedPressable
              style={styles.resetButton}
              onPress={() => updateAdjustment(currentFoodIndex, currentFood.estimatedGrams)}
              disabled={currentAdjustment.adjustmentRatio === 1.0}
              scaleValue={0.96}
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="Reset portion to estimated"
              accessibilityState={{
                disabled: currentAdjustment.adjustmentRatio === 1.0,
              }}
            >
              <Ionicons name="refresh-outline" size={rf(14)} color={colors.primary} />
              <Text
                style={[
                  styles.resetButtonText,
                  currentAdjustment.adjustmentRatio === 1.0 && styles.resetButtonTextDisabled,
                ]}
              >
                Reset to AI Estimate ({currentFood.estimatedGrams}g)
              </Text>
            </AnimatedPressable>
          </GlassCard>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <View style={styles.navigationButtons}>
            {currentFoodIndex > 0 && (
              <GlassButton
                label="Previous"
                onPress={() => setCurrentFoodIndex((prev) => prev - 1)}
                variant="secondary"
                style={styles.navButton}
              />
            )}

            {currentFoodIndex < recognizedFoods.length - 1 ? (
              <GlassButton
                label="Next"
                onPress={() => setCurrentFoodIndex((prev) => prev + 1)}
                style={styles.navButton}
              />
            ) : (
              <GlassButton
                label={isProcessing ? 'Applying...' : 'Apply Adjustments'}
                onPress={applyAdjustments}
                disabled={isProcessing}
                style={styles.navButton}
              />
            )}
          </View>

          {isProcessing && (
            <View style={styles.processingIndicator}>
              <AuroraSpinner customSize={rf(14)} theme="primary" />
              <Text style={styles.processingText}>Recalculating nutrition...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  title: {
    fontSize: fontSize.xl,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
  },

  closeButton: {
    width: Math.max(rw(32), 44),
    height: Math.max(rh(32), 44),
    borderRadius: rbr(16),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rbr(2),
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: rbr(2),
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Card sections use GlassCard (padding="lg" + showBorder) directly, so
  // these style overrides only need to carry inter-card spacing.
  foodCard: {
    marginBottom: spacing.lg,
  },

  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  foodName: {
    fontSize: fontSize.lg,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
    flex: 1,
  },

  originalBadge: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: rbr(12),
  },

  originalText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },

  nutritionPreview: {
    marginTop: spacing.md,
  },

  previewTitle: {
    fontSize: fontSize.md,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  nutritionItem: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
  },

  nutritionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },

  nutritionValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: String(typography.fontWeight.bold) as any,
    fontVariant: ['tabular-nums'],
  },

  sliderCard: {
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
    marginBottom: spacing.md,
  },

  currentPortionDisplay: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  currentPortionGrams: {
    fontSize: fontSize.xxl,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },

  currentPortionLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  adjustmentRatio: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },

  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    flex: 1,
  },

  manualInputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    justifyContent: 'center',
  },

  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.background,
  },

  manualInputUnit: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },

  quickPortionsCard: {
    marginBottom: spacing.lg,
  },

  quickPortionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  quickPortionButton: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },

  quickPortionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  quickPortionLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: String(typography.fontWeight.semibold) as any,
    marginBottom: spacing.xs,
  },

  quickPortionLabelActive: {
    color: colors.white,
  },

  quickPortionGrams: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  quickPortionGramsActive: {
    color: colors.white,
  },

  resetCard: {
    marginBottom: spacing.lg,
  },

  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
  },

  resetButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },

  resetButtonTextDisabled: {
    color: colors.textMuted,
  },

  navigationContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  navigationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  navButton: {
    flex: 1,
  },

  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },

  processingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});

export default PortionAdjustment;
