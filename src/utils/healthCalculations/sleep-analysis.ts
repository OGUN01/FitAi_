export class SleepAnalysis {
  static getRecommendedSleepHours(age: number): number {
    if (age < 18) return 8.5;
    if (age < 26) return 8.0;
    if (age < 65) return 7.5;
    return 7.0;
  }

  static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    if (!wakeTime || !sleepTime) return 8; // safe default (normal sleep)
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration < 0) duration += 24 * 60;

    return Math.round((duration / 60) * 10) / 10;
  }

  static calculateSleepEfficiencyScore(
    currentSleep: number,
    recommendedSleep: number,
    healthHabits: any,
  ): number {
    let score = 50;

    const sleepDifference = Math.abs(currentSleep - recommendedSleep);
    if (sleepDifference <= 0.5) score += 30;
    else if (sleepDifference <= 1) score += 20;
    else if (sleepDifference <= 2) score += 10;
    else score -= 10;

    const habits = healthHabits ?? {};
    if (habits.avoids_late_night_eating) score += 10;
    if (!habits.drinks_coffee) score += 5;
    if (!habits.drinks_alcohol) score += 10;
    if (habits.eats_regular_meals) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
