import { useState, useEffect } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./useAuth";
import { useUser, useUserStats } from "./useUser";
import { clearAllUserData } from "../utils/clearUserData";
import type { SettingItem } from "../screens/main/profile";

export const useProfileLogic = () => {
  const { user, isAuthenticated, isGuestMode, logout, guestId } = useAuth();
  const { profile, clearProfile } = useUser();
  const userStats = useUserStats();

  // State
  const [currentSettingsScreen, setCurrentSettingsScreen] = useState<
    string | null
  >(null);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);

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
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

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
      case "notifications":
        setCurrentSettingsScreen("notifications");
        break;
      case "theme":
        Alert.alert("Theme", "Theme selection coming soon!");
        break;
      case "units":
        Alert.alert("Units", "Units selection coming soon!");
        break;
      case "language":
        Alert.alert("Language", "Language selection coming soon!");
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
        Alert.alert("Terms & Privacy", "Opening legal documents...");
        break;
      case "export":
        Alert.alert("Export Data", "Export feature coming soon!");
        break;
      case "sync":
        Alert.alert("Sync", "Sync settings coming soon!");
        break;
      case "wearables":
        setCurrentSettingsScreen("wearables");
        break;
      case "cache":
        Alert.alert(
          "Clear Cache",
          "Are you sure you want to clear the cache?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Clear",
              style: "destructive",
              onPress: () => console.log("Cache cleared"),
            },
          ],
        );
        break;
      default:
        console.log("[ProfileScreen] Unknown setting:", item.id);
    }
  };

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
        return !profile.bodyMetrics?.height || !profile.bodyMetrics?.weight;
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
      iconColor: "#667eea",
      isIncomplete: isProfileIncomplete("measurements"),
    },
  ];

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
      title: "Theme Preference",
      subtitle: "Dark, light, auto",
      icon: "color-palette-outline",
      iconColor: "#9C27B0",
    },
    {
      id: "units",
      title: "Units",
      subtitle: "Metric or Imperial",
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
      iconColor: "#667eea",
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
      iconColor: "#E91E63",
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
  const userName = profile?.personalInfo?.name; // NO FALLBACK - single source of truth
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Recently";

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

    // Handlers
    handleEditProfile,
    handleSignUpRedirect,
    handleSignOut,
    confirmLogout,
    cancelLogout,
    handleSettingItemPress,

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
