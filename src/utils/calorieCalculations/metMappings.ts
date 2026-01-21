/**
 * MET (Metabolic Equivalent of Task) Mappings
 * 
 * Based on the Compendium of Physical Activities (Ainsworth et al.)
 * https://sites.google.com/site/compendiumofphysicalactivities/
 * 
 * MET represents the energy cost of physical activities.
 * 1 MET = 1 kcal/kg/hour (resting metabolic rate)
 * 
 * Formula: Calories = MET × Weight(kg) × Duration(hours)
 */

// =============================================================================
// BODY PART BASE MET VALUES
// =============================================================================
// These are baseline MET values for exercises targeting specific body parts.
// Values derived from resistance training studies and the Compendium.

export const BODY_PART_MET: Record<string, number> = {
  // High-energy compound movements
  'upper legs': 6.0,    // Squats, lunges, leg press - large muscle groups
  'cardio': 8.0,        // Running, cycling, HIIT - sustained effort
  
  // Upper body compound movements
  'back': 5.0,          // Rows, pull-ups - large back muscles
  'chest': 5.0,         // Bench press, push-ups - pectorals
  
  // Shoulder and arm isolation
  'shoulders': 4.5,     // Overhead press, lateral raises
  'upper arms': 4.0,    // Biceps curls, triceps extensions
  
  // Core and lower body isolation
  'waist': 4.0,         // Planks, crunches, core work
  'lower legs': 5.0,    // Calf raises, leg curls
  'lower arms': 3.5,    // Wrist curls, grip work
  
  // Low-intensity
  'neck': 2.5,          // Neck exercises - small muscles
};

// Default MET for unknown body parts
export const DEFAULT_MET = 4.0;

// =============================================================================
// EQUIPMENT INTENSITY MULTIPLIERS
// =============================================================================
// Equipment affects exercise intensity and calorie burn.
// Free weights typically burn more than machines due to stabilization.

export const EQUIPMENT_MULTIPLIER: Record<string, number> = {
  // Free weights - require stabilization, burn more
  'barbell': 1.20,
  'kettlebell': 1.15,
  'dumbbell': 1.10,
  'ez barbell': 1.15,
  'olympic barbell': 1.25,
  'trap bar': 1.18,
  
  // Bodyweight - varies by exercise
  'body weight': 1.00,
  'weighted': 1.15,      // Weighted bodyweight exercises
  
  // Cables and bands - constant tension
  'cable': 1.00,
  'resistance band': 0.90,
  'band': 0.90,
  
  // Machines - guided movement, less stabilization
  'leverage machine': 0.95,
  'smith machine': 0.92,
  'assisted': 0.85,
  'sled machine': 1.05,
  
  // Cardio equipment
  'elliptical machine': 1.10,
  'stationary bike': 1.00,
  'skierg machine': 1.15,
  'stepmill machine': 1.20,
  
  // Specialty equipment
  'medicine ball': 1.10,
  'bosu ball': 1.05,
  'stability ball': 1.05,
  'roller': 0.80,
  'rope': 1.10,
  'wheel roller': 1.15,
};

// Default multiplier for unknown equipment
export const DEFAULT_EQUIPMENT_MULTIPLIER = 1.0;

// =============================================================================
// HIGH-INTENSITY KEYWORD BOOSTS
// =============================================================================
// Certain exercise keywords indicate higher intensity variations.
// These boost the base MET value when found in exercise names.

export const INTENSITY_KEYWORDS: Record<string, number> = {
  // Explosive/plyometric movements
  'jump': 1.50,
  'jumping': 1.50,
  'burpee': 1.60,
  'plyometric': 1.45,
  'plyo': 1.40,
  'explosive': 1.35,
  'power': 1.25,
  
  // High-intensity cardio
  'sprint': 1.50,
  'hiit': 1.50,
  'tabata': 1.55,
  'circuit': 1.30,
  
  // Dynamic movements
  'swing': 1.20,
  'snatch': 1.35,
  'clean': 1.30,
  'thruster': 1.40,
  
  // Advanced variations
  'muscle up': 1.40,
  'handstand': 1.25,
  'pistol': 1.30,
  'one arm': 1.15,
  'single leg': 1.15,
  
  // Isometric/slow tempo (lower intensity)
  'isometric': 0.85,
  'static': 0.80,
  'hold': 0.85,
};

// =============================================================================
// LOW-INTENSITY KEYWORD REDUCTIONS
// =============================================================================
// These keywords indicate lower intensity exercises

export const LOW_INTENSITY_KEYWORDS: Record<string, number> = {
  'stretch': 0.70,
  'stretching': 0.70,
  'foam': 0.60,
  'massage': 0.50,
  'breathing': 0.50,
  'meditation': 0.40,
  'yoga': 0.75,
  'cooldown': 0.65,
  'warmup': 0.70,
};

// =============================================================================
// MET VALUE BOUNDS
// =============================================================================
// Ensure calculated MET values stay within realistic ranges

export const MIN_MET = 1.5;  // Minimum for any exercise (above resting)
export const MAX_MET = 14.0; // Maximum for extreme HIIT/sprinting

// =============================================================================
// EXERCISE TYPE OVERRIDES
// =============================================================================
// Specific exercise types with known MET values from research
// These override calculated values when exercise name matches

export const EXERCISE_TYPE_MET_OVERRIDES: Record<string, number> = {
  // Cardio (from Compendium)
  'running': 9.8,
  'jogging': 7.0,
  'walking': 3.5,
  'cycling': 7.5,
  'swimming': 8.0,
  'rowing': 7.0,
  'jump rope': 12.3,
  'jumping rope': 12.3,
  'mountain climber': 8.0,
  'burpees': 10.0,
  
  // Strength (from research)
  'deadlift': 6.0,
  'squat': 6.0,
  'bench press': 5.0,
  'pull up': 5.5,
  'push up': 4.0,
  'plank': 3.5,
  'lunge': 5.5,
};

/**
 * Get the base MET value for a body part
 */
export function getBodyPartMET(bodyPart: string): number {
  const normalized = bodyPart.toLowerCase().trim();
  return BODY_PART_MET[normalized] ?? DEFAULT_MET;
}

/**
 * Get the equipment multiplier
 */
export function getEquipmentMultiplier(equipment: string): number {
  const normalized = equipment.toLowerCase().trim();
  
  // Check for exact match first
  if (EQUIPMENT_MULTIPLIER[normalized]) {
    return EQUIPMENT_MULTIPLIER[normalized];
  }
  
  // Check for partial matches (e.g., "leverage machine" in "lever lat pulldown machine")
  for (const [key, value] of Object.entries(EQUIPMENT_MULTIPLIER)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return DEFAULT_EQUIPMENT_MULTIPLIER;
}

/**
 * Calculate intensity modifier from exercise name keywords
 */
export function getIntensityModifier(exerciseName: string): number {
  const normalized = exerciseName.toLowerCase();
  let modifier = 1.0;
  
  // Check for high-intensity keywords (apply highest match only)
  let highestBoost = 1.0;
  for (const [keyword, boost] of Object.entries(INTENSITY_KEYWORDS)) {
    if (normalized.includes(keyword) && boost > highestBoost) {
      highestBoost = boost;
    }
  }
  modifier *= highestBoost;
  
  // Check for low-intensity keywords (apply lowest match only)
  let lowestReduction = 1.0;
  for (const [keyword, reduction] of Object.entries(LOW_INTENSITY_KEYWORDS)) {
    if (normalized.includes(keyword) && reduction < lowestReduction) {
      lowestReduction = reduction;
    }
  }
  modifier *= lowestReduction;
  
  return modifier;
}

/**
 * Check if exercise name matches a known override
 */
export function getExerciseTypeOverride(exerciseName: string): number | null {
  const normalized = exerciseName.toLowerCase();
  
  for (const [exerciseType, met] of Object.entries(EXERCISE_TYPE_MET_OVERRIDES)) {
    if (normalized.includes(exerciseType)) {
      return met;
    }
  }
  
  return null;
}

