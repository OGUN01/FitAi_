import { CookingVideo } from "./types";
import { COOKING_KEYWORDS, POPULAR_COOKING_CHANNELS } from "./config";

export function parseYouTubeDuration(duration?: string): number {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

export function selectBestYouTubeVideo(
  videos: any[],
  query: string,
): CookingVideo | null {
  const scoredVideos = videos
    .filter((video) => {
      if (!video.snippet?.title || !video.id) return false;

      const duration = parseYouTubeDuration(video.contentDetails?.duration);
      if (duration < 180 || duration > 2700) return false;

      const title = video.snippet.title.toLowerCase();
      return COOKING_KEYWORDS.some((keyword) => title.includes(keyword));
    })
    .map((video) => ({
      video,
      score: calculateYouTubeVideoScore(video, query),
    }))
    .sort((a, b) => b.score - a.score);

  if (scoredVideos.length === 0) return null;

  const bestVideo = scoredVideos[0].video;

  return {
    id: bestVideo.id,
    title: bestVideo.snippet.title,
    author: bestVideo.snippet.channelTitle || "Unknown",
    lengthSeconds: parseYouTubeDuration(bestVideo.contentDetails?.duration),
    viewCount: parseInt(bestVideo.statistics?.viewCount || "0"),
    publishedText: bestVideo.snippet.publishedAt || "",
    thumbnails: bestVideo.snippet.thumbnails
      ? [
          {
            url:
              bestVideo.snippet.thumbnails.medium?.url ||
              bestVideo.snippet.thumbnails.default?.url ||
              "",
            width: bestVideo.snippet.thumbnails.medium?.width || 320,
            height: bestVideo.snippet.thumbnails.medium?.height || 180,
          },
        ]
      : [],
    description: bestVideo.snippet.description || "",
  };
}

export function selectBestInvidiousVideo(
  videos: any[],
  query: string,
): CookingVideo | null {
  const scoredVideos = videos
    .filter((video) => {
      if (!video.title || !video.videoId) return false;

      const duration = parseInt(video.lengthSeconds) || 0;
      if (duration < 300 || duration > 1800) return false;

      const title = video.title.toLowerCase();
      return COOKING_KEYWORDS.some((keyword) => title.includes(keyword));
    })
    .map((video) => ({
      video,
      score: calculateInvidiousVideoScore(video, query),
    }))
    .sort((a, b) => b.score - a.score);

  if (scoredVideos.length === 0) return null;

  const bestVideo = scoredVideos[0].video;

  return {
    id: bestVideo.videoId,
    title: bestVideo.title,
    author: bestVideo.author || "Unknown",
    lengthSeconds: parseInt(bestVideo.lengthSeconds) || 0,
    viewCount: parseInt(bestVideo.viewCount) || 0,
    publishedText: bestVideo.publishedText || "",
    thumbnails: bestVideo.videoThumbnails || [],
    description: bestVideo.description || "",
  };
}

function calculateYouTubeVideoScore(video: any, query: string): number {
  let score = 0;
  const title = (video.snippet?.title || "").toLowerCase();
  const channelTitle = (video.snippet?.channelTitle || "").toLowerCase();
  const queryWords = query.toLowerCase().split(" ");

  queryWords.forEach((word) => {
    if (title.includes(word)) score += 8;
  });

  COOKING_KEYWORDS.forEach((keyword) => {
    if (title.includes(keyword)) score += 5;
  });

  const viewCount = parseInt(video.statistics?.viewCount || "0");
  if (viewCount > 1000000) score += 25;
  else if (viewCount > 500000) score += 20;
  else if (viewCount > 100000) score += 15;
  else if (viewCount > 10000) score += 10;
  else if (viewCount > 1000) score += 5;

  const duration = parseYouTubeDuration(video.contentDetails?.duration);
  if (duration >= 300 && duration <= 1200) score += 15;
  else if (duration >= 180 && duration <= 1800) score += 10;

  if (
    POPULAR_COOKING_CHANNELS.some((channel) => channelTitle.includes(channel))
  ) {
    score += 20;
  }

  return score;
}

function calculateInvidiousVideoScore(video: any, query: string): number {
  let score = 0;
  const title = (video.title || "").toLowerCase();
  const author = (video.author || "").toLowerCase();
  const queryWords = query.toLowerCase().split(" ");

  queryWords.forEach((word) => {
    if (title.includes(word)) score += 8;
  });

  COOKING_KEYWORDS.forEach((keyword) => {
    if (title.includes(keyword)) score += 5;
  });

  const viewCount = parseInt(video.viewCount) || 0;
  if (viewCount > 100000) score += 20;
  else if (viewCount > 10000) score += 15;
  else if (viewCount > 1000) score += 10;
  else if (viewCount > 100) score += 5;

  const duration = parseInt(video.lengthSeconds) || 0;
  if (duration >= 600 && duration <= 1200) score += 10;
  else if (duration >= 300 && duration <= 1800) score += 5;

  if (POPULAR_COOKING_CHANNELS.some((channel) => author.includes(channel))) {
    score += 15;
  }

  return score;
}
