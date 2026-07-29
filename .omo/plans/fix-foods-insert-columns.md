# Fix `foods` Table Insert Column Mismatch

## TL;DR

> **Quick Summary**: `createFoodFromRecognized()` in `recognizedFoodLogger.ts` inserts with wrong column names (`calories`, `protein`, etc.) but the live DB uses `_per_100g` suffixed columns (`calories_per_100g`, `protein_per_100g`, etc.). Single-file fix.
> 
> **Deliverables**: Fixed insert in `src/services/recognizedFoodLogger.ts`
> **Estimated Effort**: Quick (< 5 minutes)
> **Parallel Execution**: NO — single task

---

## Context

### Original Error
```
ERROR  Error creating food: {"code": "PGRST204", "details": null, "hint": null, "message": "Could not find the 'calories' column of 'foods' in the schema cache"}
```

### Root Cause
The live `foods` table schema (verified via `information_schema.columns`) uses `_per_100g` suffixed nutrition columns, but the insert in `createFoodFromRecognized()` uses unsuffixed names. The local migration file (`20260124000001`) has a **stale/divergent** schema — the live DB was apparently altered or recreated with different column names.

### Live DB Schema (verified)
```
id              uuid
name            text
brand           text
barcode         text
calories_per_100g  numeric
protein_per_100g   numeric
carbs_per_100g     numeric
fat_per_100g       numeric
fiber_per_100g     numeric
sugar_per_100g     numeric
sodium_per_100g    numeric
category           text
verified           boolean
created_at         timestamp with time zone
```

### Column Mapping (code → DB)
| Code sends (WRONG) | DB column (CORRECT) |
|---|---|
| `calories` | `calories_per_100g` |
| `protein` | `protein_per_100g` |
| `carbohydrates` | `carbs_per_100g` |
| `fat` | `fat_per_100g` |
| `fiber` | `fiber_per_100g` |
| `sugar` | `sugar_per_100g` |
| `sodium` | `sodium_per_100g` |
| `food_category` | `category` |
| `serving_size` | _(does not exist — remove)_ |
| `serving_unit` | _(does not exist — remove)_ |
| `source` | _(does not exist — remove)_ |

---

## Work Objectives

### Core Objective
Fix the `foodData` object in `createFoodFromRecognized()` to match the live DB schema.

### Must Have
- All column names match the live `foods` table
- No references to non-existent columns (`serving_size`, `serving_unit`, `source`)

### Must NOT Have
- No migration changes (the live DB is correct; the code is wrong)
- No changes to `food-service.ts` (it already uses correct `_per_100g` columns)
- No changes to any other file

---

## TODOs

- [x] 1. Fix `foodData` column names in `createFoodFromRecognized()`

  **What to do**:
  In `src/services/recognizedFoodLogger.ts`, lines 258-273, replace the `foodData` object:

  **FROM** (current — broken):
  ```typescript
  const foodData = {
    name: recognizedFood.name,
    food_category: recognizedFood.category,
    serving_size: 100,
    serving_unit: "g",
    calories: per100g.calories,
    protein: per100g.protein,
    carbohydrates: per100g.carbs,
    fat: per100g.fat,
    fiber: per100g.fiber || null,
    sugar: recognizedFood.nutritionPer100g?.sugar ?? null,
    sodium: recognizedFood.nutritionPer100g?.sodium ?? null,
    barcode: (recognizedFood as any).barcode ?? null,
    source: "ai_recognized",
    created_at: new Date().toISOString(),
  };
  ```

  **TO** (fixed — matches live DB):
  ```typescript
  const foodData = {
    name: recognizedFood.name,
    category: recognizedFood.category,
    calories_per_100g: per100g.calories,
    protein_per_100g: per100g.protein,
    carbs_per_100g: per100g.carbs,
    fat_per_100g: per100g.fat,
    fiber_per_100g: per100g.fiber || null,
    sugar_per_100g: recognizedFood.nutritionPer100g?.sugar ?? null,
    sodium_per_100g: recognizedFood.nutritionPer100g?.sodium ?? null,
    barcode: (recognizedFood as any).barcode ?? null,
    verified: false,
    created_at: new Date().toISOString(),
  };
  ```

  **Must NOT do**:
  - Do NOT change `findExistingFood()` — it uses `select("*")` which is fine
  - Do NOT touch `food-service.ts` — it already uses correct column names
  - Do NOT create a migration — the live DB schema is correct

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **References**:
  - `src/services/recognizedFoodLogger.ts:258-273` — The broken insert (lines to change)
  - `src/services/nutrition-data/food-service.ts:69` — Proof that `_per_100g` columns are correct (already used here successfully)
  - Live DB schema verified via `SELECT column_name FROM information_schema.columns WHERE table_name = 'foods'`

  **Acceptance Criteria**:
  - [ ] `foodData` object uses `calories_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `fiber_per_100g`, `sugar_per_100g`, `sodium_per_100g`
  - [ ] `food_category` renamed to `category`
  - [ ] `serving_size`, `serving_unit`, `source` fields removed
  - [ ] `verified: false` added (replaces old `is_verified` concept)
  - [ ] No TypeScript errors: `npx tsc --noEmit` passes for this file

  **QA Scenarios**:
  ```
  Scenario: Food recognition insert succeeds
    Tool: Bash (grep)
    Steps:
      1. Read src/services/recognizedFoodLogger.ts and verify the foodData object
      2. Confirm NO references to: 'food_category', 'serving_size', 'serving_unit', 'source' as insert keys
      3. Confirm ALL of: 'calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g' present
    Expected Result: All _per_100g columns present, no non-existent columns referenced
    Evidence: .sisyphus/evidence/task-1-column-verification.txt
  ```

  **Commit**: YES
  - Message: `fix(nutrition): map food insert columns to live DB schema (_per_100g)`
  - Files: `src/services/recognizedFoodLogger.ts`

---

## Success Criteria

### Verification Commands
```bash
# Confirm no references to old column names in the insert
grep -n "food_category\|serving_size\|serving_unit\|source.*ai_recognized" src/services/recognizedFoodLogger.ts
# Expected: no matches (0 lines)

# Confirm new column names present
grep -n "calories_per_100g\|protein_per_100g\|carbs_per_100g" src/services/recognizedFoodLogger.ts
# Expected: matches in the foodData object
```

### Final Checklist
- [ ] PGRST204 error no longer occurs when creating food from recognition
- [ ] `food-service.ts` unchanged (already correct)
- [ ] No new migrations needed
