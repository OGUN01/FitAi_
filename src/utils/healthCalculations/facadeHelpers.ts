import type { ActivityLevel, ClimateType } from "./types";

export class FacadeHelpers {
  static getActivityMultiplier(level: ActivityLevel): number {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return multipliers[level] || 1.55;
  }

  static getClimateModifier(climate: ClimateType): number {
    const modifiers = {
      tropical: 1.05,
      temperate: 1.0,
      cold: 1.1,
      arid: 1.03,
    };
    return modifiers[climate] || 1.0;
  }

  static getClimateWaterBonus(climate: ClimateType, weight: number): number {
    const bonuses = {
      tropical: weight * 10,
      temperate: 0,
      cold: 0,
      arid: weight * 8,
    };
    return bonuses[climate] || 0;
  }

  static getActivityWaterBonus(level: ActivityLevel, weight: number): number {
    const bonuses = {
      sedentary: 0,
      light: weight * 5,
      moderate: weight * 10,
      active: weight * 15,
      very_active: weight * 20,
    };
    return bonuses[level] || 0;
  }
}
