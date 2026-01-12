/**
 * FitAI Workers - Safety Filter System
 *
 * Comprehensive safety filtering for exercises based on:
 * - Injuries and physical limitations
 * - Medical conditions
 * - Pregnancy status and trimester
 * - Medications
 * - Breastfeeding status
 * - Age-related modifications
 *
 * PRIORITY: Safety > Performance > User Preferences
 * Better to be overly conservative than unsafe.
 */

import type { Exercise } from './exerciseDatabase';
import exerciseMetadataRaw from '../data/exerciseMetadata.json';

// ============================================================================
// TYPES
// ============================================================================

export interface UserSafetyProfile {
  // Injuries and physical limitations
  injuries?: string[];
  physical_limitations?: string[];

  // Medical conditions
  medical_conditions?: string[];
  medications?: string[];

  // Pregnancy and breastfeeding
  pregnancy_status?: boolean;
  pregnancy_trimester?: number | string;
  breastfeeding_status?: boolean;

  // Age
  age: number;

  // Stress and recovery
  stress_level?: 'low' | 'moderate' | 'high';
}

export interface ExerciseWithMetadata extends Exercise {
  // Safety metadata (will be tagged manually for 200-300 exercises)
  metadata?: {
    isSupine?: boolean; // Lying flat on back
    isHighImpact?: boolean; // Jumping, plyometrics
    hasFallRisk?: boolean; // Balance required, unstable surface
    requiresValsalva?: boolean; // Heavy lifting, breath holding
    isProne?: boolean; // Face down position
    isInverted?: boolean; // Upside down
    impactLevel?: 'low' | 'moderate' | 'high';
    balanceRequired?: 'none' | 'low' | 'moderate' | 'high';
  };
}

export interface SafetyFilterResult {
  safeExercises: ExerciseWithMetadata[];
  excludedExercises: Array<{
    exercise: Exercise;
    reasons: string[];
  }>;
  warnings: string[];
  requiresMedicalClearance: boolean;
}

// ============================================================================
// INJURY EXCLUSION RULES
// ============================================================================

interface InjuryRule {
  keywords: string[]; // Keywords to match in injury string
  excludeBodyParts: string[]; // Body parts to avoid
  excludeExerciseKeywords: string[]; // Exercise name keywords to exclude
  warningMessage: string;
}

const INJURY_EXCLUSION_RULES: Record<string, InjuryRule> = {
  back_pain: {
    keywords: ['back', 'spine', 'spinal', 'lumbar', 'disc'],
    excludeBodyParts: ['waist', 'back', 'lower back'],
    excludeExerciseKeywords: ['deadlift', 'row', 'good morning', 'hyperextension', 'romanian'],
    warningMessage: 'Avoiding exercises with spinal loading due to back injury',
  },

  knee_problems: {
    keywords: ['knee', 'patella', 'acl', 'mcl', 'meniscus'],
    excludeBodyParts: ['upper legs', 'lower legs', 'legs'],
    excludeExerciseKeywords: ['squat', 'lunge', 'leg press', 'jump', 'burpee', 'step up'],
    warningMessage: 'Avoiding knee-loading exercises due to knee injury',
  },

  shoulder_issues: {
    keywords: ['shoulder', 'rotator cuff', 'impingement'],
    excludeBodyParts: ['shoulders', 'upper arms'],
    excludeExerciseKeywords: ['overhead press', 'lateral raise', 'pull up', 'pullup', 'dip', 'shoulder press'],
    warningMessage: 'Avoiding overhead and shoulder-intensive exercises',
  },

  neck_problems: {
    keywords: ['neck', 'cervical'],
    excludeBodyParts: ['neck'],
    excludeExerciseKeywords: ['barbell row', 'neck', 'shrug', 'upright row'],
    warningMessage: 'Avoiding neck-stressing exercises',
  },

  wrist_problems: {
    keywords: ['wrist', 'carpal'],
    excludeBodyParts: ['lower arms'],
    excludeExerciseKeywords: ['barbell curl', 'front squat', 'clean', 'push up', 'pushup', 'plank'],
    warningMessage: 'Avoiding wrist-bearing exercises, preferring supported alternatives',
  },

  ankle_foot: {
    keywords: ['ankle', 'foot', 'achilles', 'plantar'],
    excludeBodyParts: ['lower legs'],
    excludeExerciseKeywords: ['jump', 'run', 'calf', 'hop', 'skip', 'plyometric'],
    warningMessage: 'Avoiding high-impact and ankle-stressing exercises',
  },

  balance_issues: {
    keywords: ['balance', 'vertigo', 'dizzy'],
    excludeBodyParts: [],
    excludeExerciseKeywords: ['single leg', 'pistol', 'balance', 'bosu'],
    warningMessage: 'Avoiding balance-dependent exercises, use wall support',
  },

  hip_groin: {
    keywords: ['hip', 'groin', 'adductor'],
    excludeBodyParts: ['upper legs'],
    excludeExerciseKeywords: ['squat', 'lunge', 'split', 'wide stance', 'sumo'],
    warningMessage: 'Avoiding hip-stressing exercises',
  },

  elbow_issues: {
    keywords: ['elbow', 'tennis elbow', 'golfer'],
    excludeBodyParts: ['upper arms', 'lower arms'],
    excludeExerciseKeywords: ['curl', 'extension', 'close grip'],
    warningMessage: 'Avoiding elbow-intensive exercises',
  },
};

// ============================================================================
// MEDICAL CONDITION RULES
// ============================================================================

interface MedicalConditionRule {
  keywords: string[];
  excludeHighIntensity: boolean;
  excludeExerciseKeywords: string[];
  intensityCap?: string; // RPE limit
  requiresMedicalClearance: boolean;
  warningMessage: string;
}

const MEDICAL_CONDITION_RULES: Record<string, MedicalConditionRule> = {
  pregnancy: {
    keywords: ['pregnant', 'pregnancy'],
    excludeHighIntensity: true,
    excludeExerciseKeywords: [], // Handled separately by trimester
    requiresMedicalClearance: true,
    warningMessage: 'Pregnancy-specific exercise restrictions applied',
  },

  heart_disease: {
    keywords: ['heart', 'cardiac', 'cardiovascular disease', 'heart disease'],
    excludeHighIntensity: true,
    excludeExerciseKeywords: ['hiit', 'sprint', 'max effort'],
    intensityCap: 'RPE 5-6 max',
    requiresMedicalClearance: true,
    warningMessage: 'CRITICAL: Heart disease detected. RPE capped at 5-6. Consult physician before exercise.',
  },

  hypertension: {
    keywords: ['hypertension', 'high blood pressure', 'blood pressure'],
    excludeHighIntensity: true,
    excludeExerciseKeywords: ['max effort', 'deadlift', 'squat'],
    intensityCap: 'RPE 7 max',
    requiresMedicalClearance: false,
    warningMessage: 'Hypertension: Avoid max effort lifts and Valsalva maneuvers. Monitor blood pressure.',
  },

  diabetes: {
    keywords: ['diabetes', 'diabetic', 'blood sugar'],
    excludeHighIntensity: false,
    excludeExerciseKeywords: [],
    requiresMedicalClearance: false,
    warningMessage: 'Diabetes: Monitor blood sugar before/after exercise. Have glucose tablets available.',
  },

  asthma: {
    keywords: ['asthma', 'respiratory'],
    excludeHighIntensity: false,
    excludeExerciseKeywords: [],
    requiresMedicalClearance: false,
    warningMessage: 'Asthma: Ensure inhaler is nearby. Longer warm-up (10+ min) recommended.',
  },

  arthritis: {
    keywords: ['arthritis', 'osteoarthritis', 'rheumatoid'],
    excludeHighIntensity: false,
    excludeExerciseKeywords: ['jump', 'high impact', 'heavy'],
    requiresMedicalClearance: false,
    warningMessage: 'Arthritis: Low-impact exercises only. Longer warm-up recommended.',
  },

  pcos: {
    keywords: ['pcos', 'polycystic ovary'],
    excludeHighIntensity: false,
    excludeExerciseKeywords: [],
    requiresMedicalClearance: false,
    warningMessage: 'PCOS: Resistance training prioritized. Limit cardio to <45min.',
  },

  osteoporosis: {
    keywords: ['osteoporosis', 'bone density'],
    excludeHighIntensity: false,
    excludeExerciseKeywords: ['jump', 'high impact'],
    requiresMedicalClearance: false,
    warningMessage: 'Osteoporosis: Avoid high-impact exercises. Focus on bone-strengthening resistance work.',
  },
};

// ============================================================================
// PREGNANCY TRIMESTER RULES
// ============================================================================

interface PregnancyRule {
  excludeSupine: boolean;
  excludeHighImpact: boolean;
  excludeProne: boolean;
  excludeExerciseKeywords: string[];
  intensityCap: string;
  heartRateCap: number;
  warningMessage: string;
}

const PREGNANCY_TRIMESTER_RULES: Record<number, PregnancyRule> = {
  1: {
    excludeSupine: true, // Reduce supine time
    excludeHighImpact: false, // Can reduce gradually
    excludeProne: false,
    excludeExerciseKeywords: ['contact', 'fall risk'],
    intensityCap: 'RPE 5-7 max',
    heartRateCap: 140,
    warningMessage: 'Trimester 1: Reduce supine positions and high-impact exercises. Focus on pelvic floor.',
  },

  2: {
    excludeSupine: true, // ZERO supine exercises
    excludeHighImpact: true,
    excludeProne: false,
    excludeExerciseKeywords: ['supine', 'lying back', 'bench', 'crunch', 'sit up', 'overhead', 'twist'],
    intensityCap: 'RPE 4-6 max',
    heartRateCap: 130,
    warningMessage: 'Trimester 2: NO supine exercises. Avoid overhead lifts and twisting. Use incline positions (30+ degrees).',
  },

  3: {
    excludeSupine: true,
    excludeHighImpact: true,
    excludeProne: true,
    excludeExerciseKeywords: ['supine', 'prone', 'jump', 'twist', 'balance', 'lying', 'bench'],
    intensityCap: 'RPE 3-5 max',
    heartRateCap: 120,
    warningMessage: 'Trimester 3: GENTLE MOVEMENTS ONLY. Walking, prenatal yoga, pelvic floor work, breathing exercises.',
  },
};

// ============================================================================
// MEDICATION RULES
// ============================================================================

interface MedicationRule {
  keywords: string[];
  modifyHeartRateMonitoring: boolean;
  warningMessage: string;
}

const MEDICATION_RULES: Record<string, MedicationRule> = {
  beta_blockers: {
    keywords: ['beta blocker', 'metoprolol', 'atenolol', 'propranolol'],
    modifyHeartRateMonitoring: true,
    warningMessage: 'Beta-blockers: Use RPE instead of heart rate. Expect lower max HR.',
  },

  blood_thinners: {
    keywords: ['warfarin', 'blood thinner', 'anticoagulant'],
    modifyHeartRateMonitoring: false,
    warningMessage: 'Blood thinners: Avoid high fall-risk exercises and contact sports.',
  },
};

// ============================================================================
// MAIN SAFETY FILTER FUNCTION
// ============================================================================

/**
 * Apply comprehensive safety filtering to exercise list
 * PRIORITY ORDER: Pregnancy > Heart Disease > Injuries > Other Conditions
 */
export function applySafetyFilter(
  exercises: Exercise[],
  userProfile: UserSafetyProfile
): SafetyFilterResult {
  const warnings: string[] = [];
  let requiresMedicalClearance = false;

  // Convert exercises to include metadata (manual tags > inference)
  let safeExercises: ExerciseWithMetadata[] = exercises.map((ex) => ({
    ...ex,
    metadata: getExerciseMetadata(ex),
  }));

  const excludedExercises: Array<{ exercise: Exercise; reasons: string[] }> = [];

  // ============================================================================
  // 1. PREGNANCY FILTERING (HIGHEST PRIORITY)
  // ============================================================================
  if (userProfile.pregnancy_status) {
    requiresMedicalClearance = true;
    const trimester = parseInt(String(userProfile.pregnancy_trimester || 1));
    const pregnancyRule = PREGNANCY_TRIMESTER_RULES[trimester] || PREGNANCY_TRIMESTER_RULES[1];

    warnings.push(pregnancyRule.warningMessage);
    warnings.push('⚠️ PREGNANCY: Consult your healthcare provider before starting any exercise program.');

    // Filter by pregnancy rules
    const beforeCount = safeExercises.length;
    safeExercises = safeExercises.filter((ex) => {
      const reasons: string[] = [];

      // Check supine position
      if (pregnancyRule.excludeSupine && ex.metadata?.isSupine) {
        reasons.push('Supine position not safe during pregnancy');
      }

      // Check high impact
      if (pregnancyRule.excludeHighImpact && ex.metadata?.isHighImpact) {
        reasons.push('High-impact exercises not recommended during pregnancy');
      }

      // Check prone position
      if (pregnancyRule.excludeProne && ex.metadata?.isProne) {
        reasons.push('Prone position (face down) not safe during pregnancy');
      }

      // Check exercise keywords
      const nameLower = ex.name.toLowerCase();
      for (const keyword of pregnancyRule.excludeExerciseKeywords) {
        if (nameLower.includes(keyword)) {
          reasons.push(`Exercise type '${keyword}' not recommended during pregnancy`);
        }
      }

      if (reasons.length > 0) {
        excludedExercises.push({ exercise: ex, reasons });
        return false;
      }

      return true;
    });

    console.log(`[Safety Filter] Pregnancy T${trimester}: ${beforeCount} → ${safeExercises.length} exercises`);
  }

  // ============================================================================
  // 2. MEDICAL CONDITIONS FILTERING
  // ============================================================================
  if (userProfile.medical_conditions && userProfile.medical_conditions.length > 0) {
    for (const condition of userProfile.medical_conditions) {
      const conditionLower = condition.toLowerCase();

      // Check each medical condition rule
      for (const [ruleName, rule] of Object.entries(MEDICAL_CONDITION_RULES)) {
        if (rule.keywords.some((kw) => conditionLower.includes(kw))) {
          warnings.push(rule.warningMessage);

          if (rule.requiresMedicalClearance) {
            requiresMedicalClearance = true;
          }

          // Filter by rule keywords
          if (rule.excludeExerciseKeywords.length > 0) {
            const beforeCount = safeExercises.length;
            safeExercises = safeExercises.filter((ex) => {
              const nameLower = ex.name.toLowerCase();
              const reasons: string[] = [];

              for (const keyword of rule.excludeExerciseKeywords) {
                if (nameLower.includes(keyword)) {
                  reasons.push(`${condition}: Exercise type '${keyword}' not recommended`);
                }
              }

              if (reasons.length > 0) {
                excludedExercises.push({ exercise: ex, reasons });
                return false;
              }

              return true;
            });

            console.log(`[Safety Filter] ${ruleName}: ${beforeCount} → ${safeExercises.length} exercises`);
          }
        }
      }
    }
  }

  // ============================================================================
  // 3. INJURY FILTERING
  // ============================================================================
  const allInjuries = [
    ...(userProfile.injuries || []),
    ...(userProfile.physical_limitations || []),
  ];

  if (allInjuries.length > 0) {
    for (const injury of allInjuries) {
      const injuryLower = injury.toLowerCase();

      // Check each injury rule
      for (const [ruleName, rule] of Object.entries(INJURY_EXCLUSION_RULES)) {
        if (rule.keywords.some((kw) => injuryLower.includes(kw))) {
          warnings.push(rule.warningMessage);

          const beforeCount = safeExercises.length;
          safeExercises = safeExercises.filter((ex) => {
            const reasons: string[] = [];

            // Check body parts
            for (const bodyPart of rule.excludeBodyParts) {
              if (ex.bodyParts.some((bp) => bp.toLowerCase().includes(bodyPart.toLowerCase()))) {
                reasons.push(`${injury}: Targets ${bodyPart} (injured area)`);
              }
            }

            // Check exercise keywords
            const nameLower = ex.name.toLowerCase();
            for (const keyword of rule.excludeExerciseKeywords) {
              if (nameLower.includes(keyword)) {
                reasons.push(`${injury}: Exercise type '${keyword}' not safe`);
              }
            }

            if (reasons.length > 0) {
              excludedExercises.push({ exercise: ex, reasons });
              return false;
            }

            return true;
          });

          console.log(`[Safety Filter] ${injury} (${ruleName}): ${beforeCount} → ${safeExercises.length} exercises`);
        }
      }
    }
  }

  // ============================================================================
  // 4. BREASTFEEDING MODIFICATIONS
  // ============================================================================
  if (userProfile.breastfeeding_status) {
    warnings.push('Breastfeeding: Moderate intensity recommended. Stay well-hydrated. Avoid excessive upper body compression.');
  }

  // ============================================================================
  // 5. AGE-BASED MODIFICATIONS
  // ============================================================================
  if (userProfile.age >= 65) {
    warnings.push('Senior (65+): Focus on balance, fall prevention, and functional movements. Longer warm-ups recommended.');

    // Exclude high-risk balance exercises for seniors
    const beforeCount = safeExercises.length;
    safeExercises = safeExercises.filter((ex) => {
      if (ex.metadata?.balanceRequired === 'high' || ex.metadata?.hasFallRisk) {
        excludedExercises.push({
          exercise: ex,
          reasons: ['High fall risk not recommended for seniors'],
        });
        return false;
      }
      return true;
    });

    if (beforeCount > safeExercises.length) {
      console.log(`[Safety Filter] Senior modifications: ${beforeCount} → ${safeExercises.length} exercises`);
    }
  }

  // ============================================================================
  // 6. MEDICATION WARNINGS
  // ============================================================================
  if (userProfile.medications && userProfile.medications.length > 0) {
    for (const medication of userProfile.medications) {
      const medLower = medication.toLowerCase();

      for (const [ruleName, rule] of Object.entries(MEDICATION_RULES)) {
        if (rule.keywords.some((kw) => medLower.includes(kw))) {
          warnings.push(rule.warningMessage);
        }
      }
    }
  }

  // ============================================================================
  // FINAL RESULT
  // ============================================================================

  return {
    safeExercises,
    excludedExercises,
    warnings,
    requiresMedicalClearance,
  };
}

// ============================================================================
// METADATA LOADING
// ============================================================================

/**
 * Module-level cache for exercise metadata
 */
let cachedMetadata: Record<string, ExerciseWithMetadata['metadata']> | null = null;

/**
 * Load exercise metadata from JSON file
 */
function loadExerciseMetadata(): Record<string, ExerciseWithMetadata['metadata']> {
  if (cachedMetadata) {
    return cachedMetadata;
  }

  try {
    const metadata = exerciseMetadataRaw as any;
    cachedMetadata = metadata.exerciseMetadata || {};

    const taggedCount = cachedMetadata ? Object.keys(cachedMetadata).filter(key => !key.startsWith('_')).length : 0;

    console.log('[Safety Filter] Loaded exercise metadata:', {
      totalTagged: taggedCount,
      version: metadata.metadata?.version,
    });

    return cachedMetadata || {};
  } catch (error) {
    console.error('[Safety Filter] Failed to load exercise metadata:', error);
    cachedMetadata = {};
    return cachedMetadata;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get exercise metadata from manual tags or infer from exercise properties
 * Priority: Manual tags > Inference
 */
function getExerciseMetadata(exercise: Exercise): ExerciseWithMetadata['metadata'] {
  const manualMetadata = loadExerciseMetadata();

  // Check if we have manual metadata for this exercise (by name)
  const exerciseName = exercise.name.toLowerCase().trim();
  if (manualMetadata[exerciseName]) {
    return manualMetadata[exerciseName];
  }

  // Fallback to inference for untagged exercises
  return inferExerciseMetadata(exercise);
}

/**
 * Infer safety metadata from exercise properties
 * This provides conservative defaults for exercises without explicit metadata
 * Used as fallback when manual tags don't exist
 */
function inferExerciseMetadata(exercise: Exercise): ExerciseWithMetadata['metadata'] {
  const nameLower = exercise.name.toLowerCase();

  // Check for supine position
  const isSupine =
    nameLower.includes('lying') ||
    nameLower.includes('bench press') ||
    nameLower.includes('supine') ||
    nameLower.includes('lying back');

  // Check for high impact
  const isHighImpact =
    nameLower.includes('jump') ||
    nameLower.includes('hop') ||
    nameLower.includes('burpee') ||
    nameLower.includes('box') ||
    nameLower.includes('plyometric');

  // Check for fall risk / balance required
  const hasFallRisk =
    nameLower.includes('single leg') ||
    nameLower.includes('pistol') ||
    nameLower.includes('balance') ||
    nameLower.includes('bosu');

  // Check for Valsalva (heavy lifts)
  const requiresValsalva =
    nameLower.includes('deadlift') ||
    nameLower.includes('squat') ||
    (nameLower.includes('press') && exercise.equipments.includes('barbell'));

  // Check for prone position
  const isProne =
    nameLower.includes('prone') ||
    nameLower.includes('lying face down') ||
    nameLower.includes('superman');

  // Check for inverted
  const isInverted =
    nameLower.includes('handstand') ||
    nameLower.includes('invert') ||
    nameLower.includes('headstand');

  return {
    isSupine,
    isHighImpact,
    hasFallRisk,
    requiresValsalva,
    isProne,
    isInverted,
    impactLevel: isHighImpact ? 'high' : 'low',
    balanceRequired: hasFallRisk ? 'high' : 'none',
  };
}

/**
 * Check if exercise list is sufficient for workout generation
 * If too few exercises remain, return false
 */
export function hasMinimumExercises(exercises: Exercise[], minimum: number = 5): boolean {
  return exercises.length >= minimum;
}

/**
 * Generate fallback gentle movement plan for extreme constraints
 */
export function generateGentleMovementPlan(): {
  planTitle: string;
  planDescription: string;
  exercises: string[];
  disclaimer: string;
} {
  return {
    planTitle: 'Gentle Movement Plan',
    planDescription:
      '⚠️ SAFETY NOTICE: Very few exercises match your current safety profile. This plan focuses on gentle, low-risk movements suitable for most people.',
    exercises: [
      'Walking (15-20 minutes at comfortable pace)',
      'Gentle full-body stretching',
      'Seated mobility work',
      'Breathing exercises (diaphragmatic breathing)',
      'Gentle range-of-motion movements',
    ],
    disclaimer:
      'This plan is highly limited due to multiple safety constraints. For a comprehensive personalized program, please consult your healthcare provider, a certified prenatal fitness specialist, or a physical therapist.',
  };
}
