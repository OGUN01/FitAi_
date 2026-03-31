import { HeartRateZones } from "./shared-types";

export class CardiovascularCalculations {
  static calculateMaxHeartRate(age: number): number {
    // Tanaka (2001) meta-analysis formula — supersedes Fox-Haskell 1971 (220-age)
    return Math.round(208 - 0.7 * age);
  }

  static calculateHeartRateZones(maxHeartRate: number): HeartRateZones {
    return {
      fatBurn: {
        min: Math.round(maxHeartRate * 0.6),
        max: Math.round(maxHeartRate * 0.7),
      },
      cardio: {
        min: Math.round(maxHeartRate * 0.7),
        max: Math.round(maxHeartRate * 0.85),
      },
      peak: {
        min: Math.round(maxHeartRate * 0.85),
        max: Math.round(maxHeartRate * 0.95),
      },
    };
  }

  static estimateVO2Max(
    canRunMinutes: number,
    age: number,
    gender: string,
  ): number {
    const peakVO2 = gender === "male" ? 50 : 40;

    const ageAdjustment =
      age >= 20 ? (age - 20) * (gender === "male" ? 0.5 : 0.4) : 0;

    const baseVO2 = peakVO2 - ageAdjustment;

    const runningBonus = Math.max(0, Math.min(canRunMinutes, 60)) * 0.3;

    return Math.max(20, Math.min(80, baseVO2 + runningBonus));
  }
}
