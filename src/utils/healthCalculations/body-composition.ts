import { WeightRange, BodyComposition } from "./shared-types";

export class BodyCompositionCalculations {
  static calculateIdealWeightRange(
    heightCm: number,
    gender: string,
    age?: number,
  ): WeightRange {
    const heightM = heightCm / 100;

    if (gender === "other" || gender === "prefer_not_to_say") {
      return {
        min: Math.round(18.5 * heightM * heightM * 100) / 100,
        max: Math.round(24.9 * heightM * heightM * 100) / 100,
      };
    }

    const heightInches = heightCm / 2.54;
    const heightOver5Feet = Math.max(0, heightInches - 60);

    let idealWeight: number;

    if (gender === "male") {
      idealWeight = 50 + 2.3 * heightOver5Feet;
    } else {
      idealWeight = 45.5 + 2.3 * heightOver5Feet;
    }

    const minWeight = idealWeight * 0.9;
    const maxWeight = idealWeight * 1.1;

    return {
      min: Math.round(minWeight * 100) / 100,
      max: Math.round(maxWeight * 100) / 100,
    };
  }

  static calculateHealthyWeightLossRate(
    currentWeight: number,
    gender?: string,
  ): number {
    let baseRate: number;

    if (currentWeight > 100) {
      baseRate = currentWeight * 0.01;
    } else if (currentWeight > 80) {
      baseRate = currentWeight * 0.008;
    } else {
      baseRate = currentWeight * 0.006;
    }

    if (gender === "female") {
      baseRate = baseRate * 0.85;
    } else if (gender === "male") {
      baseRate = baseRate * 1.0;
    } else {
      baseRate = baseRate * 0.925;
    }

    return Math.max(0.3, Math.min(1.0, baseRate));
  }

  static getHealthyBodyFatRange(
    age: number,
    gender: string,
  ): { min: number; max: number } {
    const ranges = {
      male: {
        "18-24": { min: 6, max: 17 },
        "25-34": { min: 7, max: 18 },
        "35-44": { min: 12, max: 21 },
        "45-54": { min: 14, max: 23 },
        "55+": { min: 16, max: 25 },
      },
      female: {
        "18-24": { min: 16, max: 24 },
        "25-34": { min: 16, max: 25 },
        "35-44": { min: 17, max: 28 },
        "45-54": { min: 18, max: 30 },
        "55+": { min: 18, max: 31 },
      },
    };

    const ageGroup =
      age < 25
        ? "18-24"
        : age < 35
          ? "25-34"
          : age < 45
            ? "35-44"
            : age < 55
              ? "45-54"
              : "55+";
    return (
      ranges[gender as keyof typeof ranges]?.[
        ageGroup as keyof typeof ranges.male
      ] || ranges.male["25-34"]
    );
  }

  static calculateBodyComposition(
    weightKg: number,
    bodyFatPercentage: number,
  ): BodyComposition {
    const fatMass = (weightKg * bodyFatPercentage) / 100;
    const leanMass = weightKg - fatMass;

    return {
      leanMass: Math.round(leanMass * 100) / 100,
      fatMass: Math.round(fatMass * 100) / 100,
    };
  }

  static calculateWaistHipRatio(waistCm: number, hipCm: number): number {
    return Math.round((waistCm / hipCm) * 100) / 100;
  }
}
