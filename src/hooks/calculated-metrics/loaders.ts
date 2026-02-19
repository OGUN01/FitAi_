import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AdvancedReviewService,
  BodyAnalysisService,
  PersonalInfoService,
  WorkoutPreferencesService,
  DietPreferencesService,
} from "../../services/onboardingService";
import { weightTrackingService } from "../../services/WeightTrackingService";
import { CalculatedMetrics } from "./types";
import { mapToCalculatedMetrics } from "./mappers";

export async function loadFromDatabase(
  userId: string,
): Promise<CalculatedMetrics | null> {
  console.log(
    "📊 [useCalculatedMetrics] Loading from database for user:",
    userId,
  );

  try {
    const [
      advancedReview,
      bodyAnalysis,
      personalInfo,
      workoutPreferences,
      dietPreferences,
    ] = await Promise.all([
      AdvancedReviewService.load(userId),
      BodyAnalysisService.load(userId),
      PersonalInfoService.load(userId),
      WorkoutPreferencesService.load(userId),
      DietPreferencesService.load(userId),
    ]);

    console.log("📊 [useCalculatedMetrics] Data loaded:", {
      hasAdvancedReview: !!advancedReview,
      hasBodyAnalysis: !!bodyAnalysis,
      hasPersonalInfo: !!personalInfo,
      hasWorkoutPreferences: !!workoutPreferences,
      hasDietPreferences: !!dietPreferences,
    });

    if (!advancedReview) {
      console.log(
        "⚠️ [useCalculatedMetrics] No advanced_review data found - onboarding incomplete",
      );
      return null;
    }

    if (bodyAnalysis?.current_weight_kg) {
      weightTrackingService.initializeFromBodyAnalysis({
        current_weight_kg: bodyAnalysis.current_weight_kg,
      });
    }

    return mapToCalculatedMetrics(
      advancedReview,
      bodyAnalysis,
      personalInfo,
      workoutPreferences,
      dietPreferences,
    );
  } catch (err) {
    console.error("❌ [useCalculatedMetrics] Database load error:", err);
    throw err;
  }
}

export async function loadFromAsyncStorage(): Promise<CalculatedMetrics | null> {
  console.log(
    "📊 [useCalculatedMetrics] Loading from AsyncStorage (guest mode)",
  );

  try {
    const onboardingDataStr = await AsyncStorage.getItem("onboarding_data");

    if (!onboardingDataStr) {
      console.log(
        "⚠️ [useCalculatedMetrics] No onboarding_data in AsyncStorage",
      );
      return null;
    }

    const onboardingData = JSON.parse(onboardingDataStr);
    console.log(
      "📊 [useCalculatedMetrics] Parsed onboarding data from AsyncStorage",
    );
    console.log(
      "📊 [useCalculatedMetrics] Keys in stored data:",
      Object.keys(onboardingData),
    );

    const advancedReview =
      onboardingData.advancedReview || onboardingData.advanced_review;
    const bodyAnalysis =
      onboardingData.bodyAnalysis || onboardingData.body_analysis;
    const personalInfo =
      onboardingData.personalInfo || onboardingData.personal_info;
    const workoutPreferences =
      onboardingData.workoutPreferences || onboardingData.workout_preferences;
    const dietPreferences =
      onboardingData.dietPreferences || onboardingData.diet_preferences;

    if (!advancedReview) {
      console.log("⚠️ [useCalculatedMetrics] No advancedReview in stored data");
      console.log(
        "⚠️ [useCalculatedMetrics] Available keys:",
        Object.keys(onboardingData),
      );
      return null;
    }

    console.log(
      "✅ [useCalculatedMetrics] Found advancedReview with daily_water_ml:",
      advancedReview.daily_water_ml,
    );

    const guestBodyWeight =
      bodyAnalysis?.current_weight_kg ?? bodyAnalysis?.currentWeightKg;
    if (guestBodyWeight) {
      weightTrackingService.initializeFromBodyAnalysis({
        current_weight_kg: guestBodyWeight,
      });
    }

    return mapToCalculatedMetrics(
      advancedReview,
      bodyAnalysis,
      personalInfo,
      workoutPreferences,
      dietPreferences,
    );
  } catch (err) {
    console.error("❌ [useCalculatedMetrics] AsyncStorage load error:", err);
    throw err;
  }
}
