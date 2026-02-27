import { useState, useEffect, useCallback } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./useAuth";
import { useUser } from "./useUser";
import { useProfileStore } from "../stores/profileStore";
import { useUnifiedStats } from "./useUnifiedStats";
import { clearAllUserData } from "../utils/clearUserData";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import type { SettingItem } from "../screens/main/profile";

// AsyncStorage keys for settings preferences
const STORAGE_KEY_THEME = "@fitai_theme_preference";
const STORAGE_KEY_UNITS = "@fitai_units_preference";

export type ThemePreference = "dark" | "light" | "system";
export type UnitsPreference = "metric" | "imperial";

export const useProfileLogic = () => {
  const { user, isAuthenticated, isGuestMode, logout, guestId } = useAuth();
  const { profile, clearProfile } = useUser();
  const userStats = useUnifiedStats();
  const { bodyAnalysis, personalInfo: profileStorePersonalInfo } = useProfileStore();
  const { currentPlan: subscriptionPlan } = useSubscriptionStore();

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
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // Persisted preferences
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("system");
  const [unitsPreference, setUnitsPreference] =
    useState<UnitsPreference>("metric");

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
  const handleUnitsSelect = useCallback(async (value: string) => {
    const units = value as UnitsPreference;
    setUnitsPreference(units);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_UNITS, units);
      console.log("[useProfileLogic] Units preference saved:", units);
    } catch (error) {
      console.error("[useProfileLogic] Error saving units:", error);
    }
    setShowUnitsModal(false);
  }, []);

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

  const handleSettingItemPress = (item: SettingItem) => {
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
        setShowPaywallModal(true);
        break;
      case "notifications":
        setCurrentSettingsScreen("notifications");
        break;
      case "theme": {
        // Toggle dark mode directly instead of opening modal
        const nextTheme: ThemePreference = themePreference === "dark" ? "light" : "dark";
        handleThemeSelect(nextTheme);
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
        crossPlatformAlert("Terms & Privacy", "Opening legal documents...");
        break;
      case "export":
        crossPlatformAlert('Export Data', 'Export feature coming soon!');
        break;
      case "sync":
        crossPlatformAlert('Sync', 'Sync settings coming soon!');
        break;
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
  const handleStatPress = useCallback((statId: string) => {
    const showAlert = (title: string, message: string) => {
      crossPlatformAlert(title, message);
    };
    switch (statId) {
      case 'current-streak': {
        const streak = userStats?.currentStreak || 0;
        showAlert('🔥 Day Streak', `You're on a ${streak} day streak! Keep it up!`);
        break;
      }
      case 'workouts': {
        const workouts = userStats?.totalWorkouts || 0;
        showAlert('💪 Workouts', `You've completed ${workouts} workout${workouts === 1 ? '' : 's'}. ${workouts === 0 ? 'Start your first workout!' : 'Amazing progress!'}`);
        break;
      }
      case 'calories': {
        const cals = userStats?.totalCaloriesBurned || 0;
        showAlert('🔥 Calories Burned', `${cals} calories burned. Great progress!`);
        break;
      }
      case 'best-streak': {
        const best = userStats?.longestStreak || 0;
        showAlert('🏆 Best Streak', `Your best streak is ${best} day${best === 1 ? '' : 's'}. Can you beat it?`);
        break;
      }
      case 'achievements': {
        const count = userStats?.achievements || 0;
        showAlert('🎖️ Achievements', `${count} achievement${count === 1 ? '' : 's'} earned. ${count === 0 ? 'Complete workouts to unlock achievements!' : 'Keep going!'}`);
        break;
      }
      default:
        break;
    }
  }, [userStats]);

  // Check profile completion
  const isProfileIncomplete = (section: string): boolean => {
    if (!profile) return true;
    switch (section) {
      case "personal-info":
        return !profile.personalInfo?.name || !profile.personalInfo?.age;
      case "goals":
        return (
          !profile.fitnessGoals?.primary_goals ||
          profile.fitnessGoals.primary_goals.length === 0
        );
      case "measurements":
        const height = profile.bodyMetrics?.height_cm || bodyAnalysis?.height_cm;
        const weight = profile.bodyMetrics?.current_weight_kg || bodyAnalysis?.current_weight_kg;
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
      subtitle: "Name, age, height, weight",
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
      subtitle: `Current tier: ${subscriptionPlan?.tier ? subscriptionPlan.tier.charAt(0).toUpperCase() + subscriptionPlan.tier.slice(1) : "Free"} — Tap to upgrade`,
      icon: "diamond-outline",
      iconColor: "#FF8A5C",
      isPremium: true,
    },
  ];

  // Derive theme subtitle from current preference
  const themeSubtitleMap: Record<ThemePreference, string> = {
    dark: "Dark mode",
    light: "Light mode",
    system: "System default",
  };

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
      title: "Dark Mode / Theme",
      subtitle: themeSubtitleMap[themePreference],
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
  const userName = profile?.personalInfo?.name || profileStorePersonalInfo?.name || `${profileStorePersonalInfo?.first_name || ''} ${profileStorePersonalInfo?.last_name || ''}`.trim() || undefined;
  const memberSince = (() => {
    if (!user?.createdAt) return null; // null = show 'Just joined today' fallback
    const created = new Date(user.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return null; // today
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'}`;
    }
    return created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
    showPaywallModal,
    setShowPaywallModal,

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
