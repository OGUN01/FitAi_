import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  tokens,
  Pill,
  CollapsibleSection,
  ScreenScaffold,
} from "../../../components/onboarding/fresh";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../../types/onboarding";
import { useWorkoutPreferences } from "../../../hooks/onboarding/useWorkoutPreferences";

// Section components
import { InfoTooltipModal } from "../../../components/onboarding/shared/InfoTooltipModal";
import { GoalsSection } from "../../../components/onboarding/workout/GoalsSection";
import { FitnessLevelSection } from "../../../components/onboarding/workout/FitnessLevelSection";
import { PreferencesSection } from "../../../components/onboarding/workout/PreferencesSection";
// NOTE: StyleSection ("What you enjoy") was removed from the UI per user
// feedback (Image #14) — the enjoyment booleans are now derived from
// primary_goals inside useWorkoutPreferences, so AI generation is unchanged.
import { WeightGoalsSection } from "../../../components/onboarding/workout/WeightGoalsSection";
import { ValidationSection } from "../../../components/onboarding/shared/ValidationSection";
import {
  EQUIPMENT_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
} from "./WorkoutPreferencesConstants";
import { onboardingStagger } from "./onboardingAnimation";

interface WorkoutPreferencesTabProps {
  data: WorkoutPreferencesData | null;
  bodyAnalysisData?: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: WorkoutPreferencesData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<WorkoutPreferencesData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
  /** Optional S2 body-type for body-type-aware goal suggestions (Phase 2c wire). */
  aiBodyType?: string;
}

/** Staggered mount wrapper — one quiet FadeInDown per section, shared rhythm
 * (onboardingStagger) with every other onboarding tab. */
const Mount: React.FC<{ index: number; children: React.ReactNode }> = ({
  index,
  children,
}) => (
  <Animated.View
    entering={onboardingStagger(index)}
    style={index > 0 ? styles.sectionGap : undefined}
  >
    {children}
  </Animated.View>
);

const WorkoutPreferencesTab: React.FC<WorkoutPreferencesTabProps> = ({
  data,
  bodyAnalysisData,
  personalInfoData,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  isEditingFromReview = false,
  onReturnToReview,
}) => {
  const isSubmittingRef = useRef(false);

  // Progressive-disclosure collapse state (local UI only; fields still save).
  const [assessCollapsed, setAssessCollapsed] = useState(true);
  const [equipmentCollapsed, setEquipmentCollapsed] = useState(true);
  const [typesCollapsed, setTypesCollapsed] = useState(true);

  const {
    formData,
    tooltipModal,
    intensityRecommendation,
    updateField,
    toggleGoal,
    toggleWorkoutTime,
    setWorkoutFrequency,
    toggleWorkoutDay,
    showInfoTooltip,
    hideInfoTooltip,
    calculateRecommendedWorkoutTypes,
    getFieldError,
    hasFieldError,
  } = useWorkoutPreferences({
    data,
    bodyAnalysisData,
    personalInfoData,
    validationResult,
    onUpdate,
  });

  const toggleArrayField = (
    field: "equipment" | "workout_types",
    id: string,
  ) => {
    const current = formData[field];
    const next = current.includes(id)
      ? current.filter((x: string) => x !== id)
      : [...current, id];
    updateField(field, next as WorkoutPreferencesData["equipment"]);
  };

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

  const isDisabled = !!(validationResult && !validationResult.is_valid);

  const recommendedTypeIds = calculateRecommendedWorkoutTypes();
  const recommendedTypeLabels = WORKOUT_TYPE_OPTIONS.filter((t) =>
    recommendedTypeIds.includes(t.value),
  ).map((t) => t.label);

  // Live collapsed summaries — headers reflect what's already chosen, so the
  // eye always lands on state, not static helper copy.
  //
  // Smart equipment logic (user feedback, Image #14): the equipment picker is
  // only shown when it adds information — location "gym" hides it entirely
  // (full gym access is assumed internally), "home" shows a home-gear picker,
  // "both" shows gym staples as assumed + the user's home gear on top.
  const isGymOnly = formData.location === "gym";
  const isBoth = formData.location === "both";
  const equipmentLabels = EQUIPMENT_OPTIONS.filter((o) =>
    formData.equipment.includes(o.value),
  ).map((o) => o.label);
  const equipmentTitle = isBoth ? "Home + gym gear" : "Home equipment";
  const equipmentSubtitle =
    equipmentLabels.length > 0
      ? `${equipmentLabels.length} selected — ${equipmentLabels
          .slice(0, 3)
          .join(", ")}${
          equipmentLabels.length > 3 ? ` +${equipmentLabels.length - 3}` : ""
        }`
      : isBoth
        ? "Gym staples included — add your home gear"
        : "Gear you have at home";

  const typeLabels = WORKOUT_TYPE_OPTIONS.filter((t) =>
    formData.workout_types.includes(t.value),
  ).map((t) => t.label);
  const typesSubtitle =
    typeLabels.length > 0
      ? `${typeLabels.length} selected — ${typeLabels.slice(0, 3).join(", ")}${
          typeLabels.length > 3 ? ` +${typeLabels.length - 3}` : ""
        }`
      : recommendedTypeLabels.length > 0
        ? `Recommended: ${recommendedTypeLabels.slice(0, 2).join(", ")}`
        : "Styles you enjoy or want to try";

  return (
    <>
      {/* Info Tooltip Modal */}
      <InfoTooltipModal
        visible={tooltipModal.visible}
        title={tooltipModal.title}
        description={tooltipModal.description}
        benefits={tooltipModal.benefits}
        onClose={hideInfoTooltip}
      />

      <ScreenScaffold
        question="How do you want to train?"
        subtext="Your goals, intensity, and rhythm — your plan starts here."
        onBack={onBack}
        onNext={handleNext}
        nextLabel={isEditingFromReview ? "Review" : "Next"}
        nextDisabled={isDisabled}
      >
        {/* Visible — primary goals (the focal input) */}
        <Mount index={0}>
          <GoalsSection
            formData={formData}
            bodyAnalysisData={bodyAnalysisData}
            toggleGoal={toggleGoal}
            updateField={updateField}
            getFieldError={getFieldError}
            hasFieldError={hasFieldError}
            showInfoTooltip={showInfoTooltip}
          />
        </Mount>

        {/* Visible — training setup (location / intensity / duration / frequency + days / times) */}
        <Mount index={1}>
          <PreferencesSection
            formData={formData}
            updateField={updateField}
            toggleWorkoutTime={toggleWorkoutTime}
            setWorkoutFrequency={setWorkoutFrequency}
            toggleWorkoutDay={toggleWorkoutDay}
            showInfoTooltip={showInfoTooltip}
            intensityRecommendation={intensityRecommendation}
          />
        </Mount>

        {/* Collapsed — "Assess me" */}
        <Mount index={2}>
          <FitnessLevelSection
            formData={formData}
            updateField={updateField}
            collapsed={assessCollapsed}
            onToggleCollapse={() => setAssessCollapsed((v) => !v)}
          />
        </Mount>

        {/* Collapsed — "Equipment" (hidden for gym-only: full access assumed) */}
        {!isGymOnly && (
          <Mount index={3}>
            <CollapsibleSection
              title={equipmentTitle}
              subtitle={equipmentSubtitle}
              expanded={!equipmentCollapsed}
              onToggle={() => setEquipmentCollapsed((v) => !v)}
              testID="equipment-section"
            >
              <View style={styles.helpRow}>
                <Text style={styles.caption}>
                  {isBoth
                    ? "Standard gym equipment is assumed — tap to add your home gear"
                    : "Tap to toggle the gear you have at home"}
                </Text>
                <Pressable
                  onPress={() =>
                    showInfoTooltip(
                      "Equipment",
                      isBoth
                        ? "You train at the gym and at home. Standard gym equipment is already included — add anything you also have at home."
                        : "The gear you can use at home. Your plan only uses equipment you select.",
                    )
                  }
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  accessibilityLabel="About equipment"
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={tokens.ink3}
                  />
                </Pressable>
              </View>
              <View style={styles.pillGrid} testID="equipment-chip-picker">
                {EQUIPMENT_OPTIONS.map((option) => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    icon={option.iconName as keyof typeof Ionicons.glyphMap}
                    selected={formData.equipment.includes(option.value)}
                    onPress={() => toggleArrayField("equipment", option.value)}
                    testID={`equipment-pill-${option.value}`}
                  />
                ))}
              </View>
            </CollapsibleSection>
          </Mount>
        )}

        {/* Collapsed — "Workout types" */}
        <Mount index={4}>
          <CollapsibleSection
            title="Workout types"
            subtitle={typesSubtitle}
            expanded={!typesCollapsed}
            onToggle={() => setTypesCollapsed((v) => !v)}
            testID="workout-types-section"
          >
            <View style={styles.helpRow}>
              {recommendedTypeLabels.length > 0 ? (
                <Text
                  style={styles.recoText}
                  testID="workout-types-suggestions"
                >
                  Recommended for you —{" "}
                  <Text style={styles.recoEmphasis}>
                    {recommendedTypeLabels.join(", ")}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.caption}>
                  Tap to toggle the styles you like
                </Text>
              )}
              <Pressable
                onPress={() =>
                  showInfoTooltip(
                    "Workout types",
                    "Training styles. Recommended types are listed above the grid.",
                  )
                }
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityLabel="About workout types"
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={tokens.ink3}
                />
              </Pressable>
            </View>
            <View style={styles.pillGrid} testID="workout-types-chip-picker">
              {WORKOUT_TYPE_OPTIONS.map((option) => (
                <Pill
                  key={option.value}
                  label={option.label}
                  icon={option.iconName as keyof typeof Ionicons.glyphMap}
                  selected={formData.workout_types.includes(option.value)}
                  onPress={() => toggleArrayField("workout_types", option.value)}
                  testID={`workout-type-pill-${option.value}`}
                />
              ))}
            </View>
          </CollapsibleSection>
        </Mount>

        {/* "What you enjoy" removed (user feedback, Image #14) — enjoyment
            booleans are derived from primary_goals in useWorkoutPreferences so
            AI generation keeps working unchanged. */}

        {/* Read-only weight goal summary (from Body tab) */}
        <Mount index={6}>
          <WeightGoalsSection
            bodyAnalysisData={bodyAnalysisData}
            formData={formData}
          />
        </Mount>

        {/* Validation summary (existing shared component) */}
        <ValidationSection validationResult={validationResult} />
      </ScreenScaffold>
    </>
  );
};

const styles = StyleSheet.create({
  sectionGap: {
    marginTop: 36,
  },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caption: {
    flex: 1,
    marginRight: 12,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  recoText: {
    flex: 1,
    marginRight: 12,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  recoEmphasis: {
    fontFamily: "Manrope_500Medium",
    color: tokens.ink2,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
});

export default WorkoutPreferencesTab;
