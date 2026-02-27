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
  AnimatedIcon,
} from "../../../components/ui/aurora";
import { gradients } from "../../../theme/gradients";
import {
  PersonalInfoData,
  TabValidationResult,
} from "../../../types/onboarding";
import { usePersonalInfoForm } from "../../../hooks/usePersonalInfoForm";
import { PersonalInfoFields } from "../../../components/onboarding/PersonalInfoFields";
import { LocationFields } from "../../../components/onboarding/LocationFields";
import { LifestyleFields } from "../../../components/onboarding/LifestyleFields";
import { ValidationSummary } from "../../../components/onboarding/ValidationSummary";

interface PersonalInfoTabProps {
  data: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: PersonalInfoData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<PersonalInfoData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
  data,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  isAutoSaving = false,
  isEditingFromReview = false,
  onReturnToReview,
}) => {
  const { state, actions } = usePersonalInfoForm({
    data,
    onUpdate,
    validationResult,
  });

  const {
    formData,
    availableStates,
    showCustomCountry,
    customCountry,
    showWakeTimePicker,
    showSleepTimePicker,
  } = state;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <HeroSection
            image={{
              uri: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
            }}
            overlayGradient={gradients.overlay.dark}
            contentPosition="center"
            minHeight={180}
            maxHeight={260}
          >
            <View style={styles.avatarContainer}>
              <AnimatedIcon
                icon={
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={rf(32)} color="#FFFFFF" />
                  </View>
                }
                animationType="pulse"
                continuous={true}
                animationDuration={1500}
                size={rf(80)}
              />
            </View>

            <Text style={styles.title} numberOfLines={1}>
              Tell us about yourself
            </Text>
            <Text
              style={styles.subtitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              This helps us create a personalized fitness plan just for you
            </Text>

            {isAutoSaving && (
              <View style={styles.autoSaveIndicator}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={rf(16)}
                  color={ResponsiveTheme.colors.success}
                />
                <Text style={styles.autoSaveText} numberOfLines={1}>
                  Saving...
                </Text>
              </View>
            )}
          </HeroSection>

          <View style={styles.content}>
            <AnimatedSection delay={0}>
              <PersonalInfoFields formData={formData} actions={actions} />
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <LocationFields
                formData={formData}
                availableStates={availableStates}
                showCustomCountry={showCustomCountry}
                customCountry={customCountry}
                actions={actions}
              />
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <LifestyleFields
                formData={formData}
                showWakeTimePicker={showWakeTimePicker}
                showSleepTimePicker={showSleepTimePicker}
                actions={actions}
              />
            </AnimatedSection>
          </View>

          {validationResult && (
            <ValidationSummary
              validationResult={validationResult}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
              const finalData =
                showCustomCountry && customCountry
                  ? { ...formData, country: customCountry }
                  : formData;
              onUpdate(finalData);
              if (isEditingFromReview && onReturnToReview) {
                onReturnToReview();
              } else {
                onNext(finalData);
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
    textAlign: "center",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: ResponsiveTheme.fontSize.md * 1.5,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
    flexShrink: 1,
  },
  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
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
  avatarContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  avatarCircle: {
    width: rf(80),
    height: rf(80),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
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
    shadowColor: ResponsiveTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    boxShadow: '0px 4px 8px rgba(255, 107, 53, 0.3)',
    elevation: 4,
  },
  nextButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: "#FFFFFF",
    marginRight: ResponsiveTheme.spacing.xs,
  },
});

export default PersonalInfoTab;
