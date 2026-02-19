import { HeartRateZones } from "./shared-types";

export class CardiovascularCalculations {
  static calculateMaxHeartRate(age: number): number {
    return 220 - age;
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

    const runningBonus = canRunMinutes * 0.3;

    return Math.max(20, Math.min(80, baseVO2 + runningBonus));
  }
}
