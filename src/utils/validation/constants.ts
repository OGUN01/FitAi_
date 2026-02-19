export const VALIDATION_RULES = {
  NAME: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  AGE: {
    min: 13,
    max: 120,
  },
  HEIGHT: {
    min: 100,
    max: 250,
  },
  WEIGHT: {
    min: 30,
    max: 300,
  },

  WORKOUT_DURATION: {
    min: 5,
    max: 300,
  },
  CALORIES: {
    min: 0,
    max: 10000,
  },
  SETS: {
    min: 1,
    max: 20,
  },
  REPS: {
    min: 1,
    max: 100,
  },
  WEIGHT_LIFTED: {
    min: 0,
    max: 1000,
  },

  FOOD_QUANTITY: {
    min: 0,
    max: 10000,
  },
  MACROS: {
    protein: { min: 0, max: 1000 },
    carbohydrates: { min: 0, max: 1000 },
    fat: { min: 0, max: 1000 },
    fiber: { min: 0, max: 200 },
  },

  BODY_FAT: {
    min: 3,
    max: 50,
  },
  MUSCLE_MASS: {
    min: 10,
    max: 100,
  },
} as const;
