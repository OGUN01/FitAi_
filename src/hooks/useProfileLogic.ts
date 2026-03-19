import { useState, useEffect, useCallback, useMemo } from "react";
import { Linking, Share } from "react-native";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./useAuth";
import { useUser } from "./useUser";
import { useProfileStore } from "../stores/profileStore";
import { useUserStore } from "../stores/userStore";
import { useUnifiedStats } from "./useUnifiedStats";
import { clearAllUserData } from "../utils/clearUserData";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import { useHealthDataStore } from "../stores/healthDataStore";
import { crudOperations } from "../services/crudOperations";
import { userProfileService } from "../services/userProfile";
import { getSubscriptionSubtitle as getSubscriptionSubtitleText } from "../utils/subscriptionUi";
import { buildLegacyProfileAdapter } from "../utils/profileLegacyAdapter";
import type { SettingItem } from "../screens/main/profile";

// AsyncStorage keys for settings preferences
const STORAGE_KEY_THEME = "@fitai_theme_preference";
const STORAGE_KEY_UNITS = "@fitai_units_preference";

export type ThemePreference = "dark" | "light" | "system";
export type UnitsPreference = "metric" | "imperial";

function getSubscriptionSubtitle(
  tier: string | undefined,
  status: string | null | undefined,
): string {
  if (!tier || tier === "free") {
    return "Free tier — view plans and premium benefits";
  }

  if (status === "cancelled") {
    return "Cancellation scheduled — review billing and access";
  }

  if (status === "paused") {
    return "Paused — resume or adjust your subscription";
  }

  if (status === "authenticated" || status === "pending") {
    return "Payment received — premium access is still being confirmed";
  }

  return `Current tier: ${tier.charAt(0).toUpperCase() + tier.slice(1)} — manage billing and premium access`;
}

export const useProfileLogic = () => {
  const { user, isAuthenticated, isGuestMode, logout, guestId } = useAuth();
  const { profile: rawProfile, clearProfile } = useUser();
  const userStats = useUnifiedStats();
  const {
    bodyAnalysis,
    personalInfo: profileStorePersonalInfo,
    workoutPreferences,
    dietPreferences,
    updatePersonalInfo,
  } = useProfileStore();
  const { currentPlan: subscriptionPlan, subscriptionStatus } =
    useSubscriptionStore();

  // State
  const [currentSettingsScreen, setCurrentSettingsScreen] = useState<
    string | null
  >(null);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);

  // Settings modal state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);

  // Persisted preferences
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("system");
  const [unitsPreference, setUnitsPreference] =
    useState<UnitsPreference>("metric");

  const profile = useMemo(
    () => ({
      ...rawProfile,
      bodyMetrics: bodyAnalysis,
      ...buildLegacyProfileAdapter({
        personalInfo: profileStorePersonalInfo,
        bodyAnalysis,
        workoutPreferences,
        dietPreferences,
        legacyProfile: rawProfile,
      }),
    }),
    [
      rawProfile,
      profileStorePersonalInfo,
      bodyAnalysis,
      workoutPreferences,
      dietPreferences,
    ],
  );

  // Load persisted preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedTheme, savedUnits] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_THEME),
          AsyncStorage.getItem(STORAGE_KEY_UNITS),
        ]);
        if (
          savedTheme === "dark" ||
          savedTheme === "light" ||
          savedTheme === "system"
        ) {
          setThemePreference(savedTheme);
        }
        if (savedUnits === "metric" || savedUnits === "imperial") {
          setUnitsPreference(savedUnits);
        }
      } catch (error) {
        console.error("[useProfileLogic] Error loading preferences:", error);
      }
    };
    loadPreferences();
  }, []);

  useEffect(() => {
    const profileUnits = profileStorePersonalInfo?.units;
    if (profileUnits !== "metric" && profileUnits !== "imperial") {
      return;
    }

    setUnitsPreference((currentUnits) =>
      currentUnits === profileUnits ? currentUnits : profileUnits,
    );

    AsyncStorage.setItem(STORAGE_KEY_UNITS, profileUnits).catch((error) => {
      console.error("[useProfileLogic] Error syncing units preference:", error);
    });
  }, [profileStorePersonalInfo?.units]);

  // Check for profile edit intent on mount
  useEffect(() => {
    const checkEditIntent = async () => {
      try {
        const intentData = await AsyncStorage.getItem("profileEditIntent");
        if (intentData) {
          const intent = JSON.parse(intentData);
          const isRecent = Date.now() - intent.timestamp < 5 * 60 * 1000;
          if (isRecent && intent.section) {
            console.log("[ProfileScreen] Found edit intent:", intent);
            await AsyncStorage.removeItem("profileEditIntent");
            // Handle the intent
            if (intent.section === "personal-info")
              setShowEditModal("personal-info");
            else if (intent.section === "goals") setShowEditModal("goals");
            else if (intent.section === "measurements")
              setShowEditModal("measurements");
          }
        }
      } catch (error) {
        console.error("[ProfileScreen] Error checking edit intent:", error);
      }
    };
    checkEditIntent();
  }, []);

  // Handlers
  const handleEditProfile = () => {
    setShowEditModal("personal-info");
  };

  const handleSignUpRedirect = () => {
    setShowGuestSignUp(true);
  };

  const handleSignOut = () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirmation(false);
    try {
      // First logout from auth
      await logout();

      // Clear profile store
      clearProfile();

      // CRITICAL: Clear ALL user data from ALL stores to prevent data leakage
      await clearAllUserData();

      console.log("[ProfileScreen] Logout complete - all user data cleared");
    } catch (error) {
      console.error("[ProfileScreen] Logout error:", error);
      crossPlatformAlert("Error", "Failed to sign out. Please try again.");
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

  // Theme handler — persist and apply
  const handleThemeSelect = useCallback(async (value: string) => {
    const theme = value as ThemePreference;
    setThemePreference(theme);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_THEME, theme);
      console.log("[useProfileLogic] Theme preference saved:", theme);
    } catch (error) {
      console.error("[useProfileLogic] Error saving theme:", error);
    }
    setShowThemeModal(false);
  }, []);

  // Units handler — persist choice
  const handleUnitsSelect = useCallback(
    async (value: string) => {
      const units = value as UnitsPreference;
      setUnitsPreference(units);
      try {
        await AsyncStorage.setItem(STORAGE_KEY_UNITS, units);
        updatePersonalInfo({ units });

        const currentProfile = useUserStore.getState().profile;
        if (currentProfile) {
          useUserStore.getState().setProfile({
            ...currentProfile,
            personalInfo: {
              ...currentProfile.personalInfo,
              units,
            },
            preferences: {
              ...currentProfile.preferences,
              units,
            },
          });
        }

        if (user?.id) {
          const result = await userProfileService.updateProfile(user.id, {
            units,
          });
          if (!result.success) {
            console.error(
              "[useProfileLogic] Failed to sync units preference:",
              result.error,
            );
          }
        }

        console.log("[useProfileLogic] Units preference saved:", units);
      } catch (error) {
        console.error("[useProfileLogic] Error saving units:", error);
      }
      setShowUnitsModal(false);
    },
    [updatePersonalInfo, user?.id],
  );

  // Language handler — currently single-language, just close
  const handleLanguageSelect = useCallback((_value: string) => {
    // English is currently the only supported language
    setShowLanguageModal(false);
  }, []);

  // Clear cache handler
  const handleClearCache = useCallback(async () => {
    try {
      // Clear image / fetch caches stored in AsyncStorage (preserve auth & preferences)
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        (key) =>
          key.startsWith("@fitai_cache_") ||
          key.startsWith("@fitai_image_") ||
          key.startsWith("@fitai_temp_"),
      );
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      console.log(
        `[useProfileLogic] Cache cleared (${cacheKeys.length} entries removed)`,
      );
    } catch (error) {
      console.error("[useProfileLogic] Error clearing cache:", error);
    }
    setShowClearCacheModal(false);
  }, []);

  const handleSettingItemPress = async (item: SettingItem) => {
    console.log("[ProfileScreen] Setting item pressed:", item.id);

    switch (item.id) {
      case "personal-info":
        // Use dedicated edit modal instead of onboarding
        setShowEditModal("personal-info");
        break;
      case "goals":
        // Use dedicated edit modal instead of onboarding
        setShowEditModal("goals");
        break;
      case "measurements":
        // Use dedicated edit modal instead of onboarding
        setShowEditModal("measurements");
        break;
      case "subscription":
        if (!isAuthenticated) {
          setShowGuestSignUp(true);
          break;
        }
        setCurrentSettingsScreen("subscription");
        break;
      case "notifications":
        setCurrentSettingsScreen("notifications");
        break;
      case "theme": {
        crossPlatformAlert(
          "Theme",
          "FitAI currently uses a fixed dark theme. Additional theme options are coming soon.",
        );
        break;
      }
      case "units":
        setShowUnitsModal(true);
        break;
      case "language":
        setShowLanguageModal(true);
        break;
      case "privacy":
        setCurrentSettingsScreen("privacy");
        break;
      case "help":
        setCurrentSettingsScreen("help");
        break;
      case "about":
        setCurrentSettingsScreen("about");
        break;
      case "terms":
        Linking.openURL("https://fitai.app/privacy").catch(() =>
          crossPlatformAlert(
            "Terms & Privacy",
            "Could not open the document. Please visit fitai.app/privacy in your browser.",
          ),
        );
        break;
      case "export": {
        // Export all user data as JSON and share via native share sheet
        try {
          const data = await crudOperations.exportAllData();
          if (data) {
            const json = JSON.stringify(data, null, 2);
            await Share.share({
              message: json,
              title: "FitAI Data Export",
            });
          } else {
            crossPlatformAlert("Export Data", "No data found to export.");
          }
        } catch (exportError) {
          console.error("[useProfileLogic] Export failed:", exportError);
          crossPlatformAlert(
            "Export Failed",
            "Could not export data. Please try again.",
          );
        }
        break;
      }
      case "sync": {
        // Trigger a real sync from connected health provider
        const {
          isHealthConnectAuthorized,
          isHealthKitAuthorized,
          syncFromHealthConnect,
          syncHealthData,
        } = useHealthDataStore.getState();
        if (isHealthConnectAuthorized) {
          crossPlatformAlert(
            "Syncing…",
            "Fetching latest data from Health Connect.",
          );
          syncFromHealthConnect(7).catch((e: any) =>
            console.warn("[useProfileLogic] Health sync failed:", e),
          );
        } else if (isHealthKitAuthorized) {
          crossPlatformAlert(
            "Syncing…",
            "Fetching latest data from HealthKit.",
          );
          syncHealthData(true).catch((e: any) =>
            console.warn("[useProfileLogic] HealthKit sync failed:", e),
          );
        } else {
          crossPlatformAlert(
            "No Health App Connected",
            "Connect a wearable or health app in Settings → Connect Wearables to enable sync.",
          );
        }
        break;
      }
      case "wearables":
        setCurrentSettingsScreen("wearables");
        break;
      case "cache":
        setShowClearCacheModal(true);
        break;
      default:
        console.log("[ProfileScreen] Unknown setting:", item.id);
    }
  };

  // Stat card press handlers
  const handleStatPress = useCallback(
    (statId: string) => {
      const showAlert = (title: string, message: string) => {
        crossPlatformAlert(title, message);
      };
      switch (statId) {
        case "current-streak": {
          const streak = userStats?.currentStreak || 0;
          showAlert(
            "🔥 Day Streak",
            `You're on a ${streak} day streak! Keep it up!`,
          );
          break;
        }
        case "workouts": {
          const workouts = userStats?.totalWorkouts || 0;
          showAlert(
            "💪 Workouts",
            `You've completed ${workouts} workout${workouts === 1 ? "" : "s"}. ${workouts === 0 ? "Start your first workout!" : "Amazing progress!"}`,
          );
          break;
        }
        case "calories": {
          const cals = userStats?.totalCaloriesBurned || 0;
          showAlert(
            "🔥 Calories Burned",
            `${cals} calories burned. Great progress!`,
          );
          break;
        }
        case "best-streak": {
          const best = userStats?.longestStreak || 0;
          showAlert(
            "🏆 Best Streak",
            `Your best streak is ${best} day${best === 1 ? "" : "s"}. Can you beat it?`,
          );
          break;
        }
        case "achievements": {
          const count = userStats?.achievements || 0;
          showAlert(
            "🎖️ Achievements",
            `${count} achievement${count === 1 ? "" : "s"} earned. ${count === 0 ? "Complete workouts to unlock achievements!" : "Keep going!"}`,
          );
          break;
        }
        default:
          break;
      }
    },
    [userStats],
  );

  // Check profile completion
  const isProfileIncomplete = (section: string): boolean => {
    switch (section) {
      case "personal-info":
        // SSOT: profileStore.personalInfo is authoritative (onboarding_data table)
        // Compute name from first+last fields first, then fall back to name field, then userStore
        const profileName =
          `${profileStorePersonalInfo?.first_name || ""} ${profileStorePersonalInfo?.last_name || ""}`.trim();
        const resolvedName =
          profileName ||
          profileStorePersonalInfo?.name ||
          profile?.personalInfo?.name;
        // SSOT: age from profileStore.personalInfo first, then userStore
        const resolvedAge =
          profileStorePersonalInfo?.age || profile?.personalInfo?.age;
        return !resolvedName || !resolvedAge;
      case "goals":
        // SSOT: profileStore.workoutPreferences.primary_goals is authoritative; profile.fitnessGoals is legacy fallback
        const resolvedGoals =
          useProfileStore.getState().workoutPreferences?.primary_goals ||
          profile?.fitnessGoals?.primary_goals;
        return !resolvedGoals || resolvedGoals.length === 0;
      case "measurements":
        const height = bodyAnalysis?.height_cm;
        const weight = bodyAnalysis?.current_weight_kg;
        return !height || !weight;
      default:
        return false;
    }
  };

  // Settings data
  const accountItems: SettingItem[] = [
    {
      id: "personal-info",
      title: "Personal Information",
      subtitle: "Name, age, gender, activity level",
      icon: "person-outline",
      iconColor: "#4CAF50",
      isIncomplete: isProfileIncomplete("personal-info"),
    },
    {
      id: "goals",
      title: "Goals & Preferences",
      subtitle: "Fitness goals, activity level",
      icon: "flag-outline",
      iconColor: "#FF9800",
      isIncomplete: isProfileIncomplete("goals"),
    },
    {
      id: "measurements",
      title: "Body Measurements",
      subtitle: "Track body composition",
      icon: "body-outline",
      iconColor: "#FF6B35",
      isIncomplete: isProfileIncomplete("measurements"),
    },
    {
      id: "subscription",
      title: "Manage Subscription",
      subtitle: getSubscriptionSubtitleText(
        subscriptionPlan?.tier,
        subscriptionStatus,
      ),
      icon: "diamond-outline",
      iconColor: "#FF8A5C",
      isPremium: true,
    },
  ];

  // Derive units subtitle from current preference
  const unitsSubtitleMap: Record<UnitsPreference, string> = {
    metric: "Metric (kg, cm)",
    imperial: "Imperial (lbs, in)",
  };

  const preferencesItems: SettingItem[] = [
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "Reminders and alerts",
      icon: "notifications-outline",
      iconColor: "#FF6B6B",
    },
    {
      id: "theme",
      title: "Theme",
      subtitle: "Fixed dark theme",
      icon: "color-palette-outline",
      iconColor: "#FF6B35",
    },
    {
      id: "units",
      title: "Units",
      subtitle: unitsSubtitleMap[unitsPreference],
      icon: "speedometer-outline",
      iconColor: "#00BCD4",
    },
    {
      id: "language",
      title: "Language",
      subtitle: "English",
      icon: "globe-outline",
      iconColor: "#4CAF50",
    },
  ];

  const appItems: SettingItem[] = [
    {
      id: "privacy",
      title: "Privacy & Security",
      subtitle: "Data protection settings",
      icon: "lock-closed-outline",
      iconColor: "#FF6B35",
    },
    {
      id: "help",
      title: "Help & Support",
      subtitle: "FAQ and contact us",
      icon: "help-circle-outline",
      iconColor: "#00BCD4",
    },
    {
      id: "about",
      title: "About FitAI",
      subtitle: "Version, legal",
      icon: "information-circle-outline",
      iconColor: "#FF9800",
    },
  ];

  const dataItems: SettingItem[] = [
    {
      id: "wearables",
      title: "Connect Wearables",
      subtitle: "Sync smartwatch & fitness bands",
      icon: "watch-outline",
      iconColor: "#E55A2B",
    },
    {
      id: "export",
      title: "Export Data",
      subtitle: "Download your fitness data",
      icon: "download-outline",
      iconColor: "#4CAF50",
    },
    {
      id: "sync",
      title: "Sync Settings",
      subtitle: "Health app integration",
      icon: "sync-outline",
      iconColor: "#2196F3",
    },
    {
      id: "cache",
      title: "Clear Cache",
      subtitle: "Free up storage",
      icon: "trash-outline",
      iconColor: "#F44336",
      isDestructive: true,
    },
  ];

  // Get user display info
  // SSOT: profileStore.personalInfo is authoritative; prefer first_name+last_name (DB fields) then name (computed), then userStore fallback
  const profileStoreName =
    `${profileStorePersonalInfo?.first_name || ""} ${profileStorePersonalInfo?.last_name || ""}`.trim();
  const userName =
    profileStoreName ||
    profileStorePersonalInfo?.name ||
    profile?.personalInfo?.name ||
    undefined;
  const memberSince = (() => {
    if (!user?.createdAt) return null; // null = show 'Just joined today' fallback
    const created = new Date(user.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return null; // today
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks === 1 ? "" : "s"}`;
    }
    return created.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  })();

  return {
    // Auth state
    user,
    isAuthenticated,
    isGuestMode,
    profile,
    userStats,

    // UI state
    currentSettingsScreen,
    setCurrentSettingsScreen,
    showGuestSignUp,
    setShowGuestSignUp,
    showLogoutConfirmation,
    showEditModal,
    setShowEditModal,

    // Settings modals state
    showThemeModal,
    setShowThemeModal,
    showUnitsModal,
    setShowUnitsModal,
    showLanguageModal,
    setShowLanguageModal,
    showClearCacheModal,
    setShowClearCacheModal,

    // Persisted preferences
    themePreference,
    unitsPreference,

    // Settings modal handlers
    handleThemeSelect,
    handleUnitsSelect,
    handleLanguageSelect,
    handleClearCache,

    // Handlers
    handleEditProfile,
    handleSignUpRedirect,
    handleSignOut,
    confirmLogout,
    cancelLogout,
    handleSettingItemPress,
    handleStatPress,

    // Settings data
    accountItems,
    preferencesItems,
    appItems,
    dataItems,

    // User display info
    userName,
    memberSince,
  };
};
