/**
 * useNotificationsScreen Hook
 * Business logic for NotificationsScreen
 */

import { useState, useEffect } from "react";
import { crossPlatformAlert } from "../../../utils/crossPlatformAlert";
import { haptics } from "../../../utils/haptics";

interface EditModalState {
  visible: boolean;
  type: "water" | "workout" | "meals" | "sleep" | null;
  title: string;
}

interface UseNotificationsScreenProps {
  useNotificationStore: any;
  isExpoGo: boolean;
}

export const useNotificationsScreen = ({
  useNotificationStore,
  isExpoGo,
}: UseNotificationsScreenProps) => {
  const [editModal, setEditModal] = useState<EditModalState>({
    visible: false,
    type: null,
    title: "",
  });

  const [scheduledCount, setScheduledCount] = useState(0);

  // Skip store initialization if in Expo Go
  const {
    preferences = {},
    toggleNotificationType = () => {},
    initialize = async () => {},
    isInitialized = false,
  } = isExpoGo || !useNotificationStore ? {} : useNotificationStore();

  useEffect(() => {
    const initializeNotifications = async () => {
      if (isExpoGo || !useNotificationStore) return;

      if (!isInitialized) {
        await initialize();
      }
      const count = await useNotificationStore.getState().getScheduledCount();
      setScheduledCount(count);
    };

    initializeNotifications();
  }, [isInitialized, initialize, isExpoGo, useNotificationStore]);

  const handleToggle = async (type: keyof typeof preferences) => {
    if (isExpoGo) return;

    try {
      await toggleNotificationType(type);
      const count = await useNotificationStore.getState().getScheduledCount();
      setScheduledCount(count);
    } catch (error) {
      console.error("Failed to toggle notification:", error);
      crossPlatformAlert("Error", "Failed to update notification setting");
    }
  };

  const handleEditPress = (
    type: "water" | "workout" | "meals" | "sleep",
    title: string,
  ) => {
    setEditModal({ visible: true, type, title });
  };

  const closeEditModal = () => {
    setEditModal({ visible: false, type: null, title: "" });
  };

  const handleResetDefaults = async () => {
    if (isExpoGo) return;

    crossPlatformAlert(
      "Reset to Defaults",
      "Are you sure you want to reset all notification settings to default?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              haptics.medium();
              await useNotificationStore.getState().resetToDefaults();
              const count = await useNotificationStore
                .getState()
                .getScheduledCount();
              setScheduledCount(count);
              crossPlatformAlert("Success", "Settings reset to defaults!");
            } catch (error) {
              crossPlatformAlert("Error", "Failed to reset settings");
            }
          },
        },
      ],
    );
  };

  const getTimeDisplay = (type: string) => {
    if (!preferences) return "";

    switch (type) {
      case "water":
        const awakeHours = calculateAwakeHours(
          preferences.water?.wakeUpTime || "07:00",
          preferences.water?.sleepTime || "23:00",
        );
        return `${awakeHours}h awake, ${preferences.water?.dailyGoalLiters || 2}L daily`;
      case "workout":
        return `${preferences.workout?.reminderMinutes || 30} min before`;
      case "meals":
        const enabledMeals = [
          preferences.meals?.breakfast?.enabled && "Breakfast",
          preferences.meals?.lunch?.enabled && "Lunch",
          preferences.meals?.dinner?.enabled && "Dinner",
        ].filter(Boolean);
        return `${enabledMeals.length} meals enabled`;
      case "sleep":
        return `${preferences.sleep?.reminderMinutes || 30} min before ${preferences.sleep?.bedtime || "22:00"}`;
      case "progress":
        return preferences.progress?.frequency || "Weekly";
      default:
        return "";
    }
  };

  const calculateAwakeHours = (wakeTime: string, sleepTime: string) => {
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);
    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;
    const awakeMinutes =
      sleepMinutes > wakeMinutes
        ? sleepMinutes - wakeMinutes
        : 24 * 60 - wakeMinutes + sleepMinutes;
    return Math.floor(awakeMinutes / 60);
  };

  return {
    editModal,
    scheduledCount,
    preferences,
    handleToggle,
    handleEditPress,
    closeEditModal,
    handleResetDefaults,
    getTimeDisplay,
  };
};
