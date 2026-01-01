# 🎯 AI Generation Flow - Quick Reference

**TL;DR**: AI generates creativity, Database provides facts

---

## 📊 Current System

### What We Have
- ✅ **1,500 exercises** with 100% GIF coverage
- ⚠️ **28 foods** (too small, needs expansion to 200-500)
- ✅ **Universal Health System** (perfect calculations)
- ✅ **Portion adjustment** (±2% accuracy)

### What Works Well
1. ✅ **Workouts**: 1,500 verified exercises = excellent variety
2. ✅ **Metrics**: BMR, TDEE, macros = scientifically accurate
3. ✅ **Portion scaling**: Math-based = no hallucination

### What Needs Improvement
1. ⚠️ **Food database**: Only 28 foods = limited variety
2. ⏳ **Fallback templates**: Need backup if AI fails
3. ⏳ **User learning**: Don't track meal history yet

---

## 🔄 The 3-Layer Protection System

```
┌─────────────────────────────────────────────────┐
│ LAYER 1: DETERMINISTIC FILTERING                │
│ (Database - No AI)                              │
├─────────────────────────────────────────────────┤
│ • Load EXACT metrics from DB                    │
│ • Filter foods by allergies/diet                │
│ • Filter exercises by equipment/limitations     │
│ Result: 100% accurate constraints ✅             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ LAYER 2: CONSTRAINED AI GENERATION              │
│ (AI Creativity - But Locked Down)              │
├─────────────────────────────────────────────────┤
│ • AI chooses from allowed items ONLY            │
│ • AI creates structure & combinations           │
│ • AI provides names & descriptions              │
│ Result: Creative but safe ✅                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ LAYER 3: DETERMINISTIC ENRICHMENT               │
│ (Database - No AI)                              │
├─────────────────────────────────────────────────┤
│ • Look up EXACT nutrition/details from DB       │
│ • Calculate portions mathematically             │
│ • Adjust portions to hit targets                │
│ Result: Guaranteed accuracy ✅                   │
└─────────────────────────────────────────────────┘
```

---

## 🍽️ Diet Generation Flow (5 Steps)

### Step 1: Load Metrics (Database)
```typescript
const metrics = await loadUserMetrics(userId);
// Result: 2,200 cal, 165g protein, 220g carbs, 73g fat
```

### Step 2: Filter Foods (Database)
```typescript
const allowed = FOODS.filter(f => !f.allergens.includes('peanuts'));
// Result: 22 safe foods (from 28 total)
```

### Step 3: AI Generates Structure (AI - Constrained)
```typescript
const prompt = `Use these foods ONLY: [22 food IDs]
Target: 2,200 calories
Create 3 meals + 2 snacks`;

const aiResponse = await generateObject({...});
// Result: Meal plan with food IDs (no nutrition from AI)
```

### Step 4: Look Up Nutrition (Database)
```typescript
const enriched = meals.map(meal => {
  return meal.foods.map(foodId => {
    const food = FOODS.find(f => f.id === foodId);
    return {
      name: food.name,
      calories: food.nutrition.calories,  // ← From DB, not AI
      protein: food.nutrition.macros.protein,  // ← From DB
      ...
    };
  });
});
```

### Step 5: Adjust Portions (Math)
```typescript
const scaleFactor = 2200 / currentTotal;  // e.g., 2200 / 2150 = 1.023
const adjusted = adjustPortionsToTarget(enriched, 2200);
// Result: Exactly 2,200 calories ±2%
```

---

## 💪 Workout Generation Flow (4 Steps)

### Step 1: Load Metrics (Database)
```typescript
const metrics = await loadUserMetrics(userId);
// Result: Intermediate level, dumbbells only, lower back pain
```

### Step 2: Filter Exercises (Database)
```typescript
const filtered = EXERCISES
  .filter(e => e.equipments.includes('dumbbell'))  // Has dumbbells
  .filter(e => e.difficulty === 'intermediate')     // Right level
  .filter(e => !e.targetMuscles.includes('lower back'));  // Safe
// Result: 65 safe exercises (from 1,500 total)
```

### Step 3: AI Generates Structure (AI - Constrained)
```typescript
const prompt = `Choose from these 65 exercises ONLY:
[65 exercise IDs]
Create 45-min chest workout`;

const aiResponse = await generateObject({...});
// Result: Workout with exercise IDs (no GIFs from AI)
```

### Step 4: Enrich with Details (Database)
```typescript
const enriched = workout.exercises.map(exerciseId => {
  const exercise = EXERCISES.find(e => e.exerciseId === exerciseId);
  return {
    name: exercise.name,
    gifUrl: exercise.gifUrl,  // ← Guaranteed to exist
    instructions: exercise.instructions,  // ← From DB
    ...
  };
});
```

---

## ❌ What AI Can Hallucinate

### Diet Generation
- ❌ Calorie counts (AI might say 200 cal instead of 165)
- ❌ Macro ratios (AI might forget protein target)
- ❌ Food names (AI might invent "Grilled Quinoa Burger")
- ❌ Portions (AI might suggest unrealistic amounts)

### Workout Generation
- ❌ Exercise names (AI might invent fake exercises)
- ❌ GIF URLs (AI might generate broken links)
- ❌ Equipment (AI might suggest equipment user doesn't have)
- ❌ Difficulty (AI might suggest advanced moves for beginners)

---

## ✅ How We Prevent Hallucination

### Diet Generation Protection
```typescript
// ✅ AI only sees allowed food IDs
const foodList = allowedFoods.map(f => `${f.id}: ${f.name}`);
prompt = `Use these foods ONLY:\n${foodList}`;

// ✅ Validate AI didn't invent foods
for (const foodId of aiResponse.foods) {
  if (!allowedFoodIds.includes(foodId)) {
    throw new Error(`AI hallucinated: ${foodId}`);
  }
}

// ✅ Look up EXACT nutrition from database
const nutrition = FOODS.find(f => f.id === foodId).nutrition;

// ✅ Calculate portions mathematically
const portion = (targetCal / nutrition.calories) * 100;

// ✅ Adjust to hit exact target
const adjusted = adjustPortionsToTarget(plan, targetCal);
```

### Workout Generation Protection
```typescript
// ✅ AI only sees filtered exercise IDs
const exerciseList = filtered.map(e => `${e.exerciseId}: ${e.name}`);
prompt = `Choose from these exercises ONLY:\n${exerciseList}`;

// ✅ Validate AI didn't invent exercises
for (const exerciseId of aiResponse.exercises) {
  if (!filteredIds.includes(exerciseId)) {
    throw new Error(`AI hallucinated: ${exerciseId}`);
  }
}

// ✅ Look up EXACT details from database
const exercise = EXERCISES.find(e => e.exerciseId === exerciseId);
const gifUrl = exercise.gifUrl;  // ← Guaranteed to exist (100% coverage)
```

---

## 📈 Performance: Token Usage

### ❌ Bad Approach (Send everything to AI)
```
Prompt: 10,000 tokens (entire food database + nutrition)
Response: 2,000 tokens
Total: 12,000 tokens = $0.08 per generation
```

### ✅ Good Approach (Send IDs only)
```
Prompt: 400 tokens (food IDs only)
Response: 800 tokens (IDs only, no nutrition)
Enrichment: Database lookup (free)
Total: 1,200 tokens = $0.008 per generation (90% savings!)
```

---

## 🎯 Priority Actions

### 🔴 CRITICAL: Expand Food Database
**Current**: 28 foods
**Target**: 200-500 foods
**Why**: More variety, less repetition
**How**:
1. Use USDA FoodData Central API
2. Add 50 common proteins
3. Add 50 common carbs
4. Add 50 common vegetables
5. Add 50 Indian foods
6. Verify all nutrition data

### 🟡 HIGH: Add Fallback Templates
**Why**: If AI fails, use pre-made plans
**How**:
```typescript
const templates = {
  vegetarian_2200cal: { breakfast: [...], lunch: [...], dinner: [...] },
  vegan_1800cal: { ... },
  // 20-30 templates
};

if (aiGenerationFails) {
  return findClosestTemplate(metrics, prefs);
}
```

### 🟢 MEDIUM: Track User Preferences
**Why**: Learn what users like
**How**:
```typescript
// Log what users actually eat
await supabase.from('meal_log').insert({ meal_id, rating: 4.5 });

// Use in future generation
const likedFoods = await getUserFavorites(userId);
prompt += `User enjoys: ${likedFoods}`;
```

---

## 💡 Key Insights

1. **AI is good at**: Creativity, variety, personalization
2. **AI is bad at**: Exact numbers, consistency, facts
3. **Solution**: Let AI do creativity, Database provides facts
4. **Result**: Best of both worlds ✅

---

## 🚀 System Status

| Component | Status | Accuracy |
|-----------|--------|----------|
| User Metrics | ✅ Live | 100% |
| Exercise Database | ✅ Live | 100% (1,500 exercises) |
| Food Database | ⚠️ Small | 100% (only 28 foods) |
| Portion Adjustment | ✅ Live | ±2% |
| AI Integration | ✅ Live | Safe (constrained) |

**Overall**: 🟢 System is SAFE and ACCURATE, just needs more food variety

---

**See full details**: `AI_GENERATION_ARCHITECTURE.md`
