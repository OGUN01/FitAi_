export type WeightUnit = 'kg' | 'lbs';

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
