// Comprehensive Exercise Database for FitAI

import { Exercise } from '../types/ai';

// ============================================================================
// EXERCISE DATABASE
// ============================================================================

export const EXERCISES: Exercise[] = [
  // BODYWEIGHT STRENGTH EXERCISES
  {
    id: 'push_up',
    name: 'Push-Up',
    description: 'Classic upper body bodyweight exercise targeting chest, shoulders, and triceps',
    instructions: [
      'Start in a plank position with hands slightly wider than shoulders',
      'Lower your body until chest nearly touches the floor',
      'Push back up to starting position',
      'Keep your body in a straight line throughout'
    ],
    muscleGroups: ['chest', 'shoulders', 'triceps', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sets: 3,
    reps: '8-15',
    restTime: 60,
    calories: 7,
    tips: [
      'Keep your core engaged throughout the movement',
      'Don\'t let your hips sag or pike up',
      'Breathe out as you push up'
    ],
    variations: ['Knee Push-Up', 'Diamond Push-Up', 'Wide-Grip Push-Up', 'Decline Push-Up']
  },
  {
    id: 'squat',
    name: 'Bodyweight Squat',
    description: 'Fundamental lower body exercise targeting quads, glutes, and hamstrings',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Lower your body by bending knees and pushing hips back',
      'Go down until thighs are parallel to floor',
      'Push through heels to return to starting position'
    ],
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'calves'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sets: 3,
    reps: '12-20',
    restTime: 60,
    calories: 8,
    tips: [
      'Keep your chest up and back straight',
      'Don\'t let knees cave inward',
      'Weight should be on your heels'
    ],
    variations: ['Jump Squat', 'Single-Leg Squat', 'Sumo Squat', 'Pulse Squat']
  },
  {
    id: 'plank',
    name: 'Plank',
    description: 'Isometric core exercise that strengthens the entire core and improves stability',
    instructions: [
      'Start in a push-up position',
      'Lower onto your forearms',
      'Keep your body in a straight line from head to heels',
      'Hold the position while breathing normally'
    ],
    muscleGroups: ['core', 'shoulders', 'back'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    duration: 30,
    restTime: 60,
    calories: 5,
    tips: [
      'Don\'t let your hips sag or pike up',
      'Keep your neck neutral',
      'Breathe steadily throughout the hold'
    ],
    variations: ['Side Plank', 'Plank Up-Down', 'Plank with Leg Lift', 'Mountain Climber']
  },
  {
    id: 'burpee',
    name: 'Burpee',
    description: 'Full-body explosive exercise combining squat, plank, and jump',
    instructions: [
      'Start standing, then squat down and place hands on floor',
      'Jump feet back into plank position',
      'Do a push-up (optional)',
      'Jump feet back to squat position',
      'Explode up into a jump with arms overhead'
    ],
    muscleGroups: ['full_body', 'cardiovascular'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    sets: 3,
    reps: '5-10',
    restTime: 90,
    calories: 15,
    tips: [
      'Land softly on your feet',
      'Keep movements controlled',
      'Modify by stepping instead of jumping'
    ],
    variations: ['Half Burpee', 'Burpee Box Jump', 'Single-Arm Burpee', 'Burpee Pull-Up']
  },

  // DUMBBELL EXERCISES
  {
    id: 'dumbbell_bench_press',
    name: 'Dumbbell Bench Press',
    description: 'Upper body strength exercise targeting chest, shoulders, and triceps',
    instructions: [
      'Lie on bench with dumbbells in each hand',
      'Start with arms extended above chest',
      'Lower dumbbells to chest level',
      'Press back up to starting position'
    ],
    muscleGroups: ['chest', 'shoulders', 'triceps'],
    equipment: ['dumbbells', 'bench'],
    difficulty: 'intermediate',
    sets: 3,
    reps: '8-12',
    restTime: 90,
    calories: 10,
    tips: [
      'Keep your feet flat on the floor',
      'Don\'t arch your back excessively',
      'Control the weight on the way down'
    ],
    variations: ['Incline Dumbbell Press', 'Decline Dumbbell Press', 'Single-Arm Press']
  },
  {
    id: 'dumbbell_row',
    name: 'Dumbbell Row',
    description: 'Back exercise that targets lats, rhomboids, and rear delts',
    instructions: [
      'Bend over with dumbbell in one hand',
      'Support yourself with other hand on bench',
      'Pull dumbbell to your hip',
      'Lower with control'
    ],
    muscleGroups: ['lats', 'rhomboids', 'rear_delts', 'biceps'],
    equipment: ['dumbbells', 'bench'],
    difficulty: 'intermediate',
    sets: 3,
    reps: '8-12',
    restTime: 60,
    calories: 8,
    tips: [
      'Keep your back straight',
      'Pull with your back, not your arm',
      'Squeeze shoulder blades together'
    ],
    variations: ['Bent-Over Row', 'Chest-Supported Row', 'Renegade Row']
  },

  // CARDIO EXERCISES
  {
    id: 'jumping_jacks',
    name: 'Jumping Jacks',
    description: 'Classic cardio exercise that elevates heart rate and works the whole body',
    instructions: [
      'Start standing with feet together, arms at sides',
      'Jump feet apart while raising arms overhead',
      'Jump back to starting position',
      'Repeat at a steady pace'
    ],
    muscleGroups: ['cardiovascular', 'legs', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    duration: 60,
    restTime: 30,
    calories: 12,
    tips: [
      'Land softly on the balls of your feet',
      'Keep a steady rhythm',
      'Modify by stepping side to side'
    ],
    variations: ['Star Jumps', 'Cross Jacks', 'Squat Jacks']
  },
  {
    id: 'mountain_climbers',
    name: 'Mountain Climbers',
    description: 'Dynamic cardio exercise that combines core strength with cardiovascular training',
    instructions: [
      'Start in plank position',
      'Bring one knee toward chest',
      'Quickly switch legs',
      'Continue alternating at a fast pace'
    ],
    muscleGroups: ['core', 'shoulders', 'legs', 'cardiovascular'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    duration: 30,
    restTime: 60,
    calories: 10,
    tips: [
      'Keep hips level',
      'Maintain plank position',
      'Drive knees toward chest'
    ],
    variations: ['Cross-Body Mountain Climbers', 'Slow Mountain Climbers', 'Single-Leg Mountain Climbers']
  },

  // FLEXIBILITY/YOGA EXERCISES
  {
    id: 'downward_dog',
    name: 'Downward Facing Dog',
    description: 'Yoga pose that stretches hamstrings, calves, and shoulders while strengthening arms',
    instructions: [
      'Start on hands and knees',
      'Tuck toes under and lift hips up',
      'Straighten legs and arms',
      'Form an inverted V shape'
    ],
    muscleGroups: ['hamstrings', 'calves', 'shoulders', 'back'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    duration: 30,
    restTime: 15,
    calories: 3,
    tips: [
      'Press hands firmly into ground',
      'Lengthen through your spine',
      'Pedal feet to stretch calves'
    ],
    variations: ['Three-Legged Dog', 'Twisted Dog', 'Puppy Pose']
  },
  {
    id: 'child_pose',
    name: 'Child\'s Pose',
    description: 'Restorative yoga pose that stretches the back and promotes relaxation',
    instructions: [
      'Kneel on the floor with big toes touching',
      'Sit back on your heels',
      'Fold forward and extend arms in front',
      'Rest forehead on the ground'
    ],
    muscleGroups: ['back', 'hips', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    duration: 60,
    restTime: 0,
    calories: 1,
    tips: [
      'Breathe deeply and relax',
      'Widen knees if more comfortable',
      'Use as a rest position'
    ],
    variations: ['Extended Child\'s Pose', 'Side Child\'s Pose', 'Thread the Needle']
  },

  // HIIT EXERCISES
  {
    id: 'high_knees',
    name: 'High Knees',
    description: 'High-intensity cardio exercise that improves coordination and elevates heart rate',
    instructions: [
      'Stand with feet hip-width apart',
      'Run in place lifting knees to hip level',
      'Pump arms as you run',
      'Maintain quick pace'
    ],
    muscleGroups: ['legs', 'core', 'cardiovascular'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    duration: 30,
    restTime: 30,
    calories: 12,
    tips: [
      'Stay on balls of feet',
      'Keep core engaged',
      'Drive knees up high'
    ],
    variations: ['High Knee Skips', 'High Knee Marching', 'High Knee Butt Kicks']
  },
  {
    id: 'battle_ropes',
    name: 'Battle Ropes',
    description: 'High-intensity full-body exercise using heavy ropes for cardio and strength',
    instructions: [
      'Hold rope ends with both hands',
      'Stand with feet shoulder-width apart',
      'Create waves by moving arms up and down',
      'Maintain steady rhythm'
    ],
    muscleGroups: ['arms', 'shoulders', 'core', 'cardiovascular'],
    equipment: ['battle_ropes'],
    difficulty: 'advanced',
    duration: 30,
    restTime: 60,
    calories: 15,
    tips: [
      'Keep core tight',
      'Use whole body, not just arms',
      'Maintain consistent wave pattern'
    ],
    variations: ['Alternating Waves', 'Double Waves', 'Spirals', 'Slams']
  }
];

// ============================================================================
// EXERCISE CATEGORIES
// ============================================================================

export const EXERCISE_CATEGORIES = {
  STRENGTH: {
    id: 'strength',
    name: 'Strength Training',
    description: 'Exercises focused on building muscle strength and size',
    icon: '💪',
    exercises: EXERCISES.filter(ex => 
      ex.muscleGroups.some(mg => 
        ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes'].includes(mg)
      ) && !ex.muscleGroups.includes('cardiovascular')
    )
  },
  CARDIO: {
    id: 'cardio',
    name: 'Cardiovascular',
    description: 'Exercises that improve heart health and endurance',
    icon: '🏃',
    exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('cardiovascular'))
  },
  FLEXIBILITY: {
    id: 'flexibility',
    name: 'Flexibility & Mobility',
    description: 'Stretching and mobility exercises for improved flexibility',
    icon: '🧘',
    exercises: EXERCISES.filter(ex => 
      ex.name.toLowerCase().includes('stretch') || 
      ex.name.toLowerCase().includes('pose') ||
      ex.description.toLowerCase().includes('stretch')
    )
  },
  HIIT: {
    id: 'hiit',
    name: 'High-Intensity Interval Training',
    description: 'Short bursts of intense exercise with rest periods',
    icon: '🔥',
    exercises: EXERCISES.filter(ex => 
      ex.difficulty === 'advanced' || 
      ex.name.toLowerCase().includes('burpee') ||
      ex.name.toLowerCase().includes('battle') ||
      ex.calories && ex.calories > 10
    )
  }
};

// ============================================================================
// MUSCLE GROUPS
// ============================================================================

export const MUSCLE_GROUPS = {
  CHEST: { name: 'Chest', exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('chest')) },
  BACK: { name: 'Back', exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('back') || ex.muscleGroups.includes('lats')) },
  SHOULDERS: { name: 'Shoulders', exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('shoulders')) },
  ARMS: { name: 'Arms', exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('biceps') || ex.muscleGroups.includes('triceps')) },
  LEGS: { name: 'Legs', exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('quadriceps') || ex.muscleGroups.includes('hamstrings') || ex.muscleGroups.includes('calves')) },
  GLUTES: { name: 'Glutes', exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('glutes')) },
  CORE: { name: 'Core', exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('core')) },
  FULL_BODY: { name: 'Full Body', exercises: EXERCISES.filter(ex => ex.muscleGroups.includes('full_body')) }
};

// ============================================================================
// EQUIPMENT CATEGORIES
// ============================================================================

export const EQUIPMENT_CATEGORIES = {
  BODYWEIGHT: {
    name: 'Bodyweight Only',
    exercises: EXERCISES.filter(ex => ex.equipment.includes('bodyweight') && ex.equipment.length === 1)
  },
  DUMBBELLS: {
    name: 'Dumbbells',
    exercises: EXERCISES.filter(ex => ex.equipment.includes('dumbbells'))
  },
  GYM: {
    name: 'Gym Equipment',
    exercises: EXERCISES.filter(ex => 
      ex.equipment.some(eq => ['barbell', 'machine', 'cable', 'bench'].includes(eq))
    )
  },
  MINIMAL: {
    name: 'Minimal Equipment',
    exercises: EXERCISES.filter(ex => 
      ex.equipment.some(eq => ['resistance_bands', 'kettlebell', 'medicine_ball'].includes(eq))
    )
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get exercises by difficulty level
 */
export const getExercisesByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): Exercise[] => {
  return EXERCISES.filter(exercise => exercise.difficulty === difficulty);
};

/**
 * Get exercises by muscle group
 */
export const getExercisesByMuscleGroup = (muscleGroup: string): Exercise[] => {
  return EXERCISES.filter(exercise => 
    exercise.muscleGroups.some(mg => mg.toLowerCase().includes(muscleGroup.toLowerCase()))
  );
};

/**
 * Get exercises by equipment
 */
export const getExercisesByEquipment = (equipment: string[]): Exercise[] => {
  return EXERCISES.filter(exercise => 
    equipment.some(eq => exercise.equipment.includes(eq))
  );
};

/**
 * Get exercise by ID
 */
export const getExerciseById = (id: string): Exercise | undefined => {
  return EXERCISES.find(exercise => exercise.id === id);
};

/**
 * Search exercises by name or description
 */
export const searchExercises = (query: string): Exercise[] => {
  const lowerQuery = query.toLowerCase();
  return EXERCISES.filter(exercise => 
    exercise.name.toLowerCase().includes(lowerQuery) ||
    exercise.description.toLowerCase().includes(lowerQuery) ||
    exercise.muscleGroups.some(mg => mg.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get random exercises for variety
 */
export const getRandomExercises = (count: number, filters?: {
  difficulty?: string;
  equipment?: string[];
  muscleGroups?: string[];
}): Exercise[] => {
  let filteredExercises = [...EXERCISES];

  if (filters) {
    if (filters.difficulty) {
      filteredExercises = filteredExercises.filter(ex => ex.difficulty === filters.difficulty);
    }
    if (filters.equipment) {
      filteredExercises = filteredExercises.filter(ex => 
        filters.equipment!.some(eq => ex.equipment.includes(eq))
      );
    }
    if (filters.muscleGroups) {
      filteredExercises = filteredExercises.filter(ex => 
        filters.muscleGroups!.some(mg => ex.muscleGroups.includes(mg))
      );
    }
  }

  // Shuffle and return requested count
  const shuffled = filteredExercises.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export default EXERCISES;
