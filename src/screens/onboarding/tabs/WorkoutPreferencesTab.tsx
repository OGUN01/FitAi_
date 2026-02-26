import React from "react";
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
import { rf } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
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
          contentContainerStyle={{ paddingBottom: 100 }}
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
            <Text style={styles.title} numberOfLines={2}>Let's create your fitness profile</Text>
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
                  color={ResponsiveTheme.colors.success}
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
                personalInfoData={personalInfoData}
                bodyAnalysisData={bodyAnalysisData}
                toggleGoal={toggleGoal}
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
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.nextButtonCompact}
            onPress={() => {
              onUpdate(formData);
              setTimeout(() => {
                onNext(formData);
              }, 100);
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
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: ResponsiveTheme.fontSize.md * 1.5,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
  },
  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: `${ResponsiveTheme.colors.success}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  autoSaveText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  content: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    backgroundColor: "transparent",
    elevation: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ResponsiveTheme.spacing.md,
  },
  backButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    gap: 4,
    minHeight: 52,
  },
  backButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.primary,
    lineHeight: rf(18),
  },
  nextButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.primary,
    gap: 4,
    minHeight: 52,
  },
  nextButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: "#FFFFFF",
  },
});

export default WorkoutPreferencesTab;
