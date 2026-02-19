/**
 * BodyAnalysis Operations
 * Save and load operations for body analysis data
 */

import { useProfileStore } from "../../stores/profileStore";
import { syncEngine } from "../SyncEngine";
import { BodyAnalysisService } from "../onboardingService";
import { SaveResult, BodyAnalysisData } from "./types";
import { saveToLocal } from "./localStorage";

/**
 * Transform old onboarding format to new database format
 * Handles nested structures like bodyAnalysis.measurements
 */
export function transformBodyAnalysisForDB(data: any): BodyAnalysisData {
  console.log("[DataBridge] Transforming bodyAnalysis data:", data);

  // Check if data is in old format (nested measurements)
  if (data.measurements) {
    const transformed: any = {
      height_cm: data.measurements.height || data.measurements.height_cm,
      current_weight_kg:
        data.measurements.weight || data.measurements.current_weight_kg,
      target_weight_kg:
        data.measurements.targetWeight ||
        data.measurements.target_weight_kg ||
        data.measurements.weight,
      target_timeline_weeks:
        data.measurements.targetTimeline ||
        data.measurements.target_timeline_weeks ||
        12,
      body_fat_percentage:
        data.measurements.bodyFat || data.measurements.body_fat_percentage,
      waist_cm: data.measurements.waist || data.measurements.waist_cm,
      hip_cm: data.measurements.hips || data.measurements.hip_cm,
      chest_cm: data.measurements.chest || data.measurements.chest_cm,
      medical_conditions:
        data.medicalConditions || data.medical_conditions || [],
      medications: data.medications || [],
      physical_limitations:
        data.physicalLimitations || data.physical_limitations || [],
      pregnancy_status: data.pregnancyStatus || data.pregnancy_status || false,
      breastfeeding_status:
        data.breastfeedingStatus || data.breastfeeding_status || false,
      stress_level: data.stressLevel || data.stress_level || null,
    };

    // Handle photos
    if (data.photos) {
      transformed.front_photo_url = data.photos.front || null;
      transformed.side_photo_url = data.photos.side || null;
      transformed.back_photo_url = data.photos.back || null;
    }

    // Handle AI analysis
    if (data.aiAnalysis) {
      transformed.ai_estimated_body_fat =
        data.aiAnalysis.estimatedBodyFat || null;
      transformed.ai_body_type = data.aiAnalysis.bodyType || null;
      transformed.ai_confidence_score = data.aiAnalysis.confidence || null;
    }

    console.log("[DataBridge] Transformed bodyAnalysis:", transformed);
    return transformed as BodyAnalysisData;
  }

  // Data is already in correct format
  return data as BodyAnalysisData;
}

/**
 * Save body analysis data
 */
export async function saveBodyAnalysis(
  data: BodyAnalysisData,
  currentUserId: string | null,
): Promise<SaveResult> {
  console.log(
    `[DataBridge] saveBodyAnalysis, userId: ${currentUserId || "guest"}`,
  );

  const result: SaveResult = {
    success: true,
    errors: [],
    newSystemSuccess: true,
  };

  try {
    // Update ProfileStore (LOCAL SYNC - always succeeds)
    const profileStore = useProfileStore.getState();
    profileStore.updateBodyAnalysis(data);

    // Save to database if authenticated (REMOTE SYNC)
    if (currentUserId) {
      try {
        const dbSuccess = await BodyAnalysisService.save(currentUserId, data);
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          console.warn(
            "[DataBridge] bodyAnalysis DB save failed - queueing for retry",
          );
          syncEngine.queueOperation("bodyAnalysis", data);
        }
      } catch (dbError) {
        console.error("[DataBridge] bodyAnalysis DB error:", dbError);
        result.newSystemSuccess = false;
        syncEngine.queueOperation("bodyAnalysis", data);
      }
    } else {
      await saveToLocal("bodyAnalysis", data);
    }

    // LOCAL sync always succeeds - don't fail just because remote failed
    result.success = true;
    return result;
  } catch (error) {
    console.error("[DataBridge] saveBodyAnalysis error:", error);
    return { success: false, errors: [`Error: ${error}`] };
  }
}
