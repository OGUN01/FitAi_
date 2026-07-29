# Onboarding Fresh Design System — "Editorial Dark" (NO CARDS)

This is the single source of truth for the onboarding re-skin. Every agent MUST
read this file fully before writing any code, and follow it exactly so all 5
tabs look like ONE coherent product, not five different ones.

## What we are doing (and NOT doing)

- **KEEP** the 5-tab structure: Personal → Diet → Body → Workout → Review.
- **KEEP every input field** (see per-tab inventories below). The AI generation
  pipeline depends on this metadata. Do NOT remove, merge, or defer any field.
- **DO NOT touch the data layer**: hooks (`usePersonalInfoForm`,
  `useDietPreferences`, `useBodyAnalysis`, `useWorkoutPreferences`,
  `useAdvancedReviewForm`), the store (`useOnboardingState`), validation
  (`validateTab`), and the completion flow stay exactly as they are. You only
  change **presentation** (JSX + styles). Keep every `updateField` / `onUpdate`
  call wired to the same fields.
- **CHANGE the visual language entirely.** The current look (boxed cards,
  nested cards, filled pie-wedge rings) is dated. Replace it with the
  "Editorial Dark" language below.

## The design language — "Editorial Dark"

Reference feel: Linear, Apple Fitness+, Whoop, Levels. Content breathes on pure
black. Hierarchy comes from **type, space, and hairlines — never containers.**

**NO cards. NO nested cards. NO card borders. NO filled boxes behind content.
NO drop shadows, NO elevation.** A section is a label + content + a hairline.
That's it.

## The ambition bar (v2 — "wow, but super clean, not overwhelming")

The user rejected the first pass as "30% of what we want." The bar is now
**best-in-world 2026**. Every tab must feel *inevitable* — so clean and aligned
that the reaction is "oh wow, what a great app," NOT "this is a long form."
We collect a LOT of inputs; the craft is making that feel light. Principles
(grounded in 2026 onboarding benchmarks):

1. **Progressive disclosure is the whole game.** Required inputs are visible;
   everything optional/advanced lives inside a `CollapsibleSection` that is
   COLLAPSED by default. The screen should look short and calm on first view.
2. **One idea per screen, one focal question.** The big `question` leads; the
   rest is quiet. Nothing competes with the primary action.
3. **Alignment is non-negotiable.** Everything sits on the 24px screen pad and
   the 4pt grid. Rows share one left edge; values align right; hairlines span
   full width. Ragged alignment = cheap.
4. **Restraint with the orange.** `#FF6B35` appears only on: the selected
   check/left-bar, the focused underline, key numbers, and the primary CTA.
   If a screen has more than ~3 orange elements, it's too loud.
5. **Micro-motion, not decoration.** 120ms opacity on press, FadeInDown on
   mount, the collapsible height spring. No bouncy excess, no gratuitous glow.
6. **Type does the work.** The 40px light question, the small-caps labels, the
   confident 17px values. Whitespace and type create the premium feel — not
   boxes, not color.
7. **Empty space is a feature.** Generous `sectionGap` and a calm first view
   beat cramming. If a screen feels full, collapse more into sections.

**Sleep schedule** is now two `TimeRow`s (Wake / Sleep) + a sleep-duration
caption — NOT the old giant filled dials.

### Tokens (implement as `src/components/onboarding/fresh/tokens.ts`)

```
bg            #050505   (near-OLED black, screen background)
ink           #F5F5F5   (primary text)
ink2          rgba(245,245,245,0.55)  (secondary text)
ink3          rgba(245,245,245,0.34)  (tertiary/labels/placeholders)
hairline      rgba(255,255,255,0.08)  (1px separators — the ONLY "border")
accent        #FF6B35   (brand orange — the app's primary; the single brand accent)
accentDim     rgba(255,107,53,0.14)   (accent at low alpha, for a selected dot/bg)
danger        #FF6B6B
```

**Accent discipline (critical):** `accent` is used ONLY for: the primary CTA,
the selected-state indicator (a check or 2px left bar), key numbers, and the
focused underline. It is NEVER a big background fill. Restraint = premium.

### Type (Manrope — already the repo font)

```
question      Manrope 300, 40px, lineHeight 44, letterSpacing -0.5, ink      (the big screen question)
sectionLabel  Manrope 600, 11px, uppercase, letterSpacing 1.6, ink3          (section headers)
value         Manrope 500, 17px, ink                                          (field values, option labels)
valueLg       Manrope 600, 22px, ink                                          (big numbers)
body          Manrope 400, 14px, ink2                                         (helper/subtext)
caption       Manrope 400, 12px, ink3                                         (fine print)
```

### Spacing (4pt grid)

```
screenPad   24px horizontal
qGap        40px between the big question and the first section
sectionGap  36px between sections
rowH        56px standard tappable row height
hair        1px hairline
```

## The fresh primitive kit (`src/components/onboarding/fresh/`)

The foundation agent builds these. Tab agents import from
`src/components/onboarding/fresh` (the barrel `index.ts`). Use these EXACT
names and props — tab agents code against this contract.

```ts
// tokens.ts — export const tokens = { bg, ink, ink2, ink3, hairline, accent, accentDim, danger }
//             plus type/spacing scales above.

// Rule.tsx — a 1px hairline divider. Props: { spacing?: number; style? }
// SectionLabel.tsx — uppercase small-caps label. Props: { children; style? }

// OptionRow.tsx — THE replacement for card tiles. Full-width row, height 56,
//   hairline below. Left: label (value). Optional sublabel (caption, ink3).
//   Optional left icon (ink2, 20px). When selected: label turns full ink, a 2px
//   accent bar appears on the left edge, and an accent check (Ionicons
//   "checkmark", 18px) appears on the right. When unselected: label ink2, no
//   check, no bar. Transparent background always. Tap fires onPress with a
//   120ms opacity 0.6 press feedback.
//   Props: { label: string; sublabel?: string; icon?: keyof typeof Ionicons.glyphMap;
//            selected: boolean; onPress: () => void; disabled?: boolean; testID?: string }

// RowGroup.tsx — a vertical stack of OptionRows (or any rows) with a
//   SectionLabel above and NO container box. Props: { label?: string; children; style? }

// Pill.tsx — minimal selectable chip for MULTI-select sets (equipment, workout
//   types, habits). Text + 1px hairline border, borderRadius 999, paddingH 14,
//   paddingV 8. Selected: border + text turn accent, background accentDim.
//   Unselected: hairline border, ink2 text, transparent bg. Wrap in a flexWrap
//   row with 8px gaps. Props: { label: string; selected: boolean; onPress: () => void; icon?; testID? }

// StrokeRing.tsx — THE replacement for the pixelated filled pie-wedges. A
//   smooth ring built with react-native-svg (v15 is installed). An <Svg> with
//   two <Circle>s: a track circle (stroke=hairline) and a progress circle
//   (stroke=accent, strokeLinecap="round", rotated -90° so it starts at top,
//   strokeDasharray = circumference, strokeDashoffset for progress). Center
//   children (the big number + label) rendered absolutely on top. Crisp at any
//   size — never pixelated, no Skia dependency.
//   Props: { size: number; strokeWidth?: number; progress: number /* 0..1 */;
//            color?: string /* default accent */; trackColor?: string;
//            children?: React.ReactNode /* centered */ }

// CollapsibleSection.tsx — THE replacement for SectionShell (fixes the empty
//   box bug). NOT a card. A header row (SectionLabel + optional subtitle +
//   chevron on the right, hairline below). Tap toggles. When collapsed, content
//   is REMOVED from layout (height collapses to 0 — use a measured
//   Reanimated height animation, or conditionally render). When expanded,
//   content renders inline below with a hairline above it, then the content
//   rows. NEVER an invisible-but-full-height box.
//   Props: { title: string; subtitle?: string; expanded: boolean;
//            onToggle: () => void; children; defaultExpanded?: boolean; testID? }

// TimeRow.tsx — compact time stepper (THE sleep/wake dial replacement). A 56px
//   hairline row: label left, a quiet [-] "HH:MM" [+] ghost-circle stepper
//   right. Steps by stepMinutes (default 15), wraps midnight. NO giant dials,
//   NO filled circles. Already built — import it.
//   Props: { label: string; value: string /* "HH:MM" */;
//            onChange: (hhmm: string) => void; stepMinutes?: number; testID? }

// ScreenScaffold.tsx — the per-screen frame. Props:
//   { question: string; subtext?: string; children;
//     onBack?: () => void; onNext?: () => void; nextLabel?: string;
//     nextDisabled?: boolean; footerNote?: React.ReactNode }
//   Renders: big question (question type) top-left, optional subtext (body),
//   a flex-1 ScrollView (screenPad, contentContainer paddingBottom 40) with
//   the children, then a footer with a Back ghost button (ink2 text) and a
//   primary Next button. Primary Next: full-width-minus-back, height 56,
//   borderRadius 16, background accent, label Manrope 700 16px color #050505.
//   Disabled: background rgba(255,255,255,0.08), label ink3. This is the ONE
//   place a solid accent fill is allowed.

// index.ts — barrel re-exporting all of the above + tokens.
```

Existing aurora components you MAY reuse (they are already non-card and fresh):
`QuestionHero`, `UnderlineInput`, `StepperRow`, `SearchSheet`, `NavRail`,
`RangeSlider`, `RadialDial` from `src/components/onboarding/aurora`. Re-accent
them to `accent` (#FF6B35) by passing `accentColor={tokens.accent}` where the
prop exists. Do NOT use `SectionShell` (card) or any filled-wedge ring.

## The two render bugs being fixed (do not reintroduce)

1. **Empty collapsible boxes.** Root cause: `SectionShell` collapses via
   `opacity` only, not height, so collapsed content is invisible but still
   occupies full height → big empty box. `CollapsibleSection` MUST collapse
   height (remove content from layout when collapsed). Sections that are
   optional/advanced (body composition, photos, medical, assess-me, equipment
   & types, enjoyment, cooking methods, diet readiness, allergies, lifestyle
   habits) default to **collapsed** and expand on tap.
2. **Pixelated rings.** Root cause: filled pie-wedge fallback. `StrokeRing`
   uses react-native-svg stroked circles — smooth, crisp, no Skia dependency.
   BMI ring and goal ring on Body use `StrokeRing`.

## Per-tab input inventories (PRESERVE EVERY FIELD)

### Tab 1 — PersonalInfoTab (`src/screens/onboarding/tabs/PersonalInfoTab.tsx`)
first_name, last_name, age (stepper 13–120), gender (Male/Female/Other/Prefer
not to say), country (chip picker incl. Other), state/region (text or state
chips when a country with states is picked), wake_time + sleep_time (dials +
computed sleep duration), activity_level (Sedentary/Light/Moderate/Active/
Extreme — SSOT is workoutPreferences, set via `onActivityLevelChange`).
Hook: `usePersonalInfoForm` (+ `activityLevel`/`onActivityLevelChange` props).

### Tab 2 — DietPreferencesTab (`src/screens/onboarding/tabs/DietPreferencesTab.tsx`)
diet_type (Non-Veg/Vegetarian/Vegan/Pescatarian/Balanced), meal toggles
breakfast/lunch/dinner/snacks_enabled (≥1 must stay on), cooking_skill_level,
max_cooking_time (slider), food_budget, cooking_methods[] (10, collapsible),
diet readiness (Keto/IF/Paleo/Mediterranean/Low-carb/High-protein,
collapsible), food_allergies[] + dietary_restrictions[] (collapsible),
lifestyle habits (hydration ×2, eating patterns ×4, food choices ×4,
substances ×4 — collapsible). Hook: `useDietPreferences`.

### Tab 3 — BodyAnalysisTab (`src/screens/onboarding/tabs/BodyAnalysisTab.tsx`)
height_cm (slider), current_weight_kg (slider), live BMI (computed,
StrokeRing), target_weight_kg (StrokeRing drag or stepper), target_timeline_weeks
(+ kg/week pace), body composition (body_fat, waist, hip, chest — collapsible),
progress photos front/side/back (collapsible), medical & safety (conditions,
medications, physical_limitations, stress_level — collapsible).
Hook: `useBodyAnalysis`. BMI ring + goal ring MUST use `StrokeRing`.

### Tab 4 — WorkoutPreferencesTab (`src/screens/onboarding/tabs/WorkoutPreferencesTab.tsx`)
primary_goals[] (multi: Weight Loss/Gain, Muscle Gain, Strength, Endurance,
Flexibility, General Fitness), location (Home/Gym/Both), intensity
(Beginner/Intermediate/Advanced), session_duration (slider), sessions_per_week
(stepper), preferred_times[] (Morning/Afternoon/Evening), assess-me
(experience_years, max_pushups, continuous_running, flexibility — collapsible),
equipment[] (9 multi — collapsible), workout_types[] (8 multi — collapsible),
enjoyment toggles ×6 (collapsible), weight goal (READ-ONLY from Body tab:
current/target/timeline). Hook: `useWorkoutPreferences`. The equipment,
workout-types, assess-me, enjoyment sections MUST use `CollapsibleSection`.

### Tab 5 — AdvancedReviewTab (`src/screens/onboarding/tabs/AdvancedReviewTab.tsx`)
Summary rows (Personal/Diet/Body/Workout — tappable to jump back),
Metabolic Profile (BMR, TDEE, Metabolic Age, BMI Category), Daily Nutritional
Needs (Daily Calories, Protein, Carbs, Fats, Water), Weight Management
(target, healthy min/max, weekly rate, timeline), Choose Your Pace (pace
options + calorie/BMR warnings + teen/low-readiness acknowledgments + the
"I understand" confirm), Complete Setup CTA. NO nested cards — present each
metric as a clean row (label + big value) or a minimal grid with hairlines.
Keep `useAdvancedReviewForm` + the pace/warning logic intact.

## Definition of done (each tab)

- `npx tsc --noEmit` clean.
- Every field in the tab's inventory is present and wired to the same hook
  field as before (no data regressions).
- No `SectionShell`, no filled-wedge rings, no boxed/nested cards, no shadows.
- Uses `tokens` + the fresh primitives. Accent used with restraint.
- Manrope only; no `fontWeight` hacks (use the right Manrope family variant).
