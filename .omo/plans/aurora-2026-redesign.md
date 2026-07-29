# 🎯 STRICT REDESIGN PLAN — FitAI Profile, Progress, Analytics & Achievements

**ROLE**: You are an elite Senior React Native UI/UX Engineer (2026 standard). You will execute a **complete visual and structural redesign** of exactly 4 screens in this Expo React Native app to a premium, modern, 2026-grade aesthetic. You do NOT touch business logic, data fetching, or navigation behavior — only presentation, layout, component structure, and animation.

---

## 📦 EXISTING STACK (already installed — use these, add nothing unless listed)

- Expo SDK 53 / RN 0.79.6 / React 19
- **NativeWind v4** (Tailwind) + custom `Aurora` token system in `src/theme/aurora-tokens.ts`
- `react-native-reanimated` v3.17.4
- `@shopify/react-native-skia` v2
- `expo-linear-gradient`, `expo-blur`, `expo-haptics`
- `react-native-svg`
- Icons: `@expo/vector-icons` (Ionicons)

**Target screens** (edit ONLY these + their child components):
1. `src/screens/main/ProfileScreen.tsx` → `src/screens/main/profile/*`
2. `src/screens/main/ProgressScreen.tsx` → `src/components/progress/*`
3. `src/screens/main/ProgressTrendsScreen.tsx` / analytics → `src/screens/main/analytics/*`
4. `src/screens/main/AchievementsScreen.tsx` → `src/components/achievements/*`

---

## ⚠️ CRITICAL FIRST TASK — FONT SYSTEM (currently broken)

**Manrope is downloaded in `assets/fonts/` (Light/Regular/Medium/SemiBold/Bold/ExtraBold) but is NOT loaded anywhere.** Fix this FIRST:

1. Create `src/hooks/useAppFonts.ts` using `expo-font`'s `useFonts()` to load all 6 Manrope weights with clear family names: `Manrope`, `Manrope-Medium`, `Manrope-SemiBold`, `Manrope-Bold`, etc. (map to `fontFamily` strings).
2. Gate the app in `App.tsx`: render `<SplashScreen>`/null until `fontsLoaded`.
3. Add Manrope to NativeWind: extend `tailwind.config.js` → `theme.extend.fontFamily = { sans: ['Manrope'] }`.
4. Define a **type scale** in `aurora-tokens.ts` (`typography.variants`) so every text style uses one consistent family + weight pairing. **One universal font family, weights only** — no other font, ever.
5. Replace every `fontWeight: "700"` / `"800"` style with the matching loaded Manrope weight (`fontFamily: 'Manrope-Bold'`). Audit all 4 screens.

---

## 🎨 DESIGN LANGUAGE — "Aurora 2026" (strict rules)

### Tokens (extend, don't replace, `src/theme/aurora-tokens.ts`)
- Keep existing `colors.primary` (#FF6B35), `secondary` (#00D4FF), `aurora.space` background.
- **Add** a semantic "surface" scale (5 steps), "border" scale, and "chart" palette (6 harmonious colors) to tokens — then use ONLY tokens. **No hardcoded hex values in any component.**
- **Elevation model**: Max 3 surface levels per screen (bg → card → raised). Define `surface.0/1/2` and use consistently.

### ❌ ABSOLUTELY BANNED (delete on sight)
- **Nested cards**: A `Card` inside a `Card` (or glass-on-glass) is forbidden. Max depth = 1 surface over the screen background.
- Drop shadows on dark theme (use subtle borders + elevation tint instead).
- More than 2 accent colors on one screen.
- `shadow*` / `elevation` on glass elements.
- Emojis as icons. Placeholder gray boxes.
- Tiny `text-xs` (<12px) for body data.
- Mixed corner radii on siblings (pick one radius per component type).

### ✅ REQUIRED PATTERNS
- **Spacing**: Strict 8pt grid (`spacing` tokens). Section vertical rhythm: 24px between major sections, 12px inside.
- **Radius system**: Cards = 20px, chips/buttons = 12px, small tags = 8px. Consistent everywhere.
- **Glass**: Only ONE glass style — `surface.1` with 1px `glass.border`, optional subtle `expo-blur` (≤20). No stacked blur.
- **Typography hierarchy**: Page title (28/Bold), Section title (18/SemiBold), Card headline (16/SemiBold), Body (15/Regular), Caption (12/Medium). Line-height 1.3–1.5.
- **Motion**: All entrance animations staggered `FadeInDown` (Reanimated) 250–400ms. Press feedback = `scale 0.97` spring. Numbers animate with `react-native-reanimated` counters or Skia where smooth.
- **Haptics**: `expo-haptics` light impact on all primary CTA presses + tab switches.

---

## 🧩 SCREEN-SPECIFIC REBUILDS

### 1️⃣ PROFILE (`src/screens/main/profile/*`)
- **Header**: Large avatar (80px) with gradient ring, name (22/Bold), member-since caption. No card container — sit directly on bg.
- **Stats row** (`ProfileStats`): Convert to 3 equal "stat pills" — big number (20/Bold) + tiny label, NO individual card boxes, separated by thin dividers.
- **Completion** (`ProfileCompletionCard`): Replace card with a full-width gradient progress bar + single line of text. 
- **Settings** (`SettingsSection`): Convert grouped settings to a **clean iOS-style list** — icon (in soft-tinted 32px squircle) + label + chevron, one surface, hairline separators. Remove nested card-in-card.
- Modals: unify input styling to one `FormField` pattern (label above, 14px radius, focused accent border).

### 2️⃣ PROGRESS (`src/components/progress/*`)
- **Hero** (`WeightJourneySection`): Full-bleed chart section (not boxed in a card). Big current weight (40/Bold) + delta chip. Replace `react-native-chart-kit` look with custom **Skia/SVG area chart** (gradient fill, smooth curve, animated draw-on).
- **Goal** (`GoalProgressSection`): One horizontal gradient progress bar + % text, minimal.
- **Consistency** (`WorkoutConsistencySection`): GitHub-style heatmap, perfect square cells 4px radius, single accent scale.
- **Achievements teaser**: Horizontal scroll of circular badges, not boxed grid.

### 3️⃣ ANALYTICS (`src/screens/main/analytics/*`)
- **Rebuild all charts** (`BarChart`, `LineChart`, `StackedAreaChart`) on **Skia** for 60fps: animated, gradient-filled, gesture tooltip (`ChartTooltip` on press-and-hold).
- **MetricSummaryGrid**: 2×2 clean stat layout, big numbers, NO cards-in-cards.
- **PeriodSelector**: Sliding segmented control (animated indicator).
- **InsightCard**: Single accent left-border style, not full card.

### 4️⃣ ACHIEVEMENTS (`src/components/achievements/*`)
- **Stats banner**: Slim single-line strip (Earned • % • FitCoins), no heavy card.
- **CategoryTabs**: Underline-style animated tabs, not pills.
- **AchievementCard**: 2-column grid of clean tiles — tier-colored ring/badge, title, tiny progress bar for in-progress. Locked = 40% opacity + lock icon, NOT a different card style.
- **Detail modal**: Hero badge animation (scale+rotate spring), gradient by tier.
- Celebration (`AchievementCelebration`): Skia particle burst on unlock.

---

## 🔧 OPTIONAL — ONLY these OSS additions allowed
If genuinely needed for quality, you MAY add (after confirming they're compatible):
- `react-native-gifted-charts` (if Skia rebuild is too slow to hand-roll)
- `lottie-react-native` (for achievement celebrations)
- `expo-symbols` (SF Symbols on iOS)

**Do NOT add any other UI kit, font, or chart lib. No paid/closed-source packages.**

---

## ✅ DEFINITION OF DONE (verify before finishing)
- [ ] Manrope loads globally; zero system-font fallback on the 4 screens.
- [ ] No nested cards anywhere (visual audit: max 1 surface depth).
- [ ] All colors/spacing/radii come from `aurora-tokens.ts` (grep for stray hex).
- [ ] All charts are Skia/SVG-based, animated, with tooltips.
- [ ] `npm run lint` and `npm run type-check` pass with 0 new errors.
- [ ] Each screen scrolls at 60fps (use `React.memo`, `useCallback`, FlashList-style patterns if needed).
- [ ] Light haptics on all primary interactions.
- [ ] Visual parity: one consistent radius/elevation/typography system across all 4 tabs.

**Work one screen at a time. Show me the new `useAppFonts.ts` + token additions FIRST before touching any screen.**
