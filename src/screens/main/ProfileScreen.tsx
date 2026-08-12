/**
 * ProfileScreen - Modular Component-Based Implementation
 *
 * Uses the polished components from ./profile/ directory
 * Following FitAI UI/UX methodology
 */

import React, { useState, useCallback, useEffect } from "react";
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
import { colors } from "../../theme/aurora-tokens";
import { rp, rh } from "../../utils/responsive";
import { useProfileLogic } from "../../hooks/useProfileLogic";
import { useAuthStore } from "../../stores/authStore";
import { useUserStore } from "../../stores/userStore";
import { useProfileStore } from "../../stores/profileStore";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

import {
  ProfileHeader,
  ProfileStats,
  GuestPromptCard,
  SettingsSection,
  ConnectedAccountsCard,
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
import { DestructiveConfirmModal } from "../../components/profile/DestructiveConfirmModal";
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
    accountItems,
    preferencesItems,
    appItems,
    dataItems,
    userName,
    memberSince,
    // Settings modals
    showUnitsModal,
    setShowUnitsModal,
    showClearCacheModal,
    setShowClearCacheModal,
    unitsPreference,
    handleUnitsSelect,
    handleClearCache,
  } = useProfileLogic();

  // Connected accounts (Google identity linking) — lives here rather than in
  // useProfileLogic because the linking APIs are exposed directly on authStore.
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [isGoogleLinkBusy, setIsGoogleLinkBusy] = useState(false);
  const [showUnlinkGoogleConfirm, setShowUnlinkGoogleConfirm] = useState(false);
  const authUserEmail = useAuthStore((s) => s.user?.email);

  const refreshGoogleLinkStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const linked = await useAuthStore.getState().isGoogleLinked();
      setIsGoogleLinked(linked);
    } catch (error) {
      console.error("[ProfileScreen] Failed to check Google link status:", error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshGoogleLinkStatus();
  }, [refreshGoogleLinkStatus]);

  const handleGooglePress = useCallback(async () => {
    if (isGoogleLinkBusy) return;
    if (isGoogleLinked) {
      // Destructive confirmation now routes through the shared branded
      // modal (DestructiveConfirmModal) instead of a raw OS alert, so it
      // matches the Sign Out / Delete Account visual language.
      setShowUnlinkGoogleConfirm(true);
      return;
    }

    setIsGoogleLinkBusy(true);
    try {
      const result = await useAuthStore.getState().linkGoogleAccount();
      if (result.success) {
        await refreshGoogleLinkStatus();
      } else {
        crossPlatformAlert(
          "Link Failed",
          result.error || "Could not link your Google account. Please try again.",
        );
      }
    } catch (error) {
      console.error("[ProfileScreen] Google link failed:", error);
      crossPlatformAlert(
        "Link Failed",
        "Could not link your Google account. Please try again.",
      );
    } finally {
      setIsGoogleLinkBusy(false);
    }
  }, [isGoogleLinkBusy, isGoogleLinked, refreshGoogleLinkStatus]);

  const confirmUnlinkGoogle = useCallback(async () => {
    setIsGoogleLinkBusy(true);
    try {
      const result = await useAuthStore.getState().unlinkGoogleAccount();
      if (result.success) {
        setIsGoogleLinked(false);
        setShowUnlinkGoogleConfirm(false);
      } else {
        setShowUnlinkGoogleConfirm(false);
        crossPlatformAlert(
          "Unlink Failed",
          result.error || "Could not unlink your Google account. Please try again.",
        );
      }
    } catch (error) {
      console.error("[ProfileScreen] Google unlink failed:", error);
      setShowUnlinkGoogleConfirm(false);
      crossPlatformAlert(
        "Unlink Failed",
        "Could not unlink your Google account. Please try again.",
      );
    } finally {
      setIsGoogleLinkBusy(false);
    }
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
          const latestProfile = profileResponse.data as unknown as Record<string, Record<string, unknown>>;

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
        onNavigateSettings={(screen) => setCurrentSettingsScreen(screen)}
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
          />

          <SettingsSection
            title="Account"
            items={accountItems}
            onItemPress={handleSettingItemPress}
            animationDelay={200}
          />

          {isAuthenticated && (
            <ConnectedAccountsCard
              isGoogleConnected={isGoogleLinked}
              googleEmail={isGoogleLinked ? authUserEmail || undefined : undefined}
              onGooglePress={handleGooglePress}
              animationDelay={250}
            />
          )}

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

        <DestructiveConfirmModal
          visible={showUnlinkGoogleConfirm}
          icon="close-circle-outline"
          title="Unlink Google Account"
          message="Are you sure you want to unlink your Google account? You will no longer be able to sign in with it."
          confirmLabel="Unlink"
          cancelLabel="Cancel"
          isLoading={isGoogleLinkBusy}
          onConfirm={confirmUnlinkGoogle}
          onCancel={() => setShowUnlinkGoogleConfirm(false)}
        />

        {showOverlay && (
          <EditOverlay visible={true} onClose={() => setShowOverlay(false)} />
        )}

        {/*
          NOTE: onClose intentionally does NOT trigger onRefresh() here.
          Each edit modal already writes its changes directly into
          profileStore (the runtime source of truth per CLAUDE.md rule 6)
          before calling onClose, regardless of whether the background
          Supabase sync inside the modal succeeded. Re-fetching the full
          profile from Supabase on every close raced with — and could be
          behind — that just-written local state, silently reverting the
          user's edit a few seconds after they saved it. Pull-to-refresh
          (onRefresh via RefreshControl above) remains available for an
          explicit, user-initiated resync.
        */}
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

        {/* Units Selection Modal */}
        <SettingsSelectionModal
          visible={showUnitsModal}
          title="Units"
          subtitle="Choose your measurement system"
          icon="speedometer-outline"
          iconColor={colors.info.DEFAULT}
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
    try {
      // Refresh from Supabase if authenticated
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
      onEditCancel={() => {}}
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
    paddingBottom: rh(40),
  },
  bottomSpacing: {
    height: rh(100),
  },
});

export default ProfileScreen;
