// Test Data Utilities for FitAI Advanced Components
// This file provides mock data for testing and development

export const mockProgressData = [
  { date: '2025-01-01', weight: 75.0, bodyFat: 18.5, muscleMass: 35.2 },
  { date: '2025-01-03', weight: 74.8, bodyFat: 18.3, muscleMass: 35.3 },
  { date: '2025-01-05', weight: 74.5, bodyFat: 18.0, muscleMass: 35.5 },
  { date: '2025-01-07', weight: 74.3, bodyFat: 17.8, muscleMass: 35.7 },
  { date: '2025-01-10', weight: 74.0, bodyFat: 17.5, muscleMass: 36.0 },
  { date: '2025-01-12', weight: 73.8, bodyFat: 17.3, muscleMass: 36.2 },
  { date: '2025-01-15', weight: 73.5, bodyFat: 17.0, muscleMass: 36.5 },
  { date: '2025-01-17', weight: 73.3, bodyFat: 16.8, muscleMass: 36.7 },
  { date: '2025-01-19', weight: 73.0, bodyFat: 16.5, muscleMass: 37.0 },
];

export const mockNutritionData = {
  calories: 1850,
  protein: 125,
  carbs: 180,
  fat: 68,
};

export const mockWorkoutIntensityData = [
  { date: '2025-01-01', intensity: 3, duration: 45, type: 'Strength Training' },
  { date: '2025-01-02', intensity: 2, duration: 30, type: 'Cardio' },
  { date: '2025-01-04', intensity: 4, duration: 60, type: 'HIIT' },
  { date: '2025-01-06', intensity: 3, duration: 45, type: 'Strength Training' },
  { date: '2025-01-08', intensity: 5, duration: 75, type: 'CrossFit' },
  { date: '2025-01-09', intensity: 2, duration: 25, type: 'Yoga' },
  { date: '2025-01-11', intensity: 4, duration: 50, type: 'Circuit Training' },
  { date: '2025-01-13', intensity: 3, duration: 40, type: 'Strength Training' },
  { date: '2025-01-15', intensity: 4, duration: 55, type: 'HIIT' },
  { date: '2025-01-17', intensity: 2, duration: 35, type: 'Recovery Workout' },
  { date: '2025-01-19', intensity: 5, duration: 80, type: 'Full Body Workout' },
];

export const mockMuscleGroups = [
  { id: '1', label: 'Chest', value: 'chest', icon: '💪' },
  { id: '2', label: 'Back', value: 'back', icon: '🏋️' },
  { id: '3', label: 'Shoulders', value: 'shoulders', icon: '🤸' },
  { id: '4', label: 'Arms', value: 'arms', icon: '💪' },
  { id: '5', label: 'Legs', value: 'legs', icon: '🦵' },
  { id: '6', label: 'Core', value: 'core', icon: '🔥' },
  { id: '7', label: 'Glutes', value: 'glutes', icon: '🍑' },
  { id: '8', label: 'Calves', value: 'calves', icon: '🦵' },
];

export const mockWorkoutData = {
  id: 'workout-123',
  name: 'Upper Body Strength',
  description: 'Build strength and muscle mass in your upper body with this comprehensive workout',
  duration: '45-60 min',
  difficulty: 'Intermediate',
  targetMuscles: ['Chest', 'Back', 'Shoulders', 'Arms'],
  equipment: ['Dumbbells', 'Barbell', 'Bench'],
  calories: 350,
  exercises: [
    {
      id: '1',
      name: 'Bench Press',
      sets: 4,
      reps: '8-10',
      weight: '135-155 lbs',
      restTime: '2-3 min',
      instructions: [
        'Lie flat on bench with feet firmly on ground',
        'Grip barbell slightly wider than shoulder width',
        'Lower bar to chest with control',
        'Press bar up explosively to starting position',
      ],
      targetMuscles: ['Chest', 'Triceps', 'Shoulders'],
      difficulty: 'Intermediate',
      equipment: ['Barbell', 'Bench'],
    },
    {
      id: '2',
      name: 'Bent-Over Row',
      sets: 4,
      reps: '8-12',
      weight: '95-115 lbs',
      restTime: '2 min',
      instructions: [
        'Stand with feet hip-width apart, holding barbell',
        'Hinge at hips, keeping back straight',
        'Pull barbell to lower chest/upper abdomen',
        'Lower with control to starting position',
      ],
      targetMuscles: ['Back', 'Biceps'],
      difficulty: 'Intermediate',
      equipment: ['Barbell'],
    },
  ],
};

export const mockExerciseData = {
  id: 'exercise-456',
  name: 'Bench Press',
  description:
    'A compound upper body exercise that primarily targets the chest, shoulders, and triceps',
  difficulty: 'Intermediate',
  targetMuscles: ['Chest', 'Triceps', 'Shoulders'],
  equipment: ['Barbell', 'Bench'],
  instructions: [
    {
      step: 1,
      title: 'Setup Position',
      description:
        'Lie flat on the bench with your feet firmly planted on the ground. Your eyes should be directly under the barbell.',
      tips: ['Keep your back flat against the bench', 'Maintain a slight arch in your lower back'],
    },
    {
      step: 2,
      title: 'Grip the Bar',
      description:
        'Grip the barbell with hands slightly wider than shoulder-width apart. Use an overhand grip.',
      tips: ['Wrap your thumbs around the bar', 'Keep wrists straight and strong'],
    },
    {
      step: 3,
      title: 'Unrack the Weight',
      description:
        'Lift the bar off the rack and position it directly over your chest with arms fully extended.',
      tips: ['Move slowly and controlled', 'Engage your core for stability'],
    },
  ],
  sets: 4,
  reps: '8-10',
  restTime: '2-3 minutes',
  weight: '135-155 lbs',
  safetyTips: [
    'Always use a spotter when lifting heavy weights',
    'Warm up thoroughly before starting',
    'Never bounce the bar off your chest',
    'Keep your feet on the ground throughout the movement',
  ],
  commonMistakes: [
    'Arching the back excessively',
    'Flaring elbows too wide',
    'Pressing the bar toward the face',
    'Using too much weight too soon',
  ],
};

export const mockMealData = {
  id: 'meal-789',
  name: 'Breakfast',
  time: '8:30 AM',
  date: '2025-01-19',
  totalCalories: 485,
  totalProtein: 28,
  totalCarbs: 45,
  totalFat: 18,
  foods: [
    {
      id: '1',
      name: 'Greek Yogurt',
      quantity: 150,
      unit: 'g',
      calories: 130,
      protein: 15,
      carbs: 9,
      fat: 4,
      fiber: 0,
      sugar: 9,
    },
    {
      id: '2',
      name: 'Blueberries',
      quantity: 80,
      unit: 'g',
      calories: 45,
      protein: 0.5,
      carbs: 11,
      fat: 0.2,
      fiber: 2,
      sugar: 8,
    },
    {
      id: '3',
      name: 'Granola',
      quantity: 30,
      unit: 'g',
      calories: 140,
      protein: 4,
      carbs: 18,
      fat: 6,
      fiber: 3,
      sugar: 5,
    },
  ],
};

export const mockSwipeActions = {
  leftActions: [
    {
      id: 'edit',
      label: 'Edit',
      icon: '✏️',
      color: '#ff6b35',
      onPress: () => console.log('Edit action'),
    },
    {
      id: 'share',
      label: 'Share',
      icon: '📤',
      color: '#00d4ff',
      onPress: () => console.log('Share action'),
    },
  ],
  rightActions: [
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      color: '#f44336',
      onPress: () => console.log('Delete action'),
    },
  ],
};

export const mockLongPressMenuItems = [
  {
    id: 'edit',
    label: 'Edit Workout',
    icon: '✏️',
    onPress: () => console.log('Edit workout'),
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: '📋',
    onPress: () => console.log('Duplicate workout'),
  },
  {
    id: 'share',
    label: 'Share',
    icon: '📤',
    onPress: () => console.log('Share workout'),
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: '🗑️',
    onPress: () => console.log('Delete workout'),
    destructive: true,
  },
];

// Utility functions for generating test data
export const generateRandomProgressData = (days: number = 30) => {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let weight = 75;
  let bodyFat = 18;
  let muscleMass = 35;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // Add some realistic variation
    weight += (Math.random() - 0.5) * 0.3;
    bodyFat += (Math.random() - 0.5) * 0.2;
    muscleMass += (Math.random() - 0.5) * 0.1;

    data.push({
      date: date.toISOString().split('T')[0],
      weight: Math.round(weight * 10) / 10,
      bodyFat: Math.round(bodyFat * 10) / 10,
      muscleMass: Math.round(muscleMass * 10) / 10,
    });
  }

  return data;
};

export const generateRandomWorkoutData = (days: number = 90) => {
  const workoutTypes = [
    'Strength Training',
    'Cardio',
    'HIIT',
    'Yoga',
    'CrossFit',
    'Circuit Training',
  ];
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // Skip some days randomly (rest days)
    if (Math.random() > 0.7) continue;

    data.push({
      date: date.toISOString().split('T')[0],
      intensity: Math.floor(Math.random() * 5) + 1,
      duration: Math.floor(Math.random() * 60) + 20,
      type: workoutTypes[Math.floor(Math.random() * workoutTypes.length)],
    });
  }

  return data;
};

export const generateRandomNutritionData = () => {
  return {
    calories: Math.floor(Math.random() * 800) + 1200, // 1200-2000
    protein: Math.floor(Math.random() * 80) + 60, // 60-140g
    carbs: Math.floor(Math.random() * 150) + 100, // 100-250g
    fat: Math.floor(Math.random() * 50) + 40, // 40-90g
  };
};
