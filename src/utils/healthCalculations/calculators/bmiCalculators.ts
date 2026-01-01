/**
 * BMI Calculators - Population-specific classifications
 * Different ethnic groups have different health risks at different BMI levels
 */

import type { BMICalculator, BMIClassification, BMICutoffs } from '../types.js';

// Population Type for BMI calculator selection
export type PopulationType = 'asian' | 'african' | 'caucasian' | 'hispanic' | 'athletic' | 'general';

/**
 * Asian BMI Calculator
 * Uses WHO Asian-specific cutoffs (lower thresholds)
 * Research shows Asian populations have higher health risks at lower BMI
 */
export class AsianBMICalculator implements BMICalculator {
  calculate(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  getClassification(bmi: number): BMIClassification {
    const cutoffs = this.getCutoffs();

    if (bmi < 18.5) {
      return {
        category: 'Underweight',
        healthRisk: 'moderate',
        cutoffs,
        ethnicity: 'asian',
        message: 'Below healthy weight range',
        recommendations: [
          'Consult healthcare provider',
          'Increase calorie intake gradually',
          'Focus on strength training to build muscle',
          'Monitor for nutritional deficiencies',
        ],
      };
    } else if (bmi < 23.0) {
      // Asian cutoff lower than general 25
      return {
        category: 'Normal',
        healthRisk: 'low',
        cutoffs,
        ethnicity: 'asian',
        message: 'Healthy weight range',
        recommendations: [
          'Maintain current weight',
          'Continue regular exercise',
          'Eat balanced, nutritious meals',
          'Monitor weight quarterly',
        ],
      };
    } else if (bmi < 27.5) {
      // Asian cutoff lower than general 30
      return {
        category: 'Overweight',
        healthRisk: 'moderate',
        cutoffs,
        ethnicity: 'asian',
        message: 'Above healthy weight range',
        recommendations: [
          'Weight loss recommended (5-10% of body weight)',
          'Increase physical activity to 150+ min/week',
          'Reduce calorie intake by 300-500 kcal/day',
          'Monitor blood pressure and blood sugar',
        ],
      };
    } else {
      return {
        category: 'Obese',
        healthRisk: 'high',
        cutoffs,
        ethnicity: 'asian',
        message: 'Significantly above healthy range',
        recommendations: [
          'Medical consultation strongly advised',
          'Structured weight loss plan needed',
          'Screen for diabetes and cardiovascular disease',
          'Consider registered dietitian consultation',
        ],
      };
    }
  }

  getCutoffs(): BMICutoffs {
    return {
      underweight: 18.5,
      normalMin: 18.5,
      normalMax: 23.0,
      overweightMax: 27.5,
      obeseMin: 27.5,
      source: 'WHO Asian-specific cutoffs',
      notes: 'Lower thresholds for Asian populations due to higher health risks at lower BMI',
    };
  }
}

/**
 * African BMI Calculator
 * Higher cutoffs due to higher bone density and muscle mass
 */
export class AfricanBMICalculator implements BMICalculator {
  calculate(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  getClassification(bmi: number): BMIClassification {
    if (bmi < 18.5) {
      return {
        category: 'Underweight',
        description: 'Below healthy weight range',
        healthRisk: 'moderate',
        recommendations: [
          'Consult healthcare provider',
          'Increase calorie intake',
          'Focus on nutrient-dense foods',
          'Strength training to build muscle',
        ],
      };
    } else if (bmi < 27.0) {
      // Higher than general 25
      return {
        category: 'Normal',
        description: 'Healthy weight range',
        healthRisk: 'low',
        recommendations: [
          'Maintain current weight',
          'Regular physical activity',
          'Balanced nutrition',
          'Annual health checkups',
        ],
      };
    } else if (bmi < 32.0) {
      // Higher than general 30
      return {
        category: 'Overweight',
        description: 'Above healthy weight range',
        healthRisk: 'moderate',
        recommendations: [
          'Consider gradual weight loss',
          'Increase activity level',
          'Monitor waist circumference',
          'Check blood pressure regularly',
        ],
      };
    } else {
      return {
        category: 'Obese',
        description: 'Significantly above healthy range',
        healthRisk: 'high',
        recommendations: [
          'Medical consultation advised',
          'Comprehensive weight management plan',
          'Screen for metabolic conditions',
          'Consider dietitian support',
        ],
      };
    }
  }

  getCutoffs(): BMICutoffs {
    return {
      underweight: 18.5,
      normalMin: 18.5,
      normalMax: 27.0,
      overweightMax: 32.0,
      obeseMin: 32.0,
    };
  }
}

/**
 * Standard/Caucasian BMI Calculator
 * Uses WHO general population cutoffs
 */
export class StandardBMICalculator implements BMICalculator {
  calculate(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  getClassification(bmi: number): BMIClassification {
    if (bmi < 18.5) {
      return {
        category: 'Underweight',
        description: 'Below healthy weight range',
        healthRisk: 'moderate',
        recommendations: [
          'Consult healthcare provider',
          'Increase calorie intake',
          'Build muscle through resistance training',
          'Address potential underlying conditions',
        ],
      };
    } else if (bmi < 25.0) {
      return {
        category: 'Normal',
        description: 'Healthy weight range',
        healthRisk: 'low',
        recommendations: [
          'Maintain current weight',
          'Regular exercise (150 min/week)',
          'Balanced diet',
          'Regular health screenings',
        ],
      };
    } else if (bmi < 30.0) {
      return {
        category: 'Overweight',
        description: 'Above healthy weight range',
        healthRisk: 'moderate',
        recommendations: [
          'Weight loss recommended (5-10% reduction)',
          'Increase physical activity',
          'Reduce calorie intake',
          'Monitor cardiovascular health',
        ],
      };
    } else {
      return {
        category: 'Obese',
        description: 'Significantly above healthy range',
        healthRisk: 'high',
        recommendations: [
          'Medical consultation strongly advised',
          'Structured weight loss program',
          'Screen for diabetes, heart disease',
          'Consider professional support',
        ],
      };
    }
  }

  getCutoffs(): BMICutoffs {
    return {
      underweight: 18.5,
      normalMin: 18.5,
      normalMax: 25.0,
      overweightMax: 30.0,
      obeseMin: 30.0,
    };
  }
}

/**
 * Athletic BMI Calculator
 * Special considerations for athletes with high muscle mass
 */
export class AthleticBMICalculator implements BMICalculator {
  calculate(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  getClassification(bmi: number): BMIClassification {
    if (bmi < 18.5) {
      return {
        category: 'Underweight',
        description: 'Below optimal weight for athletes',
        healthRisk: 'moderate',
        recommendations: [
          'Increase calorie intake to support training',
          'Focus on protein and carbohydrate timing',
          'Monitor performance metrics',
          'Consider sports nutritionist consultation',
        ],
      };
    } else if (bmi < 27.0) {
      // Higher than general due to muscle mass
      return {
        category: 'Normal',
        description: 'Healthy weight range for athletes',
        healthRisk: 'low',
        recommendations: [
          'Maintain current weight',
          'Continue training program',
          'Adequate nutrition for recovery',
          'Monitor body composition, not just BMI',
        ],
      };
    } else if (bmi < 32.0) {
      return {
        category: 'Overweight',
        description: 'BMI may be misleading due to muscle mass',
        healthRisk: 'low',
        recommendations: [
          'Use body fat percentage instead of BMI',
          'Waist-to-height ratio recommended',
          'DEXA scan for accurate body composition',
          'BMI unreliable for muscular individuals',
        ],
      };
    } else {
      return {
        category: 'Obese',
        description: 'High BMI - verify with body composition',
        healthRisk: 'moderate',
        recommendations: [
          'Body fat measurement essential',
          'BMI likely overestimating fat mass',
          'Use alternative metrics (waist circumference)',
          'Consult sports medicine professional',
        ],
      };
    }
  }

  getCutoffs(): BMICutoffs {
    return {
      underweight: 18.5,
      normalMin: 18.5,
      normalMax: 27.0,
      overweightMax: 32.0,
      obeseMin: 32.0,
    };
  }
}

/**
 * Hispanic BMI Calculator
 * Uses standard cutoffs with Hispanic-specific considerations
 */
export class HispanicBMICalculator implements BMICalculator {
  calculate(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  getClassification(bmi: number): BMIClassification {
    // Hispanic populations show similar cutoffs to general population
    // but with higher risk of diabetes at lower BMI
    if (bmi < 18.5) {
      return {
        category: 'Underweight',
        description: 'Below healthy weight range',
        healthRisk: 'moderate',
        recommendations: [
          'Consult healthcare provider',
          'Increase calorie intake',
          'Build muscle mass',
          'Monitor nutritional status',
        ],
      };
    } else if (bmi < 25.0) {
      return {
        category: 'Normal',
        description: 'Healthy weight range',
        healthRisk: 'low',
        recommendations: [
          'Maintain current weight',
          'Regular physical activity',
          'Balanced diet',
          'Screen for diabetes (higher risk)',
        ],
      };
    } else if (bmi < 30.0) {
      return {
        category: 'Overweight',
        description: 'Above healthy weight range',
        healthRisk: 'moderate',
        recommendations: [
          'Weight loss recommended',
          'Increase activity level',
          'Diabetes screening important',
          'Monitor cardiovascular health',
        ],
      };
    } else {
      return {
        category: 'Obese',
        description: 'Significantly above healthy range',
        healthRisk: 'high',
        recommendations: [
          'Medical consultation strongly advised',
          'Comprehensive diabetes screening',
          'Structured weight loss program',
          'Consider cultural dietary modifications',
        ],
      };
    }
  }

  getCutoffs(): BMICutoffs {
    return {
      underweight: 18.5,
      normalMin: 18.5,
      normalMax: 25.0,
      overweightMax: 30.0,
      obeseMin: 30.0,
    };
  }
}

/**
 * Factory function to get the appropriate BMI calculator
 * @param populationType - User's population/ethnic background
 * @returns Appropriate BMI calculator instance
 */
export function getBMICalculator(populationType: PopulationType = 'general'): BMICalculator {
  switch (populationType) {
    case 'asian':
      return new AsianBMICalculator();
    case 'african':
      return new AfricanBMICalculator();
    case 'hispanic':
      return new HispanicBMICalculator();
    case 'athletic':
      return new AthleticBMICalculator();
    case 'caucasian':
    case 'general':
    default:
      return new StandardBMICalculator();
  }
}
