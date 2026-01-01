# Universal Health Calculation System

**Version:** 2.0.0
**Status:** Phase 2 Complete - Core Calculators
**Test Coverage:** 61/61 tests passing (100%)

## Quick Start

```typescript
import {
  // BMR Calculators
  MifflinStJeorBMRCalculator,
  getBMRCalculator,

  // BMI Calculators
  AsianBMICalculator,
  getBMICalculator,

  // Singletons
  tdeeCalculator,
  waterCalculator,
  macroCalculator,

  // Helpers
  detectClimate,
  assessDehydration,
} from '@/utils/healthCalculations';

// Example: Full health calculation
const user = {
  weight: 70,      // kg
  height: 175,     // cm
  age: 30,
  gender: 'male',
  bodyFat: 15,     // optional
  country: 'India',
};

// 1. BMR
const bmrCalc = getBMRCalculator(true, false); // has body fat, not athlete
const bmr = bmrCalc.calculate(user); // ~1700 kcal

// 2. TDEE
const tdee = tdeeCalculator.calculate(bmr, 'moderate', 'tropical'); // ~2833 kcal

// 3. Water
const water = waterCalculator.calculate(70, 'moderate', 'tropical'); // ~5175 ml

// 4. Macros
const protein = macroCalculator.calculateProtein(70, 'muscle_gain', 'omnivore'); // 140g
const macros = macroCalculator.calculateMacroSplit(tdee, protein, 'omnivore');
// { protein: 140g, fat: 94g, carbs: 354g }

// 5. BMI
const bmiCalc = getBMICalculator('asian');
const bmi = bmiCalc.calculate(70, 175); // 22.86
const classification = bmiCalc.getClassification(bmi);
// { category: 'Normal', healthRisk: 'low', recommendations: [...] }
```

## Available Calculators

### BMR (4 Formulas)
- `MifflinStJeorBMRCalculator` - Default, most accurate (±10%)
- `KatchMcArdleBMRCalculator` - Requires body fat (±5%)
- `CunninghamBMRCalculator` - For athletes (±5%)
- `HarrisBenedictBMRCalculator` - Legacy (±10-15%)

### BMI (5 Population Types)
- `AsianBMICalculator` - Lower cutoffs (23/27.5)
- `AfricanBMICalculator` - Higher cutoffs (27/32)
- `StandardBMICalculator` - WHO standard (25/30)
- `AthleticBMICalculator` - For muscular individuals
- `HispanicBMICalculator` - Diabetes screening emphasis

### TDEE (Climate-Adaptive)
- `ClimateAdaptiveTDEECalculator`
- Tropical: +7.5% | Temperate: baseline | Cold: +15% | Arid: +5%

### Water (Climate-Adaptive)
- `ClimateAdaptiveWaterCalculator`
- Tropical: 1.5× | Temperate: 1.0× | Cold: 0.9× | Arid: 1.7×

### Macros (Diet-Adaptive)
- `DietAdaptiveMacroCalculator`
- Vegan: +25% protein | Vegetarian: +15% protein
- Keto: 70/25/5 | Low-carb: 45/30/25 | Balanced: 30/20/50

## Helper Functions

```typescript
// Auto-select best BMR formula
const calculator = getBMRCalculator(hasBodyFat, isAthlete);

// Auto-select BMI calculator
const bmiCalc = getBMICalculator('asian'); // 'asian' | 'african' | 'caucasian' | 'hispanic' | 'athletic' | 'general'

// Detect climate from country
const climate = detectClimate('India'); // 'tropical'

// Assess dehydration
const assessment = assessDehydration({
  darkUrine: true,
  dryMouth: true,
  fatigue: false,
  dizziness: false,
  headache: false,
  reducedUrination: false,
});
// { level: 'mild', symptomCount: 2, recommendations: [...] }

// Minimum/optimal protein
const minProtein = getMinimumProtein(70); // 84g (1.2 g/kg)
const optimalProtein = getOptimalProteinForMuscleGain(70, 'vegan'); // 175g
```

## Detailed Breakdowns

```typescript
// TDEE breakdown
const breakdown = tdeeCalculator.getBreakdown(1700, 'moderate', 'tropical');
console.log(breakdown.breakdown);
/*
BMR: 1700 kcal
× Activity (moderate): 1.55
= 2635 kcal
× Climate (tropical): 1.075
= 2833 kcal
*/

// Water breakdown
const waterBreakdown = waterCalculator.getBreakdown(70, 'moderate', 'tropical');
console.log(waterBreakdown);
/*
{
  baseWater: 2450,
  activityBonus: 1000,
  climateMultiplier: 1.5,
  totalWater: 5175,
  liters: 5.2,
  cups: 21.8
}
*/

// Macro percentages
const percentages = macroCalculator.getMacroPercentages(macros);
// { protein: 27%, fat: 31%, carbs: 42%, totalCalories: 2833 }
```

## Diet-Specific Recommendations

```typescript
const recs = macroCalculator.getDietRecommendations('vegan');
console.log(recs);
/*
{
  proteinSources: ['Tempeh', 'Tofu', 'Legumes', 'Seitan', 'Quinoa', 'Protein powder'],
  fatSources: ['Nuts', 'Seeds', 'Avocado', 'Olive oil', 'Nut butter'],
  carbSources: ['Brown rice', 'Oats', 'Quinoa', 'Sweet potato', 'Fruits'],
  tips: [
    'Combine complementary proteins (rice + beans)',
    'Consider B12 and iron supplementation',
    'Eat 25% more protein than omnivores'
  ]
}
*/
```

## Climate-Specific Recommendations

```typescript
const waterRecs = waterCalculator.getRecommendations('arid');
// [
//   'Increase intake significantly',
//   'Electrolyte replacement critical',
//   'Humidity is very low - rapid dehydration risk',
//   'Monitor for signs of dehydration closely',
//   ...
// ]
```

## Validation

```typescript
// Validate macro distribution
const validation = macroCalculator.validateMacros(
  { protein: 150, fat: 67, carbs: 250 },
  2000
);

if (!validation.valid) {
  console.error('Issues:', validation.issues);
}
```

## Types

```typescript
import type {
  UserProfile,
  ActivityLevel,      // 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  ClimateType,        // 'tropical' | 'temperate' | 'cold' | 'arid'
  DietType,           // 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | 'low_carb'
  Goal,               // 'fat_loss' | 'muscle_gain' | 'maintenance' | 'athletic' | 'endurance' | 'strength'
  BMIClassification,
  BMICutoffs,
  Macros,             // { protein: number, fat: number, carbs: number }
} from '@/utils/healthCalculations';
```

## Population-Specific Examples

### Asian User
```typescript
const bmiCalc = new AsianBMICalculator();
const bmi = bmiCalc.calculate(70, 175); // 22.86
const classification = bmiCalc.getClassification(bmi);
// category: 'Normal' (Asian cutoff: 18.5-23, not 18.5-25)
```

### African User
```typescript
const bmiCalc = new AfricanBMICalculator();
const bmi = bmiCalc.calculate(85, 180); // 26.2
const classification = bmiCalc.getClassification(bmi);
// category: 'Normal' (African cutoff: 18.5-27, not 18.5-25)
```

### Athletic User
```typescript
const bmiCalc = new AthleticBMICalculator();
const bmi = bmiCalc.calculate(90, 180); // 27.8
const classification = bmiCalc.getClassification(bmi);
// category: 'Overweight' but recommendations say use body fat % instead
```

## Testing

Run tests:
```bash
npm test -- src/utils/healthCalculations/__tests__/calculators.test.ts
```

61 tests covering:
- All 4 BMR formulas
- All 5 BMI calculators
- Climate adjustments (tropical, cold, arid)
- Diet adjustments (vegan, vegetarian, keto)
- Integration workflows
- Edge cases and validation

## Documentation

- **Full Implementation Guide:** `PHASE_2_IMPLEMENTATION_COMPLETE.md`
- **Phase 1 Documentation:** See `autoDetection.ts` and `calculatorFactory.ts`

## Version History

- **v2.0.0** - Phase 2: Core Calculators (BMR, BMI, TDEE, Water, Macros)
- **v1.0.0** - Phase 1: Foundation (Auto-detection, Factory)

## License

Internal FitAI project - All rights reserved
