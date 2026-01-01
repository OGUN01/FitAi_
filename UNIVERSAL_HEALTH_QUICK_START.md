# UNIVERSAL HEALTH SYSTEM - QUICK START GUIDE

**Quick Reference:** Essential information to get started implementing the world-class health system.

---

## WHAT WE'RE BUILDING

Transform FitAI from a single-formula system to an **adaptive, population-aware health calculation engine** that works accurately for **anyone, anywhere, with any goal**.

### Before vs After

| Feature | Current (v1.0) | Universal (v2.0) |
|---------|---------------|------------------|
| **BMR Formulas** | 1 (Mifflin-St Jeor) | 4 with auto-selection |
| **BMI Classification** | General WHO | 7 population-specific |
| **Climate Adaptation** | None | 4 climate zones + regional |
| **Diet Adjustments** | Basic | Diet-type protein scaling |
| **Heart Rate Zones** | 1 formula (220-age) | 3 formulas (Karvonen, Tanaka, Gulati) |
| **Muscle Gain Limits** | Generic | Experience-based (natural limits) |
| **Validation** | Hard blocks | Tiered warnings (never block) |
| **Global Coverage** | Western bias | Universal (8B+ humans) |

---

## KEY INNOVATIONS

### 1. Auto-Detection Framework

**NO user burden** - System detects context from existing data:

```typescript
// User enters: Country = "India", State = "Maharashtra"
// System auto-detects:
{
  ethnicity: 'asian',              // 90% confidence
  climate: 'tropical',             // 90% confidence
  bmiCutoffs: 'asian',            // Lower cutoffs (23, 27.5)
  tdeeModifier: 1.05,             // +5% for heat
  waterModifier: 1.50             // +50% for sweat
}
```

**Only asks user if confidence < 70%** (e.g., USA = mixed population)

### 2. Population-Specific BMI

**Asian Example (CRITICAL for Indian users):**
```
User: 170cm, 75kg → BMI 26.0

❌ Current FitAI: "Overweight" (using general WHO)
✅ Universal System: "Obese Class I" (using Asian WHO)

Impact:
- Eligible for aggressive deficit (not just maintenance)
- Higher metabolic disease risk warning
- Accurate health assessment
```

**Why it matters:**
- Asians have 3-5% higher body fat at same BMI
- Higher diabetes/CVD risk at lower BMI thresholds
- WHO explicitly recommends Asian-specific cutoffs

### 3. Climate-Adaptive TDEE & Water

**Indian Climate Example:**
```typescript
// Rajasthan user (desert)
baseTDEE: 2000 cal
+ Climate: +5% = 2100 cal
+ Water: +70% = 3570ml/day (vs 2100ml baseline)

// Kerala user (tropical coastal)
baseTDEE: 2000 cal
+ Climate: +5% = 2100 cal
+ Water: +60% = 3360ml/day (high humidity)

// Himachal Pradesh user (mountains)
baseTDEE: 2000 cal
+ Climate: +15% = 2300 cal (cold thermogenesis)
+ Water: -10% = 1890ml/day (less sweating)
```

### 4. Diet-Type Protein Scaling

**CRITICAL for vegetarian/vegan users:**

```typescript
Goal: Muscle gain
Base protein: 2.0g/kg

Non-veg: 2.0g/kg × 1.00 = 2.0g/kg (complete proteins)
Vegetarian: 2.0g/kg × 1.15 = 2.3g/kg (+15% for bioavailability)
Vegan: 2.0g/kg × 1.25 = 2.5g/kg (+25% for plant proteins)

70kg vegan user:
❌ Current: 140g protein/day (too low - will lose muscle)
✅ Universal: 175g protein/day (adequate for growth)
```

### 5. Experience-Based Muscle Gain

**Natural limits prevent disappointment:**

```typescript
// Beginner (0-1 year): Newbie gains
Male: 0.75-1.25 kg/month (realistic)
Female: 0.375-0.625 kg/month

// Intermediate (1-3 years): Slowing progress
Male: 0.40-0.60 kg/month
Female: 0.20-0.30 kg/month

// Advanced (3-5 years): Approaching genetic limit
Male: 0.20-0.25 kg/month
Female: 0.10-0.125 kg/month

// Elite (5+ years): Near maximum
Male: 0.1 kg/month
Female: 0.05 kg/month
```

**Why it matters:**
- Prevents unrealistic expectations
- Adjusts surplus calories appropriately
- Warns when goal exceeds natural limits

### 6. Flexible Validation (Never Block)

**Tiered warning system:**

```typescript
Fat loss rate: 0.7kg/week
→ ✅ No warnings (optimal)

Fat loss rate: 1.3kg/week
→ ⚠️ CAUTION: Aggressive but achievable
   Recommendations:
   - Increase protein to 2.2g/kg
   - Consider diet breaks
   [User can proceed]

Fat loss rate: 1.8kg/week (BMI 32)
→ ⚠️⚠️ WARNING: Very aggressive (obese only)
   - Maximum 8 weeks
   - Mandatory strength training
   - Monitor energy daily
   [User can proceed with confirmation]

Fat loss rate: 2.5kg/week (BMI 36)
→ ⚠️⚠️⚠️ SEVERE: Medical supervision required
   - BMI ≥35 ✅
   - Doctor approval needed
   - Weekly monitoring
   [Checkbox: "I confirm medical supervision"]
   [User can still proceed]
```

**Philosophy:** Educate, warn, guide - but **NEVER block** user choice.

---

## IMPLEMENTATION PRIORITY

### P0 - Critical (Must Have)
1. **Asian BMI classifications** - Affects 60% of world population
2. **Diet-type protein adjustments** - Critical for vegetarians/vegans
3. **Katch-McArdle BMR** - When body fat % is known (±5% vs ±10% accuracy)
4. **Tiered validation warnings** - Replace hard blocks

### P1 - High Priority
5. **Climate water adjustments** - Major impact in tropical regions
6. **Experience-based muscle gain limits** - Prevents disappointment
7. **Climate TDEE adjustments** - Accuracy improvement
8. **Heart rate zone formulas** - Personalization

### P2 - Nice to Have
9. **Regional fine-tuning** (Indian states)
10. **Advanced formula overrides** (for power users)
11. **Calculation transparency UI**
12. **Audit logging**

---

## QUICK IMPLEMENTATION ROADMAP

### Week 1-2: Foundation
```bash
# Create new structure
src/utils/healthCalculations/
├── bmr/
│   ├── UniversalBMRCalculator.ts      # 4 formulas
│   └── FormulaSelector.ts             # Auto-select best
├── bmi/
│   ├── UniversalBMIClassifier.ts      # 7 populations
│   └── EthnicityDetector.ts           # Auto-detect
├── detectors/
│   ├── EthnicityDetector.ts
│   └── ClimateDetector.ts
└── types.ts

# Implementation order:
1. Types & interfaces (1 day)
2. EthnicityDetector (2 days)
3. UniversalBMIClassifier (2 days)
4. UniversalBMRCalculator (3 days)
5. Tests (2 days)
```

### Week 3-4: Climate & Macros
```bash
# Add climate adaptations
src/utils/healthCalculations/
├── climate/
│   ├── ClimateAdaptiveCalculations.ts # TDEE + Water
│   ├── ClimateDetector.ts             # Auto-detect
│   └── RegionalAdjustments.ts         # India-specific
├── macros/
│   └── DietTypeAdaptiveMacros.ts      # Protein scaling
└── validation/
    └── FlexibleFatLossValidator.ts    # Tiered warnings
```

### Week 5-6: Advanced Features
```bash
# Heart rate & muscle gain
src/utils/healthCalculations/
├── heartRate/
│   └── HeartRateZoneCalculator.ts     # 3 formulas
└── muscleGain/
    └── MuscleGainLimits.ts            # Experience-based
```

### Week 7: Integration
```bash
# Unified facade
src/utils/healthCalculations.ts        # Main export

# Database updates
supabase/migrations/
└── 20250131000000_universal_health_system.sql
```

### Week 8-10: UI & Testing
```bash
# Update onboarding
src/screens/onboarding/tabs/
├── PersonalInfoTab.tsx                # + Ethnicity detection
└── AdvancedReviewTab.tsx              # + Formula transparency

# Testing
src/__tests__/healthCalculations/
├── bmr.test.ts
├── bmi.test.ts
├── climate.test.ts
├── populations.test.ts
└── validation.test.ts
```

---

## DATABASE CHANGES

### Required New Fields

```sql
-- Minimal required fields (P0)
ALTER TABLE profiles ADD COLUMN ethnicity TEXT;
ALTER TABLE profiles ADD COLUMN climate_zone TEXT;

ALTER TABLE body_analysis ADD COLUMN body_fat_source TEXT CHECK (
  body_fat_source IN ('dexa', 'calipers', 'manual', 'ai_photo', 'bmi_estimate')
);

ALTER TABLE advanced_review ADD COLUMN bmr_formula_used TEXT;
ALTER TABLE advanced_review ADD COLUMN calculations_version TEXT DEFAULT '2.0.0';
```

### Optional Fields (P1-P2)
```sql
ALTER TABLE profiles ADD COLUMN ethnicity_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN climate_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN resting_heart_rate INTEGER;

-- Audit logging (P2)
CREATE TABLE calculation_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  calculation_type TEXT,
  formula_used TEXT,
  inputs JSONB,
  outputs JSONB,
  context JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## CODE EXAMPLES

### Using the New System

```typescript
import { HealthCalculationEngine } from '@/utils/healthCalculations';

// Old way (current)
const bmr = MetabolicCalculations.calculateBMR(weight, height, age, gender);
const tdee = MetabolicCalculations.calculateTDEE(bmr, activityLevel);
// ❌ Single formula, no context awareness

// New way (universal)
const metrics = HealthCalculationEngine.calculateAllMetrics(userProfile);

console.log(metrics);
// {
//   context: {
//     ethnicity: 'asian',
//     climate: 'tropical',
//     confidence: 90
//   },
//   bmr: {
//     bmr: 1650,
//     formula: 'katch_mcardle',
//     accuracy: '±5%',
//     reasoning: 'Using accurate body fat % from DEXA'
//   },
//   bmi: {
//     category: 'Overweight',
//     healthRisk: 'moderate',
//     ethnicity: 'asian',
//     message: 'BMI 23.5 - Overweight (Asian classification)'
//   },
//   tdee: {
//     tdee: 2310,
//     breakdown: {
//       bmr: 1650,
//       baseTDEE: 2100,
//       climateModifier: 1.10,
//       finalTDEE: 2310
//     },
//     reasoning: 'Tropical climate (+10% for thermoregulation)'
//   },
//   water: {
//     daily_ml: 3675,
//     reasoning: 'Tropical climate (+75% for sweat loss)'
//   },
//   macros: {
//     protein_g: 175,
//     reasoning: 'Vegan diet requires +25% protein (2.5g/kg)'
//   }
// }
```

### Migration Script for Existing Users

```typescript
// Auto-update all users with new calculations
async function migrateToUniversalSystem() {
  const users = await supabase.from('profiles').select('*');

  for (const user of users) {
    // Detect context
    const context = EthnicityDetector.detect(user.country, user.state);

    // Update profile
    await supabase.from('profiles').update({
      ethnicity: context.detected,
      ethnicity_confirmed: context.confidence > 70,
      climate_zone: ClimateDetector.detect(user.country, user.state).zone
    }).eq('id', user.id);

    // Recalculate metrics
    const newMetrics = HealthCalculationEngine.calculateAllMetrics(user);

    // Update advanced_review
    await supabase.from('advanced_review').update({
      ...newMetrics,
      bmr_formula_used: newMetrics.bmr.formula,
      calculations_version: '2.0.0'
    }).eq('user_id', user.id);

    console.log(`✅ Migrated user ${user.id}`);
  }
}
```

---

## TESTING CHECKLIST

### P0 Tests (Must Pass)
- [ ] Asian BMI 23.0 = "Normal"
- [ ] Asian BMI 23.5 = "Overweight"
- [ ] General BMI 23.5 = "Normal"
- [ ] Vegan protein = base × 1.25
- [ ] Vegetarian protein = base × 1.15
- [ ] India country → 'asian' ethnicity (90% confidence)
- [ ] USA country → 'mixed' ethnicity + ask user
- [ ] Katch-McArdle selected when body_fat_source = 'dexa'
- [ ] All 4 BMR formulas match published values (±5 cal)

### P1 Tests (Should Pass)
- [ ] Tropical climate → +5% TDEE
- [ ] Tropical climate → +50% water
- [ ] Beginner muscle gain = 0.75-1.25 kg/month (male)
- [ ] Elite muscle gain = 0.05-0.10 kg/month (male)
- [ ] Fat loss 0.7kg/week = no warnings
- [ ] Fat loss 1.3kg/week = caution warning
- [ ] Fat loss 2.5kg/week (BMI 36) = severe warning (allowed)

### Edge Cases
- [ ] Age 13 → BMR +15%, conservative deficit
- [ ] Age 75 → BMR -15%, protein +30%
- [ ] Body fat 8% (athlete) → Cunningham formula
- [ ] Mixed ethnicity → general BMI (no error)

---

## SUCCESS METRICS

### Accuracy Improvements
- **BMR Accuracy:** ±10% → ±5% (when body fat known)
- **BMI Classification:** One-size-fits-all → Population-specific
- **Water Recommendations:** Fixed 35ml/kg → Climate-adjusted (±40-70%)

### User Experience
- **Auto-detection Rate:** Target 85%+ (users don't need to select)
- **Validation Blocks:** 100% → 0% (warnings only)
- **Global Coverage:** Western-biased → Universal (7+ populations)

### Scientific Validation
- **Formula Sources:** All peer-reviewed research
- **Population Coverage:** 8 billion+ humans
- **Climate Zones:** 4 major zones + regional fine-tuning

---

## GETTING HELP

**Read Full Blueprint:**
→ `UNIVERSAL_HEALTH_SYSTEM_BLUEPRINT.md` (50+ pages, complete technical spec)

**Key Sections:**
1. Auto-Detection Framework (how to detect ethnicity/climate)
2. Universal Formula System (4 BMR formulas, 7 BMI classifications)
3. Population-Specific Adaptations (age, experience, climate)
4. Implementation Architecture (code structure)
5. Testing Matrix (200+ test cases)

**Questions?**
- Formula accuracy → See "Scientific References" section
- Implementation details → See "Implementation Architecture"
- Test cases → See "Testing Matrix"

---

**Status:** Blueprint complete, ready for implementation
**Estimated Effort:** 8-10 weeks (phased rollout)
**Impact:** Transforms FitAI into world-class universal health system
