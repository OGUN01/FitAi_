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
                  color={colors.success}
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
    padding: spacing.lg,
    paddingBottom:
      Platform.OS === "ios"
        ? spacing.lg
        : spacing.xl,
    backgroundColor: "transparent",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  backButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
    minHeight: 52,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  nextButtonCompact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    minHeight: 52,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
    marginRight: spacing.xs,
  },
});

export default DietPreferencesTab;
