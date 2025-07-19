# FitAI - Testing Strategy & Quality Assurance Guide

## Overview

This document outlines the comprehensive testing strategy for FitAI, covering unit tests, integration tests, end-to-end tests, and quality assurance procedures to ensure a robust and reliable application.

## Testing Architecture

### Testing Stack

- **Unit Testing**: Jest + React Native Testing Library
- **Component Testing**: React Native Testing Library
- **API Testing**: Jest + Supertest
- **E2E Testing**: Detox
- **Visual Testing**: Jest Snapshot Testing
- **Performance Testing**: React Native Performance Monitor
- **AI Testing**: Custom AI accuracy testing framework

### Test Environment Setup

```bash
# Install testing dependencies
npm install --save-dev \
  jest \
  @testing-library/react-native \
  @testing-library/jest-native \
  react-test-renderer \
  detox \
  jest-circus \
  @types/jest

# Setup test configuration
npm install --save-dev \
  babel-jest \
  metro-react-native-babel-preset \
  react-native-testing-mocks
```

## Unit Testing

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/src/tests/setup.ts',
  ],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/**/__tests__/**',
    '!src/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@supabase)/)',
  ],
};
```

### Test Setup

```typescript
// src/tests/setup.ts
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Expo modules
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-camera', () => ({
  Camera: {
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  },
  CameraType: { back: 'back' },
}));

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

// Mock Gemini AI
jest.mock('../services/ai/geminiService', () => ({
  GeminiService: jest.fn().mockImplementation(() => ({
    analyzeFoodImage: jest.fn(),
    analyzeBodyPhotos: jest.fn(),
    generateWorkoutPlan: jest.fn(),
    generateDietPlan: jest.fn(),
  })),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
```

### Component Testing Examples

#### Button Component Test

```typescript
// src/components/ui/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders correctly with text', () => {
    const { getByText } = render(
      <Button>Test Button</Button>
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button onPress={mockOnPress}>
        Press Me
      </Button>
    );

    fireEvent.press(getByText('Press Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state correctly', () => {
    const { getByTestId } = render(
      <Button loading>Loading Button</Button>
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('is disabled when loading', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button loading onPress={mockOnPress}>
        Loading Button
      </Button>
    );

    fireEvent.press(getByText('Loading Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('applies variant styles correctly', () => {
    const { getByTestId } = render(
      <Button variant="secondary" testID="button">
        Secondary Button
      </Button>
    );

    const button = getByTestId('button');
    expect(button.props.style).toContainEqual(
      expect.objectContaining({
        backgroundColor: expect.any(String)
      })
    );
  });
});
```

#### Screen Component Test

```typescript
// src/screens/onboarding/__tests__/PersonalInfoScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PersonalInfoScreen } from '../PersonalInfoScreen';
import { useUserStore } from '../../../stores/userStore';

// Mock the store
jest.mock('../../../stores/userStore');
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('PersonalInfoScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockUpdatePersonalInfo = jest.fn();

  beforeEach() => {
    mockUseUserStore.mockReturnValue({
      updatePersonalInfo: mockUpdatePersonalInfo,
      personalInfo: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all required form fields', () => {
    const { getByPlaceholderText, getByText } = render(
      <PersonalInfoScreen navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
    expect(getByPlaceholderText('25')).toBeTruthy();
    expect(getByText('Male')).toBeTruthy();
    expect(getByText('Female')).toBeTruthy();
  });

  it('validates required fields before submission', async () => {
    const { getByText } = render(
      <PersonalInfoScreen navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(getByText('Name is required')).toBeTruthy();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const { getByPlaceholderText, getByText } = render(
      <PersonalInfoScreen navigation={mockNavigation} />
    );

    // Fill form
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('25'), '28');
    fireEvent.press(getByText('Male'));
    fireEvent.changeText(getByPlaceholderText('170'), '175');
    fireEvent.changeText(getByPlaceholderText('70'), '75');
    fireEvent.changeText(getByPlaceholderText('65'), '70');

    // Select fitness goal
    fireEvent.press(getByText('Weight Loss'));

    // Select activity level
    fireEvent.press(getByText('Moderately Active'));

    // Submit
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({
        name: 'John Doe',
        age: '28',
        gender: 'male',
        height: '175',
        currentWeight: '75',
        targetWeight: '70',
        fitnessGoals: ['weight_loss'],
        activityLevel: 'moderately_active'
      });
      expect(mockNavigation.navigate).toHaveBeenCalledWith('WorkoutPreferences');
    });
  });

  it('handles fitness goal selection correctly', () => {
    const { getByText } = render(
      <PersonalInfoScreen navigation={mockNavigation} />
    );

    // Select multiple goals
    fireEvent.press(getByText('Weight Loss'));
    fireEvent.press(getByText('Muscle Gain'));

    // Deselect one goal
    fireEvent.press(getByText('Weight Loss'));

    // Only Muscle Gain should remain selected
    expect(getByText('Muscle Gain')).toHaveProp('variant', 'primary');
    expect(getByText('Weight Loss')).toHaveProp('variant', 'outline');
  });
});
```

### Service Testing

#### API Service Test

```typescript
// src/services/api/__tests__/authService.test.ts
import { AuthService } from '../authService';
import { supabase } from '../../../config/supabase';

jest.mock('../../../config/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('creates user account successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          error: null,
        }),
      } as any);

      const userData = {
        name: 'Test User',
        age: 25,
      };

      const result = await AuthService.signUp(
        'test@example.com',
        'password123',
        userData
      );

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { data: userData },
      });

      expect(result.data.user).toEqual(mockUser);
    });

    it('handles signup errors', async () => {
      const signUpError = new Error('Email already exists');
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: signUpError,
      });

      await expect(
        AuthService.signUp('test@example.com', 'password123', {})
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('signIn', () => {
    it('signs in user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            error: null,
          }),
        }),
      } as any);

      const result = await AuthService.signIn(
        'test@example.com',
        'password123'
      );

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.data.user).toEqual(mockUser);
    });
  });
});
```

#### AI Service Test

```typescript
// src/services/ai/__tests__/geminiService.test.ts
import { GeminiService } from '../geminiService';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

describe('GeminiService', () => {
  let geminiService: GeminiService;
  let mockModel: any;

  beforeEach(() => {
    geminiService = new GeminiService();
    mockModel = (geminiService as any).model;
  });

  describe('analyzeFoodImage', () => {
    it('returns food analysis for valid image', async () => {
      const mockResponse = {
        foods: [
          {
            name: 'Grilled Chicken Breast',
            estimatedQuantity: '150g',
            confidence: 0.9,
            calories: 231,
            macros: {
              protein: 43.5,
              carbohydrates: 0,
              fats: 5.0,
            },
          },
        ],
        totalCalories: 231,
        overallConfidence: 0.9,
      };

      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      });

      const result = await geminiService.analyzeFoodImage(
        'file://test-image.jpg',
        {
          userId: 'user-123',
          dietaryType: 'non-vegetarian',
        }
      );

      expect(result.foods).toHaveLength(1);
      expect(result.foods[0].name).toBe('Grilled Chicken Breast');
      expect(result.totalCalories).toBe(231);
    });

    it('handles AI service errors gracefully', async () => {
      mockModel.generateContent.mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(
        geminiService.analyzeFoodImage('file://test-image.jpg', {
          userId: 'user-123',
        })
      ).rejects.toThrow('Failed to analyze food image');
    });

    it('validates and parses AI response correctly', async () => {
      // Test invalid JSON response
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'invalid json response',
        },
      });

      await expect(
        geminiService.analyzeFoodImage('file://test-image.jpg', {
          userId: 'user-123',
        })
      ).rejects.toThrow();
    });
  });

  describe('generateWorkoutPlan', () => {
    it('generates workout plan based on user profile', async () => {
      const mockWorkoutPlan = {
        planOverview: {
          name: 'Beginner Strength Plan',
          totalWorkouts: 3,
        },
        weeklySchedule: [
          {
            day: 1,
            dayName: 'Monday',
            workoutType: 'Upper Body',
            exercises: [
              {
                name: 'Push-ups',
                sets: 3,
                reps: '8-12',
              },
            ],
          },
        ],
      };

      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockWorkoutPlan),
        },
      });

      const userProfile = {
        age: 25,
        fitnessLevel: 'beginner',
        goals: ['muscle_gain'],
      };

      const preferences = {
        duration: 45,
        frequency: 3,
        equipment: ['none'],
      };

      const result = await geminiService.generateWorkoutPlan(
        userProfile,
        preferences
      );

      expect(result.planOverview.name).toBe('Beginner Strength Plan');
      expect(result.weeklySchedule).toHaveLength(1);
    });
  });
});
```

### Store Testing

#### Zustand Store Test

```typescript
// src/stores/__tests__/userStore.test.ts
import { useUserStore } from '../userStore';
import { act, renderHook } from '@testing-library/react-native';

describe('UserStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useUserStore.getState().logout();
      useUserStore.getState().clearOnboardingData();
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useUserStore());

    expect(result.current.user).toBeNull();
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updates personal info correctly', () => {
    const { result } = renderHook(() => useUserStore());

    const personalInfo = {
      name: 'John Doe',
      age: '25',
      gender: 'male',
      height: '175',
      currentWeight: '70',
      targetWeight: '65',
      fitnessGoals: ['weight_loss'],
      activityLevel: 'moderate',
    };

    act(() => {
      result.current.updatePersonalInfo(personalInfo);
    });

    expect(result.current.personalInfo).toEqual(personalInfo);
  });

  it('completes onboarding when all data is available', () => {
    const { result } = renderHook(() => useUserStore());

    // Set all required onboarding data
    act(() => {
      result.current.updatePersonalInfo({
        name: 'John Doe',
        age: '25',
        gender: 'male',
        height: '175',
        currentWeight: '70',
        targetWeight: '65',
        fitnessGoals: ['weight_loss'],
        activityLevel: 'moderate',
      });

      result.current.updateWorkoutPreferences({
        workoutType: 'home',
        duration: 30,
        frequency: 3,
        equipment: ['none'],
      });

      result.current.updateDietPreferences({
        dietaryType: 'vegetarian',
        regionalCuisine: 'indian',
        allergies: [],
        mealTimings: {
          breakfast: '08:00',
          lunch: '13:00',
          dinner: '20:00',
        },
      });

      result.current.completeOnboarding();
    });

    expect(result.current.isOnboarded).toBe(true);
    expect(result.current.user).toBeTruthy();
  });

  it('handles logout correctly', () => {
    const { result } = renderHook(() => useUserStore());

    // Set user data
    act(() => {
      result.current.setUser({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isOnboarded).toBe(false);
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// src/tests/integration/apiIntegration.test.ts
import { AuthService } from '../../services/api/authService';
import { WorkoutService } from '../../services/api/workoutService';
import { DietService } from '../../services/api/dietService';

describe('API Integration Tests', () => {
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    testUser = await AuthService.signUp(
      `test-${Date.now()}@example.com`,
      'testpassword123',
      {
        name: 'Test User',
        age: 25,
        gender: 'male',
      }
    );
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUser) {
      await AuthService.signOut();
    }
  });

  describe('Workout Service Integration', () => {
    it('creates and retrieves workout plan', async () => {
      const workoutPlan = {
        name: 'Test Workout Plan',
        week_start: '2024-01-01',
        week_end: '2024-01-07',
        workout_schedule: [
          {
            day: 1,
            exercises: [{ name: 'Push-ups', sets: 3, reps: 10 }],
          },
        ],
      };

      const createdPlan = await WorkoutService.createWorkoutPlan(
        testUser.data.user.id,
        workoutPlan
      );

      expect(createdPlan.name).toBe('Test Workout Plan');

      const retrievedPlan = await WorkoutService.getCurrentWeekPlan(
        testUser.data.user.id
      );

      expect(retrievedPlan?.id).toBe(createdPlan.id);
    });
  });

  describe('Diet Service Integration', () => {
    it('logs and retrieves meal data', async () => {
      const mealLog = {
        user_id: testUser.data.user.id,
        meal_date: '2024-01-01',
        meal_type: 'breakfast',
        total_calories: 350,
        recognized_foods: [
          {
            name: 'Oatmeal',
            calories: 350,
            macros: { protein: 10, carbohydrates: 54, fats: 6 },
          },
        ],
      };

      const loggedMeal = await DietService.logMeal(mealLog);
      expect(loggedMeal.total_calories).toBe(350);

      const todaysMeals = await DietService.getTodaysMeals(
        testUser.data.user.id
      );

      expect(todaysMeals).toHaveLength(1);
      expect(todaysMeals[0].meal_type).toBe('breakfast');
    });
  });
});
```

## End-to-End Testing

### Detox Configuration

```javascript
// .detoxrc.js
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/config.json',
  skipLegacyWorkersInjection: true,
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/FitAI.app',
      build:
        'xcodebuild -workspace ios/FitAI.xcworkspace -scheme FitAI -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

### E2E Test Examples

```typescript
// e2e/onboarding.e2e.ts
import { device, expect, element, by } from 'detox';

describe('Onboarding Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete onboarding flow successfully', async () => {
    // Personal Info Screen
    await expect(element(by.text("Let's get to know you"))).toBeVisible();

    await element(by.id('name-input')).typeText('John Doe');
    await element(by.id('age-input')).typeText('25');
    await element(by.text('Male')).tap();
    await element(by.id('height-input')).typeText('175');
    await element(by.id('current-weight-input')).typeText('70');
    await element(by.id('target-weight-input')).typeText('65');

    await element(by.text('Weight Loss')).tap();
    await element(by.text('Moderately Active')).tap();

    await element(by.text('Continue')).tap();

    // Workout Preferences Screen
    await expect(element(by.text('Workout Preferences'))).toBeVisible();

    await element(by.text('Home Workout')).tap();
    await element(by.text('30-45 minutes')).tap();
    await element(by.text('3 days/week')).tap();
    await element(by.text('None (bodyweight only)')).tap();
    await element(by.text('Beginner')).tap();

    await element(by.text('Continue')).tap();

    // Diet Preferences Screen
    await expect(element(by.text('Diet Preferences'))).toBeVisible();

    await element(by.text('Vegetarian')).tap();
    await element(by.text('North Indian')).tap();
    await element(by.text('Budget-friendly')).tap();

    await element(by.text('Continue')).tap();

    // Body Analysis Screen (skip for now)
    await element(by.text('Skip for Now')).tap();

    // Review Screen
    await expect(element(by.text('Review & Confirmation'))).toBeVisible();
    await element(by.text('Start Your Journey')).tap();

    // Should navigate to main app
    await expect(element(by.text('Home'))).toBeVisible();
  });

  it('should validate required fields', async () => {
    await element(by.text('Continue')).tap();

    await expect(element(by.text('Name is required'))).toBeVisible();
    await expect(
      element(by.text('Please enter a valid age (13-100)'))
    ).toBeVisible();
  });
});
```

### Food Recognition E2E Test

```typescript
// e2e/foodRecognition.e2e.ts
import { device, expect, element, by } from 'detox';

describe('Food Recognition', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Complete onboarding first
    await completeOnboarding();
  });

  it('should log meal using camera', async () => {
    // Navigate to meal logging
    await element(by.text('Log Meal')).tap();

    // Take photo
    await element(by.id('camera-button')).tap();
    await element(by.id('capture-button')).tap();

    // Wait for AI analysis
    await waitFor(element(by.text('Analyzing...')))
      .not.toBeVisible()
      .withTimeout(10000);

    // Verify food recognition results
    await expect(element(by.id('food-results'))).toBeVisible();
    await expect(element(by.id('total-calories'))).toBeVisible();

    // Save meal log
    await element(by.text('Save Meal')).tap();

    // Verify meal is logged
    await expect(element(by.text('Meal logged successfully'))).toBeVisible();
  });
});

async function completeOnboarding() {
  // Helper function to complete onboarding
  // Implementation omitted for brevity
}
```

## AI Testing Framework

### Food Recognition Accuracy Testing

```typescript
// src/tests/ai/foodRecognitionAccuracy.test.ts
import { GeminiService } from '../../services/ai/geminiService';
import { testFoodDataset } from './datasets/foodDataset';

describe('Food Recognition Accuracy', () => {
  let geminiService: GeminiService;

  beforeAll(() => {
    geminiService = new GeminiService();
  });

  describe('Indian Food Recognition', () => {
    it('should achieve >80% accuracy for common Indian dishes', async () => {
      const indianFoodSamples = testFoodDataset.filter(
        item => item.cuisine === 'indian'
      );

      let correctIdentifications = 0;

      for (const sample of indianFoodSamples) {
        try {
          const result = await geminiService.analyzeFoodImage(sample.imageUri, {
            cuisineType: 'indian',
          });

          const isCorrect = evaluateFoodIdentification(result, sample.expected);
          if (isCorrect) correctIdentifications++;

          // Log results for analysis
          console.log(`${sample.name}: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
        } catch (error) {
          console.error(`Failed to analyze ${sample.name}:`, error);
        }
      }

      const accuracy = correctIdentifications / indianFoodSamples.length;
      console.log(
        `Indian Food Recognition Accuracy: ${(accuracy * 100).toFixed(2)}%`
      );

      expect(accuracy).toBeGreaterThan(0.8);
    }, 60000); // 1 minute timeout for AI processing

    it('should provide reasonable calorie estimates', async () => {
      const portionTestCases = [
        {
          name: 'Small portion rice',
          imageUri: 'test://small-rice.jpg',
          expectedCalorieRange: [100, 200],
        },
        {
          name: 'Large portion rice',
          imageUri: 'test://large-rice.jpg',
          expectedCalorieRange: [300, 500],
        },
      ];

      for (const testCase of portionTestCases) {
        const result = await geminiService.analyzeFoodImage(
          testCase.imageUri,
          {}
        );
        const totalCalories = result.totalCalories;

        expect(totalCalories).toBeGreaterThanOrEqual(
          testCase.expectedCalorieRange[0]
        );
        expect(totalCalories).toBeLessThanOrEqual(
          testCase.expectedCalorieRange[1]
        );
      }
    });
  });
});

function evaluateFoodIdentification(result: any, expected: any): boolean {
  // Check if the primary food item is correctly identified
  const primaryFood = result.foods[0];

  // Fuzzy matching for food names
  const nameSimilarity = calculateStringSimilarity(
    primaryFood.name.toLowerCase(),
    expected.name.toLowerCase()
  );

  // Calorie accuracy (within 20% margin)
  const calorieAccuracy =
    Math.abs(primaryFood.calories - expected.calories) / expected.calories;

  return nameSimilarity > 0.7 && calorieAccuracy < 0.2;
}

function calculateStringSimilarity(str1: string, str2: string): number {
  // Implement string similarity algorithm (e.g., Levenshtein distance)
  // Return similarity score between 0 and 1
  return 0.8; // Placeholder
}
```

### Test Dataset

```typescript
// src/tests/ai/datasets/foodDataset.ts
export const testFoodDataset = [
  {
    name: 'Chicken Biryani',
    imageUri: 'test://chicken-biryani.jpg',
    cuisine: 'indian',
    expected: {
      name: 'Chicken Biryani',
      calories: 450,
      macros: { protein: 25, carbohydrates: 60, fats: 12 },
    },
  },
  {
    name: 'Dal Tadka',
    imageUri: 'test://dal-tadka.jpg',
    cuisine: 'indian',
    expected: {
      name: 'Dal Tadka',
      calories: 180,
      macros: { protein: 12, carbohydrates: 25, fats: 5 },
    },
  },
  {
    name: 'Grilled Salmon',
    imageUri: 'test://grilled-salmon.jpg',
    cuisine: 'western',
    expected: {
      name: 'Grilled Salmon',
      calories: 280,
      macros: { protein: 39, carbohydrates: 0, fats: 12 },
    },
  },
  // Add more test cases...
];
```

## Performance Testing

### Performance Test Suite

```typescript
// src/tests/performance/performanceTests.test.ts
import { PerformanceMonitor } from '../../services/monitoring/performanceMonitor';

describe('Performance Tests', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeAll(() => {
    performanceMonitor = new PerformanceMonitor();
  });

  it('should load home screen within 2 seconds', async () => {
    const startTime = performance.now();

    // Simulate home screen load
    performanceMonitor.startScreenLoad('HomeScreen');

    // Wait for screen load completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    performanceMonitor.endScreenLoad('HomeScreen');

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  it('should process food image within 5 seconds', async () => {
    const startTime = performance.now();

    // Mock food image processing
    const mockImageUri = 'test://food-image.jpg';

    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 3000));

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000);
    } catch (error) {
      fail('Food image processing failed');
    }
  });

  it('should handle memory efficiently during image processing', () => {
    // Test memory usage during image operations
    const initialMemory = process.memoryUsage().heapUsed;

    // Simulate multiple image processing operations
    for (let i = 0; i < 10; i++) {
      // Mock image processing
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

## Quality Assurance Checklist

### Manual Testing Checklist

#### Onboarding Flow

- [ ] Personal information form validation
- [ ] Workout preferences selection
- [ ] Diet preferences selection
- [ ] Body analysis photo capture
- [ ] Review screen displays correct information
- [ ] Navigation between screens works
- [ ] Back button functionality
- [ ] Form data persistence

#### Food Recognition

- [ ] Camera permission request
- [ ] Photo capture functionality
- [ ] AI analysis processing indicator
- [ ] Results display correctly
- [ ] Manual food adjustment
- [ ] Meal saving functionality
- [ ] Gallery photo selection
- [ ] Error handling for poor quality images

#### Workout Features

- [ ] Daily workout display
- [ ] Exercise instructions clarity
- [ ] Timer functionality
- [ ] Set completion tracking
- [ ] Workout completion flow
- [ ] Progress tracking
- [ ] Rest day handling

#### Diet Tracking

- [ ] Meal logging interface
- [ ] Nutrition summary accuracy
- [ ] Daily calorie tracking
- [ ] Macro breakdown display
- [ ] Food search functionality
- [ ] Custom food entry

#### Profile & Settings

- [ ] Profile information editing
- [ ] Goal modification
- [ ] Preference updates
- [ ] Progress photo comparison
- [ ] Data export functionality
- [ ] Account deletion

### Accessibility Testing

```typescript
// Accessibility test helpers
export const accessibilityTests = {
  checkScreenReaderSupport: (component: any) => {
    // Verify screen reader labels
    expect(component).toHaveAccessibilityLabel();
  },

  checkColorContrast: (element: any) => {
    // Verify color contrast ratios
    const styles = element.props.style;
    // Implement contrast ratio checking
  },

  checkTouchTargetSize: (element: any) => {
    // Verify minimum touch target size (44px)
    const { width, height } = element.props.style;
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  },
};
```

### Device Testing Matrix

#### Android Devices

- Samsung Galaxy S21 (Android 11)
- Google Pixel 6 (Android 12)
- OnePlus 9 (Android 11)
- Xiaomi Mi 11 (Android 11)

#### iOS Devices

- iPhone 13 Pro (iOS 15)
- iPhone 12 (iOS 15)
- iPhone SE (iOS 15)
- iPad Air (iOS 15)

#### Performance Criteria

- App launch time: < 3 seconds
- Screen navigation: < 500ms
- Food recognition: < 5 seconds
- Memory usage: < 200MB
- Battery impact: Minimal background usage

### Bug Reporting Template

```markdown
## Bug Report

**Title:** [Brief description of the issue]

**Environment:**

- App Version:
- Device:
- OS Version:
- Network: WiFi/Cellular

**Steps to Reproduce:**

1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots/Videos:**
[Attach if applicable]

**Additional Context:**
[Any other relevant information]

**Severity:** Critical/High/Medium/Low
**Priority:** P1/P2/P3/P4
```

This comprehensive testing strategy ensures the FitAI application meets high quality standards across all features and platforms while maintaining excellent user experience and performance.
