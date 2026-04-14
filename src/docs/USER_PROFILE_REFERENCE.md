# User Profile Reference — Harsh Sharma
> Source of truth for AI workout/diet generation and verification.
> All values pulled live from DB on 2026-04-13.

---

## 1. Personal Info

| Field | Value |
|---|---|
| Name | Harsh Sharma |
| Age | 26 |
| Gender | Male |
| Country | India |
| Wake / Sleep | 07:00 / 23:00 (16hr active window) |

---

## 2. Body Stats (from `body_analysis`)

| Field | Value |
|---|---|
| Height | 173 cm |
| Current Weight | 90 kg |
| Target Weight | 73 kg |
| Weight to Lose | 17 kg |
| Target Timeline | 16 weeks |
| BMI | 30.1 → **Obese** |
| BMR | 1,856 kcal/day |
| Medical Conditions | None |
| Physical Limitations | None |

---

## 3. Calculated Metrics (from `advanced_review`)

| Metric | Value |
|---|---|
| TDEE | 2,873 kcal/day |
| Target Daily Calories | **1,856 kcal** (= BMR floor — max safe diet-only loss) |
| Weekly Weight Loss Rate | **1.13 kg/week** |
| Rate Capped? | No (user-selected pace fit within safe limits) |
| Original Requested Rate | 1.06 kg/week |
| Boost (extra cardio) | +30 min/day |
| Total Calorie Deficit | 139,216 kcal over 16 weeks |
| Estimated Timeline | 16 weeks |

### Daily Macros
| Macro | Amount |
|---|---|
| Protein | 185 g |
| Carbs | 195 g |
| Fat | 37 g |
| Fiber | 26 g |
| Water | 4,350 ml |

### Health Scores
| Score | Value |
|---|---|
| Overall Health Score | 85 / 100 |
| Recommended Sleep | 7.5 hrs |

---

## 4. Workout Preferences (from `workout_preferences`)

| Field | Value |
|---|---|
| Goals | Weight Loss + Muscle Gain |
| Location | Gym |
| Intensity | Intermediate |
| Activity Level | Light |
| Workout Types | Strength, Cardio, HIIT, Functional |
| Frequency | 5 days/week |
| Experience | 2 years |
| Equipment | Bodyweight, Dumbbells, Barbell, Kettlebells, Pull-up bar, Treadmill, Stationary bike, Yoga mat |

### AI Generation Targets
| Field | Value |
|---|---|
| Recommended Workout Frequency | 4x/week |
| Recommended Cardio | 250 min/week |
| Recommended Strength Sessions | 4x/week |
| Boost Cardio (extra) | +30 min/day |

---

## 5. Diet Preferences (from `diet_preferences`)

| Field | Value |
|---|---|
| Diet Type | **Vegetarian** |
| Cooking Skill | Not Applicable (no cooking) |
| Budget | Medium |
| Max Prep Time | 30 min |
| Meals | Breakfast ✅ Lunch ✅ Dinner ✅ Snacks ✅ |
| Allergies | None |
| Restrictions | None |

---

## 6. Calorie Budget Breakdown

> How the 1,856 kcal deficit is achieved:

| Source | Contribution |
|---|---|
| Diet (eating at BMR) | ~1,017 kcal/day deficit from TDEE |
| Exercise (30 min workout × 5 days) | ~250–350 kcal/day burned extra |
| Steps (8,500 steps/day target) | ~200–250 kcal/day burned extra |
| **Total daily deficit** | **~1,400–1,600 kcal/day → ~1.0–1.15 kg/week** |

---

## 7. Verification Checklist for Generation

When verifying AI-generated workout or diet plans, check:

- [ ] Calories ≈ 1,856 kcal/day (not above TDEE 2,873)
- [ ] Protein ≥ 185 g/day (muscle preservation during deficit)
- [ ] Carbs ~195 g, Fat ~37 g
- [ ] Vegetarian meals only — no meat/fish
- [ ] No cooking required (ready-made / minimal prep ≤ 30 min)
- [ ] Workout: 4–5 days/week, gym, intermediate intensity
- [ ] Cardio: ~250 min/week total
- [ ] Workout types: Strength + Cardio + HIIT + Functional
- [ ] Equipment matches list above (no cable machine assumptions)
- [ ] Steps goal: 8,500/day
- [ ] Sleep target: 7.5 hrs
