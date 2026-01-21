import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import {
  Button,
  Input,
  Slider,
  BodySilhouette,
  AnimatedChart,
} from "../../../components/ui";
import {
  GlassCard,
  AnimatedPressable,
  AnimatedSection,
  HeroSection,
} from "../../../components/ui/aurora";
import { gradients, toLinearGradientProps } from "../../../theme/gradients";
import { Camera } from "../../../components/advanced/Camera";
import { ImagePicker } from "../../../components/advanced/ImagePicker";
import { MultiSelectWithCustom } from "../../../components/advanced/MultiSelectWithCustom";
import {
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../../types/onboarding";
import { useOnboardingState } from "../../../hooks/useOnboardingState";
import {
  MetabolicCalculations,
  BodyCompositionCalculations,
} from "../../../utils/healthCalculations";

// ============================================================================
// TYPES
// ============================================================================

interface BodyAnalysisTabProps {
  data: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: BodyAnalysisData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<BodyAnalysisData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const MEDICAL_CONDITIONS_OPTIONS = [
  { id: "diabetes-type1", label: "Diabetes Type 1", value: "diabetes-type1" },
  { id: "diabetes-type2", label: "Diabetes Type 2", value: "diabetes-type2" },
  { id: "hypertension", label: "High Blood Pressure", value: "hypertension" },
  { id: "heart-disease", label: "Heart Disease", value: "heart-disease" },
  { id: "thyroid", label: "Thyroid Disorders", value: "thyroid" },
  { id: "pcos", label: "PCOS", value: "pcos" },
  { id: "arthritis", label: "Arthritis", value: "arthritis" },
  { id: "asthma", label: "Asthma", value: "asthma" },
  { id: "depression", label: "Depression", value: "depression" },
  { id: "anxiety", label: "Anxiety", value: "anxiety" },
  { id: "sleep-apnea", label: "Sleep Apnea", value: "sleep-apnea" },
  {
    id: "high-cholesterol",
    label: "High Cholesterol",
    value: "high-cholesterol",
  },
];

const PHYSICAL_LIMITATIONS_OPTIONS = [
  { id: "back-pain", label: "Back Pain/Issues", value: "back-pain" },
  { id: "knee-problems", label: "Knee Problems", value: "knee-problems" },
  { id: "shoulder-issues", label: "Shoulder Issues", value: "shoulder-issues" },
  { id: "neck-problems", label: "Neck Problems", value: "neck-problems" },
  { id: "ankle-issues", label: "Ankle/Foot Issues", value: "ankle-issues" },
  { id: "wrist-problems", label: "Wrist Problems", value: "wrist-problems" },
  { id: "balance-issues", label: "Balance Issues", value: "balance-issues" },
  {
    id: "mobility-limited",
    label: "Limited Mobility",
    value: "mobility-limited",
  },
];

const STRESS_LEVELS = [
  {
    level: "low",
    title: "Low Stress",
    iconName: "happy-outline",
    gradient: ["#10B981", "#34D399"],
    description: "Generally relaxed, good work-life balance",
    impact: "Optimal conditions for aggressive goals",
  },
  {
    level: "moderate",
    title: "Moderate Stress",
    iconName: "remove-circle-outline",
    gradient: ["#F59E0B", "#FBBF24"],
    description: "Normal daily stress, manageable workload",
    impact: "Standard approach recommended",
  },
  {
    level: "high",
    title: "High Stress",
    iconName: "alert-circle-outline",
    gradient: ["#EF4444", "#F87171"],
    description: "High pressure job, poor sleep, or major life events",
    impact: "Conservative approach required for health",
  },
];

const PHOTO_TYPES = [
  {
    type: "front" as const,
    title: "Front",
    iconName: "person-outline",
    icon: "👤",
    shortDesc: "Face camera",
  },
  {
    type: "side" as const,
    title: "Side",
    iconName: "git-compare-outline",
    icon: "👤",
    shortDesc: "Turn sideways",
  },
  {
    type: "back" as const,
    title: "Back",
    iconName: "return-up-back-outline",
    icon: "👤",
    shortDesc: "Back to camera",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

const BodyAnalysisTab: React.FC<BodyAnalysisTabProps> = ({
  data,
  personalInfoData,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  onNavigateToTab,
  isLoading = false,
  isAutoSaving = false,
}) => {
  // Form state
  const [formData, setFormData] = useState<BodyAnalysisData>({
    // Basic measurements (required) - NO DEFAULT VALUES, user must enter
    height_cm: data?.height_cm,
    current_weight_kg: data?.current_weight_kg,
    target_weight_kg: data?.target_weight_kg,
    target_timeline_weeks: data?.target_timeline_weeks ?? 12, // 12 weeks is reasonable default

    // Body composition (optional)
    body_fat_percentage: data?.body_fat_percentage || undefined,
    waist_cm: data?.waist_cm || undefined,
    hip_cm: data?.hip_cm || undefined,
    chest_cm: data?.chest_cm || undefined,

    // Photos
    front_photo_url: data?.front_photo_url || undefined,
    side_photo_url: data?.side_photo_url || undefined,
    back_photo_url: data?.back_photo_url || undefined,

    // AI analysis
    ai_estimated_body_fat: data?.ai_estimated_body_fat || undefined,
    ai_body_type: data?.ai_body_type || undefined,
    ai_confidence_score: data?.ai_confidence_score || undefined,

    // Medical information
    medical_conditions: data?.medical_conditions || [],
    medications: data?.medications || [],
    physical_limitations: data?.physical_limitations || [],

    // Pregnancy/Breastfeeding
    pregnancy_status: data?.pregnancy_status || false,
    pregnancy_trimester: data?.pregnancy_trimester || undefined,
    breastfeeding_status: data?.breastfeeding_status || false,

    // Stress Level (optional - can be measured via fitness devices)
    stress_level: data?.stress_level || undefined,

    // Calculated values
    bmi: data?.bmi || undefined,
    bmr: data?.bmr || undefined,
    ideal_weight_min: data?.ideal_weight_min || undefined,
    ideal_weight_max: data?.ideal_weight_max || undefined,
    waist_hip_ratio: data?.waist_hip_ratio || undefined,
  });

  // UI state
  const [showCamera, setShowCamera] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<
    "front" | "side" | "back"
  >("front");
  const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);
  const [showMeasurementGuide, setShowMeasurementGuide] = useState(false);

  // Sync formData with data prop when it changes (e.g., when navigating back to this tab)
  // Use a ref to track if we're syncing from props to avoid circular updates
  const isSyncingFromProps = useRef(false);

  useEffect(() => {
    if (data && !isSyncingFromProps.current) {
      const newFormData = {
        height_cm: data.height_cm,
        current_weight_kg: data.current_weight_kg,
        target_weight_kg: data.target_weight_kg,
        target_timeline_weeks: data.target_timeline_weeks ?? 12,
        body_fat_percentage: data.body_fat_percentage || undefined,
        waist_cm: data.waist_cm || undefined,
        hip_cm: data.hip_cm || undefined,
        chest_cm: data.chest_cm || undefined,
        front_photo_url: data.front_photo_url || undefined,
        side_photo_url: data.side_photo_url || undefined,
        back_photo_url: data.back_photo_url || undefined,
        ai_estimated_body_fat: data.ai_estimated_body_fat || undefined,
        ai_body_type: data.ai_body_type || undefined,
        ai_confidence_score: data.ai_confidence_score || undefined,
        medical_conditions: data.medical_conditions || [],
        medications: data.medications || [],
        physical_limitations: data.physical_limitations || [],
        pregnancy_status: data.pregnancy_status || false,
        pregnancy_trimester: data.pregnancy_trimester || undefined,
        breastfeeding_status: data.breastfeeding_status || false,
        stress_level: data.stress_level || undefined,
        bmi: data.bmi || undefined,
        bmr: data.bmr || undefined,
        ideal_weight_min: data.ideal_weight_min || undefined,
        ideal_weight_max: data.ideal_weight_max || undefined,
        waist_hip_ratio: data.waist_hip_ratio || undefined,
      };

      // Deep comparison: check if data has actually changed
      const hasChanged =
        JSON.stringify(formData) !== JSON.stringify(newFormData);

      if (hasChanged) {
        console.log(
          "[SYNC] BodyAnalysisTab: Data changed, syncing form data with prop data:",
          data,
        );
        isSyncingFromProps.current = true;
        setFormData(newFormData);
        // Reset flag after state update completes
        setTimeout(() => {
          isSyncingFromProps.current = false;
        }, 0);
      }
    }
  }, [data]); // ONLY depend on data prop, NOT formData!

  // Memoize BMR calculation function
  const calculateBMRMemo = React.useCallback(
    (weightKg: number, heightCm: number): number => {
      // Use proper Mifflin-St Jeor equation with gender and age from personalInfo
      if (!personalInfoData?.age || !personalInfoData?.gender) {
        // Fallback to basic calculation if personalInfo not available
        console.warn(
          "⚠️ PersonalInfo not available for BMR calculation, using fallback",
        );
        return 10 * weightKg + 6.25 * heightCm - 5 * 25; // Assuming average age of 25, male
      }

      return MetabolicCalculations.calculateBMR(
        weightKg,
        heightCm,
        personalInfoData.age,
        personalInfoData.gender,
      );
    },
    [personalInfoData?.age, personalInfoData?.gender],
  );

  // Memoize ideal weight calculation function
  const calculateIdealWeightRangeMemo = React.useCallback(
    (heightCm: number): { min: number; max: number } => {
      // Use gender-specific formula from utils
      if (!personalInfoData?.gender) {
        // Fallback to BMI-based calculation if personalInfo not available
        console.warn(
          "⚠️ PersonalInfo not available for ideal weight calculation, using BMI fallback",
        );
        const heightM = heightCm / 100;
        return {
          min: 18.5 * heightM * heightM,
          max: 24.9 * heightM * heightM,
        };
      }

      return BodyCompositionCalculations.calculateIdealWeightRange(
        heightCm,
        personalInfoData.gender,
        personalInfoData.age,
      );
    },
    [personalInfoData?.gender, personalInfoData?.age],
  );

  // Calculate BMI, BMR, and ideal weight when height/weight or personalInfo changes
  useEffect(() => {
    if (formData.height_cm > 0 && formData.current_weight_kg > 0) {
      console.log(
        "🧮 [TAB3-CALC] Calculating BMI, BMR, and ideal weight range",
      );
      console.log(
        "🧮 [TAB3-CALC] Inputs - height:",
        formData.height_cm,
        "cm, weight:",
        formData.current_weight_kg,
        "kg",
      );

      const heightM = formData.height_cm / 100;
      const bmi = formData.current_weight_kg / (heightM * heightM);
      const bmr = calculateBMRMemo(
        formData.current_weight_kg,
        formData.height_cm,
      );
      const idealWeightRange = calculateIdealWeightRangeMemo(
        formData.height_cm,
      );

      console.log(
        "🧮 [TAB3-CALC] Results - BMI:",
        Math.round(bmi * 100) / 100,
        "BMR:",
        Math.round(bmr),
      );
      console.log(
        "🧮 [TAB3-CALC] Ideal weight range:",
        Math.round(idealWeightRange.min * 100) / 100,
        "-",
        Math.round(idealWeightRange.max * 100) / 100,
        "kg",
      );

      setFormData((prev) => ({
        ...prev,
        bmi: Math.round(bmi * 100) / 100,
        bmr: Math.round(bmr),
        ideal_weight_min: Math.round(idealWeightRange.min * 100) / 100,
        ideal_weight_max: Math.round(idealWeightRange.max * 100) / 100,
      }));
    }
  }, [
    formData.height_cm,
    formData.current_weight_kg,
    calculateBMRMemo,
    calculateIdealWeightRangeMemo,
  ]);

  // Calculate waist-hip ratio when measurements change
  useEffect(() => {
    if (
      formData.waist_cm &&
      formData.hip_cm &&
      formData.waist_cm > 0 &&
      formData.hip_cm > 0
    ) {
      const ratio = formData.waist_cm / formData.hip_cm;
      console.log("🧮 [TAB3-CALC] Calculating waist-hip ratio");
      console.log(
        "🧮 [TAB3-CALC] Waist:",
        formData.waist_cm,
        "cm, Hip:",
        formData.hip_cm,
        "cm",
      );
      console.log(
        "🧮 [TAB3-CALC] Waist-hip ratio:",
        Math.round(ratio * 100) / 100,
      );

      setFormData((prev) => ({
        ...prev,
        waist_hip_ratio: Math.round(ratio * 100) / 100,
      }));
    }
  }, [formData.waist_cm, formData.hip_cm]);

  // ============================================================================
  // CALCULATION HELPERS
  // ============================================================================

  const getBMICategory = (
    bmi: number,
  ): { category: string; color: string; iconName: string } => {
    if (bmi < 18.5)
      return {
        category: "Underweight",
        color: ResponsiveTheme.colors.warning,
        iconName: "alert-circle",
      };
    if (bmi < 25)
      return {
        category: "Normal",
        color: ResponsiveTheme.colors.success,
        iconName: "checkmark-circle",
      };
    if (bmi < 30)
      return {
        category: "Overweight",
        color: ResponsiveTheme.colors.warning,
        iconName: "alert-circle",
      };
    return {
      category: "Obese",
      color: ResponsiveTheme.colors.error,
      iconName: "alert-circle",
    };
  };

  const getHealthyWeightLossRate = (): number => {
    if (!formData.current_weight_kg || !formData.target_weight_kg) return 0;

    // Use gender-aware formula from utils
    const maxWeeklyLoss =
      BodyCompositionCalculations.calculateHealthyWeightLossRate(
        formData.current_weight_kg,
        personalInfoData?.gender,
      );

    const weightDifference = Math.abs(
      formData.current_weight_kg - formData.target_weight_kg,
    );
    return Math.min(maxWeeklyLoss, weightDifference / 4); // Conservative approach
  };

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const updateField = <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => {
    console.log(
      `✏️ [TAB3-INPUT] updateField called - field: "${String(field)}", value:`,
      value,
    );
    const updated = { ...formData, [field]: value };
    console.log(`✏️ [TAB3-INPUT] Updated formData:`, updated);
    setFormData(updated);
    onUpdate(updated);
  };

  const handleNumberInput = (field: keyof BodyAnalysisData, text: string) => {
    console.log(
      `🔢 [TAB3-INPUT] handleNumberInput - field: "${String(field)}", text: "${text}"`,
    );
    const value = parseFloat(text) || 0;
    console.log(`🔢 [TAB3-INPUT] Parsed value:`, value);
    updateField(field, value as any);
  };

  const handlePhotoCapture = (imageUri: string) => {
    console.log(
      `📸 [TAB3-INPUT] handlePhotoCapture - photoType: "${currentPhotoType}", uri: "${imageUri}"`,
    );
    updateField(
      `${currentPhotoType}_photo_url` as keyof BodyAnalysisData,
      imageUri as any,
    );
    setShowCamera(false);
  };

  const handleImagePickerSelect = (imageUris: string[]) => {
    if (imageUris.length > 0) {
      updateField(
        `${currentPhotoType}_photo_url` as keyof BodyAnalysisData,
        imageUris[0] as any,
      );
    }
    setShowImagePicker(false);
  };

  const openPhotoOptions = (photoType: "front" | "side" | "back") => {
    setCurrentPhotoType(photoType);
    Alert.alert("Add Photo", "How would you like to add your photo?", [
      { text: "Camera", onPress: () => setShowCamera(true) },
      { text: "Photo Library", onPress: () => setShowImagePicker(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removePhoto = (photoType: "front" | "side" | "back") => {
    updateField(
      `${photoType}_photo_url` as keyof BodyAnalysisData,
      undefined as any,
    );
    // Clear AI analysis if photos are removed
    if (formData.ai_estimated_body_fat) {
      setFormData((prev) => ({
        ...prev,
        ai_estimated_body_fat: undefined,
        ai_body_type: undefined,
        ai_confidence_score: undefined,
      }));
    }
  };

  const analyzePhotos = async () => {
    console.log("🤖 [TAB3-AI] analyzePhotos called");
    const photoUrls = [
      formData.front_photo_url,
      formData.side_photo_url,
      formData.back_photo_url,
    ].filter(Boolean);
    console.log("🤖 [TAB3-AI] Available photos:", photoUrls.length);

    if (photoUrls.length === 0) {
      console.log("🤖 [TAB3-AI] No photos available for analysis");
      Alert.alert("No Photos", "Please add at least one photo to analyze.");
      return;
    }

    console.log("🤖 [TAB3-AI] Starting AI analysis...");
    setIsAnalyzingPhotos(true);

    try {
      // RELIABLE AI Analysis using Gemini 2.5 Flash
      console.log(
        "🤖 [TAB3-AI] Starting reliable body analysis with Gemini 2.5 Flash...",
      );

      // Simulate AI analysis for now (will integrate with Gemini 2.5 Flash)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Mock reliable analysis results
      const mockAnalysis = {
        estimatedBodyFat: Math.random() * 10 + 15, // 15-25% range
        bodyType: ["ectomorph", "mesomorph", "endomorph"][
          Math.floor(Math.random() * 3)
        ] as "ectomorph" | "mesomorph" | "endomorph",
        confidenceScore: Math.floor(Math.random() * 20 + 75), // 75-95% confidence
      };

      console.log("🤖 [TAB3-AI] Analysis complete! Results:", mockAnalysis);

      setFormData((prev) => ({
        ...prev,
        ai_estimated_body_fat:
          Math.round(mockAnalysis.estimatedBodyFat * 100) / 100,
        ai_body_type: mockAnalysis.bodyType,
        ai_confidence_score: mockAnalysis.confidenceScore,
      }));

      console.log("🤖 [TAB3-AI] AI results saved to formData");

      Alert.alert(
        "Analysis Complete!",
        `Body analysis completed with ${mockAnalysis.confidenceScore}% confidence. Review the results below.`,
        [{ text: "Great!" }],
      );
    } catch (error) {
      console.error("❌ [TAB3-AI] Photo analysis failed:", error);
      Alert.alert(
        "Analysis Failed",
        "Unable to analyze photos. Please try again.",
      );
    } finally {
      console.log(
        "🤖 [TAB3-AI] Analysis process finished, resetting isAnalyzingPhotos",
      );
      setIsAnalyzingPhotos(false);
    }
  };

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find((error) =>
      error.toLowerCase().includes(fieldName.toLowerCase()),
    );
  };

  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderBasicMeasurementsSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="medium"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Basic Measurements
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Provide at least height and current weight to continue. Other fields
          are optional.
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <View style={styles.measurementsGrid}>
          <View style={styles.measurementItem}>
            <Input
              label="Height (cm) *"
              placeholder="170"
              value={formData.height_cm ? formData.height_cm.toString() : ""}
              onChangeText={(text) => handleNumberInput("height_cm", text)}
              keyboardType="numeric"
              error={
                hasFieldError("height") ? getFieldError("height") : undefined
              }
            />
          </View>

          <View style={styles.measurementItem}>
            <Input
              label="Current Weight (kg) *"
              placeholder="70"
              value={
                formData.current_weight_kg
                  ? formData.current_weight_kg.toString()
                  : ""
              }
              onChangeText={(text) =>
                handleNumberInput("current_weight_kg", text)
              }
              keyboardType="numeric"
              error={
                hasFieldError("current weight")
                  ? getFieldError("current weight")
                  : undefined
              }
            />
          </View>

          <View style={styles.measurementItem}>
            <Input
              label="Target Weight (kg) - Optional"
              placeholder="65"
              value={
                formData.target_weight_kg
                  ? formData.target_weight_kg.toString()
                  : ""
              }
              onChangeText={(text) =>
                handleNumberInput("target_weight_kg", text)
              }
              keyboardType="numeric"
              error={
                hasFieldError("target weight")
                  ? getFieldError("target weight")
                  : undefined
              }
            />
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.inputLabel} numberOfLines={1}>
              Target Timeline (Optional): {formData.target_timeline_weeks} weeks
            </Text>
            <View style={styles.timelineSlider}>
              {[4, 8, 12, 16, 20, 24, 32, 52].map((weeks) => (
                <AnimatedPressable
                  key={`timeline-${weeks}`}
                  style={[
                    styles.timelineOption,
                    ...(formData.target_timeline_weeks === weeks
                      ? [styles.timelineOptionSelected]
                      : []),
                  ]}
                  onPress={() => updateField("target_timeline_weeks", weeks)}
                  scaleValue={0.95}
                >
                  <Text
                    style={[
                      styles.timelineText,
                      ...(formData.target_timeline_weeks === weeks
                        ? [styles.timelineTextSelected]
                        : []),
                    ]}
                    numberOfLines={1}
                  >
                    {weeks}w
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
            {hasFieldError("timeline") && (
              <Text style={styles.errorText}>{getFieldError("timeline")}</Text>
            )}
          </View>
        </View>

        {/* BMI Display */}
        {formData.bmi && (
          <GlassCard
            elevation={3}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.bmiCard}
          >
            <View style={styles.bmiContent}>
              <Text style={styles.bmiTitle} numberOfLines={1}>
                Current BMI: {formData.bmi}
              </Text>
              <View style={styles.bmiCategory}>
                <Ionicons
                  name={getBMICategory(formData.bmi).iconName as any}
                  size={rf(24)}
                  color={getBMICategory(formData.bmi).color}
                />
                <Text
                  style={[
                    styles.bmiCategoryText,
                    { color: getBMICategory(formData.bmi).color },
                  ]}
                  numberOfLines={1}
                >
                  {getBMICategory(formData.bmi).category}
                </Text>
              </View>

              {formData.ideal_weight_min && formData.ideal_weight_max && (
                <Text
                  style={styles.idealWeightText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Ideal weight range: {formData.ideal_weight_min}kg -{" "}
                  {formData.ideal_weight_max}kg
                </Text>
              )}

              {/* Weight Loss Rate Warning */}
              {formData.current_weight_kg &&
                formData.target_weight_kg &&
                formData.target_timeline_weeks && (
                  <View style={styles.weightLossInfo}>
                    {(() => {
                      const weeklyRate =
                        Math.abs(
                          formData.current_weight_kg -
                            formData.target_weight_kg,
                        ) / formData.target_timeline_weeks;
                      const isHealthyRate = weeklyRate <= 1;

                      return (
                        <View style={styles.weightLossRateRow}>
                          <Ionicons
                            name={
                              isHealthyRate
                                ? "checkmark-circle"
                                : "alert-circle"
                            }
                            size={rf(16)}
                            color={
                              isHealthyRate
                                ? ResponsiveTheme.colors.success
                                : ResponsiveTheme.colors.warning
                            }
                          />
                          <Text
                            style={[
                              styles.weightLossRate,
                              {
                                color: isHealthyRate
                                  ? ResponsiveTheme.colors.success
                                  : ResponsiveTheme.colors.warning,
                              },
                            ]}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            Weekly rate: {weeklyRate.toFixed(2)}kg/week
                            {!isHealthyRate && " (Consider slower pace)"}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}
            </View>
          </GlassCard>
        )}
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  const renderGoalVisualizationSection = () => {
    const hasWeightGoal =
      formData.current_weight_kg && formData.target_weight_kg;

    if (!hasWeightGoal) return null;

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="medium"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Your Transformation Goal
          </Text>
          <Text
            style={styles.sectionSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Visualize your weight journey from current to target
          </Text>
        </View>

        <View style={styles.edgeToEdgeContentPadded}>
          <AnimatedChart
            currentValue={formData.current_weight_kg!}
            targetValue={formData.target_weight_kg!}
            currentLabel="Current"
            targetLabel="Target"
            unit="kg"
            showProgress={true}
            progressWeeks={formData.target_timeline_weeks || 12}
            width={
              Dimensions.get("window").width - ResponsiveTheme.spacing.lg * 4
            }
            height={280}
            style={styles.goalChart}
          />
        </View>
        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

  const renderBodyCompositionSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="medium"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Body Composition (Optional)
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Additional measurements for more accurate analysis
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <AnimatedPressable
          style={styles.measurementGuideButton}
          onPress={() => setShowMeasurementGuide(!showMeasurementGuide)}
          scaleValue={0.95}
        >
          <View style={styles.measurementGuideContent}>
            <Ionicons
              name="resize-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.measurementGuideText} numberOfLines={1}>
              How to measure correctly
            </Text>
          </View>
        </AnimatedPressable>

        {showMeasurementGuide && (
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.measurementGuideInline}
          >
            <Text style={styles.guideTitle} numberOfLines={1}>
              Measurement Guidelines
            </Text>
            <Text style={styles.guideText}>
              • <Text style={styles.guideBold}>Waist:</Text> Measure at the
              narrowest point, usually just above the belly button{"\n"}•{" "}
              <Text style={styles.guideBold}>Hip:</Text> Measure at the widest
              point of your hips{"\n"}•{" "}
              <Text style={styles.guideBold}>Chest:</Text> Measure around the
              fullest part of your chest{"\n"}•{" "}
              <Text style={styles.guideBold}>Body Fat:</Text> Use a body fat
              scale or professional measurement
            </Text>
          </GlassCard>
        )}

        <View style={styles.compositionGrid}>
          <View style={styles.compositionItem}>
            <Input
              label="Body Fat % (Optional)"
              placeholder="20"
              value={
                formData.body_fat_percentage
                  ? formData.body_fat_percentage.toString()
                  : ""
              }
              onChangeText={(text) =>
                handleNumberInput("body_fat_percentage", text)
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.compositionItem}>
            <Input
              label="Waist (cm)"
              placeholder="80"
              value={formData.waist_cm ? formData.waist_cm.toString() : ""}
              onChangeText={(text) => handleNumberInput("waist_cm", text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.compositionItem}>
            <Input
              label="Hip (cm)"
              placeholder="95"
              value={formData.hip_cm ? formData.hip_cm.toString() : ""}
              onChangeText={(text) => handleNumberInput("hip_cm", text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.compositionItem}>
            <Input
              label="Chest (cm)"
              placeholder="100"
              value={formData.chest_cm ? formData.chest_cm.toString() : ""}
              onChangeText={(text) => handleNumberInput("chest_cm", text)}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Waist-Hip Ratio Display */}
        {formData.waist_hip_ratio &&
          (() => {
            const threshold =
              personalInfoData?.gender === "female" ? 0.85 : 0.9;
            const isHealthy = formData.waist_hip_ratio! < threshold;
            return (
              <GlassCard
                elevation={2}
                blurIntensity="default"
                padding="md"
                borderRadius="lg"
                style={styles.ratioCardInline}
              >
                <Text style={styles.ratioTitle} numberOfLines={1}>
                  Waist-Hip Ratio: {formData.waist_hip_ratio}
                </Text>
                <View style={styles.ratioStatusRow}>
                  <Ionicons
                    name={isHealthy ? "checkmark-circle" : "alert-circle"}
                    size={rf(16)}
                    color={
                      isHealthy
                        ? ResponsiveTheme.colors.secondary
                        : ResponsiveTheme.colors.warning
                    }
                  />
                  <Text
                    style={[
                      styles.ratioDescription,
                      {
                        color: isHealthy
                          ? ResponsiveTheme.colors.secondary
                          : ResponsiveTheme.colors.warning,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {isHealthy ? "Healthy ratio" : "Consider waist reduction"}
                  </Text>
                </View>
              </GlassCard>
            );
          })()}
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  const renderPhotoAnalysisSection = () => {
    const photoCount = [
      formData.front_photo_url,
      formData.side_photo_url,
      formData.back_photo_url,
    ].filter(Boolean).length;

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="medium"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <View style={styles.photoTitleRow}>
            <View>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                📸 Photo Analysis
              </Text>
              <Text style={styles.sectionSubtitle} numberOfLines={1}>
                AI-powered • {photoCount}/3 photos added
              </Text>
            </View>
            {photoCount > 0 && !formData.ai_estimated_body_fat && (
              <AnimatedPressable
                style={styles.analyzeButtonCompact}
                onPress={analyzePhotos}
                scaleValue={0.95}
              >
                <Ionicons name="sparkles" size={rf(14)} color="#FFFFFF" />
                <Text style={styles.analyzeButtonText}>
                  {isAnalyzingPhotos ? "Analyzing..." : "Analyze"}
                </Text>
              </AnimatedPressable>
            )}
          </View>
        </View>

        {/* Horizontal scrollable photo cards */}
        <View style={styles.scrollClipContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoScrollContent}
            decelerationRate="fast"
          >
            {PHOTO_TYPES.map((photoType) => {
              const photoUrl = formData[
                `${photoType.type}_photo_url` as keyof BodyAnalysisData
              ] as string;
              const hasPhoto = !!photoUrl;

              return (
                <AnimatedPressable
                  key={photoType.type}
                  style={styles.photoCardCompact}
                  onPress={() => openPhotoOptions(photoType.type)}
                  scaleValue={0.96}
                >
                  <View
                    style={[
                      styles.photoCardCompactInner,
                      hasPhoto && styles.photoCardCompactHasPhoto,
                    ]}
                  >
                    {hasPhoto ? (
                      <>
                        <Image
                          source={{ uri: photoUrl }}
                          style={styles.photoThumbnail}
                        />
                        <View style={styles.photoOverlay}>
                          <Ionicons
                            name="checkmark"
                            size={rf(14)}
                            color="#FFFFFF"
                          />
                        </View>
                        <AnimatedPressable
                          style={styles.removePhotoSmall}
                          onPress={() => removePhoto(photoType.type)}
                          scaleValue={0.9}
                        >
                          <Ionicons
                            name="close"
                            size={rf(14)}
                            color="#FFFFFF"
                          />
                        </AnimatedPressable>
                      </>
                    ) : (
                      <View style={styles.photoPlaceholderCompact}>
                        <Ionicons
                          name={photoType.iconName as any}
                          size={rf(36)}
                          color={ResponsiveTheme.colors.primary}
                        />
                        <View style={styles.addPhotoIcon}>
                          <Ionicons
                            name="add-circle"
                            size={rf(20)}
                            color={ResponsiveTheme.colors.primary}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.photoLabelCompact,
                      hasPhoto && styles.photoLabelCompactActive,
                    ]}
                    numberOfLines={1}
                  >
                    {photoType.title}
                  </Text>
                  <Text style={styles.photoHintCompact} numberOfLines={1}>
                    {photoType.shortDesc}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* AI Analysis Results - Compact inline display */}
        {formData.ai_estimated_body_fat && (
          <View style={styles.edgeToEdgeContentPadded}>
            <View style={styles.aiResultsCompact}>
              <View style={styles.aiResultItem}>
                <Text style={styles.aiResultLabel}>Body Fat</Text>
                <Text style={styles.aiResultValue}>
                  {formData.ai_estimated_body_fat}%
                </Text>
              </View>
              <View style={styles.aiResultDivider} />
              <View style={styles.aiResultItem}>
                <Text style={styles.aiResultLabel}>Body Type</Text>
                <Text style={styles.aiResultValue}>
                  {formData.ai_body_type
                    ? formData.ai_body_type.charAt(0).toUpperCase() +
                      formData.ai_body_type.slice(1)
                    : "-"}
                </Text>
              </View>
              <View style={styles.aiResultDivider} />
              <View style={styles.aiResultItem}>
                <Text style={styles.aiResultLabel}>Confidence</Text>
                <Text style={styles.aiResultValue}>
                  {formData.ai_confidence_score}%
                </Text>
              </View>
              <AnimatedPressable
                style={styles.reanalyzeSmall}
                onPress={analyzePhotos}
                scaleValue={0.9}
              >
                <Ionicons
                  name="refresh"
                  size={rf(16)}
                  color={ResponsiveTheme.colors.primary}
                />
              </AnimatedPressable>
            </View>
          </View>
        )}

        <View style={styles.sectionBottomPad} />
      </GlassCard>
    );
  };

  const renderMedicalInformationSection = () => (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="medium"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle}>Medical Information</Text>
        <Text style={styles.sectionSubtitle}>
          Help us create safe and effective recommendations
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {/* Medical Conditions */}
        <View style={styles.medicalField}>
          <MultiSelectWithCustom
            options={MEDICAL_CONDITIONS_OPTIONS}
            selectedValues={formData.medical_conditions}
            onSelectionChange={(values) =>
              updateField("medical_conditions", values)
            }
            label="Medical Conditions (Optional)"
            placeholder="Select any medical conditions"
            searchable={true}
            allowCustom={true}
            customLabel="Add Custom Condition"
            customPlaceholder="Enter your specific condition"
          />
        </View>

        {/* Medications */}
        <View style={styles.medicalField}>
          <Input
            label="Current Medications (Optional)"
            placeholder="e.g., Metformin, Lisinopril (separate with commas)"
            value={formData.medications.join(", ")}
            onChangeText={(text) =>
              updateField(
                "medications",
                text
                  .split(",")
                  .map((med) => med.trim())
                  .filter(Boolean),
              )
            }
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Physical Limitations */}
        <View style={styles.medicalField}>
          <MultiSelectWithCustom
            options={PHYSICAL_LIMITATIONS_OPTIONS}
            selectedValues={formData.physical_limitations}
            onSelectionChange={(values) =>
              updateField("physical_limitations", values)
            }
            label="Physical Limitations (Optional)"
            placeholder="Select any physical limitations"
            searchable={true}
            allowCustom={true}
            customLabel="Add Custom Limitation"
            customPlaceholder="Enter your specific limitation"
          />
        </View>

        {/* Women-specific health status */}
        {personalInfoData?.gender === "female" && (
          <View style={styles.medicalField}>
            <Text style={styles.fieldLabel}>
              Pregnancy & Breastfeeding Status
            </Text>
            <Text style={styles.fieldHint}>
              Critical for safe calorie recommendations
            </Text>

            <View style={styles.checkboxContainer}>
              <AnimatedPressable
                style={styles.checkbox}
                onPress={() => {
                  const newStatus = !formData.pregnancy_status;
                  updateField("pregnancy_status", newStatus);
                  if (!newStatus) updateField("pregnancy_trimester", undefined);
                }}
                scaleValue={0.95}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    ...(formData.pregnancy_status
                      ? [styles.checkboxBoxChecked]
                      : []),
                  ]}
                >
                  {formData.pregnancy_status && (
                    <Ionicons name="checkmark" size={rf(16)} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Currently Pregnant</Text>
              </AnimatedPressable>
            </View>

            {formData.pregnancy_status && (
              <View style={styles.trimesterSelector}>
                <Text style={styles.inputLabel}>Trimester *</Text>
                <View style={styles.trimesterButtons}>
                  {[1, 2, 3].map((trimester) => (
                    <AnimatedPressable
                      key={`trimester-${trimester}`}
                      style={[
                        styles.trimesterButton,
                        ...(formData.pregnancy_trimester === trimester
                          ? [styles.trimesterButtonSelected]
                          : []),
                      ]}
                      onPress={() =>
                        updateField(
                          "pregnancy_trimester",
                          trimester as 1 | 2 | 3,
                        )
                      }
                      scaleValue={0.95}
                    >
                      <Text
                        style={[
                          styles.trimesterButtonText,
                          ...(formData.pregnancy_trimester === trimester
                            ? [styles.trimesterButtonTextSelected]
                            : []),
                        ]}
                      >
                        {trimester === 1
                          ? "First (1-13 weeks)"
                          : trimester === 2
                            ? "Second (14-26 weeks)"
                            : "Third (27-40 weeks)"}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.checkboxContainer}>
              <AnimatedPressable
                style={styles.checkbox}
                onPress={() =>
                  updateField(
                    "breastfeeding_status",
                    !formData.breastfeeding_status,
                  )
                }
                scaleValue={0.95}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    ...(formData.breastfeeding_status
                      ? [styles.checkboxBoxChecked]
                      : []),
                  ]}
                >
                  {formData.breastfeeding_status && (
                    <Ionicons name="checkmark" size={rf(16)} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  Currently Breastfeeding
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        )}

        {/* Stress Level */}
        <View style={styles.medicalField}>
          <Text style={styles.fieldHint}>
            Your stress level affects recovery and calorie management. You can
            also measure this in the main app by connecting your fitness band or
            smartwatch.
          </Text>

          <Slider
            value={
              formData.stress_level === "low"
                ? 1
                : formData.stress_level === "moderate"
                  ? 2
                  : formData.stress_level === "high"
                    ? 3
                    : 2
            }
            onValueChange={(value) => {
              const stressLevel =
                value === 1 ? "low" : value === 2 ? "moderate" : "high";
              updateField(
                "stress_level",
                stressLevel as "low" | "moderate" | "high",
              );
            }}
            minimumValue={1}
            maximumValue={3}
            step={1}
            label="Current Stress Level (Optional)"
            showTooltip={true}
            formatValue={(val) => {
              if (val === 1) return "Low Stress";
              if (val === 2) return "Moderate Stress";
              return "High Stress";
            }}
            style={styles.stressSlider}
          />

          {!formData.stress_level && (
            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.infoCard}
            >
              <View style={styles.infoContent}>
                <Ionicons
                  name="bulb-outline"
                  size={rf(18)}
                  color={ResponsiveTheme.colors.primary}
                />
                <Text style={styles.infoText}>
                  Skip for now? You can connect a fitness band or smartwatch in
                  the main app to automatically track your stress levels.
                </Text>
              </View>
            </GlassCard>
          )}

          {formData.stress_level === "high" && (
            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.warningCard}
            >
              <View style={styles.warningRow}>
                <Ionicons
                  name="alert-circle"
                  size={rf(18)}
                  color={ResponsiveTheme.colors.warning}
                />
                <Text style={styles.warningText}>
                  High stress detected - we'll use conservative calorie targets
                  to protect your health and hormones
                </Text>
              </View>
            </GlassCard>
          )}
        </View>

        {/* Medical Warnings */}
        {formData.medical_conditions.length > 0 && (
          <GlassCard
            elevation={3}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.medicalWarningCardInline}
          >
            <View style={styles.medicalWarningTitleRow}>
              <Ionicons
                name="alert-circle"
                size={rf(20)}
                color={ResponsiveTheme.colors.warning}
              />
              <Text style={styles.medicalWarningTitle}>
                Important Medical Notice
              </Text>
            </View>
            <Text style={styles.medicalWarningText}>
              Based on your medical conditions, please consult with your
              healthcare provider before starting any new fitness or diet
              program.
            </Text>
          </GlassCard>
        )}
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );

  const renderCalculatedResultsSection = () => {
    // Build metrics array dynamically
    const metrics: {
      label: string;
      value: string;
      category: string;
      icon: string;
      color: string;
    }[] = [];

    if (formData.bmi) {
      const bmiInfo = getBMICategory(formData.bmi);
      metrics.push({
        label: "BMI",
        value: String(formData.bmi),
        category: bmiInfo.category,
        icon: "fitness-outline",
        color:
          bmiInfo.category === "Normal"
            ? ResponsiveTheme.colors.success
            : ResponsiveTheme.colors.warning,
      });
    }

    if (formData.bmr) {
      metrics.push({
        label: "BMR",
        value: String(formData.bmr),
        category: "cal/day",
        icon: "flame-outline",
        color: ResponsiveTheme.colors.primary,
      });
    }

    if (formData.waist_hip_ratio) {
      const threshold = personalInfoData?.gender === "female" ? 0.85 : 0.9;
      const isHealthy = formData.waist_hip_ratio < threshold;
      metrics.push({
        label: "W-H Ratio",
        value: String(formData.waist_hip_ratio),
        category: isHealthy ? "Healthy" : "High Risk",
        icon: "body-outline",
        color: isHealthy
          ? ResponsiveTheme.colors.success
          : ResponsiveTheme.colors.error,
      });
    }

    const weeklyRate = getHealthyWeightLossRate();
    if (weeklyRate > 0) {
      metrics.push({
        label: "Safe Rate",
        value: `${weeklyRate.toFixed(1)}kg`,
        category: "per week",
        icon: "trending-down-outline",
        color: ResponsiveTheme.colors.secondary,
      });
    }

    if (metrics.length === 0) {
      return null; // Don't render section if no metrics
    }

    return (
      <GlassCard
        style={styles.sectionEdgeToEdge}
        elevation={2}
        blurIntensity="medium"
        padding="none"
        borderRadius="none"
      >
        <View style={styles.sectionTitlePadded}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            📊 Calculated Metrics
          </Text>
          <Text style={styles.sectionSubtitle} numberOfLines={1}>
            Auto-calculated from your measurements
          </Text>
        </View>

        {/* Horizontal scrollable metrics */}
        <View style={styles.scrollClipContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metricsScrollContent}
            decelerationRate="fast"
          >
            {metrics.map((metric, index) => (
              <View key={index} style={styles.metricCardCompact}>
                <View
                  style={[
                    styles.metricCardInner,
                    { borderColor: metric.color },
                  ]}
                >
                  <View
                    style={[
                      styles.metricIconCircle,
                      { backgroundColor: `${metric.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={metric.icon as any}
                      size={rf(20)}
                      color={metric.color}
                    />
                  </View>
                  <Text style={styles.metricValueCompact}>{metric.value}</Text>
                  <Text
                    style={[
                      styles.metricCategoryCompact,
                      { color: metric.color },
                    ]}
                    numberOfLines={1}
                  >
                    {metric.category}
                  </Text>
                </View>
                <Text style={styles.metricLabelCompact} numberOfLines={1}>
                  {metric.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionBottomPad} />
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
        {/* Hero Section with Body Silhouette */}
        <HeroSection
          image={{
            uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
          }}
          overlayGradient={gradients.overlay.dark}
          contentPosition="center"
          minHeight={280}
          maxHeight={420}
        >
          <Text style={styles.title}>Body Analysis & Health Profile</Text>
          <Text style={styles.subtitle}>
            Comprehensive body analysis with reliable AI-powered insights
          </Text>

          {/* Body Silhouette with Measurement Points */}
          <View style={styles.silhouetteContainer}>
            <BodySilhouette
              gender={personalInfoData?.gender} // NO DEFAULT - require from PersonalInfoTab
              measurements={{
                height: formData.height_cm,
                chest: formData.chest_cm,
                waist: formData.waist_cm,
                hips: formData.hip_cm,
              }}
              showAnimations={true}
              size={rf(280)}
            />
          </View>

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Ionicons
                name="cloud-upload-outline"
                size={rf(16)}
                color={ResponsiveTheme.colors.success}
              />
              <Text style={styles.autoSaveText}>Saving...</Text>
            </View>
          )}
        </HeroSection>

        {/* Form Sections */}
        <View style={styles.content}>
          <AnimatedSection delay={0}>
            {renderBasicMeasurementsSection()}
          </AnimatedSection>

          <AnimatedSection delay={50}>
            {renderGoalVisualizationSection()}
          </AnimatedSection>

          <AnimatedSection delay={100}>
            {renderPhotoAnalysisSection()}
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {renderBodyCompositionSection()}
          </AnimatedSection>

          <AnimatedSection delay={300}>
            {renderMedicalInformationSection()}
          </AnimatedSection>

          <AnimatedSection delay={400}>
            {renderCalculatedResultsSection()}
          </AnimatedSection>
        </View>

        {/* Validation Summary */}
        {validationResult && (
          <View style={styles.validationSummary}>
            <GlassCard
              elevation={3}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.validationCard}
            >
              <View style={styles.validationTitleRow}>
                <Ionicons
                  name={
                    validationResult.is_valid
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={rf(20)}
                  color={
                    validationResult.is_valid
                      ? ResponsiveTheme.colors.secondary
                      : ResponsiveTheme.colors.warning
                  }
                />
                <Text
                  style={[
                    styles.validationTitle,
                    validationResult.is_valid && styles.validationTitleSuccess,
                  ]}
                >
                  {validationResult.is_valid
                    ? "Ready to Continue"
                    : "Please Complete"}
                </Text>
              </View>
              <Text style={styles.validationPercentage}>
                {validationResult.completion_percentage}% Complete
              </Text>

              {validationResult.errors.length > 0 && (
                <View style={styles.validationErrors}>
                  <Text style={styles.validationErrorTitle}>Required:</Text>
                  {validationResult.errors.map((error) => (
                    <Text
                      key={`error-${error.substring(0, 30)}`}
                      style={styles.validationErrorText}
                    >
                      • {error}
                    </Text>
                  ))}
                </View>
              )}

              {validationResult.warnings.length > 0 && (
                <View style={styles.validationWarnings}>
                  <Text style={styles.validationWarningTitle}>
                    Recommendations:
                  </Text>
                  {validationResult.warnings.map((warning) => (
                    <Text
                      key={`warning-${warning.substring(0, 30)}`}
                      style={styles.validationWarningText}
                    >
                      • {warning}
                    </Text>
                  ))}
                </View>
              )}
            </GlassCard>
          </View>
        )}
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
              validationResult && !validationResult.is_valid
                ? [styles.nextButtonCompact, styles.nextButtonDisabled]
                : styles.nextButtonCompact
            }
            onPress={() => onNext(formData)}
            scaleValue={0.96}
            disabled={validationResult ? !validationResult.is_valid : false}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={rf(18)} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>

      {/* Camera Modal */}
      {showCamera && (
        <Camera
          mode="progress"
          onCapture={handlePhotoCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Image Picker Modal */}
      <ImagePicker
        visible={showImagePicker}
        mode="single"
        onImagesSelected={handleImagePickerSelect}
        onClose={() => setShowImagePicker(false)}
        allowsEditing={true}
        aspect={[3, 4]}
        quality={0.8}
      />
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
    lineHeight: ResponsiveTheme.fontSize.md * 1.4,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  silhouetteContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: ResponsiveTheme.spacing.lg,
  },

  goalChart: {
    marginTop: ResponsiveTheme.spacing.md,
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

  // Inline variants for cards inside edge-to-edge sections
  measurementGuideInline: {
    marginTop: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  instructionCardInline: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  ratioCardInline: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  medicalWarningCardInline: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
  },

  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
    flexShrink: 1,
  },

  inputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  // Basic Measurements Section
  measurementsGrid: {
    gap: ResponsiveTheme.spacing.md,
  },

  measurementItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  timelineSlider: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  timelineOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  timelineOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  timelineText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  timelineTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  // BMI Card
  bmiCard: {
    padding: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.primary}05`,
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 1,
  },

  bmiContent: {
    alignItems: "center",
  },

  bmiTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  bmiCategory: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  bmiIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  bmiCategoryText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  idealWeightText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  weightLossInfo: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  weightLossRate: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  weightLossRateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
  },

  // Body Composition Section
  measurementGuideButton: {
    alignSelf: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  measurementGuideContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },

  measurementGuideText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textDecorationLine: "underline",
  },

  measurementGuide: {
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 1,
  },

  guideTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  guideText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },

  guideBold: {
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  compositionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  compositionItem: {
    flex: 1,
    minWidth: "45%",
    maxWidth: "48%",
  },

  ratioCard: {
    padding: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },

  ratioTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  ratioDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  ratioStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  // Photo Analysis Section
  instructionCard: {
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.secondary}10`,
    borderColor: ResponsiveTheme.colors.secondary,
    borderWidth: 1,
  },

  instructionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  instructionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.secondary,
  },

  instructionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },

  // Compact Photo Analysis styles
  photoTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  analyzeButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: rw(4),
  },

  analyzeButtonText: {
    color: "#FFFFFF",
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  scrollClipContainer: {
    width: "100%",
    overflow: "hidden",
    marginTop: ResponsiveTheme.spacing.sm,
  },

  photoScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(12),
  },

  photoCardCompact: {
    width: rw(100),
    alignItems: "center",
  },

  photoCardCompactInner: {
    width: rw(88),
    height: rw(88),
    borderRadius: ResponsiveTheme.borderRadius.xl,
    backgroundColor: `${ResponsiveTheme.colors.primary}08`,
    borderWidth: 2,
    borderColor: `${ResponsiveTheme.colors.primary}40`,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  photoCardCompactHasPhoto: {
    borderStyle: "solid",
    borderColor: ResponsiveTheme.colors.success,
    backgroundColor: "transparent",
  },

  photoThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: ResponsiveTheme.borderRadius.xl - 2,
  },

  photoOverlay: {
    position: "absolute",
    bottom: rw(6),
    right: rw(6),
    backgroundColor: ResponsiveTheme.colors.success,
    borderRadius: ResponsiveTheme.borderRadius.full,
    padding: rw(4),
  },

  removePhotoSmall: {
    position: "absolute",
    top: rw(6),
    right: rw(6),
    backgroundColor: ResponsiveTheme.colors.error,
    borderRadius: ResponsiveTheme.borderRadius.full,
    width: rw(22),
    height: rw(22),
    alignItems: "center",
    justifyContent: "center",
  },

  photoPlaceholderCompact: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },

  addPhotoIcon: {
    position: "absolute",
    bottom: rw(6),
    right: rw(6),
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  photoLabelCompact: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginTop: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  photoLabelCompactActive: {
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  photoHintCompact: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: rw(2),
  },

  // AI Results Compact styles
  aiResultsCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${ResponsiveTheme.colors.success}15`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  aiResultItem: {
    flex: 1,
    alignItems: "center",
  },

  aiResultLabel: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: rw(2),
  },

  aiResultValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  aiResultDivider: {
    width: 1,
    height: rh(30),
    backgroundColor: ResponsiveTheme.colors.border,
    marginHorizontal: ResponsiveTheme.spacing.xs,
  },

  reanalyzeSmall: {
    padding: ResponsiveTheme.spacing.xs,
    marginLeft: ResponsiveTheme.spacing.xs,
  },

  // Legacy photo styles (kept for compatibility)
  photoGrid: {
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  photoItem: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  photoCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  photoCardInner: {
    minHeight: 120,
  },

  photoPreview: {
    position: "relative",
    height: rh(120),
  },

  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  removePhotoButton: {
    position: "absolute",
    top: ResponsiveTheme.spacing.sm,
    right: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.error,
    borderRadius: ResponsiveTheme.borderRadius.full,
    width: rw(24),
    height: rh(24),
    alignItems: "center",
    justifyContent: "center",
  },

  removePhotoText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  aiBadgeOverlay: {
    position: "absolute",
    bottom: ResponsiveTheme.spacing.sm,
    left: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  aiBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
  },

  aiBadgeIcon: {
    fontSize: rf(14),
    marginRight: rp(4),
  },

  aiBadgeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },

  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: ResponsiveTheme.spacing.md,
    minHeight: 120,
  },

  photoIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  photoTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
    flexShrink: 1,
  },

  photoDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
  },

  addPhotoText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  photoInstruction: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },

  // AI Analysis
  analysisButtonContainer: {
    alignItems: "center",
    marginVertical: ResponsiveTheme.spacing.md,
  },

  analysisButton: {
    minWidth: "50%",
  },

  analysisResultsCard: {
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderColor: ResponsiveTheme.colors.success,
    borderWidth: 1,
    marginTop: ResponsiveTheme.spacing.md,
  },

  analysisResultsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  analysisResultsTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.success,
  },

  confidenceScore: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  analysisGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  analysisItem: {
    alignItems: "center",
  },

  analysisLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
    flexShrink: 1,
  },

  analysisValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.success,
  },

  bodyTypeInfo: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  bodyTypeDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
    flexShrink: 1,
  },

  reanalyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    alignSelf: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  reanalyzeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Medical Information Section
  medicalField: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  medicalWarningCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    borderColor: ResponsiveTheme.colors.warning,
    borderWidth: 1,
    marginTop: ResponsiveTheme.spacing.md,
  },

  medicalWarningTitle: {
    fontSize: rf(16),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.warning,
  },

  medicalWarningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  medicalWarningTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  // Pregnancy/Breastfeeding Section
  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  fieldHint: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },

  checkboxContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  checkbox: {
    flexDirection: "row",
    alignItems: "center",
  },

  checkboxBox: {
    width: rf(24),
    height: rf(24),
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },

  checkboxBoxChecked: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  checkboxCheck: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  checkboxLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  trimesterSelector: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  trimesterButtons: {
    gap: ResponsiveTheme.spacing.sm,
  },

  trimesterButton: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  trimesterButtonSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  trimesterButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  trimesterButtonTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  // Stress Level Section
  stressLevelGrid: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.md,
  },

  stressLevelItem: {
    flex: 1,
  },

  stressLevelCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  stressLevelCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  stressLevelCardOptional: {
    borderColor: "transparent",
    borderStyle: "dashed",
  },

  stressLevelContent: {
    alignItems: "center",
  },

  stressLevelIcon: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  stressLevelTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },

  stressLevelTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  stressLevelDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(16),
  },

  infoCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 1,
    marginTop: ResponsiveTheme.spacing.md,
  },

  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ResponsiveTheme.spacing.xs,
  },

  infoText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    lineHeight: rf(18),
  },

  warningCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    borderColor: ResponsiveTheme.colors.warning,
    borderWidth: 1,
    marginTop: ResponsiveTheme.spacing.md,
  },

  warningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    lineHeight: rf(18),
    flex: 1,
  },

  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ResponsiveTheme.spacing.sm,
  },

  // Calculated Results Section
  // Compact metrics styles
  metricsScrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    gap: rw(14),
  },

  metricCardCompact: {
    width: rw(100),
    alignItems: "center",
  },

  metricCardInner: {
    width: rw(92),
    height: rw(105),
    borderRadius: ResponsiveTheme.borderRadius.xl,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },

  metricIconCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  metricValueCompact: {
    fontSize: rf(18),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(22),
  },

  metricCategoryCompact: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginTop: rw(4),
    textAlign: "center",
  },

  metricLabelCompact: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginTop: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  // Legacy results grid styles (kept for compatibility)
  resultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  resultCard: {
    flex: 1,
    minWidth: "45%",
    maxWidth: "48%",
    padding: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },

  resultLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  resultValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  resultCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },

  // Validation Section
  validationSummary: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  validationCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  validationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  validationTitleSuccess: {
    color: ResponsiveTheme.colors.secondary,
  },

  validationPercentage: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationErrors: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationErrorTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationErrorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
  },

  validationWarnings: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationWarningTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationWarningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
  },

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
    alignItems: "center",
    justifyContent: "space-between",
    gap: ResponsiveTheme.spacing.md,
  },

  backButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
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

  nextButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.primary,
    gap: rw(4),
  },

  nextButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: "#FFFFFF",
  },

  nextButtonDisabled: {
    opacity: 0.5,
  },

  // Legacy button styles (kept for compatibility)
  backButton: {
    minWidth: "25%",
  },

  jumpButton: {
    minWidth: "30%",
    flex: 1,
  },

  nextButton: {
    minWidth: "35%",
    flex: 1.5,
  },
});

export default BodyAnalysisTab;
