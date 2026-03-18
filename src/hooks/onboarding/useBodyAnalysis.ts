import { useState, useEffect, useRef, useCallback } from "react";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import {
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../types/onboarding";
import {
  MetabolicCalculations,
  BodyCompositionCalculations,
} from "../../utils/healthCalculations";
import { calculateBMI } from "../../utils/healthCalculations/core/bmiCalculation";
import { ResponsiveTheme } from "../../utils/constants";

interface UseBodyAnalysisProps {
  data: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onUpdate: (data: Partial<BodyAnalysisData>) => void;
}

export const useBodyAnalysis = ({
  data,
  personalInfoData,
  validationResult,
  onUpdate,
}: UseBodyAnalysisProps) => {
  // Form state
  const [formData, setFormData] = useState<BodyAnalysisData>({
    // Basic measurements
    height_cm: data?.height_cm ?? 0,
    current_weight_kg: data?.current_weight_kg ?? 0,
    target_weight_kg: data?.target_weight_kg ?? 0,
    target_timeline_weeks: data?.target_timeline_weeks ?? 12,

    // Body composition
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

    // Stress Level
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

  // Sync formData with data prop when it changes
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

      const hasChanged =
        JSON.stringify(formData) !== JSON.stringify(newFormData);

      if (hasChanged) {
        isSyncingFromProps.current = true;
        setFormData(newFormData);
        setTimeout(() => {
          isSyncingFromProps.current = false;
        }, 0);
      }
    }
  }, [data]);

  // Memoize BMR calculation function
  const calculateBMRMemo = useCallback(
    (weightKg: number, heightCm: number): number => {
      if (!personalInfoData?.age || !personalInfoData?.gender) {
        return 10 * weightKg + 6.25 * heightCm - 5 * 25;
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
  const calculateIdealWeightRangeMemo = useCallback(
    (heightCm: number): { min: number; max: number } => {
      if (!personalInfoData?.gender) {
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
    // Guard: skip calculation while user is still typing (partial values like "9" would
    // cause calculateBMR to throw since it requires weight >= 30 kg)
    if (formData.height_cm > 0 && formData.current_weight_kg >= 30 && formData.current_weight_kg <= 300) {
      const bmi = calculateBMI(formData.current_weight_kg, formData.height_cm);
      const bmr = calculateBMRMemo(
        formData.current_weight_kg,
        formData.height_cm,
      );
      const idealWeightRange = calculateIdealWeightRangeMemo(
        formData.height_cm,
      );

      setFormData((prev: BodyAnalysisData) => ({
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
      setFormData((prev: BodyAnalysisData) => ({
        ...prev,
        waist_hip_ratio: Math.round(ratio * 100) / 100,
      }));
    }
  }, [formData.waist_cm, formData.hip_cm]);

  // Helpers
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

    const maxWeeklyLoss =
      BodyCompositionCalculations.calculateHealthyWeightLossRate(
        formData.current_weight_kg,
        personalInfoData?.gender,
      );

    const weightDifference = Math.abs(
      formData.current_weight_kg - formData.target_weight_kg,
    );
    return Math.min(maxWeeklyLoss, weightDifference / 4);
  };

  // Form Handlers
  const updateField = <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate(updated);
  };

  const handleNumberInput = (field: keyof BodyAnalysisData, text: string) => {
    const value = parseFloat(text) || 0;
    updateField(field, value as BodyAnalysisData[typeof field]);
  };

  const handlePhotoCapture = (imageUri: string) => {
    const photoField = `${currentPhotoType}_photo_url` as keyof BodyAnalysisData;
    updateField(photoField, imageUri as BodyAnalysisData[typeof photoField]);
    setShowCamera(false);
  };

  const handleImagePickerSelect = (imageUris: string[]) => {
    if (imageUris.length > 0) {
      const photoField = `${currentPhotoType}_photo_url` as keyof BodyAnalysisData;
      updateField(photoField, imageUris[0] as BodyAnalysisData[typeof photoField]);
    }
    setShowImagePicker(false);
  };

  const openPhotoOptions = (photoType: "front" | "side" | "back") => {
    setCurrentPhotoType(photoType);
    crossPlatformAlert("Add Photo", "How would you like to add your photo?", [
      { text: "Camera", onPress: () => setShowCamera(true) },
      { text: "Photo Library", onPress: () => setShowImagePicker(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removePhoto = (photoType: "front" | "side" | "back") => {
    const photoField = `${photoType}_photo_url` as keyof BodyAnalysisData;
    updateField(photoField, undefined as BodyAnalysisData[typeof photoField]);

    if (formData.ai_estimated_body_fat) {
      setFormData((prev: BodyAnalysisData) => ({
        ...prev,
        ai_estimated_body_fat: undefined,
        ai_body_type: undefined,
        ai_confidence_score: undefined,
      }));
    }
  };

  const analyzePhotos = async () => {
    const photoUrls = [
      formData.front_photo_url,
      formData.side_photo_url,
      formData.back_photo_url,
    ].filter(Boolean);

    if (photoUrls.length === 0) {
      crossPlatformAlert("No Photos", "Please add at least one photo to analyze.");
      return;
    }

    setIsAnalyzingPhotos(true);

    try {
      // Mock analysis - no artificial delay

      const mockAnalysis = {
        estimatedBodyFat: Math.random() * 10 + 15,
        bodyType: ["ectomorph", "mesomorph", "endomorph"][
          Math.floor(Math.random() * 3)
        ] as "ectomorph" | "mesomorph" | "endomorph",
        confidenceScore: Math.floor(Math.random() * 20 + 75),
      };

      setFormData((prev: BodyAnalysisData) => ({
        ...prev,
        ai_estimated_body_fat:
          Math.round(mockAnalysis.estimatedBodyFat * 100) / 100,
        ai_body_type: mockAnalysis.bodyType,
        ai_confidence_score: mockAnalysis.confidenceScore,
      }));

      crossPlatformAlert(
        "Analysis Complete!",
        `Body analysis completed with ${mockAnalysis.confidenceScore}% confidence. Review the results below.`,
        [{ text: "Great!" }],
      );
    } catch (error) {
      console.error("Photo analysis failed:", error);
      crossPlatformAlert(
        "Analysis Failed",
        "Unable to analyze photos. Please try again.",
      );
    } finally {
      setIsAnalyzingPhotos(false);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find((error: string) =>
      error.toLowerCase().includes(fieldName.toLowerCase()),
    );
  };

  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  return {
    formData,
    showCamera,
    setShowCamera,
    showImagePicker,
    setShowImagePicker,
    currentPhotoType,
    isAnalyzingPhotos,
    showMeasurementGuide,
    setShowMeasurementGuide,
    updateField,
    handleNumberInput,
    handlePhotoCapture,
    handleImagePickerSelect,
    openPhotoOptions,
    removePhoto,
    analyzePhotos,
    getBMICategory,
    getHealthyWeightLossRate,
    getFieldError,
    hasFieldError,
  };
};
