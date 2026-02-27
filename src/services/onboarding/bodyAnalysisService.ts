import { supabase } from "../supabase";
import {
  BodyAnalysisData,
  TabValidationResult,
  BodyAnalysisRow,
} from "../../types/onboarding";

export class BodyAnalysisService {
  static async save(userId: string, data: BodyAnalysisData): Promise<boolean> {
    try {
      const bodyData: Partial<BodyAnalysisRow> = {
        user_id: userId,
        height_cm: data.height_cm,
        current_weight_kg: data.current_weight_kg,
        target_weight_kg: data.target_weight_kg,
        target_timeline_weeks: data.target_timeline_weeks,
        body_fat_percentage: data.body_fat_percentage || null,
        waist_cm: data.waist_cm || null,
        hip_cm: data.hip_cm || null,
        chest_cm: data.chest_cm || null,
        front_photo_url: data.front_photo_url || null,
        side_photo_url: data.side_photo_url || null,
        back_photo_url: data.back_photo_url || null,
        ai_estimated_body_fat: data.ai_estimated_body_fat || null,
        ai_body_type: data.ai_body_type || null,
        ai_confidence_score: data.ai_confidence_score || null,
        medical_conditions: data.medical_conditions || [],
        medications: data.medications || [],
        physical_limitations: data.physical_limitations || [],
        pregnancy_status: data.pregnancy_status || false,
        pregnancy_trimester: data.pregnancy_trimester || null,
        breastfeeding_status: data.breastfeeding_status || false,
        stress_level: data.stress_level || null,
        bmi: data.bmi || null,
        bmr: data.bmr || null,
        ideal_weight_min: data.ideal_weight_min || null,
        ideal_weight_max: data.ideal_weight_max || null,
        waist_hip_ratio: data.waist_hip_ratio || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("body_analysis").upsert(bodyData, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(
          "[DB-SERVICE] BodyAnalysisService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[DB-SERVICE] BodyAnalysisService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<BodyAnalysisData | null> {
    try {
      const { data, error } = await supabase
        .from("body_analysis")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(
          "[DB-SERVICE] BodyAnalysisService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      if (!data.height_cm || data.height_cm === 0) {
        throw new Error("Height is required for BMI and health calculations");
      }
      if (!data.current_weight_kg || data.current_weight_kg === 0) {
        throw new Error(
          "Current weight is required for BMI, BMR, and TDEE calculations",
        );
      }

      const bodyAnalysis: BodyAnalysisData = {
        height_cm: data.height_cm,
        current_weight_kg: data.current_weight_kg,
        target_weight_kg: data.target_weight_kg || undefined,
        target_timeline_weeks: data.target_timeline_weeks || undefined,
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

      return bodyAnalysis;
    } catch (error) {
      console.error("BodyAnalysisService: Unexpected error:", error);
      return null;
    }
  }

  static validate(data: BodyAnalysisData | null): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      warnings.push(
        "No body data entered yet - you can fill in measurements above or continue with defaults",
      );
      return { is_valid: true, errors, warnings, completion_percentage: 0 };
    }

    const hasMinimumData =
      (data.height_cm && data.height_cm > 0) ||
      (data.current_weight_kg && data.current_weight_kg > 0);

    if (!hasMinimumData) {
      warnings.push(
        "No body data entered yet - you can fill in measurements above or continue with defaults",
      );
      return { is_valid: true, errors, warnings, completion_percentage: 0 };
    }

    if (data.height_cm && (data.height_cm < 100 || data.height_cm > 250)) {
      errors.push("Valid height must be between 100-250 cm");
    }

    if (
      data.current_weight_kg &&
      (data.current_weight_kg < 30 || data.current_weight_kg > 300)
    ) {
      errors.push("Valid current weight must be between 30-300 kg");
    }

    if (
      data.target_weight_kg &&
      (data.target_weight_kg < 30 || data.target_weight_kg > 300)
    ) {
      warnings.push(
        "Target weight should be between 30-300 kg for accurate recommendations",
      );
    }

    if (
      data.target_timeline_weeks &&
      (data.target_timeline_weeks < 4 || data.target_timeline_weeks > 104)
    ) {
      warnings.push(
        "Timeline should be between 4-104 weeks for realistic goals",
      );
    }

    if (
      data.current_weight_kg &&
      data.target_weight_kg &&
      data.target_timeline_weeks
    ) {
      const weightDifference = Math.abs(
        data.current_weight_kg - data.target_weight_kg,
      );
      const weeklyRate = weightDifference / data.target_timeline_weeks;

      if (weeklyRate > 1) {
        warnings.push(
          "Target weight loss rate may be too aggressive (>1kg/week)",
        );
      }
      if (weeklyRate > 0 && weeklyRate < 0.25) {
        warnings.push(
          "Very slow weight change rate - consider adjusting timeline",
        );
      }
    }

    if (data.height_cm && data.current_weight_kg) {
      const bmi = data.current_weight_kg / Math.pow(data.height_cm / 100, 2);
      if (bmi < 18.5) warnings.push("Current BMI indicates underweight");
      if (bmi > 30)
        warnings.push(
          "Current BMI indicates obesity - consult healthcare provider",
        );
    }

    if (data.medical_conditions && data.medical_conditions.length > 0) {
      warnings.push(
        "Please consult healthcare provider before starting new fitness program",
      );
    }

    const basicFields: (keyof BodyAnalysisData)[] = [
      "height_cm",
      "current_weight_kg",
    ];
    const completedBasic = basicFields.filter((field) => {
      const value = data[field];
      return value !== null && value !== undefined && value !== 0;
    }).length;

    const goalFields: (keyof BodyAnalysisData)[] = [
      "target_weight_kg",
      "target_timeline_weeks",
    ];
    const completedGoals = goalFields.filter((field) => {
      const value = data[field];
      return value !== null && value !== undefined && value !== 0;
    }).length;

    const optionalFields: (keyof BodyAnalysisData)[] = [
      "body_fat_percentage",
      "waist_cm",
      "hip_cm",
      "chest_cm",
      "front_photo_url",
      "medical_conditions",
    ];
    const completedOptional = optionalFields.filter((field) => {
      const value = data[field];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined && value !== 0;
    }).length;

    const completionPercentage = Math.round(
      (completedBasic / basicFields.length) * 40 +
        (completedGoals / goalFields.length) * 30 +
        (completedOptional / optionalFields.length) * 30,
    );

    const result = {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };

    return result;
  }
}
