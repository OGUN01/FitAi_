/**
 * BMR Calculators - 4 scientifically validated formulas
 * Each formula has different accuracy for different populations
 */

import type { BMRCalculator } from '../interfaces/calculators';
import type { UserProfile } from '../types.js';

/**
 * Mifflin-St Jeor Formula (1990) - DEFAULT
 * Most accurate for general population
 * Accuracy: ±10%
 *
 * Male: (10 × weight) + (6.25 × height) - (5 × age) + 5
 * Female: (10 × weight) + (6.25 × height) - (5 × age) - 161
 */
export class MifflinStJeorBMRCalculator implements BMRCalculator {
  calculate(user: UserProfile): number {
    const weight = user.weight;
    const height = user.height;
    const age = user.age;
    const gender = user.gender;

    if (!weight || !height || !age || !gender) {
      throw new Error('Missing required fields for BMR calculation: weight, height, age, gender');
    }

    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      // Use female formula for 'female', 'other', 'prefer_not_to_say'
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }

  getFormula(): string {
    return 'Mifflin-St Jeor (1990)';
  }

  getAccuracy(): string {
    return '±10%';
  }
}

/**
 * Katch-McArdle Formula (1996)
 * Best for individuals with known body fat percentage
 * Accuracy: ±5% (requires accurate body fat measurement)
 *
 * BMR = 370 + (21.6 × lean body mass in kg)
 */
export class KatchMcArdleBMRCalculator implements BMRCalculator {
  calculate(user: UserProfile): number {
    const weight = user.weight;
    const bodyFat = user.bodyFat;

    if (!weight) {
      throw new Error('Missing required field for BMR calculation: weight');
    }

    if (!bodyFat) {
      throw new Error('Body fat percentage required for Katch-McArdle formula');
    }

    const leanBodyMass = weight * (1 - bodyFat / 100);
    return 370 + (21.6 * leanBodyMass);
  }

  getFormula(): string {
    return 'Katch-McArdle (1996)';
  }

  getAccuracy(): string {
    return '±5% (requires accurate body fat)';
  }
}

/**
 * Cunningham Formula (1980)
 * Specifically designed for athletes and highly active individuals
 * Accuracy: ±5% (best for athletes with low body fat)
 *
 * BMR = 500 + (22 × lean body mass in kg)
 */
export class CunninghamBMRCalculator implements BMRCalculator {
  calculate(user: UserProfile): number {
    const weight = user.weight;
    const bodyFat = user.bodyFat;

    if (!weight) {
      throw new Error('Missing required field for BMR calculation: weight');
    }

    if (!bodyFat) {
      throw new Error('Body fat percentage required for Cunningham formula');
    }

    const leanBodyMass = weight * (1 - bodyFat / 100);
    return 500 + (22 * leanBodyMass);
  }

  getFormula(): string {
    return 'Cunningham (for athletes)';
  }

  getAccuracy(): string {
    return '±5% (athletes with low body fat)';
  }
}

/**
 * Harris-Benedict Revised Formula (1984)
 * Revision of the original 1919 formula
 * Accuracy: ±10-15%
 *
 * Male: 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
 * Female: 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)
 */
export class HarrisBenedictBMRCalculator implements BMRCalculator {
  calculate(user: UserProfile): number {
    const weight = user.weight;
    const height = user.height;
    const age = user.age;
    const gender = user.gender;

    if (!weight || !height || !age || !gender) {
      throw new Error('Missing required fields for BMR calculation: weight, height, age, gender');
    }

    if (gender === 'male') {
      return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
  }

  getFormula(): string {
    return 'Harris-Benedict Revised (1984)';
  }

  getAccuracy(): string {
    return '±10-15%';
  }
}

/**
 * Factory function to get the appropriate BMR calculator
 * @param hasBodyFat - Whether user has body fat percentage data
 * @param isAthlete - Whether user is an athlete
 * @returns Appropriate BMR calculator instance
 */
export function getBMRCalculator(
  hasBodyFat: boolean = false,
  isAthlete: boolean = false
): BMRCalculator {
  if (hasBodyFat && isAthlete) {
    return new CunninghamBMRCalculator();
  } else if (hasBodyFat) {
    return new KatchMcArdleBMRCalculator();
  } else {
    return new MifflinStJeorBMRCalculator();
  }
}
