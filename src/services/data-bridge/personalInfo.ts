/**
 * PersonalInfo Operations
 * Save and load operations for personal info data
 */

import { useUserStore } from "../../stores/userStore";
import { useProfileStore } from "../../stores/profileStore";
import { syncEngine } from "../SyncEngine";
import { PersonalInfoService } from "../onboardingService";
import { SaveResult, PersonalInfoData, PersonalInfo } from "./types";
import { saveToLocal } from "./localStorage";

/**
 * Save personal info data
 */
export async function savePersonalInfo(
  data: PersonalInfoData | PersonalInfo,
  currentUserId: string | null,
): Promise<SaveResult> {
  console.log(
    `[DataBridge] savePersonalInfo, userId: ${currentUserId || "guest"}`,
  );

  const result: SaveResult = {
    success: true,
    errors: [],
    newSystemSuccess: true,
  };

  try {
    // Update ProfileStore (LOCAL SYNC - SSOT for onboarding data)
    const profileStore = useProfileStore.getState();
    profileStore.updatePersonalInfo(data as PersonalInfoData);

    // NOTE: userStore.updatePersonalInfo is DEPRECATED
    // Keeping for backward compatibility but it will be removed
    // All new code should use profileStore only
    const userStore = useUserStore.getState();
    userStore.updatePersonalInfo(data as PersonalInfo);

    // Save to database if authenticated (REMOTE SYNC)
    if (currentUserId) {
      try {
        const dbSuccess = await PersonalInfoService.save(
          currentUserId,
          data as PersonalInfoData,
        );
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          console.warn(
            "[DataBridge] personalInfo DB save failed - queueing for retry",
          );
          syncEngine.queueOperation("personalInfo", data);
        }
      } catch (dbError) {
        console.error("[DataBridge] personalInfo DB error:", dbError);
        result.newSystemSuccess = false;
        syncEngine.queueOperation("personalInfo", data);
      }
    } else {
      await saveToLocal("personalInfo", data);
    }

    // LOCAL sync always succeeds - don't fail just because remote failed
    result.success = true;
    return result;
  } catch (error) {
    console.error("[DataBridge] savePersonalInfo error:", error);
    return { success: false, errors: [`Error: ${error}`] };
  }
}
