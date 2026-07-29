# FitAI Onboarding Redesign — Flow & Concept Blueprint

> **Phase 1 deliverable.** This document is the contract Phase 2 (per-screen build
> agents) follow verbatim. Every field name, token name, motion timing, and
> component name below is concrete and authoritative. Phase 2 agents change
> **presentation/layout/animation only** — props, hooks, validation, and data
> wiring stay identical except where this doc explicitly adds default values or
> collapsed-state UI.

**North-star UX principle:** The user should feel like they are **confirming**
their profile, not filling out a form. Reduce *perceived* effort, not just step
count.

**Grounding note:** Web search for July-2026 mobile-onboarding trend articles
returned no usable results in this environment. The trend synthesis below is
built from established interaction-design knowledge (progressive disclosure,
spatial-depth layering, fluid shared-element transitions, haptic-driven input,
generative motion, animated gradients) and then **pushed past** current
convention into an original concept. No existing app (Apple Health, Notion,
Cult.fit, Whoop) is cloned.

---

## 1. Creative Concept

### The "Aurora Calibrate" metaphor

The onboarding is one continuous act of **calibrating an instrument** — the
user's body — against the Aurora sky. Each screen is not a form page; it is a
focal plane the user dials into focus. The visual throughline is a single
**Aurora field** (the `gradientNorthernLights` palette: deep purple → teal →
deep blue) that lives behind the entire flow and **never fully resets** between
screens. Instead of cutting to a new background per tab, the gradient's color
stops **drift** as the user advances, so the sky slowly shifts hue from cool
calm (purple, Screen 1) toward energetic warmth (orange/cyan, Screen 4) and
finally to a bright payoff reveal (full chart.1–6 spectrum, Screen 5).

This is the "ONE continuous journey" device: the background is a shared
spatial layer, not a per-screen decoration.

### Motion language — "Dial, Drift, Bloom"

Three motion verbs govern everything:

- **Dial** — input interactions. Every selection is a tactile dial-in: the
  chosen element scales to 1.04 with a spring (damping 14, stiffness 140),
  unselected siblings fade to 0.5 opacity, and a `Haptics.selectionAsync()`
  fires. Drags (sliders) emit a light `impactAsync(Medium)` every 8% of track
  travel so the user *feels* value ticks. No typing where a dial/drag works.
- **Drift** — screen-to-screen transitions. The Aurora gradient is a shared
  element: it does not remount, it cross-fades its color stops over 600 ms
  (`easing.bezier(0.4, 0, 0.2, 1)`). The screen *content* exits with
  `FadeOutDown` 200 ms + the next content enters with `FadeInDown` 300 ms
  staggered 60 ms per section. Because the background persists, the user
  perceives one continuous pan through a single space, not five page loads.
- **Bloom** — payoff moments. When a screen's primary decision is locked
  (user taps Next on a completed screen), a brief Skia particle burst (12
  particles, chart color of that screen, 400 ms) emits from the CTA and is
  absorbed into the drifting gradient. The final review screen ends with a
  full **tier-gradient reveal** + larger particle bloom that bridges directly
  into the main app's Home hero.

### Shared progress indicator behavior

The progress indicator is a **single horizontal aurora beam** pinned
top-center under the safe area — not five dots, not a bar with labels. It is a
thin (2 dp) rule of `border.subtle` with a filled segment that grows left→right
colored by the *current screen's chart color*. As the user advances, the filled
segment extends with a 500 ms spring and the segment color cross-fades to the
next screen's chart color (chart.1 → chart.2 → chart.4 → chart.6 → chart.1
full-spectrum). Tapping a completed segment navigates back; the current
segment is not tappable (it's where you are). The beam never shows numbers or
step labels — it reads as a continuous fill, reinforcing "one journey."

### Emotional arc (calm → personal → energetic → payoff)

| Screen | Chart color | Aurora hue | Emotional beat |
|--------|------------|-----------|----------------|
| 1 — You | chart.3 (purple) | Deep purple calm | "Settle in, this is easy." |
| 2 — Body | chart.2 (cyan) | Purple→teal drift | "This is *my* body, shown clearly." |
| 3 — Fuel | chart.5 (amber) | Teal→warm shift | "My taste, my rhythm." |
| 4 — Move | chart.1 (orange) | Warm energetic | "I'm ready to move." |
| 5 — Plan | chart.1–6 spectrum | Full reveal | "This is *my* plan. Let's go." |

---

## 2. Screen Chunking

### Decision: Re-chunk from 5 tabs → **5 screens**, but with redistribution

The current 5 tabs map to a real cognitive cost problem: Tab 1 (PersonalInfo)
is light, Tab 3 (BodyAnalysis) is *very* heavy (measurements + composition +
photos + medical), and Tab 4 (WorkoutPreferences) is heavy (goals + fitness
level + 4 preference clusters). The current chunking overloads Body and
under-loads Personal.

The fix is **not** fewer screens — 5 is the right number for a fitness app
where each domain (identity, body, fuel, motion, plan) carries real
consequence. The fix is **redistribution by perceived effort**: move the
cognitive weight so each screen asks exactly ONE primary question and clusters
its supporting inputs tightly around it.

### New chunking — explicit map from current 5 tabs

| New Screen | Single decision | Current tab(s) it absorbs | Why this chunk |
|-----------|----------------|--------------------------|----------------|
| **S1 — "You"** | "Who are you?" | PersonalInfoTab (all) + the `activity_level` field currently in WorkoutPreferencesTab | Personal identity is the lowest-friction opener. Pulling `activity_level` here is safe — it's a daily-life fact (sedentary/light/moderate/active/extreme), not a workout fact. It also seeds S2's BMR/TDEE defaults. The deprecated `occupation_type` stays dropped (SSOT is activity_level per arch doc). |
| **S2 — "Body"** | "What's your starting point?" | BodyAnalysisTab (measurements + composition + goal) | BodyAnalysis medical/photo sections are **progressive-disclosed** behind "Add details" (see §5). Default view = 3 measurement sliders + goal. Photos + medical collapse. |
| **S3 — "Fuel"** | "How do you eat?" | DietPreferencesTab (all) | Diet is one coherent domain. Health-habits (14 booleans) collapse behind a single "Lifestyle habits" expandable. |
| **S4 — "Move"** | "How do you want to train?" | WorkoutPreferencesTab minus `activity_level` (moved to S1) | Goals + fitness level + style remain, minus the relocated activity field. |
| **S5 — "Plan"** | "Confirm your plan." | AdvancedReviewTab (all) | Payoff dashboard, unchanged data, redesigned as scannable summary with inline-edit. |

**Justification by perceived effort (not arbitrary count):**
- S1 stays light: 4 identity chips + 2 time dials + 1 activity dial = 7 tap
  inputs, zero typing for personal values (name is the only typed field, and it
  is the one place typing is genuinely lower-effort than a picker).
- S2's heavy reputation is fixed by **progressive disclosure**, not by
  splitting the screen. Medical, photos, and precise body-fat % are exactly the
  fields most users skip — collapsing them keeps S2's default view to ~5
  inputs.
- S5 is read-mostly: the user already answered everything; they scan, tap any
  tile to inline-edit, and confirm. Perceived effort approaches zero.

---

## 3. Per-Screen "Single Decision"

Each screen asks ONE question. Everything else supports it.

### S1 — "You"
- **The one question:** "Who are you?"
- **Supporting inputs:** `first_name`, `last_name` (typed, pre-focused),
  `age` (stepper dial), `gender` (4 chips), `country`/`state`/`region`
  (locale-prefilled, §4), `wake_time`/`sleep_time` (two radial time dials),
  `activity_level` (5-step dial — relocated from S4), `units` (auto from
  locale, hidden unless user taps a small toggle).
- **Emotional beat:** Calm entry. Large Manrope display title, soft-tint fill
  behind the name field, haptic-stepped pickers everywhere a text box would
  otherwise be. The avatar circle from the current PersonalInfoTab stays but
  becomes a live preview that fills with the user's initials as they type.

### S2 — "Body" (most visual)
- **The one question:** "What's your starting point?"
- **Supporting inputs:** `height_cm`, `current_weight_kg`, `target_weight_kg`
  (three linked sliders whose ranges are sensible per §4), `target_timeline_weeks`
  (radial week dial), live BMI ring (Skia), goal visualization (current→target,
  SHOWN not just stated — interactive silhouette/gauge). Collapsed behind
  "Add details": `body_fat_percentage`, `waist_cm`/`hip_cm`/`chest_cm`,
  photos (front/side/back), medical (`medical_conditions`, `medications`,
  `physical_limitations`, `pregnancy_status`+`pregnancy_trimester`,
  `breastfeeding_status`, `stress_level`).
- **Emotional beat:** "This is *my* body, shown clearly." The goal is SHOWN:
  an interactive radial/gauge (Skia) renders current vs target weight as a fill
  arc that the user can drag to set target — dragging the arc moves
  `target_weight_kg` and the timeline recomputes. Body Analysis is the screen
  where the "confirm not fill" principle pays off hardest: sliders start at
  smart defaults, so most users nudge rather than type.

### S3 — "Fuel"
- **The one question:** "How do you eat?"
- **Supporting inputs:** `diet_type` (5 visual chips), meal-enable toggles
  (`breakfast_enabled`/`lunch_enabled`/`dinner_enabled`/`snacks_enabled` — 4
  toggle pills), cooking (`cooking_skill_level`, `max_prep_time_minutes`,
  `budget_level`, `cooking_methods`), diet-readiness (6 ready-flags as a
  single multi-chip row), allergies/restrictions (chip-search, collapsed).
  Collapsed behind "Lifestyle habits": all 14 health-habit booleans as a calm
  toggle grid.
- **Emotional beat:** "My taste, my rhythm." Warm amber accent. Cooking
  preferences feel like choosing a cooking show, not a form.

### S4 — "Move"
- **The one question:** "How do you want to train?"
- **Supporting inputs:** `primary_goals` (multi-chip, body-type aware — if S2
  `ai_body_type` exists, suggested goals bubble up), `location`
  (home/gym/both — 3 chips), `intensity` (3-tier dial with
  `intensityRecommendation` surfaced as a soft suggestion), `time_preference`
  (duration slider), `workout_frequency_per_week` (stepper), fitness
  assessment (`workout_experience_years`, `can_do_pushups`, `can_run_minutes`,
  `flexibility_level` — progressive-disclosed behind "Assess me"),
  `preferred_workout_times` (morning/afternoon/evening chips), enjoyment
  booleans (`enjoys_cardio`/`enjoys_strength_training`/`enjoys_group_classes`/
  `prefers_outdoor_activities`/`needs_motivation`/`prefers_variety`),
  `equipment`/`workout_types`.
- **Emotional beat:** "I'm ready to move." Energetic orange. The
  body-type-aware goal suggestions make this feel like the plan is already
  forming.

### S5 — "Plan" (payoff)
- **The one question:** "Confirm your plan."
- **Supporting inputs:** None new — this is a scannable summary dashboard of
  everything S1–S4 produced, plus all calculated `AdvancedReviewData` metrics.
  Every tile is inline-editable (tap → navigates to source screen via
  `onNavigateToTab`, or opens an inline stepper for the single field).
  Metabolic profile (`calculated_bmr`, `calculated_tdee`, `metabolic_age`,
  `bmi_category`) rendered as chart.1–6 visuals. Nutritional needs
  (`daily_calories`, `daily_protein_g`, `daily_carbs_g`, `daily_fat_g`,
  `daily_water_ml`) as a macro ring set. Weight management
  (`healthy_weight_min`/`max`, `weekly_weight_loss_rate`,
  `estimated_timeline_weeks`) as the goal arc from S2, now locked.
- **Emotional beat:** "This is *my* plan." Full chart.1–6 spectrum reveal +
  Skia particle burst + tier-gradient reveal that bridges into Home.

---

## 4. Smart-Default Strategy (MODERATE)

Defaults make the starting point ~80% right; the user still actively sets
personal values by nudging. Every default below is tied to a **real field**
found in `src/types/onboarding/*` and the hook initial-state already in code.
"MODERATE" = pre-fill safe/obvious + locale/derived values; never pre-fill
deeply personal medical or goal-specific numbers as if the user already chose
them (those start at the hook's existing neutral default and the user dials).

### Pre-fill from locale / device

| Field (real) | Default source | Notes |
|-------------|----------------|-------|
| `PersonalInfoData.units` | Device locale: `"imperial"` if region is US/LR/MM, else `"metric"` | Hook currently hardcodes `"metric"`. Phase 2 reads `Platform`/`Localization`; the units toggle is surfaced only if detected ≠ metric. |
| `PersonalInfoData.country` | Device locale region code → country name | Hook currently `""`. Empty is the fallback if locale unavailable. |
| `PersonalInfoData.state` | If country ∈ `COUNTRIES_WITH_STATES`, pre-select the locale's sub-region if it matches a listed state; else `""` | Existing `COUNTRIES_WITH_STATES` list reused. |
| `wake_time` / `sleep_time` | Keep existing `"07:00"` / `"23:00"` | Already sensible; surfaced as dials, not text. |

### Slider/stepper starting positions (the "80% right" starting point)

| Field (real, type) | Default start | Rationale / source |
|--------------------|---------------|--------------------|
| `BodyAnalysisData.height_cm` | Gender-aware population median: male 175, female 162, other 168 | User dials from a realistic midpoint, not 0. Hook currently starts at `0` (terrible UX). |
| `BodyAnalysisData.current_weight_kg` | Gender-aware median: male 78, female 65, other 72 | Same rationale. |
| `BodyAnalysisData.target_weight_kg` | Derived: `current_weight_kg` ± 5 kg (sign from a provisional goal inferred later on S4, else −5 for default loss intent) | Shown live; user drags the arc. |
| `BodyAnalysisData.target_timeline_weeks` | `12` | Already the hook default; keep. |
| `WorkoutPreferencesData.time_preference` | `30` | Already hook default; keep. |
| `WorkoutPreferencesData.workout_frequency_per_week` | `3` | Hook currently `0`; a 3-session starting point feels achievable. |
| `WorkoutPreferencesData.workout_experience_years` | `0` | Keep — honest default. |
| `DietPreferencesData.max_prep_time_minutes` | `30` | Already hook default; keep. |
| `DietPreferencesData.snacks_count` | `1` | Hook currently undefined; `snacks_enabled` defaults true, so 1 snack is coherent. |

### Values derived from earlier answers (shown, not silently set)

| Derived value | Formula (from arch doc §C) | Where shown |
|---------------|----------------------------|------------|
| Suggested daily calorie target | `TDEE − (weeklyRate × 7700 / 7)`, floored at BMR | S2 live readout once height/weight/age/activity present; S5 dashboard. *Displayed as a suggestion the user confirms*, not auto-saved. |
| Suggested weekly rate | `0.5 kg/week` (safe default) unless `current→target` + timeline imply otherwise | S4 WeightGoalsSection + S5. User confirms. |
| Recommended intensity | Existing `intensityRecommendation` logic in `useWorkoutPreferences` | S4 surfaced as soft suggestion chip. |
| BMI / BMR live preview | `calculateBMI()`, Mifflin-St Jeor (arch §C.2) | S2 ring updates as sliders move. |
| Suggested water (ml) | `weight × 35 + activityBonus + climateAdjustment` (arch §C.6) | S5 dashboard tile. |

### Fields that do NOT get defaults (user must actively set)
- `first_name`, `last_name` (identity — must be typed, but pre-focused).
- `gender` (personal; keep `"prefer_not_to_say"` as the neutral start, user taps).
- `diet_type` (keep `"balanced"`; user confirms/taps — it's the central S3 decision).
- `primary_goals`, `workout_types`, `equipment`, `allergies`, `restrictions`,
  `cooking_methods`, `medical_conditions`, `medications`,
  `physical_limitations` (all arrays — must be actively chosen; empty start is correct).
- `pregnancy_status`, `breastfeeding_status` (safety — must be explicit; keep `false`).
- `stress_level` (optional; keep undefined until user opens the section).

---

## 5. Progressive-Disclosure Rules

Default view stays calm. Advanced/optional fields collapse behind "Add
details" / "Lifestyle habits" / "Assess me" expandables. Collapsed state is the
default on first visit; once expanded, state persists for the session.

### S2 — "Body"
**Default (visible):** `height_cm`, `current_weight_kg`, `target_weight_kg`,
`target_timeline_weeks`, live BMI ring, goal arc.
**Collapsed — "Body composition"** (Add details): `body_fat_percentage`,
`waist_cm`, `hip_cm`, `chest_cm`. (Shows `waist_hip_ratio` live when both
present.)
**Collapsed — "Progress photos"** (Optional): `front_photo_url`,
`side_photo_url`, `back_photo_url`, `ai_estimated_body_fat`, `ai_body_type`,
`ai_confidence_score` (AI results display only — capture flow unchanged).
**Collapsed — "Medical & safety"** (Add details): `medical_conditions`,
`medications`, `physical_limitations`, `pregnancy_status`,
`pregnancy_trimester` (only if pregnancy_status true), `breastfeeding_status`,
`stress_level`.

### S3 — "Fuel"
**Default (visible):** `diet_type`, meal-enable toggles (`breakfast_enabled`
… `snacks_enabled`), `cooking_skill_level`, `max_prep_time_minutes`,
`budget_level`.
**Collapsed — "Cooking methods"**: `cooking_methods` (multi-chip).
**Collapsed — "Diet readiness"**: `keto_ready`, `intermittent_fasting_ready`,
`paleo_ready`, `mediterranean_ready`, `low_carb_ready`, `high_protein_ready`.
**Collapsed — "Allergies & restrictions"**: `allergies`, `restrictions`,
`cuisine_preferences`.
**Collapsed — "Lifestyle habits"**: all 14 health-habit booleans
(`drinks_enough_water` … `takes_supplements`) as a 2-column toggle grid.

### S4 — "Move"
**Default (visible):** `primary_goals`, `location`, `intensity`,
`time_preference`, `preferred_workout_times`, `workout_frequency_per_week`.
**Collapsed — "Assess me"**: `workout_experience_years`, `can_do_pushups`,
`can_run_minutes`, `flexibility_level`.
**Collapsed — "Equipment & types"**: `equipment`, `workout_types`,
`available_equipment`.
**Collapsed — "What you enjoy"**: `enjoys_cardio`, `enjoys_strength_training`,
`enjoys_group_classes`, `prefers_outdoor_activities`, `needs_motivation`,
`prefers_variety`.

### S1 — "You" & S5 — "Plan"
No progressive disclosure. S1 is already minimal. S5 is a summary — collapsing
would hide the payoff. S5's inline-edit taps navigate to the source screen
rather than expand in place.

---

## 6. Input-Method Map

Lowest-effort control per field. **No typing where a tap/drag works.** All
selections fire `Haptics.selectionAsync()`; all drag-into-commit fire
`Haptics.impactAsync(Medium)` on value-tick.

| Field | Control | Haptic | Notes |
|-------|---------|--------|-------|
| `first_name` / `last_name` | TextInput (pre-focused, soft-tint fill) | `selectionAsync` on focus | Only typed fields in the whole flow. |
| `age` | Stepper dial (−/+, long-press to scrub) | `impactAsync(Medium)` per step | 13–120. |
| `gender` | 4 chip cards | `selectionAsync` | male/female/other/prefer_not_to_say. |
| `country` | Locale-prefilled chip + "Change" → scroll picker | `selectionAsync` | Reuse `COUNTRIES_WITH_STATES`. |
| `state` / `region` | Dependent scroll picker | `selectionAsync` | |
| `wake_time` / `sleep_time` | Radial time dial (drag arc) | `impactAsync(Medium)` per 15-min tick | |
| `activity_level` | 5-step horizontal dial | `selectionAsync` | Relocated from S4. |
| `units` | Hidden unless detected ≠ metric; small toggle | `selectionAsync` | |
| `height_cm` | Vertical slider (cm/lb by units) | `impactAsync(Medium)` per 1-unit tick | |
| `current_weight_kg` | Vertical slider | `impactAsync(Medium)` per 0.5-kg tick | |
| `target_weight_kg` | Drag the goal arc (Skia) | `selectionAsync` on commit | Drives timeline recompute. |
| `target_timeline_weeks` | Radial week dial (4–104) | `impactAsync(Medium)` per 4-week tick | |
| `body_fat_percentage` | Slider (3–50) | per 1% tick | Collapsed. |
| `waist/hip/chest_cm` | Sliders | per 1-cm tick | Collapsed. |
| `pregnancy_status` / `breastfeeding_status` | Toggle pills | `selectionAsync` | Safety. |
| `pregnancy_trimester` | 3 chips (only if pregnant) | `selectionAsync` | |
| `stress_level` | 3 chips | `selectionAsync` | Collapsed. |
| `medical_conditions` etc. | Chip-search multi-select | `selectionAsync` | Collapsed. |
| `diet_type` | 5 visual chips | `selectionAsync` | Central S3 decision. |
| meal enables (4) | Toggle pills | `selectionAsync` | |
| `cooking_skill_level` | 4 chips | `selectionAsync` | |
| `max_prep_time_minutes` | Slider (5–180) | per 5-min tick | |
| `budget_level` | 3 chips | `selectionAsync` | |
| `cooking_methods` | Multi-chip | `selectionAsync` | Collapsed. |
| 6 diet-readiness flags | Multi-chip row | `selectionAsync` | Collapsed. |
| `allergies` / `restrictions` | Chip-search | `selectionAsync` | Collapsed. |
| 14 health habits | 2-col toggle grid | `selectionAsync` | Collapsed. |
| `primary_goals` | Multi-chip (body-type suggestions bubble) | `selectionAsync` | |
| `location` | 3 chips | `selectionAsync` | |
| `intensity` | 3-tier dial + soft suggestion | `selectionAsync` | |
| `time_preference` | Duration slider | per 5-min tick | |
| `workout_frequency_per_week` | Stepper (0–7) | `impactAsync(Medium)` | |
| `workout_experience_years` | Stepper (0–50) | `impactAsync(Medium)` | Collapsed. |
| `can_do_pushups` / `can_run_minutes` | Steppers | `impactAsync(Medium)` | Collapsed. |
| `flexibility_level` | 4 chips | `selectionAsync` | Collapsed. |
| `preferred_workout_times` | 3 chips | `selectionAsync` | |
| 6 enjoyment booleans | Toggle pills | `selectionAsync` | Collapsed. |
| `equipment` / `workout_types` | Multi-chip | `selectionAsync` | Collapsed. |

---

## 7. Shared Component Spec (the Phase 2 contract)

These are the EXACT components ALL Phase 2 agents must reuse. Names are
fixed; props sketches are the minimum contract. Token references use the real
`aurora-tokens.ts` exports. Motion specs use the real
`animation.duration`/`spring`/`easing` values. Agents implement these once in
`src/components/onboarding/aurora/` and import across screens — do not
re-implement per screen.

> **Font rule (applies to every component):** `fontFamily` ONLY —
> `Manrope_400Regular` / `_500Medium` / `_600SemiBold` / `_700Bold` /
> `_800ExtraBold`. NEVER `fontWeight`. Match against
> `typography.variants.*`.

### 7.1 `<AuroraBeam>` — shared progress indicator
- **Path:** `src/components/onboarding/aurora/AuroraBeam.tsx`
- **Props:** `currentStep: number` (1–5), `stepColors: string[]` (the 5 chart
  colors), `onStepPress?: (step: number) => void` (only completed steps fire).
- **Tokens:** track `border.subtle` 2 dp tall; fill uses the current step's
  chart color; container background `surface.0`.
- **Motion:** fill width animates via `withSpring(width, { damping: 14,
  stiffness: 120 })` 500 ms; color cross-fades via `withTiming(color, {
  duration: 600, easing: Easing.bezier(0.4,0,0.2,1) })`.
- **Behavior:** pinned top under safe area, full width minus `spacing.lg` ×2
  inset. No labels, no dots. Tapping completed steps navigates.

### 7.2 `<AuroraField>` — the drifting background layer (shared element)
- **Path:** `src/components/onboarding/aurora/AuroraField.tsx`
- **Props:** `step: number` (drives color-stop drift).
- **Tokens:** uses `colors.aurora.purple/ocean/space` tiers + chart colors as
  drift endpoints; `LinearGradient` from `expo-linear-gradient`.
- **Motion:** color stops animate via `useAnimatedStyle` shared values; the
  component is mounted ONCE at the flow root and never remounts between
  screens (this is what makes transitions feel continuous). On step change,
  stops drift over 600 ms.
- **Behavior:** sits at z-index 0 behind all screen content.

### 7.3 `<SectionShell>` — section container (replaces GlassCard in onboarding)
- **Path:** `src/components/onboarding/aurora/SectionShell.tsx`
- **Props:** `title: string`, `subtitle?: string`, `collapsed?: boolean`,
  `onToggleCollapse?: () => void`, `children`, `delay?: number` (stagger).
- **Tokens:** background `surface.1`, border `border.subtle` 1 dp,
  `borderRadius: 20` (cards), padding `spacing.lg`.
- **Motion:** enter via `FadeInDown` 300 ms with `delay`; collapse/expand via
  `withTiming(height + opacity, { duration: 250 })`; press scale 0.97 spring
  on the collapse header.
- **Rules:** NO drop shadows, NO nested SectionShells, max ONE surface depth
  (surface.1). This is the only section container allowed.

### 7.4 `<ChipPicker>` — single/multi-select chips
- **Path:** `src/components/onboarding/aurora/ChipPicker.tsx`
- **Props:** `options: { id: string; label: string; icon?: string }[]`,
  `value: string | string[]`, `onSelect: (id) => void`, `multi?: boolean`,
  `suggestions?: string[]` (ids to surface with a bulb tint).
- **Tokens:** unselected `surface.1` + `border.subtle` + `typography.variants.body`;
  selected `chart.{current}` tint at `TINT_ALPHA_LOW` + `border.DEFAULT` + text
  `colors.text.primary`; `borderRadius: 12` (chips).
- **Motion:** selected scales 1.04 spring (damping 14, stiffness 140),
  unselected fade to 0.5 opacity; `Haptics.selectionAsync()` on select.
- **Usage:** gender, diet_type, location, intensity, flexibility, goals,
  workout times, cooking methods, diet readiness, etc.

### 7.5 `<DialStepper>` — numeric stepper
- **Path:** `src/components/onboarding/aurora/DialStepper.tsx`
- **Props:** `value: number`, `min: number`, `max: number`, `step: number`,
  `onChange: (v) => void`, `unit?: string`, `format?: (v) => string`.
- **Tokens:** cell `surface.1` + `border.subtle`, `borderRadius: 4–8` (cells),
  value text `typography.variants.heroStat` (Manrope_800ExtraBold 40),
  ± buttons `typography.variants.sectionTitle`.
- **Motion:** `Haptics.impactAsync(Medium)` per step; value animates via
  `withSpring` 200 ms; long-press accelerates (scrub).
- **Usage:** age, workout_frequency, experience years, pushups, run minutes,
  snacks_count.

### 7.6 `<RangeSlider>` — value slider
- **Path:** `src/components/onboarding/aurora/RangeSlider.tsx`
- **Props:** `value: number`, `min`, `max`, `step`, `onChange`,
  `unit?: string`, `tickHapticEvery?: number` (default 8% of track).
- **Tokens:** track `surface.2`; fill `chart.{current}`; thumb `colors.text.primary`
  with `border.DEFAULT` ring; `borderRadius: full` thumb.
- **Motion:** `Haptics.impactAsync(Medium)` every `tickHapticEvery` of travel;
  fill animates with the drag (no lag).
- **Usage:** height, weight, timeline, time_preference, max_prep_time,
  body_fat, waist/hip/chest.

### 7.7 `<RadialDial>` — radial selector (time, weeks, goal arc)
- **Path:** `src/components/onboarding/aurora/RadialDial.tsx`
- **Props:** `value: number | string`, `range: [min, max]` or time format,
  `onChange`, `label`, `unit?`, `variant: "time" | "weeks" | "goalArc"`.
- **Tokens:** track `surface.2`; arc fill `chart.{current}`; center label
  `typography.variants.heroStat`.
- **Motion:** drag rotates the arc; `Haptics.impactAsync(Medium)` per tick;
  release commits with a 200 ms spring settle.
- **Build:** Skia (`@shopify/react-native-skia`) for the arc; gesture via
  Reanimated `useSharedValue`. This is the signature "confirm-not-fill"
  control.
- **Usage:** wake_time, sleep_time, target_timeline_weeks, the S2 goal arc
  (variant `goalArc` binds to `target_weight_kg`).

### 7.8 `<TogglePill>` — boolean toggle
- **Path:** `src/components/onboarding/aurora/TogglePill.tsx`
- **Props:** `label: string`, `value: boolean`, `onChange`, `icon?`.
- **Tokens:** off `surface.1` + `border.subtle`; on `chart.{current}` tint +
  `border.DEFAULT`; `borderRadius: 12`.
- **Motion:** knob slides via `withSpring` 200 ms; `Haptics.selectionAsync()`.
- **Usage:** meal enables, enjoyment booleans, health habits, pregnancy/
  breastfeeding.

### 7.9 `<SectionHeader>` — in-section title (used inside SectionShell)
- **Path:** `src/components/onboarding/aurora/SectionHeader.tsx`
- **Props:** `title`, `subtitle?`, `icon?`, `rightAdornment?` (e.g. info
  tooltip trigger).
- **Tokens:** title `typography.variants.sectionTitle` (Manrope_600SemiBold
  18), subtitle `typography.variants.caption` (Manrope_500Medium 12) in
  `colors.text.secondary`.
- **Motion:** none (static).

### 7.10 `<InfoTap>` — the info-tooltip trigger (replaces InfoTooltipModal trigger)
- **Path:** `src/components/onboarding/aurora/InfoTap.tsx`
- **Props:** `title`, `description`, `benefits?` — wraps a small "i" icon.
- **Tokens:** icon `colors.text.tertiary`, tap surface `surface.2`.
- **Motion:** `Haptics.selectionAsync()` on tap; opens the existing
  `InfoTooltipModal` (logic unchanged).
- **Note:** keeps the existing tooltip modal component + `showInfoTooltip` hook
  actions intact; only the trigger visual changes.

### 7.11 `<NavRail>` — footer Back/Next (replaces per-screen footer)
- **Path:** `src/components/onboarding/aurora/NavRail.tsx`
- **Props:** `onBack`, `onNext`, `nextLabel`, `disabled?`, `isEditingFromReview?`,
  `onReturnToReview?`, `bloomColor: string` (current chart color for the
  commit burst).
- **Tokens:** Back `surface.1` + `border.subtle` + `typography.variants.body`
  in `colors.primary`; Next `colors.primary` fill + `colors.white` text,
  `borderRadius: 16`, minHeight 52, `spacing.lg` padding.
- **Motion:** press scale 0.96 spring; on Next commit, Skia particle bloom (12
  particles, `bloomColor`, 400 ms) emits from the button and absorbs into the
  AuroraField. Disabled state opacity 0.5.
- **Rule:** single shared footer; screens must not render their own.

### 7.12 `<MetricTile>` — S5 dashboard tile (inline-editable summary)
- **Path:** `src/components/onboarding/aurora/MetricTile.tsx`
- **Props:** `label`, `value`, `unit?`, `icon?`, `chartColor: string`,
  `onEdit?: () => void`, `editable?: boolean`.
- **Tokens:** `surface.1` + `border.subtle`, `borderRadius: 20`, value
  `typography.variants.heroStat` in `chartColor`, label
  `typography.variants.caption` in `colors.text.secondary`.
- **Motion:** `FadeInDown` 250 ms staggered 40 ms; tap → 0.97 spring →
  `Haptics.selectionAsync()` → `onEdit`.
- **Usage:** S5 metabolic/nutritional/weight tiles.

### 7.13 `<SkiaBloom>` — particle burst (payoff)
- **Path:** `src/components/onboarding/aurora/SkiaBloom.tsx`
- **Props:** `trigger: boolean`, `color: string`, `count?: number` (default 12),
  `origin?: { x, y }`.
- **Tokens:** particle fill `color` (a chart color).
- **Motion:** particles emit, expand radially, fade out over 400 ms using Skia
  + Reanimated. Mounted once at flow root; triggered by NavRail commits and
  the S5 final reveal.

### Shared motion constants (reuse everywhere)
- `FadeInDown` duration **300 ms**, stagger **60 ms** between sections,
  **40 ms** between tiles.
- Press scale **0.96–0.97**, spring `{ damping: 14, stiffness: 140 }`
  (from `animation.spring.smooth`).
- Screen content transition: exit `FadeOutDown` 200 ms, enter `FadeInDown`
  300 ms.
- AuroraField drift: **600 ms**, `Easing.bezier(0.4, 0, 0.2, 1)`.
- Haptics: `selectionAsync` for taps/selections; `impactAsync(Medium)` for
  drag ticks and steppers.

---

## 8. Hard-Rules Appendix (for Phase 2 agents)

### Scope rules
1. **Presentation/layout/animation ONLY.** Keep props, hooks, validation, and
   data wiring **identical** to current code, except: (a) adding the smart
   default values listed in §4 to the hook initial state, and (b) adding
   collapsed-state UI for fields listed in §5. Do not change the data shape,
   the `onUpdate`/`onNext`/`onBack` contracts, or the validation engine.
2. **Each agent edits ONLY its own screen's files** (the tab screen file +
   its child section components under `src/components/onboarding/{body,diet,
   workout,review,...}/`). Shared components in `src/components/onboarding/
   aurora/` are built once by the first agent that needs them and imported by
   all — never duplicated.
3. **No new npm deps.** Use only: `react-native-svg`,
   `@shopify/react-native-skia`, `react-native-reanimated`, `expo-haptics`,
   `expo-linear-gradient`, plus existing `@expo/vector-icons`.
4. **Verify clean before finishing:** `npx tsc --noEmit` must pass with zero
   errors, and `grep -rn "GlassCard\|flatColors\|fontWeight\|shadowColor\|elevation:\|boxShadow" src/screens/onboarding src/components/onboarding/aurora` must return **zero matches** in onboarding files (these are banned — see token rule below).

### Visual rules
5. **Max ONE surface depth per screen.** Use `surface.0` (background), then
   `surface.1` (cards/sections). `surface.2` only for raised controls (slider
   thumbs, popover triggers, dial thumbs) — never for a stacked card.
6. **No nested cards.** A `<SectionShell>` must not contain another
   `<SectionShell>`. Collapse sections render flat inside the shell.
7. **No drop shadows.** Use `border.subtle` hairlines + surface tints for
   elevation. Do not use `shadows.*`, `shadowColor`, `shadowOpacity`,
   `elevation:`, or `boxShadow` anywhere in onboarding.
8. **No hardcoded hex.** Every color comes from `aurora-tokens.ts`
   (`colors.*`, `surface.*`, `border.*`, `chart.*`, `flatColors.*` is
   **banned** — use the nested canonical exports). Tints via `hexToRgba(color,
   TINT_ALPHA_LOW/MEDIUM)` from `src/utils/colors.ts`.
9. **Radii:** cards/sections = **20** (`borderRadius: 20`); chips = **12**
   (`borderRadius.lg`); cells/steppers = **4–8** (`borderRadius.sm`/`md`).
   Full-round for thumbs/pills only.
10. **8pt spacing.** All layout spacing from `spacing.*` (xxs=2, xs=4, sm=8,
    md=16, lg=24, xl=32, xxl=48). No arbitrary pixel values.
11. **Fonts:** `fontFamily` ONLY (Manrope_*). **Never** `fontWeight`. Use
    `typography.variants.*` as the first source; inline `fontFamily:` strings
    must be one of the five loaded families.

### Motion rules
12. Reanimated `FadeInDown` 250–400 ms with stagger 40–60 ms.
13. Press scale 0.96–0.97, spring damping 14–20, stiffness 120–140.
14. `expo-haptics`: `selectionAsync` on selections/CTAs; `impactAsync(Medium)`
    on slider/stepper ticks.
15. The AuroraField (`<AuroraField>`) is mounted **once** at the onboarding
    flow root and never remounts per screen — this is the "one continuous
    journey" device. Screen content transitions over it.

### Data-integrity rules
16. The smart defaults in §4 are added to the **hook initial state** only
    (e.g. `useBodyAnalysis` `useState` initial values, `useWorkoutPreferences`
    initial). Do not change validation ranges or the calculation engine.
17. Progressive-disclosure (§5) is pure UI state local to each screen
    (`useState` collapsed booleans). It does not affect what is saved —
    collapsed fields still save with their current (default/empty) values via
    the existing `onUpdate` flow.
18. Relocating `activity_level` from S4 to S1: the field stays on
    `WorkoutPreferencesData` (its DB home). S1's hook calls the same
    `onUpdate({ activity_level })` that S4 currently uses. No type change, no
    migration. The `mapActivityLevelForHealthCalc` boundary is untouched.
19. Do not bypass RLS, do not add hardcoded user IDs, do not swallow Supabase
    errors (per CLAUDE.md core principles).

### Banned tokens / patterns (the grep contract)
Zero matches for: `GlassCard` (use `SectionShell`), `flatColors` (use nested
`colors.*`), `fontWeight` (use `fontFamily`), `shadowColor`, `elevation:`,
`boxShadow`.

---

## 9. Special-Page Callouts

### S1 — First screen (effortless entry)
Large Manrope display title (`typography.variants.pageTitle` scaled to
`heroStat` weight via `Manrope_800ExtraBold`) over the calm purple AuroraField.
The name field is the only typed input and is **pre-focused** with a soft-tint
fill (`surface.1` + a `chart.3` tint at `TINT_ALPHA_LOW`) and an animated
focus ring. Everything else is haptic-stepped pickers (chips, dials) — no text
boxes. The avatar circle fills with the user's initials as they type. The
`activity_level` dial sits at the bottom as a 5-step horizontal dial; choosing
it here seeds the S2 BMR/TDEE live preview. This screen must feel like the app
is greeting the user, not interviewing them.

### S2 — Body Analysis (most visual)
The signature screen. Center: an **interactive silhouette/gauge** (Skia) — a
radial that shows current weight as a filled arc and the target as a draggable
ring. Dragging the target ring sets `target_weight_kg` and the
`target_timeline_weeks` radial re-orients to keep the rate safe. A live **BMI
ring** (Skia, `chart.2`) updates as the height/weight sliders move, colored
by `bmi_category`. The goal is SHOWN, not just stated — the user sees their
transformation arc before they tap Next. Body composition, photos, and
medical collapse behind "Add details" (§5). This is where "confirm not fill"
is most visceral: sliders start at the §4 gender-aware medians, so most users
just nudge.

### S5 — Final/Review (payoff)
A scannable **summary dashboard**, not a form. Layout: a 2-column grid of
`<MetricTile>`s for metabolic profile (`calculated_bmr`, `calculated_tdee`,
`metabolic_age`, `bmi_category`) and nutritional needs (`daily_calories`,
`daily_protein_g`, `daily_carbs_g`, `daily_fat_g`, `daily_water_ml`), each
colored with a distinct `chart.1`–`chart.6` so the eye can scan groups.
Weight management renders as the locked goal arc from S2. Every tile is
inline-editable — tap → `onNavigateToTab(sourceScreen)` (or an inline stepper
for single fields). When the user taps "Complete Setup," the full
`chart.1`–`chart.6` spectrum reveals across the AuroraField, a larger
`<SkiaBloom>` fires, and a **tier-gradient reveal** (the AuroraField stops
sweep from the calm purple through to the full spectrum) bridges directly into
the main app's Home hero — the onboarding does not "exit," it *becomes* Home.
The existing `WarningCard` / `AdjustmentWizard` / `smartAlternatives` flow
stays intact (data wiring unchanged) and renders as an overlay above the
dashboard when validation produces blocking errors.

---

## Field-to-screen summary (quick reference)

| Current tab field home | New screen | Input control (§6/§7) | Default (§4) |
|------------------------|-----------|-----------------------|--------------|
| PersonalInfo.* (profiles) | S1 | chips/dials/text | locale + 07:00/23:00 |
| WorkoutPreferences.activity_level | **S1** (moved) | 5-step dial | `"sedentary"` (user dials) |
| BodyAnalysis.height/weight/target/timeline | S2 | sliders + RadialDial goalArc | gender-aware medians |
| BodyAnalysis.body_fat/waist/hip/chest | S2 (collapsed) | sliders | undefined |
| BodyAnalysis.photos + AI | S2 (collapsed) | existing capture flow | undefined |
| BodyAnalysis.medical/pregnancy/stress | S2 (collapsed) | toggles/chips | `false` / undefined |
| DietPreferences.diet_type/meals/cooking | S3 | chips/sliders/toggles | `"balanced"`/true/beginner/30/medium |
| DietPreferences.readiness/allergies/habits | S3 (collapsed) | chips/search/grid | `false`/empty |
| WorkoutPreferences.goals/location/intensity/time/freq | S4 | chips/dials/slider/stepper | []/"both"/"beginner"/30/3 |
| WorkoutPreferences.assessment/equipment/enjoyment | S4 (collapsed) | steppers/chips/toggles | as hook defaults |
| AdvancedReview.* (all calculated) | S5 | MetricTiles (read + inline-edit) | calculated |

---

## 10. Phase 2c Implementation Notes (flow-root chrome)

Phase 2c wired the flow-root chrome in `src/screens/onboarding/OnboardingContainer.tsx`
and resolved the cross-screen concerns deferred out of the parallel Phase 2b agents.

### Flow-order decision (IMPORTANT)
The blueprint's §2 conceptual ordering is You → Body → Fuel → Move → Plan, but the
**actual code tab order is 1=Personal, 2=Diet, 3=Body, 4=Workout, 5=Review** (i.e.
You → Fuel → Body → Move → Plan). `handleNextTab` does `currentTab + 1` and validation
gating keys off tab number, so reordering would change validation/logic — out of
scope for a presentation-only redesign. **The code order was preserved.**

Consequence & resolution:
- The `AuroraField` drift is keyed to **progress** (`step = currentTab`), so it is a
  monotonic cool→warm→spectrum pan across the 5 steps regardless of which screen is
  which. The "one continuous journey" feel is preserved (blueprint §1 intent).
- The `AuroraBeam` `stepColors` are mapped to each tab's **accent** in actual flow
  order: `[chart[3], chart[5], chart[2], chart[1], chart[6]]` = You(purple) →
  Fuel(amber) → Body(cyan) → Move(orange) → Plan(pink→spectrum). Each screen's control
  accent (set in Phase 2b) matches its tab, so the beam color matches the screen you
  are on.

### Chrome changes
- `AuroraBackground` (app-wide) at the flow root → **`AuroraField`** (onboarding
  drifting gradient), mounted ONCE and never remounted between screens (the "Drift"
  device). AuroraField sits at zIndex 0; content sits above it at zIndex 1.
- `OnboardingTabBar` (dots + labels + step counter) → **`AuroraBeam`** (2dp aurora
  beam, no dots/labels). Tapping a completed segment navigates back via
  `handleTabPress`. Hidden in edit mode (matches prior header behavior).
  `OnboardingTabBar.tsx` is retained (unrendered) because `AdvancedTouchTargets.test`
  renders it directly; it is outside the redesign grep scope.
- Screen content is wrapped in a `key={currentTab}` `Animated.View` with
  `entering={FadeInDown.springify()}` / `exiting={FadeOutDown}` so each screen
  swap is a 300ms-in / 200ms-out drift over the persistent sky.
- `AuroraBeam` container made transparent (was `surface[0]`) so the sky flows through
  it; only the 2dp track is visible.

### activity_level relocation (rule 18)
`activity_level` is rendered on S1 (Personal) and removed from S4
(`ActivityLevelSection.tsx` deleted; its render + import removed from
`WorkoutPreferencesTab`). The SSOT stays on `WorkoutPreferencesData` — S1's dial
calls `updateWorkoutPreferences({ activity_level })`, so `handleCompletionGet-
Started`, `aiRequestTransformers`, and `calculatePersonalizedStepGoal` are
unchanged (verified: aiRequestTransformers + typeTransformers + dataManager tests
pass). No type change, no migration.

### Token migration
`OnboardingContainer.tsx` and `WelcomeScreen.tsx` migrated off `flatColors` /
`flatFontSize` / `fontWeight` / `elevation` / `shadowColor` to nested Aurora tokens
(`colors.*`, `surface.*`, `border.*`, `chart.*`, `typography.variants`/`fontSize`,
`fontFamily` only). `WelcomeScreen` (the pre-onboarding auth screen, not one of the
5 tabs but the literal first impression) was token-migrated with layout/structure
preserved verbatim; Google brand blue `#4285F4` kept as a brand asset (not a
design-system color).

### Verification (Phase 2c exit)
- `npx tsc --noEmit`: **0 errors** project-wide.
- Banned-pattern grep (`GlassCard|flatColors|fontWeight|shadowColor|elevation:|
  boxShadow`) over `src/screens/onboarding` + `src/components/onboarding/aurora` +
  the redesigned component dirs (`body/diet/workout/review`) + S1 top-level files:
  **0 matches**.
- Onboarding tests: 6/6 pass (`AdvancedTouchTargets`, `CurrentDietSection`,
  onboarding-analytics `TouchTargets`). Downstream data/logic suites: 77/77 pass
  (`useProfileLogic`, `aiRequestTransformers`, `typeTransformers`, `dataManager`,
  `MainNavigation`).
