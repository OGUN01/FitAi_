import AsyncStorage from "@react-native-async-storage/async-storage";
import { CookingVideo } from "./types";
import { CACHE_PREFIX, CACHE_EXPIRY_HOURS } from "./config";

export async function getCachedVideo(
  mealName: string,
): Promise<CookingVideo | null> {
  try {
    const cacheKey = CACHE_PREFIX + mealName.toLowerCase().replace(/\s+/g, "_");
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (!cachedData) return null;

    const { video, timestamp } = JSON.parse(cachedData);
    const now = Date.now();
    const expiryTime = timestamp + CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

    if (now > expiryTime) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return video;
  } catch (error) {
    console.warn("⚠️ Error reading video cache:", error);
    return null;
  }
}

export async function cacheVideo(
  mealName: string,
  video: CookingVideo,
): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + mealName.toLowerCase().replace(/\s+/g, "_");
    const cacheData = {
      video,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`✅ Cached video for: ${mealName}`);
  } catch (error) {
    console.warn("⚠️ Error caching video:", error);
  }
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const videoKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(videoKeys);
    console.log(`✅ Cleared ${videoKeys.length} cached videos`);
  } catch (error) {
    console.error("❌ Error clearing video cache:", error);
  }
}
