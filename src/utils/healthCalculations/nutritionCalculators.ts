/**
 * NUTRITION CALCULATORS
 * TDEE, Water, and Macro calculations
 *
 * This module provides:
 * - TDEE calculation with climate adaptation
 * - Water intake calculation
 * - Macro nutrient distribution
 *
 * Version: 1.0.0
 * Date: 2026-02-04
 */

import {
  tdeeCalculator,
  waterCalculator,
  macroCalculator,
} from "./calculators";
import type { ActivityLevel, ClimateType, DietType } from "./types";

export interface TDEEResult {
  tdee: number;
  baseTDEE: number;
  climateModifier: number;
  finalTDEE: number;
  breakdown: string;
}

export interface WaterResult {
  totalML: number;
  liters: number;
  cups: number;
  breakdown: {
    base_ml: number;
    climate_ml: number;
    activity_ml: number;
    final_ml: number;
  };
}

export interface MacroResult {
  protein: number;
  carbs: number;
  fat: number;
  percentages: {
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  };
}

export class TDEECalculatorService {
  static calculate(
    bmr: number,
    activityLevel: ActivityLevel,
    climate: ClimateType,
  ): TDEEResult {
    const tdee = tdeeCalculator.calculate(bmr, activityLevel, climate);
    const activityMultiplier = this.getActivityMultiplier(activityLevel);
    const climateModifier = this.getClimateModifier(climate);
    const baseTDEE = bmr * activityMultiplier;

    return {
      tdee,
      baseTDEE,
      climateModifier,
      finalTDEE: tdee,
      breakdown: `BMR: ${bmr} × Activity (${activityLevel}): ${activityMultiplier} = ${Math.round(baseTDEE)} × Climate (${climate}): ${climateModifier} = ${Math.round(tdee)}`,
    };
  }

  private static getActivityMultiplier(level: ActivityLevel): number {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return multipliers[level] || 1.55;
  }

  private static getClimateModifier(climate: ClimateType): number {
    const modifiers = {
      tropical: 1.05,
      temperate: 1.0,
      cold: 1.1,
      arid: 1.03,
    };
    return modifiers[climate] || 1.0;
  }
}

export class WaterCalculatorService {
  static calculate(
    weight: number,
    activityLevel: ActivityLevel,
    climate: ClimateType,
  ): WaterResult {
    const totalML = waterCalculator.calculate(weight, activityLevel, climate);

    const base_ml = weight * 33;
    const climate_ml = this.getClimateWaterBonus(climate, weight);
    const activity_ml = this.getActivityWaterBonus(activityLevel, weight);

    return {
      totalML,
      liters: Math.round((totalML / 1000) * 10) / 10,
      cups: Math.round((totalML / 237) * 10) / 10,
      breakdown: {
        base_ml,
        climate_ml,
        activity_ml,
        final_ml: totalML,
      },
    };
  }

  private static getClimateWaterBonus(
    climate: ClimateType,
    weight: number,
  ): number {
    const bonuses = {
      tropical: weight * 10,
      temperate: 0,
      cold: 0,
      arid: weight * 8,
    };
    return bonuses[climate] || 0;
  }

  private static getActivityWaterBonus(
    level: ActivityLevel,
    weight: number,
  ): number {
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

export class MacroCalculatorService {
  static calculate(
    tdee: number,
    weight: number,
    goal:
      | "fat_loss"
      | "muscle_gain"
      | "maintenance"
      | "athletic"
      | "endurance"
      | "strength",
    dietType: DietType,
  ): MacroResult {
    const protein = macroCalculator.calculateProtein(weight, goal, dietType);
    const macros = macroCalculator.calculateMacroSplit(tdee, protein, dietType);

    const protein_percent = Math.round(((macros.protein * 4) / tdee) * 100);
    const carbs_percent = Math.round(((macros.carbs * 4) / tdee) * 100);
    const fat_percent = Math.round(((macros.fat * 9) / tdee) * 100);

    return {
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      percentages: {
        protein_percent,
        carbs_percent,
        fat_percent,
      },
    };
  }

  static calculateProteinOnly(
    weight: number,
    goal:
      | "fat_loss"
      | "muscle_gain"
      | "maintenance"
      | "athletic"
      | "endurance"
      | "strength",
    dietType: DietType,
  ): number {
    return macroCalculator.calculateProtein(weight, goal, dietType);
  }

  static getMacroPercentages(
    macros: { protein: number; carbs: number; fat: number },
    tdee: number,
  ): {
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  } {
    return {
      protein_percent: Math.round(((macros.protein * 4) / tdee) * 100),
      carbs_percent: Math.round(((macros.carbs * 4) / tdee) * 100),
      fat_percent: Math.round(((macros.fat * 9) / tdee) * 100),
    };
  }
}
