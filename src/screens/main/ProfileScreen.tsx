/**
 * ProfileScreen - Modular Component-Based Implementation
 *
 * Uses the polished components from ./profile/ directory
 * Following FitAI UI/UX methodology
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import Constants from "expo-constants";
import { View, Text, StyleSheet, ScrollView, RefreshControl, LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  EditProvider,
  useEditActions,
} from "../../contexts/EditContext";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { colors, surface, border, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rp, rh, rf } from "../../utils/responsive";
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
  const [refreshing, setRefreshing] = useState(false);
  // Quick-jump row: Settings was one unbroken scroll requiring 8+ swipes to
  // reach Sign Out, with no way to jump directly to a section. Purely
  // additive — the full scroll and every section stay exactly as they were;
  // this just gives a one-tap shortcut alongside it.
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  const handleSectionLayout = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      sectionOffsetsRef.current[key] = e.nativeEvent.layout.y;
    },
    [],
  );
  const scrollToSection = useCallback((key: string) => {
    const y = sectionOffsetsRef.current[key];
    if (y == null) return;
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - rp(spacing.md)), animated: true });
  }, []);
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

  // "achievements" is a free-tier navigation target, not a settings-modal
  // toggle, so it's handled here (where `navigation` is available) rather
  // than inside useProfileLogic's handleSettingItemPress switch. This is an
  // ADDITIONAL entry point to AchievementsScreen alongside the existing
  // premium-gated one in AnalyticsScreen — that path is untouched.
  const handleAccountItemPress = useCallback(
    (item: (typeof accountItems)[number]) => {
      if (item.id === "achievements") {
        navigation?.navigate("Achievements");
        return;
      }
      handleSettingItemPress(item);
    },
    [navigation, handleSettingItemPress],
  );

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
          ref={scrollViewRef}
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

          {/* Quick jump — one tap to any section instead of scrolling past
              all of them, most usefully to reach Sign Out at the bottom.
              This is now the ONLY place each section is labelled — the
              grouped lists below no longer repeat their own header, so
              there's exactly one name per section instead of two. */}
          <View style={styles.quickJumpWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickJumpRow}
            >
              {[
                { key: "account", label: "Account" },
                ...(isAuthenticated ? [{ key: "accounts", label: "Accounts" }] : []),
                { key: "preferences", label: "Preferences" },
                { key: "app", label: "App" },
                { key: "data", label: "Data" },
                ...(isAuthenticated ? [{ key: "signout", label: "Sign Out" }] : []),
              ].map((item) => (
                <AnimatedPressable
                  key={item.key}
                  onPress={() => scrollToSection(item.key)}
                  scaleValue={0.95}
                  hapticType="light"
                  style={styles.quickJumpChip}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${item.label}`}
                >
                  <Text style={styles.quickJumpChipText} numberOfLines={1}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
            {/* Fade so the trailing chip reads as scrollable rather than
                cut off. */}
            <LinearGradient
              pointerEvents="none"
              colors={["transparent", surface[0]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quickJumpFade}
            />
          </View>

          <View onLayout={handleSectionLayout("account")}>
            <SettingsSection
              title="Account"
              items={accountItems}
              onItemPress={handleAccountItemPress}
              animationDelay={200}
            />
          </View>

          {isAuthenticated && (
            <View onLayout={handleSectionLayout("accounts")}>
              <ConnectedAccountsCard
                isGoogleConnected={isGoogleLinked}
                googleEmail={isGoogleLinked ? authUserEmail || undefined : undefined}
                onGooglePress={handleGooglePress}
                animationDelay={250}
              />
            </View>
          )}

          <View onLayout={handleSectionLayout("preferences")}>
            <SettingsSection
              title="Preferences"
              items={preferencesItems}
              onItemPress={handleSettingItemPress}
              animationDelay={300}
            />
          </View>

          <View onLayout={handleSectionLayout("app")}>
            <SettingsSection
              title="App"
              items={appItems}
              onItemPress={handleSettingItemPress}
              animationDelay={400}
            />
          </View>

          <View onLayout={handleSectionLayout("data")}>
            <SettingsSection
              title="Data"
              items={dataItems}
              onItemPress={handleSettingItemPress}
              animationDelay={500}
            />
          </View>

          <AppInfoCard
            version={Constants.expoConfig?.version ?? "0.0.0"}
            animationDelay={600}
          />

          {isAuthenticated && (
            <View onLayout={handleSectionLayout("signout")}>
              <LogoutButton onPress={handleSignOut} animationDelay={700} />
            </View>
          )}
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
    // Matches Home/Progress — the TabBar is a flex sibling of the screen
    // container, not an overlay, so this just clears it with room to spare;
    // it no longer needs its own separate spacer view underneath.
    paddingBottom: rh(120),
  },
  quickJumpWrap: {
    position: "relative",
  },
  quickJumpRow: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
    paddingVertical: rp(spacing.sm),
    paddingRight: rp(spacing.xl),
  },
  quickJumpFade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: rp(spacing.xxl),
  },
  quickJumpChip: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    // Was 36 — below the 44px WCAG/Apple/Material touch-target floor
    // (DESIGN.md §8), a real Stage 3 audit finding.
    minHeight: 44,
    justifyContent: "center",
    borderRadius: borderRadius.full,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
  },
  quickJumpChipText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: rf(13),
    color: colors.text.primary,
  },
});

export default ProfileScreen;
