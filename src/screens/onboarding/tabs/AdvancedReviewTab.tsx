import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import {
  Button,
  InfoTooltip,
  CircularClock,
  ColorCodedZones,
  calculateHeartRateZones,
  AnimatedNumber,
  GradientBarChart,
  WeightProjectionChart,
  LargeProgressRing,
  type BarData,
} from "../../../components/ui";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { AnimatedSection } from "../../../components/ui/aurora/AnimatedSection";
import { HeroSection, ProgressRing } from "../../../components/ui/aurora";
import { gradients, toLinearGradientProps } from "../../../theme/gradients";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../../types/onboarding";
import {
  HealthCalculationEngine,
  MetabolicCalculations,
} from "../../../utils/healthCalculations";
import {
  detectClimate,
  waterCalculator,
  type ActivityLevel,
  type ClimateType,
} from "../../../utils/healthCalculations/index";
import {
  ValidationEngine,
  ValidationResults,
} from "../../../services/validationEngine";
import { ErrorCard } from "../../../components/onboarding/ErrorCard";
import { WarningCard } from "../../../components/onboarding/WarningCard";
import {
  AdjustmentWizard,
  Alternative,
} from "../../../components/onboarding/AdjustmentWizard";
import { METRIC_DESCRIPTIONS } from "../../../constants/metricDescriptions";

// ============================================================================
// TYPES
// ============================================================================

interface AdvancedReviewTabProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  onUpdate: (data: Partial<AdvancedReviewData>) => void;
  onUpdateBodyAnalysis?: (data: Partial<BodyAnalysisData>) => void;
  onUpdateWorkoutPreferences?: (data: Partial<WorkoutPreferencesData>) => void;
  onSaveToDatabase?: () => Promise<boolean>; // NEW: For immediate database persistence
  onNavigateToTab?: (tabNumber: number) => void;
  isComplete: boolean;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

// ============================================================================
// DATA PLACEHOLDER COMPONENT
// ============================================================================

interface DataPlaceholderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

const DataPlaceholder: React.FC<DataPlaceholderProps> = ({
  icon,
  title,
  message,
  actionText,
  onAction,
}) => (
  <View style={placeholderStyles.container}>
    <View style={placeholderStyles.iconContainer}>
      <Ionicons
        name={icon}
        size={rf(32)}
        color={ResponsiveTheme.colors.textMuted}
      />
    </View>
    <Text style={placeholderStyles.title}>{title}</Text>
    <Text style={placeholderStyles.message}>{message}</Text>
    {actionText && onAction && (
      <AnimatedPressable
        onPress={onAction}
        style={placeholderStyles.actionButton}
      >
        <Text style={placeholderStyles.actionText}>{actionText}</Text>
      </AnimatedPressable>
    )}
  </View>
);

const placeholderStyles = StyleSheet.create({
  container: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: rp(24),
    backgroundColor: `${ResponsiveTheme.colors.surface}40`,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.border}30`,
    borderStyle: "dashed",
  },
  iconContainer: {
    width: rf(56),
    height: rf(56),
    borderRadius: rf(28),
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: rp(12),
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(4),
    textAlign: "center",
  },
  message: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(18),
    maxWidth: rw(280),
  },
  actionButton: {
    marginTop: rp(12),
    paddingVertical: rp(8),
    paddingHorizontal: rp(16),
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  actionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
  },
});

// Helper to check if a value is valid (not NaN, null, undefined, or 0 for certain metrics)
const isValidMetric = (value: any, allowZero = false): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "number" && !Number.isFinite(value)) return false;
  if (!allowZero && value === 0) return false;
  return true;
};

// ============================================================================
// COMPONENT
// ============================================================================

const AdvancedReviewTab: React.FC<AdvancedReviewTabProps> = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  advancedReview,
  onNext,
  onBack,
  onComplete,
  onUpdate,
  onUpdateBodyAnalysis,
  onUpdateWorkoutPreferences,
  onSaveToDatabase, // NEW: For immediate database persistence
  onNavigateToTab,
  isComplete,
  isLoading = false,
  isAutoSaving = false,
}) => {
  // No longer creating separate state instances - using props from parent

  const [calculatedData, setCalculatedData] =
    useState<AdvancedReviewData | null>(null);
  const [validationResults, setValidationResults] =
    useState<ValidationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [showAdjustmentWizard, setShowAdjustmentWizard] = useState(false);
  const [currentError, setCurrentError] = useState<any | null>(null);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Calculate all metrics when component mounts or data changes
  useEffect(() => {
    if (personalInfo && dietPreferences && bodyAnalysis && workoutPreferences) {
      performCalculations();
    }
  }, [personalInfo, dietPreferences, bodyAnalysis, workoutPreferences]);

  // Reset acknowledgment when warnings change
  useEffect(() => {
    setWarningsAcknowledged(false);
  }, [validationResults?.warnings]);

  // Helper functions for scoring
  const getScoreColor = (score: number) => {
    if (score >= 80) return ResponsiveTheme.colors.success;
    if (score >= 60) return ResponsiveTheme.colors.warning;
    return ResponsiveTheme.colors.error;
  };

  const getScoreCategory = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Improvement";
  };

  const performCalculations = async () => {
    if (
      !personalInfo ||
      !dietPreferences ||
      !bodyAnalysis ||
      !workoutPreferences
    ) {
      setCalculationError("Missing required data for calculations");
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      console.log(
        "[CALC] AdvancedReviewTab: Running validation and calculations...",
      );

      // Use ValidationEngine for comprehensive validation
      let validationResults;
      try {
        validationResults = ValidationEngine.validateUserPlan(
          personalInfo,
          dietPreferences,
          bodyAnalysis,
          workoutPreferences,
        );
        setValidationResults(validationResults);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to validate user plan";
        console.error("[ERROR] AdvancedReviewTab: Validation error:", error);
        setCalculationError(`Validation failed: ${message}`);
        return;
      }

      // Run legacy calculations for additional metrics
      let calculations;
      try {
        calculations = HealthCalculationEngine.calculateAllMetrics(
          personalInfo,
          dietPreferences,
          bodyAnalysis,
          workoutPreferences,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to calculate health metrics";
        console.error(
          "[ERROR] AdvancedReviewTab: Legacy calculations error:",
          error,
        );
        setCalculationError(`Calculation failed: ${message}`);
        return;
      }

      // Merge validation metrics with legacy calculations
      let completionMetrics;
      try {
        completionMetrics = calculateCompletionMetrics();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to calculate completion metrics";
        console.error(
          "[ERROR] AdvancedReviewTab: Completion metrics error:",
          error,
        );
        // Use defaults if completion metrics fail
        completionMetrics = {
          data_completeness_percentage: 0,
          reliability_score: 0,
          personalization_level: 0,
        };
      }

      // Calculate additional metrics using climate-adaptive calculations
      let waterIntake, fiberIntake, dietReadinessScore;
      let detectedClimate: ClimateType = "temperate";
      try {
        // CRITICAL: Use climate-adaptive water calculation based on user's location
        const climateResult = detectClimate(
          personalInfo.country || "IN",
          personalInfo.state,
        );
        detectedClimate = climateResult.climate;

        // Map activity level to the expected type
        const activityLevel: ActivityLevel =
          (workoutPreferences.activity_level as ActivityLevel) || "moderate";

        // Calculate climate-adjusted water intake
        waterIntake = waterCalculator.calculate(
          bodyAnalysis.current_weight_kg,
          activityLevel,
          detectedClimate,
        );

        console.log("[CALC] Climate-adaptive water calculation:", {
          country: personalInfo.country,
          state: personalInfo.state,
          detectedClimate,
          activityLevel,
          weight: bodyAnalysis.current_weight_kg,
          waterIntakeML: waterIntake,
        });

        fiberIntake = MetabolicCalculations.calculateFiber(
          validationResults.calculatedMetrics.targetCalories,
        );
        dietReadinessScore =
          MetabolicCalculations.calculateDietReadinessScore(dietPreferences);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to calculate metabolic metrics";
        console.error(
          "[ERROR] AdvancedReviewTab: Metabolic calculations error:",
          error,
        );
        // FALLBACK REMOVED: Throw error instead of using silent defaults
        // This makes data flow issues visible
        throw new Error(
          `Water/fiber calculation failed: ${message}. Please ensure all required data is provided.`,
        );
      }

      const finalCalculations: AdvancedReviewData = {
        ...calculations,
        ...completionMetrics,
        // Override with validation engine results (more accurate)
        calculated_bmr: validationResults.calculatedMetrics.bmr,
        calculated_tdee: validationResults.calculatedMetrics.tdee,
        daily_calories: validationResults.calculatedMetrics.targetCalories,
        daily_protein_g: validationResults.calculatedMetrics.protein,
        daily_carbs_g: validationResults.calculatedMetrics.carbs,
        daily_fat_g: validationResults.calculatedMetrics.fat,
        daily_water_ml: waterIntake,
        daily_fiber_g: fiberIntake,
        weekly_weight_loss_rate: validationResults.calculatedMetrics.weeklyRate,
        estimated_timeline_weeks: validationResults.calculatedMetrics.timeline,
        diet_readiness_score: dietReadinessScore,
        // Store detected climate for transparency and debugging
        detected_climate: detectedClimate,
        // Add validation results for storage
        validation_status: validationResults.hasErrors
          ? "blocked"
          : validationResults.hasWarnings
            ? "warnings"
            : "passed",
        validation_errors:
          validationResults.errors.length > 0
            ? validationResults.errors
            : undefined,
        validation_warnings:
          validationResults.warnings.length > 0
            ? validationResults.warnings
            : undefined,
        refeed_schedule: validationResults.adjustments?.refeedSchedule,
        medical_adjustments: validationResults.adjustments?.medicalNotes,
      } as AdvancedReviewData;

      setCalculatedData(finalCalculations);
      onUpdate(finalCalculations);

      console.log(
        "[SUCCESS] AdvancedReviewTab: Validation and calculations completed",
      );
      console.log("  - Can Proceed:", validationResults.canProceed);
      console.log("  - Errors:", validationResults.errors.length);
      console.log("  - Warnings:", validationResults.warnings.length);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during calculations";
      console.error(
        "[ERROR] AdvancedReviewTab: Critical calculation error:",
        error,
      );
      setCalculationError(
        `Failed to calculate health metrics: ${message}. Please try again.`,
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateCompletionMetrics = () => {
    let totalFields = 0;
    let completedFields = 0;

    // Count personal info completion
    if (personalInfo) {
      const requiredPersonal = [
        "first_name",
        "last_name",
        "age",
        "gender",
        "country",
        "state",
        "wake_time",
        "sleep_time",
      ];
      totalFields += requiredPersonal.length;
      completedFields += requiredPersonal.filter(
        (field) => personalInfo[field as keyof PersonalInfoData],
      ).length;
    }

    // Count diet preferences completion
    if (dietPreferences) {
      totalFields += 35; // Total diet preference fields
      completedFields += Object.values(dietPreferences).filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== "" &&
          (Array.isArray(value) ? value.length > 0 : true),
      ).length;
    }

    // Count body analysis completion
    if (bodyAnalysis) {
      const requiredBody = [
        "height_cm",
        "current_weight_kg",
        "target_weight_kg",
        "target_timeline_weeks",
      ];
      const optionalBody = [
        "body_fat_percentage",
        "waist_cm",
        "hip_cm",
        "front_photo_url",
        "medical_conditions",
      ];
      totalFields += requiredBody.length + optionalBody.length;

      completedFields += requiredBody.filter(
        (field) => bodyAnalysis[field as keyof BodyAnalysisData],
      ).length;
      completedFields += optionalBody.filter((field) => {
        const value = bodyAnalysis[field as keyof BodyAnalysisData];
        return Array.isArray(value)
          ? value.length > 0
          : value !== null && value !== undefined;
      }).length;
    }

    // Count workout preferences completion
    if (workoutPreferences) {
      totalFields += 24; // Total workout preference fields
      completedFields += Object.values(workoutPreferences).filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== "" &&
          (Array.isArray(value) ? value.length > 0 : true),
      ).length;
    }

    const dataCompletenessPercentage = Math.round(
      (completedFields / totalFields) * 100,
    );
    const reliabilityScore = calculateReliabilityScore();
    const personalizationLevel = Math.min(
      100,
      Math.round(completedFields * 1.2),
    ); // Boost for comprehensive data

    return {
      data_completeness_percentage: dataCompletenessPercentage,
      reliability_score: reliabilityScore,
      personalization_level: personalizationLevel,
    };
  };

  const calculateReliabilityScore = (): number => {
    let score = 100;

    // Reduce score for missing critical data
    if (!bodyAnalysis?.height_cm || !bodyAnalysis?.current_weight_kg)
      score -= 20;
    if (!workoutPreferences?.primary_goals?.length) score -= 15;

    // Reduce score for unrealistic goals
    if (
      bodyAnalysis &&
      bodyAnalysis.current_weight_kg &&
      bodyAnalysis.target_weight_kg &&
      bodyAnalysis.target_timeline_weeks
    ) {
      const weeklyRate =
        Math.abs(
          bodyAnalysis.current_weight_kg - bodyAnalysis.target_weight_kg,
        ) / bodyAnalysis.target_timeline_weeks;
      if (weeklyRate > 1.5) score -= 25; // Very unrealistic
      if (weeklyRate > 1) score -= 10; // Slightly unrealistic
    }

    return Math.max(0, score);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDataSummary = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons
            name="document-text-outline"
            size={rf(18)}
            color={ResponsiveTheme.colors.primary}
            style={styles.sectionTitleIcon}
          />
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Data Summary
          </Text>
        </View>
      </View>

      {/* Horizontal Scrollable Cards */}
      <View style={styles.summaryScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryScrollContent}
          decelerationRate="fast"
          snapToInterval={rw(130) + rw(12)}
          snapToAlignment="start"
        >
          {/* Personal Info Card */}
          <AnimatedPressable
            onPress={() => onNavigateToTab?.(1)}
            scaleValue={0.97}
            style={styles.summaryScrollCard}
          >
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
              style={styles.summaryScrollCardInner}
            >
              <View style={styles.summaryScrollHeader}>
                <View style={styles.summaryScrollIconBg}>
                  <Ionicons
                    name="person"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.primary}
                  />
                </View>
                <Ionicons
                  name="create-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.summaryScrollTitle}>Personal Info</Text>
              <Text style={styles.summaryScrollValue} numberOfLines={1}>
                {personalInfo?.first_name} {personalInfo?.last_name}
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                {personalInfo?.age}y • {personalInfo?.gender}
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                {personalInfo?.country}
              </Text>
            </GlassCard>
          </AnimatedPressable>

          {/* Diet Card */}
          <AnimatedPressable
            onPress={() => onNavigateToTab?.(2)}
            scaleValue={0.97}
            style={styles.summaryScrollCard}
          >
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
              style={styles.summaryScrollCardInner}
            >
              <View style={styles.summaryScrollHeader}>
                <View
                  style={[
                    styles.summaryScrollIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.success}20` },
                  ]}
                >
                  <Ionicons
                    name="restaurant"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.success}
                  />
                </View>
                <Ionicons
                  name="create-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.summaryScrollTitle}>Diet</Text>
              <Text style={styles.summaryScrollValue} numberOfLines={1}>
                {dietPreferences?.diet_type}
              </Text>
              <View style={styles.summaryScrollMeals}>
                <View style={styles.summaryMealBadge}>
                  <Ionicons
                    name="sunny"
                    size={rf(10)}
                    color={
                      dietPreferences?.breakfast_enabled
                        ? ResponsiveTheme.colors.warning
                        : ResponsiveTheme.colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.summaryMealText,
                      !dietPreferences?.breakfast_enabled &&
                        styles.summaryMealTextDisabled,
                    ]}
                  >
                    B
                  </Text>
                </View>
                <View style={styles.summaryMealBadge}>
                  <Ionicons
                    name="partly-sunny"
                    size={rf(10)}
                    color={
                      dietPreferences?.lunch_enabled
                        ? ResponsiveTheme.colors.success
                        : ResponsiveTheme.colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.summaryMealText,
                      !dietPreferences?.lunch_enabled &&
                        styles.summaryMealTextDisabled,
                    ]}
                  >
                    L
                  </Text>
                </View>
                <View style={styles.summaryMealBadge}>
                  <Ionicons
                    name="moon"
                    size={rf(10)}
                    color={
                      dietPreferences?.dinner_enabled
                        ? ResponsiveTheme.colors.primary
                        : ResponsiveTheme.colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.summaryMealText,
                      !dietPreferences?.dinner_enabled &&
                        styles.summaryMealTextDisabled,
                    ]}
                  >
                    D
                  </Text>
                </View>
              </View>
            </GlassCard>
          </AnimatedPressable>

          {/* Body Analysis Card */}
          <AnimatedPressable
            onPress={() => onNavigateToTab?.(3)}
            scaleValue={0.97}
            style={styles.summaryScrollCard}
          >
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
              style={styles.summaryScrollCardInner}
            >
              <View style={styles.summaryScrollHeader}>
                <View
                  style={[
                    styles.summaryScrollIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.warning}20` },
                  ]}
                >
                  <Ionicons
                    name="body"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.warning}
                  />
                </View>
                <Ionicons
                  name="create-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.summaryScrollTitle}>Body Analysis</Text>
              <Text style={styles.summaryScrollValue} numberOfLines={1}>
                {bodyAnalysis?.current_weight_kg}kg →{" "}
                {bodyAnalysis?.target_weight_kg}kg
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                BMI: {calculatedData?.calculated_bmi?.toFixed(1)}
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                {bodyAnalysis?.ai_body_type || "Not analyzed"}
              </Text>
            </GlassCard>
          </AnimatedPressable>

          {/* Workout Card */}
          <AnimatedPressable
            onPress={() => onNavigateToTab?.(4)}
            scaleValue={0.97}
            style={styles.summaryScrollCard}
          >
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
              style={styles.summaryScrollCardInner}
            >
              <View style={styles.summaryScrollHeader}>
                <View
                  style={[
                    styles.summaryScrollIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.error}20` },
                  ]}
                >
                  <Ionicons
                    name="barbell"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.error}
                  />
                </View>
                <Ionicons
                  name="create-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.summaryScrollTitle}>Workout</Text>
              <Text style={styles.summaryScrollValue} numberOfLines={1}>
                {workoutPreferences?.intensity}
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                {workoutPreferences?.location}
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                {workoutPreferences?.primary_goals?.length || 0} goals
              </Text>
            </GlassCard>
          </AnimatedPressable>
        </ScrollView>
      </View>
      <View style={styles.sectionBottomPadSmall} />
    </GlassCard>
  );

  const renderMetabolicProfile = () => {
    if (!calculatedData) return null;

    // Helper to get BMI color
    const getBMIColor = () => {
      const bmi = calculatedData.calculated_bmi || 0;
      if (bmi < 18.5) return ["#FFC107", "#FF9800"];
      if (bmi < 25) return ["#4CAF50", "#45A049"];
      if (bmi < 30) return ["#FF9800", "#FF5722"];
      return ["#F44336", "#D32F2F"];
    };

    const getBMICategory = () => {
      const bmi = calculatedData.calculated_bmi || 0;
      if (bmi < 18.5) return "Under";
      if (bmi < 25) return "Normal";
      if (bmi < 30) return "Over";
      return "Obese";
    };

    const getMetabolicAgeColor = () => {
      const age = calculatedData.metabolic_age || 25;
      if (age < 30) return ["#4CAF50", "#45A049"];
      if (age < 50) return ["#FFC107", "#FF9800"];
      return ["#FF5722", "#D32F2F"];
    };

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons
              name="flame-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle} numberOfLines={1}>
              Metabolic Profile
            </Text>
          </View>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          {/* 2x2 Grid with proper rings showing values inside */}
          <View style={styles.metabolicGrid}>
            {/* BMI */}
            <View style={styles.metabolicGridCard}>
              <View style={styles.metabolicCardHeader}>
                <Text style={styles.metabolicCardLabel}>BMI</Text>
                <InfoTooltip
                  title={METRIC_DESCRIPTIONS.BMI.title}
                  description={METRIC_DESCRIPTIONS.BMI.description}
                />
              </View>
              <ProgressRing
                progress={
                  isValidMetric(calculatedData.calculated_bmi)
                    ? Math.round((calculatedData.calculated_bmi! / 40) * 100)
                    : 0
                }
                size={72}
                strokeWidth={6}
                gradient={true}
                gradientColors={getBMIColor()}
                duration={800}
                showText={true}
                text={
                  isValidMetric(calculatedData.calculated_bmi)
                    ? calculatedData.calculated_bmi!.toFixed(1)
                    : "--"
                }
              />
              <Text style={styles.metabolicCardCategory}>
                {isValidMetric(calculatedData.calculated_bmi)
                  ? getBMICategory()
                  : "Pending"}
              </Text>
            </View>

            {/* BMR */}
            <View style={styles.metabolicGridCard}>
              <View style={styles.metabolicCardHeader}>
                <Text style={styles.metabolicCardLabel}>BMR</Text>
                <InfoTooltip
                  title={METRIC_DESCRIPTIONS.BMR.title}
                  description={METRIC_DESCRIPTIONS.BMR.description}
                />
              </View>
              <ProgressRing
                progress={
                  isValidMetric(calculatedData.calculated_bmr)
                    ? Math.round(
                        Math.min(
                          100,
                          Math.max(
                            0,
                            ((calculatedData.calculated_bmr! - 1200) / 1300) *
                              100,
                          ),
                        ),
                      )
                    : 0
                }
                size={72}
                strokeWidth={6}
                gradient={true}
                gradientColors={["#2196F3", "#1976D2"]}
                duration={800}
                showText={true}
                text={
                  isValidMetric(calculatedData.calculated_bmr)
                    ? `${Math.round(calculatedData.calculated_bmr!)}`
                    : "--"
                }
              />
              <Text style={styles.metabolicCardCategory}>
                {isValidMetric(calculatedData.calculated_bmr)
                  ? "cal/day"
                  : "Pending"}
              </Text>
            </View>

            {/* TDEE */}
            <View style={styles.metabolicGridCard}>
              <View style={styles.metabolicCardHeader}>
                <Text style={styles.metabolicCardLabel}>TDEE</Text>
                <InfoTooltip
                  title={METRIC_DESCRIPTIONS.TDEE.title}
                  description={METRIC_DESCRIPTIONS.TDEE.description}
                />
              </View>
              <ProgressRing
                progress={
                  isValidMetric(calculatedData.calculated_tdee)
                    ? Math.round(
                        Math.min(
                          100,
                          Math.max(
                            0,
                            ((calculatedData.calculated_tdee! - 1500) / 2000) *
                              100,
                          ),
                        ),
                      )
                    : 0
                }
                size={72}
                strokeWidth={6}
                gradient={true}
                gradientColors={["#9C27B0", "#7B1FA2"]}
                duration={800}
                showText={true}
                text={
                  isValidMetric(calculatedData.calculated_tdee)
                    ? `${Math.round(calculatedData.calculated_tdee!)}`
                    : "--"
                }
              />
              <Text style={styles.metabolicCardCategory}>
                {isValidMetric(calculatedData.calculated_tdee)
                  ? "cal/day"
                  : "Pending"}
              </Text>
            </View>

            {/* Metabolic Age */}
            <View style={styles.metabolicGridCard}>
              <View style={styles.metabolicCardHeader}>
                <Text style={styles.metabolicCardLabel}>Age</Text>
                <InfoTooltip
                  title={METRIC_DESCRIPTIONS.METABOLIC_AGE.title}
                  description={METRIC_DESCRIPTIONS.METABOLIC_AGE.description}
                />
              </View>
              <ProgressRing
                progress={
                  isValidMetric(calculatedData.metabolic_age)
                    ? Math.round((calculatedData.metabolic_age! / 80) * 100)
                    : 0
                }
                size={72}
                strokeWidth={6}
                gradient={true}
                gradientColors={getMetabolicAgeColor()}
                duration={800}
                showText={true}
                text={
                  isValidMetric(calculatedData.metabolic_age)
                    ? `${Math.round(calculatedData.metabolic_age!)}`
                    : "--"
                }
              />
              <Text style={styles.metabolicCardCategory}>
                {isValidMetric(calculatedData.metabolic_age)
                  ? "years"
                  : "Pending"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.sectionBottomPadSmall} />
      </GlassCard>
    );
  };

  const renderNutritionalNeeds = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons
              name="nutrition-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle} numberOfLines={1}>
              Daily Nutritional Needs
            </Text>
            {/* Inline Water & Fiber badges */}
            <View style={styles.nutrientBadges}>
              <View style={styles.nutrientBadge}>
                <Ionicons
                  name="water"
                  size={rf(10)}
                  color={ResponsiveTheme.colors.primary}
                />
                <Text style={styles.nutrientBadgeText}>
                  {(calculatedData.daily_water_ml! / 1000).toFixed(1)}L
                </Text>
              </View>
              <View style={styles.nutrientBadge}>
                <Ionicons
                  name="leaf"
                  size={rf(10)}
                  color={ResponsiveTheme.colors.success}
                />
                <Text style={styles.nutrientBadgeText}>
                  {calculatedData.daily_fiber_g}g
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          <GlassCard
            elevation={1}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.nutritionCardCompact}
          >
            {/* Compact Header with calorie target */}
            <View style={styles.nutritionCompactHeader}>
              <Text style={styles.nutritionCompactTitle}>Daily Target</Text>
              <Text style={styles.calorieTargetCompact}>
                {calculatedData.daily_calories} cal
              </Text>
            </View>

            {/* Compact macro bars */}
            <GradientBarChart
              data={[
                {
                  label: "Protein",
                  value: calculatedData.daily_protein_g || 0,
                  maxValue: 300,
                  gradient: ["#FF6B35", "#FF8A5C"],
                  unit: "g",
                },
                {
                  label: "Carbs",
                  value: calculatedData.daily_carbs_g || 0,
                  maxValue: 400,
                  gradient: ["#4CAF50", "#45A049"],
                  unit: "g",
                },
                {
                  label: "Fats",
                  value: calculatedData.daily_fat_g || 0,
                  maxValue: 150,
                  gradient: ["#2196F3", "#1976D2"],
                  unit: "g",
                },
              ]}
              height={120}
              animated={true}
              showValues={true}
              style={styles.macroChartCompact}
            />
          </GlassCard>
        </View>
        <View style={styles.sectionBottomPadSmall} />
      </GlassCard>
    );
  };

  const renderWeightManagement = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons
              name="scale-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle} numberOfLines={1}>
              Weight Management
            </Text>
          </View>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          <GlassCard
            elevation={2}
            blurIntensity="light"
            padding="lg"
            borderRadius="lg"
            style={styles.weightCardInline}
          >
            <View style={styles.weightHeader}>
              <Text style={styles.weightTitle}>Goal Timeline</Text>
              <Text style={styles.timelineWeeks}>
                {calculatedData.estimated_timeline_weeks} weeks
              </Text>
            </View>

            {/* Weight Projection Chart */}
            <View style={styles.chartContainer}>
              {isValidMetric(bodyAnalysis?.current_weight_kg) &&
              isValidMetric(bodyAnalysis?.target_weight_kg) ? (
                <WeightProjectionChart
                  currentWeight={bodyAnalysis!.current_weight_kg}
                  targetWeight={bodyAnalysis!.target_weight_kg}
                  weeks={calculatedData.estimated_timeline_weeks || 12}
                  milestones={[
                    Math.round(
                      (calculatedData.estimated_timeline_weeks || 12) * 0.25,
                    ),
                    Math.round(
                      (calculatedData.estimated_timeline_weeks || 12) * 0.5,
                    ),
                    Math.round(
                      (calculatedData.estimated_timeline_weeks || 12) * 0.75,
                    ),
                  ]}
                  height={180}
                />
              ) : (
                <DataPlaceholder
                  icon="scale-outline"
                  title="Weight Data Needed"
                  message="Complete your body analysis to see your personalized weight projection chart"
                  actionText="Go to Body Analysis"
                  onAction={() => onNavigateToTab?.(3)}
                />
              )}
            </View>

            <View style={styles.weightProgress}>
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Current</Text>
                <Text style={styles.weightValue}>
                  {isValidMetric(bodyAnalysis?.current_weight_kg)
                    ? `${bodyAnalysis?.current_weight_kg}kg`
                    : "--"}
                </Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={rf(20)}
                color={ResponsiveTheme.colors.textSecondary}
              />

              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Target</Text>
                <Text style={styles.weightValue}>
                  {isValidMetric(bodyAnalysis?.target_weight_kg)
                    ? `${bodyAnalysis?.target_weight_kg}kg`
                    : "--"}
                </Text>
              </View>

              <Ionicons
                name="trending-up-outline"
                size={rf(20)}
                color={ResponsiveTheme.colors.success}
              />

              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Weekly Rate</Text>
                <Text style={styles.weightValue}>
                  {isValidMetric(calculatedData.weekly_weight_loss_rate)
                    ? `${calculatedData.weekly_weight_loss_rate?.toFixed(2)}kg`
                    : "--"}
                </Text>
              </View>
            </View>

            <View style={styles.idealWeightInfo}>
              <Text style={styles.idealWeightTitle}>Ideal Weight Range</Text>
              <Text style={styles.idealWeightRange}>
                {isValidMetric(calculatedData.healthy_weight_min) &&
                isValidMetric(calculatedData.healthy_weight_max)
                  ? `${calculatedData.healthy_weight_min}kg - ${calculatedData.healthy_weight_max}kg`
                  : "Complete body analysis to calculate"}
              </Text>
            </View>

            <View style={styles.calorieDeficitInfo}>
              <Text style={styles.deficitTitle}>Weekly Calorie Deficit</Text>
              <Text style={styles.deficitValue}>
                {calculatedData.total_calorie_deficit} calories
              </Text>
              <Text style={styles.deficitDaily}>
                ({Math.round(calculatedData.total_calorie_deficit! / 7)}{" "}
                cal/day)
              </Text>
            </View>
          </GlassCard>
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

  const renderFitnessMetrics = () => {
    if (!calculatedData) return null;

    const getVO2Category = () => {
      const vo2 = calculatedData.estimated_vo2_max || 0;
      if (vo2 > 50)
        return { label: "Excellent", color: ResponsiveTheme.colors.success };
      if (vo2 > 40)
        return { label: "Good", color: ResponsiveTheme.colors.primary };
      if (vo2 > 30)
        return { label: "Fair", color: ResponsiveTheme.colors.warning };
      return { label: "Poor", color: ResponsiveTheme.colors.error };
    };

    const vo2Category = getVO2Category();

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons
              name="heart-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle}>Fitness & Cardio</Text>
          </View>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          {/* VO2 Max Card */}
          <GlassCard
            elevation={1}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.fitnessVO2Card}
          >
            <View style={styles.fitnessVO2Row}>
              <View style={styles.fitnessVO2IconBg}>
                <Ionicons
                  name="fitness"
                  size={rf(20)}
                  color={vo2Category.color}
                />
              </View>
              <View style={styles.fitnessVO2Content}>
                <Text style={styles.fitnessVO2Label}>VO₂ Max</Text>
                <View style={styles.fitnessVO2ValueRow}>
                  <Text style={styles.fitnessVO2Value}>
                    {calculatedData.estimated_vo2_max}
                  </Text>
                  <Text style={styles.fitnessVO2Unit}>ml/kg/min</Text>
                </View>
              </View>
              <View
                style={[
                  styles.fitnessVO2Badge,
                  { backgroundColor: `${vo2Category.color}20` },
                ]}
              >
                <Text
                  style={[
                    styles.fitnessVO2BadgeText,
                    { color: vo2Category.color },
                  ]}
                >
                  {vo2Category.label}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Heart Rate Zones Card */}
          <GlassCard
            elevation={1}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.fitnessHRCard}
          >
            <Text style={styles.fitnessCardTitle}>Heart Rate Zones</Text>
            <View style={styles.hrZonesGrid}>
              <View style={styles.hrZoneRow}>
                <View
                  style={[
                    styles.hrZoneColorBar,
                    { backgroundColor: "#4CAF50" },
                  ]}
                />
                <Text style={styles.hrZoneLabel}>Fat Burn</Text>
                <Text style={styles.hrZoneValue}>
                  {calculatedData.target_hr_fat_burn_min}-
                  {calculatedData.target_hr_fat_burn_max} bpm
                </Text>
              </View>
              <View style={styles.hrZoneRow}>
                <View
                  style={[
                    styles.hrZoneColorBar,
                    { backgroundColor: "#FF9800" },
                  ]}
                />
                <Text style={styles.hrZoneLabel}>Cardio</Text>
                <Text style={styles.hrZoneValue}>
                  {calculatedData.target_hr_cardio_min}-
                  {calculatedData.target_hr_cardio_max} bpm
                </Text>
              </View>
              <View style={styles.hrZoneRow}>
                <View
                  style={[
                    styles.hrZoneColorBar,
                    { backgroundColor: "#F44336" },
                  ]}
                />
                <Text style={styles.hrZoneLabel}>Peak</Text>
                <Text style={styles.hrZoneValue}>
                  {calculatedData.target_hr_peak_min}-
                  {calculatedData.target_hr_peak_max} bpm
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Weekly Plan Card */}
          <GlassCard
            elevation={1}
            blurIntensity="light"
            padding="md"
            borderRadius="md"
            style={styles.fitnessWeeklyCard}
          >
            <Text style={styles.fitnessCardTitle}>Weekly Plan</Text>
            <View style={styles.weeklyPlanGrid}>
              <View style={styles.weeklyPlanGridItem}>
                <View
                  style={[
                    styles.weeklyPlanIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.primary}20` },
                  ]}
                >
                  <Ionicons
                    name="calendar"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.primary}
                  />
                </View>
                <Text style={styles.weeklyPlanGridValue}>
                  {calculatedData.recommended_workout_frequency}
                </Text>
                <Text style={styles.weeklyPlanGridLabel}>sessions/wk</Text>
              </View>
              <View style={styles.weeklyPlanGridItem}>
                <View
                  style={[
                    styles.weeklyPlanIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.error}20` },
                  ]}
                >
                  <Ionicons
                    name="heart"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.error}
                  />
                </View>
                <Text style={styles.weeklyPlanGridValue}>
                  {calculatedData.recommended_cardio_minutes}
                </Text>
                <Text style={styles.weeklyPlanGridLabel}>min cardio</Text>
              </View>
              <View style={styles.weeklyPlanGridItem}>
                <View
                  style={[
                    styles.weeklyPlanIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.success}20` },
                  ]}
                >
                  <Ionicons
                    name="barbell"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.success}
                  />
                </View>
                <Text style={styles.weeklyPlanGridValue}>
                  {calculatedData.recommended_strength_sessions}
                </Text>
                <Text style={styles.weeklyPlanGridLabel}>strength</Text>
              </View>
            </View>
          </GlassCard>

          {/* Training Zone Distribution */}
          <View style={styles.trainingZoneSection}>
            <Text style={styles.trainingZoneTitle}>
              Training Zone Distribution
            </Text>
            <ColorCodedZones
              zones={calculateHeartRateZones(
                calculatedData.max_heart_rate || 180,
              )}
              maxHR={calculatedData.max_heart_rate || 180}
              style={styles.colorCodedZonesCompact}
            />
          </View>
        </View>
        <View style={styles.sectionBottomPadSmall} />
      </GlassCard>
    );
  };

  const renderHealthScores = () => {
    if (!calculatedData) return null;

    // Check if all required scores are available
    const hasAllScores =
      calculatedData.overall_health_score !== undefined &&
      calculatedData.diet_readiness_score !== undefined &&
      calculatedData.fitness_readiness_score !== undefined &&
      calculatedData.goal_realistic_score !== undefined;

    if (!hasAllScores) {
      console.warn("[WARNING] Health scores not fully calculated");
      return null;
    }

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons
              name="stats-chart-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle}>Health Assessment</Text>
          </View>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          {/* Compact Overall Health Score */}
          <View style={styles.healthScoreCompactContainer}>
            <LargeProgressRing
              value={
                isValidMetric(calculatedData.overall_health_score, true)
                  ? calculatedData.overall_health_score!
                  : 0
              }
              maxValue={100}
              size={160}
              strokeWidth={14}
              gradient={
                (calculatedData.overall_health_score ?? 0) >= 80
                  ? ["#4CAF50", "#45A049"]
                  : (calculatedData.overall_health_score ?? 0) >= 60
                    ? ["#FF9800", "#FF5722"]
                    : ["#F44336", "#D32F2F"]
              }
              showGlow={true}
              showValue={true}
              label="/100"
              style={styles.largeProgressRing}
            />
            <View style={styles.healthScoreCompactInfo}>
              <Text style={styles.healthScoreCompactTitle}>Overall Score</Text>
              <Text style={styles.healthScoreCompactCategory}>
                {isValidMetric(calculatedData.overall_health_score, true)
                  ? getScoreCategory(calculatedData.overall_health_score!)
                  : "Complete profile to calculate"}
              </Text>
            </View>
          </View>

          {/* Compact Sub-scores Row */}
          <View style={styles.subScoresCompactRow}>
            <View style={styles.subScoreCompactItem}>
              <Text
                style={[
                  styles.subScoreCompactValue,
                  {
                    color: isValidMetric(
                      calculatedData.diet_readiness_score,
                      true,
                    )
                      ? getScoreColor(calculatedData.diet_readiness_score!)
                      : ResponsiveTheme.colors.textMuted,
                  },
                ]}
              >
                {isValidMetric(calculatedData.diet_readiness_score, true)
                  ? calculatedData.diet_readiness_score
                  : "--"}
              </Text>
              <Text style={styles.subScoreCompactLabel}>Diet</Text>
            </View>
            <View style={styles.subScoreCompactDivider} />
            <View style={styles.subScoreCompactItem}>
              <Text
                style={[
                  styles.subScoreCompactValue,
                  {
                    color: isValidMetric(
                      calculatedData.fitness_readiness_score,
                      true,
                    )
                      ? getScoreColor(calculatedData.fitness_readiness_score!)
                      : ResponsiveTheme.colors.textMuted,
                  },
                ]}
              >
                {isValidMetric(calculatedData.fitness_readiness_score, true)
                  ? calculatedData.fitness_readiness_score
                  : "--"}
              </Text>
              <Text style={styles.subScoreCompactLabel}>Fitness</Text>
            </View>
            <View style={styles.subScoreCompactDivider} />
            <View style={styles.subScoreCompactItem}>
              <Text
                style={[
                  styles.subScoreCompactValue,
                  {
                    color: isValidMetric(
                      calculatedData.goal_realistic_score,
                      true,
                    )
                      ? getScoreColor(calculatedData.goal_realistic_score!)
                      : ResponsiveTheme.colors.textMuted,
                  },
                ]}
              >
                {isValidMetric(calculatedData.goal_realistic_score, true)
                  ? calculatedData.goal_realistic_score
                  : "--"}
              </Text>
              <Text style={styles.subScoreCompactLabel}>Goals</Text>
            </View>
          </View>
        </View>
        <View style={styles.sectionBottomPadSmall} />
      </GlassCard>
    );
  };

  const renderSleepAnalysis = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons
              name="moon-outline"
              size={rf(20)}
              color={ResponsiveTheme.colors.primary}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle}>Sleep Analysis</Text>
          </View>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          <GlassCard
            elevation={2}
            blurIntensity="light"
            padding="lg"
            borderRadius="lg"
            style={styles.sleepCardInline}
          >
            <View style={styles.sleepMetrics}>
              <View style={styles.sleepMetric}>
                <Text style={styles.sleepLabel}>Current Sleep</Text>
                <Text style={styles.sleepValue}>
                  {calculatedData.current_sleep_duration}h
                </Text>
              </View>

              <Text style={styles.sleepArrow}>vs</Text>

              <View style={styles.sleepMetric}>
                <Text style={styles.sleepLabel}>Recommended</Text>
                <Text style={styles.sleepValue}>
                  {calculatedData.recommended_sleep_hours}h
                </Text>
              </View>
            </View>

            <View style={styles.sleepEfficiency}>
              <Text style={styles.sleepEfficiencyTitle}>
                Sleep Efficiency Score
              </Text>
              <Text
                style={[
                  styles.sleepEfficiencyScore,
                  {
                    color: getScoreColor(
                      calculatedData.sleep_efficiency_score!,
                    ),
                  },
                ]}
              >
                {calculatedData.sleep_efficiency_score}/100
              </Text>
            </View>

            <View style={styles.sleepRecommendationContainer}>
              {calculatedData.current_sleep_duration! >= 7 &&
              calculatedData.current_sleep_duration! <= 9 ? (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.success}
                    style={styles.sleepRecommendationIcon}
                  />
                  <Text style={styles.sleepRecommendation}>
                    Your sleep duration is optimal for fitness goals
                  </Text>
                </>
              ) : calculatedData.current_sleep_duration! < 7 ? (
                <>
                  <Ionicons
                    name="warning-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.warning}
                    style={styles.sleepRecommendationIcon}
                  />
                  <Text style={styles.sleepRecommendation}>
                    Consider getting more sleep for better recovery and results
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="warning-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.warning}
                    style={styles.sleepRecommendationIcon}
                  />
                  <Text style={styles.sleepRecommendation}>
                    Very long sleep duration - ensure it's quality sleep
                  </Text>
                </>
              )}
            </View>
          </GlassCard>

          {/* Sleep Schedule Visualization */}
          {personalInfo?.wake_time && personalInfo?.sleep_time && (
            <View style={styles.sleepScheduleVisualization}>
              <Text style={styles.sleepScheduleTitle}>Your Sleep Schedule</Text>
              <CircularClock
                sleepTime={personalInfo.sleep_time}
                wakeTime={personalInfo.wake_time}
                size={rh(200)}
                style={styles.circularClock}
              />
            </View>
          )}
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

  const renderPersonalizationMetrics = () => {
    if (!calculatedData) return null;

    const getProgressColor = (value: number) => {
      if (value >= 90) return ResponsiveTheme.colors.success;
      if (value >= 70) return ResponsiveTheme.colors.primary;
      if (value >= 50) return ResponsiveTheme.colors.warning;
      return ResponsiveTheme.colors.error;
    };

    const metrics = [
      {
        label: "Data Completeness",
        value: calculatedData.data_completeness_percentage || 0,
        icon: "document-text",
        description: "Profile information filled",
      },
      {
        label: "Reliability Score",
        value: calculatedData.reliability_score || 0,
        icon: "shield-checkmark",
        description: "Data consistency check",
      },
      {
        label: "Personalization",
        value: calculatedData.personalization_level || 0,
        icon: "sparkles",
        description: "Recommendation accuracy",
      },
    ];

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="default"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons
              name="analytics-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle}>Profile Quality</Text>
          </View>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          {/* Metric Cards Row */}
          <View style={styles.profileMetricsRow}>
            {metrics.map((metric, index) => (
              <View key={index} style={styles.profileMetricCard}>
                <View
                  style={[
                    styles.profileMetricIconBg,
                    { backgroundColor: `${getProgressColor(metric.value)}15` },
                  ]}
                >
                  <Ionicons
                    name={metric.icon as any}
                    size={rf(18)}
                    color={getProgressColor(metric.value)}
                  />
                </View>
                <Text
                  style={[
                    styles.profileMetricValue,
                    { color: getProgressColor(metric.value) },
                  ]}
                >
                  {metric.value}%
                </Text>
                <Text style={styles.profileMetricLabel}>{metric.label}</Text>
                {/* Mini progress bar */}
                <View style={styles.profileMetricBarBg}>
                  <View
                    style={[
                      styles.profileMetricBarFill,
                      {
                        width: `${metric.value}%`,
                        backgroundColor: getProgressColor(metric.value),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Summary Message */}
          <View style={styles.profileSummaryCard}>
            {calculatedData.data_completeness_percentage! >= 90 ? (
              <>
                <View
                  style={[
                    styles.profileSummaryIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.success}20` },
                  ]}
                >
                  <Ionicons
                    name="trophy"
                    size={rf(20)}
                    color={ResponsiveTheme.colors.success}
                  />
                </View>
                <View style={styles.profileSummaryContent}>
                  <Text style={styles.profileSummaryTitle}>
                    Excellent Profile!
                  </Text>
                  <Text style={styles.profileSummaryText}>
                    Ready for highly personalized recommendations
                  </Text>
                </View>
              </>
            ) : calculatedData.data_completeness_percentage! >= 70 ? (
              <>
                <View
                  style={[
                    styles.profileSummaryIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.primary}20` },
                  ]}
                >
                  <Ionicons
                    name="thumbs-up"
                    size={rf(20)}
                    color={ResponsiveTheme.colors.primary}
                  />
                </View>
                <View style={styles.profileSummaryContent}>
                  <Text style={styles.profileSummaryTitle}>Good Progress!</Text>
                  <Text style={styles.profileSummaryText}>
                    Add more details for better personalization
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.profileSummaryIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.warning}20` },
                  ]}
                >
                  <Ionicons
                    name="bulb"
                    size={rf(20)}
                    color={ResponsiveTheme.colors.warning}
                  />
                </View>
                <View style={styles.profileSummaryContent}>
                  <Text style={styles.profileSummaryTitle}>
                    Getting Started
                  </Text>
                  <Text style={styles.profileSummaryText}>
                    Complete more sections for enhanced results
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
        <View style={styles.sectionBottomPadSmall} />
      </GlassCard>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Background Image */}
        <HeroSection
          image={{
            uri: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
          }}
          overlayGradient={gradients.overlay.dark}
          contentPosition="center"
          minHeight={180}
          maxHeight={260}
        >
          <Text style={styles.title}>Advanced Review & Insights</Text>
          <Text style={styles.subtitle}>
            Comprehensive analysis based on your complete profile
          </Text>

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Ionicons
                name="save-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.success}
                style={{ marginRight: ResponsiveTheme.spacing.xs }}
              />
              <Text style={styles.autoSaveText}>Saving...</Text>
            </View>
          )}

          {/* Calculation Status */}
          {isCalculating && (
            <View style={styles.calculatingIndicator}>
              <Ionicons
                name="calculator-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.primary}
                style={{ marginRight: ResponsiveTheme.spacing.xs }}
              />
              <Text style={styles.calculatingText}>
                Calculating health metrics...
              </Text>
            </View>
          )}

          {calculationError && (
            <View style={styles.errorIndicator}>
              <View style={styles.errorTextContainer}>
                <Ionicons
                  name="close-circle-outline"
                  size={rf(16)}
                  color={ResponsiveTheme.colors.error}
                  style={{ marginRight: ResponsiveTheme.spacing.xs }}
                />
                <Text style={styles.errorText}>{calculationError}</Text>
              </View>
              <AnimatedPressable
                onPress={performCalculations}
                style={styles.retryButton}
                scaleValue={0.95}
              >
                <Ionicons
                  name="refresh-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.primary}
                  style={{ marginRight: ResponsiveTheme.spacing.xs }}
                />
                <Text style={styles.retryText}>Retry Calculations</Text>
              </AnimatedPressable>
            </View>
          )}
        </HeroSection>

        {/* Success Message Banner */}
        {successMessage && (
          <View style={styles.successBanner}>
            <Ionicons
              name="checkmark-circle"
              size={rf(20)}
              color="#10B981"
              style={{ marginRight: ResponsiveTheme.spacing.sm }}
            />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Validation Errors Section */}
          {validationResults?.hasErrors && (
            <ErrorCard
              errors={validationResults.errors}
              onAdjust={(error) => {
                console.log(
                  "[ADJUSTMENT] Opening adjustment wizard for error:",
                  error,
                );
                setCurrentError(validationResults.errors[0]); // Use first error
                setShowAdjustmentWizard(true);
              }}
            />
          )}

          {/* Validation Warnings Section */}
          {validationResults?.hasWarnings && (
            <WarningCard
              warnings={validationResults.warnings}
              onAcknowledgmentChange={setWarningsAcknowledged}
            />
          )}

          {/* Existing Sections */}
          <AnimatedSection delay={0}>{renderDataSummary()}</AnimatedSection>

          <AnimatedSection delay={100}>
            {renderMetabolicProfile()}
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {renderNutritionalNeeds()}
          </AnimatedSection>

          <AnimatedSection delay={300}>
            {renderWeightManagement()}
          </AnimatedSection>

          <AnimatedSection delay={400}>
            {renderFitnessMetrics()}
          </AnimatedSection>

          <AnimatedSection delay={500}>{renderHealthScores()}</AnimatedSection>

          <AnimatedSection delay={600}>{renderSleepAnalysis()}</AnimatedSection>

          <AnimatedSection delay={700}>
            {renderPersonalizationMetrics()}
          </AnimatedSection>

          {/* Compact Completion Status */}
          {calculatedData && (
            <View
              style={[
                styles.completionCompact,
                isComplete
                  ? styles.completionCompactSuccess
                  : styles.completionCompactReady,
              ]}
            >
              <View
                style={[
                  styles.completionCompactIconBg,
                  {
                    backgroundColor: isComplete
                      ? `${ResponsiveTheme.colors.success}20`
                      : `${ResponsiveTheme.colors.primary}20`,
                  },
                ]}
              >
                <Ionicons
                  name={isComplete ? "trophy" : "checkmark-done"}
                  size={rf(20)}
                  color={
                    isComplete
                      ? ResponsiveTheme.colors.success
                      : ResponsiveTheme.colors.primary
                  }
                />
              </View>
              <View style={styles.completionCompactContent}>
                <Text
                  style={[
                    styles.completionCompactTitle,
                    {
                      color: isComplete
                        ? ResponsiveTheme.colors.success
                        : ResponsiveTheme.colors.primary,
                    },
                  ]}
                >
                  {isComplete ? "Profile Complete!" : "Review Complete!"}
                </Text>
                <Text style={styles.completionCompactText}>
                  {isComplete
                    ? "Ready for AI-powered recommendations"
                    : "Ready to start your journey"}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

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
            style={
              !calculatedData ||
              isCalculating ||
              !validationResults?.canProceed ||
              (validationResults?.hasWarnings && !warningsAcknowledged)
                ? [styles.completeButtonCompact, styles.completeButtonDisabled]
                : styles.completeButtonCompact
            }
            onPress={() => {
              if (isComplete) {
                onNext();
              } else {
                onComplete();
              }
            }}
            scaleValue={0.96}
            disabled={
              !calculatedData ||
              isCalculating ||
              !validationResults?.canProceed ||
              (validationResults?.hasWarnings && !warningsAcknowledged)
            }
          >
            <Text style={styles.completeButtonText}>
              {validationResults?.hasErrors
                ? "Fix Issues"
                : isComplete
                  ? "Start Journey"
                  : "Complete"}
            </Text>
            <Ionicons
              name={isComplete ? "rocket-outline" : "checkmark-circle-outline"}
              size={rf(18)}
              color="#FFFFFF"
            />
          </AnimatedPressable>
        </View>
      </View>

      {/* Adjustment Wizard Modal */}
      {showAdjustmentWizard && currentError && bodyAnalysis && (
        <AdjustmentWizard
          visible={showAdjustmentWizard}
          error={currentError}
          currentData={{
            bmr: calculatedData?.calculated_bmr || 0,
            tdee: calculatedData?.calculated_tdee || 0,
            currentWeight: bodyAnalysis.current_weight_kg,
            targetWeight: bodyAnalysis.target_weight_kg,
            currentTimeline: bodyAnalysis.target_timeline_weeks,
            currentFrequency:
              workoutPreferences?.workout_frequency_per_week || 0,
            // Additional data for comprehensive goal support
            currentIntensity: workoutPreferences?.intensity,
            currentProtein: calculatedData?.daily_protein_g,
            currentCardioMinutes: calculatedData?.recommended_cardio_minutes,
            currentStrengthSessions:
              calculatedData?.recommended_strength_sessions,
          }}
          primaryGoals={workoutPreferences?.primary_goals || []}
          onSaveToDatabase={onSaveToDatabase}
          onSelectAlternative={(alternative: Alternative) => {
            console.log("[SUCCESS] Alternative selected:", alternative);

            // Update body analysis if timeline or target weight changed
            if (
              alternative.newTimeline !== undefined ||
              alternative.newTargetWeight !== undefined
            ) {
              const updates: Partial<BodyAnalysisData> = {};

              if (alternative.newTimeline !== undefined) {
                updates.target_timeline_weeks = alternative.newTimeline;
                console.log(
                  `[UPDATE] Updating timeline: ${bodyAnalysis?.target_timeline_weeks} → ${alternative.newTimeline} weeks`,
                );
              }

              if (alternative.newTargetWeight !== undefined) {
                updates.target_weight_kg = alternative.newTargetWeight;
                console.log(
                  `[UPDATE] Updating target weight: ${bodyAnalysis?.target_weight_kg} → ${alternative.newTargetWeight} kg`,
                );
              }

              onUpdateBodyAnalysis?.(updates);
            }

            // Update workout preferences with all new fields
            const workoutUpdates: Partial<WorkoutPreferencesData> = {};

            if (alternative.newWorkoutFrequency !== undefined) {
              workoutUpdates.workout_frequency_per_week =
                alternative.newWorkoutFrequency;
              console.log(
                `[UPDATE] Updating workout frequency: ${workoutPreferences?.workout_frequency_per_week} → ${alternative.newWorkoutFrequency}/week`,
              );
            }

            if (alternative.newIntensity !== undefined) {
              workoutUpdates.intensity = alternative.newIntensity;
              console.log(
                `[UPDATE] Updating intensity: ${workoutPreferences?.intensity} → ${alternative.newIntensity}`,
              );
            }

            if (alternative.newWorkoutTypes !== undefined) {
              workoutUpdates.workout_types = alternative.newWorkoutTypes;
              console.log(
                `[UPDATE] Updating workout types: → ${alternative.newWorkoutTypes.join(", ")}`,
              );
            }

            // Apply workout updates if any
            if (Object.keys(workoutUpdates).length > 0) {
              onUpdateWorkoutPreferences?.(workoutUpdates);
            }

            // Close wizard
            setShowAdjustmentWizard(false);

            // Stay on Review tab, show success message, and recalculate
            setSuccessMessage(
              "Changes applied and saved! Recalculating metrics...",
            );
            setTimeout(() => {
              performCalculations();
              setTimeout(() => setSuccessMessage(null), 3000); // Hide after 3s
            }, 500);
          }}
          onClose={() => setShowAdjustmentWizard(false)}
        />
      )}
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  scrollView: {
    flex: 1,
  },

  header: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  headerGradient: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
    borderBottomLeftRadius: ResponsiveTheme.borderRadius.xxl,
    borderBottomRightRadius: ResponsiveTheme.borderRadius.xxl,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center" as const,
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

  calculatingIndicator: {
    flexDirection: "row",
    alignItems: "center" as const,
    alignSelf: "flex-start",
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  calculatingText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  errorIndicator: {
    backgroundColor: `${ResponsiveTheme.colors.error}20`,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  successBanner: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: ResponsiveTheme.spacing.md,
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },

  successBannerText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: "#6EE7B7",
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  errorTextContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    flex: 1,
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center" as const,
    alignSelf: "flex-start",
  },

  retryText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textDecorationLine: "underline",
  },

  content: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  section: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  // Edge-to-edge section styles
  sectionEdgeToEdge: {
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xl,
    marginHorizontal: -ResponsiveTheme.spacing.lg,
  },

  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },

  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },

  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  // Inline card variants for edge-to-edge sections
  nutritionCardInline: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  // Compact Nutrition Styles
  nutrientBadges: {
    flexDirection: "row",
    gap: rw(8),
    marginLeft: "auto",
  },

  nutrientBadge: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rw(3),
    backgroundColor: `${ResponsiveTheme.colors.surface}80`,
    paddingHorizontal: rw(6),
    paddingVertical: rh(2),
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  nutrientBadgeText: {
    fontSize: rf(9),
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
  },

  nutritionCardCompact: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  nutritionCompactHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  nutritionCompactTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
  },

  calorieTargetCompact: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  macroChartCompact: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  weightCardInline: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  sleepCardInline: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  personalizationCardInline: {
    marginTop: ResponsiveTheme.spacing.xs,
  },

  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  sectionTitleIcon: {
    marginRight: ResponsiveTheme.spacing.sm,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    letterSpacing: -0.3,
    flexShrink: 1,
  },

  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
    flexShrink: 1,
  },

  // Data Summary Section
  summaryGrid: {
    gap: ResponsiveTheme.spacing.md,
  },

  summaryCard: {
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  // Horizontal Scrollable Summary Styles
  summaryScrollContainer: {
    marginHorizontal: -ResponsiveTheme.spacing.md,
  },

  summaryScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(12),
  },

  summaryScrollCard: {
    width: rw(130),
  },

  summaryScrollCardInner: {
    minHeight: rh(140),
  },

  summaryScrollHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: rh(8),
  },

  summaryScrollIconBg: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(8),
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  summaryScrollTitle: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: rh(4),
  },

  summaryScrollValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(2),
  },

  summaryScrollSub: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    lineHeight: rf(14),
  },

  summaryScrollMeals: {
    flexDirection: "row",
    gap: rw(8),
    marginTop: rh(6),
  },

  summaryMealBadge: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rw(2),
  },

  summaryMealText: {
    fontSize: rf(9),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  summaryMealTextDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },

  sectionBottomPadSmall: {
    height: ResponsiveTheme.spacing.sm,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  summaryIconSpacing: {
    marginRight: ResponsiveTheme.spacing.md,
  },

  summaryContent: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    flexShrink: 1,
  },

  summaryDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.15,
    flexShrink: 1,
  },

  mealStatusContainer: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.xs,
    flexWrap: "wrap",
  },

  mealStatus: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xxs,
  },

  summaryDetailsMeal: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  // Metabolic Profile Grid Styles
  metabolicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between" as const,
    gap: ResponsiveTheme.spacing.sm,
  },

  metabolicGridCard: {
    width: "48%",
    alignItems: "center" as const,
    backgroundColor: `${ResponsiveTheme.colors.surface}30`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },

  metabolicCardHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rw(4),
    marginBottom: rh(8),
  },

  metabolicCardLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  metabolicCardCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rh(6),
  },

  metricCard: {
    flex: 1,
    minWidth: "45%",
    maxWidth: "48%",
    padding: ResponsiveTheme.spacing.md,
    alignItems: "center" as const,
  },

  metricHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  metricProgressContainer: {
    marginVertical: ResponsiveTheme.spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  metricLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  metricValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  metricCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },

  // Nutrition Section
  nutritionCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  nutritionHeader: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  nutritionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  calorieTarget: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  macroItem: {
    alignItems: "center" as const,
  },

  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  macroValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  macroPercentage: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  macroChart: {
    marginVertical: ResponsiveTheme.spacing.md,
  },

  chartContainer: {
    width: "100%",
    alignItems: "center" as const,
    marginVertical: ResponsiveTheme.spacing.md,
    minHeight: 180,
  },

  chartPlaceholder: {
    height: 180,
    width: "100%",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: `${ResponsiveTheme.colors.surface}50`,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  chartPlaceholderText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  largeScoreContainer: {
    alignItems: "center" as const,
    marginVertical: ResponsiveTheme.spacing.xl,
    paddingVertical: ResponsiveTheme.spacing.lg,
  },

  largeScoreTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  largeProgressRing: {
    marginVertical: ResponsiveTheme.spacing.sm,
  },

  // Compact Health Score Styles
  healthScoreCompactContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  healthScoreCompactInfo: {
    alignItems: "flex-start",
  },

  healthScoreCompactTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rh(4),
  },

  healthScoreCompactCategory: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  subScoresCompactRow: {
    flexDirection: "row",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: `${ResponsiveTheme.colors.surface}50`,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  subScoreCompactItem: {
    alignItems: "center" as const,
    flex: 1,
  },

  subScoreCompactValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  subScoreCompactLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: rh(2),
  },

  subScoreCompactDivider: {
    width: 1,
    height: rh(30),
    backgroundColor: `${ResponsiveTheme.colors.border}40`,
  },

  largeScoreCategory: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  largeScoreDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  subScoresTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.lg,
  },

  otherNutrients: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  nutrientItem: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  nutrientIconSpacing: {
    marginRight: ResponsiveTheme.spacing.sm,
  },

  nutrientText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Weight Management Section
  weightCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  weightHeader: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  weightTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  timelineWeeks: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.secondary,
  },

  weightProgress: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  weightItem: {
    alignItems: "center" as const,
  },

  weightLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  weightValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  idealWeightInfo: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  idealWeightTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  idealWeightRange: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
  },

  calorieDeficitInfo: {
    alignItems: "center" as const,
  },

  deficitTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  deficitValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  deficitDaily: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
  },

  // Fitness Section
  fitnessGrid: {
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  fitnessCard: {
    padding: ResponsiveTheme.spacing.md,
    alignItems: "center" as const,
  },

  // Improved Fitness Styles
  fitnessVO2Card: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  fitnessVO2Row: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.md,
  },

  fitnessVO2IconBg: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(12),
    backgroundColor: `${ResponsiveTheme.colors.surface}50`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  fitnessVO2Content: {
    flex: 1,
  },

  fitnessVO2Label: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  fitnessVO2ValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: rw(4),
  },

  fitnessVO2Value: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  fitnessVO2Unit: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  fitnessVO2Badge: {
    paddingHorizontal: rw(12),
    paddingVertical: rh(6),
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  fitnessVO2BadgeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  fitnessHRCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  fitnessWeeklyCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  fitnessCardTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  hrZonesGrid: {
    gap: rh(8),
  },

  hrZoneRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },

  hrZoneColorBar: {
    width: rw(4),
    height: rh(24),
    borderRadius: rw(2),
  },

  hrZoneLabel: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
  },

  hrZoneValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.textSecondary,
  },

  weeklyPlanGrid: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
  },

  weeklyPlanGridItem: {
    alignItems: "center" as const,
    flex: 1,
    gap: rh(4),
  },

  weeklyPlanIconBg: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  weeklyPlanGridValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  weeklyPlanGridLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
  },

  trainingZoneSection: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  trainingZoneTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  colorCodedZonesCompact: {
    // Inherits from ColorCodedZones component
  },

  fitnessCardTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  fitnessCardValue: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  fitnessCardUnit: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  fitnessCardCategory: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.success,
  },

  heartRateZones: {
    alignItems: "center" as const,
  },

  heartRateZone: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  recommendationsCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  recommendationsTitleContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  recommendationsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  recommendationsList: {
    gap: ResponsiveTheme.spacing.sm,
  },

  recommendationItem: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  recommendationIconSpacing: {
    marginRight: ResponsiveTheme.spacing.sm,
  },

  recommendationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Health Scores Section
  scoresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  scoreCard: {
    flex: 1,
    minWidth: "45%",
    maxWidth: "48%",
    padding: ResponsiveTheme.spacing.md,
    alignItems: "center" as const,
  },

  scoreTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  scoreValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  scoreCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },

  scoreDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.xs,
    fontStyle: "italic",
  },

  // Sleep Section
  sleepCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  sleepMetrics: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sleepMetric: {
    alignItems: "center" as const,
  },

  sleepLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  sleepValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  sleepArrow: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    marginHorizontal: ResponsiveTheme.spacing.lg,
  },

  sleepEfficiency: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  sleepEfficiencyTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  sleepEfficiencyScore: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  sleepRecommendationContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  sleepRecommendationIcon: {
    marginRight: ResponsiveTheme.spacing.sm,
  },

  sleepRecommendation: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    flex: 1,
    textAlign: "center",
    lineHeight: rf(18),
  },

  sleepScheduleVisualization: {
    alignItems: "center" as const,
    marginTop: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: `${ResponsiveTheme.colors.border}40`,
  },

  sleepScheduleTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  circularClock: {
    marginVertical: ResponsiveTheme.spacing.md,
  },

  heartRateZonesVisualization: {
    marginTop: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: `${ResponsiveTheme.colors.border}40`,
  },

  zoneVisualizationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
  },

  colorCodedZones: {
    marginVertical: ResponsiveTheme.spacing.md,
  },

  // Personalization Section
  personalizationCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  personalizationGrid: {
    gap: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  personalizationItem: {
    alignItems: "center" as const,
  },

  personalizationLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  personalizationValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  personalizationBar: {
    width: "100%",
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: "hidden",
  },

  personalizationFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  personalizationSummaryContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  personalizationSummaryIcon: {
    marginRight: ResponsiveTheme.spacing.sm,
  },

  personalizationSummary: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    flex: 1,
    textAlign: "center",
    lineHeight: rf(20),
  },

  // Profile Quality Styles
  profileMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  profileMetricCard: {
    flex: 1,
    alignItems: "center" as const,
    backgroundColor: `${ResponsiveTheme.colors.surface}30`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },

  profileMetricIconBg: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: rh(6),
  },

  profileMetricValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  profileMetricLabel: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
    marginTop: rh(2),
    marginBottom: rh(6),
  },

  profileMetricBarBg: {
    width: "80%",
    height: rh(3),
    backgroundColor: `${ResponsiveTheme.colors.border}30`,
    borderRadius: rh(2),
    overflow: "hidden",
  },

  profileMetricBarFill: {
    height: "100%",
    borderRadius: rh(2),
  },

  profileSummaryCard: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: `${ResponsiveTheme.colors.surface}40`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },

  profileSummaryIconBg: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(12),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  profileSummaryContent: {
    flex: 1,
  },

  profileSummaryTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(2),
  },

  profileSummaryText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Compact Completion Section
  completionCompact: {
    flexDirection: "row",
    alignItems: "center" as const,
    padding: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.md,
    marginHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    gap: ResponsiveTheme.spacing.md,
  },

  completionCompactSuccess: {
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.success}30`,
  },

  completionCompactReady: {
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.primary}30`,
  },

  completionCompactIconBg: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  completionCompactContent: {
    flex: 1,
  },

  completionCompactTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    marginBottom: rh(2),
  },

  completionCompactText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Legacy Completion Card (kept for reference)
  completionCard: {
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center" as const,
    marginTop: ResponsiveTheme.spacing.lg,
  },

  completionCardComplete: {
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderColor: ResponsiveTheme.colors.success,
    borderWidth: 2,
  },

  completionCardIncomplete: {
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 2,
  },

  completionTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
  },

  completionText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
  },

  // Footer
  // Footer - Compact aesthetic design
  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${ResponsiveTheme.colors.border}50`,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  buttonRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: ResponsiveTheme.spacing.md,
  },

  backButtonCompact: {
    flexDirection: "row",
    alignItems: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: `${ResponsiveTheme.colors.primary}12`,
    gap: rw(4),
  },

  backButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.primary,
  },

  completeButtonCompact: {
    flexDirection: "row",
    alignItems: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.secondary,
    gap: rw(6),
  },

  completeButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: "#FFFFFF",
  },

  completeButtonDisabled: {
    opacity: 0.5,
  },

  // Legacy button styles
  backButton: {
    flex: 1,
  },

  completeButton: {
    flex: 2,
  },
});

export default AdvancedReviewTab;
