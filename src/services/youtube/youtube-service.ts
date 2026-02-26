import Constants from "expo-constants";
import { VideoSearchResult } from "./types";
import {
  getCachedVideo,
  cacheVideo,
  clearCache as clearVideoCache,
} from "./cache";
import { generateSearchQueries, getYouTubeApiKey } from "./config";
import { searchWithYouTubeAPI } from "./youtube-api";
import { searchWithInvidious } from "./invidious";
import { getFallbackDemoVideo } from "./fallback";

class YouTubeVideoService {
  async searchCookingVideo(mealName: string): Promise<VideoSearchResult> {
    try {

      const apiKey = getYouTubeApiKey();

      const cachedVideo = await getCachedVideo(mealName);
      if (cachedVideo) {
        return { success: true, video: cachedVideo };
      }

      const searchQueries = generateSearchQueries(mealName);

      for (const query of searchQueries) {
        const result = await searchWithYouTubeAPI(query);
        if (result.success && result.video) {
          await cacheVideo(mealName, result.video);
          return result;
        }
      }

      for (const query of searchQueries) {
        const result = await searchWithInvidious(query);
        if (result.success && result.video) {
          await cacheVideo(mealName, result.video);
          return result;
        }
      }

      return getFallbackDemoVideo(mealName);
    } catch (error) {
      console.error("❌ Error searching for cooking video:", error);
      return getFallbackDemoVideo(mealName);
    }
  }

  getVideoUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  async clearCache(): Promise<void> {
    return clearVideoCache();
  }
}

export const youtubeVideoService = new YouTubeVideoService();
