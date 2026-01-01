# Health Calculation Testing - Quick Reference

**Phase 5: Comprehensive Global Testing & Validation**

---

## Quick Start

```bash
# Run all 200+ tests
npm run test:health

# Show test summary
npm run test:health:summary

# Run specific suite
npm run test:health:global      # 60 tests
npm run test:health:diet        # 40 tests
npm run test:health:climate     # 45 tests
npm run test:health:goals       # 35 tests
npm run test:health:edge        # 20 tests

# With coverage
npm run test:health:coverage
```

---

## Test Suites at a Glance

| Suite | Tests | What It Tests |
|-------|-------|---------------|
| **globalPopulations.test.ts** | 60+ | 20+ countries, all BMI systems |
| **dietTypes.test.ts** | 40+ | 6 diet types, protein adjustments |
| **climateAdjustments.test.ts** | 45+ | 4 climate zones, TDEE/water |
| **goalValidation.test.ts** | 35+ | Fat loss, muscle gain, validation |
| **edgeCases.test.ts** | 20+ | Extremes, boundaries, precision |

---

## Population Coverage

### Asia (13 countries)
India, China, Japan, Korea, Taiwan, Thailand, Vietnam, Malaysia, Indonesia, Singapore, Pakistan, Bangladesh, Sri Lanka

### Middle East (5 countries)
UAE, Saudi Arabia, Qatar, Kuwait, Egypt

### Africa (4 countries)
Nigeria, South Africa, Kenya, Ethiopia

### Europe (9 countries)
Norway, Sweden, Finland, Iceland, UK, Germany, France, Spain, Italy

### Americas (7 countries)
USA, Canada, Brazil, Mexico, Argentina, Colombia

### Oceania (3 countries)
Australia, New Zealand, Fiji

---

## Diet Type Coverage

| Diet | Protein Adjustment | Macro Split |
|------|-------------------|-------------|
| **Omnivore** | Baseline | Standard |
| **Vegetarian** | +15% | Standard |
| **Vegan** | +25% | Standard |
| **Pescatarian** | +10% | Standard |
| **Keto** | Standard | 70/25/5 |
| **Low-Carb** | Standard | Reduced carbs |

---

## Climate Coverage

| Climate | TDEE | Water | Countries |
|---------|------|-------|-----------|
| **Tropical** | +5% | +50% | India, Thailand, Brazil |
| **Temperate** | 0% | 0% | UK, France, Germany |
| **Cold** | +15% | -10% | Norway, Sweden, Canada |
| **Arid** | +5% | +70% | UAE, Saudi Arabia |

---

## Goal Validation

### Fat Loss Tiers
- **0.5 kg/week**: Conservative ✅
- **0.75 kg/week**: Standard ✅
- **1.0 kg/week**: Aggressive ⚠️
- **1.5+ kg/week**: Very Aggressive ⚠️⚠️

### Muscle Gain (Monthly)
| Level | Male | Female |
|-------|------|--------|
| Beginner | 1.0 kg | 0.5 kg |
| Intermediate | 0.5 kg | 0.25 kg |
| Advanced | 0.25 kg | 0.125 kg |

---

## Edge Cases Tested

✅ Age: 18-80+ years
✅ Height: 140-210 cm
✅ Weight: 40-200 kg
✅ Body Fat: 6-40%
✅ Activity: Sedentary to Very Active
✅ BMI Boundaries
✅ Missing Data
✅ Decimal Precision
✅ Multiple Extremes Combined

---

## Test File Locations

```
D:/FitAi/FitAI/src/utils/healthCalculations/__tests__/
├── globalPopulations.test.ts
├── dietTypes.test.ts
├── climateAdjustments.test.ts
├── goalValidation.test.ts
├── edgeCases.test.ts
├── testSummary.ts
└── README.md
```

---

## Example Test Cases

### Test 1: Indian Vegetarian
```typescript
{ age: 30, gender: 'male', weight: 70, height: 175,
  country: 'IN', dietType: 'vegetarian', goal: 'fat_loss' }

Expected:
✓ Asian BMI (22.86 = Normal)
✓ Tropical climate
✓ Protein +15%
✓ Water +50%
```

### Test 2: UAE Athlete
```typescript
{ age: 28, gender: 'male', weight: 85, height: 180,
  country: 'AE', activityLevel: 'very_active', goal: 'muscle_gain' }

Expected:
✓ Arid climate
✓ Water +70%
✓ High TDEE
✓ Advanced muscle gain
```

### Test 3: Norwegian Cold
```typescript
{ age: 40, gender: 'female', weight: 60, height: 168,
  country: 'NO', dietType: 'pescatarian', goal: 'fat_loss' }

Expected:
✓ Cold climate
✓ TDEE +15%
✓ Water -10%
✓ Protein +10%
```

---

## Running Tests in Watch Mode

```bash
npm test -- healthCalculations --watch
```

Watch mode automatically re-runs tests when files change.

---

## Coverage Report

```bash
npm run test:health:coverage
```

Generates coverage report in `coverage/` directory.

---

## Debugging Failed Tests

1. Run specific test file:
   ```bash
   npm test -- globalPopulations.test
   ```

2. Add `.only` to focus on one test:
   ```typescript
   it.only('should test specific case', () => { ... });
   ```

3. Check console output for detailed logs

4. Verify input data matches expected format

---

## Integration with Onboarding

The health calculation tests validate the same system used in onboarding:

```typescript
import { HealthCalculatorFacade } from '@/utils/healthCalculations';

const metrics = HealthCalculatorFacade.calculateAllMetrics(userProfile);
// Returns: BMR, BMI, TDEE, macros, water, etc.
```

---

## Key Assertions

### BMI Classification
```typescript
expect(metrics.bmi).toBeCloseTo(expectedBMI, 1);
expect(metrics.bmiClassification.category).toBe('Normal');
```

### Climate Detection
```typescript
expect(metrics.climate).toBe('tropical');
expect(metrics.waterIntakeML).toBeGreaterThan(3500);
```

### Protein Adjustments
```typescript
expect(metrics.protein).toBeGreaterThan(baseProtein * 1.13);
```

### Goal Validation
```typescript
expect(validation.valid).toBe(true);
expect(validation.severity).toBe('success');
```

---

## Adding New Tests

1. Choose appropriate test file
2. Add test case following existing pattern
3. Update `testSummary.ts` with new count
4. Run test suite to verify
5. Update documentation

---

## Common Test Patterns

### Testing User Profile
```typescript
const user: UserProfile = {
  age: 30,
  gender: 'male',
  weight: 70,
  height: 175,
  country: 'US',
  activityLevel: 'moderate',
  goal: 'maintenance',
};

const metrics = HealthCalculatorFacade.calculateAllMetrics(user);
```

### Testing Goal Validation
```typescript
const validation = HealthCalculatorFacade.validateGoal(user, {
  type: 'fat_loss',
  targetWeight: 65,
  timelineWeeks: 10,
});

expect(validation.valid).toBe(true);
```

### Testing Climate Impact
```typescript
const tropical = HealthCalculatorFacade.calculateAllMetrics({
  ...baseUser,
  country: 'IN', // Tropical
});

const temperate = HealthCalculatorFacade.calculateAllMetrics({
  ...baseUser,
  country: 'UK', // Temperate
});

expect(tropical.waterIntakeML).toBeGreaterThan(temperate.waterIntakeML);
```

---

## Success Criteria Checklist

- ✅ All 200+ tests pass
- ✅ Coverage report shows 100%
- ✅ No console errors
- ✅ All edge cases handled
- ✅ All populations validated
- ✅ All climates tested
- ✅ All diets validated
- ✅ All goals tested

---

## Contact & Support

For issues or questions:
1. Check test output for specific failures
2. Review `README.md` in `__tests__/` directory
3. Check `testSummary.ts` for test breakdown
4. Verify user profile data format

---

**Universal Health System - Validated Globally** ✅

**Run Tests:** `npm run test:health`
