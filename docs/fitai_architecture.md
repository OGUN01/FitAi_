# FitAI - Technical Architecture Document

## System Overview

FitAI is built as a modern, scalable mobile application using React Native and Expo, with a serverless backend powered by Supabase and AI capabilities through Google Gemini Flash 2.5.

### Architecture Principles
- **Mobile-First**: Optimized for Android devices with future iOS support
- **Offline-First**: Core functionality available without internet
- **AI-Enhanced**: Intelligent features powered by modern LLMs
- **Cost-Efficient**: Leveraging free tiers and open-source solutions
- **Scalable**: Built to handle growth from MVP to enterprise scale

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │     Backend     │    │   AI Services   │
│  (React Native) │    │   (Supabase)    │    │    (Gemini)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • UI Components │    │ • Database      │    │ • Food Recognition│
│ • State Mgmt    │◄──►│ • Auth          │◄──►│ • Body Analysis │
│ • Local Storage │    │ • Storage       │    │ • Plan Generation│
│ • Offline Cache │    │ • Edge Functions│    │ • Nutrition APIs│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture (React Native + Expo)

### Technology Stack
- **Framework**: React Native 0.73+ with Expo SDK 50+
- **Navigation**: React Navigation v6
- **State Management**: Zustand
- **UI Components**: Custom components with NativeWind (Tailwind CSS)
- **Image Handling**: Expo ImagePicker + React Native Image
- **Local Storage**: AsyncStorage + SQLite (via Expo SQLite)
- **HTTP Client**: Axios with interceptors
- **Camera**: Expo Camera

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Common components (buttons, inputs, etc.)
│   ├── forms/           # Form-specific components
│   ├── navigation/      # Navigation components
│   └── charts/          # Progress tracking charts
├── screens/             # Screen components
│   ├── onboarding/      # Onboarding flow screens
│   ├── main/            # Main app screens (Home, Workout, Diet, Profile)
│   ├── workout/         # Workout-related screens
│   ├── diet/            # Diet-related screens
│   └── profile/         # Profile and settings screens
├── services/            # API and external service integrations
│   ├── api/             # Backend API calls
│   ├── ai/              # AI service integrations
│   ├── nutrition/       # Nutrition API integrations
│   └── storage/         # Local storage utilities
├── stores/              # State management (Zustand stores)
│   ├── userStore.js     # User data and preferences
│   ├── workoutStore.js  # Workout plans and progress
│   ├── dietStore.js     # Diet plans and meal logs
│   └── appStore.js      # App-level state
├── utils/               # Utility functions
│   ├── constants.js     # App constants
│   ├── helpers.js       # Helper functions
│   ├── validation.js    # Form validation
│   └── formatters.js    # Data formatters
├── assets/              # Static assets
│   ├── images/          # Image assets
│   ├── icons/           # Icon files
│   └── fonts/           # Custom fonts
└── types/               # TypeScript type definitions
```

### State Management Strategy
Using Zustand for lightweight, performant state management:

```javascript
// stores/userStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      isOnboarded: false,
      preferences: {},
      
      setUser: (user) => set({ user }),
      setOnboarded: (status) => set({ isOnboarded: status }),
      updatePreferences: (prefs) => set({ 
        preferences: { ...get().preferences, ...prefs } 
      }),
      
      logout: () => set({ user: null, isOnboarded: false }),
    }),
    {
      name: 'user-storage',
    }
  )
);
```

### Offline-First Strategy

#### Local Data Storage
```javascript
// services/storage/localDatabase.js
import * as SQLite from 'expo-sqlite';

class LocalDatabase {
  constructor() {
    this.db = SQLite.openDatabase('fitai.db');
    this.initTables();
  }

  initTables() {
    this.db.transaction(tx => {
      // User data
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          data TEXT,
          updated_at DATETIME
        )
      `);
      
      // Workout plans
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS workout_plans (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          week_start DATE,
          data TEXT,
          created_at DATETIME
        )
      `);
      
      // Diet plans
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS diet_plans (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          week_start DATE,
          data TEXT,
          created_at DATETIME
        )
      `);
      
      // Meal logs
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS meal_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          date DATE,
          meal_type TEXT,
          data TEXT,
          synced BOOLEAN DEFAULT 0
        )
      `);
    });
  }
}
```

#### Sync Strategy
```javascript
// services/storage/syncManager.js
class SyncManager {
  async syncWhenOnline() {
    if (!navigator.onLine) return;
    
    try {
      await this.syncMealLogs();
      await this.syncProgress();
      await this.syncUserData();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  async syncMealLogs() {
    const unsyncedLogs = await this.getUnsyncedMealLogs();
    
    for (const log of unsyncedLogs) {
      try {
        await api.uploadMealLog(log);
        await this.markAsSynced(log.id);
      } catch (error) {
        console.error('Failed to sync meal log:', log.id);
      }
    }
  }
}
```

## Backend Architecture (Supabase)

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Personal Information
  name TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height DECIMAL(5,2), -- in cm
  current_weight DECIMAL(5,2), -- in kg
  target_weight DECIMAL(5,2), -- in kg
  
  -- Preferences
  fitness_goals TEXT[], -- array of goals
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  workout_preferences JSONB,
  diet_preferences JSONB,
  
  -- Settings
  units TEXT DEFAULT 'metric', -- metric or imperial
  timezone TEXT DEFAULT 'UTC',
  notifications_enabled BOOLEAN DEFAULT true
);
```

#### Workout Plans Table
```sql
CREATE TABLE workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  week_start DATE,
  week_end DATE,
  plan_type TEXT, -- 'ai_generated', 'custom', 'template'
  
  plan_data JSONB, -- Contains the full workout plan
  generation_params JSONB, -- Parameters used for AI generation
  
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, week_start)
);
```

#### Diet Plans Table
```sql
CREATE TABLE diet_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  plan_start DATE,
  plan_end DATE,
  plan_type TEXT, -- 'ai_generated', 'custom'
  
  daily_calorie_target INTEGER,
  macros JSONB, -- protein, carbs, fats targets
  meal_plan JSONB, -- 14-day meal plan data
  generation_params JSONB,
  
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, plan_start)
);
```

#### Meal Logs Table
```sql
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  meal_date DATE,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
  
  -- Food Recognition Data
  image_url TEXT, -- Stored in Supabase Storage
  recognized_foods JSONB, -- AI recognition results
  manual_adjustments JSONB, -- User corrections
  
  -- Nutritional Information
  total_calories INTEGER,
  macros JSONB, -- protein, carbs, fats
  confidence_score DECIMAL(3,2), -- AI confidence 0-1
  
  -- Metadata
  recognition_method TEXT DEFAULT 'ai', -- 'ai', 'manual', 'barcode'
  processing_time_ms INTEGER
);
```

#### Body Analysis Table
```sql
CREATE TABLE body_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  analysis_date DATE,
  
  -- Photos
  front_photo_url TEXT,
  side_photo_url TEXT,
  back_photo_url TEXT,
  
  -- AI Analysis Results
  ai_analysis JSONB, -- Body composition estimates
  confidence_scores JSONB, -- Confidence for each metric
  
  -- Manual Measurements (optional)
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  muscle_mass DECIMAL(5,2),
  measurements JSONB -- chest, waist, hips, etc.
);
```

#### Workout Sessions Table
```sql
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES workout_plans(id),
  
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  planned_workout JSONB, -- Original workout plan
  actual_workout JSONB, -- What was actually completed
  
  duration_minutes INTEGER,
  calories_burned INTEGER,
  completion_percentage DECIMAL(5,2),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  notes TEXT
);
```

### Supabase Configuration

#### Row Level Security (RLS) Policies
```sql
-- Users can only see their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Workout plans
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workout plans" ON workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout plans" ON workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Similar policies for other tables...
```

#### Storage Buckets
```javascript
// Storage configuration for images
const buckets = {
  'user-photos': {
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    fileSizeLimit: 10485760, // 10MB
  },
  'food-images': {
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    fileSizeLimit: 5242880, // 5MB
  }
};
```

### Edge Functions

#### Food Recognition Function
```javascript
// supabase/functions/food-recognition/index.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);

Deno.serve(async (req) => {
  try {
    const { imageBase64, userPreferences } = await req.json();
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
      Analyze this food image and provide a structured response:
      
      User preferences: ${JSON.stringify(userPreferences)}
      
      Return a JSON object with:
      {
        "foods": [
          {
            "name": "food name",
            "estimatedQuantity": "portion size with unit",
            "confidence": 0.95,
            "calories": 350,
            "macros": {
              "protein": 25,
              "carbs": 45,
              "fats": 12
            }
          }
        ],
        "totalCalories": 350,
        "confidence": 0.85,
        "suggestions": ["Add more vegetables", "Consider portion size"]
      }
    `;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const analysis = JSON.parse(result.response.text());
    
    return new Response(JSON.stringify(analysis), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

#### Workout Generation Function
```javascript
// supabase/functions/generate-workout/index.ts
export default async function generateWorkout(req) {
  const { userProfile, preferences, currentWeek } = await req.json();
  
  const prompt = `
    Generate a personalized 7-day workout plan for:
    
    User Profile:
    - Age: ${userProfile.age}
    - Fitness Level: ${userProfile.fitnessLevel}
    - Goals: ${userProfile.goals.join(', ')}
    - Available Equipment: ${preferences.equipment.join(', ')}
    - Workout Duration: ${preferences.duration}
    - Frequency: ${preferences.frequency} days/week
    
    Requirements:
    - Progressive difficulty
    - Balanced muscle groups
    - Rest days included
    - Alternative exercises for each movement
    - Warm-up and cool-down for each session
    
    Return structured JSON with daily workouts.
  `;
  
  const workout = await generateWithGemini(prompt);
  return workout;
}
```

## AI Services Integration

### Gemini Flash 2.5 Integration

#### Service Configuration
```javascript
// services/ai/geminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });
  }

  async analyzeFoodImage(imageUri, userPreferences = {}) {
    try {
      const imageBase64 = await this.convertImageToBase64(imageUri);
      
      const prompt = this.buildFoodAnalysisPrompt(userPreferences);
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Food analysis failed:', error);
      throw error;
    }
  }

  buildFoodAnalysisPrompt(preferences) {
    return `
      You are an expert nutritionist. Analyze this food image and provide detailed nutritional information.
      
      User Context:
      - Dietary preferences: ${preferences.dietaryType || 'None specified'}
      - Regional cuisine: ${preferences.regionalCuisine || 'Mixed'}
      - Allergies: ${preferences.allergies?.join(', ') || 'None'}
      - Goals: ${preferences.goals?.join(', ') || 'General health'}
      
      Analyze the image and return a JSON response with this exact structure:
      {
        "foods": [
          {
            "name": "specific food name",
            "estimatedQuantity": "amount with unit (e.g., '1 cup', '150g')",
            "confidence": 0.85,
            "calories": 250,
            "macros": {
              "protein": 15,
              "carbohydrates": 30,
              "fats": 8,
              "fiber": 5
            },
            "micronutrients": {
              "iron": 2.5,
              "calcium": 120,
              "vitaminC": 15
            },
            "ingredients": ["list", "of", "visible", "ingredients"]
          }
        ],
        "totalCalories": 250,
        "totalMacros": {
          "protein": 15,
          "carbohydrates": 30,
          "fats": 8,
          "fiber": 5
        },
        "overallConfidence": 0.85,
        "nutritionalAnalysis": {
          "healthScore": 7.5,
          "recommendations": ["Add more vegetables", "Consider portion size"],
          "warnings": ["High sodium content"]
        },
        "culturalContext": {
          "cuisine": "North Indian",
          "mealType": "lunch",
          "traditionalPairing": ["yogurt", "pickle"]
        }
      }
      
      Important guidelines:
      1. Be conservative with calorie estimates - better to underestimate than overestimate
      2. If multiple portions are visible, estimate for the total visible amount
      3. Consider cooking methods (fried vs grilled affects calories significantly)
      4. Account for hidden ingredients like oil, ghee, or sugar
      5. Provide confidence scores based on visibility and recognition certainty
      6. For Indian dishes, consider regional variations and typical preparation methods
      7. If you cannot identify a food item clearly, mention it in the confidence score
      8. Provide actionable nutritional recommendations
    `;
  }

  async analyzeBodyPhotos(photos, previousAnalysis = null) {
    const prompt = `
      You are a fitness expert analyzing body composition from photos.
      
      Analyze these body photos and provide insights:
      - Front view: ${photos.front ? 'Available' : 'Not provided'}
      - Side view: ${photos.side ? 'Available' : 'Not provided'}
      - Back view: ${photos.back ? 'Available' : 'Not provided'}
      
      Previous analysis for comparison: ${previousAnalysis ? 'Available' : 'First analysis'}
      
      Provide analysis in this JSON format:
      {
        "bodyComposition": {
          "estimatedBodyFat": 15.5,
          "muscleDefinition": "moderate",
          "posture": "good",
          "bodyType": "mesomorph"
        },
        "measurements": {
          "confidence": 0.7,
          "estimatedMeasurements": {
            "chest": "estimated based on proportions",
            "waist": "estimated based on proportions"
          }
        },
        "progress": {
          "comparison": "first analysis or comparison with previous",
          "changes": ["list of observed changes"],
          "recommendations": ["specific actionable advice"]
        },
        "confidence": 0.75,
        "limitations": ["factors affecting accuracy"]
      }
      
      Be conservative and clearly state limitations of photo-based analysis.
    `;
    
    return await this.generateStructuredResponse(prompt, photos);
  }

  async generateWorkoutPlan(userProfile, preferences) {
    const prompt = `
      Create a personalized 7-day workout plan based on:
      
      User Profile:
      - Age: ${userProfile.age}
      - Gender: ${userProfile.gender}
      - Fitness Level: ${userProfile.fitnessLevel}
      - Goals: ${userProfile.goals.join(', ')}
      - Available Time: ${preferences.duration} minutes
      - Frequency: ${preferences.frequency} days/week
      - Equipment: ${preferences.equipment.join(', ')}
      - Workout Type: ${preferences.workoutType}
      
      Generate a structured workout plan:
      {
        "weekPlan": [
          {
            "day": 1,
            "dayName": "Monday",
            "workoutType": "Upper Body Strength",
            "duration": 45,
            "exercises": [
              {
                "name": "Push-ups",
                "sets": 3,
                "reps": "8-12",
                "restTime": 60,
                "instructions": "detailed form instructions",
                "modifications": {
                  "easier": "knee push-ups",
                  "harder": "decline push-ups"
                },
                "muscleGroups": ["chest", "triceps", "shoulders"],
                "equipment": "none"
              }
            ],
            "warmup": [
              {
                "exercise": "arm circles",
                "duration": 30,
                "instructions": "slow controlled movements"
              }
            ],
            "cooldown": [
              {
                "exercise": "chest stretch",
                "duration": 30,
                "instructions": "hold stretch gently"
              }
            ]
          }
        ],
        "weekSummary": {
          "totalWorkouts": 4,
          "muscleGroupsTargeted": ["all major groups"],
          "progressionNotes": "increase weight/reps each week",
          "restDays": [3, 6, 7]
        },
        "adaptations": {
          "homeAlternatives": "alternatives if gym not available",
          "timeConstraints": "15-minute quick versions",
          "equipmentSubstitutions": "bodyweight alternatives"
        }
      }
    `;
    
    return await this.generateStructuredResponse(prompt);
  }

  async generateDietPlan(userProfile, preferences) {
    const prompt = `
      Create a personalized 14-day diet plan for:
      
      User Profile:
      - Age: ${userProfile.age}, Gender: ${userProfile.gender}
      - Current Weight: ${userProfile.currentWeight}kg
      - Target Weight: ${userProfile.targetWeight}kg
      - Goals: ${userProfile.goals.join(', ')}
      - Activity Level: ${userProfile.activityLevel}
      - Daily Calorie Target: ${this.calculateCalorieTarget(userProfile)}
      
      Dietary Preferences:
      - Type: ${preferences.dietaryType}
      - Regional Cuisine: ${preferences.regionalCuisine}
      - Allergies: ${preferences.allergies?.join(', ') || 'None'}
      - Meal Timings: ${JSON.stringify(preferences.mealTimings)}
      - Budget: ${preferences.budget}
      
      Generate 14-day meal plan with this structure:
      {
        "dailyTargets": {
          "calories": 2000,
          "protein": 150,
          "carbohydrates": 250,
          "fats": 65,
          "fiber": 30
        },
        "mealPlan": [
          {
            "day": 1,
            "date": "calculated date",
            "meals": {
              "breakfast": {
                "name": "Protein Oats Bowl",
                "ingredients": [
                  {
                    "item": "rolled oats",
                    "quantity": "50g",
                    "calories": 185
                  }
                ],
                "totalCalories": 350,
                "macros": { "protein": 15, "carbs": 45, "fats": 8 },
                "prepTime": 10,
                "cookingInstructions": "step by step",
                "tips": "preparation tips",
                "alternatives": ["substitution options"]
              },
              "lunch": { "similar structure" },
              "snack": { "if applicable" },
              "dinner": { "similar structure" }
            },
            "dailyTotal": {
              "calories": 1950,
              "macros": { "protein": 145, "carbs": 230, "fats": 60 }
            }
          }
        ],
        "shoppingList": {
          "week1": ["grouped by category"],
          "week2": ["second week items"]
        },
        "mealPrepTips": ["batch cooking suggestions"],
        "swapOptions": {
          "proteins": ["equivalent protein sources"],
          "carbs": ["equivalent carb sources"],
          "vegetables": ["seasonal alternatives"]
        }
      }
      
      Ensure meals are:
      1. Culturally appropriate for the specified region
      2. Budget-friendly and accessible
      3. Nutritionally balanced
      4. Varied to prevent boredom
      5. Suitable for meal prep where possible
    `;
    
    return await this.generateStructuredResponse(prompt);
  }
}
```

### Nutrition APIs Integration

#### API Router Service
```javascript
// services/nutrition/nutritionApiRouter.js
class NutritionApiRouter {
  constructor() {
    this.apis = {
      fatSecret: new FatSecretAPI(),
      apiNinjas: new ApiNinjasAPI(),
      usda: new USDAFoodDataAPI(),
      bonHappetee: new BonHappeteeAPI() // For Indian foods
    };
    
    this.cache = new NutritionCache();
  }

  async getNutritionData(foodName, quantity = '100g') {
    // Check cache first
    const cacheKey = `${foodName}_${quantity}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Try APIs in order of preference
    const apiOrder = this.determineApiOrder(foodName);
    
    for (const apiName of apiOrder) {
      try {
        const result = await this.apis[apiName].search(foodName, quantity);
        if (result && result.confidence > 0.7) {
          await this.cache.set(cacheKey, result, 86400); // 24 hour cache
          return result;
        }
      } catch (error) {
        console.warn(`${apiName} failed for ${foodName}:`, error.message);
        continue;
      }
    }

    return null; // All APIs failed
  }

  determineApiOrder(foodName) {
    const indianFoodKeywords = ['dal', 'curry', 'biryani', 'roti', 'sabzi', 'samosa'];
    const isIndianFood = indianFoodKeywords.some(keyword => 
      foodName.toLowerCase().includes(keyword)
    );

    if (isIndianFood) {
      return ['bonHappetee', 'fatSecret', 'apiNinjas', 'usda'];
    } else {
      return ['fatSecret', 'apiNinjas', 'usda', 'bonHappetee'];
    }
  }
}
```

## Performance Optimization

### Image Processing Optimization
```javascript
// utils/imageProcessor.js
class ImageProcessor {
  static async compressForAI(imageUri, maxSize = 1024) {
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: maxSize } }
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    return manipResult.uri;
  }

  static async generateThumbnail(imageUri, size = 200) {
    return await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: size, height: size } }
      ],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
  }
}
```

### Caching Strategy
```javascript
// services/cache/cacheManager.js
class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemorySize = 50; // MB
    this.currentMemorySize = 0;
  }

  async get(key) {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.expiry > Date.now()) {
          // Add to memory cache
          this.memoryCache.set(key, data.value);
          return data.value;
        } else {
          // Expired, remove
          await AsyncStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    return null;
  }

  async set(key, value, ttlSeconds = 3600) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    const cacheData = { value, expiry };

    // Store in memory cache
    this.memoryCache.set(key, value);

    // Store in AsyncStorage
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }
}
```

## Security Considerations

### API Key Management
```javascript
// config/security.js
class SecurityManager {
  static getApiKey(service) {
    // Use Expo SecureStore for production
    return process.env[`EXPO_PUBLIC_${service.toUpperCase()}_API_KEY`];
  }

  static async storeSecurely(key, value) {
    if (__DEV__) {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }

  static async getSecurely(key) {
    if (__DEV__) {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  }
}
```

### Data Privacy
```javascript
// services/privacy/dataPrivacy.js
class DataPrivacyManager {
  static async encryptSensitiveData(data) {
    // Implement client-side encryption for sensitive data
    // Use expo-crypto for hashing and encryption
  }

  static async anonymizeUserData(userData) {
    return {
      ...userData,
      email: this.hashEmail(userData.email),
      name: 'User',
      // Remove or hash other PII
    };
  }

  static async requestDataDeletion(userId) {
    // Implement GDPR-compliant data deletion
    await supabase.rpc('delete_user_data', { user_id: userId });
  }
}
```

## Monitoring and Analytics

### Performance Monitoring
```javascript
// services/monitoring/performanceMonitor.js
class PerformanceMonitor {
  static startTiming(operation) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.logPerformance(operation, duration);
        return duration;
      }
    };
  }

  static logPerformance(operation, duration) {
    // Log to analytics service
    console.log(`Performance: ${operation} took ${duration}ms`);
    
    if (duration > this.getThreshold(operation)) {
      console.warn(`Slow operation detected: ${operation}`);
    }
  }

  static getThreshold(operation) {
    const thresholds = {
      'food_recognition': 5000, // 5 seconds
      'workout_generation': 10000, // 10 seconds
      'image_upload': 15000, // 15 seconds
    };
    
    return thresholds[operation] || 3000;
  }
}
```

### Error Tracking
```javascript
// services/monitoring/errorTracker.js
class ErrorTracker {
  static logError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId(),
      appVersion: Constants.manifest?.version,
      platform: Platform.OS,
    };

    // Log locally for development
    console.error('Error logged:', errorData);

    // Send to error tracking service in production
    if (!__DEV__) {
      this.sendToErrorService(errorData);
    }
  }

  static async sendToErrorService(errorData) {
    try {
      await fetch('https://your-error-service.com/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      });
    } catch (err) {
      console.warn('Failed to send error to service:', err);
    }
  }
}
```

## Deployment Architecture

### Environment Configuration
```javascript
// config/environment.js
const environments = {
  development: {
    supabaseUrl: 'https://your-dev-project.supabase.co',
    supabaseKey: 'your-dev-anon-key',
    geminiApiKey: 'your-dev-gemini-key',
    apiBaseUrl: 'http://localhost:3000',
  },
  staging: {
    supabaseUrl: 'https://your-staging-project.supabase.co',
    supabaseKey: 'your-staging-anon-key',
    geminiApiKey: 'your-staging-gemini-key',
    apiBaseUrl: 'https://api-staging.fitai.app',
  },
  production: {
    supabaseUrl: 'https://your-prod-project.supabase.co',
    supabaseKey: 'your-prod-anon-key',
    geminiApiKey: 'your-prod-gemini-key',
    apiBaseUrl: 'https://api.fitai.app',
  }
};

export const config = environments[process.env.NODE_ENV || 'development'];
```

### Build Configuration
```javascript
// app.config.js
export default {
  expo: {
    name: 'FitAI',
    slug: 'fitai',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.fitai.app'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },
      package: 'com.fitai.app',
      versionCode: 1,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'INTERNET',
        'ACCESS_NETWORK_STATE'
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      eas: {
        projectId: 'your-eas-project-id'
      }
    }
  }
};
```

## Scalability Considerations

### Database Optimization
- **Indexing Strategy**: Create indexes on frequently queried columns
- **Query Optimization**: Use database views for complex queries
- **Data Archiving**: Archive old data to maintain performance
- **Connection Pooling**: Use Supabase connection pooling for high traffic

### API Rate Limiting
```javascript
// services/api/rateLimiter.js
class RateLimiter {
  constructor() {
    this.limits = {
      gemini: { calls: 1000, window: 3600 }, // 1000 calls per hour
      nutrition: { calls: 5000, window: 86400 }, // 5000 calls per day
    };
    
    this.usage = new Map();
  }

  async checkLimit(service, userId) {
    const key = `${service}_${userId}`;
    const now = Date.now();
    const limit = this.limits[service];
    
    if (!this.usage.has(key)) {
      this.usage.set(key, { count: 0, resetTime: now + (limit.window * 1000) });
    }
    
    const usage = this.usage.get(key);
    
    if (now > usage.resetTime) {
      usage.count = 0;
      usage.resetTime = now + (limit.window * 1000);
    }
    
    if (usage.count >= limit.calls) {
      throw new Error(`Rate limit exceeded for ${service}`);
    }
    
    usage.count++;
    return true;
  }
}
```

This comprehensive architecture document provides a solid foundation for building FitAI as a scalable, maintainable, and user-friendly fitness application. The modular design allows for incremental development and future enhancements while maintaining code quality and performance standards.