import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior - moved to initialization function
let isHandlerSet = false;

const ensureNotificationHandlerSet = () => {
  if (!isHandlerSet) {
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          // Expo SDK may expect additional behavior fields in newer versions
          // We set banner/list implicitly via platform defaults
        }) as Notifications.NotificationBehavior,
    });
    isHandlerSet = true;
  }
};

export interface NotificationData {
  id: string;
  type: 'water' | 'workout' | 'breakfast' | 'lunch' | 'dinner' | 'sleep' | 'progress';
  title: string;
  body: string;
  data?: any;
}

export interface WaterReminderConfig {
  enabled: boolean;
  dailyGoalLiters: number;
  wakeUpTime: string; // HH:MM format
  sleepTime: string; // HH:MM format
  customIntervals?: number[]; // Custom hour intervals
}

export interface WorkoutReminderConfig {
  enabled: boolean;
  reminderMinutes: number; // Minutes before workout
  customTimes?: string[]; // Custom workout times HH:MM
}

export interface MealReminderConfig {
  enabled: boolean;
  breakfast: { enabled: boolean; time: string };
  lunch: { enabled: boolean; time: string };
  dinner: { enabled: boolean; time: string };
}

export interface SleepReminderConfig {
  enabled: boolean;
  bedtime: string; // HH:MM format
  reminderMinutes: number; // Minutes before bedtime
}

export interface NotificationPreferences {
  water: WaterReminderConfig;
  workout: WorkoutReminderConfig;
  meals: MealReminderConfig;
  sleep: SleepReminderConfig;
  progress: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
  };
}

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
      // Set up notification handler first
      ensureNotificationHandlerSet();

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('fitness-reminders', {
          name: 'Fitness Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('water-reminders', {
          name: 'Water Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#0080FF',
          sound: 'default',
        });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  // Schedule single notification
  async scheduleNotification(
    identifier: string,
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: data || {},
          categoryIdentifier: 'fitness',
          sound: 'default',
        },
        trigger: trigger as Notifications.NotificationTriggerInput,
      });

      console.log(`Scheduled notification: ${identifier} -> ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  // Cancel notification by identifier
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log(`Cancelled notification: ${identifier}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // Cancel all notifications by type
  async cancelNotificationsByType(type: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const typeNotifications = scheduledNotifications.filter((notification) =>
        notification.identifier.startsWith(`${type}_`)
      );

      for (const notification of typeNotifications) {
        await this.cancelNotification(notification.identifier);
      }

      console.log(`Cancelled ${typeNotifications.length} notifications of type: ${type}`);
    } catch (error) {
      console.error(`Failed to cancel notifications of type ${type}:`, error);
    }
  }

  // Smart Water Reminder Logic
  async scheduleWaterReminders(config: WaterReminderConfig): Promise<void> {
    if (!config.enabled) {
      await this.cancelNotificationsByType('water');
      return;
    }

    // Cancel existing water reminders
    await this.cancelNotificationsByType('water');

    // Calculate intervals based on awake hours
    const intervals = this.calculateWaterIntervals(
      config.wakeUpTime,
      config.sleepTime,
      config.dailyGoalLiters
    );

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Schedule reminders for today and next few days
    for (let day = 0; day < 7; day++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + day);

      intervals.forEach((interval, index) => {
        const [hours, minutes] = interval.time.split(':').map(Number);
        const reminderTime = new Date(targetDate);
        reminderTime.setHours(hours, minutes, 0, 0);

        // Only schedule if time is in the future
        if (reminderTime > new Date()) {
          const identifier = `water_${day}_${index}`;
          const litersPerReminder = interval.liters;

          this.scheduleNotification(
            identifier,
            '💧 Hydration Time!',
            `Time to drink ${litersPerReminder}L of water. Stay hydrated for better performance!`,
            { date: reminderTime } as Notifications.NotificationTriggerInput,
            { type: 'water', liters: litersPerReminder }
          );
        }
      });
    }
  }

  // Calculate smart water intervals
  private calculateWaterIntervals(
    wakeUpTime: string,
    sleepTime: string,
    dailyGoalLiters: number
  ): Array<{ time: string; liters: number }> {
    const [wakeHour, wakeMin] = wakeUpTime.split(':').map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);

    // Calculate awake minutes
    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;
    const awakeMinutes =
      sleepMinutes > wakeMinutes
        ? sleepMinutes - wakeMinutes
        : 24 * 60 - wakeMinutes + sleepMinutes;

    // Smart distribution: more water in morning/afternoon, less in evening
    const totalHours = Math.floor(awakeMinutes / 60);
    const intervals: Array<{ time: string; liters: number }> = [];

    if (totalHours <= 8) {
      // Short day - every 2 hours
      const intervalHours = Math.max(1, Math.floor(totalHours / 4));
      const litersPerInterval = dailyGoalLiters / Math.ceil(totalHours / intervalHours);

      for (let i = 0; i < totalHours; i += intervalHours) {
        const hour = (wakeHour + i) % 24;
        intervals.push({
          time: `${hour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}`,
          liters: Math.round(litersPerInterval * 100) / 100,
        });
      }
    } else {
      // Regular day - smart distribution
      const morningEnd = Math.min(wakeHour + 4, 12);
      const afternoonEnd = Math.min(morningEnd + 6, 18);

      // Morning: 40% of water (more frequent)
      const morningIntervals = Math.max(2, Math.floor((morningEnd - wakeHour) / 1.5));
      const morningLiters = (dailyGoalLiters * 0.4) / morningIntervals;

      for (let i = 0; i < morningIntervals; i++) {
        const hour = wakeHour + i * 1.5;
        if (hour < morningEnd) {
          intervals.push({
            time: `${Math.floor(hour).toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}`,
            liters: Math.round(morningLiters * 100) / 100,
          });
        }
      }

      // Afternoon: 50% of water
      const afternoonIntervals = Math.max(2, Math.floor((afternoonEnd - morningEnd) / 2));
      const afternoonLiters = (dailyGoalLiters * 0.5) / afternoonIntervals;

      for (let i = 0; i < afternoonIntervals; i++) {
        const hour = morningEnd + i * 2;
        if (hour < afternoonEnd) {
          intervals.push({
            time: `${hour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}`,
            liters: Math.round(afternoonLiters * 100) / 100,
          });
        }
      }

      // Evening: 10% of water (minimal to avoid sleep disruption)
      if (sleepHour > afternoonEnd) {
        intervals.push({
          time: `${afternoonEnd.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}`,
          liters: Math.round(dailyGoalLiters * 0.1 * 100) / 100,
        });
      }
    }

    return intervals;
  }

  // Schedule workout reminders
  async scheduleWorkoutReminders(
    config: WorkoutReminderConfig,
    workoutTimes?: string[]
  ): Promise<void> {
    if (!config.enabled) {
      await this.cancelNotificationsByType('workout');
      return;
    }

    await this.cancelNotificationsByType('workout');

    const times = workoutTimes || config.customTimes || [];
    const today = new Date();

    // Schedule for next 7 days
    for (let day = 0; day < 7; day++) {
      times.forEach((workoutTime, index) => {
        const [hours, minutes] = workoutTime.split(':').map(Number);
        const reminderTime = new Date(today);
        reminderTime.setDate(today.getDate() + day);
        reminderTime.setHours(hours, minutes, 0, 0);

        // Subtract reminder minutes
        reminderTime.setMinutes(reminderTime.getMinutes() - config.reminderMinutes);

        if (reminderTime > new Date()) {
          const identifier = `workout_${day}_${index}`;

          this.scheduleNotification(
            identifier,
            '🏋️ Workout Time Coming Up!',
            `Your workout starts in ${config.reminderMinutes} minutes. Get ready to crush it! 💪`,
            { date: reminderTime } as Notifications.NotificationTriggerInput,
            { type: 'workout', originalTime: workoutTime }
          );
        }
      });
    }
  }

  // Schedule meal reminders
  async scheduleMealReminders(config: MealReminderConfig): Promise<void> {
    await this.cancelNotificationsByType('meal');

    if (!config.enabled) return;

    const meals = [
      { key: 'breakfast', config: config.breakfast, emoji: '🍳', name: 'Breakfast' },
      { key: 'lunch', config: config.lunch, emoji: '🥙', name: 'Lunch' },
      { key: 'dinner', config: config.dinner, emoji: '🍽️', name: 'Dinner' },
    ];

    const today = new Date();

    for (let day = 0; day < 7; day++) {
      meals.forEach((meal) => {
        if (!meal.config.enabled) return;

        const [hours, minutes] = meal.config.time.split(':').map(Number);
        const mealTime = new Date(today);
        mealTime.setDate(today.getDate() + day);
        mealTime.setHours(hours, minutes, 0, 0);

        if (mealTime > new Date()) {
          const identifier = `meal_${meal.key}_${day}`;

          this.scheduleNotification(
            identifier,
            `${meal.emoji} ${meal.name} Time!`,
            `Time for a nutritious ${meal.name.toLowerCase()}. Fuel your body right! 🌟`,
            { date: mealTime } as Notifications.NotificationTriggerInput,
            { type: 'meal', mealType: meal.key }
          );
        }
      });
    }
  }

  // Schedule sleep reminders
  async scheduleSleepReminders(config: SleepReminderConfig): Promise<void> {
    if (!config.enabled) {
      await this.cancelNotificationsByType('sleep');
      return;
    }

    await this.cancelNotificationsByType('sleep');

    const [hours, minutes] = config.bedtime.split(':').map(Number);
    const today = new Date();

    // Schedule for next 7 days
    for (let day = 0; day < 7; day++) {
      // Pre-sleep reminder
      const preReminderTime = new Date(today);
      preReminderTime.setDate(today.getDate() + day);
      preReminderTime.setHours(hours, minutes, 0, 0);
      preReminderTime.setMinutes(preReminderTime.getMinutes() - config.reminderMinutes);

      if (preReminderTime > new Date()) {
        const identifier = `sleep_pre_${day}`;

        this.scheduleNotification(
          identifier,
          '😴 Wind Down Time',
          `Bedtime in ${config.reminderMinutes} minutes. Start your relaxation routine! 🌙`,
          { date: preReminderTime } as Notifications.NotificationTriggerInput,
          { type: 'sleep', phase: 'pre' }
        );
      }

      // Bedtime reminder
      const bedTime = new Date(today);
      bedTime.setDate(today.getDate() + day);
      bedTime.setHours(hours, minutes, 0, 0);

      if (bedTime > new Date()) {
        const identifier = `sleep_bedtime_${day}`;

        this.scheduleNotification(
          identifier,
          '🌙 Time for Bed',
          'Good night! Quality sleep is essential for recovery and performance. Sweet dreams! 😴',
          { date: bedTime } as Notifications.NotificationTriggerInput,
          { type: 'sleep', phase: 'bedtime' }
        );
      }
    }
  }

  // Get all scheduled notifications for debugging
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cleared all scheduled notifications');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  // Save preferences to storage
  async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));

      // Also attempt to save to Supabase if available
      await this.savePreferencesToSupabase(preferences);

      console.log('Notification preferences saved');
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  // Save preferences to Supabase
  private async savePreferencesToSupabase(preferences: NotificationPreferences): Promise<void> {
    try {
      const { supabase } = await import('./supabase');
      const { default: useAuth } = await import('../hooks/useAuth');

      // Get current user (if available)
      // Note: This is a simplified approach - in production, we'd pass user context
      const preferencesJson = JSON.stringify(preferences);

      // For now, just log that Supabase sync would happen here
      // In a full implementation, you'd store this in a notification_preferences table
      console.log(
        '📱 Would sync notification preferences to Supabase:',
        preferencesJson.length,
        'bytes'
      );
    } catch (error) {
      // Don't throw error - AsyncStorage backup is sufficient
      console.warn('Could not sync notification preferences to Supabase:', error);
    }
  }

  // Load preferences from storage
  async loadPreferences(): Promise<NotificationPreferences | null> {
    try {
      // First try to load from Supabase (if available and user is logged in)
      const supabasePreferences = await this.loadPreferencesFromSupabase();
      if (supabasePreferences) {
        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem('notification_preferences', JSON.stringify(supabasePreferences));
        return supabasePreferences;
      }

      // Fall back to AsyncStorage
      const saved = await AsyncStorage.getItem('notification_preferences');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      return null;
    }
  }

  // Load preferences from Supabase
  private async loadPreferencesFromSupabase(): Promise<NotificationPreferences | null> {
    try {
      // For now, return null to use AsyncStorage
      // In a full implementation, this would query the notification_preferences table
      console.log('📱 Would load notification preferences from Supabase');
      return null;
    } catch (error) {
      console.warn('Could not load notification preferences from Supabase:', error);
      return null;
    }
  }

  // Get default preferences
  getDefaultPreferences(): NotificationPreferences {
    return {
      water: {
        enabled: true,
        dailyGoalLiters: 4,
        wakeUpTime: '07:00',
        sleepTime: '23:00',
      },
      workout: {
        enabled: true,
        reminderMinutes: 30,
      },
      meals: {
        enabled: true,
        breakfast: { enabled: true, time: '08:00' },
        lunch: { enabled: true, time: '13:00' },
        dinner: { enabled: true, time: '19:00' },
      },
      sleep: {
        enabled: false,
        bedtime: '22:30',
        reminderMinutes: 30,
      },
      progress: {
        enabled: true,
        frequency: 'weekly',
      },
    };
  }
}

// Export the class, not the instance - prevents module-level singleton creation
export default NotificationService;
