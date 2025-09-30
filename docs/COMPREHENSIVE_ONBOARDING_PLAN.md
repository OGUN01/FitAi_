# 🎯 COMPREHENSIVE ONBOARDING PLAN
## **Production-Ready Tabbed Onboarding System**

---

## **📋 OVERVIEW**

**Current System:** Sequential step-based onboarding (welcome → signup → personal-info → body-analysis → workout-preferences → diet-preferences → review)

**New System:** 5-Tab comprehensive onboarding interface:
1. **Personal Info Tab**
2. **Diet Preferences Tab** 
3. **Body Analysis Tab**
4. **Workout Preferences Tab**
5. **Advanced Review Tab**

**Goal:** Create $1M production-ready app with maximum user data collection for tracking, prediction, and progress monitoring while keeping features **SIMPLE and RELIABLE**.

---

## **🏗️ SYSTEM ARCHITECTURE**

### **Tab Navigation System**
- **Tab Bar Component**: Custom onboarding tab bar with progress indicators
- **Tab Container**: Manages state across all tabs with real-time validation
- **Progress Tracking**: Visual completion status for each tab
- **Navigation Rules**: 
  - Users can jump between any tabs freely
  - Incomplete tabs show warning indicators
  - Final submission requires all mandatory fields

### **Data Flow**
```
User Input → Real-time Validation → Auto-save → Tab Completion Status → Final Review → Database Storage
```

---

## **📱 TAB 1: PERSONAL INFO**

### **Purpose**
Collect essential demographic and basic lifestyle information.

### **Fields & Components**

#### **Basic Demographics**
```typescript
interface PersonalInfoData {
  // Name Information
  firstName: string;           // Text input, required
  lastName: string;            // Text input, required
  
  // Age & Gender
  age: number;                 // Numeric input, range 13-120, required
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'; // Dropdown, required
  
  // Location (3-tier system)
  country: string;             // Dropdown with all countries, required
  state: string;               // Dropdown populated based on country, required  
  region?: string;             // Text input, optional
  
  // Sleep Schedule
  wakeTime: string;            // Time picker (HH:MM format), required
  sleepTime: string;           // Time picker (HH:MM format), required
}
```

#### **UI Components**
- **Name Section**: Two text inputs side by side (First Name | Last Name)
- **Demographics Section**: Age (numeric) + Gender (dropdown) in row layout
- **Location Section**: Country dropdown → State dropdown → Region text input
- **Sleep Schedule Section**: Wake time picker + Sleep time picker with icons

#### **Validation Rules**
- All required fields must be completed
- Age must be 13-120 years
- Sleep/wake times must be valid time format
- Country/state must be from predefined lists

#### **Data Usage**
- **BMR Calculations**: Age, gender for metabolic rate formulas
- **Personalization**: Location for timezone, cultural food preferences
- **Sleep Analysis**: Calculate sleep duration, sleep quality factors

---

## **📱 TAB 2: DIET PREFERENCES**

### **Purpose**
Comprehensive dietary profiling including current habits, readiness for specific diets, meal preferences, and health habits.

### **Fields & Components**

#### **Current Diet Information (Existing + Enhanced)**
```typescript
interface DietPreferencesData {
  // Existing diet data (keep current implementation)
  dietType: 'vegetarian' | 'vegan' | 'non-veg' | 'pescatarian';
  allergies: string[];         // Multi-select with custom input
  cuisinePreferences: string[]; // Multi-select with custom input  
  restrictions: string[];       // Multi-select with custom input
  
  // NEW: Diet Readiness Toggles
  dietReadiness: {
    keto: boolean;                    // Toggle: Ready for ketogenic diet
    intermittentFasting: boolean;     // Toggle: Ready for IF (16:8, 18:6, etc.)
    paleo: boolean;                   // Toggle: Ready for paleo diet
    mediterranean: boolean;           // Toggle: Ready for mediterranean diet
    lowCarb: boolean;                 // Toggle: Ready for low-carb diet
    highProtein: boolean;             // Toggle: Ready for high-protein diet
  };
  
  // NEW: Meal Preferences (Enable/Disable System)
  mealPreferences: {
    breakfastEnabled: boolean;        // If disabled, only generate lunch/dinner
    lunchEnabled: boolean;            // Default: true
    dinnerEnabled: boolean;           // Default: true
    snacksEnabled: boolean;           // Include snacks in meal plans
  };
  
  // NEW: Cooking & Budget Preferences
  cookingPreferences: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    maxPrepTime: number;              // Minutes willing to spend cooking
    budgetLevel: 'low' | 'medium' | 'high';
  };
  
  // NEW: Health Habits (Yes/No Toggles)
  healthHabits: {
    // Hydration
    drinksEnoughWater: boolean;       // 3-4L daily water intake
    limitsSugaryDrinks: boolean;      // Avoids sodas, juices
    
    // Eating Patterns  
    eatsRegularMeals: boolean;        // Consistent meal timing
    avoidsLateNightEating: boolean;   // No eating 3hrs before bed
    controlsPortionSizes: boolean;    // Mindful portion control
    readsNutritionLabels: boolean;    // Checks food labels
    
    // Food Choices
    eatsProcessedFoods: boolean;      // Regularly eats packaged foods
    eats5ServingsFruitsVeggies: boolean; // Daily fruit/veggie intake
    limitsRefinedSugar: boolean;      // Reduces added sugars
    includesHealthyFats: boolean;     // Nuts, avocado, olive oil
    
    // Substances
    drinksAlcohol: boolean;           // Regular alcohol consumption  
    smokesTobacco: boolean;           // Tobacco use
    drinksCoffee: boolean;            // Daily caffeine intake
    takesSupplements: boolean;        // Vitamins, protein powder, etc.
  };
}
```

#### **UI Components**

**Section 1: Current Diet (Existing UI)**
- Diet type selection cards
- Multi-select dropdowns for allergies, cuisines, restrictions

**Section 2: Diet Readiness (NEW)**
- Toggle grid layout with 6 diet types
- Each toggle has icon + description
- "Learn More" links for diet information

**Section 3: Meal Preferences (NEW)**  
- 4 meal toggles with visual meal icons
- Warning message when breakfast disabled: "Meal plans will only include lunch and dinner"

**Section 4: Cooking Preferences (NEW)**
- Skill level: 3 cards (Beginner/Intermediate/Advanced)  
- Prep time: Slider (15-120 minutes)
- Budget: 3 cards (Low/Medium/High) with $ symbols

**Section 5: Health Habits (NEW)**
- Organized in 4 categories with toggle switches:
  - **Hydration** (2 toggles)
  - **Eating Patterns** (4 toggles)  
  - **Food Choices** (4 toggles)
  - **Substances** (4 toggles)

#### **Validation Rules**
- At least 1 cuisine preference required
- If all meals disabled, show error
- Health habits are optional but recommended

#### **Data Usage & Dependencies**
- **Meal Plan Generation**: Only generate enabled meals
- **Calorie Distribution**: Adjust based on active meals
- **Diet Recommendations**: Use readiness toggles for suggestions
- **Habit Scoring**: Calculate diet readiness score from habits

---

## **📱 TAB 3: BODY ANALYSIS**

### **Purpose**
Comprehensive body composition analysis using **RELIABLE** photo analysis + manual measurements + medical information.

### **Fields & Components**

#### **Basic Measurements**
```typescript
interface BodyAnalysisData {
  // Physical Measurements
  heightCm: number;                 // Height in centimeters, required
  currentWeightKg: number;          // Current weight in kg, required
  targetWeightKg: number;           // Goal weight in kg, required
  targetTimelineWeeks: number;      // Weeks to reach goal, required
  
  // Body Composition (Manual Input)
  bodyFatPercentage?: number;       // Optional, user-provided or estimated
  waistCm?: number;                 // Waist circumference, optional
  hipCm?: number;                   // Hip circumference, optional
  chestCm?: number;                 // Chest circumference, optional
  
  // Photo Analysis (RELIABLE FEATURES ONLY)
  photos: {
    front?: string;                 // Front-facing photo URL
    side?: string;                  // Side profile photo URL  
    back?: string;                  // Back-facing photo URL
  };
  
  // AI Analysis Results (RELIABLE ONLY)
  aiAnalysis?: {
    estimatedBodyFat: number;       // Body fat % estimation (±3-5% accuracy)
    bodyType: 'ectomorph' | 'mesomorph' | 'endomorph'; // Body type classification
    confidenceScore: number;        // AI confidence (0-100)
  };
  
  // Medical Information
  medicalConditions: string[];      // Pre-defined list + custom input
  medications: string[];            // Current medications
  physicalLimitations: string[];    // Exercise limitations
  
  // Calculated Values (Auto-computed)
  bmi: number;                      // BMI calculation
  bmr: number;                      // Basal Metabolic Rate
  idealWeightRange: {               // Healthy weight range
    min: number;
    max: number;
  };
  waistHipRatio?: number;          // If both waist/hip provided
}
```

#### **UI Components**

**Section 1: Basic Measurements**
- Height input with cm/inches toggle
- Current weight with kg/lbs toggle  
- Target weight with goal visualization
- Timeline slider (4-52 weeks) with realistic recommendations

**Section 2: Body Composition (Optional)**
- Body fat % input with help text about measurement methods
- Circumference measurements with measurement guide images
- "Skip for now" option with explanation

**Section 3: Photo Analysis (RELIABLE ONLY)**
- 3 photo upload cards (Front/Side/Back)
- Photo guidelines with example images
- AI analysis button (only after photos uploaded)
- Results display with confidence score
- **REMOVED**: 3D reconstruction, complex biomechanical analysis

**Section 4: Medical Information**
- Medical conditions: Multi-select dropdown with common conditions
- Medications: Text input with autocomplete
- Physical limitations: Multi-select with common limitations
- "Add custom" options for all fields

**Section 5: Calculated Results**
- BMI display with health category
- Ideal weight range visualization
- BMR calculation display
- Waist-hip ratio (if measurements provided)

#### **Reliable AI Analysis Features**
✅ **Body Fat Percentage Estimation** (±3-5% accuracy)
✅ **Body Type Classification** (Ectomorph/Mesomorph/Endomorph)  
✅ **Basic Posture Assessment** (Shoulder alignment, general posture)
✅ **Progress Comparison** (Photo-to-photo changes over time)

❌ **REMOVED Complex Features:**
- 3D body reconstruction
- Detailed biomechanical assessment  
- Visceral fat estimation
- Complex joint alignment analysis
- Movement efficiency analysis

#### **Validation Rules**
- Height and current weight required
- Target weight must be realistic (within healthy BMI range)
- Timeline must allow for healthy weight loss rate (0.5-1kg/week)
- Photos optional but recommended for better analysis

#### **Data Usage**
- **BMI/BMR Calculations**: Height, weight, age, gender
- **Goal Setting**: Target weight and timeline validation
- **AI Recommendations**: Use body type for workout/diet suggestions
- **Progress Tracking**: Photo comparisons and measurement changes

---

## **📱 TAB 4: WORKOUT PREFERENCES**

### **Purpose**
Comprehensive fitness profiling including current activity, goals, preferences, and fitness assessment.

### **Fields & Components**

#### **Enhanced Workout Data**
```typescript
interface WorkoutPreferencesData {
  // Existing workout data (keep current implementation)
  location: 'home' | 'gym' | 'both';
  equipment: string[];              // Available equipment
  timePreference: number;           // Workout duration in minutes
  intensity: 'beginner' | 'intermediate' | 'advanced';
  workoutTypes: string[];           // Preferred workout types
  
  // NEW: Fitness Goals & Activity Level (moved from Personal Info)
  primaryGoals: string[];           // Multiple goals allowed
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme';
  
  // NEW: Current Fitness Assessment
  currentFitness: {
    workoutExperienceYears: number;     // Years of regular exercise
    workoutFrequencyPerWeek: number;    // Current weekly frequency
    canDoPushups: number;               // Max pushups in a row
    canRunMinutes: number;              // Can run continuously for X minutes
    flexibilityLevel: 'poor' | 'fair' | 'good' | 'excellent';
  };
  
  // NEW: Weight & Timeline Goals
  weightGoals: {
    currentWeightKg: number;            // From body analysis tab
    targetWeightKg: number;             // From body analysis tab  
    targetTimelineWeeks: number;        // From body analysis tab
    weeklyWeightLossGoal: number;       // Calculated safe rate
  };
  
  // NEW: Workout Preferences
  preferences: {
    preferredWorkoutTimes: string[];    // 'morning', 'afternoon', 'evening'
    enjoysCardio: boolean;              // Likes cardio workouts
    enjoysStrengthTraining: boolean;    // Likes weight training
    enjoysGroupClasses: boolean;        // Prefers group fitness
    prefersOutdoorActivities: boolean;  // Outdoor vs indoor preference
    needsMotivation: boolean;           // Requires external motivation
    prefersVariety: boolean;            // Likes workout variety vs routine
  };
}
```

#### **UI Components**

**Section 1: Current Activity Level (moved from Tab 1)**
- 5 activity level cards with descriptions
- Visual icons showing activity levels
- Auto-populate from previous selections if available

**Section 2: Primary Fitness Goals**
- Grid of goal cards with icons (Weight Loss, Muscle Gain, Strength, Endurance, etc.)
- Multi-select with visual selection indicators
- Goal priority ranking (drag to reorder)

**Section 3: Current Fitness Assessment**
- Experience years: Slider (0-20+ years)
- Current frequency: Number picker (0-7 days/week)  
- Fitness tests: Simple input fields with help text
- Flexibility: 4-option selector with descriptions

**Section 4: Weight Goals (Auto-populated from Tab 3)**
- Display current/target weight from Body Analysis
- Show calculated weekly weight loss rate
- Timeline visualization with milestones
- Safety warnings for unrealistic goals

**Section 5: Workout Location & Equipment (existing)**
- Location selection cards
- Equipment multi-select with search
- Time preference slider with formatted display

**Section 6: Workout Preferences**
- Time of day: Multi-select chips
- Workout type preferences: Toggle switches with icons
- Motivation and variety preferences: Yes/No toggles

#### **Validation Rules**
- At least 1 primary goal required
- Activity level required
- Workout types selection required (min 1)
- Realistic fitness assessment values

#### **Data Dependencies**
- **Auto-populate weight data** from Body Analysis tab
- **Adjust recommendations** based on medical conditions from Tab 3
- **Modify intensity** suggestions based on experience and current fitness

#### **Data Usage**
- **TDEE Calculation**: Activity level for metabolic rate
- **Workout Plan Generation**: All preferences for personalized plans
- **Goal Timeline**: Realistic timeline based on current fitness + goals
- **Equipment Matching**: Only suggest exercises for available equipment

---

## **📱 TAB 5: ADVANCED REVIEW**

### **Purpose**
Comprehensive data review with **MATHEMATICAL CALCULATIONS** and personalized insights (NO AI recommendations yet - just mathematical formulas).

### **Fields & Components**

#### **Review Data Structure**
```typescript
interface AdvancedReviewData {
  // Data Summary from all tabs
  personalInfo: PersonalInfoData;
  dietPreferences: DietPreferencesData;  
  bodyAnalysis: BodyAnalysisData;
  workoutPreferences: WorkoutPreferencesData;
  
  // Mathematical Calculations (50+ formulas)
  calculations: {
    // Basic Metabolic Calculations
    bmi: number;                        // Body Mass Index
    bmr: number;                        // Basal Metabolic Rate  
    tdee: number;                       // Total Daily Energy Expenditure
    metabolicAge: number;               // Metabolic age vs chronological
    
    // Daily Nutritional Needs
    dailyCalories: number;              // For current goals
    dailyProteinG: number;              // Protein requirements
    dailyCarbsG: number;                // Carbohydrate requirements
    dailyFatG: number;                  // Fat requirements
    dailyWaterML: number;               // Hydration requirements
    dailyFiberG: number;                // Fiber requirements
    
    // Weight Management
    healthyWeightRange: {               // Ideal weight range
      min: number;
      max: number;
    };
    weeklyWeightLossRate: number;       // Safe weekly loss rate
    estimatedTimelineWeeks: number;     // Realistic timeline to goal
    totalCalorieDeficit: number;        // Weekly deficit needed
    
    // Body Composition
    idealBodyFatPercentage: {           // Healthy BF% range for age/gender
      min: number;
      max: number;
    };
    leanBodyMass: number;               // Estimated lean mass
    fatMass: number;                    // Estimated fat mass
    waistHipRatio?: number;             // If measurements provided
    
    // Fitness Metrics
    estimatedVO2Max: number;            // Cardiovascular fitness estimate
    targetHeartRateZones: {             // Training zones
      fatBurn: { min: number; max: number };
      cardio: { min: number; max: number };
      peak: { min: number; max: number };
    };
    recommendedWorkoutFrequency: number; // Days per week
    recommendedCardioMinutes: number;    // Weekly cardio minutes
    recommendedStrengthSessions: number; // Weekly strength sessions
    
    // Health Scores (0-100 ratings)
    overallHealthScore: number;         // Composite health rating
    dietReadinessScore: number;         // Diet habit assessment  
    fitnessReadinessScore: number;      // Fitness preparation score
    goalRealisticScore: number;         // Goal achievability rating
    
    // Sleep Analysis
    recommendedSleepHours: number;      // Age-appropriate sleep need
    currentSleepDuration: number;       // Based on wake/sleep times
    sleepEfficiencyScore: number;       // Sleep quality assessment
  };
  
  // Personalization Metrics
  completionMetrics: {
    dataCompleteness: number;           // % of fields completed
    reliabilityScore: number;           // Data consistency score
    personalizationLevel: number;       // Customization depth
  };
}
```

#### **UI Components & Sections**

**Section 1: Data Summary Cards**
- **Personal Overview**: Name, age, location, sleep schedule
- **Diet Profile**: Diet type, preferences, habits summary  
- **Body Composition**: Current stats, goals, measurements
- **Fitness Profile**: Activity level, goals, preferences
- Edit buttons for each section to jump back to tabs

**Section 2: Mathematical Insights Dashboard**

**Metabolic Profile Card:**
- BMI with health category and visual gauge
- BMR and TDEE with explanations
- Metabolic age comparison to chronological age
- Daily calorie needs breakdown

**Nutritional Requirements Card:**
- Daily macronutrient breakdown (protein/carbs/fat)
- Hydration requirements with tips
- Fiber and micronutrient needs
- Meal distribution based on enabled meals

**Weight Management Plan:**
- Current vs ideal weight range visualization
- Realistic timeline with weekly milestones
- Required calorie deficit explanation
- Progress projection chart

**Body Composition Analysis:**
- Current body composition breakdown
- Ideal body fat percentage ranges
- Waist-hip ratio assessment (if available)
- Body type implications for fitness

**Fitness Recommendations:**
- VO2 Max estimation with fitness level
- Heart rate training zones
- Weekly workout structure recommendation
- Exercise type distribution

**Health Assessment Scores:**
- Overall health score with breakdown
- Diet readiness assessment
- Fitness preparation score  
- Goal realistic rating
- Areas for improvement

**Section 3: Personalization Summary**
- Data completeness percentage
- Reliability and consistency scores
- Personalization depth achieved
- Recommendations for additional data

**Section 4: Action Plan Preview**
- Weekly schedule preview
- First week meal plan sample
- First week workout plan sample
- Key milestones and check-in points

#### **Mathematical Formulas Implementation**

```typescript
class HealthCalculations {
  // All 50+ formulas from research implemented here
  static calculateBMI(weightKg: number, heightCm: number): number;
  static calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number;
  static calculateTDEE(bmr: number, activityLevel: string): number;
  static calculateIdealWeight(heightCm: number): {min: number, max: number};
  static calculateMacronutrients(calories: number, goals: string[]): MacroBreakdown;
  static calculateHealthScores(userData: CompleteUserData): HealthScores;
  // ... all other formulas
}
```

#### **Validation & Completion**
- **Data Completeness Check**: Ensure all required fields completed
- **Consistency Validation**: Check for conflicting information
- **Goal Feasibility**: Validate timeline and weight loss rates
- **Final Submission**: Only allow if all validations pass

---

## **🗄️ DATABASE SCHEMA**

### **Production-Ready Schema Design**

```sql
-- Personal Information Table
CREATE TABLE personal_info (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    age INTEGER CHECK (age >= 13 AND age <= 120) NOT NULL,
    gender user_gender_enum NOT NULL,
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    wake_time TIME NOT NULL,
    sleep_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Diet Preferences Table  
CREATE TABLE diet_preferences (
    user_id UUID REFERENCES personal_info(user_id) ON DELETE CASCADE,
    
    -- Current diet data
    diet_type diet_type_enum NOT NULL,
    allergies TEXT[] DEFAULT '{}',
    cuisine_preferences TEXT[] DEFAULT '{}',
    restrictions TEXT[] DEFAULT '{}',
    
    -- Diet readiness
    keto_ready BOOLEAN DEFAULT FALSE,
    intermittent_fasting_ready BOOLEAN DEFAULT FALSE,
    paleo_ready BOOLEAN DEFAULT FALSE,
    mediterranean_ready BOOLEAN DEFAULT FALSE,
    low_carb_ready BOOLEAN DEFAULT FALSE,
    high_protein_ready BOOLEAN DEFAULT FALSE,
    
    -- Meal preferences
    breakfast_enabled BOOLEAN DEFAULT TRUE,
    lunch_enabled BOOLEAN DEFAULT TRUE,
    dinner_enabled BOOLEAN DEFAULT TRUE,
    snacks_enabled BOOLEAN DEFAULT TRUE,
    
    -- Cooking preferences
    cooking_skill_level cooking_skill_enum DEFAULT 'beginner',
    max_prep_time_minutes INTEGER DEFAULT 30,
    budget_level budget_enum DEFAULT 'medium',
    
    -- Health habits (14 boolean fields)
    drinks_enough_water BOOLEAN DEFAULT FALSE,
    limits_sugary_drinks BOOLEAN DEFAULT FALSE,
    eats_regular_meals BOOLEAN DEFAULT FALSE,
    avoids_late_night_eating BOOLEAN DEFAULT FALSE,
    controls_portion_sizes BOOLEAN DEFAULT FALSE,
    reads_nutrition_labels BOOLEAN DEFAULT FALSE,
    eats_processed_foods BOOLEAN DEFAULT TRUE,
    eats_5_servings_fruits_veggies BOOLEAN DEFAULT FALSE,
    limits_refined_sugar BOOLEAN DEFAULT FALSE,
    includes_healthy_fats BOOLEAN DEFAULT FALSE,
    drinks_alcohol BOOLEAN DEFAULT FALSE,
    smokes_tobacco BOOLEAN DEFAULT FALSE,
    drinks_coffee BOOLEAN DEFAULT FALSE,
    takes_supplements BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- Body Analysis Table
CREATE TABLE body_analysis (
    user_id UUID REFERENCES personal_info(user_id) ON DELETE CASCADE,
    
    -- Basic measurements
    height_cm DECIMAL(5,2) CHECK (height_cm >= 100 AND height_cm <= 250) NOT NULL,
    current_weight_kg DECIMAL(5,2) CHECK (current_weight_kg >= 30 AND current_weight_kg <= 300) NOT NULL,
    target_weight_kg DECIMAL(5,2) CHECK (target_weight_kg >= 30 AND target_weight_kg <= 300) NOT NULL,
    target_timeline_weeks INTEGER CHECK (target_timeline_weeks >= 4 AND target_timeline_weeks <= 104) NOT NULL,
    
    -- Body composition
    body_fat_percentage DECIMAL(4,2) CHECK (body_fat_percentage >= 3 AND body_fat_percentage <= 50),
    waist_cm DECIMAL(5,2),
    hip_cm DECIMAL(5,2),
    chest_cm DECIMAL(5,2),
    
    -- Photos
    front_photo_url VARCHAR(255),
    side_photo_url VARCHAR(255),
    back_photo_url VARCHAR(255),
    
    -- AI analysis
    ai_estimated_body_fat DECIMAL(4,2),
    ai_body_type body_type_enum,
    ai_confidence_score INTEGER CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100),
    
    -- Medical information
    medical_conditions TEXT[] DEFAULT '{}',
    medications TEXT[] DEFAULT '{}',
    physical_limitations TEXT[] DEFAULT '{}',
    
    -- Calculated values
    bmi DECIMAL(4,2),
    bmr DECIMAL(7,2),
    ideal_weight_min DECIMAL(5,2),
    ideal_weight_max DECIMAL(5,2),
    waist_hip_ratio DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- Workout Preferences Table
CREATE TABLE workout_preferences (
    user_id UUID REFERENCES personal_info(user_id) ON DELETE CASCADE,
    
    -- Existing data
    location workout_location_enum NOT NULL,
    equipment TEXT[] DEFAULT '{}',
    time_preference_minutes INTEGER DEFAULT 30,
    intensity intensity_enum NOT NULL,
    workout_types TEXT[] DEFAULT '{}',
    
    -- Goals and activity
    primary_goals TEXT[] DEFAULT '{}',
    activity_level activity_level_enum NOT NULL,
    
    -- Current fitness assessment
    workout_experience_years INTEGER DEFAULT 0,
    workout_frequency_per_week INTEGER CHECK (workout_frequency_per_week >= 0 AND workout_frequency_per_week <= 7),
    can_do_pushups INTEGER DEFAULT 0,
    can_run_minutes INTEGER DEFAULT 0,
    flexibility_level flexibility_enum DEFAULT 'fair',
    
    -- Weight goals (populated from body_analysis)
    weekly_weight_loss_goal DECIMAL(3,2),
    
    -- Preferences
    preferred_workout_times TEXT[] DEFAULT '{}',
    enjoys_cardio BOOLEAN DEFAULT TRUE,
    enjoys_strength_training BOOLEAN DEFAULT TRUE,
    enjoys_group_classes BOOLEAN DEFAULT FALSE,
    prefers_outdoor_activities BOOLEAN DEFAULT FALSE,
    needs_motivation BOOLEAN DEFAULT FALSE,
    prefers_variety BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- Advanced Review Calculations Table
CREATE TABLE advanced_review (
    user_id UUID REFERENCES personal_info(user_id) ON DELETE CASCADE,
    
    -- Basic metabolic calculations
    calculated_bmi DECIMAL(4,2),
    calculated_bmr DECIMAL(7,2),
    calculated_tdee DECIMAL(7,2),
    metabolic_age INTEGER,
    
    -- Daily nutritional needs
    daily_calories INTEGER,
    daily_protein_g INTEGER,
    daily_carbs_g INTEGER,
    daily_fat_g INTEGER,
    daily_water_ml INTEGER,
    daily_fiber_g INTEGER,
    
    -- Weight management
    healthy_weight_min DECIMAL(5,2),
    healthy_weight_max DECIMAL(5,2),
    weekly_weight_loss_rate DECIMAL(3,2),
    estimated_timeline_weeks INTEGER,
    total_calorie_deficit INTEGER,
    
    -- Body composition
    ideal_body_fat_min DECIMAL(4,2),
    ideal_body_fat_max DECIMAL(4,2),
    lean_body_mass DECIMAL(5,2),
    fat_mass DECIMAL(5,2),
    
    -- Fitness metrics
    estimated_vo2_max DECIMAL(4,1),
    target_hr_fat_burn_min INTEGER,
    target_hr_fat_burn_max INTEGER,
    target_hr_cardio_min INTEGER,
    target_hr_cardio_max INTEGER,
    target_hr_peak_min INTEGER,
    target_hr_peak_max INTEGER,
    recommended_workout_frequency INTEGER,
    recommended_cardio_minutes INTEGER,
    recommended_strength_sessions INTEGER,
    
    -- Health scores (0-100)
    overall_health_score INTEGER,
    diet_readiness_score INTEGER,
    fitness_readiness_score INTEGER,
    goal_realistic_score INTEGER,
    
    -- Sleep analysis
    recommended_sleep_hours DECIMAL(3,1),
    current_sleep_duration DECIMAL(3,1),
    sleep_efficiency_score INTEGER,
    
    -- Completion metrics
    data_completeness_percentage INTEGER,
    reliability_score INTEGER,
    personalization_level INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- Onboarding Progress Tracking
CREATE TABLE onboarding_progress (
    user_id UUID REFERENCES personal_info(user_id) ON DELETE CASCADE,
    current_tab INTEGER DEFAULT 1 CHECK (current_tab >= 1 AND current_tab <= 5),
    completed_tabs INTEGER[] DEFAULT '{}',
    tab_validation_status JSONB DEFAULT '{}',
    total_completion_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- Enums
CREATE TYPE user_gender_enum AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE diet_type_enum AS ENUM ('vegetarian', 'vegan', 'non-veg', 'pescatarian');
CREATE TYPE cooking_skill_enum AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE budget_enum AS ENUM ('low', 'medium', 'high');
CREATE TYPE body_type_enum AS ENUM ('ectomorph', 'mesomorph', 'endomorph');
CREATE TYPE workout_location_enum AS ENUM ('home', 'gym', 'both');
CREATE TYPE intensity_enum AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE activity_level_enum AS ENUM ('sedentary', 'light', 'moderate', 'active', 'extreme');
CREATE TYPE flexibility_enum AS ENUM ('poor', 'fair', 'good', 'excellent');

-- Indexes for performance
CREATE INDEX idx_personal_info_user_id ON personal_info(user_id);
CREATE INDEX idx_onboarding_progress_completion ON onboarding_progress(total_completion_percentage);
CREATE INDEX idx_body_analysis_bmi ON body_analysis(bmi);
CREATE INDEX idx_advanced_review_health_score ON advanced_review(overall_health_score);
```

---

## **⚙️ TECHNICAL IMPLEMENTATION**

### **Component Architecture**
```typescript
// Main onboarding container
src/screens/onboarding/
├── OnboardingFlow.tsx              // Main container with tab management
├── components/
│   ├── OnboardingTabBar.tsx        // Custom tab navigation
│   ├── OnboardingProgressBar.tsx   // Progress indicator
│   └── TabValidationIndicator.tsx  // Validation status display
├── tabs/
│   ├── PersonalInfoTab.tsx         // Tab 1 implementation
│   ├── DietPreferencesTab.tsx      // Tab 2 implementation  
│   ├── BodyAnalysisTab.tsx         // Tab 3 implementation
│   ├── WorkoutPreferencesTab.tsx   // Tab 4 implementation
│   └── AdvancedReviewTab.tsx       // Tab 5 implementation
├── hooks/
│   ├── useOnboardingState.tsx      // State management
│   ├── useTabValidation.tsx        // Validation logic
│   └── useHealthCalculations.tsx   // Mathematical formulas
└── utils/
    ├── healthFormulas.ts           // All 50+ mathematical formulas
    ├── validationRules.ts          // Field validation
    └── dataTransformers.ts         // Data formatting utilities
```

### **State Management**
```typescript
interface OnboardingState {
  currentTab: number;
  completedTabs: Set<number>;
  tabData: {
    personalInfo: PersonalInfoData | null;
    dietPreferences: DietPreferencesData | null;
    bodyAnalysis: BodyAnalysisData | null;
    workoutPreferences: WorkoutPreferencesData | null;
    advancedReview: AdvancedReviewData | null;
  };
  validationStatus: Record<number, ValidationResult>;
  isLoading: boolean;
  autoSaveEnabled: boolean;
}
```

### **Data Flow & Dependencies**
1. **Tab 1 → Tab 4**: Activity level moves from personal to workout
2. **Tab 2 → Tab 5**: Meal preferences affect calorie distribution  
3. **Tab 3 → Tab 4**: Weight goals auto-populate workout tab
4. **Tab 3 → Tab 5**: Body measurements feed into all calculations
5. **All Tabs → Tab 5**: Complete data feeds mathematical formulas

### **Validation System**
- **Real-time validation** on field changes
- **Tab completion validation** before allowing navigation
- **Cross-tab validation** for dependent fields
- **Final submission validation** ensuring data completeness

### **Auto-save & Recovery**
- Save progress on every field change (debounced)
- Store in AsyncStorage for offline recovery
- Resume from last completed tab
- Data migration for schema updates

---

## **🎯 SUCCESS METRICS**

### **User Experience**
- **Completion Rate**: >85% of users complete all 5 tabs
- **Time to Complete**: <15 minutes average
- **Drop-off Points**: <5% drop-off per tab
- **Data Quality**: >90% of fields completed with valid data

### **Technical Performance**  
- **Load Time**: <2 seconds per tab switch
- **Auto-save**: <500ms response time
- **Photo Upload**: <10 seconds for 3 photos
- **Calculation Speed**: <1 second for all mathematical formulas

### **Data Richness**
- **Average Data Points**: >100 per user
- **Health Habit Coverage**: >80% of habits tracked
- **Personalization Score**: >85% average
- **AI Analysis Confidence**: >75% for body analysis

---

## **🚀 IMPLEMENTATION PHASES**

### **Phase 1: Core Infrastructure (Week 1-2)**
- Database schema setup with all tables and relationships
- Basic tab navigation system
- State management and data persistence
- Core UI components and styling

### **Phase 2: Individual Tabs (Week 3-6)**
- **Week 3**: Personal Info + Diet Preferences tabs
- **Week 4**: Body Analysis tab (without AI analysis)
- **Week 5**: Workout Preferences tab  
- **Week 6**: Advanced Review tab with calculations

### **Phase 3: Advanced Features (Week 7-8)**
- AI photo analysis integration (reliable features only)
- Mathematical formulas implementation (all 50+)
- Cross-tab dependencies and validation
- Auto-save and recovery system

### **Phase 4: Polish & Testing (Week 9-10)**
- UI/UX refinements and animations
- Comprehensive testing across all tabs
- Performance optimization
- Data validation and error handling

### **Phase 5: Production Deployment (Week 11-12)**
- Production database setup
- Monitoring and analytics integration
- User testing and feedback integration
- Final deployment and launch

---

This comprehensive plan provides a **SIMPLE, RELIABLE, and PRODUCTION-READY** onboarding system that captures maximum user data for tracking, prediction, and progress monitoring while avoiding complex features that could introduce anomalies.
