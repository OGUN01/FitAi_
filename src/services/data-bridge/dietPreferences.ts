/**
 * DietPreferences Operations
 * Save and load operations for diet preferences data
 */

import { useProfileStore } from "../../stores/profileStore";
import { syncEngine } from "../SyncEngine";
import { DietPreferencesService } from "../onboardingService";
import { SaveResult, DietPreferencesData, DietPreferences } from "./types";
import { saveToLocal } from "./localStorage";

/**
 * Save diet preferences data
 */
export async function saveDietPreferences(
  data: DietPreferencesData | DietPreferences,
  currentUserId: string | null,
): Promise<SaveResult> {
  console.log(
    `[DataBridge] saveDietPreferences, userId: ${currentUserId || "guest"}`,
  );

  const result: SaveResult = {
    success: true,
    errors: [],
    newSystemSuccess: true,
  };

  try {
    // Update ProfileStore (LOCAL SYNC - always succeeds)
    const profileStore = useProfileStore.getState();
    profileStore.updateDietPreferences(data as DietPreferencesData);

    // Save to database if authenticated (REMOTE SYNC)
    if (currentUserId) {
      try {
        const dbSuccess = await DietPreferencesService.save(
          currentUserId,
          data as DietPreferencesData,
        );
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          console.warn(
            "[DataBridge] dietPreferences DB save failed - queueing for retry",
          );
          syncEngine.queueOperation("dietPreferences", data);
        }
      } catch (dbError) {
        console.error("[DataBridge] dietPreferences DB error:", dbError);
        result.newSystemSuccess = false;
        syncEngine.queueOperation("dietPreferences", data);
      }
    } else {
      await saveToLocal("dietPreferences", data);
    }

    // LOCAL sync always succeeds - don't fail just because remote failed
    result.success = true;
    return result;
  } catch (error) {
    console.error("[DataBridge] saveDietPreferences error:", error);
    return { success: false, errors: [`Error: ${error}`] };
  }
}
