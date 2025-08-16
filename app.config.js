import 'dotenv/config';

export default {
  expo: {
    name: "FitAI - AI Fitness Coach",
    slug: "FitAI",
    version: "1.0.1",
    owner: "harsh9887",
    description: "Your personal AI-powered fitness coach with workout plans, nutrition guidance, and progress tracking.",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    scheme: "fitai",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      googleServicesFile: "./GoogleService-Info.plist",
      bundleIdentifier: "com.fitai.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.fitai.app",
      versionCode: 11,
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "USE_FINGERPRINT",
        "POST_NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED"
      ],
      allowBackup: false,
      googleServicesFile: "./google-services.json",
      jsEngine: "jsc",
      usesCleartextTraffic: true,
      networkSecurityConfig: {
        cleartextTrafficPermitted: true,
        domainConfig: [
          {
            domain: "generativelanguage.googleapis.com",
            includeSubdomains: true,
            cleartextTrafficPermitted: false
          },
          {
            domain: "googleapis.com",
            includeSubdomains: true,
            cleartextTrafficPermitted: false
          }
        ]
      }
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#000000",
      iosDisplayInForeground: true,
      androidMode: "default",
      androidCollapsedTitle: "#{unread_notifications} new fitness reminders"
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
          defaultChannel: "default"
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "21887baa-d6be-42f0-9a08-ab3ff42e2c94"
      },
      // CRITICAL: Expose environment variables through extra config
      // This allows access via Constants.expoConfig.extra in production builds
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      EXPO_PUBLIC_GEMINI_KEY_6: process.env.EXPO_PUBLIC_GEMINI_KEY_6,
      EXPO_PUBLIC_YOUTUBE_API_KEY: process.env.EXPO_PUBLIC_YOUTUBE_API_KEY,
      EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
      EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
      EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT,
      EXPO_PUBLIC_AI_MODE: process.env.EXPO_PUBLIC_AI_MODE,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
    }
  }
};