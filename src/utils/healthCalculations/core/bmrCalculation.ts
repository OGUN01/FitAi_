/**
 * BMR Calculation - Single Source of Truth
 *
 * Consolidates 3+ duplicate BMR implementations into one service with formula selection
 *
 * Formulas supported:
 * - Mifflin-St Jeor (1990) - DEFAULT - Most accurate for general population (±10%)
 * - Harris-Benedict Revised (1984) - Alternative/Legacy (±10-15%)
 * - Katch-McArdle (1996) - For users with known body fat % (±5%)
 * - Cunningham (1980) - For athletes with low body fat (±5%)
 *
 * Replaced implementations from:
 * - src/utils/healthCalculations.ts (MetabolicCalculations.calculateBMR)
 * - src/utils/healthCalculations/calculators/bmrCalculators.ts (4 classes)
 * - src/utils/healthCalculations/calculatorFactory.ts
 */

export type BMRFormula =
  | "mifflin-st-jeor"
  | "harris-benedict"
  | "katch-mcardle"
  | "cunningham";

export interface BMRResult {
  bmr: number;
  formula: string;
  accuracy: string;
}

/**
 * Calculate BMR using Mifflin-St Jeor Formula (DEFAULT - Most Accurate)
 *
 * Formula:
 * - Male: (10 × weight) + (6.25 × height) - (5 × age) + 5
 * - Female: (10 × weight) + (6.25 × height) - (5 × age) - 161
 *
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @param age - Age in years
 * @param gender - Gender ('male' | 'female' | 'other' | 'prefer_not_to_say')
 * @returns BMR in kcal/day
 * @throws Error if required parameters are missing
 *
 * @example
 * const bmr = calculateBMR(70, 175, 30, 'male'); // Returns ~1680 kcal/day
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string,
): number {
  // CRITICAL VALIDATION: No fallbacks allowed
  if (!weightKg || weightKg === 0) {
    throw new Error(
      "Weight is required for BMR calculation. Please complete your profile.",
    );
  }

  if (!heightCm || heightCm === 0) {
    throw new Error(
      "Height is required for BMR calculation. Please complete your profile.",
    );
  }

  if (!age || age === 0) {
    throw new Error(
      "Age is required for BMR calculation. Please complete your profile.",
    );
  }

  if (!gender || gender === "") {
    throw new Error(
      "Gender is required for accurate BMR calculation. Please complete your profile.",
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

  if (age < 13 || age > 120) {
    throw new Error(`Age must be between 13-120 years. Received: ${age} years`);
  }

  // Mifflin-St Jeor Formula (1990)
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender === "male") {
    return Math.round(base + 5);
  } else if (gender === "female") {
    return Math.round(base - 161);
  } else {
    // For 'other'/'prefer_not_to_say', use average of male/female formulas
    // Male: base + 5, Female: base - 161
    // Average: (base + 5 + base - 161) / 2 = base - 78
    return Math.round(base - 78);
  }
}

/**
 * Calculate BMR using Harris-Benedict Revised Formula (1984)
 * Alternative formula, less accurate than Mifflin-St Jeor
 *
 * Formula:
 * - Male: 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
 * - Female: 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)
 *
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @param age - Age in years
 * @param gender - Gender ('male' | 'female')
 * @returns BMR in kcal/day
 */
export function calculateBMRHarrisBenedict(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string,
): number {
  // Validation
  if (!weightKg || !heightCm || !age || !gender) {
    throw new Error(
      "All parameters required for Harris-Benedict BMR calculation",
    );
  }

  if (gender === "male") {
    return Math.round(
      88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age,
    );
  } else {
    return Math.round(
      447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age,
    );
  }
}

/**
 * Calculate BMR using Katch-McArdle Formula (1996)
 * Best for individuals with known body fat percentage
 *
 * Formula: BMR = 370 + (21.6 × lean body mass in kg)
 *
 * @param weightKg - Weight in kilograms
 * @param bodyFatPercentage - Body fat percentage (5-60%)
 * @returns BMR in kcal/day
 */
export function calculateBMRKatchMcArdle(
  weightKg: number,
  bodyFatPercentage: number,
): number {
  if (!weightKg || !bodyFatPercentage) {
    throw new Error(
      "Weight and body fat percentage required for Katch-McArdle formula",
    );
  }

  if (bodyFatPercentage < 5 || bodyFatPercentage > 60) {
    throw new Error(
      `Body fat percentage must be between 5-60%. Received: ${bodyFatPercentage}%`,
    );
  }

  const leanBodyMass = weightKg * (1 - bodyFatPercentage / 100);
  return Math.round(370 + 21.6 * leanBodyMass);
}

/**
 * Calculate BMR using Cunningham Formula (1980)
 * Specifically designed for athletes with low body fat
 *
 * Formula: BMR = 500 + (22 × lean body mass in kg)
 *
 * @param weightKg - Weight in kilograms
 * @param bodyFatPercentage - Body fat percentage (5-25% for athletes)
 * @returns BMR in kcal/day
 */
export function calculateBMRCunningham(
  weightKg: number,
  bodyFatPercentage: number,
): number {
  if (!weightKg || !bodyFatPercentage) {
    throw new Error(
      "Weight and body fat percentage required for Cunningham formula",
    );
  }

  if (bodyFatPercentage < 5 || bodyFatPercentage > 25) {
    throw new Error(
      `Cunningham formula is for athletes with 5-25% body fat. Received: ${bodyFatPercentage}%`,
    );
  }

  const leanBodyMass = weightKg * (1 - bodyFatPercentage / 100);
  return Math.round(500 + 22 * leanBodyMass);
}

/**
 * Calculate BMR with automatic formula selection
 *
 * @param params - BMR calculation parameters
 * @returns BMR result with formula info
 *
 * @example
 * const result = calculateBMRWithFormula({
 *   weightKg: 70,
 *   heightCm: 175,
 *   age: 30,
 *   gender: 'male',
 *   bodyFatPercentage: 15,
 *   isAthlete: false
 * });
 * // Returns { bmr: 1680, formula: 'Katch-McArdle (1996)', accuracy: '±5%' }
 */
export function calculateBMRWithFormula(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: string;
  bodyFatPercentage?: number;
  isAthlete?: boolean;
  preferredFormula?: BMRFormula;
}): BMRResult {
  const {
    weightKg,
    heightCm,
    age,
    gender,
    bodyFatPercentage,
    isAthlete,
    preferredFormula,
  } = params;

  // Use preferred formula if specified
  if (preferredFormula) {
    switch (preferredFormula) {
      case "harris-benedict":
        return {
          bmr: calculateBMRHarrisBenedict(weightKg, heightCm, age, gender),
          formula: "Harris-Benedict Revised (1984)",
          accuracy: "±10-15%",
        };

      case "katch-mcardle":
        if (!bodyFatPercentage) {
          throw new Error(
            "Body fat percentage required for Katch-McArdle formula",
          );
        }
        return {
          bmr: calculateBMRKatchMcArdle(weightKg, bodyFatPercentage),
          formula: "Katch-McArdle (1996)",
          accuracy: "±5%",
        };

      case "cunningham":
        if (!bodyFatPercentage) {
          throw new Error(
            "Body fat percentage required for Cunningham formula",
          );
        }
        return {
          bmr: calculateBMRCunningham(weightKg, bodyFatPercentage),
          formula: "Cunningham (1980)",
          accuracy: "±5%",
        };

      case "mifflin-st-jeor":
      default:
        return {
          bmr: calculateBMR(weightKg, heightCm, age, gender),
          formula: "Mifflin-St Jeor (1990)",
          accuracy: "±10%",
        };
    }
  }

  // Auto-select formula based on available data
  if (bodyFatPercentage && isAthlete && bodyFatPercentage <= 25) {
    return {
      bmr: calculateBMRCunningham(weightKg, bodyFatPercentage),
      formula: "Cunningham (1980) - Athlete Formula",
      accuracy: "±5%",
    };
  } else if (
    bodyFatPercentage &&
    bodyFatPercentage >= 5 &&
    bodyFatPercentage <= 60
  ) {
    return {
      bmr: calculateBMRKatchMcArdle(weightKg, bodyFatPercentage),
      formula: "Katch-McArdle (1996)",
      accuracy: "±5%",
    };
  } else {
    // Default to Mifflin-St Jeor (most validated)
    return {
      bmr: calculateBMR(weightKg, heightCm, age, gender),
      formula: "Mifflin-St Jeor (1990)",
      accuracy: "±10%",
    };
  }
}

/**
 * Validate BMR calculation inputs
 *
 * @param params - BMR parameters
 * @returns Validation result with errors if any
 */
export function validateBMRInputs(params: {
  weightKg: number | null | undefined;
  heightCm: number | null | undefined;
  age: number | null | undefined;
  gender: string | null | undefined;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.weightKg || params.weightKg === 0) {
    errors.push("Weight is required");
  } else if (params.weightKg < 30 || params.weightKg > 300) {
    errors.push("Weight must be between 30-300 kg");
  }

  if (!params.heightCm || params.heightCm === 0) {
    errors.push("Height is required");
  } else if (params.heightCm < 100 || params.heightCm > 250) {
    errors.push("Height must be between 100-250 cm");
  }

  if (!params.age || params.age === 0) {
    errors.push("Age is required");
  } else if (params.age < 13 || params.age > 120) {
    errors.push("Age must be between 13-120 years");
  }

  if (!params.gender || params.gender === "") {
    errors.push("Gender is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
