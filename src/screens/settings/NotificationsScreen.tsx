/**
 * NotificationsScreen - Smart Notification Settings
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Platform, Linking, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { colors, spacing, borderRadius, surface, border } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

import { ExpoGoMessage } from "./components/ExpoGoMessage";
import { DescriptionCard } from "./components/DescriptionCard";
import { SectionHeader } from "../../components/settings/SectionHeader";
import { ResetButton } from "./components/ResetButton";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { useNotificationsScreen } from "./hooks/useNotificationsScreen";

const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient" ||
  (__DEV__ && !Constants.isDevice && !Constants.platform?.web);

// On web, `Constants.appOwnership === "expo"` is true under the Expo dev
// server, which would wrongly route web users to the Expo Go / `eas build`
// message. Notifications simply aren't supported on web, so we show a
// web-appropriate unavailable card instead.
const isWeb = Platform.OS === "web";

let WaterReminderEditModal: any = null;
let NotificationEditModal: any = null;
let useNotificationStore: any = null;
let useWaterReminders: any = null;
let useMealReminders: any = null;
let useSleepReminders: any = null;
let useWorkoutReminders: any = null;

if (!isExpoGo) {
  try {
    WaterReminderEditModal =
      require("../../components/notifications/WaterReminderEditModal").default;
    NotificationEditModal =
      require("../../components/notifications/NotificationEditModal").default;

    const notificationStore = require("../../stores/notificationStore");
    useNotificationStore = notificationStore.useNotificationStore;
    useWaterReminders = notificationStore.useWaterReminders;
    useMealReminders = notificationStore.useMealReminders;
    useSleepReminders = notificationStore.useSleepReminders;
    useWorkoutReminders = notificationStore.useWorkoutReminders;
  } catch (error) {
    console.warn("Failed to load notification modules:", error);
  }
}

interface NotificationsScreenProps {
  onBack?: () => void;
}

interface NotificationItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  timeInfo?: string;
  enabled: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  animationDelay: number;
  /** Visually dims the row (e.g. a feature that isn't actually wired up to
   * send notifications yet). Intentionally NOT forwarded to the native
   * Switch's `disabled` prop — RN blocks onValueChange for disabled
   * switches, which would make `onToggle` unreachable by tapping. Callers
   * that need a "this doesn't work yet" explanation must intercept via
   * `onToggle` instead, same as the other guarded toggles. */
  disabled?: boolean;
  isLast?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  timeInfo,
  enabled,
  onToggle,
  onEdit,
  animationDelay,
  disabled,
  isLast = false,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <View
        style={[
          styles.notificationCard,
          !isLast && styles.notificationCardBorder,
          disabled && styles.notificationCardDisabled,
        ]}
      >
        <View style={styles.notificationContent}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}15` },
            ]}
          >
            <Ionicons name={icon} size={rf(20)} color={iconColor} />
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={styles.notificationTitle}>{title}</Text>
            <Text style={styles.notificationDescription} numberOfLines={2}>
              {description}
            </Text>
            {enabled && timeInfo && (
              onEdit ? (
                <AnimatedPressable
                  onPress={() => {
                    haptics.light();
                    onEdit();
                  }}
                  scaleValue={0.95}
                  hapticFeedback={false}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${title} time, currently ${timeInfo}`}
                >
                  <View style={styles.timeInfoBadge}>
                    <Ionicons
                      name="time-outline"
                      size={rf(10)}
                      color={colors.primary.DEFAULT}
                    />
                    <Text style={styles.timeInfoText}>{timeInfo}</Text>
                  </View>
                </AnimatedPressable>
              ) : (
                // No edit action for this item — render the badge as static
                // info instead of a pressable that does nothing.
                <View style={styles.timeInfoBadge}>
                  <Ionicons
                    name="time-outline"
                    size={rf(10)}
                    color={colors.primary.DEFAULT}
                  />
                  <Text style={styles.timeInfoText}>{timeInfo}</Text>
                </View>
              )
            )}
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {onEdit && (
              <AnimatedPressable
                onPress={() => {
                  haptics.light();
                  onEdit();
                }}
                scaleValue={0.9}
                hapticFeedback={false}
                hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${title} settings`}
              >
                <View style={styles.editButton}>
                  <Ionicons
                    name="settings-outline"
                    size={rf(14)}
                    color={colors.text.secondary}
                  />
                </View>
              </AnimatedPressable>
            )}
            <Switch
              value={enabled}
              onValueChange={() => {
                haptics.light();
                onToggle();
              }}
              trackColor={{
                false: surface[2],
                true: `${colors.primary.DEFAULT}50`,
              }}
              thumbColor={
                enabled
                  ? colors.primary.DEFAULT
                  : colors.text.tertiary
              }
              ios_backgroundColor={surface[2]}
              accessibilityRole="switch"
              accessibilityLabel={title}
              accessibilityState={{ checked: enabled }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
}) => {
  const notificationsUnavailable =
    isExpoGo ||
    !useNotificationStore ||
    !WaterReminderEditModal ||
    !NotificationEditModal;

  if (notificationsUnavailable) {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <GlassHeader
            title="Notifications"
            titleIcon="notifications-outline"
            onBack={onBack}
          />
          {isWeb ? (
            <View style={styles.unavailableContainer}>
              <View style={styles.unavailableCard}>
                <Text style={styles.unavailableTitle}>
                  Notifications Unavailable
                </Text>
                <Text style={styles.unavailableText}>
                  Reminders aren't supported in the web app yet. Use the FitAI
                  mobile app to set up water, meal, workout, and sleep
                  reminders.
                </Text>
              </View>
            </View>
          ) : isExpoGo ? (
            <ExpoGoMessage />
          ) : (
            <View style={styles.unavailableContainer}>
              <View style={styles.unavailableCard}>
                <Text style={styles.unavailableTitle}>
                  Notifications Unavailable
                </Text>
                <Text style={styles.unavailableText}>
                  Reminder settings could not be loaded on this build, so the
                  controls are hidden instead of showing broken toggles.
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  const {
    editModal,
    scheduledCount,
    preferences,
    isInitialized,
    error,
    handleToggle,
    handleEditPress,
    closeEditModal,
    handleResetDefaults,
    getTimeDisplay,
  } = useNotificationsScreen({ useNotificationStore, isExpoGo });

  const waterReminders = useWaterReminders?.();
  const workoutReminders = useWorkoutReminders?.();
  const mealReminders = useMealReminders?.();
  const sleepReminders = useSleepReminders?.();

  // Re-check notification permission when the app returns to the foreground.
  // If the user granted permission from OS Settings while the app was
  // backgrounded, isInitialized would otherwise stay false (and every
  // toggle/save a silent no-op — see handleToggleGuarded below) until the
  // next full app restart, since nothing else re-invokes initialize().
  React.useEffect(() => {
    if (!useNotificationStore) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && !useNotificationStore.getState().isInitialized) {
        useNotificationStore.getState().initialize();
      }
    });
    return () => subscription.remove();
  }, []);

  const openNotificationSettings = () => {
    haptics.light();
    Linking.openSettings();
  };

  // Toggling/editing while notifications are uninitialized (permission
  // denied, or not yet requested) is a silent no-op deeper in the store —
  // intercept here so the user gets an actionable explanation instead of a
  // haptic tap with no visible effect.
  const handleToggleGuarded = (type: "water" | "meals" | "sleep") => {
    if (!isInitialized) {
      crossPlatformAlert(
        "Notifications Disabled",
        "Notifications are disabled for FitAI. Enable them in Settings to use reminders.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    handleToggle(type);
  };

  const showWorkoutRemindersUnavailable = () => {
    crossPlatformAlert(
      "Coming Soon",
      "Workout reminders aren't wired up to your fitness plan yet, so this toggle doesn't send any notifications. We're working on connecting it.",
    );
  };

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <GlassHeader
          title="Notifications"
          titleIcon="notifications-outline"
          onBack={onBack}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {!isInitialized && error ? (
            <View style={styles.permissionBanner}>
              <Text style={styles.permissionWarning}>
                Notification permission denied. Enable in device Settings.
              </Text>
              <AnimatedPressable
                onPress={openNotificationSettings}
                scaleValue={0.95}
                hapticFeedback={false}
                accessibilityRole="button"
                accessibilityLabel="Open notification settings"
              >
                <View style={styles.openSettingsButton}>
                  <Text style={styles.openSettingsText}>Open Settings</Text>
                </View>
              </AnimatedPressable>
            </View>
          ) : null}

          <DescriptionCard scheduledCount={scheduledCount} />

          <View style={styles.section}>
            <SectionHeader icon="sparkles-outline" title="Smart Reminders" />

            <View style={styles.notificationListSurface}>
              <NotificationItem
                icon="water-outline"
                iconColor={colors.info.DEFAULT}
                title="Water Reminders"
                description="Smart hydration reminders based on your daily schedule"
                timeInfo={
                  preferences.water.enabled ? getTimeDisplay("water") : undefined
                }
                enabled={preferences.water.enabled}
                onToggle={() => handleToggleGuarded("water")}
                onEdit={() => handleEditPress("water", "Water Reminders")}
                animationDelay={100}
              />

              {/* Workout Reminders is intentionally shown as visually dimmed
                  and permanently off: enabling it never actually schedules a
                  notification because nothing in the app populates
                  workout.customTimes or calls scheduleFromWorkoutPlan with
                  real workout times yet (see
                  notificationService.scheduleWorkoutReminders). `disabled`
                  only dims the card — the Switch stays tappable so
                  `onToggle` (showWorkoutRemindersUnavailable) actually fires
                  and explains why, instead of being unreachable like a truly
                  native-disabled Switch would be. Once it's wired up to the
                  generated fitness plan, restore the normal
                  onToggle/onEdit/timeInfo wiring used by the other three
                  items above. */}
              <NotificationItem
                icon="barbell-outline"
                iconColor={colors.error.light}
                title="Workout Reminders"
                description="Coming soon — not yet connected to your fitness plan, so no notifications are sent"
                enabled={false}
                disabled
                onToggle={showWorkoutRemindersUnavailable}
                animationDelay={150}
              />

              <NotificationItem
                icon="restaurant-outline"
                iconColor={colors.success.DEFAULT}
                title="Meal Reminders"
                description="Never miss breakfast, lunch, or dinner"
                timeInfo={
                  preferences.meals.enabled ? getTimeDisplay("meals") : undefined
                }
                enabled={preferences.meals.enabled}
                onToggle={() => handleToggleGuarded("meals")}
                onEdit={() => handleEditPress("meals", "Meal Reminders")}
                animationDelay={200}
              />

              <NotificationItem
                icon="moon-outline"
                iconColor={colors.primary.DEFAULT}
                title="Sleep Reminders"
                description="Smart bedtime notifications for better recovery"
                timeInfo={
                  preferences.sleep.enabled ? getTimeDisplay("sleep") : undefined
                }
                enabled={preferences.sleep.enabled}
                onToggle={() => handleToggleGuarded("sleep")}
                onEdit={() => handleEditPress("sleep", "Sleep Reminders")}
                animationDelay={250}
                isLast
              />

              {/* "Progress Updates" was removed — the toggle persisted a
                  preference but scheduled no actual weekly-summary
                  notification anywhere in the app (unlike water/workout/meal/
                  sleep, which each call a real schedule*Reminders function).
                  Re-add once a real progress-summary notification is
                  implemented in notificationStore. */}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader icon="settings-outline" title="General" />
            <ResetButton onPress={handleResetDefaults} />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {WaterReminderEditModal && (
          <WaterReminderEditModal
            visible={editModal.visible && editModal.type === "water"}
            onClose={closeEditModal}
          />
        )}

        {NotificationEditModal && (
          <NotificationEditModal
            visible={editModal.visible && editModal.type !== "water"}
            type={editModal.type}
            title={editModal.title}
            onClose={closeEditModal}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  unavailableContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  unavailableCard: {
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  unavailableTitle: {
    fontSize: rf(16),
    fontFamily: FONT_FAMILY.bold,
    color: colors.text.primary,
    marginBottom: rp(8),
    textAlign: "center" as const,
  },
  unavailableText: {
    fontSize: rf(13),
    color: colors.text.secondary,
    lineHeight: rf(18),
    textAlign: "center" as const,
  },
  section: {
    marginBottom: spacing.lg,
  },
  notificationListSurface: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  notificationCard: {
    padding: spacing.md,
  },
  notificationCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: border.DEFAULT,
  },
  notificationCardDisabled: {
    opacity: 0.55,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rbr(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  notificationTitle: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.semibold,
    color: colors.text.primary,
    marginBottom: rp(2),
  },
  notificationDescription: {
    fontSize: rf(12),
    color: colors.text.secondary,
    lineHeight: rf(16),
  },
  timeInfoBadge: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rp(4),
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(3),
    backgroundColor: `${colors.primary.DEFAULT}15`,
    borderRadius: borderRadius.sm,
    alignSelf: "flex-start",
  },
  timeInfoText: {
    fontSize: rf(10),
    fontFamily: FONT_FAMILY.medium,
    color: colors.primary.DEFAULT,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: spacing.sm,
  },
  editButton: {
    width: rw(30),
    height: rw(30),
    borderRadius: rbr(8),
    backgroundColor: surface[2],
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  bottomSpacing: {
    height: rh(80),
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  permissionWarning: {
    flex: 1,
    color: colors.warning.DEFAULT,
    fontSize: rf(13),
  },
  openSettingsButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(6),
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.warning.DEFAULT}20`,
    borderWidth: 1,
    borderColor: `${colors.warning.DEFAULT}50`,
  },
  openSettingsText: {
    fontSize: rf(12),
    fontFamily: FONT_FAMILY.semibold,
    color: colors.warning.DEFAULT,
  },
});

export default NotificationsScreen;
