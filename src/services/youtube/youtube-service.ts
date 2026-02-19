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
      console.log(`🔍 Searching for cooking video: ${mealName}`);

      const apiKey = getYouTubeApiKey();
      console.log(
        `🔑 YouTube API Key status: ${apiKey ? `Present (${apiKey.substring(0, 10)}...)` : "MISSING"}`,
      );

      console.log(
        `🔑 process.env: ${process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ? "Present" : "Missing"}`,
      );
      console.log(
        `🔑 Constants.expoConfig: ${(Constants.expoConfig as any)?.EXPO_PUBLIC_YOUTUBE_API_KEY ? "Present" : "Missing"}`,
      );
      console.log(
        `🔑 Constants.expoConfig.extra: ${(Constants.expoConfig as any)?.extra?.EXPO_PUBLIC_YOUTUBE_API_KEY ? "Present" : "Missing"}`,
      );

      const cachedVideo = await getCachedVideo(mealName);
      if (cachedVideo) {
        console.log("✅ Found cached cooking video");
        return { success: true, video: cachedVideo };
      }

      const searchQueries = generateSearchQueries(mealName);

      console.log("🎯 Trying YouTube Data API v3...");
      for (const query of searchQueries) {
        const result = await searchWithYouTubeAPI(query);
        if (result.success && result.video) {
          await cacheVideo(mealName, result.video);
          return result;
        }
      }

      console.log("🔄 Falling back to Invidious instances...");
      for (const query of searchQueries) {
        const result = await searchWithInvidious(query);
        if (result.success && result.video) {
          await cacheVideo(mealName, result.video);
          return result;
        }
      }

      console.log("🎬 Using fallback demo video");
      return getFallbackDemoVideo(mealName);
    } catch (error) {
      console.error("❌ Error searching for cooking video:", error);
      console.log("🎬 Using fallback demo video");
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
