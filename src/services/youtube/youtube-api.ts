import { CookingVideo, VideoSearchResult } from "./types";
import { YOUTUBE_API_BASE_URL, getYouTubeApiKey } from "./config";
import { selectBestYouTubeVideo } from "./video-selection";

export async function searchWithYouTubeAPI(
  query: string,
): Promise<VideoSearchResult> {
  try {
    const apiKey = getYouTubeApiKey();
    if (!apiKey) {
      console.log("🔑 YouTube API key not configured, skipping...");
      return { success: false, error: "API key not configured" };
    }

    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&type=video&q=${encodedQuery}&regionCode=US&relevanceLanguage=en&videoDefinition=any&videoEmbeddable=true&maxResults=10&key=${apiKey}`;

    console.log(`🎯 YouTube API search: ${query}`);

    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "FitAI-CookingApp/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        `❌ YouTube Search API error: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `YouTube API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log(`⚠️ No videos found for query: ${query}`);
      return { success: false, error: "No videos found" };
    }

    console.log(`📺 Found ${data.items.length} videos for: ${query}`);

    const videoIds = data.items
      .slice(0, 5)
      .map((item: any) => item.id.videoId)
      .join(",");
    const detailsUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;

    const detailsResponse = await fetch(detailsUrl);

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.warn(
        `❌ YouTube Details API error: ${detailsResponse.status}`,
        errorText,
      );
      throw new Error(`YouTube Details API error: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();

    if (!detailsData.items || detailsData.items.length === 0) {
      console.log(`⚠️ No video details found`);
      return { success: false, error: "No video details found" };
    }

    const bestVideo = selectBestYouTubeVideo(detailsData.items, query);

    if (!bestVideo) {
      console.log(`⚠️ No suitable cooking videos found after filtering`);
      return { success: false, error: "No suitable cooking videos found" };
    }

    console.log(
      `✅ Found YouTube video: "${bestVideo.title}" by ${bestVideo.author}`,
    );
    return { success: true, video: bestVideo };
  } catch (error) {
    console.warn("⚠️ YouTube API search failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "YouTube API failed",
    };
  }
}
