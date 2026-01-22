# Workout Generation - Comprehensive Test Plan

## Test Overview

**Feature**: AI-Powered Weekly Workout Plan Generation  
**Backend**: Cloudflare Workers - POST /workout/generate  
**AI Model**: Google Gemini 2.5 Flash (LLM) + Rule-Based Algorithm  
**Created**: 2025-01-21

---

## Test Environment Setup

### Required Credentials

- Supabase credentials from `.env.local`
- Workers URL: `https://fitai-workers.sharmaharsh9887.workers.dev`
- Test user with various fitness profiles

### Test Data Requirements

- Exercise database: 1500 exercises loaded
- User profiles with different:
  - Experience levels (beginner, intermediate, advanced)
  - Fitness goals (weight_loss, muscle_gain, endurance, general_fitness)
  - Equipment availability (home, gym, bodyweight)
  - Injuries/medical conditions
  - Weekly workout frequency (1-7 days)

---

## Test Scenarios

### Scenario 1: Beginner Full Body (3x/week, Bodyweight)

**Input Data**:

```json
{
  "userId": "test-user-workout-1",
  "profile": {
    "age": 25,
    "gender": "male",
    "weight": 75,
    "height": 175,
    "fitnessGoal": "general_fitness",
    "experienceLevel": "beginner",
    "availableEquipment": ["bodyweight"],
    "injuries": [],
    "medicalConditions": []
  },
  "weeklyPlan": {
    "workoutsPerWeek": 3,
    "preferredDays": ["monday", "wednesday", "friday"],
    "prefersVariety": true,
    "activityLevel": "sedentary"
  }
}
```

**Expected Results**:

- Workout split: "Full Body 3x/Week"
- 3 workouts assigned to Mon/Wed/Fri
- All bodyweight exercises (push-ups, squats, lunges, planks)
- 8-12 exercises per workout
- Sets: 2-3, Reps: 10-15 (beginner range)
- Rest: 60-90 seconds between sets
- Difficulty: "Beginner" or "Easy"
- Warmup and cooldown included

**Validation Checks**:

- [ ] Exactly 3 workouts in week
- [ ] No equipment-based exercises
- [ ] Beginner-appropriate volume
- [ ] All exercises exist in database
- [ ] Rest days on Tue/Thu/Sat/Sun
- [ ] Total workout time: 30-45 min per session

---

### Scenario 2: Advanced Muscle Gain (Push/Pull/Legs 6x)

**Input Data**:

```json
{
  "profile": {
    "gender": "male",
    "weight": 85,
    "fitnessGoal": "muscle_gain",
    "experienceLevel": "advanced",
    "availableEquipment": ["barbell", "dumbbell", "bench", "cable", "rack"]
  },
  "weeklyPlan": {
    "workoutsPerWeek": 6,
    "prefersVariety": false,
    "activityLevel": "active"
  }
}
```

**Expected Results**:

- Workout split: "Push/Pull/Legs 6x/Week"
- Day 1: Push (chest, shoulders, triceps)
- Day 2: Pull (back, biceps)
- Day 3: Legs (quads, hamstrings, glutes, calves)
- Day 4-6: Repeat cycle
- 10-14 exercises per workout
- Sets: 3-5, Reps: 6-12 (hypertrophy range)
- Compound lifts: bench press, deadlift, squat, overhead press
- Isolation exercises: bicep curls, tricep extensions, calf raises

**Validation Checks**:

- [ ] 6 workouts scheduled
- [ ] PPL split correctly structured
- [ ] Muscle group targeting correct
- [ ] Progressive overload principles
- [ ] Advanced volume (12-20 sets per muscle group)

---

### Scenario 3: Weight Loss HIIT (4x/week, Home)

**Input Data**:

```json
{
  "profile": {
    "gender": "female",
    "weight": 68,
    "fitnessGoal": "weight_loss",
    "experienceLevel": "intermediate",
    "availableEquipment": ["dumbbells", "resistance_bands"]
  },
  "weeklyPlan": {
    "workoutsPerWeek": 4,
    "workoutTypes": ["hiit", "circuit_training"],
    "preferredWorkoutTime": "morning"
  }
}
```

**Expected Results**:

- Workout split: "HIIT/Circuit 4x/Week"
- High-intensity exercises: burpees, mountain climbers, jump squats
- Circuit format: 30-45 sec work, 15-30 sec rest
- Calorie burn: 300-500 per session
- Total time: 20-30 minutes
- Cardio-heavy with some resistance

**Validation Checks**:

- [ ] HIIT-style exercises selected
- [ ] Circuit structure present
- [ ] High estimated calorie burn
- [ ] Appropriate rest intervals
- [ ] Suitable for home environment

---

### Scenario 4: Injury Restrictions (Lower Back + Knee)

**Input Data**:

```json
{
  "profile": {
    "injuries": ["lower_back_pain", "knee_injury"],
    "medicalConditions": [],
    "fitnessGoal": "general_fitness"
  },
  "weeklyPlan": {
    "workoutsPerWeek": 3
  }
}
```

**Expected Results**:

- NO deadlifts, heavy squats, leg press
- NO jumping exercises, burpees, box jumps
- Alternative exercises: seated exercises, swimming, low-impact cardio
- Core stability focus
- Modified movements

**Validation Checks**:

- [ ] Safety filter applied correctly
- [ ] No contraindicated exercises
- [ ] Alternative exercises provided
- [ ] Coaching tips mention modifications

---

### Scenario 5: Senior/65+ (Active Recovery)

**Input Data**:

```json
{
  "profile": {
    "age": 68,
    "gender": "male",
    "fitnessGoal": "maintain_health",
    "experienceLevel": "intermediate"
  },
  "weeklyPlan": {
    "workoutsPerWeek": 2,
    "activityLevel": "light_active"
  }
}
```

**Expected Results**:

- Workout split: "Active Recovery 2x/Week"
- Low-impact exercises: walking, light resistance bands, chair yoga
- Balance and flexibility focus
- Recovery demand: LOW
- Sets: 1-2, Reps: 10-15, Light resistance

**Validation Checks**:

- [ ] Age-appropriate exercises
- [ ] Low recovery demand
- [ ] Balance exercises included
- [ ] No high-impact movements

---

### Scenario 6: Pregnancy-Safe Workouts (2nd Trimester)

**Input Data**:

```json
{
  "profile": {
    "gender": "female",
    "pregnancyStatus": true,
    "pregnancyTrimester": 2
  },
  "weeklyPlan": {
    "workoutsPerWeek": 3
  }
}
```

**Expected Results**:

- Pregnancy-safe exercises only
- NO ab exercises (crunches, sit-ups, planks after 1st tri)
- NO lying flat on back after 16 weeks
- Pelvic floor exercises included
- Modified bodyweight exercises
- Low to moderate intensity

**Validation Checks**:

- [ ] Pregnancy safety filter applied
- [ ] No contraindicated exercises
- [ ] Appropriate modifications noted
- [ ] Intensity capped at moderate

---

### Scenario 7: Cache and Deduplication Testing

**Test Steps**:

1. Generate workout plan with specific parameters
2. Immediately request same plan (within 2 seconds)
3. Wait 5 seconds, request again

**Expected Results**:

- First request: Fresh generation
- Second request (within 2s): Deduplication prevents duplicate call
- Third request: Cache hit from KV or Database

**Validation Checks**:

- [ ] Deduplication working (no duplicate AI calls)
- [ ] Cache metadata correct
- [ ] Response time improvement on cache hit

---

### Scenario 8: Rule-Based vs LLM Comparison

**Test Steps**:

1. Same input, force rule-based generation
2. Same input, force LLM generation
3. Compare outputs

**Expected Results**:

- Both produce valid workout plans
- Rule-based: Deterministic, faster (< 500ms)
- LLM: More creative, coaching tips, variety
- Both meet fitness goals

**Validation Checks**:

- [ ] Both approaches generate valid plans
- [ ] Rule-based faster
- [ ] LLM has better coaching content
- [ ] Exercise selection appropriate in both

---

## API Endpoint Testing

### Endpoint: POST /workout/generate

**Test 1: Minimum Required Fields**

```json
{
  "profile": {
    "age": 30,
    "gender": "male",
    "weight": 75,
    "height": 175,
    "fitnessGoal": "general_fitness",
    "experienceLevel": "beginner",
    "availableEquipment": ["bodyweight"]
  },
  "weeklyPlan": {
    "workoutsPerWeek": 3
  }
}
```

Expected: 200 OK with valid workout plan

**Test 2: All Optional Fields**

```json
{
  "userId": "user123",
  "profile": {
    "age": 35,
    "gender": "female",
    "weight": 65,
    "height": 165,
    "fitnessGoal": "weight_loss",
    "experienceLevel": "intermediate",
    "availableEquipment": ["dumbbells", "resistance_bands", "bench"],
    "injuries": ["shoulder_impingement"],
    "medicalConditions": ["mild_asthma"],
    "pregnancyStatus": false
  },
  "weeklyPlan": {
    "workoutsPerWeek": 4,
    "preferredDays": ["monday", "tuesday", "thursday", "saturday"],
    "workoutTypes": ["strength", "hiit"],
    "prefersVariety": true,
    "activityLevel": "moderate",
    "preferredWorkoutTime": "evening"
  },
  "focusMuscles": ["legs", "glutes", "core"],
  "excludeExercises": ["burpees", "mountain_climbers"],
  "model": "google/gemini-2.5-flash",
  "temperature": 0.7
}
```

Expected: 200 OK with personalized plan

**Test 3: Invalid Values**

```json
{
  "profile": {
    "age": -5,
    "weight": 500,
    "fitnessGoal": "invalid_goal"
  }
}
```

Expected: 400 Bad Request with validation errors

**Test 4: Unauthorized Request**

```bash
curl -X POST /workout/generate \
  -H "Content-Type: application/json" \
  -d @test-data/workout-request.json
```

Expected: 401 Unauthorized (missing JWT)

---

## Exercise Database Validation

**Test 1: Exercise ID Validation**

- All exercises in generated plan must exist in `exerciseDatabase.json`
- Exercise IDs follow pattern: `ex_[number]` (e.g., `ex_001`)

**Test 2: Exercise Metadata**
Each exercise must have:

- [ ] Valid name
- [ ] Primary muscle groups
- [ ] Equipment required
- [ ] Difficulty level
- [ ] Exercise type (strength/cardio/flexibility)
- [ ] Optional: image URL, video URL, instructions

**Test 3: Equipment Filtering**
User equipment: `["barbell"]`
Generated exercises must ONLY use: bodyweight + barbell
NO dumbbells, cables, machines

---

## Workout Split Validation

### Supported Splits (6 total)

1. **Full Body 3x/Week**
   - Workouts: 3
   - Target: Beginners, limited time
   - Recovery demand: Moderate

2. **Upper/Lower 4x/Week**
   - Workouts: 4
   - Days: Upper, Lower, Upper, Lower
   - Target: Intermediate, balanced

3. **Push/Pull/Legs 3x/Week**
   - Workouts: 3
   - Days: Push, Pull, Legs
   - Target: Classic PPL

4. **Push/Pull/Legs 6x/Week**
   - Workouts: 6
   - Days: Push, Pull, Legs, Push, Pull, Legs
   - Target: Advanced, high frequency

5. **Bro Split 5x/Week**
   - Workouts: 5
   - Days: Chest, Back, Shoulders, Arms, Legs
   - Target: Bodybuilding

6. **HIIT/Circuit 3-4x/Week**
   - Workouts: 3-4
   - Format: Circuit training
   - Target: Weight loss, endurance

**Test**: Each split selected appropriately based on:

- [ ] Workout frequency match
- [ ] Goal alignment
- [ ] Equipment availability
- [ ] Experience level
- [ ] Recovery capacity

---

## Data Flow Validation

### Frontend → Backend → AI/Rule-Based → Database → UI

**Step 1: Request Transformation**
`transformForWorkoutRequest()` in `aiRequestTransformers.ts`

- User profile mapped
- Equipment array formatted
- Injuries/conditions included

**Step 2: Backend Processing**
`handleWorkoutGeneration()` in `workoutGeneration.ts`

- JWT validated
- Request validated against Zod schema
- User data loaded from Supabase

**Step 3: Generation Method Selection**
`shouldUseRuleBasedGeneration()`

- Rollout percentage check
- Route to rule-based OR LLM

**Step 4: Exercise Filtering**
`filterExercisesForWorkout()`

- 1500 exercises → filtered by equipment
- → filtered by injuries/safety
- → filtered by experience level
- → ~40-80 exercises remain

**Step 5: Workout Generation**

- **Rule-Based**: `generateRuleBasedWorkout()`
- **LLM**: `generateFreshWorkout()` with Gemini

**Step 6: Validation**

- Validate exercise IDs exist
- Check exercise distribution
- Verify muscle group coverage

**Step 7: Response**

- Weekly workout plan returned
- Metadata included (cached, model, cost)

**Step 8: Frontend Storage**
`fitnessStore.saveWeeklyWorkoutPlan()`

- Save to Zustand
- Save to AsyncStorage
- Save to Supabase `user_workout_plans`

**Step 9: UI Display**
`FitnessScreen.tsx`

- Display workouts for each day
- Show today's workout
- Allow workout start

---

## UI Testing Checklist

### FitnessScreen.tsx Integration

- [ ] "Generate Workout Plan" button visible
- [ ] Loading indicator during generation
- [ ] Success message on completion
- [ ] Error message on failure
- [ ] Weekly overview displays all workouts
- [ ] Today's workout highlighted
- [ ] "Start Workout" button functional

### Workout Display

- [ ] Workout title and description
- [ ] Total duration shown
- [ ] Difficulty level badge
- [ ] Estimated calories displayed
- [ ] Exercise list with reps/sets
- [ ] Warmup and cooldown sections
- [ ] Coaching tips visible

### Workout Session Screen

- [ ] Timer for rest periods
- [ ] Exercise completion checkboxes
- [ ] Progress bar (% complete)
- [ ] Notes section
- [ ] "Complete Workout" button
- [ ] Save to history

---

## Performance Benchmarks

| Metric                     | Target  | Critical |
| -------------------------- | ------- | -------- |
| Response Time (LLM, Fresh) | < 8s    | < 15s    |
| Response Time (Rule-Based) | < 1s    | < 3s     |
| Response Time (Cached)     | < 500ms | < 2s     |
| Exercise Count per Workout | 8-14    | 5-20     |
| Invalid Exercise IDs       | 0       | 0        |
| Safety Filter Violations   | 0       | 0        |
| Muscle Group Coverage      | 100%    | ≥80%     |

---

## Test Data Files Needed

Create in `test-data/workout-generation/`:

1. `beginner-bodyweight.json` - Beginner, no equipment
2. `advanced-ppl-6x.json` - Advanced PPL split
3. `weight-loss-hiit.json` - HIIT for weight loss
4. `injury-restrictions.json` - Multiple injuries
5. `senior-active-recovery.json` - 65+ years old
6. `pregnancy-safe.json` - Pregnancy workouts
7. `muscle-gain-gym.json` - Full gym equipment
8. `minimal-request.json` - Required fields only

---

## Test Execution Log

| Test ID     | Status     | Date | Notes               |
| ----------- | ---------- | ---- | ------------------- |
| WORKOUT-001 | ⏳ Pending |      | Beginner full body  |
| WORKOUT-002 | ⏳ Pending |      | Advanced PPL 6x     |
| WORKOUT-003 | ⏳ Pending |      | Weight loss HIIT    |
| WORKOUT-004 | ⏳ Pending |      | Injury restrictions |
| WORKOUT-005 | ⏳ Pending |      | Senior 65+          |
| WORKOUT-006 | ⏳ Pending |      | Pregnancy safe      |
| WORKOUT-007 | ⏳ Pending |      | Cache test          |
| WORKOUT-008 | ⏳ Pending |      | Rule-based vs LLM   |

---

## Success Criteria

- [ ] All 8 test scenarios pass
- [ ] Exercise database integrity verified
- [ ] Safety filters working (0 violations)
- [ ] Workout splits selected correctly
- [ ] UI displays all workout data
- [ ] Database persistence confirmed
- [ ] Cache functioning properly
- [ ] Both rule-based and LLM working
