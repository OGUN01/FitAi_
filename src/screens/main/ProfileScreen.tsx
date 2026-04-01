/**
 * ProfileScreen - Modular Component-Based Implementation
 *
 * Uses the polished components from ./profile/ directory
 * Following FitAI UI/UX methodology
 */

import React, { useState, useCallback } from "react";
import Constants from "expo-constants";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EditProvider,
  useEditActions,
  useEditStatus,
} from "../../contexts/EditContext";
import { EditOverlay } from "../../components/profile/EditOverlay";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { ResponsiveTheme } from "../../utils/constants";
import { rp, rh } from "../../utils/responsive";
import { useProfileLogic } from "../../hooks/useProfileLogic";
import { useAuthStore } from "../../stores/authStore";
import { useUserStore } from "../../stores/userStore";
import { useProfileStore } from "../../stores/profileStore";

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

const ProfileScreenInternal: React.FC<{ navigation?: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const { showOverlay, setShowOverlay } = useEditStatus();
  const [refreshing, setRefreshing] = useState(false);
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
    profile,
    // Settings modals
    showUnitsModal,
    setShowUnitsModal,
    showClearCacheModal,
    setShowClearCacheModal,
    unitsPreference,
    handleUnitsSelect,
    handleClearCache,
  } = useProfileLogic();

  // ========== SCREEN DEBUG LOG ==========
  React.useEffect(() => {
    console.warn(`\n${'='.repeat(60)}`);
    console.warn(`👤 [SCREEN DEBUG] ProfileScreen MOUNTED`);
    console.warn(`${'='.repeat(60)}`);
    console.warn(`👤 Name: ${userName} | Authenticated: ${isAuthenticated} | Guest: ${isGuestMode}`);
    console.warn(`📅 Member Since: ${memberSince}`);
    console.warn(`📊 Stats: Workouts=${userStats?.totalWorkouts ?? 0} | Calories=${userStats?.totalCaloriesBurned ?? 0} | Streak=${userStats?.currentStreak ?? 0}`);
    console.warn(`📋 Profile loaded: ${!!profile}`);
    if (profile) {
      console.warn(`  PersonalInfo: Age=${(profile.personalInfo as any)?.age} | Gender=${(profile.personalInfo as any)?.gender}`);
      console.warn(`  Goals: [${(profile.fitnessGoals as any)?.primary_goals?.join(', ') || 'none'}]`);
      console.warn(`  Body: Height=${(profile.bodyMetrics as any)?.height_cm}cm | Weight=${(profile.bodyMetrics as any)?.current_weight_kg}kg`);
      console.warn(`  Diet: ${(profile.dietPreferences as any)?.diet_type || '(none)'}`);
      console.warn(`  Workout: Location=${(profile.workoutPreferences as any)?.location} | Intensity=${(profile.workoutPreferences as any)?.intensity}`);
    }
    console.warn(`${'='.repeat(60)}\n`);
  }, []);

  React.useEffect(() => {
    const requestedSettingsScreen = route?.params?.settingsScreen;
    if (!requestedSettingsScreen) return;

    setCurrentSettingsScreen(requestedSettingsScreen);
    navigation?.setParams?.({ settingsScreen: undefined });
  }, [navigation, route?.params?.settingsScreen, setCurrentSettingsScreen]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        const profileResponse = await useUserStore
          .getState()
          .getCompleteProfile(userId);

        if (profileResponse.success && profileResponse.data) {
          const profileStore = useProfileStore.getState();
          const latestProfile = profileResponse.data as any;

          if (latestProfile.personalInfo) {
            profileStore.updatePersonalInfo(latestProfile.personalInfo);
          }
          if (latestProfile.dietPreferences) {
            profileStore.updateDietPreferences(latestProfile.dietPreferences);
          }
          if (latestProfile.workoutPreferences) {
            profileStore.updateWorkoutPreferences(
              latestProfile.workoutPreferences,
            );
          }
          if (latestProfile.bodyMetrics) {
            profileStore.updateBodyAnalysis(latestProfile.bodyMetrics);
          }
          if (latestProfile.advancedReview) {
            profileStore.updateAdvancedReview(latestProfile.advancedReview);
          }

          profileStore.setSyncStatus("synced");
        }
      }
    } catch (error) {
      console.error("[ProfileScreen] Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Guest option marker - always present in DOM for accessibility */}
          <View
            testID="guest-option"
            accessibilityLabel="Continue as guest"
            style={{ width: 0, height: 0, overflow: "hidden" }}
          />
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

          <AppInfoCard
            version={Constants.expoConfig?.version ?? "0.0.0"}
            animationDelay={600}
          />

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
          onClose={() => {
            setShowEditModal(null);
            onRefresh();
          }}
        />
        <GoalsPreferencesEditModal
          visible={showEditModal === "goals"}
          onClose={() => {
            setShowEditModal(null);
            onRefresh();
          }}
        />
        <BodyMeasurementsEditModal
          visible={showEditModal === "measurements"}
          onClose={() => {
            setShowEditModal(null);
            onRefresh();
          }}
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
            {
              value: "metric",
              label: "Metric",
              icon: "globe-outline",
              description: "Kilograms, centimeters",
            },
            {
              value: "imperial",
              label: "Imperial",
              icon: "flag-outline",
              description: "Pounds, inches",
            },
          ]}
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

export const ProfileScreen: React.FC<{ navigation?: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const handleEditComplete = async () => {
    console.log("[ProfileScreen] Edit completed");
    try {
      // Sync profileStore data to userStore for immediate UI update
      const profileStoreState = useProfileStore.getState();
      const currentProfile = useUserStore.getState().profile;
      if (currentProfile && profileStoreState.personalInfo) {
        const pInfo = profileStoreState.personalInfo;
        const displayName =
          pInfo.name ||
          `${pInfo.first_name || ""} ${pInfo.last_name || ""}`.trim();
        useUserStore.getState().setProfile({
          ...currentProfile,
          personalInfo: {
            ...currentProfile.personalInfo,
            ...pInfo,
            name: displayName || currentProfile.personalInfo?.name,
          },
        });
      }
      // Then try Supabase refresh if authenticated
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await useUserStore.getState().getCompleteProfile(userId);
      }
    } catch (error) {
      console.error(
        "[ProfileScreen] Failed to refresh profile after edit:",
        error,
      );
    }
  };

  return (
    <EditProvider
      onEditComplete={handleEditComplete}
      onEditCancel={() => console.log("[ProfileScreen] Edit cancelled")}
    >
      <ProfileScreenInternal navigation={navigation} route={route} />
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
    paddingBottom: rp(40),
  },
  bottomSpacing: {
    height: rh(100),
  },
});

export default ProfileScreen;
