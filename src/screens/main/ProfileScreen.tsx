/**
 * ProfileScreen - Modular Component-Based Implementation
 *
 * Uses the polished components from ./profile/ directory
 * Following FitAI UI/UX methodology
 */

import React from "react";
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
    accountItems,
    preferencesItems,
    appItems,
    dataItems,
    userName,
    memberSince,
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

          <AppInfoCard version="1.0.0" animationDelay={600} />

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
