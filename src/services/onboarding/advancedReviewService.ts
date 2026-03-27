import { supabase } from "../supabase";
import {
  PersonalInfoData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  DietPreferencesData,
  AdvancedReviewData,
  TabValidationResult,
  AdvancedReviewRow,
} from "../../types/onboarding";

export class AdvancedReviewService {
  static async calculateAndSave(
    userId: string,
    personalInfo: PersonalInfoData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
    dietPreferences: DietPreferencesData,
  ): Promise<AdvancedReviewData | null> {
    try {
      const { HealthCalculatorFacade } = await import(
        "../../utils/healthCalculations/HealthCalculatorFacade"
      );

      const userProfile = {
        age: personalInfo.age,
        gender: personalInfo.gender as
          | "male"
          | "female"
          | "other"
          | "prefer_not_to_say",
        weight: bodyAnalysis.current_weight_kg,
        height: bodyAnalysis.height_cm,
        bodyFat: bodyAnalysis.body_fat_percentage,
        country: personalInfo.country || "IN",
        state: personalInfo.state,
        fitnessLevel: workoutPreferences.intensity as
          | "beginner"
          | "intermediate"
          | "advanced"
          | "elite",
        trainingYears: workoutPreferences.workout_experience_years,
        activityLevel: workoutPreferences.activity_level,
        dietType: dietPreferences.diet_type,
        goal: workoutPreferences.primary_goals?.[0] || "maintenance",
        restingHR: bodyAnalysis.body_fat_percentage ? undefined : undefined,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(
        userProfile as any,
      );

      const advancedReviewData: AdvancedReviewData = {
        calculated_bmi: metrics.bmi,
        calculated_bmr: metrics.bmr,
        calculated_tdee: metrics.tdee,
        bmi_category: metrics.bmiClassification.category,
        bmi_health_risk: metrics.bmiClassification.healthRisk,
        daily_calories: Math.round(metrics.dailyCalories),
        daily_protein_g: Math.round(metrics.protein),
        daily_carbs_g: Math.round(metrics.carbs),
        daily_fat_g: Math.round(metrics.fat),
        daily_water_ml: Math.round(metrics.waterIntakeML),
        daily_fiber_g: Math.round((metrics.dailyCalories / 1000) * 14),
        detected_climate: metrics.climate,
        detected_ethnicity: metrics.ethnicity,
        bmr_formula_used: metrics.bmrFormula,
        heart_rate_zones: metrics.heartRateZones
          ? JSON.parse(JSON.stringify(metrics.heartRateZones))
          : undefined,
        vo2_max_estimate: metrics.vo2max?.vo2max,
        vo2_max_classification: metrics.vo2max?.classification,
        health_score: metrics.healthScore?.totalScore,
      };

      const saved = await this.save(userId, advancedReviewData);
      if (!saved) {
        console.error("[DB-SERVICE] Failed to save calculated metrics");
        return null;
      }

      return advancedReviewData;
    } catch (error) {
      console.error(
        "[DB-SERVICE] AdvancedReviewService.calculateAndSave error:",
        error,
      );
      return null;
    }
  }

  static async save(
    userId: string,
    data: AdvancedReviewData,
  ): Promise<boolean> {
    try {
      const reviewData: Partial<AdvancedReviewRow> = {
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("advanced_review")
        .upsert(reviewData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(
          "[DB-SERVICE] AdvancedReviewService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[DB-SERVICE] AdvancedReviewService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<AdvancedReviewData | null> {
    try {
      const { data, error } = await supabase
        .from("advanced_review")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(
          "[DB-SERVICE] AdvancedReviewService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      return data as AdvancedReviewData;
    } catch (error) {
      console.error("AdvancedReviewService: Unexpected error:", error);
      return null;
    }
  }

  static validate(data: AdvancedReviewData | null): TabValidationResult {
    const hasCalculations = !!(
      data?.calculated_bmi ||
      data?.calculated_bmr ||
      data?.calculated_tdee
    );

    return {
      is_valid: true,
      errors: [],
      warnings: hasCalculations
        ? []
        : ["Calculations pending - will be performed automatically"],
      completion_percentage: hasCalculations ? 100 : 0,
    };
  }
}
