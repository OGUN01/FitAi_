// App Constants
// This file contains all application constants

export const APP_CONFIG = {
  NAME: 'FitAI',
  VERSION: '1.0.0',
  API_TIMEOUT: 10000,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

export const STORAGE_KEYS = {
  USER_DATA: '@fitai_user_data',
  ONBOARDING_DATA: '@fitai_onboarding_data',
  WORKOUT_DATA: '@fitai_workout_data',
  DIET_DATA: '@fitai_diet_data',
  SETTINGS: '@fitai_settings',
};

export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  WORKOUTS: '/workouts',
  DIET: '/diet',
  BODY_ANALYSIS: '/body-analysis',
  FOODS: '/foods',
};

export const VALIDATION_RULES = {
  MIN_AGE: 13,
  MAX_AGE: 100,
  MIN_HEIGHT: 100, // cm
  MAX_HEIGHT: 250, // cm
  MIN_WEIGHT: 30, // kg
  MAX_WEIGHT: 300, // kg
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 50,
};
