import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,

  ActivityIndicator,
  TextInput,
  Keyboard,
  StyleProp,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { Button, Card } from "../ui";
import { RecognizedFood } from "../../services/foodRecognitionService";
import { rf, rh, rw, rbr } from "../../utils/responsive";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

// Custom Slider Component
interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  value: number;
  onValueChange: (value: number) => void;
  style?: StyleProp<ViewStyle>;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  style,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const handleTrackPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const percentage = locationX / trackWidth;
    const newValue = minimumValue + (maximumValue - minimumValue) * percentage;
    const clampedValue = Math.max(
      minimumValue,
      Math.min(maximumValue, newValue),
    );
    onValueChange(clampedValue);
  };

  const getThumbPosition = () => {
    const percentage = (value - minimumValue) / (maximumValue - minimumValue);
    return percentage * (trackWidth - 24); // 24 is thumb width
  };

  return (
    <View style={[styles.customSliderContainer, style]}>
      <View
        style={styles.customSliderTrack}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onTouchEnd={handleTrackPress}
      >
        <View
          style={[
            styles.customSliderFill,
            {
              width: `${((value - minimumValue) / (maximumValue - minimumValue)) * 100}%`,
            },
          ]}
        />
        <View
          style={[
            styles.customSliderThumb,
            { left: getThumbPosition() },
            isDragging && styles.customSliderThumbActive,
          ]}
        />
      </View>
    </View>
  );
};

interface PortionAdjustmentProps {
  visible: boolean;
  recognizedFoods: RecognizedFood[];
  onClose: () => void;
  onAdjustmentComplete: (adjustedFoods: RecognizedFood[]) => void;
}

interface PortionAdjustment {
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
  const [adjustments, setAdjustments] = useState<PortionAdjustment[]>([]);
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize adjustments when foods change
  React.useEffect(() => {
    if (recognizedFoods.length > 0) {
      setAdjustments(
        recognizedFoods.map((food) => ({
          foodId: food.id,
          originalGrams: food.userGrams ?? food.estimatedGrams,
          adjustedGrams: food.userGrams ?? food.estimatedGrams,
          adjustmentRatio: 1.0,
        })),
      );
      setCurrentFoodIndex(0);
    }
  }, [recognizedFoods]);

  const updateAdjustment = (index: number, adjustedGrams: number) => {
    const originalGrams =
      recognizedFoods[index].userGrams ?? recognizedFoods[index].estimatedGrams;
    const adjustmentRatio = adjustedGrams / originalGrams;

    setAdjustments((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              adjustedGrams: Math.round(adjustedGrams),
              adjustmentRatio: Math.round(adjustmentRatio * 100) / 100,
            }
          : item,
      ),
    );
  };

  const applyAdjustments = async () => {
    setIsProcessing(true);

    try {
      const adjustedFoods: RecognizedFood[] = recognizedFoods.map(
        (food, index) => {
          const adjustment = adjustments[index];
          if (!adjustment || adjustment.adjustmentRatio === 1.0) {
            return food; // No adjustment needed
          }

          // Scale nutrition values based on portion adjustment
          const scaledNutrition = {
            calories: Math.round(
              food.nutrition.calories * adjustment.adjustmentRatio,
            ),
            protein:
              Math.round(
                food.nutrition.protein * adjustment.adjustmentRatio * 10,
              ) / 10,
            carbs:
              Math.round(
                food.nutrition.carbs * adjustment.adjustmentRatio * 10,
              ) / 10,
            fat:
              Math.round(food.nutrition.fat * adjustment.adjustmentRatio * 10) /
              10,
            fiber: food.nutrition.fiber
              ? Math.round(
                  food.nutrition.fiber * adjustment.adjustmentRatio * 10,
                ) / 10
              : undefined,
            sugar: food.nutrition.sugar
              ? Math.round(
                  food.nutrition.sugar * adjustment.adjustmentRatio * 10,
                ) / 10
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
        },
      );

      onAdjustmentComplete(adjustedFoods);

      // Show summary of adjustments
      const changedFoods = adjustments.filter(
        (adj) => adj.adjustmentRatio !== 1.0,
      );
      if (changedFoods.length > 0) {
        crossPlatformAlert(
          "✅ Portions Adjusted!",
          `Updated portion sizes for ${changedFoods.length} food item${changedFoods.length !== 1 ? "s" : ""}.\n\nNutrition values have been recalculated automatically.`,
          [{ text: "Perfect!" }],
        );
      }
    } catch (error) {
      console.error("Error applying portion adjustments:", error);
      crossPlatformAlert(
        "Error",
        "Failed to apply portion adjustments. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getServingSizeLabel = (grams: number): string => {
    if (grams < 50) return "Very Small";
    if (grams < 100) return "Small";
    if (grams < 150) return "Medium";
    if (grams < 250) return "Large";
    if (grams < 350) return "Very Large";
    return "Extra Large";
  };

  const getCommonPortionSizes = (
    foodName: string,
  ): { label: string; grams: number }[] => {
    const name = foodName.toLowerCase();

    // Common portion sizes for different food types
    if (
      name.includes("rice") ||
      name.includes("biryani") ||
      name.includes("pulao")
    ) {
      return [
        { label: "Small bowl", grams: 100 },
        { label: "Medium bowl", grams: 150 },
        { label: "Large bowl", grams: 200 },
        { label: "Full plate", grams: 300 },
      ];
    }

    if (
      name.includes("roti") ||
      name.includes("naan") ||
      name.includes("chapati")
    ) {
      return [
        { label: "1 piece", grams: 40 },
        { label: "2 pieces", grams: 80 },
        { label: "3 pieces", grams: 120 },
        { label: "4 pieces", grams: 160 },
      ];
    }

    if (
      name.includes("dal") ||
      name.includes("curry") ||
      name.includes("sabji")
    ) {
      return [
        { label: "Small serving", grams: 80 },
        { label: "Medium serving", grams: 120 },
        { label: "Large serving", grams: 180 },
        { label: "Extra serving", grams: 240 },
      ];
    }

    // Generic portions
    return [
      { label: "Small portion", grams: 75 },
      { label: "Medium portion", grams: 150 },
      { label: "Large portion", grams: 225 },
      { label: "Extra large", grams: 300 },
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
    calories: Math.round(
      currentFood.nutrition.calories * currentAdjustment.adjustmentRatio,
    ),
    protein:
      Math.round(
        currentFood.nutrition.protein * currentAdjustment.adjustmentRatio * 10,
      ) / 10,
    carbs:
      Math.round(
        currentFood.nutrition.carbs * currentAdjustment.adjustmentRatio * 10,
      ) / 10,
    fat:
      Math.round(
        currentFood.nutrition.fat * currentAdjustment.adjustmentRatio * 10,
      ) / 10,
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
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
          <Card style={styles.foodCard}>
            <View style={styles.foodHeader}>
              <Text style={styles.foodName}>{currentFood.name}</Text>
              <View style={styles.originalBadge}>
                <Text style={styles.originalText}>
                  AI Estimate: {currentFood.estimatedGrams}g
                </Text>
              </View>
            </View>

            {/* Nutrition Preview */}
            <View style={styles.nutritionPreview}>
              <Text style={styles.previewTitle}>Updated Nutrition:</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                  <Text style={styles.nutritionValue}>
                    {previewNutrition.calories}
                  </Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                  <Text style={styles.nutritionValue}>
                    {previewNutrition.protein}g
                  </Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                  <Text style={styles.nutritionValue}>
                    {previewNutrition.carbs}g
                  </Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                  <Text style={styles.nutritionValue}>
                    {previewNutrition.fat}g
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Portion Size Slider */}
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
              onValueChange={(value) =>
                updateAdjustment(currentFoodIndex, value)
              }
            />

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>{minGrams}g</Text>
              <Text style={styles.sliderLabel}>{maxGrams}g</Text>
            </View>

            {/* Manual Gram Input - For users with weighing scales */}
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

          {/* Quick Portion Buttons */}
          <Card style={styles.quickPortionsCard}>
            <Text style={styles.sectionTitle}>Common Portions</Text>
            <View style={styles.quickPortionsGrid}>
              {commonPortions.map((portion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickPortionButton,
                    currentAdjustment.adjustedGrams === portion.grams &&
                      styles.quickPortionButtonActive,
                  ]}
                  onPress={() =>
                    updateAdjustment(currentFoodIndex, portion.grams)
                  }
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
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Reset Button */}
          <Card style={styles.resetCard}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() =>
                updateAdjustment(currentFoodIndex, currentFood.estimatedGrams)
              }
              disabled={currentAdjustment.adjustmentRatio === 1.0}
            >
              <Text
                style={[
                  styles.resetButtonText,
                  currentAdjustment.adjustmentRatio === 1.0 &&
                    styles.resetButtonTextDisabled,
                ]}
              >
                🔄 Reset to AI Estimate ({currentFood.estimatedGrams}g)
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <View style={styles.navigationButtons}>
            {currentFoodIndex > 0 && (
              <Button
                title="Previous"
                onPress={() => setCurrentFoodIndex((prev) => prev - 1)}
                variant="outline"
                style={styles.navButton}
              />
            )}

            {currentFoodIndex < recognizedFoods.length - 1 ? (
              <Button
                title="Next"
                onPress={() => setCurrentFoodIndex((prev) => prev + 1)}
                style={styles.navButton}
              />
            ) : (
              <Button
                title={isProcessing ? "Applying..." : "Apply Adjustments"}
                onPress={applyAdjustments}
                disabled={isProcessing}
                style={styles.navButton}
              />
            )}
          </View>

          {isProcessing && (
            <View style={styles.processingIndicator}>
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />
              <Text style={styles.processingText}>
                Recalculating nutrition...
              </Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
  },

  closeButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: rbr(16),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    fontSize: rf(16),
    color: colors.text,
    fontWeight: "600",
  },

  progressIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rbr(2),
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rbr(2),
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  foodCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  foodName: {
    fontSize: fontSize.lg,
    fontWeight: "700",
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
    fontWeight: "600",
  },

  nutritionPreview: {
    marginTop: spacing.md,
  },

  previewTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },

  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  nutritionItem: {
    flex: 1,
    minWidth: "22%",
    alignItems: "center",
  },

  nutritionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },

  nutritionValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "700",
  },

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
    alignItems: "center",
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

  sliderThumb: {
    backgroundColor: colors.primary,
    width: rw(24),
    height: rh(24),
  },

  sliderTrack: {
    height: rh(4),
    borderRadius: rbr(2),
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
    alignItems: "center",
    justifyContent: "center",
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

  quickPortionsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  quickPortionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  quickPortionButton: {
    flex: 1,
    minWidth: "45%",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },

  quickPortionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  quickPortionLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
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
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  resetButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
    alignItems: "center",
  },

  resetButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
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
    flexDirection: "row",
    gap: spacing.md,
  },

  navButton: {
    flex: 1,
  },

  processingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },

  processingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },

  // Custom Slider Styles
  customSliderContainer: {
    width: "100%",
    height: rh(40),
    justifyContent: "center",
    marginVertical: spacing.md,
  },

  customSliderTrack: {
    height: rh(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rbr(2),
    position: "relative",
  },

  customSliderFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rbr(2),
    position: "absolute",
    left: 0,
    top: 0,
  },

  customSliderThumb: {
    position: "absolute",
    top: rh(-10),
    width: rw(24),
    height: rh(24),
    backgroundColor: colors.primary,
    borderRadius: rbr(12),
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 4,
  },

  customSliderThumbActive: {
    transform: [{ scale: 1.2 }],
    shadowOpacity: 0.3,
  },
});

export default PortionAdjustment;
