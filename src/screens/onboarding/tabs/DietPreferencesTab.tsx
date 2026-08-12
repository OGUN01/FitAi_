/**
 * S3 "Fuel" — DietPreferencesTab (blueprint §3 S3, §5 S3 disclosure)
 *
 * The one question: "How do you eat?"
 *
 * Fresh "Editorial Dark" reskin — NO cards, NO boxed sections. Frame is the
 * shared ScreenScaffold (question + scroll + Back/Next footer). Sections are
 * labels + rows + hairlines via the fresh primitive kit.
 *
 * PEAK layer (presentation-only):
 *  - Sections stagger in (FadeInDown, via the shared onboardingStagger()
 *    helper) so the dense form arrives as a sequence, not a wall.
 *  - A quiet "receipt" line between the always-visible zone and the
 *    collapsible zone reflects the choices made so far (diet · meals ·
 *    time · budget · exclusions) — the form talks back without adding fields.
 *
 * Presentation/layout ONLY. Data wiring, hooks, validation, props — unchanged.
 * Smart defaults (§4) live in useDietPreferences initial state. Progressive
 * disclosure (§5) is pure local UI state inside each section.
 */

import React, { useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import {
  DietPreferencesData,
  TabValidationResult,
} from "../../../types/onboarding";
import { useDietPreferences } from "../../../hooks/onboarding/useDietPreferences";
import {
  ScreenScaffold,
  Rule,
  spacing,
  tokens,
  type as typeScale,
} from "../../../components/onboarding/fresh";
import {
  DIET_TYPE_OPTIONS,
  BUDGET_LEVELS,
} from "./DietPreferencesConstants";

// Sections (presentation-only redesign; props contracts unchanged)
import { CurrentDietSection } from "../../../components/onboarding/diet/CurrentDietSection";
import { DietReadinessSection } from "../../../components/onboarding/diet/DietReadinessSection";
import { MealPreferencesSection } from "../../../components/onboarding/diet/MealPreferencesSection";
import { CookingPreferencesSection } from "../../../components/onboarding/diet/CookingPreferencesSection";
import { HealthHabitsSection } from "../../../components/onboarding/diet/HealthHabitsSection";
import { AllergiesAndRestrictionsSection } from "../../../components/onboarding/diet/AllergiesAndRestrictionsSection";
import { InfoTooltipModal } from "../../../components/onboarding/shared/InfoTooltipModal";
import { ValidationSection } from "../../../components/onboarding/shared/ValidationSection";
import { onboardingStagger } from "./onboardingAnimation";

/** One segment of the live "receipt" line. */
interface ReceiptSegment {
  key: string;
  label: string;
}

/**
 * buildReceipt — reflects choices made so far, one quiet line. Not a field,
 * not validation — the form talking back ("collapse ≠ hide selections" at
 * the whole-screen level).
 */
const buildReceipt = (
  formData: DietPreferencesData,
  mealsCount: number,
): ReceiptSegment[] => {
  const segments: ReceiptSegment[] = [];

  const dietTitle =
    formData.diet_type === "balanced"
      ? "Balanced"
      : DIET_TYPE_OPTIONS.find((o) => o.id === formData.diet_type)?.title;
  if (dietTitle) segments.push({ key: "diet", label: dietTitle });

  segments.push({
    key: "meals",
    label: `${mealsCount} meal${mealsCount === 1 ? "" : "s"} planned`,
  });

  if (formData.cooking_skill_level === "not_applicable") {
    segments.push({ key: "time", label: "No cooking" });
  } else if (formData.cooking_skill_level) {
    segments.push({
      key: "time",
      label: `≤ ${formData.max_prep_time_minutes ?? 30} min`,
    });
  }

  const budgetTitle = BUDGET_LEVELS.find(
    (b) => b.level === formData.budget_level,
  )?.title;
  if (budgetTitle) segments.push({ key: "budget", label: budgetTitle });

  const exclusions =
    formData.allergies.length + formData.restrictions.length;
  if (exclusions > 0) {
    segments.push({
      key: "exclusions",
      label: `${exclusions} excluded`,
    });
  }

  return segments;
};

interface DietPreferencesTabProps {
  data: DietPreferencesData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: DietPreferencesData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<DietPreferencesData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
  /**
   * S1 country selection (display-only) — localizes the food-budget ranges
   * via getBudgetRanges(). Prop-threaded from OnboardingContainer (the store
   * is the runtime SSOT); null → USD default ranges.
   */
  country?: string | null;
}

const DietPreferencesTab: React.FC<DietPreferencesTabProps> = ({
  data,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  isEditingFromReview = false,
  onReturnToReview,
  country = null,
}) => {
  const isSubmittingRef = useRef(false);

  // Match PersonalInfoTab/WorkoutPreferencesTab: block Next/Review while the
  // tab's own data is invalid so invalid data (e.g. all meal toggles off)
  // can never be pushed back to Review silently via the isEditingFromReview
  // shortcut below (audit fix — this tab previously left nextDisabled
  // defaulted to false).
  const isDisabled = !!(validationResult && !validationResult.is_valid);

  const {
    formData,
    tooltipModal,
    showInfoTooltip,
    hideInfoTooltip,
    updateField,
    toggleHealthHabit,
    toggleDietReadiness,
    toggleMealPreference,
    getEnabledMealsCount,
  } = useDietPreferences({
    data,
    validationResult,
    onUpdate,
  });

  const handleNext = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      onUpdate(formData);
    } catch (error) {
      // Exception safety: a synchronous throw from onUpdate must not leave
      // the Next button permanently disabled with no recovery.
      isSubmittingRef.current = false;
      throw error;
    }
    if (isEditingFromReview && onReturnToReview) {
      try {
        onReturnToReview();
      } finally {
        isSubmittingRef.current = false;
      }
    } else {
      setTimeout(() => {
        try {
          onNext(formData);
        } finally {
          isSubmittingRef.current = false;
        }
      }, 100);
    }
  };

  // formData changes on every keystroke/toggle across all 6 Diet sections —
  // buildReceipt was previously called twice per render (accessibilityLabel +
  // visible segments) with no memoization.
  const enabledMealsCount = getEnabledMealsCount();
  const receipt = useMemo(
    () => buildReceipt(formData, enabledMealsCount),
    [formData, enabledMealsCount],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* Info Tooltip Modal — logic unchanged */}
      <InfoTooltipModal
        visible={tooltipModal.visible}
        title={tooltipModal.title}
        description={tooltipModal.description}
        benefits={tooltipModal.benefits}
        onClose={hideInfoTooltip}
      />

      <ScreenScaffold
        question="How do you eat?"
        subtext="Your taste, your rhythm. We'll shape meal plans around how you cook and eat."
        onBack={onBack}
        onNext={handleNext}
        nextLabel={isEditingFromReview ? "Review" : "Next"}
        nextDisabled={isDisabled}
      >
        <View style={styles.sections}>
          {/* Default visible — diet_type (the focal question) */}
          <Animated.View entering={onboardingStagger(0)}>
            <CurrentDietSection
              formData={formData}
              updateField={updateField}
              showInfoTooltip={showInfoTooltip}
              country={country}
            />
          </Animated.View>

          {/* Default visible — meal-enable toggles */}
          <Animated.View entering={onboardingStagger(1)}>
            <MealPreferencesSection
              formData={formData}
              getEnabledMealsCount={getEnabledMealsCount}
              toggleMealPreference={toggleMealPreference}
            />
          </Animated.View>

          {/* Default visible — cooking_skill_level, max_prep_time, budget_level.
              Collapsed inside — cooking_methods (§5). */}
          <Animated.View entering={onboardingStagger(2)}>
            <CookingPreferencesSection
              formData={formData}
              updateField={updateField}
              country={country}
            />
          </Animated.View>

          {/* Live receipt — the visible zone reflected back, one hairline
              and one quiet line, before the collapsed zone begins. */}
          <Animated.View entering={onboardingStagger(3)}>
            <Rule />
            <Text
              style={styles.receipt}
              numberOfLines={2}
              accessibilityLiveRegion="polite"
              accessibilityLabel={receipt.map((s) => s.label).join(", ")}
              testID="diet-setup-receipt"
            >
              {receipt.map(
                (segment, index) => (
                  <React.Fragment key={segment.key}>
                    {index > 0 && (
                      <Text style={styles.receiptSep}>{"  ·  "}</Text>
                    )}
                    {segment.label}
                  </React.Fragment>
                ),
              )}
            </Text>
          </Animated.View>

          {/* Collapsed — Diet readiness (§5) */}
          <Animated.View entering={onboardingStagger(4)}>
            <DietReadinessSection
              formData={formData}
              toggleDietReadiness={toggleDietReadiness}
              showInfoTooltip={showInfoTooltip}
            />
          </Animated.View>

          {/* Collapsed — Allergies & restrictions, with custom entry (§5) */}
          <Animated.View entering={onboardingStagger(5)}>
            <AllergiesAndRestrictionsSection
              formData={formData}
              updateField={updateField}
            />
          </Animated.View>

          {/* Collapsed — Lifestyle habits (§5) */}
          <Animated.View entering={onboardingStagger(6)}>
            <HealthHabitsSection
              formData={formData}
              toggleHealthHabit={toggleHealthHabit}
              showInfoTooltip={showInfoTooltip}
            />
          </Animated.View>
        </View>

        {/* Validation Summary — unchanged logic; sits one sectionGap below
            the last section instead of butting against it. */}
        {validationResult && (
          <View style={styles.validationWrap}>
            <ValidationSection validationResult={validationResult} />
          </View>
        )}
      </ScreenScaffold>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  sections: {
    gap: spacing.sectionGap, // hierarchy from space, not containers
  },
  validationWrap: {
    marginTop: spacing.sectionGap,
  },
  receipt: {
    ...typeScale.body,
    color: tokens.ink,
    marginTop: spacing.m,
  },
  receiptSep: {
    color: tokens.ink3,
  },
});

export default DietPreferencesTab;
