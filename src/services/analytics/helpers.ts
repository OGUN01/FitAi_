import { FitnessMetrics } from "./types";

export function getDateRange(
  period: string,
  endDate: Date,
): { start: Date; end: Date } {
  const end = new Date(endDate);
  const start = new Date(endDate);

  switch (period) {
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return { start, end };
}

export function getMetricsInRange(
  metricsHistory: FitnessMetrics[],
  startDate: Date,
  endDate: Date,
): FitnessMetrics[] {
  return metricsHistory.filter((m) => {
    const date = new Date(m.date);
    return date >= startDate && date <= endDate;
  });
}

export function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const variance =
    numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) /
    numbers.length;

  return Math.sqrt(variance);
}

export function analyzeTrendDirection(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
  const sumX2 = values.reduce((sum, _, index) => sum + index * index, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  return slope;
}

export function calculateConsistencyScore(binaryData: number[]): number {
  if (binaryData.length === 0) return 0;

  const totalDays = binaryData.length;
  const activeDays = binaryData.reduce((sum, day) => sum + day, 0);

  const basicScore = (activeDays / totalDays) * 100;

  let currentStreak = 0;
  let maxStreak = 0;

  for (const day of binaryData) {
    if (day === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const streakBonus = Math.min(20, maxStreak * 2);

  return Math.min(100, basicScore + streakBonus);
}
