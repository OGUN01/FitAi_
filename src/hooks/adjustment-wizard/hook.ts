import { logger } from '../../utils/logger';
import { useState, useEffect } from "react";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
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
      logger.debug('[AdjustmentWizard] Visible with error', {
        errorCode: error.code,
        hasPrecomputedAlternatives: !!(error.alternatives && error.alternatives.length > 0),
        precomputedCount: error.alternatives?.length ?? 0,
        bmr: currentData.bmr,
        tdee: currentData.tdee,
        currentWeight: currentData.currentWeight,
        targetWeight: currentData.targetWeight,
        currentTimeline: currentData.currentTimeline,
        currentFrequency: currentData.currentFrequency,
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
        logger.debug('[AdjustmentWizard] Using pre-computed alternatives', { count: error.alternatives!.length });
        const transformedAlternatives = error.alternatives!.map((alt: any) => {
          if ("name" in alt && "pros" in alt && "cons" in alt) {
            return alt as Alternative;
          }
          return transformSmartAlternativeToAlternative(alt);
        });
        setAlternatives(transformedAlternatives);
        logger.debug('[AdjustmentWizard] Alternatives set', {
          source: 'precomputed',
          count: transformedAlternatives.length,
        });
      } else {
        const calculatedAlternatives = calculateAlternativesForError(
          error.code,
          currentData,
          primaryGoals,
        );
        logger.debug('[AdjustmentWizard] Calculated alternatives', {
          errorCode: error.code,
          count: calculatedAlternatives.length,
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
        // onSelectAlternative (see AdvancedReviewTab.handleSelectAlternative)
        // calls onUpdateBodyAnalysis/onUpdateWorkoutPreferences, which update
        // React state one render cycle away in the parent (OnboardingContainer).
        // onSaveToDatabase reads that state via closure, so calling it in the
        // same tick would persist the PREVIOUS values. This delay is a
        // fixed-timer bridge over that gap, not a true root-cause fix — the
        // real fix is to await the state commit directly (e.g. have
        // onSelectAlternative return a Promise that resolves after the parent
        // state update flushes, or have onSaveToDatabase accept the selected
        // alternative's values explicitly instead of reading stale closure
        // state). That requires changing the onSelectAlternative/
        // onSaveToDatabase contract in AdvancedReviewTab.tsx and
        // OnboardingContainer.tsx, which are outside this hook's ownership —
        // flagged here as a cross-domain follow-up rather than patched
        // blindly.
        await new Promise((resolve) => setTimeout(resolve, 100));
        try {
          await onSaveToDatabase();
          logger.debug('[AdjustmentWizard] Saved to database successfully');
        } catch (err) {
          logger.error('[AdjustmentWizard] Failed to save to database', { error: String(err) });
          setIsSaving(false);
          // No Silent Failures: surface the save failure and keep the wizard
          // open so the user can retry, instead of closing as if it succeeded.
          crossPlatformAlert(
            "Couldn't Save Your Choice",
            'Your selection could not be saved. Please try again.',
          );
          return;
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
