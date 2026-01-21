/**
 * BMI Calculation - Single Source of Truth
 *
 * Consolidates 8+ duplicate BMI implementations into one validated function
 *
 * Formula: weight(kg) / (height(m))²
 *
 * Replaced implementations from:
 * - src/utils/healthCalculations.ts (MetabolicCalculations.calculateBMI)
 * - src/utils/healthCalculations/calculators/bmiCalculators.ts (5 classes)
 * - src/services/api.ts (apiUtils.calculateBMI)
 * - src/utils/VALIDATION_EXAMPLES.tsx (calculateBMI)
 * - src/utils/healthCalculations/calculatorFactory.ts (3 instances)
 */

/**
 * Calculate BMI (Body Mass Index)
 *
 * @param weightKg - Weight in kilograms (30-300 kg)
 * @param heightCm - Height in centimeters (100-250 cm)
 * @returns BMI value (rounded to 1 decimal place)
 * @throws Error if weight or height is invalid/missing
 *
 * @example
 * const bmi = calculateBMI(70, 175); // Returns 22.9
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  // Validation: No fallbacks allowed - CRITICAL
  if (!weightKg || weightKg === 0) {
    throw new Error(
      "Weight is required for BMI calculation. Please complete your profile.",
    );
  }

  if (!heightCm || heightCm === 0) {
    throw new Error(
      "Height is required for BMI calculation. Please complete your profile.",
    );
  }

  // Validate ranges
  if (weightKg < 30 || weightKg > 300) {
    throw new Error(
      `Weight must be between 30-300 kg. Received: ${weightKg} kg`,
    );
  }

  if (heightCm < 100 || heightCm > 250) {
    throw new Error(
      `Height must be between 100-250 cm. Received: ${heightCm} cm`,
    );
  }

  // Calculate BMI
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  // Round to 1 decimal place
  return Math.round(bmi * 10) / 10;
}

/**
 * Get BMI category (standard WHO classification)
 *
 * @param bmi - BMI value
 * @returns Category string
 *
 * @example
 * getBMICategory(22.9); // Returns 'Normal weight'
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/**
 * Get BMI category with health risk level
 *
 * @param bmi - BMI value
 * @returns Object with category and health risk
 *
 * @example
 * getBMICategoryWithRisk(22.9);
 * // Returns { category: 'Normal weight', risk: 'low' }
 */
export function getBMICategoryWithRisk(bmi: number): {
  category: string;
  risk: "low" | "moderate" | "high";
  description: string;
} {
  if (bmi < 18.5) {
    return {
      category: "Underweight",
      risk: "moderate",
      description: "Below healthy weight range",
    };
  }

  if (bmi < 25) {
    return {
      category: "Normal weight",
      risk: "low",
      description: "Healthy weight range",
    };
  }

  if (bmi < 30) {
    return {
      category: "Overweight",
      risk: "moderate",
      description: "Above healthy weight range",
    };
  }

  return {
    category: "Obese",
    risk: "high",
    description: "Significantly above healthy range",
  };
}

/**
 * Get Asian-specific BMI classification (lower thresholds)
 * WHO recommends lower cutoffs for Asian populations due to higher health risks at lower BMI
 *
 * @param bmi - BMI value
 * @returns Category string
 *
 * @example
 * getAsianBMICategory(23.5); // Returns 'Overweight' (vs 'Normal' in standard)
 */
export function getAsianBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 23.0) return "Normal weight"; // Lower than standard 25
  if (bmi < 27.5) return "Overweight"; // Lower than standard 30
  return "Obese";
}

/**
 * Validate BMI inputs without throwing errors
 * Useful for form validation
 *
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @returns Validation result with errors if any
 */
export function validateBMIInputs(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!weightKg || weightKg === 0) {
    errors.push("Weight is required");
  } else if (weightKg < 30 || weightKg > 300) {
    errors.push("Weight must be between 30-300 kg");
  }

  if (!heightCm || heightCm === 0) {
    errors.push("Height is required");
  } else if (heightCm < 100 || heightCm > 250) {
    errors.push("Height must be between 100-250 cm");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
