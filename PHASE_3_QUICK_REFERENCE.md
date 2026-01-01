# PHASE 3: ADVANCED HEALTH FEATURES - QUICK REFERENCE

**Version:** 1.0.0 | **Status:** Production Ready | **Tests:** 64/64 Passing

---

## IMPORT STATEMENTS

```typescript
// Import all Phase 3 calculators
import {
  muscleGainCalculator,
  fatLossValidator,
  heartRateCalculator,
  vo2MaxCalculator,
  healthScoreCalculator,
} from '@/utils/healthCalculations/calculators';

// Import types
import {
  MuscleGainLimits,
  GoalValidation,
  HeartRateZones,
  VO2MaxEstimate,
  HealthScore,
} from '@/utils/healthCalculations/types';
```

---

## 1. MUSCLE GAIN CALCULATOR

### Calculate Maximum Gain Rate
```typescript
const limits = muscleGainCalculator.calculateMaxGainRate(user);
// Returns: { monthlyKg: 1.0, yearlyKg: 12.0, category: 'Beginner', confidenceLevel: 'medium' }
```

### Validate Muscle Gain Goal
```typescript
const validation = muscleGainCalculator.validateGoal(
  10,    // targetGain (kg)
  12,    // timelineMonths
  user
);
// Returns: { valid: true, severity: 'success', achievementProbability: 80, recommendations: [...] }
```

### Estimate First Year Potential
```typescript
const potential = muscleGainCalculator.estimateFirstYearPotential(user);
// Returns: { optimistic: 14.4, realistic: 12.0, conservative: 9.6 }
```

### Calculate Career Potential
```typescript
const career = muscleGainCalculator.calculateCareerPotential(user);
// Returns: { totalPotential: 23.5, timeToReach: 5, breakdown: {...} }
```

---

## 2. FAT LOSS VALIDATOR

### Validate Fat Loss Goal
```typescript
const validation = fatLossValidator.validateGoal(
  80,   // currentWeight (kg)
  70,   // targetWeight (kg)
  10,   // timelineWeeks
  25    // BMI
);
// Returns: { valid: true, severity: 'success', achievementProbability: 85, recommendations: [...] }
```

**Severity Levels:**
- `'success'` - 0.5-1 kg/week (optimal)
- `'info'` - 1-1.5 kg/week (aggressive)
- `'warning'` - 1.5-2 kg/week (very aggressive)
- `'error'` - >2 kg/week (extreme)

### Calculate Safe Deficit
```typescript
const deficit = fatLossValidator.calculateSafeDeficit(
  28,      // BMI
  2500,    // TDEE
  'moderate'  // activityLevel
);
// Returns: { minDeficit: 300, maxDeficit: 1000, recommendedDeficit: 500 }
```

### Validate Timeline
```typescript
const timeline = fatLossValidator.validateTimeline(
  80,   // currentWeight
  70,   // targetWeight
  25    // BMI
);
// Returns: { minWeeks: 10, optimalWeeks: 13, maxWeeks: 20 }
```

### Calculate Protein Requirements
```typescript
const protein = fatLossValidator.calculateProteinRequirements(
  60,   // leanBodyMass (kg)
  1.0   // weeklyRate (kg/week)
);
// Returns: { minimum: 114, optimal: 132, maximum: 150 }
```

---

## 3. HEART RATE CALCULATOR

### Calculate Heart Rate Zones
```typescript
const zones = heartRateCalculator.calculateZones(
  30,      // age
  'male',  // gender
  60       // restingHR (optional)
);
// Returns: { zone1: {...}, zone2: {...}, ..., metadata: {...} }
```

**Zone Breakdown:**
- **Zone 1 (Recovery):** 50-60% - Active recovery
- **Zone 2 (Aerobic):** 60-70% - Fat burning
- **Zone 3 (Tempo):** 70-80% - Lactate threshold
- **Zone 4 (Threshold):** 80-90% - VO2 max
- **Zone 5 (VO2 Max):** 90-100% - Max performance

### Calculate Maximum Heart Rate
```typescript
const maxHR = heartRateCalculator.calculateMaxHR(
  30,       // age
  'female', // gender
  190       // measured (optional)
);
// Returns: 180 (Gulati formula for females)
```

### Classify Resting Heart Rate
```typescript
const classification = heartRateCalculator.classifyRestingHR(
  55,     // restingHR
  30,     // age
  'male'  // gender
);
// Returns: { classification: 'Excellent', description: '...', healthImplications: '...' }
```

### Calculate Target Heart Rate
```typescript
const target = heartRateCalculator.calculateTargetHR(
  30,     // age
  'male', // gender
  70,     // intensityPercent
  60      // restingHR (optional)
);
// Returns: { target: 148, range: { min: 141, max: 155 }, zone: 'Tempo' }
```

### Estimate Fitness from Resting HR
```typescript
const fitness = heartRateCalculator.estimateFitnessFromRHR(
  55,     // restingHR
  30,     // age
  'male'  // gender
);
// Returns: { fitnessLevel: 'Excellent', score: 95 }
```

---

## 4. VO2 MAX CALCULATOR

### Estimate VO2 Max
```typescript
const estimate = vo2MaxCalculator.estimateVO2Max(
  user,     // UserProfile with age, gender, activity_level
  70        // restingHR
);
// Returns: { vo2max: 45.2, classification: 'Above Average', percentile: 50, recommendations: [...] }
```

**Classifications:**
- **Excellent** (95th percentile)
- **Good** (75th percentile)
- **Above Average** (50th percentile)
- **Average** (30th percentile)
- **Below Average** (15th percentile)

### Estimate Improvement Potential
```typescript
const potential = vo2MaxCalculator.estimateImprovementPotential(
  45,        // currentVO2Max
  'moderate' // activityLevel
);
// Returns: { potential6Months: 51.8, potential1Year: 54.3, improvementPercent: 15 }
```

---

## 5. HEALTH SCORE CALCULATOR

### Calculate Comprehensive Health Score
```typescript
const score = healthScoreCalculator.calculate(user, {
  bmi: 22,
  bmiCategory: 'Normal',
  waterIntake: 2500,
  waterTarget: 2500,
  protein: 120,
  proteinTarget: 120,
  vo2max: 50,
});
// Returns: { totalScore: 88, grade: 'B (Good)', factors: [...], recommendations: [...] }
```

**Scoring Breakdown (100 points):**
- BMI/Body Composition: 20 points
- Physical Activity: 20 points
- Hydration: 15 points
- Nutrition Quality: 25 points
- Cardiovascular Fitness: 20 points

**Grade Scale:**
- A (90-100): Excellent
- B (80-89): Good
- C (70-79): Fair
- D (60-69): Needs Improvement
- F (<60): Poor

### Analyze Health Score Trend
```typescript
const trend = healthScoreCalculator.analyzeTrend(
  88,   // currentScore
  75    // previousScore
);
// Returns: { trend: 'improving', change: 13, message: 'Health score improved by 13 points!' }
```

---

## COMMON USE CASES

### 1. Onboarding Goal Validation
```typescript
const validateUserGoal = (user, goal) => {
  if (goal.type === 'muscle_gain') {
    return muscleGainCalculator.validateGoal(
      goal.targetGain,
      goal.timelineMonths,
      user
    );
  } else if (goal.type === 'fat_loss') {
    return fatLossValidator.validateGoal(
      user.currentWeight,
      goal.targetWeight,
      goal.timelineWeeks,
      user.bmi
    );
  }
};
```

### 2. Comprehensive Health Dashboard
```typescript
const getHealthDashboard = (user, metrics, restingHR) => {
  const hrZones = heartRateCalculator.calculateZones(user.age, user.gender, restingHR);
  const vo2max = vo2MaxCalculator.estimateVO2Max(user, restingHR);
  const healthScore = healthScoreCalculator.calculate(user, {
    ...metrics,
    vo2max: vo2max.vo2max,
  });

  return { hrZones, vo2max, healthScore };
};
```

### 3. Progress Tracking
```typescript
const trackProgress = (user, currentMetrics, previousScore) => {
  const currentScore = healthScoreCalculator.calculate(user, currentMetrics);
  const trend = healthScoreCalculator.analyzeTrend(currentScore.totalScore, previousScore);

  return {
    score: currentScore,
    trend,
    improvements: currentScore.recommendations,
  };
};
```

### 4. Personalized Workout Zones
```typescript
const getWorkoutZones = (user, restingHR) => {
  const zones = heartRateCalculator.calculateZones(user.age, user.gender, restingHR);

  // Recommend zones based on goal
  if (user.goal === 'fat_loss') {
    return { primary: zones.zone2, secondary: zones.zone3 };
  } else if (user.goal === 'endurance') {
    return { primary: zones.zone3, secondary: zones.zone4 };
  } else if (user.goal === 'performance') {
    return { primary: zones.zone4, secondary: zones.zone5 };
  }
};
```

---

## ERROR HANDLING

All calculators return valid results, but you should handle edge cases:

```typescript
try {
  const validation = muscleGainCalculator.validateGoal(targetGain, timeline, user);

  if (validation.severity === 'warning' || validation.severity === 'error') {
    // Show warning to user with override option
    showWarning(validation.message, validation.recommendations);

    if (validation.allowOverride) {
      // Allow user to proceed with acknowledgment
    }
  }
} catch (error) {
  console.error('Goal validation failed:', error);
}
```

---

## TYPESCRIPT TYPES

All calculators are fully typed. Use these types for type safety:

```typescript
import type {
  MuscleGainLimits,
  GoalValidation,
  HeartRateZones,
  HeartRateZone,
  VO2MaxEstimate,
  HealthScore,
  ScoreFactor,
  UserProfile,
} from '@/utils/healthCalculations/types';
```

---

## TESTING

Run Phase 3 tests:
```bash
npm test -- src/utils/healthCalculations/__tests__/advancedFeatures.test.ts
```

**Expected:** 64 passing tests

---

## FILES

```
src/utils/healthCalculations/
├── calculators/
│   ├── muscleGainCalculator.ts       (7 KB)
│   ├── fatLossValidator.ts           (8 KB)
│   ├── heartRateCalculator.ts        (9 KB)
│   ├── vo2MaxCalculator.ts           (11 KB)
│   ├── healthScoreCalculator.ts      (11 KB)
│   └── index.ts
├── types/
│   └── index.ts                      (updated)
└── __tests__/
    └── advancedFeatures.test.ts      (64 tests)
```

---

## QUICK TIPS

1. **Always validate goals** before creating workout/diet plans
2. **Use severity levels** to provide flexible UX (info/warning, not errors)
3. **Show percentiles** for VO2 max to give users context
4. **Track trends** in health score over time
5. **Personalize zones** based on actual resting HR when available
6. **Reference research** - All formulas are research-backed
7. **Allow overrides** for extreme goals with user acknowledgment

---

## SUPPORT

For questions or issues:
- See full documentation: `PHASE_3_ADVANCED_HEALTH_FEATURES_COMPLETE.md`
- Review test cases: `src/utils/healthCalculations/__tests__/advancedFeatures.test.ts`
- Check inline JSDoc comments in calculator files

---

**Status:** ✅ Production Ready | **Tests:** 64/64 Passing | **Version:** 1.0.0
