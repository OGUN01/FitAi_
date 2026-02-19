import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationPreferences } from "./types";

let isHandlerSet = false;

const ensureNotificationHandlerSet = () => {
  if (!isHandlerSet) {
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }) as Notifications.NotificationBehavior,
    });
    isHandlerSet = true;
  }
};

class NotificationService {
  private static instance: NotificationService;
  private initialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      ensureNotificationHandlerSet();

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Notification permissions not granted");
        return false;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("fitness-reminders", {
          name: "Fitness Reminders",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
        });

        await Notifications.setNotificationChannelAsync("water-reminders", {
          name: "Water Reminders",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: "#0080FF",
          sound: "default",
        });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize notification service:", error);
      return false;
    }
  }

  async scheduleNotification(
    identifier: string,
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any,
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: data || {},
          categoryIdentifier: "fitness",
          sound: "default",
        },
        trigger: trigger as Notifications.NotificationTriggerInput,
      });

      console.log(`Scheduled notification: ${identifier} -> ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      return null;
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log(`Cancelled notification: ${identifier}`);
    } catch (error) {
      console.error("Failed to cancel notification:", error);
    }
  }

  async cancelNotificationsByType(type: string): Promise<void> {
    try {
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();
      const typeNotifications = scheduledNotifications.filter((notification) =>
        notification.identifier.startsWith(`${type}_`),
      );

      for (const notification of typeNotifications) {
        await this.cancelNotification(notification.identifier);
      }

      console.log(
        `Cancelled ${typeNotifications.length} notifications of type: ${type}`,
      );
    } catch (error) {
      console.error(`Failed to cancel notifications of type ${type}:`, error);
    }
  }

  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Failed to get scheduled notifications:", error);
      return [];
    }
  }

  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("Cleared all scheduled notifications");
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  }

  getDefaultPreferences(): NotificationPreferences {
    return {
      water: {
        enabled: true,
        dailyGoalLiters: 4,
        wakeUpTime: "07:00",
        sleepTime: "23:00",
      },
      workout: {
        enabled: true,
        reminderMinutes: 30,
      },
      meals: {
        enabled: true,
        breakfast: { enabled: true, time: "08:00" },
        lunch: { enabled: true, time: "13:00" },
        dinner: { enabled: true, time: "19:00" },
      },
      sleep: {
        enabled: false,
        bedtime: "22:30",
        reminderMinutes: 30,
      },
      progress: {
        enabled: true,
        frequency: "weekly",
      },
    };
  }
}

export default NotificationService;
