/**
 * AdvancedReview Operations
 * Save and load operations for advanced review data
 */

import { useProfileStore } from "../../stores/profileStore";
import { syncEngine } from "../SyncEngine";
import { AdvancedReviewService } from "../onboardingService";
import { SaveResult, AdvancedReviewData } from "./types";
import { saveToLocal } from "./localStorage";

/**
 * Save advanced review data
 */
export async function saveAdvancedReview(
  data: AdvancedReviewData,
  currentUserId: string | null,
): Promise<SaveResult> {
  console.log(
    `[DataBridge] saveAdvancedReview, userId: ${currentUserId || "guest"}`,
  );

  const result: SaveResult = {
    success: true,
    errors: [],
    newSystemSuccess: true,
  };

  try {
    // Update ProfileStore (LOCAL SYNC - always succeeds)
    const profileStore = useProfileStore.getState();
    profileStore.updateAdvancedReview(data);

    // Save to database if authenticated (REMOTE SYNC)
    if (currentUserId) {
      try {
        const dbSuccess = await AdvancedReviewService.save(currentUserId, data);
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          console.warn(
            "[DataBridge] advancedReview DB save failed - queueing for retry",
          );
          syncEngine.queueOperation("advancedReview", data);
        }
      } catch (dbError) {
        console.error("[DataBridge] advancedReview DB error:", dbError);
        result.newSystemSuccess = false;
        syncEngine.queueOperation("advancedReview", data);
      }
    } else {
      await saveToLocal("advancedReview", data);
    }

    // LOCAL sync always succeeds - don't fail just because remote failed
    result.success = true;
    return result;
  } catch (error) {
    console.error("[DataBridge] saveAdvancedReview error:", error);
    return { success: false, errors: [`Error: ${error}`] };
  }
}
