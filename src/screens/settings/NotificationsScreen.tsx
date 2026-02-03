/**
 * NotificationsScreen - Smart Notification Settings
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

import { NotificationsHeader } from "./components/NotificationsHeader";
import { ExpoGoMessage } from "./components/ExpoGoMessage";
import { DescriptionCard } from "./components/DescriptionCard";
import { SectionHeader } from "./components/SectionHeader";
import { ResetButton } from "./components/ResetButton";
import { useNotificationsScreen } from "./hooks/useNotificationsScreen";

const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient" ||
  (__DEV__ && !Constants.isDevice && !Constants.platform?.web);

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
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <GlassCard
        elevation={1}
        padding="md"
        blurIntensity="light"
        borderRadius="lg"
        style={styles.notificationCard}
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
              <AnimatedPressable
                onPress={() => {
                  haptics.light();
                  onEdit?.();
                }}
                scaleValue={0.95}
                hapticFeedback={false}
              >
                <View style={styles.timeInfoBadge}>
                  <Ionicons
                    name="time-outline"
                    size={rf(10)}
                    color={ResponsiveTheme.colors.primary}
                  />
                  <Text style={styles.timeInfoText}>{timeInfo}</Text>
                </View>
              </AnimatedPressable>
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
              >
                <View style={styles.editButton}>
                  <Ionicons
                    name="settings-outline"
                    size={rf(14)}
                    color={ResponsiveTheme.colors.textSecondary}
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
                false: "rgba(255, 255, 255, 0.1)",
                true: `${ResponsiveTheme.colors.primary}50`,
              }}
              thumbColor={
                enabled
                  ? ResponsiveTheme.colors.primary
                  : "rgba(255, 255, 255, 0.4)"
              }
              ios_backgroundColor="rgba(255, 255, 255, 0.1)"
            />
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
}) => {
  if (isExpoGo) {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <NotificationsHeader onBack={onBack} />
          <ExpoGoMessage />
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  const {
    editModal,
    scheduledCount,
    preferences,
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

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <NotificationsHeader onBack={onBack} />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <DescriptionCard scheduledCount={scheduledCount} />

          <View style={styles.section}>
            <SectionHeader icon="sparkles-outline" title="Smart Reminders" />

            <NotificationItem
              icon="water-outline"
              iconColor="#2196F3"
              title="Water Reminders"
              description="Smart hydration reminders based on your daily schedule"
              timeInfo={
                preferences.water.enabled ? getTimeDisplay("water") : undefined
              }
              enabled={preferences.water.enabled}
              onToggle={() => handleToggle("water")}
              onEdit={() => handleEditPress("water", "Water Reminders")}
              animationDelay={100}
            />

            <NotificationItem
              icon="barbell-outline"
              iconColor="#FF6B6B"
              title="Workout Reminders"
              description="Get notified before your scheduled workouts"
              timeInfo={
                preferences.workout.enabled
                  ? getTimeDisplay("workout")
                  : undefined
              }
              enabled={preferences.workout.enabled}
              onToggle={() => handleToggle("workout")}
              onEdit={() => handleEditPress("workout", "Workout Reminders")}
              animationDelay={150}
            />

            <NotificationItem
              icon="restaurant-outline"
              iconColor="#4CAF50"
              title="Meal Reminders"
              description="Never miss breakfast, lunch, or dinner"
              timeInfo={
                preferences.meals.enabled ? getTimeDisplay("meals") : undefined
              }
              enabled={preferences.meals.enabled}
              onToggle={() => handleToggle("meals")}
              onEdit={() => handleEditPress("meals", "Meal Reminders")}
              animationDelay={200}
            />

            <NotificationItem
              icon="moon-outline"
              iconColor="#9C27B0"
              title="Sleep Reminders"
              description="Smart bedtime notifications for better recovery"
              timeInfo={
                preferences.sleep.enabled ? getTimeDisplay("sleep") : undefined
              }
              enabled={preferences.sleep.enabled}
              onToggle={() => handleToggle("sleep")}
              onEdit={() => handleEditPress("sleep", "Sleep Reminders")}
              animationDelay={250}
            />

            <NotificationItem
              icon="analytics-outline"
              iconColor="#FF9800"
              title="Progress Updates"
              description="Weekly summary of your fitness journey"
              timeInfo={
                preferences.progress.enabled
                  ? getTimeDisplay("progress")
                  : undefined
              }
              enabled={preferences.progress.enabled}
              onToggle={() => handleToggle("progress")}
              animationDelay={300}
            />
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
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
  },
  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  notificationCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  notificationTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
  timeInfoBadge: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: 4,
    marginTop: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 3,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    alignSelf: "flex-start",
  },
  timeInfoText: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.primary,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },
  editButton: {
    width: rw(30),
    height: rw(30),
    borderRadius: rw(8),
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  bottomSpacing: {
    height: rh(80),
  },
});

export default NotificationsScreen;
