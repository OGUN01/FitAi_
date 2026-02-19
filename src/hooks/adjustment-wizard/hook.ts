import { useState, useEffect } from "react";
import { Alternative, UseAdjustmentWizardProps } from "./types";
import { transformSmartAlternativeToAlternative } from "./utils";
import { calculateAlternativesForError } from "./errorRouter";

export const useAdjustmentWizard = ({
  visible,
  error,
  currentData,
  primaryGoals = [],
  onSelectAlternative,
  onSaveToDatabase,
  onClose,
}: UseAdjustmentWizardProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && error.code) {
      console.log("[AdjustmentWizard] Visible with error:", {
        errorCode: error.code,
        hasPrecomputedAlternatives: !!(
          error.alternatives && error.alternatives.length > 0
        ),
        precomputedCount: error.alternatives?.length || 0,
        currentData: {
          bmr: currentData.bmr,
          tdee: currentData.tdee,
          currentWeight: currentData.currentWeight,
          targetWeight: currentData.targetWeight,
          currentTimeline: currentData.currentTimeline,
          currentFrequency: currentData.currentFrequency,
        },
      });

      const hasCompleteAlternatives =
        error.alternatives &&
        error.alternatives.length > 0 &&
        error.alternatives.every(
          (alt: any) =>
            (typeof alt.dailyCalories === "number" && alt.dailyCalories > 0) ||
            (typeof alt.weeklyRate === "number" && alt.weeklyRate > 0) ||
            ("name" in alt && "pros" in alt && "cons" in alt),
        );

      if (hasCompleteAlternatives && error.alternatives) {
        console.log(
          "[AdjustmentWizard] Using complete pre-computed alternatives:",
          error.alternatives.length,
        );
        const transformedAlternatives = error.alternatives!.map((alt: any) => {
          if ("name" in alt && "pros" in alt && "cons" in alt) {
            return alt as Alternative;
          }
          return transformSmartAlternativeToAlternative(alt);
        });
        console.log("[AdjustmentWizard] Transformed alternatives:", {
          count: transformedAlternatives.length,
          alternatives: transformedAlternatives.map((a: Alternative) => ({
            name: a.name,
            dailyCalories: a.dailyCalories,
            weeklyRate: a.weeklyRate,
            prosCount: a.pros?.length || 0,
            consCount: a.cons?.length || 0,
          })),
        });
        setAlternatives(transformedAlternatives);
      } else {
        console.log(
          "[AdjustmentWizard] Calculating alternatives for error code:",
          error.code,
        );
        const calculatedAlternatives = calculateAlternativesForError(
          error.code,
          currentData,
          primaryGoals,
        );
        console.log("[AdjustmentWizard] Calculated alternatives:", {
          count: calculatedAlternatives.length,
          alternatives: calculatedAlternatives.map((a) => ({
            name: a.name,
            dailyCalories: a.dailyCalories,
            weeklyRate: a.weeklyRate,
          })),
        });
        setAlternatives(calculatedAlternatives);
      }
      setSelectedIndex(null);
    }
  }, [visible, currentData, error, primaryGoals]);

  const handleSelectAlternative = async () => {
    if (selectedIndex !== null && alternatives[selectedIndex]) {
      setIsSaving(true);

      onSelectAlternative(alternatives[selectedIndex]);

      if (onSaveToDatabase) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        try {
          await onSaveToDatabase();
          console.log("[AdjustmentWizard] Successfully saved to database");
        } catch (err) {
          console.error("[AdjustmentWizard] Failed to save to database:", err);
        }
      }

      setIsSaving(false);
      onClose();
    }
  };

  return {
    selectedIndex,
    setSelectedIndex,
    alternatives,
    isSaving,
    handleSelectAlternative,
  };
};
