import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
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
import { StyleSection } from "../../../components/onboarding/workout/StyleSection";
import { WeightGoalsSection } from "../../../components/onboarding/workout/WeightGoalsSection";
import { ValidationSection } from "../../../components/onboarding/shared/ValidationSection";
import {
  EQUIPMENT_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
} from "./WorkoutPreferencesConstants";

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

/** Staggered mount wrapper — one quiet FadeInDown per section. */
const Mount: React.FC<{ index: number; children: React.ReactNode }> = ({
  index,
  children,
}) => (
  <Animated.View
    entering={FadeInDown.duration(280).delay(60 + index * 50)}
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
  isAutoSaving = false,
  isEditingFromReview = false,
  onReturnToReview,
}) => {
  const isSubmittingRef = useRef(false);

  // Progressive-disclosure collapse state (local UI only; fields still save).
  const [assessCollapsed, setAssessCollapsed] = useState(true);
  const [equipmentCollapsed, setEquipmentCollapsed] = useState(true);
  const [typesCollapsed, setTypesCollapsed] = useState(true);
  const [enjoyCollapsed, setEnjoyCollapsed] = useState(true);

  const {
    formData,
    tooltipModal,
    intensityRecommendation,
    updateField,
    toggleGoal,
    toggleWorkoutTime,
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
      if (isEditingFromReview && onReturnToReview) {
        onReturnToReview();
      } else {
        setTimeout(() => {
          onNext(formData);
        }, 100);
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const isDisabled = !!(validationResult && !validationResult.is_valid);

  const recommendedTypeIds = calculateRecommendedWorkoutTypes();
  const recommendedTypeLabels = WORKOUT_TYPE_OPTIONS.filter((t) =>
    recommendedTypeIds.includes(t.value),
  ).map((t) => t.label);

  // Live collapsed summaries — headers reflect what's already chosen, so the
  // eye always lands on state, not static helper copy.
  const equipmentLabels = EQUIPMENT_OPTIONS.filter((o) =>
    formData.equipment.includes(o.value),
  ).map((o) => o.label);
  const equipmentSubtitle =
    equipmentLabels.length > 0
      ? `${equipmentLabels.length} selected — ${equipmentLabels
          .slice(0, 3)
          .join(", ")}${
          equipmentLabels.length > 3 ? ` +${equipmentLabels.length - 3}` : ""
        }`
      : "Gear you have access to";

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
        footerNote={
          isAutoSaving ? (
            <Text style={styles.autoSaveText} testID="auto-save-indicator">
              Saving…
            </Text>
          ) : undefined
        }
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

        {/* Visible — training setup (location / intensity / duration / frequency / times) */}
        <Mount index={1}>
          <PreferencesSection
            formData={formData}
            updateField={updateField}
            toggleWorkoutTime={toggleWorkoutTime}
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

        {/* Collapsed — "Equipment" */}
        <Mount index={3}>
          <CollapsibleSection
            title="Equipment"
            subtitle={equipmentSubtitle}
            expanded={!equipmentCollapsed}
            onToggle={() => setEquipmentCollapsed((v) => !v)}
            testID="equipment-section"
          >
            <View style={styles.helpRow}>
              <Text style={styles.caption}>
                Tap to toggle what you have access to
              </Text>
              <Pressable
                onPress={() =>
                  showInfoTooltip(
                    "Equipment",
                    "The gear you can use. Gym selection auto-fills standard equipment.",
                  )
                }
                hitSlop={8}
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
                hitSlop={8}
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

        {/* Collapsed — "What you enjoy" */}
        <Mount index={5}>
          <StyleSection
            formData={formData}
            updateField={updateField}
            showInfoTooltip={showInfoTooltip}
            collapsed={enjoyCollapsed}
            onToggleCollapse={() => setEnjoyCollapsed((v) => !v)}
          />
        </Mount>

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
  autoSaveText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
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
