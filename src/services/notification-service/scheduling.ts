import * as Notifications from "expo-notifications";
import type NotificationService from "./core";
import type {
  WaterReminderConfig,
  WorkoutReminderConfig,
  MealReminderConfig,
  SleepReminderConfig,
} from "./types";

export function calculateWaterIntervals(
  wakeUpTime: string,
  sleepTime: string,
  dailyGoalLiters: number,
): Array<{ time: string; liters: number }> {
  const [wakeHour, wakeMin] = wakeUpTime.split(":").map(Number);
  const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);

  const wakeMinutes = wakeHour * 60 + wakeMin;
  const sleepMinutes = sleepHour * 60 + sleepMin;
  const awakeMinutes =
    sleepMinutes > wakeMinutes
      ? sleepMinutes - wakeMinutes
      : 24 * 60 - wakeMinutes + sleepMinutes;

  const totalHours = Math.floor(awakeMinutes / 60);
  const intervals: Array<{ time: string; liters: number }> = [];

  if (totalHours <= 8) {
    const intervalHours = Math.max(1, Math.floor(totalHours / 4));
    const litersPerInterval =
      dailyGoalLiters / Math.ceil(totalHours / intervalHours);

    for (let i = 0; i < totalHours; i += intervalHours) {
      const hour = (wakeHour + i) % 24;
      intervals.push({
        time: `${hour.toString().padStart(2, "0")}:${wakeMin.toString().padStart(2, "0")}`,
        liters: Math.round(litersPerInterval * 100) / 100,
      });
    }
  } else {
    const morningEnd = Math.min(wakeHour + 4, 12);
    const afternoonEnd = Math.min(morningEnd + 6, 18);

    const morningIntervals = Math.max(
      2,
      Math.floor((morningEnd - wakeHour) / 1.5),
    );
    const morningLiters = (dailyGoalLiters * 0.4) / morningIntervals;

    for (let i = 0; i < morningIntervals; i++) {
      const hour = wakeHour + i * 1.5;
      if (hour < morningEnd) {
        intervals.push({
          time: `${Math.floor(hour).toString().padStart(2, "0")}:${wakeMin.toString().padStart(2, "0")}`,
          liters: Math.round(morningLiters * 100) / 100,
        });
      }
    }

    const afternoonIntervals = Math.max(
      2,
      Math.floor((afternoonEnd - morningEnd) / 2),
    );
    const afternoonLiters = (dailyGoalLiters * 0.5) / afternoonIntervals;

    for (let i = 0; i < afternoonIntervals; i++) {
      const hour = morningEnd + i * 2;
      if (hour < afternoonEnd) {
        intervals.push({
          time: `${hour.toString().padStart(2, "0")}:${wakeMin.toString().padStart(2, "0")}`,
          liters: Math.round(afternoonLiters * 100) / 100,
        });
      }
    }

    if (sleepHour > afternoonEnd) {
      intervals.push({
        time: `${afternoonEnd.toString().padStart(2, "0")}:${wakeMin.toString().padStart(2, "0")}`,
        liters: Math.round(dailyGoalLiters * 0.1 * 100) / 100,
      });
    }
  }

  return intervals;
}

export async function scheduleWaterReminders(
  service: NotificationService,
  config: WaterReminderConfig,
): Promise<void> {
  if (!config.enabled) {
    await service.cancelNotificationsByType("water");
    return;
  }

  await service.cancelNotificationsByType("water");

  const intervals = calculateWaterIntervals(
    config.wakeUpTime,
    config.sleepTime,
    config.dailyGoalLiters,
  );

  const today = new Date();

  for (let day = 0; day < 7; day++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + day);

    intervals.forEach((interval, index) => {
      const [hours, minutes] = interval.time.split(":").map(Number);
      const reminderTime = new Date(targetDate);
      reminderTime.setHours(hours, minutes, 0, 0);

      if (reminderTime > new Date()) {
        const identifier = `water_${day}_${index}`;
        const litersPerReminder = interval.liters;

        service.scheduleNotification(
          identifier,
          "💧 Hydration Time!",
          `Time to drink ${litersPerReminder}L of water. Stay hydrated for better performance!`,
          { date: reminderTime } as Notifications.NotificationTriggerInput,
          { type: "water", liters: litersPerReminder },
        );
      }
    });
  }
}

export async function scheduleWorkoutReminders(
  service: NotificationService,
  config: WorkoutReminderConfig,
  workoutTimes?: string[],
): Promise<void> {
  if (!config.enabled) {
    await service.cancelNotificationsByType("workout");
    return;
  }

  await service.cancelNotificationsByType("workout");

  const times = workoutTimes || config.customTimes || [];
  const today = new Date();

  for (let day = 0; day < 7; day++) {
    times.forEach((workoutTime, index) => {
      const [hours, minutes] = workoutTime.split(":").map(Number);
      const reminderTime = new Date(today);
      reminderTime.setDate(today.getDate() + day);
      reminderTime.setHours(hours, minutes, 0, 0);

      reminderTime.setMinutes(
        reminderTime.getMinutes() - config.reminderMinutes,
      );

      if (reminderTime > new Date()) {
        const identifier = `workout_${day}_${index}`;

        service.scheduleNotification(
          identifier,
          "🏋️ Workout Time Coming Up!",
          `Your workout starts in ${config.reminderMinutes} minutes. Get ready to crush it! 💪`,
          { date: reminderTime } as Notifications.NotificationTriggerInput,
          { type: "workout", originalTime: workoutTime },
        );
      }
    });
  }
}

export async function scheduleMealReminders(
  service: NotificationService,
  config: MealReminderConfig,
): Promise<void> {
  await service.cancelNotificationsByType("meal");

  if (!config.enabled) return;

  const meals = [
    {
      key: "breakfast",
      config: config.breakfast,
      emoji: "🍳",
      name: "Breakfast",
    },
    { key: "lunch", config: config.lunch, emoji: "🥙", name: "Lunch" },
    { key: "dinner", config: config.dinner, emoji: "🍽️", name: "Dinner" },
  ];

  const today = new Date();

  for (let day = 0; day < 7; day++) {
    meals.forEach((meal) => {
      if (!meal.config.enabled) return;

      const [hours, minutes] = meal.config.time.split(":").map(Number);
      const mealTime = new Date(today);
      mealTime.setDate(today.getDate() + day);
      mealTime.setHours(hours, minutes, 0, 0);

      if (mealTime > new Date()) {
        const identifier = `meal_${meal.key}_${day}`;

        service.scheduleNotification(
          identifier,
          `${meal.emoji} ${meal.name} Time!`,
          `Time for a nutritious ${meal.name.toLowerCase()}. Fuel your body right! 🌟`,
          { date: mealTime } as Notifications.NotificationTriggerInput,
          { type: "meal", mealType: meal.key },
        );
      }
    });
  }
}

export async function scheduleSleepReminders(
  service: NotificationService,
  config: SleepReminderConfig,
): Promise<void> {
  if (!config.enabled) {
    await service.cancelNotificationsByType("sleep");
    return;
  }

  await service.cancelNotificationsByType("sleep");

  const [hours, minutes] = config.bedtime.split(":").map(Number);
  const today = new Date();

  for (let day = 0; day < 7; day++) {
    const preReminderTime = new Date(today);
    preReminderTime.setDate(today.getDate() + day);
    preReminderTime.setHours(hours, minutes, 0, 0);
    preReminderTime.setMinutes(
      preReminderTime.getMinutes() - config.reminderMinutes,
    );

    if (preReminderTime > new Date()) {
      const identifier = `sleep_pre_${day}`;

      service.scheduleNotification(
        identifier,
        "😴 Wind Down Time",
        `Bedtime in ${config.reminderMinutes} minutes. Start your relaxation routine! 🌙`,
        { date: preReminderTime } as Notifications.NotificationTriggerInput,
        { type: "sleep", phase: "pre" },
      );
    }

    const bedTime = new Date(today);
    bedTime.setDate(today.getDate() + day);
    bedTime.setHours(hours, minutes, 0, 0);

    if (bedTime > new Date()) {
      const identifier = `sleep_bedtime_${day}`;

      service.scheduleNotification(
        identifier,
        "🌙 Time for Bed",
        "Good night! Quality sleep is essential for recovery and performance. Sweet dreams! 😴",
        { date: bedTime } as Notifications.NotificationTriggerInput,
        { type: "sleep", phase: "bedtime" },
      );
    }
  }
}
