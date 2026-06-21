import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { rf, rh } from "../../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import {
  AnimatedPressable,
  AnimatedSection,
  HeroSection,
} from "../../../components/ui/aurora";
import { gradients } from "../../../theme/gradients";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../../types/onboarding";
import { useWorkoutPreferences } from "../../../hooks/onboarding/useWorkoutPreferences";

// Components
import { InfoTooltipModal } from "../../../components/onboarding/shared/InfoTooltipModal";
import { GoalsSection } from "../../../components/onboarding/workout/GoalsSection";
import { FitnessLevelSection } from "../../../components/onboarding/workout/FitnessLevelSection";
import { PreferencesSection } from "../../../components/onboarding/workout/PreferencesSection";
import { StyleSection } from "../../../components/onboarding/workout/StyleSection";
import { WeightGoalsSection } from "../../../components/onboarding/workout/WeightGoalsSection";
import { ValidationSection } from "../../../components/onboarding/shared/ValidationSection";

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
}

const WorkoutPreferencesTab: React.FC<WorkoutPreferencesTabProps> = ({
  data,
  bodyAnalysisData,
  personalInfoData,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  isAutoSaving = false,
}) => {
  const isSubmittingRef = useRef(false);

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Info Tooltip Modal */}
      <InfoTooltipModal
        visible={tooltipModal.visible}
        title={tooltipModal.title}
        description={tooltipModal.description}
        benefits={tooltipModal.benefits}
        onClose={hideInfoTooltip}
      />

      {/* KeyboardAvoidingView for proper keyboard handling */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: rh(100) }}
        >
          {/* Hero Section */}
          <HeroSection
            image={{
              uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
            }}
            overlayGradient={gradients.overlay.dark}
            contentPosition="center"
            height={180}
          >
            <Text style={styles.title} numberOfLines={2}>
              Let's create your fitness profile
            </Text>
            <Text style={styles.subtitle} numberOfLines={3}>
              Tell us about your goals, current fitness level, and workout
              preferences
            </Text>

            {/* Auto-save Indicator */}
            {isAutoSaving && (
              <View style={styles.autoSaveIndicator}>
                <Ionicons
                  name="save-outline"
                  size={rf(16)}
                  color={colors.success}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.autoSaveText}>Saving...</Text>
              </View>
            )}
          </HeroSection>

          {/* Form Sections */}
          <View style={styles.content}>
            <AnimatedSection delay={0}>
              <GoalsSection
                formData={formData}
                bodyAnalysisData={bodyAnalysisData}
                toggleGoal={toggleGoal}
                updateField={updateField}
                getFieldError={getFieldError}
                hasFieldError={hasFieldError}
                showInfoTooltip={showInfoTooltip}
              />
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <FitnessLevelSection
                formData={formData}
                updateField={updateField}
                intensityRecommendation={intensityRecommendation}
                calculateRecommendedWorkoutTypes={
                  calculateRecommendedWorkoutTypes
                }
              />
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <PreferencesSection
                formData={formData}
                updateField={updateField}
                toggleWorkoutTime={toggleWorkoutTime}
                showInfoTooltip={showInfoTooltip}
              />
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <StyleSection
                formData={formData}
                updateField={updateField}
                showInfoTooltip={showInfoTooltip}
              />
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <WeightGoalsSection
                bodyAnalysisData={bodyAnalysisData}
                formData={formData}
              />
            </AnimatedSection>
          </View>

          {/* Validation Summary */}
          <ValidationSection validationResult={validationResult} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <AnimatedPressable
            style={styles.backButtonCompact}
            onPress={onBack}
            scaleValue={0.96}
          >
            <Ionicons
              name="chevron-back"
              size={rf(18)}
              color={colors.primary}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.nextButtonCompact}
            onPress={() => {
              if (isSubmittingRef.current) return;
              isSubmittingRef.current = true;
              try {
                console.warn('\n========== 🏋️ TAB 4: WORKOUT PREFERENCES ==========');
                console.warn('primary_goals              :', formData.primary_goals);
                console.warn('activity_level             :', formData.activity_level);
                console.warn('intensity                  :', formData.intensity);
                console.warn('workout_experience_years   :', formData.workout_experience_years);
                console.warn('workout_frequency_per_week :', formData.workout_frequency_per_week);
                console.warn('can_do_pushups             :', formData.can_do_pushups);
                console.warn('can_run_minutes            :', formData.can_run_minutes);
                console.warn('flexibility_level          :', formData.flexibility_level);
                console.warn('location                   :', formData.location);
                console.warn('equipment                  :', formData.equipment);
                console.warn('workout_types              :', formData.workout_types);
                console.warn('time_preference            :', formData.time_preference);
                console.warn('preferred_workout_times    :', formData.preferred_workout_times);
                console.warn('enjoys_cardio              :', formData.enjoys_cardio);
                console.warn('enjoys_strength_training   :', formData.enjoys_strength_training);
                console.warn('enjoys_group_classes       :', formData.enjoys_group_classes);
                console.warn('prefers_outdoor_activities :', formData.prefers_outdoor_activities);
                console.warn('needs_motivation           :', formData.needs_motivation);
                console.warn('prefers_variety            :', formData.prefers_variety);
                console.warn('weekly_weight_loss_goal    :', formData.weekly_weight_loss_goal);
                console.warn('=================================================\n');
                onUpdate(formData);
                setTimeout(() => {
                  onNext(formData);
                  isSubmittingRef.current = false;
                }, 100);
              } finally {
              }
            }}
            scaleValue={0.96}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={rf(18)} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.md,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: fontSize.md * 1.5,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  autoSaveText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "transparent",
    elevation: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  backButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    minHeight: 52,
  },
  backButtonText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
    lineHeight: rf(18),
  },
  nextButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    gap: 4,
    minHeight: 52,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
});

export default WorkoutPreferencesTab;
