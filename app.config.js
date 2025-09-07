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
      bundleIdentifier: "com.fitai.app",
      // HealthKit permissions and entitlements
      infoPlist: {
        NSHealthShareUsageDescription: "FitAI reads your health data to provide personalized fitness recommendations and track your progress.",
        NSHealthUpdateUsageDescription: "FitAI writes workout and nutrition data to help you maintain a comprehensive health record.",
        NSMotionUsageDescription: "FitAI uses motion data to track your daily activity and workout performance."
      },
      entitlements: {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.access": []
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.fitai.app",
      versionCode: 12,
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "USE_FINGERPRINT",
        "POST_NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        // Google Fit permissions
        "android.permission.ACTIVITY_RECOGNITION",
        "com.google.android.gms.permission.ACTIVITY_RECOGNITION",
        // Health Connect permissions
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_HEART_RATE", 
        "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
        "android.permission.health.READ_DISTANCE",
        "android.permission.health.READ_WEIGHT",
        "android.permission.health.READ_SLEEP"
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
      },
      // Health Connect requirements
      minSdkVersion: 26,
      compileSdkVersion: 35,
      targetSdkVersion: 34
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
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
          defaultChannel: "default"
        }
      ],
      [
        "expo-health-kit",
        {
          healthSharePermission: "Allow FitAI to read health data from the Health app to provide personalized fitness recommendations.",
          healthUpdatePermission: "Allow FitAI to write workout and nutrition data to the Health app to maintain your comprehensive health record."
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 26,      // Health Connect requirement
            compileSdkVersion: 35,  // Required for latest androidx dependencies
            targetSdkVersion: 34,   // Optimal compatibility
          },
        },
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
      
      // All 23 Gemini API keys for massive scaling capacity (34,500 requests/day)
      EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      EXPO_PUBLIC_GEMINI_KEY_1: process.env.EXPO_PUBLIC_GEMINI_KEY_1,
      EXPO_PUBLIC_GEMINI_KEY_2: process.env.EXPO_PUBLIC_GEMINI_KEY_2,
      EXPO_PUBLIC_GEMINI_KEY_3: process.env.EXPO_PUBLIC_GEMINI_KEY_3,
      EXPO_PUBLIC_GEMINI_KEY_4: process.env.EXPO_PUBLIC_GEMINI_KEY_4,
      EXPO_PUBLIC_GEMINI_KEY_5: process.env.EXPO_PUBLIC_GEMINI_KEY_5,
      EXPO_PUBLIC_GEMINI_KEY_6: process.env.EXPO_PUBLIC_GEMINI_KEY_6,
      EXPO_PUBLIC_GEMINI_KEY_7: process.env.EXPO_PUBLIC_GEMINI_KEY_7,
      EXPO_PUBLIC_GEMINI_KEY_8: process.env.EXPO_PUBLIC_GEMINI_KEY_8,
      EXPO_PUBLIC_GEMINI_KEY_9: process.env.EXPO_PUBLIC_GEMINI_KEY_9,
      EXPO_PUBLIC_GEMINI_KEY_10: process.env.EXPO_PUBLIC_GEMINI_KEY_10,
      EXPO_PUBLIC_GEMINI_KEY_11: process.env.EXPO_PUBLIC_GEMINI_KEY_11,
      EXPO_PUBLIC_GEMINI_KEY_12: process.env.EXPO_PUBLIC_GEMINI_KEY_12,
      EXPO_PUBLIC_GEMINI_KEY_13: process.env.EXPO_PUBLIC_GEMINI_KEY_13,
      EXPO_PUBLIC_GEMINI_KEY_14: process.env.EXPO_PUBLIC_GEMINI_KEY_14,
      EXPO_PUBLIC_GEMINI_KEY_15: process.env.EXPO_PUBLIC_GEMINI_KEY_15,
      EXPO_PUBLIC_GEMINI_KEY_16: process.env.EXPO_PUBLIC_GEMINI_KEY_16,
      EXPO_PUBLIC_GEMINI_KEY_17: process.env.EXPO_PUBLIC_GEMINI_KEY_17,
      EXPO_PUBLIC_GEMINI_KEY_18: process.env.EXPO_PUBLIC_GEMINI_KEY_18,
      EXPO_PUBLIC_GEMINI_KEY_19: process.env.EXPO_PUBLIC_GEMINI_KEY_19,
      EXPO_PUBLIC_GEMINI_KEY_20: process.env.EXPO_PUBLIC_GEMINI_KEY_20,
      EXPO_PUBLIC_GEMINI_KEY_21: process.env.EXPO_PUBLIC_GEMINI_KEY_21,
      EXPO_PUBLIC_GEMINI_KEY_22: process.env.EXPO_PUBLIC_GEMINI_KEY_22,
      
      EXPO_PUBLIC_YOUTUBE_API_KEY: process.env.EXPO_PUBLIC_YOUTUBE_API_KEY,
      EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
      EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
      EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT,
      EXPO_PUBLIC_AI_MODE: process.env.EXPO_PUBLIC_AI_MODE,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      
      // Subscription environment variables
      IOS_SHARED_SECRET: process.env.IOS_SHARED_SECRET,
      ANDROID_SERVICE_ACCOUNT_KEY: process.env.ANDROID_SERVICE_ACCOUNT_KEY
    }
  }
};