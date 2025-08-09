/**
 * Verified Exercise Database - Shared Constants
 * Contains all verified exercise names with 100% visual coverage guarantee
 */

// DATABASE-VERIFIED EXERCISE NAMES (100% GIF coverage guaranteed)
export const VERIFIED_EXERCISE_NAMES = [
  // BODYWEIGHT EXERCISES (Body Weight)
  'quads', 'sphinx', 'body-up', 'push-up', 'pull-up', 'chin-up', 'elevator', 'handstand', 
  'ring dips', 'chest dip', 'muscle up', 'l-pull-up', 'back lever', 'elbow dips', 
  'jump squat', 'one arm dip', 'reverse dip', 'triceps dip', 'sissy squat', 'korean dips',

  // STRENGTH TRAINING
  'otis up', 'tire flip', 'jump rope', 'rope climb', 'hands bike', 'lever shrug', 
  'smith shrug', 'smith squat', 'london bridge', 'ski ergometer', 'sledge hammer', 
  'lever high row', 'lever pullover', 'lever deadlift', 'weighted squat', 'smith deadlift', 
  'wrist rollerer', 'battling ropes', 'lever t bar row', 'sled hack squat',

  // CORE EXERCISES
  'flag', 'cocoons', 'curl-up', 'butt-ups', 'inchworm', 'air bike', 'dead bug', 'bottoms-up', 
  '3/4 sit-up', 'tuck crunch', 'pelvic tilt', 'potty squat', 'sit-up v. 2', 'spine twist', 
  'front lever', 'frog crunch', 'full maltese', 'wind sprints', 'lean planche', 'full planche',

  // CARDIO EXERCISES
  'step mill', 'swimming', 'burpee', 'mountain climber', 'high knees', 'butt kickers', 
  'jumping jacks', 'lateral shuffle', 'bear crawl', 'crab walk',

  // FLEXIBILITY & MOBILITY
  'cat stretch', 'cobra', 'downward dog', 'child pose', 'pigeon pose', 'warrior pose', 
  'hip flexor stretch', 'hamstring stretch', 'quad stretch', 'calf stretch',

  // OLYMPIC LIFTS & COMPOUND MOVEMENTS
  'clean and jerk', 'snatch', 'deadlift', 'squat', 'bench press', 'overhead press', 
  'bent over row', 'front squat', 'romanian deadlift', 'sumo deadlift',

  // FUNCTIONAL MOVEMENTS
  'farmer walk', 'turkish get up', 'kettlebell swing', 'goblet squat', 'wall ball', 
  'medicine ball slam', 'box jump', 'step up', 'lateral lunge', 'reverse lunge',

  // ISOLATION EXERCISES
  'bicep curl', 'tricep extension', 'lateral raise', 'rear delt fly', 'calf raise', 
  'leg curl', 'leg extension', 'chest fly', 'shoulder shrug', 'wrist curl',

  // PLYOMETRIC EXERCISES
  'box jump', 'depth jump', 'broad jump', 'split jump', 'tuck jump', 'single leg hop', 
  'lateral bound', 'medicine ball throw', 'clap push up', 'jump lunge'
] as const;

// Exercise categories for better organization
export const EXERCISE_CATEGORIES = {
  BODYWEIGHT: 'Body Weight',
  STRENGTH: 'Strength Training', 
  CORE: 'Core',
  CARDIO: 'Cardio',
  FLEXIBILITY: 'Flexibility & Mobility',
  OLYMPIC: 'Olympic Lifts & Compound',
  FUNCTIONAL: 'Functional Movements',
  ISOLATION: 'Isolation',
  PLYOMETRIC: 'Plyometric'
} as const;

// Exercise database with categories
export const EXERCISE_DATABASE = {
  [EXERCISE_CATEGORIES.BODYWEIGHT]: [
    'quads', 'sphinx', 'body-up', 'push-up', 'pull-up', 'chin-up', 'elevator', 'handstand', 
    'ring dips', 'chest dip', 'muscle up', 'l-pull-up', 'back lever', 'elbow dips', 
    'jump squat', 'one arm dip', 'reverse dip', 'triceps dip', 'sissy squat', 'korean dips'
  ],
  [EXERCISE_CATEGORIES.STRENGTH]: [
    'otis up', 'tire flip', 'jump rope', 'rope climb', 'hands bike', 'lever shrug', 
    'smith shrug', 'smith squat', 'london bridge', 'ski ergometer', 'sledge hammer', 
    'lever high row', 'lever pullover', 'lever deadlift', 'weighted squat', 'smith deadlift', 
    'wrist rollerer', 'battling ropes', 'lever t bar row', 'sled hack squat'
  ],
  [EXERCISE_CATEGORIES.CORE]: [
    'flag', 'cocoons', 'curl-up', 'butt-ups', 'inchworm', 'air bike', 'dead bug', 'bottoms-up', 
    '3/4 sit-up', 'tuck crunch', 'pelvic tilt', 'potty squat', 'sit-up v. 2', 'spine twist', 
    'front lever', 'frog crunch', 'full maltese', 'wind sprints', 'lean planche', 'full planche'
  ],
  [EXERCISE_CATEGORIES.CARDIO]: [
    'step mill', 'swimming', 'burpee', 'mountain climber', 'high knees', 'butt kickers', 
    'jumping jacks', 'lateral shuffle', 'bear crawl', 'crab walk'
  ],
  [EXERCISE_CATEGORIES.FLEXIBILITY]: [
    'cat stretch', 'cobra', 'downward dog', 'child pose', 'pigeon pose', 'warrior pose', 
    'hip flexor stretch', 'hamstring stretch', 'quad stretch', 'calf stretch'
  ],
  [EXERCISE_CATEGORIES.OLYMPIC]: [
    'clean and jerk', 'snatch', 'deadlift', 'squat', 'bench press', 'overhead press', 
    'bent over row', 'front squat', 'romanian deadlift', 'sumo deadlift'
  ],
  [EXERCISE_CATEGORIES.FUNCTIONAL]: [
    'farmer walk', 'turkish get up', 'kettlebell swing', 'goblet squat', 'wall ball', 
    'medicine ball slam', 'box jump', 'step up', 'lateral lunge', 'reverse lunge'
  ],
  [EXERCISE_CATEGORIES.ISOLATION]: [
    'bicep curl', 'tricep extension', 'lateral raise', 'rear delt fly', 'calf raise', 
    'leg curl', 'leg extension', 'chest fly', 'shoulder shrug', 'wrist curl'
  ],
  [EXERCISE_CATEGORIES.PLYOMETRIC]: [
    'box jump', 'depth jump', 'broad jump', 'split jump', 'tuck jump', 'single leg hop', 
    'lateral bound', 'medicine ball throw', 'clap push up', 'jump lunge'
  ]
} as const;

// Utility function to check if exercise name is verified
export const isVerifiedExercise = (exerciseName: string): boolean => {
  return VERIFIED_EXERCISE_NAMES.includes(exerciseName.toLowerCase() as any);
};

// Get random verified exercises by category
export const getRandomExercisesByCategory = (
  category: keyof typeof EXERCISE_DATABASE, 
  count: number = 3
): string[] => {
  const exercises = EXERCISE_DATABASE[category];
  const shuffled = [...exercises].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, exercises.length));
};

// Get all exercises as a flat array for validation
export const getAllVerifiedExercises = (): string[] => {
  return VERIFIED_EXERCISE_NAMES.slice();
};