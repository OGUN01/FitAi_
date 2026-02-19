import Constants from "expo-constants";

export const CACHE_PREFIX = "cooking_video_";
export const CACHE_EXPIRY_HOURS = 72; // Extended cache for YouTube API quota management

export const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

export const INVIDIOUS_INSTANCES = [
  "https://invidious.privacyredirect.com",
  "https://invidious.fdn.fr",
  "https://invidious.projectsegfau.lt",
  "https://vid.puffyan.us",
  "https://invidious.slipfox.xyz",
];

export const COOKING_KEYWORDS = [
  "recipe",
  "cooking",
  "how to cook",
  "tutorial",
  "make",
  "making",
  "step by step",
  "easy",
  "homemade",
  "chef",
  "kitchen",
];

export const POPULAR_COOKING_CHANNELS = [
  "tasty",
  "gordon ramsay",
  "babish",
  "bon appétit",
  "food network",
  "joshua weissman",
  "chef john",
  "food wishes",
  "allrecipes",
  "sorted food",
  "america's test kitchen",
  "serious eats",
];

export function getYouTubeApiKey(): string | undefined {
  try {
    // Multi-strategy environment variable access for production compatibility
    const processEnvValue = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    if (processEnvValue) return processEnvValue;

    const expoConfigValue = (Constants.expoConfig as any)
      ?.EXPO_PUBLIC_YOUTUBE_API_KEY;
    if (expoConfigValue) return expoConfigValue;

    const extraValue = (Constants.expoConfig as any)?.extra
      ?.EXPO_PUBLIC_YOUTUBE_API_KEY;
    if (extraValue) return extraValue;

    return undefined;
  } catch (error) {
    console.error("YouTube API key access error:", error);
    return undefined;
  }
}

export function generateSearchQueries(mealName: string): string[] {
  const cleanMealName = mealName.toLowerCase().trim();

  return [
    `${cleanMealName} recipe cooking tutorial`,
    `how to cook ${cleanMealName}`,
    `${cleanMealName} recipe step by step`,
    `${cleanMealName} cooking guide`,
    `making ${cleanMealName} recipe`,
  ];
}
