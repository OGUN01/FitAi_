import { ResponsiveTheme } from "../../../utils/constants";

export const FITNESS_GOALS = [
  {
    id: "weight-loss",
    title: "Weight Loss",
    iconName: "flame-outline",
    description: "Burn fat and lose weight",
  },
  {
    id: "weight-gain",
    title: "Weight Gain",
    iconName: "trending-up-outline",
    description: "Gain healthy weight (muscle and mass)",
  },
  {
    id: "muscle-gain",
    title: "Muscle Gain",
    iconName: "barbell-outline",
    description: "Build lean muscle mass",
  },
  {
    id: "strength",
    title: "Strength",
    iconName: "fitness-outline",
    description: "Increase overall strength",
  },
  {
    id: "endurance",
    title: "Endurance",
    iconName: "speedometer-outline",
    description: "Improve cardiovascular fitness",
  },
  {
    id: "flexibility",
    title: "Flexibility",
    iconName: "body-outline",
    description: "Enhance mobility and flexibility",
  },
  {
    id: "general_fitness",
    title: "General Fitness",
    iconName: "flash-outline",
    description: "Overall health and wellness",
  },
];

export const ACTIVITY_LEVELS = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Little to no exercise",
    iconName: "bed-outline",
  },
  {
    value: "light",
    label: "Lightly Active",
    description: "Light exercise 1-3 days/week",
    iconName: "walk-outline",
  },
  {
    value: "moderate",
    label: "Moderately Active",
    description: "Moderate exercise 3-5 days/week",
    iconName: "walk-outline",
  },
  {
    value: "active",
    label: "Very Active",
    description: "Hard exercise 6-7 days/week",
    iconName: "barbell-outline",
  },
  {
    value: "extreme",
    label: "Extremely Active",
    description: "Very hard exercise, physical job",
    iconName: "flame-outline",
  },
];

export const LOCATION_OPTIONS = [
  {
    id: "home",
    title: "Home",
    iconName: "home-outline",
    description: "Workout from the comfort of your home",
  },
  {
    id: "gym",
    title: "Gym",
    iconName: "fitness-outline",
    description: "Access to full gym equipment",
  },
  {
    id: "both",
    title: "Both",
    iconName: "repeat-outline",
    description: "Flexible workouts anywhere",
  },
];

export const EQUIPMENT_OPTIONS = [
  {
    id: "bodyweight",
    label: "Bodyweight",
    value: "bodyweight",
    iconName: "body-outline",
  },
  {
    id: "dumbbells",
    label: "Dumbbells",
    value: "dumbbells",
    iconName: "barbell-outline",
  },
  {
    id: "resistance-bands",
    label: "Resistance Bands",
    value: "resistance-bands",
    iconName: "resize-outline",
  },
  {
    id: "kettlebells",
    label: "Kettlebells",
    value: "kettlebells",
    iconName: "barbell-outline",
  },
  {
    id: "barbell",
    label: "Barbell",
    value: "barbell",
    iconName: "barbell-outline",
  },
  {
    id: "pull-up-bar",
    label: "Pull-up Bar",
    value: "pull-up-bar",
    iconName: "remove-outline",
  },
  {
    id: "yoga-mat",
    label: "Yoga Mat",
    value: "yoga-mat",
    iconName: "body-outline",
  },
  {
    id: "treadmill",
    label: "Treadmill",
    value: "treadmill",
    iconName: "speedometer-outline",
  },
  {
    id: "stationary-bike",
    label: "Stationary Bike",
    value: "stationary-bike",
    iconName: "bicycle-outline",
  },
];

// Standard gym equipment - auto-populated when gym is selected
export const STANDARD_GYM_EQUIPMENT = [
  "bodyweight",
  "dumbbells",
  "barbell",
  "kettlebells",
  "pull-up-bar",
  "treadmill",
  "stationary-bike",
  "yoga-mat",
];

export const INTENSITY_OPTIONS = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to fitness or returning after a break",
    iconName: "leaf-outline",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Some experience with regular exercise",
    iconName: "barbell-outline",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Experienced with consistent training",
    iconName: "flame-outline",
  },
];

export const WORKOUT_TYPE_OPTIONS = [
  {
    id: "strength",
    label: "Strength Training",
    value: "strength",
    iconName: "barbell-outline",
  },
  { id: "cardio", label: "Cardio", value: "cardio", iconName: "heart-outline" },
  { id: "hiit", label: "HIIT", value: "hiit", iconName: "flash-outline" },
  { id: "yoga", label: "Yoga", value: "yoga", iconName: "body-outline" },
  {
    id: "pilates",
    label: "Pilates",
    value: "pilates",
    iconName: "body-outline",
  },
  {
    id: "flexibility",
    label: "Flexibility",
    value: "flexibility",
    iconName: "body-outline",
  },
  {
    id: "functional",
    label: "Functional Training",
    value: "functional",
    iconName: "walk-outline",
  },
  {
    id: "sports",
    label: "Sports Training",
    value: "sports",
    iconName: "football-outline",
  },
];

export const WORKOUT_TIMES = [
  {
    value: "morning",
    label: "Morning",
    iconName: "sunny-outline",
    description: "6AM - 10AM",
  },
  {
    value: "afternoon",
    label: "Afternoon",
    iconName: "sunny-outline",
    description: "12PM - 4PM",
  },
  {
    value: "evening",
    label: "Evening",
    iconName: "moon-outline",
    description: "6PM - 9PM",
  },
];

export const OCCUPATION_OPTIONS = [
  { value: "desk_job", label: "Desk Job" },
  { value: "light_active", label: "Light Activity" },
  { value: "moderate_active", label: "Moderate Activity" },
  { value: "heavy_labor", label: "Heavy Labor" },
  { value: "very_active", label: "Very Active" },
];
