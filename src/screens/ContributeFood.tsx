/**
 * ContributeFood - Submit macros for unknown barcodes
 *
 * Allows users to contribute nutrition data for products not found in the database.
 * Direct Supabase insert to user_food_contributions table.
 * RLS policy requires user_id = auth.uid() — always set from supabase.auth.getUser().
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import { colors, spacing, borderRadius } from "../theme/aurora-tokens";
import { rf, rw, rh, rp, rbr } from "../utils/responsive";
import { AuroraBackground } from "../components/ui/aurora";
import { AnimatedPressable } from "../components/ui/aurora";
import { AuroraSpinner } from "../components/ui/aurora";
import { EmptyState } from "../components/ui/aurora";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContributeFoodRouteParams {
  barcode: string;
}

interface ContributeFoodProps {
  route: {
    params: ContributeFoodRouteParams;
  };
  navigation: {
    goBack: () => void;
  };
}

interface FormData {
  productName: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  brand: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

interface FormErrors {
  productName?: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parsePositiveFloat = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = parseFloat(trimmed);
  if (isNaN(parsed)) return null;
  return parsed;
};

const validateForm = (data: FormData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.productName.trim()) {
    errors.productName = "Product name is required";
  }

  const calories = parsePositiveFloat(data.calories);
  if (data.calories.trim() === "") {
    errors.calories = "Calories are required";
  } else if (calories === null) {
    errors.calories = "Must be a valid number";
  } else if (calories < 0 || calories > 900) {
    errors.calories = "Must be between 0 and 900 kcal";
  }

  const protein = parsePositiveFloat(data.protein);
  if (data.protein.trim() === "") {
    errors.protein = "Protein is required";
  } else if (protein === null) {
    errors.protein = "Must be a valid number";
  } else if (protein < 0 || protein > 100) {
    errors.protein = "Must be between 0 and 100 g";
  }

  const carbs = parsePositiveFloat(data.carbs);
  if (data.carbs.trim() === "") {
    errors.carbs = "Carbs are required";
  } else if (carbs === null) {
    errors.carbs = "Must be a valid number";
  } else if (carbs < 0 || carbs > 100) {
    errors.carbs = "Must be between 0 and 100 g";
  }

  const fat = parsePositiveFloat(data.fat);
  if (data.fat.trim() === "") {
    errors.fat = "Fat is required";
  } else if (fat === null) {
    errors.fat = "Must be a valid number";
  } else if (fat < 0 || fat > 100) {
    errors.fat = "Must be between 0 and 100 g";
  }

  return errors;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad";
  error?: string;
  unit?: string;
  required?: boolean;
}

const FormField: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  error,
  unit,
  required = false,
}) => (
  <View style={fieldStyles.container}>
    <View style={fieldStyles.labelRow}>
      <Text style={fieldStyles.label}>
        {label}
        {required && <Text style={fieldStyles.required}> *</Text>}
      </Text>
      {unit && <Text style={fieldStyles.unit}>{unit}</Text>}
    </View>
    <TextInput
      style={[fieldStyles.input, error ? fieldStyles.inputError : null]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text.tertiary}
      keyboardType={keyboardType}
      autoCorrect={false}
      autoCapitalize={keyboardType === "default" ? "words" : "none"}
      returnKeyType="next"
    />
    {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
  </View>
);

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: rp(16),
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(6),
  },
  label: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text.primary,
  },
  required: {
    color: colors.error.light,
  },
  unit: {
    fontSize: rf(12),
    color: colors.text.secondary,
  },
  input: {
    backgroundColor: colors.glass.backgroundDark,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: rbr(borderRadius.lg),
    paddingHorizontal: rp(14),
    paddingVertical: rp(12),
    fontSize: rf(15),
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error.light,
  },
  errorText: {
    marginTop: rp(4),
    fontSize: rf(12),
    color: colors.error.light,
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export const ContributeFood: React.FC<ContributeFoodProps> = ({
  route,
  navigation,
}) => {
  const barcode = route.params?.barcode ?? "";

  const [formData, setFormData] = useState<FormData>({
    productName: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    brand: "",
    fiber: "",
    sugar: "",
    sodium: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field: keyof FormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSubmitError("You must be signed in to submit a contribution.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("user_food_contributions").insert({
        user_id: user.id,
        name: formData.productName.trim(),
        brand: formData.brand.trim() || null,
        calories: parsePositiveFloat(formData.calories),
        protein_g: parsePositiveFloat(formData.protein),
        carbs_g: parsePositiveFloat(formData.carbs),
        fat_g: parsePositiveFloat(formData.fat),
        fiber_g: parsePositiveFloat(formData.fiber) ?? null,
        extra_data: {
          barcode: barcode || null,
          sugar: parsePositiveFloat(formData.sugar) ?? null,
          sodium: parsePositiveFloat(formData.sodium) ?? null,
        },
      });

      if (error) {
        throw error;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to submit. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Success state ----
  if (submitted) {
    return (
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.successContainer}>
            <EmptyState
              icon="checkmark-circle"
              iconColor={colors.success.DEFAULT}
              title="Thank you!"
              subtitle="Your contribution will be reviewed and added to the database soon."
              ctaText="Go Back"
              onCta={() => navigation.goBack()}
            />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // ---- Form state ----
  return (
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable
              style={styles.headerBackBtn}
              onPress={() => navigation.goBack()}
              scaleValue={0.9}
              springConfig="snappy"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="chevron-back"
                size={rf(22)}
                color={colors.text.primary}
              />
            </AnimatedPressable>
            <View style={styles.headerCenter}>
              <Ionicons
                name="add-circle-outline"
                size={rf(18)}
                color={colors.primary.DEFAULT}
              />
              <Text style={styles.headerTitle}>Add Missing Food</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Barcode badge */}
            <View style={styles.barcodeBadgeRow}>
              <Ionicons
                name="barcode-outline"
                size={rf(16)}
                color={colors.primary.DEFAULT}
              />
              <View style={styles.barcodeBadge}>
                <Text style={styles.barcodeBadgeLabel}>Barcode</Text>
                <Text style={styles.barcodeBadgeValue} numberOfLines={1}>
                  {barcode || "—"}
                </Text>
              </View>
            </View>

            <Text style={styles.hint}>
              Help the community by filling in the nutrition info for this
              product. Values per 100 g / 100 ml.
            </Text>

            {/* ---- Required section ---- */}
            <View style={styles.sectionHeader}>
              <Ionicons
                name="star-outline"
                size={rf(13)}
                color={colors.primary.DEFAULT}
              />
              <Text style={styles.sectionTitle}>Required</Text>
            </View>

            <FormField
              label="Product Name"
              value={formData.productName}
              onChangeText={updateField("productName")}
              placeholder="e.g. Greek Yogurt"
              error={errors.productName}
              required
            />
            <FormField
              label="Calories"
              value={formData.calories}
              onChangeText={updateField("calories")}
              placeholder="0–900"
              keyboardType="decimal-pad"
              unit="kcal / 100g"
              error={errors.calories}
              required
            />
            <FormField
              label="Protein"
              value={formData.protein}
              onChangeText={updateField("protein")}
              placeholder="0–100"
              keyboardType="decimal-pad"
              unit="g / 100g"
              error={errors.protein}
              required
            />
            <FormField
              label="Carbohydrates"
              value={formData.carbs}
              onChangeText={updateField("carbs")}
              placeholder="0–100"
              keyboardType="decimal-pad"
              unit="g / 100g"
              error={errors.carbs}
              required
            />
            <FormField
              label="Fat"
              value={formData.fat}
              onChangeText={updateField("fat")}
              placeholder="0–100"
              keyboardType="decimal-pad"
              unit="g / 100g"
              error={errors.fat}
              required
            />

            {/* ---- Optional section ---- */}
            <View style={styles.sectionHeader}>
              <Ionicons
                name="information-circle-outline"
                size={rf(13)}
                color={colors.text.secondary}
              />
              <Text style={[styles.sectionTitle, styles.sectionTitleSecondary]}>
                Optional
              </Text>
            </View>

            <FormField
              label="Brand"
              value={formData.brand}
              onChangeText={updateField("brand")}
              placeholder="e.g. Nestlé"
            />
            <FormField
              label="Fiber"
              value={formData.fiber}
              onChangeText={updateField("fiber")}
              placeholder="0–100"
              keyboardType="decimal-pad"
              unit="g / 100g"
            />
            <FormField
              label="Sugar"
              value={formData.sugar}
              onChangeText={updateField("sugar")}
              placeholder="0–100"
              keyboardType="decimal-pad"
              unit="g / 100g"
            />
            <FormField
              label="Sodium"
              value={formData.sodium}
              onChangeText={updateField("sodium")}
              placeholder="0–10"
              keyboardType="decimal-pad"
              unit="g / 100g"
            />

            {/* Submit error */}
            {submitError ? (
              <View style={styles.submitErrorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={rf(16)}
                  color={colors.error.light}
                />
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            ) : null}

            {/* Submit button */}
            <AnimatedPressable
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              scaleValue={0.97}
              springConfig="smooth"
              hapticType="medium"
              accessibilityRole="button"
              accessibilityLabel="Submit nutrition data"
            >
              {isSubmitting ? (
                <AuroraSpinner size="sm" theme="white" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={rf(18)}
                    color={colors.text.primary}
                  />
                  <Text style={styles.submitBtnText}>
                    Submit Nutrition Data
                  </Text>
                </>
              )}
            </AnimatedPressable>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  headerBackBtn: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(borderRadius.full),
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: colors.text.primary,
  },
  headerSpacer: {
    width: rw(40),
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(20),
    paddingBottom: rp(40),
  },
  // Barcode badge
  barcodeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(10),
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}30`,
    borderRadius: rbr(borderRadius.xl),
    paddingHorizontal: rp(14),
    paddingVertical: rp(12),
    marginBottom: rp(16),
  },
  barcodeBadge: {
    flex: 1,
  },
  barcodeBadgeLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.primary.DEFAULT,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: rp(2),
  },
  barcodeBadgeValue: {
    fontSize: rf(15),
    fontWeight: "500",
    color: colors.text.primary,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    fontSize: rf(13),
    color: colors.text.secondary,
    lineHeight: rf(19),
    marginBottom: rp(20),
  },
  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    marginBottom: rp(14),
    marginTop: rp(4),
  },
  sectionTitle: {
    fontSize: rf(11),
    fontWeight: "700",
    color: colors.primary.DEFAULT,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionTitleSecondary: {
    color: colors.text.secondary,
  },
  // Submit error
  submitErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rp(8),
    backgroundColor: `${colors.error.light}15`,
    borderWidth: 1,
    borderColor: `${colors.error.light}40`,
    borderRadius: rbr(borderRadius.lg),
    padding: rp(12),
    marginBottom: rp(16),
  },
  submitErrorText: {
    flex: 1,
    fontSize: rf(13),
    color: colors.error.light,
    lineHeight: rf(18),
  },
  // Submit button
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(8),
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: rbr(borderRadius.xxl),
    paddingVertical: rp(16),
    marginTop: rp(8),
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: rf(16),
    fontWeight: "700",
    color: colors.text.primary,
  },
  bottomSpacing: {
    height: rh(40),
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: rp(spacing.xl),
  },
});

export default ContributeFood;
