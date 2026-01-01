# FitAI Data Flow Diagram

Visual representation of how data flows from Onboarding → Database → Display

---

## CORRECT DATA FLOW (Working Fields)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING (PersonalInfoTab)                     │
│                                                                     │
│  User enters:                                                       │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────┐                │
│  │ Country:    │   │ State:      │   │ Region:  │                │
│  │ "USA"       │   │ "CA"        │   │ "LA"     │                │
│  └─────────────┘   └─────────────┘   └──────────┘                │
│         ↓                   ↓                ↓                      │
│  formData.country   formData.state   formData.region               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    onboardingService.save()
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (profiles table)                      │
│                                                                     │
│  INSERT INTO profiles (country, state, region) VALUES (...)        │
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────┐                │
│  │ country:    │   │ state:      │   │ region:  │                │
│  │ "USA"       │   │ "CA"        │   │ "LA"     │                │
│  └─────────────┘   └─────────────┘   └──────────┘                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    onboardingService.load()
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   DISPLAY (ProfileScreen)                           │
│                                                                     │
│  PersonalInfo interface:                                            │
│  {                                                                  │
│    country?: string,  // ✅ Matches DB                            │
│    state?: string,    // ✅ Matches DB                            │
│    region?: string    // ✅ Matches DB                            │
│  }                                                                  │
│                                                                     │
│  Display: "USA, CA, LA"  ← ✅ WORKS!                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## BROKEN DATA FLOW #1 (Name Fields)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING (PersonalInfoTab)                     │
│                                                                     │
│  User enters:                                                       │
│  ┌─────────────┐   ┌─────────────┐                                │
│  │ First Name: │   │ Last Name:  │                                │
│  │ "John"      │   │ "Doe"       │                                │
│  └─────────────┘   └─────────────┘                                │
│         ↓                   ↓                                       │
│  formData.first_name   formData.last_name                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    onboardingService.save()
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (profiles table)                      │
│                                                                     │
│  INSERT INTO profiles (first_name, last_name, name) VALUES (...)   │
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐            │
│  │ first_name: │   │ last_name:  │   │ name:        │            │
│  │ "John"      │   │ "Doe"       │   │ "John Doe"   │ (computed) │
│  └─────────────┘   └─────────────┘   └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    onboardingService.load()
                              ↓
                       ❌ TYPE MISMATCH!
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   DISPLAY (ProfileScreen)                           │
│                                                                     │
│  PersonalInfo interface EXPECTS:                                    │
│  {                                                                  │
│    name: string  // ✅ Has this field                             │
│    // ❌ NO first_name or last_name!                              │
│  }                                                                  │
│                                                                     │
│  ProfileScreen reads: profile?.personalInfo?.name                   │
│  ✅ Gets "John Doe" from DB                                        │
│                                                                     │
│  BUT PersonalInfoEditModal tries to edit:                          │
│  ❌ personalInfo.first_name  ← DOESN'T EXIST IN TYPE!            │
│  ❌ personalInfo.last_name   ← DOESN'T EXIST IN TYPE!            │
│                                                                     │
│  Result: Can't edit individual name fields!                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Fix:** Add `first_name` and `last_name` to PersonalInfo interface

---

## BROKEN DATA FLOW #2 (Height & Weight)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING (BodyAnalysisTab)                     │
│                                                                     │
│  User enters:                                                       │
│  ┌─────────────┐   ┌─────────────┐                                │
│  │ Height:     │   │ Weight:     │                                │
│  │ 180 cm      │   │ 75 kg       │                                │
│  └─────────────┘   └─────────────┘                                │
│         ↓                   ↓                                       │
│  formData.height_cm   formData.current_weight_kg                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    BodyAnalysisService.save()
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   DATABASE (body_analysis table)                    │
│                  ❌ NOT profiles table!                            │
│                                                                     │
│  INSERT INTO body_analysis (height_cm, current_weight_kg) ...      │
│                                                                     │
│  ┌─────────────┐   ┌────────────────────┐                         │
│  │ height_cm:  │   │ current_weight_kg: │                         │
│  │ 180.00      │   │ 75.00              │                         │
│  └─────────────┘   └────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                  ❌ WRONG TABLE LOADED!
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│             DISPLAY (PersonalInfoEditModal)                         │
│                                                                     │
│  Tries to load from PersonalInfo:                                   │
│  {                                                                  │
│    height: string,  // ❌ Doesn't exist in profiles table!        │
│    weight: string   // ❌ Doesn't exist in profiles table!        │
│  }                                                                  │
│                                                                     │
│  Code: profile?.personalInfo?.height                                │
│  ❌ Returns undefined - data is in body_analysis table!           │
│                                                                     │
│  Result: Height/Weight fields are ALWAYS EMPTY!                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Fix:**
1. Remove `height` and `weight` from PersonalInfo
2. Add BodyMetrics interface that reads from `body_analysis` table
3. Move height/weight fields to BodyMeasurementsEditModal

---

## BROKEN DATA FLOW #3 (Age Type Mismatch)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING (PersonalInfoTab)                     │
│                                                                     │
│  User enters:                                                       │
│  ┌─────────────┐                                                   │
│  │ Age:        │                                                   │
│  │ 25          │  ← number type                                   │
│  └─────────────┘                                                   │
│         ↓                                                           │
│  formData.age: number = 25                                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    onboardingService.save()
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (profiles table)                      │
│                                                                     │
│  INSERT INTO profiles (age) VALUES (25)                             │
│                                                                     │
│  ┌─────────────┐                                                   │
│  │ age:        │                                                   │
│  │ 25          │  ← INTEGER type                                  │
│  └─────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    onboardingService.load()
                              ↓
                       ❌ TYPE COERCION!
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   DISPLAY (ProfileScreen)                           │
│                                                                     │
│  PersonalInfo interface EXPECTS:                                    │
│  {                                                                  │
│    age: string  // ❌ Wrong type! Should be number                │
│  }                                                                  │
│                                                                     │
│  TypeScript tries to assign:                                        │
│    const age: string = 25;  // ❌ Type error!                     │
│                                                                     │
│  JavaScript coerces:                                                │
│    age = "25"  // Works at runtime but breaks type safety          │
│                                                                     │
│  Validation breaks:                                                 │
│    if (age < 13)  // ❌ Comparing string to number!               │
│                                                                     │
│  Result: Type errors and validation bugs                           │
└─────────────────────────────────────────────────────────────────────┘
```

**Fix:** Change `age: string` to `age: number` in PersonalInfo interface

---

## CORRECT MULTI-TABLE FLOW (How It Should Work)

```
                     ONBOARDING
                         │
            ┌────────────┼────────────┐
            ↓            ↓            ↓
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │  Tab 1   │  │  Tab 3   │  │  Tab 4   │
     │ Personal │  │   Body   │  │ Workout  │
     │   Info   │  │ Analysis │  │  Prefs   │
     └──────────┘  └──────────┘  └──────────┘
            ↓            ↓            ↓
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ profiles │  │   body   │  │ workout  │
     │  table   │  │ analysis │  │   prefs  │
     │          │  │  table   │  │  table   │
     └──────────┘  └──────────┘  └──────────┘
            ↓            ↓            ↓
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │Personal  │  │  Body    │  │ Fitness  │
     │   Info   │  │ Metrics  │  │  Goals   │
     │interface │  │interface │  │interface │
     └──────────┘  └──────────┘  └──────────┘
            ↓            ↓            ↓
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ Profile  │  │   Body   │  │ Fitness  │
     │  Screen  │  │Measure   │  │  Screen  │
     │          │  │  Modal   │  │          │
     └──────────┘  └──────────┘  └──────────┘
```

**Key Principle:** Each interface should map to ONE database table

---

## FIELD NAME CASE CONVENTIONS

### Database (PostgreSQL)
```
snake_case
Examples:
- first_name
- current_weight_kg
- primary_goals
```

### TypeScript Types (Onboarding)
```
snake_case (matches database)
Examples:
- first_name: string
- current_weight_kg: number
- primary_goals: string[]
```

### TypeScript Types (User Profile) ❌ PROBLEM
```
camelCase (doesn't match database)
Examples:
- firstName: string  ← ❌ Should be first_name
- currentWeight: number  ← ❌ Should be current_weight_kg
- primaryGoals: string[]  ← ❌ Should be primary_goals
```

### React Components
```
camelCase for local variables
But use database field names for data objects
Examples:
const [formData, setFormData] = useState({
  first_name: '',  // ✅ Matches database
  last_name: ''    // ✅ Matches database
});
```

---

## DATA TRANSFORMATION LAYERS

### Currently Missing (Causes Issues)
```
Onboarding Data (snake_case)
         ↓
    ❌ NO TRANSFORMATION
         ↓
User Profile Data (camelCase) ← Expects different field names!
```

### Should Have (Future Implementation)
```
Onboarding Data (snake_case)
         ↓
   Transformation Layer
   - Maps snake_case → camelCase
   - Combines tables (profiles + body_analysis)
   - Computes derived fields (name from first_name + last_name)
         ↓
User Profile Data (consistent naming)
```

---

## VERIFICATION MATRIX

| Field | Onboarding Type | DB Type | Display Type | Match? |
|-------|----------------|---------|--------------|--------|
| first_name | string | TEXT | ❌ missing | ❌ NO |
| last_name | string | TEXT | ❌ missing | ❌ NO |
| age | number | INTEGER | string | ❌ NO |
| gender | string | TEXT | string | ✅ YES |
| country | string | TEXT | string | ✅ YES |
| state | string | TEXT | string | ✅ YES |
| height_cm | number | DECIMAL | ❌ wrong table | ❌ NO |
| current_weight_kg | number | DECIMAL | ❌ wrong table | ❌ NO |

**Success Rate:** 3/8 critical fields working (37.5%)

---

## PRIORITY FIX ORDER

### Priority 1: Fix Types (No code changes, just type definitions)
1. ✏️ Update PersonalInfo in `src/types/user.ts`
   - Add first_name, last_name
   - Change age to number
   - Remove height, weight

### Priority 2: Add Missing Types
2. ✏️ Create BodyMetrics in `src/types/user.ts`
3. ✏️ Add bodyMetrics to UserProfile

### Priority 3: Update Display Components
4. ✏️ ProfileScreen - handle first_name/last_name
5. ✏️ PersonalInfoEditModal - remove height/weight
6. ✏️ BodyMeasurementsEditModal - read from bodyMetrics

### Priority 4: Test Everything
7. 🧪 E2E test: Onboarding → DB → Display → Edit → Persist

---

## SUCCESS CRITERIA

After fixes, this flow should work:

```
1. User completes onboarding
   ↓
2. Data saves to correct tables
   ✅ profiles: first_name, last_name, age
   ✅ body_analysis: height_cm, current_weight_kg
   ↓
3. Data loads with correct types
   ✅ PersonalInfo: { first_name: string, age: number }
   ✅ BodyMetrics: { height_cm: number, current_weight_kg: number }
   ↓
4. Display shows correct values
   ✅ ProfileScreen: "John Doe"
   ✅ PersonalInfoEditModal: age=25 (number input)
   ✅ BodyMeasurementsEditModal: height=180cm, weight=75kg
   ↓
5. Edits persist correctly
   ✅ Change first_name → ProfileScreen updates
   ✅ Change height_cm → BodyMeasurementsEditModal updates
```

**All 8 critical fields flowing correctly = 100% success rate**
