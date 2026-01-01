# ONBOARDING DATA FLOW DIAGRAM

**Visual representation of how data flows through the onboarding system**

---

## HIGH-LEVEL DATA FLOW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ONBOARDING FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  USER INPUT         →  STATE MANAGEMENT  →  SERVICE LAYER  →  DATABASE │
│  (UI Components)       (React State)        (TypeScript)      (Supabase)│
│                                                                         │
│  PersonalInfoTab    →  formData          →  PersonalInfo   →  profiles │
│  DietPrefsTab       →  formData          →  DietPrefs      →  diet_pref│
│  BodyAnalysisTab    →  formData          →  BodyAnalysis   →  body_anal│
│  WorkoutPrefsTab    →  formData          →  WorkoutPrefs   →  workout_p│
│  AdvancedReviewTab  →  calculatedData    →  AdvancedReview →  advanced_│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TAB 1: PERSONAL INFO - DATA FLOW

```
┌──────────────────────┐
│   PersonalInfoTab    │
│   (UI Component)     │
├──────────────────────┤
│ Input: first_name    │──┐
│ Input: last_name     │  │
│ Input: age           │  │
│ Input: gender        │  │   ┌─────────────────────┐
│ Input: country       │  ├──→│  formData (state)   │
│ Input: state         │  │   │  PersonalInfoData   │
│ Input: region        │  │   └──────────┬──────────┘
│ Input: wake_time     │  │              │
│ Input: sleep_time    │  │              │ onUpdate()
│ Input: occupation    │──┘              ▼
└──────────────────────┘       ┌─────────────────────┐
                               │ OnboardingContainer │
                               │   (Parent State)    │
                               └──────────┬──────────┘
                                          │
                                          │ saveTabData()
                                          ▼
                               ┌─────────────────────┐
                               │PersonalInfoService  │
                               │      .save()        │
                               └──────────┬──────────┘
                                          │
                                          │ TRANSFORM:
                                          │ - name = first_name + last_name
                                          │ - age: number
                                          ▼
                               ┌─────────────────────┐
                               │   profiles table    │
                               ├─────────────────────┤
                               │ id (PK)             │
                               │ first_name          │
                               │ last_name           │
                               │ name (computed)     │
                               │ age (INTEGER)       │
                               │ gender              │
                               │ country             │
                               │ state               │
                               │ region              │
                               │ wake_time (TIME)    │
                               │ sleep_time (TIME)   │
                               │ occupation_type     │
                               │ created_at          │
                               │ updated_at          │
                               └─────────────────────┘
                                          │
                                          │ PersonalInfoService.load()
                                          ▼
                               ┌─────────────────────┐
                               │  Display Locations  │
                               ├─────────────────────┤
                               │ • Profile Screen    │
                               │ • Review Tab        │
                               │ • Home Screen       │
                               │ • BMR calculations  │
                               │ • TDEE calculations │
                               └─────────────────────┘
```

---

## TAB 2: DIET PREFERENCES - DATA FLOW

```
┌──────────────────────────┐
│   DietPreferencesTab     │
│     (UI Component)       │
├──────────────────────────┤
│ Select: diet_type        │──┐
│ MultiSelect: allergies   │  │
│ MultiSelect: restrictions│  │
│ Toggle: keto_ready       │  │   ┌────────────────────┐
│ Toggle: IF_ready         │  ├──→│  formData (state)  │
│ Toggle: 6 diet readiness │  │   │  DietPreferencesData│
│ Toggle: 4 meal enabled   │  │   └─────────┬──────────┘
│ Select: cooking_skill    │  │             │
│ Slider: max_prep_time    │  │             │ onUpdate()
│ Select: budget_level     │  │             ▼
│ Toggle: 14 health habits │──┘  ┌────────────────────┐
└──────────────────────────┘     │ OnboardingContainer│
                                 │   (Parent State)   │
                                 └─────────┬──────────┘
                                           │
                                           │ saveTabData()
                                           ▼
                                ┌────────────────────┐
                                │DietPreferencesServ │
                                │      .save()       │
                                └─────────┬──────────┘
                                          │
                                          │ VALIDATE:
                                          │ - At least 1 meal enabled
                                          │ - diet_type required
                                          ▼
                                ┌────────────────────┐
                                │diet_preferences tbl│
                                ├────────────────────┤
                                │ user_id (PK/FK)    │
                                │ diet_type          │
                                │ allergies (TEXT[]) │
                                │ restrictions (TEXT[])│
                                │ keto_ready         │
                                │ ...6 diet toggles  │
                                │ breakfast_enabled  │
                                │ ...4 meal toggles  │
                                │ cooking_skill_level│
                                │ max_prep_time_min  │
                                │ budget_level       │
                                │ drinks_enough_water│
                                │ ...14 health habits│
                                │ created_at         │
                                │ updated_at         │
                                └────────────────────┘
                                          │
                                          │ DietPreferencesService.load()
                                          ▼
                                ┌────────────────────┐
                                │  Display Locations │
                                ├────────────────────┤
                                │ • Diet Screen      │
                                │ • Meal Plans       │
                                │ • Recipe Filters   │
                                │ • Health Score     │
                                │ • Review Tab       │
                                └────────────────────┘
```

---

## TAB 3: BODY ANALYSIS - DATA FLOW

```
┌───────────────────────────┐
│    BodyAnalysisTab        │
│     (UI Component)        │
├───────────────────────────┤
│ Input: height_cm          │──┐
│ Input: current_weight_kg  │  │
│ Input: target_weight_kg   │  │
│ Input: target_timeline    │  │
│ Input: body_fat_%         │  │   ┌──────────────────────┐
│ Input: waist_cm           │  ├──→│  formData (state)    │
│ Input: hip_cm             │  │   │  BodyAnalysisData    │
│ Input: chest_cm           │  │   └──────────┬───────────┘
│ ImagePicker: front_photo  │  │              │
│ ImagePicker: side_photo   │  │              │ AUTO-CALCULATE:
│ ImagePicker: back_photo   │  │              │ - BMI = weight/(height²)
│ MultiSelect: medical_cond │  │              │ - BMR = Mifflin-St Jeor
│ MultiSelect: medications  │  │              │ - Ideal weight range
│ MultiSelect: limitations  │  │              │ - Waist-hip ratio
│ Toggle: pregnancy_status  │  │              │
│ Select: pregnancy_trim    │  │              │ onUpdate()
│ Toggle: breastfeeding     │  │              ▼
│ Select: stress_level      │──┘   ┌──────────────────────┐
│                           │      │ OnboardingContainer  │
│ [ANALYZE PHOTOS] Button   │      │   (Parent State)     │
│  → AI Analysis            │      └──────────┬───────────┘
│     → ai_estimated_bf     │                 │
│     → ai_body_type        │                 │ saveTabData()
│     → ai_confidence       │                 ▼
└───────────────────────────┘      ┌──────────────────────┐
                                   │ BodyAnalysisService  │
                                   │      .save()         │
                                   └──────────┬───────────┘
                                              │
                                              │ STORE COMPUTED:
                                              │ - bmi
                                              │ - bmr
                                              │ - ideal_weight_min/max
                                              │ - waist_hip_ratio
                                              ▼
                                   ┌──────────────────────┐
                                   │  body_analysis table │
                                   ├──────────────────────┤
                                   │ user_id (PK/FK)      │
                                   │ height_cm (DECIMAL)  │
                                   │ current_weight_kg    │
                                   │ target_weight_kg     │
                                   │ target_timeline_weeks│
                                   │ body_fat_percentage  │
                                   │ waist_cm             │
                                   │ hip_cm               │
                                   │ chest_cm             │
                                   │ front_photo_url      │
                                   │ side_photo_url       │
                                   │ back_photo_url       │
                                   │ ai_estimated_body_fat│
                                   │ ai_body_type         │
                                   │ ai_confidence_score  │
                                   │ medical_conditions[] │
                                   │ medications[]        │
                                   │ physical_limitations[]│
                                   │ pregnancy_status     │
                                   │ pregnancy_trimester  │
                                   │ breastfeeding_status │
                                   │ stress_level         │
                                   │ bmi (computed)       │
                                   │ bmr (computed)       │
                                   │ ideal_weight_min     │
                                   │ ideal_weight_max     │
                                   │ waist_hip_ratio      │
                                   │ created_at           │
                                   │ updated_at           │
                                   └──────────────────────┘
                                              │
                                              │ BodyAnalysisService.load()
                                              ▼
                                   ┌──────────────────────┐
                                   │  Display Locations   │
                                   ├──────────────────────┤
                                   │ • Profile Screen     │
                                   │ • Progress Screen    │
                                   │ • Review Tab         │
                                   │ • BMI Dashboard      │
                                   │ • Goal Tracking      │
                                   │ • Safety Validations │
                                   └──────────────────────┘
```

---

## TAB 4: WORKOUT PREFERENCES - DATA FLOW

```
┌────────────────────────────┐
│  WorkoutPreferencesTab     │
│     (UI Component)         │
├────────────────────────────┤
│ Select: location           │──┐
│ MultiSelect: equipment     │  │  AUTO-POPULATE:
│   (auto if gym selected)   │  │  - equipment[] if gym
│ Slider: time_preference    │  │
│ Select: intensity          │  │
│ MultiSelect: workout_types │  │  AUTO-GENERATE:
│   (auto from goals)        │  │  - workout_types from goals
│ MultiSelect: primary_goals │  │
│ Select: activity_level     │  │  AUTO-CALCULATE:
│   (auto from occupation)   │  │  - activity_level from occupation
│ Input: experience_years    │  │  - weekly_weight_loss from Tab 3
│ Input: frequency_per_week  │  │
│ Input: can_do_pushups      │  │   ┌─────────────────────┐
│ Input: can_run_minutes     │  ├──→│  formData (state)   │
│ Select: flexibility_level  │  │   │WorkoutPreferencesData│
│ Input: weekly_weight_loss  │  │   └──────────┬──────────┘
│   (auto from Tab 3)        │  │              │
│ MultiSelect: workout_times │  │              │ onUpdate()
│ Toggle: enjoys_cardio      │  │              ▼
│ Toggle: enjoys_strength    │  │   ┌─────────────────────┐
│ Toggle: enjoys_group       │  │   │ OnboardingContainer │
│ Toggle: prefers_outdoor    │  │   │   (Parent State)    │
│ Toggle: needs_motivation   │  │   └──────────┬──────────┘
│ Toggle: prefers_variety    │──┘              │
└────────────────────────────┘                 │ saveTabData()
                                               ▼
                                    ┌─────────────────────┐
                                    │WorkoutPreferencesServ│
                                    │      .save()        │
                                    └──────────┬──────────┘
                                               │
                                               │ VALIDATE:
                                               │ - location required
                                               │ - intensity required
                                               │ - primary_goals (≥1)
                                               ▼
                                    ┌─────────────────────┐
                                    │workout_preferences  │
                                    ├─────────────────────┤
                                    │ user_id (PK/FK)     │
                                    │ location            │
                                    │ equipment (TEXT[])  │
                                    │ time_preference     │
                                    │ intensity           │
                                    │ workout_types[]     │
                                    │ primary_goals[]     │
                                    │ activity_level      │
                                    │ workout_exp_years   │
                                    │ workout_freq_week   │
                                    │ can_do_pushups      │
                                    │ can_run_minutes     │
                                    │ flexibility_level   │
                                    │ weekly_wt_loss_goal │
                                    │ preferred_wt_times[]│
                                    │ enjoys_cardio       │
                                    │ enjoys_strength     │
                                    │ enjoys_group        │
                                    │ prefers_outdoor     │
                                    │ needs_motivation    │
                                    │ prefers_variety     │
                                    │ created_at          │
                                    │ updated_at          │
                                    └─────────────────────┘
                                               │
                                               │ WorkoutPrefsService.load()
                                               ▼
                                    ┌─────────────────────┐
                                    │  Display Locations  │
                                    ├─────────────────────┤
                                    │ • Fitness Screen    │
                                    │ • Workout Plans     │
                                    │ • Exercise Filters  │
                                    │ • Review Tab        │
                                    │ • TDEE Calculation  │
                                    └─────────────────────┘
```

---

## TAB 5: ADVANCED REVIEW - DATA FLOW

```
┌────────────────────────────────────────────────────────────┐
│              AdvancedReviewTab (UI Component)              │
│                   (NO USER INPUT)                          │
│                   (ALL COMPUTED)                           │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          │ INPUT DATA FROM:
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│ Tab 1 Data  │  │ Tab 2 Data  │  │ Tab 3 Data  │  │  Tab 4 Data  │
│ PersonalInfo│  │ DietPrefs   │  │ BodyAnalysis│  │WorkoutPrefs  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘
       │                │                │                │
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                        │
                        │ useEffect(() => performCalculations())
                        ▼
         ┌──────────────────────────────────┐
         │   ValidationEngine.validate()    │
         │   (services/validationEngine.ts) │
         ├──────────────────────────────────┤
         │ • Safety checks (pregnancy, etc) │
         │ • Goal realism validation        │
         │ • Calorie deficit limits         │
         │ • Timeline validation            │
         │ • Medical condition checks       │
         └──────────────┬───────────────────┘
                        │
                        │ + (PLUS)
                        ▼
         ┌──────────────────────────────────┐
         │ HealthCalculationEngine.calc()   │
         │ (utils/healthCalculations.ts)    │
         ├──────────────────────────────────┤
         │ BMI = weight / (height²)         │
         │ BMR = Mifflin-St Jeor equation   │
         │ TDEE = BMR × activity_multiplier │
         │ Daily Calories = TDEE - deficit  │
         │ Protein = weight × protein_ratio │
         │ Carbs/Fat = remaining calories   │
         │ Water = weight × 35ml            │
         │ Fiber = calories ÷ 100 × 1.5     │
         │ Heart Rate Zones = (220-age)×%   │
         │ Sleep analysis = wake-sleep time │
         │ Weekly rate = safe calculation   │
         │ Timeline = weight diff ÷ rate    │
         │ Health scores = composite calc   │
         └──────────────┬───────────────────┘
                        │
                        │ setCalculatedData()
                        ▼
         ┌──────────────────────────────────┐
         │   calculatedData (state)         │
         │   AdvancedReviewData (44 fields) │
         └──────────────┬───────────────────┘
                        │
                        │ onUpdate()
                        ▼
         ┌──────────────────────────────────┐
         │     OnboardingContainer          │
         │       (Parent State)             │
         └──────────────┬───────────────────┘
                        │
                        │ saveTabData()
                        ▼
         ┌──────────────────────────────────┐
         │  AdvancedReviewService.save()    │
         └──────────────┬───────────────────┘
                        │
                        │ STORE ALL 44 METRICS
                        ▼
         ┌──────────────────────────────────┐
         │     advanced_review table        │
         ├──────────────────────────────────┤
         │ user_id (PK/FK)                  │
         │                                  │
         │ METABOLIC (4 fields):            │
         │ • calculated_bmi                 │
         │ • calculated_bmr                 │
         │ • calculated_tdee                │
         │ • metabolic_age                  │
         │                                  │
         │ NUTRITION (6 fields):            │
         │ • daily_calories                 │
         │ • daily_protein_g                │
         │ • daily_carbs_g                  │
         │ • daily_fat_g                    │
         │ • daily_water_ml                 │
         │ • daily_fiber_g                  │
         │                                  │
         │ WEIGHT GOALS (5 fields):         │
         │ • healthy_weight_min/max         │
         │ • weekly_weight_loss_rate        │
         │ • estimated_timeline_weeks       │
         │ • total_calorie_deficit          │
         │                                  │
         │ BODY COMP (4 fields):            │
         │ • ideal_body_fat_min/max         │
         │ • lean_body_mass                 │
         │ • fat_mass                       │
         │                                  │
         │ FITNESS (10 fields):             │
         │ • estimated_vo2_max              │
         │ • target_hr_* (6 zones)          │
         │ • recommended_workout_frequency  │
         │ • recommended_cardio_minutes     │
         │ • recommended_strength_sessions  │
         │                                  │
         │ HEALTH SCORES (4 fields):        │
         │ • overall_health_score           │
         │ • diet_readiness_score           │
         │ • fitness_readiness_score        │
         │ • goal_realistic_score           │
         │                                  │
         │ SLEEP (3 fields):                │
         │ • recommended_sleep_hours        │
         │ • current_sleep_duration         │
         │ • sleep_efficiency_score         │
         │                                  │
         │ COMPLETION (3 fields):           │
         │ • data_completeness_percentage   │
         │ • reliability_score              │
         │ • personalization_level          │
         │                                  │
         │ VALIDATION (4 fields):           │
         │ • validation_status              │
         │ • validation_errors (JSONB)      │
         │ • validation_warnings (JSONB)    │
         │ • refeed_schedule (JSONB)        │
         │ • medical_adjustments (TEXT[])   │
         │                                  │
         │ created_at, updated_at           │
         └──────────────┬───────────────────┘
                        │
                        │ AdvancedReviewService.load()
                        ▼
         ┌──────────────────────────────────┐
         │     Display Locations            │
         ├──────────────────────────────────┤
         │ • Review Tab (all metrics)       │
         │ • Profile Screen (BMI, BMR, etc) │
         │ • Diet Screen (calories, macros) │
         │ • Fitness Screen (HR zones, etc) │
         │ • Progress Screen (timeline, etc)│
         │ • Dashboard (health scores)      │
         │ • Analytics (all metrics)        │
         └──────────────────────────────────┘
```

---

## CROSS-TAB DEPENDENCIES

### Dependency Graph

```
Tab 1 (Personal Info)
  ├──→ Tab 3 (Body Analysis)
  │    └──→ BMR calculation (requires age, gender)
  │    └──→ Ideal weight (requires age, gender)
  │
  ├──→ Tab 4 (Workout Preferences)
  │    └──→ activity_level (from occupation_type)
  │
  └──→ Tab 5 (Advanced Review)
       └──→ All metabolic calculations

Tab 2 (Diet Preferences)
  └──→ Tab 5 (Advanced Review)
       └──→ Diet readiness score
       └──→ Health habits score

Tab 3 (Body Analysis)
  ├──→ Tab 4 (Workout Preferences)
  │    └──→ weekly_weight_loss_goal
  │    └──→ Goal suggestions (from ai_body_type)
  │
  └──→ Tab 5 (Advanced Review)
       └──→ BMI, BMR, TDEE calculations
       └──→ Weight timeline calculations
       └──→ Safety validations (pregnancy, etc)

Tab 4 (Workout Preferences)
  └──→ Tab 5 (Advanced Review)
       └──→ TDEE calculation (activity_level)
       └──→ Fitness readiness score
       └──→ Workout recommendations
```

### Calculation Order (Tab 5)

```
STEP 1: Basic Calculations (No dependencies)
  ├─ BMI = current_weight_kg / (height_cm/100)²
  └─ Sleep duration = wake_time - sleep_time

STEP 2: Metabolic Calculations (Requires Tab 1 + Tab 3)
  ├─ BMR = Mifflin-St Jeor(weight, height, age, gender)
  ├─ Activity multiplier = f(activity_level, occupation_type)
  └─ TDEE = BMR × activity_multiplier

STEP 3: Nutrition Calculations (Requires TDEE)
  ├─ Calorie deficit = f(TDEE, weight_loss_goal, safety_limits)
  ├─ Daily calories = TDEE - deficit
  ├─ Protein = weight × protein_ratio
  ├─ Fat = calories × fat_percentage
  ├─ Carbs = (calories - protein - fat) / 4
  ├─ Water = weight × 35ml
  └─ Fiber = calories / 100 × 1.5

STEP 4: Safety Validations (Requires all previous)
  ├─ Pregnancy check → adjust deficit limits
  ├─ Medical conditions → add warnings
  ├─ Goal realism → validate timeline
  └─ Stress level → adjust deficit

STEP 5: Fitness Calculations (Requires age, fitness assessment)
  ├─ Max heart rate = 220 - age
  ├─ HR zones = max_hr × zone_percentages
  ├─ VO2 max estimate = f(can_run_minutes, age)
  └─ Workout recommendations = f(goals, experience)

STEP 6: Health Scores (Requires all data)
  ├─ Diet readiness = f(health_habits)
  ├─ Fitness readiness = f(fitness_assessment)
  ├─ Goal realistic = f(timeline, safety)
  └─ Overall health = composite(all_scores)

STEP 7: Completion Metrics (Requires all tabs)
  ├─ Data completeness = fields_filled / total_fields
  ├─ Reliability = f(data_quality, goal_realism)
  └─ Personalization = f(data_depth, completeness)
```

---

## AUTO-POPULATION TRIGGERS

### Equipment Auto-Population (Tab 4)
```
TRIGGER: location changed to 'gym'
CONDITION: equipment.length === 0
ACTION: equipment = STANDARD_GYM_EQUIPMENT (8 items)
TIMING: useEffect on location change
```

### Activity Level Auto-Calculation (Tab 4)
```
TRIGGER: occupation_type loaded from Tab 1
MAPPING:
  desk_job → sedentary
  light_active → light
  moderate_active → moderate
  heavy_labor → active
  very_active → extreme
TIMING: useEffect on personalInfoData.occupation_type
```

### Weekly Weight Loss Auto-Population (Tab 4)
```
TRIGGER: Body analysis data loaded from Tab 3
CONDITION: current_weight_kg && target_weight_kg && target_timeline_weeks
CALCULATION:
  weightDiff = abs(current_weight_kg - target_weight_kg)
  weeklyRate = min(1.0, weightDiff / target_timeline_weeks)
TIMING: useEffect on bodyAnalysisData
```

### Workout Types Auto-Generation (Tab 4)
```
TRIGGER: primary_goals changed
LOGIC:
  weight-loss → [cardio, hiit]
  muscle-gain → [strength, functional]
  endurance → [cardio, sports]
  flexibility → [yoga, pilates]
TIMING: Real-time on goals selection
NOTE: Not stored, always computed from goals
```

### Goal Suggestions (Tab 4)
```
TRIGGER: AI body type analysis complete
CONDITION: ai_body_type && primary_goals.length === 0
MAPPING:
  ectomorph → [muscle_gain, strength]
  endomorph → [weight_loss, endurance]
  mesomorph → [strength, muscle_gain]
TIMING: useEffect on bodyAnalysisData.ai_body_type
```

---

## TRANSFORMATION RULES

### String → Number
```typescript
// Input transformation
const parseNumberInput = (text: string): number => {
  return parseFloat(text) || 0;
};

// Fields affected:
- age
- height_cm
- current_weight_kg
- target_weight_kg
- All numeric inputs
```

### Null → Undefined
```typescript
// Database → TypeScript
region: data.region === null ? undefined : data.region

// TypeScript → Database
region: data.region || null
```

### Time Format (24h ↔ 12h)
```typescript
// Display (24h → 12h with AM/PM)
const formatTimeForDisplay = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Storage (always 24h format)
// No transformation needed - stored as "HH:MM"
```

### Array Handling
```typescript
// Always default to empty array, never null
allergies: data?.allergies || []
restrictions: data?.restrictions || []
equipment: data?.equipment || []
```

### Computed Name Field
```typescript
// Computed during save
name: `${data.first_name} ${data.last_name}`.trim()

// Not computed during load (already in database)
```

---

## VALIDATION FLOW

```
┌────────────────────┐
│  User completes    │
│  input in Tab      │
└─────────┬──────────┘
          │
          │ onUpdate()
          ▼
┌────────────────────┐
│  updateField()     │
│  setFormData()     │
└─────────┬──────────┘
          │
          │ Automatic
          ▼
┌────────────────────┐
│  Tab-level         │
│  Validation        │
│  (OnboardingUtils) │
├────────────────────┤
│ validatePersonalInfo()
│ validateDietPrefs()
│ validateBodyAnalysis()
│ validateWorkoutPrefs()
└─────────┬──────────┘
          │
          │ Result
          ▼
┌────────────────────┐
│  TabValidation     │
│  Result            │
├────────────────────┤
│ is_valid: boolean  │
│ errors: string[]   │
│ warnings: string[] │
│ completion_%       │
└─────────┬──────────┘
          │
          │ If valid
          ▼
┌────────────────────┐
│  Save to Database  │
│  (OnboardingServ)  │
└─────────┬──────────┘
          │
          │ Tab 5 only
          ▼
┌────────────────────┐
│  Cross-tab         │
│  Validation        │
│  (ValidationEngine)│
├────────────────────┤
│ Safety checks      │
│ Goal realism       │
│ Medical conditions │
│ Pregnancy/nursing  │
│ Deficit limits     │
└─────────┬──────────┘
          │
          │ Result
          ▼
┌────────────────────┐
│  Validation        │
│  Results           │
├────────────────────┤
│ canProceed: bool   │
│ hasErrors: bool    │
│ hasWarnings: bool  │
│ errors: []         │
│ warnings: []       │
│ adjustments: {}    │
└────────────────────┘
```

---

## SAVE/LOAD CYCLE

### Save Cycle
```
UI Input
  ↓
formData state
  ↓
onUpdate() callback
  ↓
Parent state (OnboardingContainer)
  ↓
Auto-save debounced (500ms)
  ↓
Service.save(userId, data)
  ↓
Transform data (name, null→undefined, etc)
  ↓
Supabase .upsert()
  ↓
Database (onConflict: user_id)
  ↓
Success ✅
```

### Load Cycle
```
User logs in
  ↓
OnboardingContainer.loadAllData()
  ↓
Service.load(userId) × 5 tabs
  ↓
Supabase .select().eq('user_id', userId)
  ↓
Transform data (null→undefined, etc)
  ↓
Set parent state
  ↓
Props flow to tabs
  ↓
Tab syncs formData from props
  ↓
UI displays data ✅
```

---

## ERROR HANDLING FLOW

```
┌────────────────────┐
│  User Input Error  │
│  (Invalid value)   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Field Validation  │
│  (OnboardingUtils) │
└─────────┬──────────┘
          │
          │ If invalid
          ▼
┌────────────────────┐
│  Error State       │
│  (Red border,      │
│   error message)   │
└────────────────────┘

┌────────────────────┐
│  Save Error        │
│  (Network, DB)     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Service catches   │
│  Returns false     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  UI Toast/Alert    │
│  "Save failed"     │
└────────────────────┘

┌────────────────────┐
│  Load Error        │
│  (Network, no data)│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Service returns   │
│  null              │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  UI shows defaults │
│  Empty form        │
└────────────────────┘
```

---

## SUMMARY

This data flow document shows:

1. **Complete UI → DB → Display journey** for all fields
2. **Cross-tab dependencies** and calculation order
3. **Auto-population triggers** and timing
4. **Transformation rules** for data types
5. **Validation flow** at all levels
6. **Error handling** patterns

**Key Insights:**
- Tab 1 → Feeds Tab 4 (occupation → activity_level)
- Tab 3 → Feeds Tab 4 (goals → weekly_weight_loss)
- Tab 1-4 → Feed Tab 5 (all calculations)
- All computed fields are stored (for performance)
- Auto-population happens in React useEffects
- Validation occurs at both tab-level and cross-tab level

---

**Document Generated:** 2025-12-29
**Status:** Complete ✅
