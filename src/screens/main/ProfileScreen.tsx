/**
 * ProfileScreen - Modular Component-Based Implementation
 *
 * Uses the polished components from ./profile/ directory
 * Following FitAI UI/UX methodology
 */

import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../../hooks/useAuth";
import { useUser, useUserStats } from "../../hooks/useUser";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import {
  EditProvider,
  useEditActions,
  useEditStatus,
} from "../../contexts/EditContext";
import { EditOverlay } from "../../components/profile/EditOverlay";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { ResponsiveTheme } from "../../utils/constants";
import { rf } from "../../utils/responsive";
import { gradients, toLinearGradientProps } from "../../theme/gradients";

// Import modular profile components
import {
  ProfileHeader,
  ProfileStats,
  GuestPromptCard,
  SettingsSection,
  AppInfoCard,
  LogoutButton,
  type SettingItem,
} from "./profile";

// Import settings screens
import {
  NotificationsScreen,
  PrivacySecurityScreen,
  HelpSupportScreen,
  AboutFitAIScreen,
  WearableConnectionScreen,
} from "../settings";

// Import edit modals
import {
  PersonalInfoEditModal,
  GoalsPreferencesEditModal,
  BodyMeasurementsEditModal,
} from "./profile/modals";

import { GuestSignUpScreen } from "./GuestSignUpScreen";

// Internal ProfileScreen component
const ProfileScreenInternal: React.FC<{ navigation?: any }> = ({
  navigation,
}) => {
  const { user, isAuthenticated, isGuestMode, logout, guestId } = useAuth();
  const { profile, clearProfile } = useUser();
  const userStats = useUserStats();
  const { startEdit } = useEditActions();
  const { showOverlay, setShowOverlay } = useEditStatus();

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
      await logout();
      clearProfile();
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

  // Render settings screen if one is active
  if (currentSettingsScreen) {
    const renderSettingsScreen = () => {
      switch (currentSettingsScreen) {
        case "notifications":
          return (
            <NotificationsScreen
              onBack={() => setCurrentSettingsScreen(null)}
            />
          );
        case "privacy":
          return (
            <PrivacySecurityScreen
              onBack={() => setCurrentSettingsScreen(null)}
            />
          );
        case "help":
          return (
            <HelpSupportScreen onBack={() => setCurrentSettingsScreen(null)} />
          );
        case "about":
          return (
            <AboutFitAIScreen onBack={() => setCurrentSettingsScreen(null)} />
          );
        case "wearables":
          return (
            <WearableConnectionScreen
              onBack={() => setCurrentSettingsScreen(null)}
            />
          );
        default:
          return null;
      }
    };
    return renderSettingsScreen();
  }

  // Guest sign up screen
  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onSignUpSuccess={() => setShowGuestSignUp(false)}
        onBack={() => setShowGuestSignUp(false)}
      />
    );
  }

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <ProfileHeader
            userName={userName || ""}
            memberSince={memberSince}
            onEditPress={handleEditProfile}
          />

          {/* Guest Sign Up Prompt */}
          {isGuestMode && (
            <GuestPromptCard
              onSignUpPress={handleSignUpRedirect}
              animationDelay={100}
            />
          )}

          {/* Stats Row */}
          <ProfileStats
            currentStreak={userStats?.currentStreak || 0}
            totalWorkouts={userStats?.totalWorkouts || 0}
            totalCaloriesBurned={userStats?.totalCaloriesBurned || 0}
            longestStreak={userStats?.longestStreak || 0}
            achievements={userStats?.achievements?.length || 0}
            onStatPress={(statId) =>
              console.log("[ProfileScreen] Stat pressed:", statId)
            }
          />

          {/* Account Section */}
          <SettingsSection
            title="Account"
            items={accountItems}
            onItemPress={handleSettingItemPress}
            animationDelay={200}
          />

          {/* Preferences Section */}
          <SettingsSection
            title="Preferences"
            items={preferencesItems}
            onItemPress={handleSettingItemPress}
            animationDelay={300}
          />

          {/* App Section */}
          <SettingsSection
            title="App"
            items={appItems}
            onItemPress={handleSettingItemPress}
            animationDelay={400}
          />

          {/* Data Section */}
          <SettingsSection
            title="Data"
            items={dataItems}
            onItemPress={handleSettingItemPress}
            animationDelay={500}
          />

          {/* App Info */}
          <AppInfoCard version="1.0.0" animationDelay={600} />

          {/* Logout Button */}
          {isAuthenticated && (
            <LogoutButton onPress={handleSignOut} animationDelay={700} />
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Logout Confirmation Modal */}
        <Modal
          visible={showLogoutConfirmation}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelLogout}
        >
          <BlurView intensity={80} style={styles.blurContainer}>
            <View style={styles.confirmationDialog}>
              <GlassCard
                elevation={5}
                blurIntensity="heavy"
                padding="lg"
                borderRadius="xl"
              >
                <View style={styles.confirmationIconContainer}>
                  <Ionicons
                    name="log-out-outline"
                    size={rf(48)}
                    color={ResponsiveTheme.colors.error}
                  />
                </View>
                <Text style={styles.confirmationTitle}>Sign Out</Text>
                <Text style={styles.confirmationMessage}>
                  Are you sure you want to sign out? Your progress will be
                  saved.
                </Text>

                <View style={styles.confirmationActions}>
                  <AnimatedPressable
                    style={[
                      styles.confirmationButton,
                      styles.confirmationButtonCancel,
                    ]}
                    onPress={cancelLogout}
                    scaleValue={0.95}
                  >
                    <Text style={styles.confirmationButtonTextCancel}>
                      Cancel
                    </Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    style={[
                      styles.confirmationButton,
                      styles.confirmationButtonConfirm,
                    ]}
                    onPress={confirmLogout}
                    scaleValue={0.95}
                  >
                    <LinearGradient
                      {...toLinearGradientProps(gradients.button.error)}
                      style={styles.confirmationButtonGradient}
                    >
                      <Text style={styles.confirmationButtonText}>
                        Sign Out
                      </Text>
                    </LinearGradient>
                  </AnimatedPressable>
                </View>
              </GlassCard>
            </View>
          </BlurView>
        </Modal>

        {/* Edit Overlay */}
        {showOverlay && (
          <EditOverlay visible={true} onClose={() => setShowOverlay(false)} />
        )}

        {/* Edit Modals */}
        <PersonalInfoEditModal
          visible={showEditModal === "personal-info"}
          onClose={() => setShowEditModal(null)}
        />
        <GoalsPreferencesEditModal
          visible={showEditModal === "goals"}
          onClose={() => setShowEditModal(null)}
        />
        <BodyMeasurementsEditModal
          visible={showEditModal === "measurements"}
          onClose={() => setShowEditModal(null)}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

// Main ProfileScreen with EditProvider
export const ProfileScreen: React.FC<{ navigation?: any }> = ({
  navigation,
}) => {
  const handleEditComplete = async () => {
    console.log("[ProfileScreen] Edit completed");
  };

  return (
    <EditProvider
      onEditComplete={handleEditComplete}
      onEditCancel={() => console.log("[ProfileScreen] Edit cancelled")}
    >
      <ProfileScreenInternal navigation={navigation} />
    </EditProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ResponsiveTheme.spacing.xl,
  },
  bottomSpacing: {
    height: ResponsiveTheme.spacing.xxl,
  },
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  confirmationDialog: {
    width: "85%",
    maxWidth: 340,
  },
  confirmationIconContainer: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  confirmationTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  confirmationMessage: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  confirmationButton: {
    flex: 1,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
  },
  confirmationButtonCancel: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },
  confirmationButtonConfirm: {
    overflow: "hidden",
  },
  confirmationButtonGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },
  confirmationButtonTextCancel: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
  },
  confirmationButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
  },
});

export default ProfileScreen;
