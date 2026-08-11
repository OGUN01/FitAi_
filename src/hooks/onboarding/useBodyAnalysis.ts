import { useState, useEffect, useRef, useCallback } from "react";
import * as FileSystem from "expo-file-system";
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
import { chart } from "../../theme/aurora-tokens";

interface UseBodyAnalysisProps {
  data: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onUpdate: (data: Partial<BodyAnalysisData>) => void;
}

// §4 gender-aware slider medians. The hook initial state is static, so we
// default to the neutral "other" median; BodyAnalysisTab applies the
// gender-specific median once (see §4 gender-aware note) when gender is known
// and the sliders are still at the untouched neutral default.
export const NEUTRAL_HEIGHT_CM = 168;
export const NEUTRAL_WEIGHT_KG = 72;
export const NEUTRAL_TARGET_KG = 67; // 72 - 5 (default loss intent)

// Plausible human measurement bounds (mirror the RangeSlider min/max in
// MeasurementsSection). Persisted values outside these (e.g. a corrupted
// height_cm=250 from the first-touch slider race) fall back to the neutral
// default instead of rendering an impossible value and blocking completion.
const HEIGHT_MIN = 100;
const HEIGHT_MAX = 230; // below slider max (250) — anything above is not human
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 250; // below slider max (300) — guard against corrupt max
const sanitizeHeight = (v: number | null | undefined) =>
  typeof v === "number" && v >= HEIGHT_MIN && v <= HEIGHT_MAX
    ? v
    : NEUTRAL_HEIGHT_CM;
const sanitizeWeight = (v: number | null | undefined) =>
  typeof v === "number" && v >= WEIGHT_MIN && v <= WEIGHT_MAX
    ? v
    : NEUTRAL_WEIGHT_KG;

// Shallow array comparison for the string[] fields on BodyAnalysisData —
// avoids JSON.stringify-ing the whole formData (incl. arrays) on every
// props-sync check, which ran on every RangeSlider drag tick.
const arraysEqual = (
  a: string[] | null | undefined,
  b: string[] | null | undefined,
): boolean => {
  const av = a || [];
  const bv = b || [];
  if (av.length !== bv.length) return false;
  for (let i = 0; i < av.length; i++) {
    if (av[i] !== bv[i]) return false;
  }
  return true;
};

export const GENDER_MEDIANS: Record<
  string,
  { height: number; weight: number; target: number }
> = {
  male: { height: 175, weight: 78, target: 73 },
  female: { height: 162, weight: 65, target: 60 },
  other: { height: NEUTRAL_HEIGHT_CM, weight: NEUTRAL_WEIGHT_KG, target: NEUTRAL_TARGET_KG },
};

// BMI category color (semantic, sourced from chart tokens — no hardcoded hex).
const BMI_CATEGORY_COLOR = {
  underweight: chart[5],
  normal: chart[4],
  overweight: chart[5],
  obese: chart[1],
} as const;

export const useBodyAnalysis = ({
  data,
  personalInfoData,
  validationResult,
  onUpdate,
}: UseBodyAnalysisProps) => {
  // Form state — §4 smart defaults: start at the neutral "other" median so the
  // user dials from a realistic midpoint instead of 0. BodyAnalysisTab swaps in
  // the gender-specific median once gender is known and sliders are untouched.
  const [formData, setFormData] = useState<BodyAnalysisData>({
    // Basic measurements
    height_cm: sanitizeHeight(data?.height_cm),
    current_weight_kg: sanitizeWeight(data?.current_weight_kg),
    target_weight_kg: sanitizeWeight(data?.target_weight_kg),
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
        height_cm: sanitizeHeight(data.height_cm),
        current_weight_kg: sanitizeWeight(data.current_weight_kg),
        target_weight_kg: sanitizeWeight(data.target_weight_kg),
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
        formData.height_cm !== newFormData.height_cm ||
        formData.current_weight_kg !== newFormData.current_weight_kg ||
        formData.target_weight_kg !== newFormData.target_weight_kg ||
        formData.target_timeline_weeks !== newFormData.target_timeline_weeks ||
        formData.body_fat_percentage !== newFormData.body_fat_percentage ||
        formData.waist_cm !== newFormData.waist_cm ||
        formData.hip_cm !== newFormData.hip_cm ||
        formData.chest_cm !== newFormData.chest_cm ||
        formData.front_photo_url !== newFormData.front_photo_url ||
        formData.side_photo_url !== newFormData.side_photo_url ||
        formData.back_photo_url !== newFormData.back_photo_url ||
        formData.ai_estimated_body_fat !== newFormData.ai_estimated_body_fat ||
        formData.ai_body_type !== newFormData.ai_body_type ||
        formData.ai_confidence_score !== newFormData.ai_confidence_score ||
        formData.pregnancy_status !== newFormData.pregnancy_status ||
        formData.pregnancy_trimester !== newFormData.pregnancy_trimester ||
        formData.breastfeeding_status !== newFormData.breastfeeding_status ||
        formData.stress_level !== newFormData.stress_level ||
        formData.bmi !== newFormData.bmi ||
        formData.bmr !== newFormData.bmr ||
        formData.ideal_weight_min !== newFormData.ideal_weight_min ||
        formData.ideal_weight_max !== newFormData.ideal_weight_max ||
        formData.waist_hip_ratio !== newFormData.waist_hip_ratio ||
        !arraysEqual(formData.medical_conditions, newFormData.medical_conditions) ||
        !arraysEqual(formData.medications, newFormData.medications) ||
        !arraysEqual(formData.physical_limitations, newFormData.physical_limitations);

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
    (weightKg: number, heightCm: number): number | null => {
      if (!personalInfoData?.age || !personalInfoData?.gender) {
        console.warn('BMR preview skipped: age or gender not available');
        return null;
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

      const computed = {
        bmi: Math.round(bmi * 100) / 100,
        bmr: bmr != null ? Math.round(bmr) : undefined,
        ideal_weight_min: Math.round(idealWeightRange.min * 100) / 100,
        ideal_weight_max: Math.round(idealWeightRange.max * 100) / 100,
      };

      setFormData((prev: BodyAnalysisData) => ({ ...prev, ...computed }));
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
      const waist_hip_ratio = Math.round(ratio * 100) / 100;

      setFormData((prev: BodyAnalysisData) => ({ ...prev, waist_hip_ratio }));
    }
  }, [formData.waist_cm, formData.hip_cm]);

  // Debounced commit to parent state (mirrors useDietPreferences/
  // usePersonalInfoForm). RangeSlider-driven fields (height/weight/target)
  // fire many formData updates per second while dragging; without this,
  // every tick synchronously wrote into the top-level onboarding state and
  // re-ran the whole onboarding tree. handleNext in BodyAnalysisTab already
  // flushes `onUpdate(formData)` synchronously before navigating, so this
  // debounce never risks losing data on tab transition.
  const stableOnUpdate = useCallback(() => {
    onUpdate(formData);
  }, [formData, onUpdate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isSyncingFromProps.current) {
        stableOnUpdate();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData, stableOnUpdate]);

  // Helpers
  const getBMICategory = (
    bmi: number,
  ): { category: string; color: string; iconName: string } => {
    if (bmi < 18.5)
      return {
        category: "Underweight",
        color: BMI_CATEGORY_COLOR.underweight,
        iconName: "alert-circle",
      };
    if (bmi < 25)
      return {
        category: "Normal",
        color: BMI_CATEGORY_COLOR.normal,
        iconName: "checkmark-circle",
      };
    if (bmi < 30)
      return {
        category: "Overweight",
        color: BMI_CATEGORY_COLOR.overweight,
        iconName: "alert-circle",
      };
    return {
      category: "Obese",
      color: BMI_CATEGORY_COLOR.obese,
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
  // Commit to local formData only — the debounced effect above pushes the
  // merged result up to parent state (see stableOnUpdate).
  const updateField = <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Multi-field atomic update (avoids stale-closure over `formData` when several
  // fields must change together, e.g. the S2 goal-arc recomputing the timeline
  // alongside target_weight_kg).
  const updateFields = (patch: Partial<BodyAnalysisData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleNumberInput = (field: keyof BodyAnalysisData, text: string) => {
    if (text === '') {
      updateField(field, undefined as BodyAnalysisData[typeof field]);
      return;
    }
    const parsed = parseFloat(text);
    const value = isNaN(parsed) ? undefined : parsed;
    updateField(field, value as BodyAnalysisData[typeof field]);
  };

  const handlePhotoCapture = (imageUri: string) => {
    const photoField = `${currentPhotoType}_photo_url` as keyof BodyAnalysisData;
    const existingUri = formData[photoField] as string | undefined;
    if (existingUri) {
      FileSystem.deleteAsync(existingUri, { idempotent: true }).catch((err) => {
        console.warn("[handlePhotoCapture] Failed to delete old temp file:", err);
      });
    }
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
    const photoUri = formData[photoField] as string | undefined;

    updateField(photoField, undefined as BodyAnalysisData[typeof photoField]);

    if (photoUri) {
      FileSystem.deleteAsync(photoUri, { idempotent: true }).catch((err) => {
        console.warn("[removePhoto] Failed to delete local file:", err);
      });
    }

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
      // Photo analysis not yet implemented — real AI analysis requires a backend vision model.

      const aiResults = {
        ai_estimated_body_fat: undefined as number | undefined,
        ai_body_type: undefined as "ectomorph" | "mesomorph" | "endomorph" | undefined,
        ai_confidence_score: 0,
      };

      setFormData((prev: BodyAnalysisData) => ({
        ...prev,
        ...aiResults,
      }));

      onUpdate(aiResults);

      crossPlatformAlert(
        "Analysis Not Available",
        "AI photo analysis is not yet available. You can enter your body fat percentage manually below.",
        [{ text: "OK" }],
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
    updateFields,
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
