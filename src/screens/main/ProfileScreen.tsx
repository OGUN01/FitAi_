/**
 * ProfileScreen - Modular Component-Based Implementation
 *
 * Uses the polished components from ./profile/ directory
 * Following FitAI UI/UX methodology
 */

import React from "react";
import Constants from "expo-constants";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EditProvider,
  useEditActions,
  useEditStatus,
} from "../../contexts/EditContext";
import { EditOverlay } from "../../components/profile/EditOverlay";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { ResponsiveTheme } from "../../utils/constants";
import { useProfileLogic } from "../../hooks/useProfileLogic";

import {
  ProfileHeader,
  ProfileStats,
  GuestPromptCard,
  SettingsSection,
  AppInfoCard,
  LogoutButton,
} from "./profile";

import {
  PersonalInfoEditModal,
  GoalsPreferencesEditModal,
  BodyMeasurementsEditModal,
  SettingsSelectionModal,
  ClearCacheConfirmModal,
} from "./profile/modals";

import { GuestSignUpScreen } from "./GuestSignUpScreen";
import { LogoutConfirmationModal } from "../../components/profile/LogoutConfirmationModal";
import { SettingsScreenRenderer } from "../../components/profile/SettingsScreenRenderer";

const ProfileScreenInternal: React.FC<{ navigation?: any }> = ({
  navigation,
}) => {
  const { showOverlay, setShowOverlay } = useEditStatus();
  const {
    isAuthenticated,
    isGuestMode,
    userStats,
    currentSettingsScreen,
    setCurrentSettingsScreen,
    showGuestSignUp,
    setShowGuestSignUp,
    showLogoutConfirmation,
    showEditModal,
    setShowEditModal,
    handleEditProfile,
    handleSignUpRedirect,
    handleSignOut,
    confirmLogout,
    cancelLogout,
    handleSettingItemPress,
    handleStatPress,
    accountItems,
    preferencesItems,
    appItems,
    dataItems,
    userName,
    memberSince,
    // Settings modals
    showThemeModal,
    setShowThemeModal,
    showUnitsModal,
    setShowUnitsModal,
    showLanguageModal,
    setShowLanguageModal,
    showClearCacheModal,
    setShowClearCacheModal,
    themePreference,
    unitsPreference,
    handleThemeSelect,
    handleUnitsSelect,
    handleLanguageSelect,
    handleClearCache,
  } = useProfileLogic();

  if (currentSettingsScreen) {
    return (
      <SettingsScreenRenderer
        currentScreen={currentSettingsScreen}
        onBack={() => setCurrentSettingsScreen(null)}
      />
    );
  }

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
          <ProfileHeader
            userName={userName || ""}
            memberSince={memberSince}
            onEditPress={handleEditProfile}
          />

          {isGuestMode && (
            <GuestPromptCard
              onSignUpPress={handleSignUpRedirect}
              animationDelay={100}
            />
          )}

          <ProfileStats
            currentStreak={userStats?.currentStreak || 0}
            totalWorkouts={userStats?.totalWorkouts || 0}
            totalCaloriesBurned={userStats?.totalCaloriesBurned || 0}
            longestStreak={userStats?.longestStreak || 0}
            achievements={userStats?.achievements || 0}
            onStatPress={handleStatPress}
          />

          <SettingsSection
            title="Account"
            items={accountItems}
            onItemPress={handleSettingItemPress}
            animationDelay={200}
          />

          <SettingsSection
            title="Preferences"
            items={preferencesItems}
            onItemPress={handleSettingItemPress}
            animationDelay={300}
          />

          <SettingsSection
            title="App"
            items={appItems}
            onItemPress={handleSettingItemPress}
            animationDelay={400}
          />

          <SettingsSection
            title="Data"
            items={dataItems}
            onItemPress={handleSettingItemPress}
            animationDelay={500}
          />

          <AppInfoCard version={Constants.expoConfig?.version ?? "0.0.0"} animationDelay={600} />

          {isAuthenticated && (
            <LogoutButton onPress={handleSignOut} animationDelay={700} />
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        <LogoutConfirmationModal
          visible={showLogoutConfirmation}
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
        />

        {showOverlay && (
          <EditOverlay visible={true} onClose={() => setShowOverlay(false)} />
        )}

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

        {/* Theme Selection Modal */}
        <SettingsSelectionModal
          visible={showThemeModal}
          title="Theme Preference"
          subtitle="Choose your display theme"
          icon="color-palette-outline"
          iconColor={ResponsiveTheme.colors.primary}
          selectedValue={themePreference}
          onSelect={handleThemeSelect}
          onClose={() => setShowThemeModal(false)}
          options={[
            { value: "dark", label: "Dark", icon: "moon-outline", description: "Easier on the eyes" },
            { value: "light", label: "Light", icon: "sunny-outline", description: "Classic bright look" },
            { value: "system", label: "System", icon: "phone-portrait-outline", description: "Match device setting" },
          ]}
        />

        {/* Units Selection Modal */}
        <SettingsSelectionModal
          visible={showUnitsModal}
          title="Units"
          subtitle="Choose your measurement system"
          icon="speedometer-outline"
          iconColor={ResponsiveTheme.colors.info}
          selectedValue={unitsPreference}
          onSelect={handleUnitsSelect}
          onClose={() => setShowUnitsModal(false)}
          options={[
            { value: "metric", label: "Metric", icon: "globe-outline", description: "Kilograms, centimeters" },
            { value: "imperial", label: "Imperial", icon: "flag-outline", description: "Pounds, inches" },
          ]}
        />

        {/* Language Selection Modal */}
        <SettingsSelectionModal
          visible={showLanguageModal}
          title="Language"
          subtitle="App display language"
          icon="globe-outline"
          iconColor={ResponsiveTheme.colors.success}
          selectedValue="en"
          onSelect={handleLanguageSelect}
          onClose={() => setShowLanguageModal(false)}
          options={[
            { value: "en", label: "English", icon: "chatbubble-outline", description: "Currently active" },
          ]}
          footerNote="More languages coming soon"
        />

        {/* Clear Cache Confirmation Modal */}
        <ClearCacheConfirmModal
          visible={showClearCacheModal}
          onConfirm={handleClearCache}
          onCancel={() => setShowClearCacheModal(false)}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

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
});

export default ProfileScreen;
