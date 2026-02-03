import React from "react";
import { View, StyleSheet, ScrollView, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { Button } from "../../../components/ui";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { HeroSection } from "../../../components/ui/aurora";
import { gradients } from "../../../theme/gradients";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../../types/onboarding";
import { AdjustmentWizard } from "../../../components/onboarding/AdjustmentWizard";
import { useAdvancedReviewForm } from "../../../hooks/onboarding/useAdvancedReviewForm";
import { SmartAlternative } from "../../../services/validationEngine";
import { DataSummarySection } from "../../../components/onboarding/review/DataSummarySection";
import { MetabolicProfileSection } from "../../../components/onboarding/review/MetabolicProfileSection";
import { NutritionalNeedsSection } from "../../../components/onboarding/review/NutritionalNeedsSection";
import { WeightManagementSection } from "../../../components/onboarding/review/WeightManagementSection";

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
  onSaveToDatabase?: () => Promise<boolean>;
  onNavigateToTab?: (tabNumber: number) => void;
  isComplete: boolean;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

const AdvancedReviewTab: React.FC<AdvancedReviewTabProps> = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  onComplete,
  onUpdate,
  onUpdateBodyAnalysis,
  onUpdateWorkoutPreferences,
  onNavigateToTab,
  isComplete,
  isLoading = false,
}) => {
  const {
    calculatedData,
    validationResults,
    isCalculating,
    calculationError,
    showAdjustmentWizard,
    setShowAdjustmentWizard,
    successMessage,
    smartAlternatives,
    selectedAlternativeId,
    handleRateSelection,
    performCalculations,
  } = useAdvancedReviewForm({
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    onUpdate,
    onUpdateBodyAnalysis,
    onUpdateWorkoutPreferences,
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection
          image={{
            uri: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
          }}
          overlayGradient={gradients.overlay.dark}
        >
          <Text style={styles.heroTitle}>Review Your Plan</Text>
          <Text style={styles.heroSubtitle}>
            We've analyzed your data to create a personalized plan.
          </Text>
        </HeroSection>

        {calculationError && (
          <GlassCard style={styles.errorCard}>
            <Ionicons
              name="alert-circle"
              size={24}
              color={ResponsiveTheme.colors.error}
            />
            <Text style={styles.errorText}>{calculationError}</Text>
            <Button
              title="Retry"
              onPress={performCalculations}
              size="sm"
              variant="outline"
            />
          </GlassCard>
        )}

        {successMessage && (
          <GlassCard style={styles.successCard} padding="md" borderRadius="lg">
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={ResponsiveTheme.colors.success}
            />
            <Text style={styles.successText}>{successMessage}</Text>
          </GlassCard>
        )}

        <DataSummarySection
          personalInfo={personalInfo}
          dietPreferences={dietPreferences}
          bodyAnalysis={bodyAnalysis}
          workoutPreferences={workoutPreferences}
          calculatedData={calculatedData}
          onNavigateToTab={onNavigateToTab}
        />

        <MetabolicProfileSection calculatedData={calculatedData} />

        <NutritionalNeedsSection calculatedData={calculatedData} />

        <WeightManagementSection
          calculatedData={calculatedData}
          bodyAnalysis={bodyAnalysis}
          smartAlternatives={smartAlternatives}
          selectedAlternativeId={selectedAlternativeId}
          handleRateSelection={handleRateSelection}
          onNavigateToTab={onNavigateToTab}
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Complete Setup"
            onPress={onComplete}
            disabled={!isComplete || isCalculating || !!calculationError}
            loading={isLoading || isCalculating}
            style={styles.completeButton}
          />
        </View>
      </ScrollView>

      {showAdjustmentWizard &&
        validationResults &&
        validationResults.errors.length > 0 && (
          <AdjustmentWizard
            visible={showAdjustmentWizard}
            onClose={() => setShowAdjustmentWizard(false)}
            error={validationResults.errors[0]}
            currentData={{
              bmr: calculatedData?.calculated_bmr || 0,
              tdee: calculatedData?.calculated_tdee || 0,
              currentWeight: bodyAnalysis?.current_weight_kg || 0,
              targetWeight: bodyAnalysis?.target_weight_kg || 0,
              currentTimeline: bodyAnalysis?.target_timeline_weeks || 0,
              currentFrequency:
                workoutPreferences?.workout_frequency_per_week || 0,
            }}
            primaryGoals={workoutPreferences?.primary_goals || []}
            onSelectAlternative={(alt) => {
              const smartAlt = smartAlternatives?.alternatives.find(
                (sa) =>
                  sa.weeklyRate === alt.weeklyRate &&
                  sa.dailyCalories === alt.dailyCalories,
              );
              if (smartAlt) {
                handleRateSelection(smartAlt);
              } else {
                handleRateSelection({
                  id: "custom-" + alt.name,
                  label: alt.name,
                  description: alt.approach,
                  dailyCalories: alt.dailyCalories,
                  weeklyRate: alt.weeklyRate,
                  riskLevel: "moderate",
                  isRecommended: false,
                  isUserOriginal: false,
                  bmrDifference: 0,
                  isBlocked: false,
                  requiresExercise: !!alt.newWorkoutFrequency,
                  timelineWeeks: alt.newTimeline || 12,
                } as SmartAlternative);
              }
            }}
          />
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  scrollContent: {
    paddingBottom: rp(100),
  },
  buttonContainer: {
    padding: rp(20),
    paddingBottom: rp(40),
  },
  completeButton: {
    width: "100%",
  },
  successCard: {
    margin: rp(20),
    flexDirection: "row",
    alignItems: "center",
    gap: rp(12),
    backgroundColor: `${ResponsiveTheme.colors.success}20`,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.success}40`,
  },
  successText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
  },
  heroTitle: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: rp(8),
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: rf(16),
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: rp(20),
  },
  errorCard: {
    margin: rp(20),
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    padding: rp(16),
    alignItems: "center",
    gap: rp(12),
  },
  errorText: {
    color: ResponsiveTheme.colors.error,
    fontSize: rf(14),
    textAlign: "center",
  },
});

export default AdvancedReviewTab;
