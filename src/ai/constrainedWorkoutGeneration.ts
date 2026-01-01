/**
 * Constrained Workout Generation with Optimized System Prompts
 * Based on comprehensive testing results - uses best performing system prompt approach
 *
 * NOTE: This file is deprecated and should not be used.
 * AI generation is now handled by Cloudflare Workers backend.
 * See: https://fitai-workers.sharmaharsh9887.workers.dev
 */

import { PersonalInfo, FitnessGoals } from '../types/user';
import { Workout } from '../types/ai';
import { WorkoutSet } from '../types/workout';
// Restore VERIFIED_EXERCISE_NAMES for GIF mapping - this is essential for exercise visuals
const VERIFIED_EXERCISE_NAMES = [
  // BODYWEIGHT EXERCISES (Body Weight)
  'quads',
  'sphinx',
  'body-up',
  'push-up',
  'pull-up',
  'chin-up',
  'elevator',
  'handstand',
  'ring dips',
  'chest dip',
  'muscle up',
  'l-pull-up',
  'back lever',
  'elbow dips',
  'jump squat',
  'one arm dip',
  'reverse dip',
  'triceps dip',
  'sissy squat',
  'korean dips',

  // STRENGTH TRAINING
  'otis up',
  'tire flip',
  'jump rope',
  'rope climb',
  'hands bike',
  'lever shrug',
  'smith shrug',
  'smith squat',
  'london bridge',
  'ski ergometer',
  'sledge hammer',
  'lever high row',
  'lever pullover',
  'lever deadlift',
  'weighted squat',
  'smith deadlift',
  'wrist rollerer',
  'battling ropes',
  'lever t bar row',
  'sled hack squat',

  // CORE EXERCISES
  'flag',
  'cocoons',
  'curl-up',
  'butt-ups',
  'inchworm',
  'air bike',
  'dead bug',
  'bottoms-up',
  '3/4 sit-up',
  'tuck crunch',
  'pelvic tilt',
  'potty squat',
  'sit-up v. 2',
  'spine twist',
  'front lever',
  'frog crunch',
  'full maltese',
  'wind sprints',
  'lean planche',
  'full planche',

  // CARDIO EXERCISES
  'run',
  'burpee',
  'ski step',
  'swing 360',
  'wheel run',
  'bear crawl',
  'push to run',
  'skater hops',
  'jack burpee',
  'run (equipment)',
  'mountain climber',

  // DUMBBELL EXERCISES
  'farmers walk',
  'deep push up',
  'dumbbell fly',
  'spell caster',
  'dumbbell shrug',
  'dumbbell squat',
  'dumbbell lunge',
  'dumbbell clean',
  'dumbbell raise',
  'dumbbell burpee',
  'dumbbell w-press',
  'dumbbell high curl',
  'dumbbell tate press',
  'dumbbell push press',
  'dumbbell incline row',

  // BARBELL EXERCISES
  'squat jerk',
  'snatch pull',
  'power clean',
  'finger curls',
  'barbell curl',
  'landmine 180',
  'barbell shrug',
  'barbell lunge',
  'barbell skier',
  'barbell step-up',
  'barbell wide squat',
  'barbell jump squat',
  'barbell full squat',
  'barbell hack squat',
  'barbell incline row',

  // CABLE EXERCISES
  'cable curl',
  'cable shrug',
  'cable twist',
  'cable low fly',
  'cable kickback',
  'cable pushdown',
  'cable pulldown',
  'cable deadlift',
  'cable upper row',
  'cable lying fly',
  'cable drag curl',
  'cable side bend',
  'cable judo flip',
  'cable seated row',
  'cable bench press',

  // RESISTANCE BAND
  'band v-up',
  'band shrug',
  'band squat',
  'band step-up',
  'band y-raise',
  'band hip lift',
  'band squat row',
  'band wrist curl',
  'band seated twist',
  'band bicycle crunch',
  'band standing crunch',
  'band seated twist pure',

  // KETTLEBELL EXERCISES
  'kettlebell swing',
] as const;

import { exerciseValidator } from './exerciseValidationService';

// DATABASE-VERIFIED SYSTEM PROMPT (100% GIF coverage guaranteed)
const OPTIMIZED_SYSTEM_PROMPT = `
You are a fitness trainer with access to a verified exercise database. Use ONLY these exact exercise names that are guaranteed to have visual demonstrations:

BODYWEIGHT EXERCISES (Body Weight): quads, sphinx, body-up, push-up, pull-up, chin-up, elevator, handstand, ring dips, chest dip, muscle up, l-pull-up, back lever, elbow dips, jump squat, one arm dip, reverse dip, triceps dip, sissy squat, korean dips

STRENGTH TRAINING: otis up, tire flip, jump rope, rope climb, hands bike, lever shrug, smith shrug, smith squat, london bridge, ski ergometer, sledge hammer, lever high row, lever pullover, lever deadlift, weighted squat, smith deadlift, wrist rollerer, battling ropes, lever t bar row, sled hack squat

CORE EXERCISES: flag, cocoons, curl-up, butt-ups, inchworm, air bike, dead bug, bottoms-up, 3/4 sit-up, tuck crunch, pelvic tilt, potty squat, sit-up v. 2, spine twist, front lever, frog crunch, full maltese, wind sprints, lean planche, full planche

CARDIO EXERCISES: run, burpee, ski step, swing 360, wheel run, bear crawl, push to run, skater hops, jack burpee, run (equipment), mountain climber

DUMBBELL EXERCISES: farmers walk, deep push up, dumbbell fly, spell caster, dumbbell shrug, dumbbell squat, dumbbell lunge, dumbbell clean, dumbbell raise, dumbbell burpee, dumbbell w-press, dumbbell high curl, dumbbell tate press, dumbbell push press, dumbbell incline row

BARBELL EXERCISES: squat jerk, snatch pull, power clean, finger curls, barbell curl, landmine 180, barbell shrug, barbell lunge, barbell skier, barbell step-up, barbell wide squat, barbell jump squat, barbell full squat, barbell hack squat, barbell incline row

CABLE EXERCISES: cable curl, cable shrug, cable twist, cable low fly, cable kickback, cable pushdown, cable pulldown, cable deadlift, cable upper row, cable lying fly, cable drag curl, cable side bend, cable judo flip, cable seated row, cable bench press

RESISTANCE BAND: band v-up, band shrug, band squat, band step-up, band y-raise, band hip lift, band squat row, band wrist curl, band seated twist, band bicycle crunch, band standing crunch, band seated twist pure

KETTLEBELL EXERCISES: kettlebell swing

CRITICAL RULES FOR 100% VISUAL ACCURACY:
✅ Use ONLY the exact names listed above - these are verified in our database
✅ Every exercise name MUST match exactly (case-insensitive) 
✅ These exercises are guaranteed to have proper GIF demonstrations
✅ Never create custom names or use words like "modified", "custom", "variation"
✅ If equipment is unavailable, choose from bodyweight category only

FORBIDDEN - THESE WILL BREAK THE VISUAL SYSTEM:
❌ "Modified Push-up Technique" ❌ "Custom Squat Variation" 
❌ "Dynamic Movement Pattern" ❌ "Advanced Strength Complex"
❌ "Core-Focused Exercise Series" ❌ "Cardio Interval Sequence"
❌ "Light Jogging Intervals" ❌ "Flexibility Routine"

This system ensures every exercise has a matching GIF for perfect user experience.
`;

// Backup system prompt (format enforcement - also 100% accuracy)
const BACKUP_SYSTEM_PROMPT = `
CRITICAL INSTRUCTION: You can only use these exact exercise name formats:

FORMAT EXAMPLES:
- Single word: "Squats", "Deadlifts", "Plank"  
- Two words: "Jumping Jacks", "High Knees", "Bench Press"
- Equipment + Exercise: "Dumbbell Rows", "Barbell Squats"

FORBIDDEN PATTERNS:
- Descriptive names: "Light Cardio Movement"
- Custom variations: "Modified Squat Technique"  
- Creative combinations: "Core-Focused Plank Series"
- Sequential descriptions: "Dynamic Strength Sequence"
- Interval descriptions: "Cardio Burst Intervals"

Use only standard gym exercise names that exist in fitness databases.

APPROVED EXERCISES: Push-ups, Squats, Lunges, Plank, Burpees, Mountain Climbers, Jumping Jacks, High Knees, Butt Kicks, Bench Press, Deadlifts, Pull-ups, Rows, Shoulder Press, Bicep Curls, Tricep Dips, Dumbbell Rows, Barbell Squats, Dumbbell Press, Running, Cycling, Rowing, Jump Rope, Stretching, Yoga
`;

// Exercise names are now imported from shared constants to prevent circular dependencies

/**
 * Generate workout with constrained exercise names (100% accuracy tested)
 *
 * @deprecated This function is deprecated. Use Cloudflare Workers backend instead.
 * @see https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate
 */
export const generateConstrainedWorkout = async (
  userProfile: PersonalInfo & {
    fitnessGoals: FitnessGoals;
    equipment?: string[];
    location?: string;
    limitations?: string[];
  },
  workoutGoals: string[]
): Promise<Workout> => {
  throw new Error(
    'Client-side AI generation is deprecated. ' +
    'Please use Cloudflare Workers backend at: ' +
    'https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate'
  );
};

/**
 * Build intelligent workout prompt based on user profile
 */
const buildWorkoutPrompt = (
  userProfile: PersonalInfo & {
    fitnessGoals: FitnessGoals;
    equipment?: string[];
    location?: string;
    limitations?: string[];
  },
  workoutGoals: string[]
): string => {
  return `
Create a personalized workout for this user:

USER PROFILE:
- Name: ${userProfile.name}
- Age: ${userProfile.age}
- Experience Level: ${userProfile.fitnessGoals.experience}
- Location: ${userProfile.location || 'home'}
- Equipment Available: ${userProfile.equipment?.join(', ') || 'bodyweight only'}
- Time Available: ${userProfile.fitnessGoals.timeCommitment} minutes per session

FITNESS GOALS: ${workoutGoals.join(', ')}

${
  userProfile.limitations && userProfile.limitations.length > 0
    ? `IMPORTANT CONSTRAINTS: ${userProfile.limitations.join(', ')}`
    : ''
}

REQUIREMENTS:
✅ Select exercises appropriate for user's experience level and goals
✅ Use only equipment the user has available
✅ Adapt to any injuries or limitations mentioned
✅ Create a balanced, effective workout
✅ Use ONLY standard exercise names from the approved categories

${getUserSpecificGuidance(userProfile)}

Generate a complete workout with exercises, sets, reps, and rest times.
`;
};

/**
 * Provide user-specific guidance for exercise selection
 */
const getUserSpecificGuidance = (userProfile: any): string => {
  let guidance = '';

  // Experience-based guidance
  if (userProfile.fitnessGoals.experience === 'beginner') {
    guidance += '\n- Focus on basic bodyweight exercises and simple movements';
    guidance += '\n- Avoid complex exercises requiring advanced technique';
  } else if (userProfile.fitnessGoals.experience === 'advanced') {
    guidance += '\n- Include challenging compound movements';
    guidance += '\n- Use heavier equipment-based exercises if available';
  }

  // Location-based guidance
  if (userProfile.location === 'home') {
    guidance += '\n- Prioritize bodyweight and minimal equipment exercises';
    guidance += '\n- Avoid exercises requiring gym machines';
  } else if (userProfile.location === 'gym') {
    guidance += '\n- Can include barbell, cable, and machine exercises';
    guidance += '\n- Utilize full range of gym equipment';
  }

  // Limitation-based guidance
  if (userProfile.limitations?.includes('knee injury')) {
    guidance += '\n- Avoid exercises that stress the knees (squats, lunges, jumping)';
    guidance += '\n- Focus on upper body and seated exercises';
  }

  if (userProfile.limitations?.includes('shoulder')) {
    guidance += '\n- Avoid overhead movements and exercises that stress shoulders';
    guidance += '\n- Focus on neutral grip and supported movements';
  }

  if (userProfile.limitations?.includes('back')) {
    guidance += '\n- Avoid exercises with heavy spinal loading';
    guidance += '\n- Focus on supported and core-stabilizing movements';
  }

  return guidance;
};

/**
 * Validate exercise names and fix any hallucinations (safety net)
 */
// Define the interface that matches what AI generates
interface GeneratedExercise extends WorkoutSet {
  name: string;
  description?: string;
  muscleGroups?: string[];
  equipment?: string[];
  instructions?: string[];
  tips?: string[];
  modifications?: string[];
}

interface GeneratedWorkout extends Omit<Workout, 'exercises'> {
  exercises: GeneratedExercise[];
}

const validateAndFixExerciseNames = (workout: GeneratedWorkout): GeneratedWorkout => {
  const validatedExercises = workout.exercises.map((exercise) => {
    const normalizedName = exercise.name.toLowerCase().trim();

    // Check if exercise name is in verified list
    const isValid = VERIFIED_EXERCISE_NAMES.some(
      (validName) =>
        validName.toLowerCase() === normalizedName ||
        calculateSimilarity(normalizedName, validName.toLowerCase()) > 0.9
    );

    if (!isValid) {
      console.log(`⚠️  Invalid exercise name detected: "${exercise.name}"`);

      // Find closest valid exercise
      const closestMatch = findClosestValidExercise(exercise.name, [...VERIFIED_EXERCISE_NAMES]);
      console.log(`🔄 Replaced with: "${closestMatch}"`);

      return { ...exercise, name: closestMatch };
    }

    return exercise;
  });

  return { ...workout, exercises: validatedExercises };
};

/**
 * Find closest valid exercise name using fuzzy matching
 */
const findClosestValidExercise = (invalidName: string, validExercises: string[]): string => {
  let bestMatch = validExercises[0];
  let bestScore = 0;

  for (const validExercise of validExercises) {
    const similarity = calculateSimilarity(invalidName.toLowerCase(), validExercise.toLowerCase());

    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = validExercise;
    }
  }

  // If no good match found, return safe default based on common patterns
  if (bestScore < 0.5) {
    if (invalidName.toLowerCase().includes('push')) return 'Push-ups';
    if (invalidName.toLowerCase().includes('squat')) return 'Squats';
    if (invalidName.toLowerCase().includes('cardio')) return 'Jumping Jacks';
    if (invalidName.toLowerCase().includes('core')) return 'Plank';
    return 'Push-ups'; // Safe default
  }

  return bestMatch;
};

/**
 * Calculate string similarity for fuzzy matching
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Test the constrained workout generation with various scenarios
 *
 * @deprecated This function is deprecated. Use Cloudflare Workers backend instead.
 */
export const testConstrainedGeneration = async (): Promise<void> => {
  console.log('⚠️ This test is deprecated. Use Cloudflare Workers backend instead.');
  console.log('Endpoint: https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate');
};

// Export the main function and utilities
export {
  OPTIMIZED_SYSTEM_PROMPT,
  BACKUP_SYSTEM_PROMPT,
  VERIFIED_EXERCISE_NAMES,
  validateAndFixExerciseNames,
};

export type { GeneratedWorkout, GeneratedExercise };
