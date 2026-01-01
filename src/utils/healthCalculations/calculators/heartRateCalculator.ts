/**
 * HEART RATE ZONE CALCULATOR
 * Multiple formulas with auto-selection
 *
 * Formulas:
 * - Tanaka: 208 - (0.7 x age) [Most accurate for males]
 * - Gulati: 206 - (0.88 x age) [Female-specific, more accurate for women]
 * - Karvonen Method: HR Reserve = (Max HR - Resting HR) x Intensity + Resting HR
 *
 * Research Sources:
 * - Tanaka et al. (2001) - Age-predicted maximal heart rate revisited
 * - Gulati et al. (2010) - Female-specific heart rate formula
 * - Karvonen (1957) - Heart rate reserve method
 *
 * Phase 3: Advanced Health Features
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { HeartRateZones } from '../types';

export class HeartRateCalculator {
  /**
   * Calculate max heart rate using best formula for user
   * Auto-selects most accurate formula based on gender
   *
   * @param age - User's age
   * @param gender - User's gender
   * @param measured - Actual measured max HR (if available from testing)
   * @returns Maximum heart rate in bpm
   */
  calculateMaxHR(
    age: number,
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say',
    measured?: number
  ): number {
    // Priority 1: Actual measured max HR (most accurate)
    if (measured && measured > 0) {
      return measured;
    }

    // Priority 2: Gender-specific formulas
    if (gender === 'female') {
      // Gulati formula (more accurate for women)
      // Research: Gulati et al. 2010
      return Math.round(206 - (0.88 * age));
    }

    // Priority 3: Tanaka formula for males and others
    // More accurate than traditional 220-age
    // Research: Tanaka et al. 2001
    return Math.round(208 - (0.7 * age));
  }

  /**
   * Calculate heart rate zones using Karvonen method
   * Heart Rate Reserve (HRR) = Max HR - Resting HR
   * Target HR = (HRR x Intensity%) + Resting HR
   *
   * @param age - User's age
   * @param gender - User's gender
   * @param restingHR - Resting heart rate (optional, will estimate if not provided)
   * @param maxHR - Maximum heart rate (optional, will calculate if not provided)
   * @returns Heart rate zones with detailed information
   */
  calculateZones(
    age: number,
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say',
    restingHR?: number,
    maxHR?: number
  ): HeartRateZones {
    // Calculate or use provided max HR
    const max = this.calculateMaxHR(age, gender, maxHR);

    // Estimate resting HR if not provided
    // Average resting HR: Males ~70, Females ~75
    const resting = restingHR || (gender === 'female' ? 75 : 70);

    // Heart Rate Reserve (Karvonen method)
    const reserve = max - resting;

    return {
      zone1: {
        name: 'Recovery',
        min: Math.round(resting + (reserve * 0.50)),
        max: Math.round(resting + (reserve * 0.60)),
        intensity: '50-60%',
        purpose: 'Active recovery, warm-up',
        benefits: [
          'Active recovery between hard workouts',
          'Enhanced fat oxidation',
          'Build aerobic base',
          'Promote blood flow and recovery'
        ]
      },
      zone2: {
        name: 'Aerobic',
        min: Math.round(resting + (reserve * 0.60)),
        max: Math.round(resting + (reserve * 0.70)),
        intensity: '60-70%',
        purpose: 'Steady cardio, fat burn',
        benefits: [
          'Maximum fat burning zone',
          'Build endurance foundation',
          'Improve aerobic capacity',
          'Can sustain for long durations'
        ]
      },
      zone3: {
        name: 'Tempo',
        min: Math.round(resting + (reserve * 0.70)),
        max: Math.round(resting + (reserve * 0.80)),
        intensity: '70-80%',
        purpose: 'Tempo runs, moderate intensity',
        benefits: [
          'Improve lactate threshold',
          'Build aerobic power',
          'Race pace training',
          'Moderate calorie burn'
        ]
      },
      zone4: {
        name: 'Threshold',
        min: Math.round(resting + (reserve * 0.80)),
        max: Math.round(resting + (reserve * 0.90)),
        intensity: '80-90%',
        purpose: 'Intervals, hard efforts',
        benefits: [
          'Increase anaerobic threshold',
          'Improve VO2 max',
          'Performance gains',
          'High calorie burn'
        ]
      },
      zone5: {
        name: 'VO2 Max',
        min: Math.round(resting + (reserve * 0.90)),
        max: max,
        intensity: '90-100%',
        purpose: 'Max intervals, sprints',
        benefits: [
          'Maximum performance development',
          'Power and speed gains',
          'Peak athletic performance',
          'Short duration only (unsustainable)'
        ]
      },
      metadata: {
        maxHR: max,
        restingHR: resting,
        formula: gender === 'female' ? 'Gulati' : 'Tanaka',
        method: 'Karvonen'
      }
    };
  }

  /**
   * Classify resting heart rate
   * Lower resting HR generally indicates better cardiovascular fitness
   */
  classifyRestingHR(
    restingHR: number,
    age: number,
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  ): {
    classification: string;
    description: string;
    healthImplications: string;
  } {
    // Gender-specific classifications
    const thresholds = gender === 'female'
      ? { excellent: 60, good: 65, average: 75, belowAverage: 82 }
      : { excellent: 55, good: 60, average: 70, belowAverage: 78 };

    if (restingHR <= thresholds.excellent) {
      return {
        classification: 'Excellent',
        description: 'Athletic heart rate',
        healthImplications: 'Indicates excellent cardiovascular fitness and heart health.'
      };
    } else if (restingHR <= thresholds.good) {
      return {
        classification: 'Good',
        description: 'Above average fitness',
        healthImplications: 'Good cardiovascular fitness. Heart is efficient.'
      };
    } else if (restingHR <= thresholds.average) {
      return {
        classification: 'Average',
        description: 'Normal heart rate',
        healthImplications: 'Average cardiovascular fitness. Room for improvement through exercise.'
      };
    } else if (restingHR <= thresholds.belowAverage) {
      return {
        classification: 'Below Average',
        description: 'Higher than ideal',
        healthImplications: 'Consider increasing cardiovascular exercise to improve heart efficiency.'
      };
    } else {
      return {
        classification: 'Poor',
        description: 'Elevated resting heart rate',
        healthImplications: 'Consult healthcare provider. May indicate deconditioning or health issues.'
      };
    }
  }

  /**
   * Calculate target heart rate for specific training intensity
   * Useful for prescribing specific workout intensities
   */
  calculateTargetHR(
    age: number,
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say',
    intensityPercent: number,
    restingHR?: number,
    maxHR?: number
  ): {
    target: number;
    range: { min: number; max: number };
    zone: string;
  } {
    const max = this.calculateMaxHR(age, gender, maxHR);
    const resting = restingHR || (gender === 'female' ? 75 : 70);
    const reserve = max - resting;

    const target = Math.round(resting + (reserve * (intensityPercent / 100)));
    const rangeMin = Math.round(resting + (reserve * ((intensityPercent - 5) / 100)));
    const rangeMax = Math.round(resting + (reserve * ((intensityPercent + 5) / 100)));

    // Determine zone
    let zone: string;
    if (intensityPercent < 60) zone = 'Recovery';
    else if (intensityPercent < 70) zone = 'Aerobic';
    else if (intensityPercent < 80) zone = 'Tempo';
    else if (intensityPercent < 90) zone = 'Threshold';
    else zone = 'VO2 Max';

    return {
      target,
      range: { min: rangeMin, max: rangeMax },
      zone
    };
  }

  /**
   * Estimate fitness level from resting HR and age
   * Lower resting HR = better fitness (generally)
   */
  estimateFitnessFromRHR(
    restingHR: number,
    age: number,
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  ): {
    fitnessLevel: 'Poor' | 'Below Average' | 'Average' | 'Good' | 'Excellent';
    score: number;
  } {
    const classification = this.classifyRestingHR(restingHR, age, gender);

    const scoreMap: Record<string, number> = {
      'Excellent': 95,
      'Good': 80,
      'Average': 60,
      'Below Average': 40,
      'Poor': 20
    };

    return {
      fitnessLevel: classification.classification as any,
      score: scoreMap[classification.classification] || 50
    };
  }
}

// Export singleton instance
export const heartRateCalculator = new HeartRateCalculator();
