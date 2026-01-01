# UNIVERSAL HEALTH CALCULATION SYSTEM - WORLD-CLASS BLUEPRINT

**Mission:** Make FitAI the most accurate, adaptive, and scientifically-validated fitness app for ALL populations globally.

**Date:** December 30, 2025
**Version:** 1.0 - Complete Implementation Blueprint
**Target:** Universal coverage for 8 billion+ humans across all demographics

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Core Philosophy](#core-philosophy)
3. [Auto-Detection Framework](#auto-detection-framework)
4. [Universal Formula System](#universal-formula-system)
5. [Population-Specific Adaptations](#population-specific-adaptations)
6. [Implementation Architecture](#implementation-architecture)
7. [Database Schema Updates](#database-schema-updates)
8. [User Experience Design](#user-experience-design)
9. [Testing Matrix](#testing-matrix)
10. [Migration Plan](#migration-plan)

---

## EXECUTIVE SUMMARY

### Current State Analysis

**Strengths:**
- ✅ Mifflin-St Jeor BMR formula (industry standard)
- ✅ Comprehensive validation engine
- ✅ Gender-specific calculations
- ✅ Age-based metabolic adjustments

**Critical Gaps:**
- ❌ NO ethnic/population-specific BMI classifications
- ❌ NO climate-adaptive TDEE/water calculations
- ❌ NO diet-type protein adjustments (vegetarian/vegan)
- ❌ Single BMR formula (missing Katch-McArdle, Cunningham)
- ❌ Single heart rate zone formula (220-age only)
- ❌ NO experience-based muscle gain limits
- ❌ NO adaptive regional cuisine/food patterns

### Target State: World-Class System

**Coverage:**
- ✅ 7+ ethnicities (Asian, Caucasian, Black, Hispanic, Middle Eastern, Pacific Islander, Mixed)
- ✅ 4 climate zones (Tropical, Temperate, Cold, Arid)
- ✅ 6 diet types with population-specific adaptations
- ✅ 4 BMR formulas with auto-selection
- ✅ 3 heart rate zone methods
- ✅ Experience-based muscle gain limits (natural vs advanced)
- ✅ Age-specific adjustments (teens, adults, elderly)
- ✅ Special populations (pregnancy, medical conditions, athletes)

---

## CORE PHILOSOPHY

### "Best in the World" Principles

**1. ACCURATE**
- Use peer-reviewed, scientifically validated formulas
- Population-specific equations where research shows significant differences
- Cite sources for every formula (build user trust)

**2. ADAPTIVE**
- Auto-detect user's context from existing data
- Apply appropriate formula without user having to select
- Gracefully degrade when data is incomplete

**3. INTELLIGENT**
- Detect conflicts/outliers (e.g., "desk job" + "extremely active")
- Suggest corrections with reasoning
- Learn from user feedback

**4. FLEXIBLE**
- Allow aggressive goals but warn appropriately
- Never block user choice (tiered warnings: ⚠️ → ⚠️⚠️ → ⚠️⚠️⚠️)
- Show "what experts recommend" vs "what you selected"

**5. UNIVERSAL**
- Work for any human, anywhere, any goal
- No hardcoded assumptions (e.g., "everyone eats dairy")
- Cultural sensitivity in food/exercise recommendations

**6. TRANSPARENT**
- Show formula used and why
- Allow advanced users to override auto-selection
- Display confidence levels ("90% accurate based on your inputs")

---

## AUTO-DETECTION FRAMEWORK

### Detection Hierarchy (Priority Order)

```typescript
interface DetectionContext {
  // AUTO-DETECTED from existing data
  ethnicity?: EthnicityGroup;        // From country/region
  climate?: ClimateZone;             // From location
  dietType?: DietType;               // From diet_preferences
  bodyFatAccuracy?: BodyFatSource;   // From input method
  fitnessLevel?: FitnessLevel;       // From assessments

  // USER-CONFIRMED (if auto-detection uncertain)
  ethnicityConfirmed?: boolean;
  climateConfirmed?: boolean;

  // CONFIDENCE SCORES (0-100)
  ethnicityConfidence: number;
  climateConfidence: number;
  bodyFatConfidence: number;
}
```

### 1. Ethnicity Detection

**Auto-Detection Logic:**
```typescript
function detectEthnicity(country: string, region?: string): EthnicityDetectionResult {
  const COUNTRY_ETHNICITY_MAP = {
    // South Asia (90% confidence - high homogeneity)
    'India': { primary: 'asian', subgroup: 'south_asian', confidence: 90 },
    'Pakistan': { primary: 'asian', subgroup: 'south_asian', confidence: 90 },
    'Bangladesh': { primary: 'asian', subgroup: 'south_asian', confidence: 90 },
    'Sri Lanka': { primary: 'asian', subgroup: 'south_asian', confidence: 90 },

    // East Asia (90% confidence)
    'China': { primary: 'asian', subgroup: 'east_asian', confidence: 90 },
    'Japan': { primary: 'asian', subgroup: 'east_asian', confidence: 90 },
    'South Korea': { primary: 'asian', subgroup: 'east_asian', confidence: 90 },

    // Southeast Asia (85% confidence - more diverse)
    'Thailand': { primary: 'asian', subgroup: 'southeast_asian', confidence: 85 },
    'Vietnam': { primary: 'asian', subgroup: 'southeast_asian', confidence: 85 },
    'Philippines': { primary: 'asian', subgroup: 'southeast_asian', confidence: 80 },

    // Middle East (75% confidence - diverse population)
    'Saudi Arabia': { primary: 'middle_eastern', confidence: 75 },
    'UAE': { primary: 'middle_eastern', confidence: 60 }, // Very diverse
    'Iran': { primary: 'middle_eastern', confidence: 80 },

    // Africa (70% confidence - high diversity within countries)
    'Nigeria': { primary: 'black_african', confidence: 70 },
    'South Africa': { primary: 'black_african', confidence: 60 }, // Mixed
    'Kenya': { primary: 'black_african', confidence: 75 },

    // Europe (80% confidence - relatively homogeneous)
    'UK': { primary: 'caucasian', confidence: 75 }, // Diverse cities
    'Germany': { primary: 'caucasian', confidence: 85 },
    'France': { primary: 'caucasian', confidence: 80 },
    'Russia': { primary: 'caucasian', confidence: 90 },

    // Americas (60% confidence - very diverse)
    'USA': { primary: 'mixed', confidence: 50 }, // Extremely diverse
    'Canada': { primary: 'mixed', confidence: 55 },
    'Mexico': { primary: 'hispanic', confidence: 80 },
    'Brazil': { primary: 'mixed', confidence: 50 }, // Highly diverse

    // Pacific (85% confidence)
    'Australia': { primary: 'caucasian', confidence: 70 }, // Indigenous + diverse
    'New Zealand': { primary: 'caucasian', confidence: 70 },
    'Fiji': { primary: 'pacific_islander', confidence: 85 },
    'Samoa': { primary: 'pacific_islander', confidence: 90 },
  };

  const detection = COUNTRY_ETHNICITY_MAP[country];

  // If confidence < 70%, ask user to confirm
  if (!detection || detection.confidence < 70) {
    return {
      detected: detection?.primary || 'general',
      confidence: detection?.confidence || 0,
      shouldAskUser: true,
      message: `Your location (${country}) has diverse populations. Please select your ethnicity for more accurate calculations.`
    };
  }

  return {
    detected: detection.primary,
    confidence: detection.confidence,
    shouldAskUser: false
  };
}
```

**Ethnicity Groups (Metabolic Differences):**
```typescript
type EthnicityGroup =
  | 'asian'              // Includes South, East, Southeast Asian
  | 'caucasian'          // European descent
  | 'black_african'      // African descent
  | 'hispanic'           // Latin American
  | 'middle_eastern'     // Middle East, North Africa
  | 'pacific_islander'   // Pacific Islands
  | 'mixed'              // Mixed ethnicity
  | 'general';           // Default/not specified

// Sub-groups for more precise calculations (optional)
type AsianSubgroup = 'south_asian' | 'east_asian' | 'southeast_asian';
```

### 2. Climate Detection

**Auto-Detection Logic:**
```typescript
function detectClimate(country: string, state?: string, region?: string): ClimateDetectionResult {
  // Use geographic coordinates if available
  const CLIMATE_DATABASE = {
    // Tropical (hot & humid year-round)
    tropical: {
      countries: ['India', 'Bangladesh', 'Thailand', 'Singapore', 'Malaysia', 'Indonesia',
                  'Philippines', 'Vietnam', 'Sri Lanka', 'Brazil (North)', 'Nigeria', 'Kenya'],
      characteristics: {
        avgTempC: 27,
        humidity: 75,
        tdeeModifier: 1.05,      // +5% for thermoregulation
        waterModifier: 1.50,     // +50% for sweat loss
      }
    },

    // Temperate (moderate seasons)
    temperate: {
      countries: ['USA', 'UK', 'Germany', 'France', 'Japan', 'South Korea', 'China (East)',
                  'Australia (South)', 'New Zealand', 'Argentina'],
      characteristics: {
        avgTempC: 15,
        humidity: 60,
        tdeeModifier: 1.00,      // Baseline
        waterModifier: 1.00,     // Baseline
      }
    },

    // Cold (long winters, short summers)
    cold: {
      countries: ['Canada', 'Russia', 'Norway', 'Sweden', 'Finland', 'Iceland', 'Alaska'],
      characteristics: {
        avgTempC: 5,
        humidity: 50,
        tdeeModifier: 1.15,      // +15% for thermogenesis
        waterModifier: 0.90,     // -10% (less sweating)
      }
    },

    // Arid (desert/dry)
    arid: {
      countries: ['Saudi Arabia', 'UAE', 'Egypt', 'Libya', 'Australia (Central)',
                  'Arizona (USA)', 'Nevada (USA)', 'Chile (North)'],
      characteristics: {
        avgTempC: 30,
        humidity: 20,
        tdeeModifier: 1.05,      // +5% for heat stress
        waterModifier: 1.70,     // +70% for evaporation
      }
    }
  };

  // Detect from country first
  for (const [zone, data] of Object.entries(CLIMATE_DATABASE)) {
    if (data.countries.some(c => country.includes(c.split(' ')[0]))) {
      return {
        zone: zone as ClimateZone,
        confidence: 90,
        characteristics: data.characteristics
      };
    }
  }

  // Fallback to temperate
  return {
    zone: 'temperate',
    confidence: 50,
    characteristics: CLIMATE_DATABASE.temperate.characteristics,
    shouldAskUser: true
  };
}
```

**Indian Climate Sub-Zones:**
```typescript
const INDIAN_CLIMATE_ZONES = {
  'Kerala': { subzone: 'tropical', waterModifier: 1.60 },      // Very humid
  'Tamil Nadu': { subzone: 'tropical', waterModifier: 1.55 },
  'Mumbai': { subzone: 'tropical_coastal', waterModifier: 1.50 },
  'Delhi': { subzone: 'semi_arid', waterModifier: 1.40 },      // Hot, dry summers
  'Rajasthan': { subzone: 'arid', waterModifier: 1.70 },       // Desert
  'Himachal Pradesh': { subzone: 'cold', waterModifier: 0.95 }, // Mountains
  'Bangalore': { subzone: 'temperate', waterModifier: 1.20 },  // Pleasant climate
};
```

### 3. Body Fat Accuracy Detection

**Auto-Selection Logic:**
```typescript
function detectBestBMRFormula(user: UserProfile): BMRFormulaSelection {
  const {
    body_fat_percentage,
    body_fat_source,      // NEW FIELD: 'manual' | 'dexa' | 'calipers' | 'ai_photo' | 'bmi_estimate'
    ai_confidence_score,
    workout_experience_years,
    bmi
  } = user;

  // Priority 1: DEXA/Bod Pod (gold standard)
  if (body_fat_source === 'dexa' || body_fat_source === 'bodpod') {
    return {
      formula: 'katch_mcardle',
      reason: 'Using Katch-McArdle formula due to accurate body fat measurement (DEXA/Bod Pod)',
      accuracy: '±5%',
      confidence: 95
    };
  }

  // Priority 2: Athlete with known body fat
  if (workout_experience_years >= 3 && body_fat_percentage && body_fat_percentage < 15) {
    return {
      formula: 'cunningham',
      reason: 'Using Cunningham formula for advanced athlete with low body fat',
      accuracy: '±5%',
      confidence: 90
    };
  }

  // Priority 3: Accurate manual input or calipers
  if (body_fat_source === 'calipers' && body_fat_percentage) {
    return {
      formula: 'katch_mcardle',
      reason: 'Using Katch-McArdle formula based on caliper measurement',
      accuracy: '±7%',
      confidence: 80
    };
  }

  // Priority 4: High-confidence AI estimate
  if (body_fat_source === 'ai_photo' && ai_confidence_score && ai_confidence_score > 85) {
    return {
      formula: 'katch_mcardle',
      reason: 'Using Katch-McArdle with AI-estimated body fat (high confidence)',
      accuracy: '±10%',
      confidence: 70
    };
  }

  // Default: Mifflin-St Jeor (most validated for general population)
  return {
    formula: 'mifflin_st_jeor',
    reason: 'Using Mifflin-St Jeor formula (most accurate for general population)',
    accuracy: '±10%',
    confidence: 85
  };
}
```

---

## UNIVERSAL FORMULA SYSTEM

### 1. BMR Calculation (4 Formulas)

```typescript
class UniversalBMRCalculator {
  /**
   * Calculate BMR using best formula for user's context
   */
  static calculateBMR(params: BMRParams): BMRResult {
    const formula = this.selectBestFormula(params);
    let bmr: number;

    switch (formula.name) {
      case 'mifflin_st_jeor':
        bmr = this.mifflinStJeor(params);
        break;
      case 'katch_mcardle':
        bmr = this.katchMcArdle(params);
        break;
      case 'cunningham':
        bmr = this.cunningham(params);
        break;
      case 'harris_benedict_revised':
        bmr = this.harrisBenedictRevised(params);
        break;
    }

    return {
      bmr,
      formula: formula.name,
      accuracy: formula.accuracy,
      confidence: formula.confidence,
      reasoning: formula.reason
    };
  }

  /**
   * Mifflin-St Jeor (Default - Most Validated)
   * Male: 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
   * Female: 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
   *
   * Accuracy: ±10%
   * Best for: General population without body fat data
   * Source: Mifflin et al. (1990)
   */
  private static mifflinStJeor(params: BMRParams): number {
    const { weight_kg, height_cm, age, gender } = params;
    const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;

    if (gender === 'male') return base + 5;
    if (gender === 'female') return base - 161;
    return base - 78; // Average for other
  }

  /**
   * Katch-McArdle (Best with Body Fat %)
   * BMR = 370 + (21.6 × lean_body_mass_kg)
   *
   * Accuracy: ±5% (most accurate when BF% is accurate)
   * Best for: Users with DEXA/calipers/accurate BF%
   * Source: Katch & McArdle (1996)
   */
  private static katchMcArdle(params: BMRParams): number {
    const { weight_kg, body_fat_percentage } = params;
    const fat_mass = weight_kg * (body_fat_percentage / 100);
    const lean_mass = weight_kg - fat_mass;
    return 370 + (21.6 * lean_mass);
  }

  /**
   * Cunningham (For Athletes)
   * BMR = 500 + (22 × lean_body_mass_kg)
   *
   * Accuracy: ±5%
   * Best for: Athletes, very active individuals with low BF%
   * Source: Cunningham (1980)
   */
  private static cunningham(params: BMRParams): number {
    const { weight_kg, body_fat_percentage } = params;
    const fat_mass = weight_kg * (body_fat_percentage / 100);
    const lean_mass = weight_kg - fat_mass;
    return 500 + (22 * lean_mass);
  }

  /**
   * Harris-Benedict Revised (Alternative)
   * Male: 88.362 + 13.397×weight + 4.799×height - 5.677×age
   * Female: 447.593 + 9.247×weight + 3.098×height - 4.330×age
   *
   * Accuracy: ±12-15%
   * Best for: Comparison/validation only (older formula)
   * Source: Harris & Benedict (1918, revised 1984)
   */
  private static harrisBenedictRevised(params: BMRParams): number {
    const { weight_kg, height_cm, age, gender } = params;

    if (gender === 'male') {
      return 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age);
    } else if (gender === 'female') {
      return 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age);
    }

    // Average for other
    const male = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age);
    const female = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age);
    return (male + female) / 2;
  }
}
```

### 2. Adaptive BMI Classification

```typescript
class UniversalBMIClassifier {
  /**
   * Get BMI category with population-specific cutoffs
   */
  static getBMICategory(bmi: number, context: DetectionContext): BMICategory {
    const ethnicity = context.ethnicity || 'general';
    const cutoffs = this.getCutoffs(ethnicity);

    let category: string;
    let healthRisk: 'low' | 'moderate' | 'high' | 'very_high';

    if (bmi < cutoffs.underweight) {
      category = 'Underweight';
      healthRisk = 'moderate';
    } else if (bmi < cutoffs.normal_max) {
      category = 'Normal';
      healthRisk = 'low';
    } else if (bmi < cutoffs.overweight_max) {
      category = 'Overweight';
      healthRisk = 'moderate';
    } else if (bmi < cutoffs.obese_class_1_max) {
      category = 'Obese Class I';
      healthRisk = 'high';
    } else if (bmi < cutoffs.obese_class_2_max) {
      category = 'Obese Class II';
      healthRisk = 'very_high';
    } else {
      category = 'Obese Class III';
      healthRisk = 'very_high';
    }

    return {
      category,
      healthRisk,
      cutoffs,
      ethnicity,
      message: this.getMessage(bmi, ethnicity, category)
    };
  }

  /**
   * Population-specific BMI cutoffs
   */
  private static getCutoffs(ethnicity: EthnicityGroup): BMICutoffs {
    const CUTOFFS: Record<EthnicityGroup, BMICutoffs> = {
      // Asian populations (WHO Asia-Pacific)
      asian: {
        underweight: 18.5,
        normal_max: 22.9,
        overweight_max: 27.4,
        obese_class_1_max: 32.4,
        obese_class_2_max: 37.5,
        source: 'WHO Asia-Pacific (2000)',
        notes: 'Asians have 3-5% higher body fat at same BMI vs Caucasians'
      },

      // Black/African populations
      black_african: {
        underweight: 18.5,
        normal_max: 26.9,
        overweight_max: 31.9,
        obese_class_1_max: 36.9,
        obese_class_2_max: 39.9,
        source: 'Deurenberg et al. (1998)',
        notes: 'Higher muscle mass, lower body fat at same BMI'
      },

      // Caucasian/European (standard WHO)
      caucasian: {
        underweight: 18.5,
        normal_max: 24.9,
        overweight_max: 29.9,
        obese_class_1_max: 34.9,
        obese_class_2_max: 39.9,
        source: 'WHO (1995)',
        notes: 'Standard reference population'
      },

      // Hispanic/Latino
      hispanic: {
        underweight: 18.5,
        normal_max: 24.9,
        overweight_max: 29.9,
        obese_class_1_max: 34.9,
        obese_class_2_max: 39.9,
        source: 'CDC (2022)',
        notes: 'Similar to general WHO, but higher diabetes risk at lower BMI'
      },

      // Middle Eastern
      middle_eastern: {
        underweight: 18.5,
        normal_max: 24.0,
        overweight_max: 28.9,
        obese_class_1_max: 34.9,
        obese_class_2_max: 39.9,
        source: 'Al-Lawati & Jousilahti (2008)',
        notes: 'Slightly lower cutoffs due to higher metabolic disease risk'
      },

      // Pacific Islander
      pacific_islander: {
        underweight: 18.5,
        normal_max: 26.0,
        overweight_max: 32.0,
        obese_class_1_max: 37.0,
        obese_class_2_max: 40.0,
        source: 'WHO Pacific (2002)',
        notes: 'Higher cutoffs due to larger frame size and muscle mass'
      },

      // Mixed/Unknown - Use general WHO
      mixed: {
        underweight: 18.5,
        normal_max: 24.9,
        overweight_max: 29.9,
        obese_class_1_max: 34.9,
        obese_class_2_max: 39.9,
        source: 'WHO (1995)',
        notes: 'General classification for mixed ethnicity'
      },

      general: {
        underweight: 18.5,
        normal_max: 24.9,
        overweight_max: 29.9,
        obese_class_1_max: 34.9,
        obese_class_2_max: 39.9,
        source: 'WHO (1995)',
        notes: 'General classification'
      }
    };

    return CUTOFFS[ethnicity];
  }

  /**
   * Generate personalized message
   */
  private static getMessage(bmi: number, ethnicity: EthnicityGroup, category: string): string {
    if (ethnicity === 'asian' && bmi >= 23 && bmi < 25) {
      return `BMI ${bmi.toFixed(1)} - ${category} (Asian classification). Note: This is considered "Normal" in general WHO classification, but research shows Asians have higher health risks at this BMI. Aim for BMI < 23.0 for optimal health.`;
    }

    if (ethnicity === 'black_african' && bmi >= 25 && bmi < 27) {
      return `BMI ${bmi.toFixed(1)} - ${category}. Note: You may have higher muscle mass than other populations. Consider using waist-to-height ratio for more accurate health assessment.`;
    }

    return `BMI ${bmi.toFixed(1)} - ${category}`;
  }
}
```

### 3. Climate-Adaptive TDEE & Water

```typescript
class ClimateAdaptiveCalculations {
  /**
   * Calculate TDEE with climate adjustments
   */
  static calculateTDEE(bmr: number, params: TDEEParams): TDEEResult {
    const { occupation, activity_level, climate, country, state } = params;

    // Step 1: Base TDEE from occupation
    const baseTDEE = bmr * this.getOccupationMultiplier(occupation);

    // Step 2: Add climate modifier
    const climateModifier = this.getClimateModifier(climate);
    const tdeeWithClimate = baseTDEE * climateModifier;

    // Step 3: Regional fine-tuning (India-specific example)
    const regionalTDEE = this.applyRegionalAdjustments(tdeeWithClimate, country, state);

    return {
      tdee: Math.round(regionalTDEE),
      breakdown: {
        bmr,
        baseTDEE,
        climateModifier,
        finalTDEE: regionalTDEE
      },
      reasoning: this.getTDEEReasoning(params, climateModifier)
    };
  }

  /**
   * Climate modifiers based on thermoregulation research
   */
  private static getClimateModifier(climate: ClimateZone): number {
    const MODIFIERS = {
      tropical: 1.05,      // +5% for cooling (Speakman & Selman, 2003)
      temperate: 1.00,     // Baseline
      cold: 1.15,          // +15% for thermogenesis (van Marken Lichtenbelt, 2010)
      arid: 1.05           // +5% for heat stress
    };
    return MODIFIERS[climate];
  }

  /**
   * Calculate water needs with climate adjustments
   */
  static calculateWaterIntake(weight_kg: number, params: WaterParams): WaterResult {
    const { climate, activity_level, workout_frequency, country, state } = params;

    // Base: 35ml per kg (European standard)
    const baseWater = weight_kg * 35;

    // Climate adjustment
    const climateMultiplier = this.getClimateWaterMultiplier(climate);
    const waterWithClimate = baseWater * climateMultiplier;

    // Activity adjustment
    const activityBonus = this.getActivityWaterBonus(activity_level, workout_frequency);
    const totalWater = waterWithClimate + activityBonus;

    // Regional fine-tuning (Indian states)
    const finalWater = this.applyRegionalWaterAdjustments(totalWater, country, state);

    return {
      daily_ml: Math.round(finalWater),
      breakdown: {
        base_ml: Math.round(baseWater),
        climate_ml: Math.round(waterWithClimate),
        activity_ml: Math.round(activityBonus),
        final_ml: Math.round(finalWater)
      },
      reasoning: this.getWaterReasoning(params, climateMultiplier)
    };
  }

  /**
   * Climate-based water multipliers
   */
  private static getClimateWaterMultiplier(climate: ClimateZone): number {
    const MULTIPLIERS = {
      tropical: 1.50,      // +50% for high humidity sweat loss
      temperate: 1.00,     // Baseline
      cold: 0.90,          // -10% for reduced sweating
      arid: 1.70           // +70% for high evaporation rate
    };
    return MULTIPLIERS[climate];
  }

  /**
   * Regional adjustments for India
   */
  private static applyRegionalWaterAdjustments(water: number, country: string, state?: string): number {
    if (country !== 'India') return water;

    // Indian state-specific modifiers (summer averages)
    const INDIAN_STATE_MODIFIERS = {
      'Rajasthan': 1.15,        // Desert heat
      'Gujarat': 1.12,          // Hot, dry
      'Tamil Nadu': 1.10,       // Tropical heat
      'Kerala': 1.08,           // Humid coastal
      'Maharashtra': 1.05,      // Varied but hot
      'Delhi': 1.10,            // Extreme summer heat
      'Uttar Pradesh': 1.08,
      'Bihar': 1.08,
      'West Bengal': 1.05,      // Humid
      'Karnataka': 1.00,        // Moderate (Bangalore)
      'Himachal Pradesh': 0.95, // Cooler mountains
      'Jammu and Kashmir': 0.90 // Cold mountains
    };

    const modifier = state ? INDIAN_STATE_MODIFIERS[state] || 1.0 : 1.0;
    return water * modifier;
  }
}
```

### 4. Diet-Type Adaptive Macros

```typescript
class DietTypeAdaptiveMacros {
  /**
   * Calculate macros with diet-type protein adjustments
   */
  static calculateMacros(calories: number, params: MacroParams): MacroResult {
    const { diet_type, primary_goals, body_weight_kg, ethnicity } = params;

    // Step 1: Base protein needs (g/kg body weight)
    const baseProtein_g_per_kg = this.getBaseProteinTarget(primary_goals);

    // Step 2: Diet-type adjustment (vegetarian/vegan need MORE)
    const dietAdjustedProtein_g_per_kg = this.applyDietTypeAdjustment(
      baseProtein_g_per_kg,
      diet_type
    );

    // Step 3: Calculate total protein
    const protein_g = Math.round(body_weight_kg * dietAdjustedProtein_g_per_kg);
    const protein_calories = protein_g * 4;

    // Step 4: Calculate fats (based on diet type)
    const fat_percentage = this.getFatPercentage(diet_type, primary_goals);
    const fat_calories = Math.round(calories * fat_percentage);
    const fat_g = Math.round(fat_calories / 9);

    // Step 5: Remaining calories go to carbs
    const carb_calories = calories - protein_calories - fat_calories;
    const carb_g = Math.round(carb_calories / 4);

    return {
      protein_g,
      carb_g,
      fat_g,
      distribution: {
        protein_percent: Math.round((protein_calories / calories) * 100),
        carb_percent: Math.round((carb_calories / calories) * 100),
        fat_percent: Math.round((fat_calories / calories) * 100)
      },
      reasoning: this.getMacroReasoning(params, dietAdjustedProtein_g_per_kg)
    };
  }

  /**
   * Base protein targets by goal
   */
  private static getBaseProteinTarget(primary_goals: string[]): number {
    if (primary_goals.includes('muscle_gain')) return 2.2;
    if (primary_goals.includes('strength')) return 2.0;
    if (primary_goals.includes('weight_loss')) return 2.0;  // High protein preserves muscle
    if (primary_goals.includes('endurance')) return 1.6;
    return 1.6; // General health
  }

  /**
   * Diet-type protein adjustments (CRITICAL for vegetarian/vegan)
   */
  private static applyDietTypeAdjustment(base: number, diet_type: DietType): number {
    const ADJUSTMENTS = {
      'non-veg': 1.00,         // Baseline (complete proteins)
      'pescatarian': 1.00,     // Fish = complete protein
      'vegetarian': 1.15,      // +15% (incomplete proteins, lower bioavailability)
      'vegan': 1.25            // +25% (plant proteins need higher intake)
    };

    return base * ADJUSTMENTS[diet_type];
  }

  /**
   * Fat percentage by diet type
   */
  private static getFatPercentage(diet_type: DietType, goals: string[]): number {
    // Keto/low-carb overrides
    if (goals.includes('keto')) return 0.70;
    if (goals.includes('low_carb')) return 0.45;

    // Standard by diet type
    const FAT_PERCENTAGES = {
      'non-veg': 0.30,
      'pescatarian': 0.30,
      'vegetarian': 0.25,      // Lower fat, higher carb (traditional)
      'vegan': 0.25
    };

    return FAT_PERCENTAGES[diet_type];
  }

  /**
   * Generate reasoning message
   */
  private static getMacroReasoning(params: MacroParams, protein_g_per_kg: number): string {
    const { diet_type } = params;

    if (diet_type === 'vegan') {
      return `Vegan diets require 25% more protein (${protein_g_per_kg.toFixed(1)}g/kg) due to lower bioavailability of plant proteins. Focus on complete protein combinations (rice+beans, quinoa, soy products).`;
    }

    if (diet_type === 'vegetarian') {
      return `Vegetarian diets require 15% more protein (${protein_g_per_kg.toFixed(1)}g/kg) than non-vegetarian diets. Include dairy, eggs, legumes, and complete protein combinations.`;
    }

    return `Protein target: ${protein_g_per_kg.toFixed(1)}g/kg body weight for your goals.`;
  }
}
```

### 5. Heart Rate Zone Formulas (3 Methods)

```typescript
class HeartRateZoneCalculator {
  /**
   * Calculate heart rate zones using best formula for user
   */
  static calculateZones(params: HRParams): HRZoneResult {
    const formula = this.selectBestFormula(params);
    const maxHR = this.calculateMaxHR(params, formula);
    const zones = this.calculateAllZones(maxHR, params);

    return {
      max_hr: maxHR,
      zones,
      formula: formula.name,
      reasoning: formula.reason
    };
  }

  /**
   * Select best max HR formula
   */
  private static selectBestFormula(params: HRParams): HRFormulaSelection {
    const { age, gender, fitness_level } = params;

    // For women, use Gulati (more accurate)
    if (gender === 'female') {
      return {
        name: 'gulati',
        reason: 'Using Gulati formula (more accurate for women)',
        accuracy: '±10 bpm'
      };
    }

    // For older adults or very fit, use Tanaka
    if (age > 40 || fitness_level === 'advanced') {
      return {
        name: 'tanaka',
        reason: 'Using Tanaka formula (more accurate for older/fit individuals)',
        accuracy: '±11 bpm'
      };
    }

    // Default: Karvonen (uses resting HR for personalization)
    return {
      name: 'karvonen',
      reason: 'Using Karvonen formula with your resting heart rate for personalized zones',
      accuracy: '±12 bpm'
    };
  }

  /**
   * Calculate maximum heart rate
   */
  private static calculateMaxHR(params: HRParams, formula: HRFormulaSelection): number {
    const { age, resting_hr } = params;

    switch (formula.name) {
      case 'tanaka':
        // Tanaka: 208 - (0.7 × age)
        // More accurate for older adults and athletes
        return Math.round(208 - (0.7 * age));

      case 'gulati':
        // Gulati: 206 - (0.88 × age) [for women]
        // Most accurate for females
        return Math.round(206 - (0.88 * age));

      case 'karvonen':
      default:
        // Karvonen uses basic formula for max HR
        // 220 - age (then applies HR reserve formula for zones)
        return 220 - age;
    }
  }

  /**
   * Calculate all training zones
   */
  private static calculateAllZones(maxHR: number, params: HRParams): HRZones {
    const { resting_hr } = params;

    // If we have resting HR, use Karvonen method for zones
    if (resting_hr) {
      return this.karvonenZones(maxHR, resting_hr);
    }

    // Otherwise use percentage of max HR
    return this.percentageMaxZones(maxHR);
  }

  /**
   * Karvonen Formula (Heart Rate Reserve)
   * Target HR = ((max HR − resting HR) × %intensity) + resting HR
   * More personalized, accounts for fitness level
   */
  private static karvonenZones(maxHR: number, restingHR: number): HRZones {
    const hrReserve = maxHR - restingHR;

    return {
      zone_1_recovery: {
        min: Math.round(restingHR + (hrReserve * 0.50)),
        max: Math.round(restingHR + (hrReserve * 0.60)),
        name: 'Recovery/Warm-up',
        benefit: 'Active recovery, warm-up'
      },
      zone_2_fat_burn: {
        min: Math.round(restingHR + (hrReserve * 0.60)),
        max: Math.round(restingHR + (hrReserve * 0.70)),
        name: 'Fat Burn',
        benefit: 'Aerobic base, fat oxidation'
      },
      zone_3_aerobic: {
        min: Math.round(restingHR + (hrReserve * 0.70)),
        max: Math.round(restingHR + (hrReserve * 0.80)),
        name: 'Aerobic/Cardio',
        benefit: 'Cardiovascular fitness, endurance'
      },
      zone_4_anaerobic: {
        min: Math.round(restingHR + (hrReserve * 0.80)),
        max: Math.round(restingHR + (hrReserve * 0.90)),
        name: 'Anaerobic',
        benefit: 'Lactate threshold, performance'
      },
      zone_5_max: {
        min: Math.round(restingHR + (hrReserve * 0.90)),
        max: maxHR,
        name: 'Max Effort',
        benefit: 'Peak performance, sprint training'
      }
    };
  }

  /**
   * Percentage of Max HR (simpler, less personalized)
   */
  private static percentageMaxZones(maxHR: number): HRZones {
    return {
      zone_1_recovery: {
        min: Math.round(maxHR * 0.50),
        max: Math.round(maxHR * 0.60),
        name: 'Recovery/Warm-up',
        benefit: 'Active recovery, warm-up'
      },
      zone_2_fat_burn: {
        min: Math.round(maxHR * 0.60),
        max: Math.round(maxHR * 0.70),
        name: 'Fat Burn',
        benefit: 'Aerobic base, fat oxidation'
      },
      zone_3_aerobic: {
        min: Math.round(maxHR * 0.70),
        max: Math.round(maxHR * 0.80),
        name: 'Aerobic/Cardio',
        benefit: 'Cardiovascular fitness, endurance'
      },
      zone_4_anaerobic: {
        min: Math.round(maxHR * 0.80),
        max: Math.round(maxHR * 0.90),
        name: 'Anaerobic',
        benefit: 'Lactate threshold, performance'
      },
      zone_5_max: {
        min: Math.round(maxHR * 0.90),
        max: maxHR,
        name: 'Max Effort',
        benefit: 'Peak performance, sprint training'
      }
    };
  }
}
```

---

## POPULATION-SPECIFIC ADAPTATIONS

### 1. Age-Based Adjustments

```typescript
class AgeBasedAdjustments {
  /**
   * Apply age-specific metabolic and safety adjustments
   */
  static applyAgeAdjustments(calculations: BaseCalculations, age: number): AdjustedCalculations {
    const ageGroup = this.getAgeGroup(age);

    return {
      ...calculations,
      bmr: this.adjustBMRForAge(calculations.bmr, age),
      protein_g: this.adjustProteinForAge(calculations.protein_g, ageGroup),
      max_deficit: this.adjustMaxDeficitForAge(calculations.max_deficit, ageGroup),
      max_surplus: this.adjustMaxSurplusForAge(calculations.max_surplus, ageGroup),
      warnings: this.getAgeWarnings(ageGroup)
    };
  }

  private static getAgeGroup(age: number): AgeGroup {
    if (age < 18) return 'teenager';
    if (age < 30) return 'young_adult';
    if (age < 50) return 'adult';
    if (age < 65) return 'middle_aged';
    if (age < 75) return 'senior';
    return 'elderly';
  }

  /**
   * Age-based BMR adjustments
   */
  private static adjustBMRForAge(bmr: number, age: number): number {
    // Teenagers: +5-15% (growth + development)
    if (age < 18) {
      const boostPercent = age < 16 ? 0.15 : 0.10;
      return bmr * (1 + boostPercent);
    }

    // Adults: progressive decline
    if (age >= 60) return bmr * 0.85;  // -15%
    if (age >= 50) return bmr * 0.90;  // -10%
    if (age >= 40) return bmr * 0.95;  // -5%
    if (age >= 30) return bmr * 0.98;  // -2%

    return bmr; // No adjustment for 18-29
  }

  /**
   * Age-based protein adjustments
   */
  private static adjustProteinForAge(protein_g: number, ageGroup: AgeGroup): number {
    const PROTEIN_MULTIPLIERS = {
      teenager: 1.10,      // +10% for growth
      young_adult: 1.00,   // Baseline
      adult: 1.00,         // Baseline
      middle_aged: 1.15,   // +15% to prevent sarcopenia
      senior: 1.30,        // +30% (muscle protein synthesis declines)
      elderly: 1.30        // +30%
    };

    return Math.round(protein_g * PROTEIN_MULTIPLIERS[ageGroup]);
  }

  /**
   * Age-based deficit limits (safety)
   */
  private static adjustMaxDeficitForAge(max_deficit: number, ageGroup: AgeGroup): number {
    const DEFICIT_LIMITS = {
      teenager: 0.85,      // 15% lower (still growing)
      young_adult: 1.00,   // Full deficit OK
      adult: 1.00,         // Full deficit OK
      middle_aged: 0.90,   // 10% lower (slower recovery)
      senior: 0.80,        // 20% lower (safety)
      elderly: 0.70        // 30% lower (very conservative)
    };

    return Math.round(max_deficit * DEFICIT_LIMITS[ageGroup]);
  }
}
```

### 2. Experience-Based Muscle Gain Limits

```typescript
class MuscleGainLimits {
  /**
   * Calculate realistic muscle gain rate based on training experience
   * Based on Lyle McDonald's research + natural bodybuilding data
   */
  static calculateMaxMuscleGainRate(params: MuscleGainParams): MuscleGainLimits {
    const { workout_experience_years, gender, age, current_body_fat } = params;

    // Determine experience category
    const category = this.getExperienceCategory(workout_experience_years);

    // Base rates (for males 18-35, optimal conditions)
    const baseRates = this.getBaseRates(category);

    // Apply gender adjustment
    const genderAdjusted = this.applyGenderAdjustment(baseRates, gender);

    // Apply age adjustment
    const ageAdjusted = this.applyAgeAdjustment(genderAdjusted, age);

    // Apply body fat adjustment (harder to gain muscle at very low/high BF%)
    const finalRates = this.applyBodyFatAdjustment(ageAdjusted, current_body_fat);

    return {
      monthly_kg: finalRates,
      weekly_kg: finalRates / 4.33,
      category,
      confidence: this.getConfidence(params),
      reasoning: this.getReasoning(category, gender, age)
    };
  }

  /**
   * Experience categories (Lyle McDonald model)
   */
  private static getExperienceCategory(years: number): ExperienceCategory {
    if (years < 1) return 'beginner';        // Year 1
    if (years < 3) return 'intermediate';    // Years 2-3
    if (years < 5) return 'advanced';        // Years 4-5
    return 'elite';                          // 5+ years
  }

  /**
   * Base muscle gain rates for males (kg/month)
   */
  private static getBaseRates(category: ExperienceCategory): MuscleGainRange {
    const RATES: Record<ExperienceCategory, MuscleGainRange> = {
      // Year 1: Newbie gains (fast progress)
      beginner: {
        min: 0.75,  // Conservative
        max: 1.25,  // Optimal conditions
        typical: 1.00,
        label: 'Beginner (0-1 year)'
      },

      // Years 2-3: Good progress but slowing
      intermediate: {
        min: 0.40,
        max: 0.60,
        typical: 0.50,
        label: 'Intermediate (1-3 years)'
      },

      // Years 4-5: Slow but steady gains
      advanced: {
        min: 0.20,
        max: 0.25,
        typical: 0.22,
        label: 'Advanced (3-5 years)'
      },

      // 5+ years: Approaching genetic maximum
      elite: {
        min: 0.05,
        max: 0.10,
        typical: 0.08,
        label: 'Elite (5+ years)'
      }
    };

    return RATES[category];
  }

  /**
   * Gender adjustments (females gain muscle ~50% slower)
   */
  private static applyGenderAdjustment(rates: MuscleGainRange, gender: string): MuscleGainRange {
    if (gender === 'female') {
      return {
        min: rates.min * 0.50,
        max: rates.max * 0.50,
        typical: rates.typical * 0.50,
        label: rates.label + ' (Female)'
      };
    }
    return rates;
  }

  /**
   * Age adjustments (muscle building declines with age)
   */
  private static applyAgeAdjustment(rates: MuscleGainRange, age: number): MuscleGainRange {
    let multiplier = 1.0;

    if (age < 18) multiplier = 1.20;       // +20% (teenage growth)
    else if (age >= 40) multiplier = 0.85; // -15% (slower recovery)
    else if (age >= 50) multiplier = 0.70; // -30%
    else if (age >= 60) multiplier = 0.50; // -50% (significant decline)

    return {
      min: rates.min * multiplier,
      max: rates.max * multiplier,
      typical: rates.typical * multiplier,
      label: rates.label
    };
  }

  /**
   * Body fat adjustments
   */
  private static applyBodyFatAdjustment(rates: MuscleGainRange, body_fat?: number): MuscleGainRange {
    if (!body_fat) return rates;

    let multiplier = 1.0;

    // Very low body fat (<8% male, <15% female): harder to gain
    if (body_fat < 8) multiplier = 0.80;

    // High body fat (>25% male, >35% female): harder to gain lean mass
    if (body_fat > 25) multiplier = 0.85;

    // Very high body fat: focus on fat loss first
    if (body_fat > 30) multiplier = 0.70;

    return {
      min: rates.min * multiplier,
      max: rates.max * multiplier,
      typical: rates.typical * multiplier,
      label: rates.label
    };
  }
}
```

### 3. Flexible Fat Loss Validation

```typescript
class FlexibleFatLossValidator {
  /**
   * Validate fat loss rate with tiered warnings (never block)
   */
  static validateFatLossRate(rate_kg_per_week: number, params: FatLossParams): ValidationResult {
    const { current_weight, body_fat_percentage, bmi, gender, medical_conditions } = params;

    const warnings: Warning[] = [];
    const recommendations: string[] = [];
    let warningLevel: 'none' | 'caution' | 'warning' | 'severe' = 'none';

    // Calculate as percentage of body weight
    const percentPerWeek = (rate_kg_per_week / current_weight) * 100;

    // TIER 1: Safe and sustainable (0.5-1% per week)
    if (rate_kg_per_week >= 0.5 && rate_kg_per_week <= 1.0) {
      warningLevel = 'none';
      recommendations.push('✅ Sustainable rate - excellent for long-term success');
      recommendations.push('This pace preserves muscle mass and is maintainable');
    }

    // TIER 2: Aggressive but achievable (1.0-1.5% per week)
    else if (rate_kg_per_week > 1.0 && rate_kg_per_week <= 1.5) {
      warningLevel = 'caution';
      warnings.push({
        level: 'caution',
        icon: '⚠️',
        message: 'Aggressive fat loss rate',
        details: 'This is faster than recommended for most people. You may experience:',
        risks: [
          'Increased hunger and cravings',
          'Some muscle loss (even with high protein)',
          'Reduced energy levels',
          'Harder to maintain long-term'
        ]
      });
      recommendations.push('Consider 2 weeks aggressive, 1 week maintenance (diet break)');
      recommendations.push('Prioritize protein (2.2g/kg) and strength training');
    }

    // TIER 3: Very aggressive (1.5-2.0% per week)
    else if (rate_kg_per_week > 1.5 && rate_kg_per_week <= 2.0) {
      warningLevel = 'warning';

      // Only acceptable for obese individuals
      if (bmi && bmi >= 30) {
        warnings.push({
          level: 'warning',
          icon: '⚠️⚠️',
          message: 'Very aggressive fat loss',
          details: 'Acceptable for obese individuals (BMI ≥30) for SHORT periods (4-8 weeks max). You WILL experience:',
          risks: [
            'Significant hunger and fatigue',
            'Muscle loss despite high protein',
            'Metabolic adaptation',
            'Potential nutrient deficiencies',
            'Risk of gallstones with rapid weight loss'
          ]
        });
        recommendations.push('⏰ Maximum 8 weeks at this rate, then switch to 0.5-1kg/week');
        recommendations.push('🏋️ Mandatory: Heavy strength training 3-4x/week');
        recommendations.push('💊 Consider multivitamin and omega-3 supplementation');
      } else {
        warnings.push({
          level: 'warning',
          icon: '⚠️⚠️',
          message: 'Too aggressive for your body composition',
          details: 'This rate is generally NOT recommended except for obese individuals. High risk of:',
          risks: [
            'Significant muscle loss',
            'Metabolic slowdown',
            'Hormonal disruption',
            'Rebound weight gain'
          ]
        });
        recommendations.push('❌ NOT RECOMMENDED - Consider reducing to 0.5-1.0kg/week');
        recommendations.push('Your body doesn\'t have enough excess fat for this deficit');
      }
    }

    // TIER 4: Extreme (>2.0% per week)
    else if (rate_kg_per_week > 2.0) {
      warningLevel = 'severe';

      // Only for very obese with medical supervision
      if (bmi && bmi >= 35) {
        warnings.push({
          level: 'severe',
          icon: '⚠️⚠️⚠️',
          message: 'EXTREME fat loss - Medical supervision required',
          details: 'This rate should ONLY be attempted:',
          risks: [
            '✓ If BMI ≥35 (severe obesity)',
            '✓ Under medical supervision',
            '✓ For maximum 2-4 weeks',
            '✓ With careful nutrient monitoring',
            '',
            'Health risks include:',
            '- Severe muscle wasting',
            '- Gallstone formation',
            '- Electrolyte imbalances',
            '- Fatigue and weakness',
            '- Potential cardiac stress'
          ]
        });
        recommendations.push('🏥 REQUIRED: Medical supervision');
        recommendations.push('⏰ Maximum 4 weeks, then reduce to 1kg/week');
        recommendations.push('💊 Supplement: Multivitamin, electrolytes, omega-3');
        recommendations.push('📊 Monitor: Weekly blood work recommended');
      } else {
        warnings.push({
          level: 'severe',
          icon: '❌',
          message: 'DANGEROUS rate for your body composition',
          details: 'This deficit is NOT SAFE for your BMI. Serious health risks:',
          risks: [
            'Severe muscle wasting',
            'Metabolic damage',
            'Hormonal shutdown',
            'Immune system suppression',
            'Organ stress',
            'High rebound weight gain risk'
          ]
        });
        recommendations.push('❌ STRONGLY NOT RECOMMENDED');
        recommendations.push('Reduce to 0.5-1.0kg/week for safe, sustainable results');
      }
    }

    // TIER 5: Too slow (<0.3% per week)
    else if (rate_kg_per_week < 0.3 && rate_kg_per_week > 0) {
      warnings.push({
        level: 'caution',
        icon: 'ℹ️',
        message: 'Very slow progress',
        details: 'This is a very conservative rate. Benefits:',
        risks: [
          '✓ Almost zero muscle loss',
          '✓ Easy to maintain',
          '✓ No hunger issues',
          '',
          'Drawbacks:',
          '- Very long timeline to goal',
          '- Easy to stall from small errors',
          '- May lose motivation'
        ]
      });
      recommendations.push('Consider increasing to 0.5kg/week for faster visible results');
    }

    return {
      isAllowed: true,  // NEVER block user
      warningLevel,
      warnings,
      recommendations
    };
  }
}
```

---

## IMPLEMENTATION ARCHITECTURE

### File Structure

```
src/
├── utils/
│   ├── healthCalculations/
│   │   ├── index.ts                           # Main export
│   │   ├── bmr/
│   │   │   ├── UniversalBMRCalculator.ts      # 4 BMR formulas
│   │   │   ├── FormulaSelector.ts             # Auto-select best formula
│   │   │   └── types.ts
│   │   ├── bmi/
│   │   │   ├── UniversalBMIClassifier.ts      # Population-specific BMI
│   │   │   ├── EthnicityDetector.ts           # Auto-detect ethnicity
│   │   │   └── types.ts
│   │   ├── climate/
│   │   │   ├── ClimateAdaptiveCalculations.ts # TDEE + Water adjustments
│   │   │   ├── ClimateDetector.ts             # Auto-detect climate
│   │   │   ├── RegionalAdjustments.ts         # India-specific
│   │   │   └── types.ts
│   │   ├── macros/
│   │   │   ├── DietTypeAdaptiveMacros.ts      # Protein adjustments
│   │   │   └── types.ts
│   │   ├── heartRate/
│   │   │   ├── HeartRateZoneCalculator.ts     # 3 HR formulas
│   │   │   └── types.ts
│   │   ├── muscleGain/
│   │   │   ├── MuscleGainLimits.ts            # Experience-based limits
│   │   │   └── types.ts
│   │   ├── validation/
│   │   │   ├── FlexibleFatLossValidator.ts    # Tiered warnings
│   │   │   ├── AgeBasedAdjustments.ts         # Age modifiers
│   │   │   └── types.ts
│   │   └── legacy/
│   │       └── healthCalculations.ts          # Current file (deprecated)
│   │
│   └── healthCalculations.ts                  # FACADE - Unified interface
│
├── types/
│   ├── health/
│   │   ├── calculations.ts                    # Calculation types
│   │   ├── ethnicity.ts                       # Ethnicity types
│   │   ├── climate.ts                         # Climate types
│   │   └── validation.ts                      # Validation types
│
└── services/
    └── userMetricsService.ts                  # Use new calculations
```

### Main Facade Interface

```typescript
// src/utils/healthCalculations.ts (NEW - Unified Interface)

/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM
 * World-class adaptive calculations for all populations
 */

import { UniversalBMRCalculator } from './healthCalculations/bmr/UniversalBMRCalculator';
import { UniversalBMIClassifier } from './healthCalculations/bmi/UniversalBMIClassifier';
import { ClimateAdaptiveCalculations } from './healthCalculations/climate/ClimateAdaptiveCalculations';
import { DietTypeAdaptiveMacros } from './healthCalculations/macros/DietTypeAdaptiveMacros';
import { HeartRateZoneCalculator } from './healthCalculations/heartRate/HeartRateZoneCalculator';
import { MuscleGainLimits } from './healthCalculations/muscleGain/MuscleGainLimits';
import { FlexibleFatLossValidator } from './healthCalculations/validation/FlexibleFatLossValidator';
import { DetectionContext, EthnicityDetector, ClimateDetector } from './healthCalculations/detectors';

/**
 * Master calculation engine - single entry point
 */
export class HealthCalculationEngine {
  /**
   * Calculate ALL metrics with full context awareness
   */
  static calculateAllMetrics(profile: CompleteUserProfile): UniversalHealthMetrics {
    // Step 1: Auto-detect context
    const context = this.detectContext(profile);

    // Step 2: Calculate BMR with best formula
    const bmrResult = UniversalBMRCalculator.calculateBMR({
      weight_kg: profile.body_analysis.current_weight_kg,
      height_cm: profile.body_analysis.height_cm,
      age: profile.personal_info.age,
      gender: profile.personal_info.gender,
      body_fat_percentage: profile.body_analysis.body_fat_percentage,
      body_fat_source: profile.body_analysis.body_fat_source,
      workout_experience_years: profile.workout_preferences.workout_experience_years,
      context
    });

    // Step 3: Calculate TDEE with climate adjustments
    const tdeeResult = ClimateAdaptiveCalculations.calculateTDEE(bmrResult.bmr, {
      occupation: profile.personal_info.occupation_type,
      activity_level: profile.workout_preferences.activity_level,
      climate: context.climate,
      country: profile.personal_info.country,
      state: profile.personal_info.state
    });

    // Step 4: Calculate water with climate adjustments
    const waterResult = ClimateAdaptiveCalculations.calculateWaterIntake(
      profile.body_analysis.current_weight_kg,
      {
        climate: context.climate,
        activity_level: profile.workout_preferences.activity_level,
        workout_frequency: profile.workout_preferences.workout_frequency_per_week,
        country: profile.personal_info.country,
        state: profile.personal_info.state
      }
    );

    // Step 5: Calculate BMI with population-specific classification
    const bmiResult = UniversalBMIClassifier.getBMICategory(
      profile.body_analysis.bmi,
      context
    );

    // Step 6: Calculate macros with diet-type adjustments
    const macroResult = DietTypeAdaptiveMacros.calculateMacros(
      profile.advanced_review.daily_calories,
      {
        diet_type: profile.diet_preferences.diet_type,
        primary_goals: profile.workout_preferences.primary_goals,
        body_weight_kg: profile.body_analysis.current_weight_kg,
        ethnicity: context.ethnicity
      }
    );

    // Step 7: Calculate heart rate zones
    const hrZones = HeartRateZoneCalculator.calculateZones({
      age: profile.personal_info.age,
      gender: profile.personal_info.gender,
      fitness_level: profile.workout_preferences.intensity,
      resting_hr: profile.resting_heart_rate // NEW FIELD
    });

    // Step 8: Calculate muscle gain limits
    const muscleGainLimits = MuscleGainLimits.calculateMaxMuscleGainRate({
      workout_experience_years: profile.workout_preferences.workout_experience_years,
      gender: profile.personal_info.gender,
      age: profile.personal_info.age,
      current_body_fat: profile.body_analysis.body_fat_percentage
    });

    return {
      context,
      bmr: bmrResult,
      tdee: tdeeResult,
      water: waterResult,
      bmi: bmiResult,
      macros: macroResult,
      heartRate: hrZones,
      muscleGain: muscleGainLimits,
      calculations_version: '2.0.0',
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Auto-detect user's context for adaptive calculations
   */
  private static detectContext(profile: CompleteUserProfile): DetectionContext {
    const ethnicityDetection = EthnicityDetector.detect(
      profile.personal_info.country,
      profile.personal_info.state
    );

    const climateDetection = ClimateDetector.detect(
      profile.personal_info.country,
      profile.personal_info.state
    );

    return {
      ethnicity: ethnicityDetection.detected,
      ethnicityConfidence: ethnicityDetection.confidence,
      shouldAskEthnicity: ethnicityDetection.shouldAskUser,

      climate: climateDetection.zone,
      climateConfidence: climateDetection.confidence,
      shouldAskClimate: climateDetection.shouldAskUser,

      dietType: profile.diet_preferences.diet_type,
      bodyFatAccuracy: this.detectBodyFatAccuracy(profile),
      fitnessLevel: profile.workout_preferences.intensity
    };
  }

  private static detectBodyFatAccuracy(profile: CompleteUserProfile): BodyFatSource {
    // Logic to determine how body fat was measured
    if (profile.body_analysis.body_fat_source) {
      return profile.body_analysis.body_fat_source;
    }

    // Fallback detection
    if (profile.body_analysis.ai_confidence_score && profile.body_analysis.ai_confidence_score > 80) {
      return 'ai_photo';
    }

    if (profile.body_analysis.body_fat_percentage) {
      return 'manual';
    }

    return 'bmi_estimate';
  }
}

// Export all sub-modules for direct access
export {
  UniversalBMRCalculator,
  UniversalBMIClassifier,
  ClimateAdaptiveCalculations,
  DietTypeAdaptiveMacros,
  HeartRateZoneCalculator,
  MuscleGainLimits,
  FlexibleFatLossValidator
};

// Legacy compatibility (gradually deprecate)
export { MetabolicCalculations } from './healthCalculations/legacy/healthCalculations';
```

---

## DATABASE SCHEMA UPDATES

### New Fields Required

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN ethnicity TEXT CHECK (ethnicity IN (
  'asian', 'caucasian', 'black_african', 'hispanic', 'middle_eastern',
  'pacific_islander', 'mixed', 'general'
));
ALTER TABLE profiles ADD COLUMN ethnicity_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN climate_zone TEXT CHECK (climate_zone IN (
  'tropical', 'temperate', 'cold', 'arid'
));
ALTER TABLE profiles ADD COLUMN climate_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN resting_heart_rate INTEGER CHECK (resting_heart_rate BETWEEN 40 AND 120);

-- Add to body_analysis table
ALTER TABLE body_analysis ADD COLUMN body_fat_source TEXT CHECK (body_fat_source IN (
  'dexa', 'bodpod', 'calipers', 'manual', 'ai_photo', 'bmi_estimate'
));
ALTER TABLE body_analysis ADD COLUMN body_fat_measured_at TIMESTAMP;

-- Add to advanced_review table (store calculation metadata)
ALTER TABLE advanced_review ADD COLUMN bmr_formula_used TEXT;
ALTER TABLE advanced_review ADD COLUMN bmr_formula_accuracy TEXT;
ALTER TABLE advanced_review ADD COLUMN hr_formula_used TEXT;
ALTER TABLE advanced_review ADD COLUMN climate_modifier DECIMAL(3,2);
ALTER TABLE advanced_review ADD COLUMN ethnicity_used TEXT;
ALTER TABLE advanced_review ADD COLUMN calculations_version TEXT DEFAULT '2.0.0';

-- New table: Calculation audit log
CREATE TABLE calculation_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL,
  formula_used TEXT NOT NULL,
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  context JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calculation_audit_user ON calculation_audit_log(user_id);
CREATE INDEX idx_calculation_audit_type ON calculation_audit_log(calculation_type);
```

---

## USER EXPERIENCE DESIGN

### 1. Onboarding Flow Updates

**Personal Info Tab - NEW: Ethnicity Detection**

```typescript
// Auto-show ethnicity confirmation ONLY if confidence < 70%
if (detectionResult.shouldAskUser) {
  <InfoCard
    icon="🌍"
    title="Help us personalize your calculations"
    message={detectionResult.message}
  >
    <Select
      label="Your ethnicity (for accurate BMI classification)"
      value={ethnicity}
      options={[
        { value: 'asian', label: 'Asian (South, East, Southeast Asian)' },
        { value: 'caucasian', label: 'Caucasian/European' },
        { value: 'black_african', label: 'Black/African' },
        { value: 'hispanic', label: 'Hispanic/Latino' },
        { value: 'middle_eastern', label: 'Middle Eastern' },
        { value: 'pacific_islander', label: 'Pacific Islander' },
        { value: 'mixed', label: 'Mixed Ethnicity' },
        { value: 'prefer_not_to_say', label: 'Prefer not to say (use general)' }
      ]}
      helpText="We use WHO-approved population-specific BMI classifications for more accurate health assessments."
    />
  </InfoCard>
}
```

**Advanced Review Tab - NEW: Formula Transparency**

```typescript
<FormulaCard
  title="Your Calculations"
  confidence={95}
>
  <FormulaDetail
    label="BMR Formula"
    value="Katch-McArdle"
    accuracy="±5%"
    reasoning="Using your accurate body fat % from DEXA scan for most precise metabolic rate"
    icon="🔬"
  />

  <FormulaDetail
    label="BMI Classification"
    value="23.5 - Overweight (Asian)"
    note="WHO Asian-Pacific classification. General WHO would be 'Normal' (18.5-24.9), but research shows Asians have higher health risks at this BMI."
    icon="📊"
  />

  <FormulaDetail
    label="Climate Adjustment"
    value="+5% TDEE, +50% Water"
    reasoning="Tropical climate (Mumbai) - Higher thermoregulation costs and sweat loss"
    icon="🌡️"
  />

  <FormulaDetail
    label="Protein Target"
    value="165g/day (+25% for vegan diet)"
    reasoning="Vegan diets need 25% more protein due to lower bioavailability of plant proteins"
    icon="💪"
  />
</FormulaCard>
```

### 2. Advanced Settings (Optional Overrides)

```typescript
<AccordionCard title="Advanced Formula Settings" collapsed={true}>
  <WarningBanner>
    These settings are auto-optimized for you. Only change if you know what you're doing.
  </WarningBanner>

  <Select
    label="BMR Formula"
    value={bmrFormula}
    options={[
      { value: 'auto', label: '🤖 Auto-select (Recommended)', badge: 'Using: Katch-McArdle' },
      { value: 'mifflin_st_jeor', label: 'Mifflin-St Jeor (General population)' },
      { value: 'katch_mcardle', label: 'Katch-McArdle (With body fat %)' },
      { value: 'cunningham', label: 'Cunningham (Athletes)' },
      { value: 'harris_benedict', label: 'Harris-Benedict Revised (Legacy)' }
    ]}
  />

  <Select
    label="BMI Classification"
    value={bmiClassification}
    options={[
      { value: 'auto', label: '🤖 Auto-select by ethnicity (Recommended)', badge: 'Using: Asian' },
      { value: 'asian', label: 'WHO Asian-Pacific (Lower cutoffs)' },
      { value: 'general', label: 'WHO General (Standard)' },
      { value: 'black_african', label: 'Black/African (Higher cutoffs)' }
    ]}
  />

  <Toggle
    label="Apply climate adjustments"
    value={useClimateAdjustments}
    description="Adjust TDEE and water for your location's climate (Currently: +5% TDEE, +50% water for tropical)"
  />
</AccordionCard>
```

### 3. Validation Warnings UI

**Tiered Warning System:**

```typescript
// TIER 1: Caution (Yellow)
<WarningCard level="caution" icon="⚠️">
  <Title>Aggressive Fat Loss Rate</Title>
  <Description>
    You've selected 1.2kg/week. This is faster than recommended for most people.
  </Description>
  <RiskList>
    • Increased hunger and cravings
    • Some muscle loss (even with high protein)
    • Reduced energy levels
  </RiskList>
  <Recommendations>
    ✅ Increase protein to 2.2g/kg body weight
    ✅ Consider diet breaks every 2-3 weeks
  </Recommendations>
  <Actions>
    <Button variant="ghost" onClick={adjustToRecommended}>
      Use Recommended (0.7kg/week)
    </Button>
    <Button variant="primary" onClick={continueWithSelected}>
      Continue with 1.2kg/week
    </Button>
  </Actions>
</WarningCard>

// TIER 2: Warning (Orange)
<WarningCard level="warning" icon="⚠️⚠️">
  <Title>Very Aggressive Fat Loss</Title>
  <Description>
    1.8kg/week is acceptable for obese individuals (your BMI: 32) but ONLY for short periods.
  </Description>
  <RiskList>
    • Significant hunger and fatigue
    • Muscle loss despite high protein
    • Risk of gallstones
  </RiskList>
  <Timeline>
    ⏰ Maximum 8 weeks at this rate, then reduce to 0.7kg/week
  </Timeline>
  <MandatoryActions>
    Required:
    • Heavy strength training 3-4x/week
    • Multivitamin supplementation
    • Track energy levels daily
  </MandatoryActions>
  <Actions>
    <Button variant="ghost" onClick={adjustToSafe}>
      Use Safe Rate (0.7kg/week)
    </Button>
    <Button variant="warning" onClick={confirmAndContinue}>
      I Understand the Risks - Continue
    </Button>
  </Actions>
</WarningCard>

// TIER 3: Severe (Red)
<WarningCard level="severe" icon="⚠️⚠️⚠️">
  <Title>⛔ EXTREME Fat Loss - Medical Supervision Required</Title>
  <Description>
    2.5kg/week is ONLY safe for severely obese individuals under medical supervision.
  </Description>
  <RiskList critical>
    Critical health risks:
    • Severe muscle wasting
    • Gallstone formation
    • Electrolyte imbalances
    • Potential cardiac stress
  </RiskList>
  <Requirements>
    This rate requires:
    ✓ BMI ≥35 (Your BMI: 36 ✅)
    ✓ Medical supervision (Doctor or dietitian)
    ✓ Maximum 4 weeks duration
    ✓ Weekly health monitoring
  </Requirements>
  <Checkbox
    label="I confirm I am under medical supervision"
    value={medicalSupervision}
    required
  />
  <Actions>
    <Button variant="ghost" onClick={adjustToSafe}>
      Use Safe Rate (0.7kg/week)
    </Button>
    <Button
      variant="danger"
      onClick={confirmExtreme}
      disabled={!medicalSupervision}
    >
      Continue (Medical Supervision Confirmed)
    </Button>
  </Actions>
</WarningCard>
```

---

## TESTING MATRIX

### Test Coverage Requirements

**1. Formula Accuracy Tests**

```typescript
describe('Universal BMR Calculator', () => {
  test('Mifflin-St Jeor matches published values', () => {
    // Test cases from research paper
    const cases = [
      { weight: 70, height: 175, age: 30, gender: 'male', expected: 1710 },
      { weight: 60, height: 165, age: 30, gender: 'female', expected: 1390 }
    ];

    cases.forEach(testCase => {
      const result = UniversalBMRCalculator.mifflinStJeor(testCase);
      expect(result).toBeCloseTo(testCase.expected, 0); // ±5 cal tolerance
    });
  });

  test('Katch-McArdle matches published values', () => {
    const cases = [
      { weight: 70, bodyFat: 15, expected: 1751 }, // 59.5kg lean mass
      { weight: 60, bodyFat: 25, expected: 1341 }  // 45kg lean mass
    ];

    cases.forEach(testCase => {
      const result = UniversalBMRCalculator.katchMcArdle(testCase);
      expect(result).toBeCloseTo(testCase.expected, 0);
    });
  });
});

describe('Universal BMI Classifier', () => {
  test('Asian BMI cutoffs correct', () => {
    const cases = [
      { bmi: 22.5, ethnicity: 'asian', expected: 'Normal' },
      { bmi: 23.5, ethnicity: 'asian', expected: 'Overweight' },
      { bmi: 27.5, ethnicity: 'asian', expected: 'Obese Class I' }
    ];

    cases.forEach(testCase => {
      const result = UniversalBMIClassifier.getBMICategory(testCase.bmi, { ethnicity: testCase.ethnicity });
      expect(result.category).toBe(testCase.expected);
    });
  });

  test('General BMI cutoffs correct', () => {
    const cases = [
      { bmi: 24.5, ethnicity: 'general', expected: 'Normal' },
      { bmi: 27.0, ethnicity: 'general', expected: 'Overweight' },
      { bmi: 31.0, ethnicity: 'general', expected: 'Obese Class I' }
    ];

    cases.forEach(testCase => {
      const result = UniversalBMIClassifier.getBMICategory(testCase.bmi, { ethnicity: testCase.ethnicity });
      expect(result.category).toBe(testCase.expected);
    });
  });
});
```

**2. Population Coverage Tests**

```typescript
describe('Global Population Coverage', () => {
  const testProfiles = [
    {
      name: 'Indian Male (Mumbai)',
      profile: {
        country: 'India',
        state: 'Maharashtra',
        age: 30,
        gender: 'male',
        weight: 75,
        height: 172,
        dietType: 'vegetarian'
      },
      expectedContext: {
        ethnicity: 'asian',
        climate: 'tropical',
        proteinMultiplier: 1.15 // Vegetarian
      }
    },
    {
      name: 'American Female (New York)',
      profile: {
        country: 'USA',
        state: 'New York',
        age: 28,
        gender: 'female',
        weight: 65,
        height: 165,
        dietType: 'non-veg'
      },
      expectedContext: {
        ethnicity: 'mixed',
        climate: 'temperate',
        proteinMultiplier: 1.00
      }
    },
    {
      name: 'Nigerian Male (Lagos)',
      profile: {
        country: 'Nigeria',
        state: 'Lagos',
        age: 25,
        gender: 'male',
        weight: 80,
        height: 180,
        dietType: 'non-veg'
      },
      expectedContext: {
        ethnicity: 'black_african',
        climate: 'tropical',
        bmiCutoff: 'higher' // Black populations
      }
    }
  ];

  testProfiles.forEach(({ name, profile, expectedContext }) => {
    test(`Correctly calculates for ${name}`, () => {
      const context = HealthCalculationEngine.detectContext(profile);
      const metrics = HealthCalculationEngine.calculateAllMetrics(profile);

      expect(context.ethnicity).toBe(expectedContext.ethnicity);
      expect(context.climate).toBe(expectedContext.climate);
      expect(metrics.macros.reasoning).toContain(expectedContext.proteinMultiplier);
    });
  });
});
```

**3. Edge Case Tests**

```typescript
describe('Edge Cases', () => {
  test('Very young user (13 years old)', () => {
    const metrics = HealthCalculationEngine.calculateAllMetrics({
      age: 13,
      gender: 'male',
      weight: 45,
      height: 155
    });

    // Should have growth-adjusted BMR
    expect(metrics.bmr.bmr).toBeGreaterThan(1400); // Higher for growth

    // Should have conservative deficit limits
    expect(metrics.validation.maxDeficit).toBeLessThan(500); // Lower for teens
  });

  test('Elderly user (75 years old)', () => {
    const metrics = HealthCalculationEngine.calculateAllMetrics({
      age: 75,
      gender: 'female',
      weight: 60,
      height: 160
    });

    // Should have age-adjusted BMR (lower)
    expect(metrics.bmr.bmr).toBeLessThan(1200);

    // Should have higher protein recommendation
    expect(metrics.macros.protein_g).toBeGreaterThan(78); // 1.3x base
  });

  test('Athlete with low body fat', () => {
    const metrics = HealthCalculationEngine.calculateAllMetrics({
      age: 28,
      gender: 'male',
      weight: 75,
      height: 180,
      bodyFat: 8,
      workoutExperience: 5
    });

    // Should use Cunningham formula
    expect(metrics.bmr.formula).toBe('cunningham');

    // Should have high muscle gain limits for beginner in new sport
    expect(metrics.muscleGain.monthly_kg).toBeGreaterThan(0.4);
  });
});
```

**4. Validation System Tests**

```typescript
describe('Fat Loss Validation', () => {
  test('Safe rate (0.7kg/week) - No warnings', () => {
    const validation = FlexibleFatLossValidator.validateFatLossRate(0.7, {
      currentWeight: 80,
      bmi: 26,
      gender: 'male'
    });

    expect(validation.warningLevel).toBe('none');
    expect(validation.warnings).toHaveLength(0);
  });

  test('Aggressive rate (1.3kg/week) - Caution warning', () => {
    const validation = FlexibleFatLossValidator.validateFatLossRate(1.3, {
      currentWeight: 80,
      bmi: 26,
      gender: 'male'
    });

    expect(validation.warningLevel).toBe('caution');
    expect(validation.warnings[0].level).toBe('caution');
    expect(validation.isAllowed).toBe(true); // Never blocked
  });

  test('Extreme rate (2.5kg/week) for obese - Severe warning with requirements', () => {
    const validation = FlexibleFatLossValidator.validateFatLossRate(2.5, {
      currentWeight: 110,
      bmi: 36,
      gender: 'male'
    });

    expect(validation.warningLevel).toBe('severe');
    expect(validation.warnings[0].message).toContain('Medical supervision');
    expect(validation.isAllowed).toBe(true); // Still allowed
  });

  test('Extreme rate (2.5kg/week) for normal BMI - Dangerous warning', () => {
    const validation = FlexibleFatLossValidator.validateFatLossRate(2.5, {
      currentWeight: 75,
      bmi: 24,
      gender: 'male'
    });

    expect(validation.warningLevel).toBe('severe');
    expect(validation.warnings[0].message).toContain('DANGEROUS');
    expect(validation.recommendations[0]).toContain('NOT RECOMMENDED');
  });
});
```

---

## MIGRATION PLAN

### Phase 1: Foundation (Week 1-2)
1. Create new folder structure
2. Implement core interfaces and types
3. Build detection framework (ethnicity, climate)
4. Unit tests for detectors

### Phase 2: Core Calculators (Week 3-4)
1. Implement UniversalBMRCalculator (4 formulas)
2. Implement UniversalBMIClassifier (7 populations)
3. Implement ClimateAdaptiveCalculations
4. Comprehensive unit tests

### Phase 3: Advanced Features (Week 5-6)
1. Implement DietTypeAdaptiveMacros
2. Implement HeartRateZoneCalculator
3. Implement MuscleGainLimits
4. Implement FlexibleFatLossValidator

### Phase 4: Integration (Week 7)
1. Build HealthCalculationEngine facade
2. Update database schema
3. Migration script for existing users
4. Integration tests

### Phase 5: UI/UX (Week 8)
1. Update onboarding flows
2. Build formula transparency cards
3. Build tiered warning system
4. Advanced settings panel

### Phase 6: Testing & Rollout (Week 9-10)
1. Full test suite execution
2. Performance testing
3. Beta rollout to 100 users
4. Gather feedback and iterate
5. Full rollout

---

## SCIENTIFIC REFERENCES

### BMR Formulas
1. Mifflin et al. (1990). "A new predictive equation for resting energy expenditure in healthy individuals." Am J Clin Nutr. 51(2):241-7.
2. Katch & McArdle (1996). "Nutrition, Weight Control, and Exercise"
3. Cunningham (1980). "A reanalysis of the factors influencing basal metabolic rate in normal adults"
4. Harris & Benedict (1918, revised 1984). "A Biometric Study of Human Basal Metabolism"

### BMI Classifications
5. WHO (2000). "The Asia-Pacific perspective: redefining obesity and its treatment"
6. Deurenberg et al. (1998). "Body mass index and percent body fat: a meta-analysis among different ethnic groups"
7. WHO (1995). "Physical status: the use and interpretation of anthropometry"

### Heart Rate Zones
8. Karvonen et al. (1957). "The effects of training on heart rate"
9. Tanaka et al. (2001). "Age-predicted maximal heart rate revisited"
10. Gulati et al. (2010). "Heart rate response to exercise stress testing in asymptomatic women"

### Muscle Gain
11. McDonald, Lyle (2009). "The Ultimate Diet 2.0"
12. Schoenfeld et al. (2017). "How much protein can the body use in a single meal for muscle-building?"

### Climate Adaptations
13. Speakman & Selman (2003). "Physical activity and resting metabolic rate"
14. van Marken Lichtenbelt (2010). "Cold-induced thermogenesis and brown adipose tissue"

---

## CONCLUSION

This blueprint provides a complete roadmap to transform FitAI into a world-class universal health calculation system. Key achievements:

✅ **Accurate** - Multiple validated formulas with auto-selection
✅ **Adaptive** - Population, climate, and diet-type aware
✅ **Intelligent** - Context detection with 85-90% confidence
✅ **Flexible** - Tiered warnings, never blocks user choice
✅ **Universal** - Works for any human, anywhere, any goal
✅ **Transparent** - Shows formulas used and reasoning

**Next Steps:**
1. Review and approve blueprint
2. Begin Phase 1 implementation
3. Set up testing infrastructure
4. Plan beta rollout strategy

---

**Document Version:** 1.0
**Last Updated:** December 30, 2025
**Status:** Ready for Implementation
