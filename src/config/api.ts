import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || {};

export const API_CONFIG = {
  WORKERS_BASE_URL:
    extra.EXPO_PUBLIC_WORKERS_URL ||
    process.env.EXPO_PUBLIC_WORKERS_URL ||
    "https://fitai-workers.sharmaharsh9887.workers.dev",

  WORKOUT_GENERATE_ENDPOINT: "/workout/generate",
  MEAL_GENERATE_ENDPOINT: "/meal/generate",
  NUTRITION_ANALYZE_ENDPOINT: "/nutrition/analyze",

  // Razorpay subscription endpoints
  SUBSCRIPTION_CREATE_ENDPOINT: "/api/subscription/create",
  SUBSCRIPTION_VERIFY_ENDPOINT: "/api/subscription/verify",
  SUBSCRIPTION_STATUS_ENDPOINT: "/api/subscription/status",
  SUBSCRIPTION_CANCEL_ENDPOINT: "/api/subscription/cancel",
  SUBSCRIPTION_PAUSE_ENDPOINT: "/api/subscription/pause",
  SUBSCRIPTION_RESUME_ENDPOINT: "/api/subscription/resume",
} as const;

export const APP_CONFIG = {
  BASE_URL: "https://fitai.app",
  TERMS_URL: "https://fitai.app/terms",
  PRIVACY_URL: "https://fitai.app/privacy",
  LICENSES_URL: "https://fitai.app/licenses",
  TUTORIALS_URL: "https://fitai.app/tutorials",
  GUIDE_URL: "https://fitai.app/guide",
  COMMUNITY_URL: "https://community.fitai.app",
  STATUS_URL: "https://status.fitai.app",
} as const;

export const SOCIAL_CONFIG = {
  TWITTER: "https://twitter.com/fitai_app",
  INSTAGRAM: "https://instagram.com/fitai_app",
  FACEBOOK: "https://facebook.com/fitai.app",
  YOUTUBE: "https://youtube.com/@fitai_app",
} as const;

export function getWorkersUrl(endpoint: string): string {
  return `${API_CONFIG.WORKERS_BASE_URL}${endpoint}`;
}
