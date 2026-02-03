# Smart Rate Alternatives System - Implementation Plan

## Overview

Create a graduated spectrum of weight loss rate alternatives calculated from the user's actual metabolic data (BMR, TDEE), not arbitrary numbers. This helps users make informed decisions while keeping them motivated.

---

## Problem Statement

**Current Issue:** When user's desired rate (e.g., 1.3 kg/week) requires eating below BMR, the system either:

1. Silently caps it to a safe rate (0.47 kg/week) - demotivating
2. Shows a warning but only offers 1-2 alternatives with huge gaps

**Solution:** Show a spectrum of alternatives with:

- Graduated options (1.3 → 1.0 → 0.8 → 0.55 → 0.42 kg/week)
- Clear risk indicators for each option
- Timeline impact for each choice
- Exercise options to achieve faster rates safely
- Proper data sync when user selects an alternative

---

## Key Decisions

| Question                | Decision                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| Where to show           | AdvancedReviewTab (5th tab) - Weight Management section             |
| Hide worse alternatives | Yes - only show equal or better (slower) options than user's choice |
| Exercise options        | Show multiple intensities (Light/Moderate/Intense)                  |
| Minimum calorie floor   | 1200 cal (women) / 1500 cal (men) - BLOCK options below this        |

---

## UI Design

### Rate Comparison Card (in AdvancedReviewTab - Weight Management Section)

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR WEIGHT LOSS PLAN                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Your Goal: 1.3 kg/week                                        │
│  Target Weight: 80 kg • Current: 100 kg                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ⚠️ This pace requires eating below your BMR      ⓘ       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  CHOOSE YOUR APPROACH:                                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🔥 KEEP MY GOAL                              ⛔ Risky     │ │
│  │    1.3 kg/week • 770 cal/day                              │ │
│  │    Reach 80kg in ~6 weeks                                 │ │
│  │    ⚠️ 830 cal below BMR - Tap ⓘ for risks               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ⚡ AGGRESSIVE                                 ⚠️ Caution  │ │
│  │    1.0 kg/week • 1,100 cal/day                            │ │
│  │    Reach 80kg in ~8 weeks                                 │ │
│  │    ⚠️ 500 cal below BMR                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 💪 CHALLENGING                               ⚡ Moderate  │ │
│  │    0.8 kg/week • 1,320 cal/day                            │ │
│  │    Reach 80kg in ~10 weeks                                │ │
│  │    ⚠️ 280 cal below BMR                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ✅ AT YOUR BMR                    ✅ Recommended          │ │
│  │    0.55 kg/week • 1,600 cal/day                           │ │
│  │    Reach 80kg in ~14 weeks                                │ │
│  │    Safe & effective fat loss                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🛡️ COMFORTABLE                               💚 Easy     │ │
│  │    0.42 kg/week • 1,800 cal/day                           │ │
│  │    Reach 80kg in ~18 weeks                                │ │
│  │    Easier to maintain, minimal hunger                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ── OR ADD EXERCISE ──────────────────────────────────────────  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🚶 LIGHT ACTIVITY                            💚 Easy     │ │
│  │    0.65 kg/week • 1,600 cal + 30 min walk                │ │
│  │    Reach 80kg in ~12 weeks                                │ │
│  │    Eat at BMR + burn 150 cal through walking              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🏃 MODERATE ACTIVITY                         💪 Active   │ │
│  │    0.8 kg/week • 1,600 cal + 30 min jog                  │ │
│  │    Reach 80kg in ~10 weeks                                │ │
│  │    Eat at BMR + burn 300 cal through jogging              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🔥 INTENSE ACTIVITY                          ⚡ Intense  │ │
│  │    1.0 kg/week • 1,600 cal + 30 min HIIT                 │ │
│  │    Reach 80kg in ~8 weeks                                 │ │
│  │    Eat at BMR + burn 450 cal through HIIT                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### BMR Info Modal (When user taps ⓘ)

```
┌─────────────────────────────────────────────────────────────────┐
│                  ⚠️ EATING BELOW BMR                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Your BMR (Basal Metabolic Rate) is 1,600 cal/day.             │
│  This is the minimum energy your body needs to:                 │
│  • Keep your heart beating                                      │
│  • Maintain brain function                                      │
│  • Support breathing and organ function                         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  RISKS OF EATING BELOW BMR:                                     │
│                                                                 │
│  ❌ Muscle Loss                                                 │
│     Your body burns muscle for energy when starved              │
│                                                                 │
│  ❌ Metabolic Slowdown                                          │
│     Makes future weight loss harder                             │
│                                                                 │
│  ❌ Fatigue & Brain Fog                                         │
│     Low energy, difficulty concentrating                        │
│                                                                 │
│  ❌ Nutrient Deficiencies                                       │
│     Hard to get vitamins/minerals with fewer calories           │
│                                                                 │
│  ❌ Hair Loss & Brittle Nails                                   │
│     Body prioritizes vital organs over appearance               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  You CAN still choose an aggressive goal - we won't stop you.  │
│  But we recommend a sustainable pace for long-term success.    │
│                                                                 │
│                    [ I UNDERSTAND ]                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Exercise Options

| Intensity | Icon | Duration    | Calories Burned | Description                      |
| --------- | ---- | ----------- | --------------- | -------------------------------- |
| Light     | 🚶   | 30 min walk | ~150 cal        | Easy, sustainable for beginners  |
| Moderate  | 🏃   | 30 min jog  | ~300 cal        | Good balance of effort & results |
| Intense   | 🔥   | 30 min HIIT | ~450 cal        | Maximum burn, requires fitness   |

---

## Technical Specification

### 1. SmartAlternative Interface

```typescript
// Add to src/services/validationEngine.ts

interface SmartAlternative {
  id: string; // Unique identifier
  label: string; // "KEEP MY GOAL", "AGGRESSIVE", etc.
  weeklyRate: number; // kg/week
  dailyCalories: number; // Calculated intake
  bmrDifference: number; // Negative = below BMR
  timelineWeeks: number; // Weeks to reach goal
  riskLevel: "blocked" | "dangerous" | "caution" | "moderate" | "safe" | "easy";
  icon: string; // Emoji icon
  badge: string; // "⛔ Risky", "✅ Recommended", etc.
  description: string; // Short description
  isUserOriginal: boolean; // True for "Keep My Goal"
  isRecommended: boolean; // True for "At Your BMR"
  isBlocked: boolean; // True if below minimum calorie floor
  blockReason?: string; // Why it's blocked

  // Exercise-specific fields
  requiresExercise: boolean;
  exerciseType?: "light" | "moderate" | "intense";
  exerciseMinutes?: number;
  exerciseCaloriesBurned?: number;
  exerciseDescription?: string; // "30 min walk", "30 min HIIT"
}

interface SmartAlternativesResult {
  alternatives: SmartAlternative[];
  userBMR: number;
  userTDEE: number;
  currentWeight: number;
  targetWeight: number;
  weightToLose: number;
  originalRequestedRate: number;
  showRateComparison: boolean; // True if user's rate requires below-BMR eating
  minimumCalorieFloor: number; // 1200 (women) or 1500 (men)
}
```

### 2. calculateSmartAlternatives() Function

```typescript
// Add to src/services/validationEngine.ts

function calculateSmartAlternatives(
  userRequestedRate: number, // kg/week user wants
  bmr: number, // User's BMR
  tdee: number, // User's TDEE
  currentWeight: number, // Current weight in kg
  targetWeight: number, // Target weight in kg
  gender: "male" | "female", // For minimum calorie floor
): SmartAlternativesResult {
  const CALORIE_PER_KG = 7700; // Calories to lose 1 kg
  const MIN_CALORIES_FEMALE = 1200;
  const MIN_CALORIES_MALE = 1500;

  const minimumCalorieFloor =
    gender === "female" ? MIN_CALORIES_FEMALE : MIN_CALORIES_MALE;
  const weightToLose = currentWeight - targetWeight;

  // Calculate what rate allows eating at BMR
  const bmrDeficit = tdee - bmr;
  const rateAtBMR = (bmrDeficit * 7) / CALORIE_PER_KG;

  // Define rate tiers (will be filtered later)
  const rateTiers = [
    {
      id: "user_original",
      rate: userRequestedRate,
      label: "KEEP MY GOAL",
      icon: "🔥",
      isUserOriginal: true,
    },
    {
      id: "aggressive",
      rate: 1.0,
      label: "AGGRESSIVE",
      icon: "⚡",
      isUserOriginal: false,
    },
    {
      id: "challenging",
      rate: 0.8,
      label: "CHALLENGING",
      icon: "💪",
      isUserOriginal: false,
    },
    {
      id: "at_bmr",
      rate: rateAtBMR,
      label: "AT YOUR BMR",
      icon: "✅",
      isUserOriginal: false,
      isRecommended: true,
    },
    {
      id: "comfortable",
      rate: Math.max(0.3, rateAtBMR - 0.15),
      label: "COMFORTABLE",
      icon: "🛡️",
      isUserOriginal: false,
    },
  ];

  // Exercise options (eating at BMR + exercise burns extra)
  const exerciseOptions = [
    {
      id: "exercise_light",
      exerciseType: "light",
      minutes: 30,
      caloriesBurn: 150,
      icon: "🚶",
      label: "LIGHT ACTIVITY",
      description: "30 min walk",
    },
    {
      id: "exercise_moderate",
      exerciseType: "moderate",
      minutes: 30,
      caloriesBurn: 300,
      icon: "🏃",
      label: "MODERATE ACTIVITY",
      description: "30 min jog",
    },
    {
      id: "exercise_intense",
      exerciseType: "intense",
      minutes: 30,
      caloriesBurn: 450,
      icon: "🔥",
      label: "INTENSE ACTIVITY",
      description: "30 min HIIT",
    },
  ];

  // Build alternatives array...
  // (Full implementation in code)
}
```

### 3. Color Scheme

| Risk Level | Background             | Border                 | Badge Color |
| ---------- | ---------------------- | ---------------------- | ----------- |
| blocked    | `#F3F4F6` (gray-100)   | `#9CA3AF` (gray-400)   | Gray        |
| dangerous  | `#FEE2E2` (red-100)    | `#EF4444` (red-500)    | Red         |
| caution    | `#FEF3C7` (amber-100)  | `#F59E0B` (amber-500)  | Orange      |
| moderate   | `#FEF9C3` (yellow-100) | `#EAB308` (yellow-500) | Yellow      |
| safe       | `#DCFCE7` (green-100)  | `#22C55E` (green-500)  | Green       |
| easy       | `#DBEAFE` (blue-100)   | `#3B82F6` (blue-500)   | Blue        |

---

## Files to Create/Modify

### New Files

| File                                               | Description                                  |
| -------------------------------------------------- | -------------------------------------------- |
| `src/components/onboarding/RateComparisonCard.tsx` | Main card component showing all alternatives |
| `src/components/onboarding/BMRInfoModal.tsx`       | Modal explaining BMR and risks               |
| `src/components/onboarding/AlternativeOption.tsx`  | Single alternative option component          |

### Modified Files

| File                                                | Changes                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/services/validationEngine.ts`                  | Add `SmartAlternative` interface and `calculateSmartAlternatives()` function |
| `src/screens/onboarding/tabs/AdvancedReviewTab.tsx` | Import and render `RateComparisonCard`, handle selection                     |
| `src/stores/userStore.ts`                           | Add action to update rate and trigger recalculation                          |
| `src/hooks/useCalculatedMetrics.ts`                 | Ensure metrics recalculate when rate changes                                 |

---

## Data Flow

```
User opens AdvancedReviewTab
         ↓
ValidationEngine.validateUserPlan() called
         ↓
calculateSmartAlternatives() generates options
         ↓
RateComparisonCard renders with alternatives
         ↓
User taps an alternative (e.g., "Challenging 0.8 kg/week")
         ↓
RateComparisonCard.onSelect(alternative)
         ↓
AdvancedReviewTab.handleRateSelection(alternative)
         ↓
┌────────────────────────────────────────────────────────────┐
│  1. Update userStore.weeklyWeightGoal = 0.8               │
│  2. Update userStore.exercisePlan if exercise option      │
│  3. Call invalidateMetricsCache()                         │
│  4. Re-run ValidationEngine.validateUserPlan()            │
│  5. Update local state to trigger re-render               │
└────────────────────────────────────────────────────────────┘
         ↓
All UI components update:
  - Daily calories update
  - Macros update (protein, carbs, fat)
  - Timeline updates
  - Warnings may disappear (if rate is now safe)
  - Water intake may update
  - Everything synced!
```

---

## Minimum Calorie Floor Logic

| Gender | Minimum      | Behavior                 |
| ------ | ------------ | ------------------------ |
| Female | 1200 cal/day | BLOCK options below this |
| Male   | 1500 cal/day | BLOCK options below this |

Blocked options are shown grayed out with explanation of why they're not available.

---

## Implementation Order

| Step | Task                                                    | Priority | Est. Time |
| ---- | ------------------------------------------------------- | -------- | --------- |
| 1    | Add `SmartAlternative` interface to validationEngine.ts | High     | 15 min    |
| 2    | Implement `calculateSmartAlternatives()` function       | High     | 45 min    |
| 3    | Create `BMRInfoModal.tsx` component                     | High     | 30 min    |
| 4    | Create `AlternativeOption.tsx` component                | High     | 30 min    |
| 5    | Create `RateComparisonCard.tsx` component               | High     | 45 min    |
| 6    | Integrate into AdvancedReviewTab                        | High     | 30 min    |
| 7    | Wire up selection → store updates → recalculation       | High     | 45 min    |
| 8    | Add exercise-specific store updates                     | Medium   | 30 min    |
| 9    | Test full flow end-to-end                               | High     | 30 min    |
| 10   | Polish UI and animations                                | Low      | 30 min    |

**Total Estimated Time: ~5-6 hours**

---

## Edge Cases to Handle

1. **User's rate is already safe (at or above BMR)**
   - Don't show the Rate Comparison Card
   - Or show it but with user's rate marked as "✅ Recommended"

2. **All rates would be below minimum calorie floor**
   - Show error message
   - Suggest increasing target weight or extending timeline

3. **Weight gain goal (not weight loss)**
   - Don't show Rate Comparison Card (different logic applies)

4. **Very small weight to lose (< 2 kg)**
   - Adjust timeline calculations
   - May not need aggressive rates

5. **User selects exercise option but later removes exercise**
   - Need to recalculate and possibly show warning again

---

## Testing Scenarios

| Scenario                                      | Expected Behavior                            |
| --------------------------------------------- | -------------------------------------------- |
| User wants 1.3 kg/week, BMR=1600, TDEE=2200   | Show all 5 diet options + 3 exercise options |
| User wants 0.5 kg/week (safe rate)            | Don't show Rate Comparison Card              |
| User selects "Aggressive 1.0 kg/week"         | All metrics recalculate, warnings update     |
| User selects exercise option                  | Exercise plan updates, calories at BMR       |
| User's rate would require < 1200 cal (female) | "Keep My Goal" option is blocked/grayed      |
| User taps ⓘ on BMR warning                    | BMRInfoModal opens                           |

---

## Success Criteria

1. ✅ User sees graduated alternatives (not just one safe option)
2. ✅ Each alternative shows clear risk level and timeline impact
3. ✅ Exercise options provide path to faster rates safely
4. ✅ Selecting an alternative updates ALL calculations (calories, macros, etc.)
5. ✅ Dangerous options are warned, not blocked (except below minimum floor)
6. ✅ BMR info modal educates without being preachy
7. ✅ UI is clean, intuitive, and motivating
8. ✅ Data stays consistent across all stores and screens

---

## Previous Work Reference

See the completed fixes in the codebase:

- Issue 1: Data sync after onboarding (App.tsx, HomeScreen.tsx)
- Issue 2: Preserve original rate (validationEngine.ts - `originalWeeklyRate`, `wasRateCapped`)
- Issue 3: Alternatives for aggressive goals (WarningCard.tsx, AdjustmentWizard.tsx, AdvancedReviewTab.tsx)

This new feature builds on that foundation by providing a more comprehensive alternatives system.
