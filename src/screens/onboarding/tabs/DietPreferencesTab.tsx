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
import { ResponsiveTheme } from "../../../utils/constants";
import {
  AnimatedPressable,
  AnimatedSection,
  HeroSection,
} from "../../../components/ui/aurora";
import { gradients } from "../../../theme/gradients";
import {
  DietPreferencesData,
  TabValidationResult,
} from "../../../types/onboarding";
import { useDietPreferences } from "../../../hooks/onboarding/useDietPreferences";

// Components
import { CurrentDietSection } from "../../../components/onboarding/diet/CurrentDietSection";
import { DietReadinessSection } from "../../../components/onboarding/diet/DietReadinessSection";
import { MealPreferencesSection } from "../../../components/onboarding/diet/MealPreferencesSection";
import { CookingPreferencesSection } from "../../../components/onboarding/diet/CookingPreferencesSection";
import { HealthHabitsSection } from "../../../components/onboarding/diet/HealthHabitsSection";
import { AllergiesAndRestrictionsSection } from "../../../components/onboarding/diet/AllergiesAndRestrictionsSection";
import { InfoTooltipModal } from "../../../components/onboarding/shared/InfoTooltipModal";
import { ValidationSection } from "../../../components/onboarding/shared/ValidationSection";

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
}

const DietPreferencesTab: React.FC<DietPreferencesTabProps> = ({
  data,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  isAutoSaving = false,
  isEditingFromReview = false,
  onReturnToReview,
}) => {
  const isSubmittingRef = useRef(false);

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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: rh(100) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <HeroSection
            image={{
              uri: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
            }}
            overlayGradient={gradients.overlay.dark}
            contentPosition="center"
            minHeight={160}
            maxHeight={240}
          >
            <Text style={styles.title} numberOfLines={2}>
              What are your diet preferences?
            </Text>
            <Text
              style={styles.subtitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              Help us personalize your meal recommendations and nutrition plan
            </Text>

            {/* Auto-save Indicator */}
            {isAutoSaving && (
              <View style={styles.autoSaveIndicator}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={rf(16)}
                  color={ResponsiveTheme.colors.success}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.autoSaveText} numberOfLines={1}>
                  Saving...
                </Text>
              </View>
            )}
          </HeroSection>

          {/* Form Sections */}
          <View style={styles.content}>
            <AnimatedSection delay={0}>
              <CurrentDietSection
                formData={formData}
                updateField={updateField}
                showInfoTooltip={showInfoTooltip}
              />
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <DietReadinessSection
                formData={formData}
                toggleDietReadiness={toggleDietReadiness}
                showInfoTooltip={showInfoTooltip}
              />
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <MealPreferencesSection
                formData={formData}
                getEnabledMealsCount={getEnabledMealsCount}
                toggleMealPreference={toggleMealPreference}
              />
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <CookingPreferencesSection
                formData={formData}
                updateField={updateField}
              />
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <HealthHabitsSection
                formData={formData}
                toggleHealthHabit={toggleHealthHabit}
                showInfoTooltip={showInfoTooltip}
              />
            </AnimatedSection>

            <AnimatedSection delay={500}>
              <AllergiesAndRestrictionsSection
                formData={formData}
                updateField={updateField}
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
              if (isSubmittingRef.current) return;
              isSubmittingRef.current = true;
              try {
                console.warn('\n========== 🥗 TAB 2: DIET PREFERENCES ==========');
                console.warn('diet_type                  :', formData.diet_type);
                console.warn('allergies                  :', formData.allergies);
                console.warn('restrictions               :', formData.restrictions);
                console.warn('keto_ready                 :', formData.keto_ready);
                console.warn('intermittent_fasting_ready :', formData.intermittent_fasting_ready);
                console.warn('mediterranean_ready        :', formData.mediterranean_ready);
                console.warn('high_protein_ready         :', formData.high_protein_ready);
                console.warn('low_carb_ready             :', formData.low_carb_ready);
                console.warn('breakfast_enabled          :', formData.breakfast_enabled);
                console.warn('lunch_enabled              :', formData.lunch_enabled);
                console.warn('dinner_enabled             :', formData.dinner_enabled);
                console.warn('snacks_enabled             :', formData.snacks_enabled);
                console.warn('cooking_skill_level        :', formData.cooking_skill_level);
                console.warn('max_prep_time_minutes      :', formData.max_prep_time_minutes);
                console.warn('budget_level               :', formData.budget_level);
                console.warn('drinks_enough_water        :', formData.drinks_enough_water);
                console.warn('eats_regular_meals         :', formData.eats_regular_meals);
                console.warn('avoids_late_night_eating   :', formData.avoids_late_night_eating);
                console.warn('drinks_alcohol             :', formData.drinks_alcohol);
                console.warn('smokes_tobacco             :', formData.smokes_tobacco);
                console.warn('================================================\n');
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
            }}
            scaleValue={0.96}
          >
            <Text style={styles.nextButtonText}>
              {isEditingFromReview ? "Review" : "Next"}
            </Text>
            <Ionicons
              name={
                isEditingFromReview
                  ? "checkmark-circle-outline"
                  : "chevron-forward"
              }
              size={rf(18)}
              color="#FFFFFF"
            />
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
    padding: ResponsiveTheme.spacing.lg,
    paddingBottom:
      Platform.OS === "ios"
        ? ResponsiveTheme.spacing.lg
        : ResponsiveTheme.spacing.xl,
    backgroundColor: "transparent",
  },
  buttonRow: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  backButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    minWidth: 100,
    minHeight: 52,
  },
  backButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  nextButtonCompact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    backgroundColor: ResponsiveTheme.colors.primary,
    minHeight: 52,
  },
  nextButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: "#FFFFFF",
    marginRight: ResponsiveTheme.spacing.xs,
  },
});

export default DietPreferencesTab;
