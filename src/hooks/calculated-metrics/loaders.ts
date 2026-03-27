import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AdvancedReviewService,
  BodyAnalysisService,
  PersonalInfoService,
  WorkoutPreferencesService,
  DietPreferencesService,
} from "../../services/onboardingService";
import { weightTrackingService } from "../../services/WeightTrackingService";
import { resolveCurrentWeightForUser } from "../../services/currentWeight";
import { CalculatedMetrics } from "./types";
import { mapToCalculatedMetrics } from "./mappers";

export async function loadFromDatabase(
  userId: string,
): Promise<CalculatedMetrics | null> {

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


    if (!advancedReview) {
      return null;
    }

    const resolvedCurrentWeight = await resolveCurrentWeightForUser(userId, {
      bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
    });
    const effectiveBodyAnalysis =
      resolvedCurrentWeight.value != null
        ? ({
            ...(bodyAnalysis || {}),
            current_weight_kg: resolvedCurrentWeight.value,
          } as typeof bodyAnalysis)
        : bodyAnalysis;

    if (effectiveBodyAnalysis?.current_weight_kg) {
      weightTrackingService.initializeFromBodyAnalysis({
        current_weight_kg: effectiveBodyAnalysis.current_weight_kg,
      });
    }

    return mapToCalculatedMetrics(
      advancedReview,
      effectiveBodyAnalysis,
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

  try {
    const onboardingDataStr = await AsyncStorage.getItem("onboarding_data");

    if (!onboardingDataStr) {
      return null;
    }

    const onboardingData = JSON.parse(onboardingDataStr);

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
      return null;
    }


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
