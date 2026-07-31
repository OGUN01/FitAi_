export type WeightUnit = 'kg' | 'lbs';

/**
 * Parse a user-entered numeric string that may use a comma as the decimal
 * separator (e.g. "65,5" in de-DE / fr-FR locales). Normalises the comma to a
 * dot before calling parseFloat so the result is always correct.
 */
export function parseLocalFloat(value: string): number {
  const normalized = value.replace(',', '.');
  return parseFloat(normalized);
}

const KG_TO_LBS = 2.20462;

export function convertWeight(weight: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  if (fromUnit === toUnit) {
    return weight;
  }

  return fromUnit === 'kg' ? weight * KG_TO_LBS : weight / KG_TO_LBS;
}

export function toDisplayWeight(
  weightKg: number | null | undefined,
  unit: WeightUnit
): number | null {
  if (weightKg == null || !Number.isFinite(weightKg)) {
    return null;
  }

  return convertWeight(weightKg, 'kg', unit);
}

export type HeightUnit = 'cm' | 'in';

const CM_PER_INCH = 2.54;

export function convertHeight(height: number, fromUnit: HeightUnit, toUnit: HeightUnit): number {
  if (fromUnit === toUnit) {
    return height;
  }

  return fromUnit === 'cm' ? height / CM_PER_INCH : height * CM_PER_INCH;
}

export function toDisplayHeight(
  heightCm: number | null | undefined,
  unit: HeightUnit
): number | null {
  if (heightCm == null || !Number.isFinite(heightCm)) {
    return null;
  }

  return convertHeight(heightCm, 'cm', unit);
}
