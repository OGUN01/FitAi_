import { VideoSearchResult } from "./types";
import { INVIDIOUS_INSTANCES } from "./config";
import { selectBestInvidiousVideo } from "./video-selection";

export async function searchWithInvidious(
  query: string,
): Promise<VideoSearchResult> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const result = await searchOnInvidiousInstance(instance, query);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ Instance ${instance} failed, trying next...`);
      continue;
    }
  }

  return {
    success: false,
    error: "All Invidious instances failed",
  };
}

async function searchOnInvidiousInstance(
  instance: string,
  query: string,
): Promise<VideoSearchResult> {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `${instance}/api/v1/search?q=${encodedQuery}&type=video&sort_by=relevance&region=US`;

  console.log(`🔍 Searching on ${instance}: ${query}`);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), 10000);
  });

  try {
    const fetchPromise = fetch(searchUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "FitAI-CookingApp/1.0",
        "Content-Type": "application/json",
      },
    });

    const response = (await Promise.race([
      fetchPromise,
      timeoutPromise,
    ])) as Response;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const videos = await response.json();

    if (!Array.isArray(videos) || videos.length === 0) {
      return {
        success: false,
        error: "No videos found",
      };
    }

    const bestVideo = selectBestInvidiousVideo(videos, query);

    if (!bestVideo) {
      return {
        success: false,
        error: "No suitable cooking videos found",
      };
    }

    console.log(`✅ Found video: ${bestVideo.title}`);
    return {
      success: true,
      video: bestVideo,
    };
  } catch (error) {
    console.warn(`⚠️ Error on ${instance}:`, error);
    throw error;
  }
}
