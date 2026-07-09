# FitAI UI/UX + Data-Integrity Verification Goal (authoritative spec)

**Set 2026-06-23. Autonomous, Stop-hook enforced.** This doc is the authoritative spec — read it IN FULL before any work. The memory goal file (`uiux-data-integrity-goal.md`) is a short pointer to this doc.

## Mandate
Make FitAI's **UI/UX best-in-class** AND its **data integrity bulletproof** (local Zustand store + Supabase, online + offline). The user has witnessed 100+ UI issues across workout/diet/analytics — overlapping controls, low transparency (background bleeding through), cards overlaying with no separation, wrong opacity, collapsed/invisible buttons, nested-content breakage. Assume issues are widespread; hunt systematically.

## ORCHESTRATION MODEL (non-negotiable)
- **The main context is a PURE ORCHESTRATOR.** It does NOTHING itself — not even a single Read/Grep/Bash/Edit/verification. Everything is delegated to flat agents.
- **Launch 4-5 flat agents per wave.** The orchestrator's only actions: dispatch agents, read their returned summaries, merge findings, decide + dispatch the next wave, loop until clean.
- **Device conflict:** there is ONE emulator. Only ONE agent may drive the device at a time. So each wave = **1 device-driving agent** (visual QA + hot-reload fix loop on a specific flow) **+ 3-4 code-only agents** (data-integrity audit/fix on different domains — no device, run fully in parallel). Serialize device agents across waves; parallelize code agents within a wave.
- **Agents write reports to disk** (`src/docs/...`) — bulky dumps/analysis stay on disk, not in context. Agents return <250-word summaries.

## METHOD = hot-reload fix loop (the speed advantage)
Metro + `adb reverse tcp:8081 tcp:8081` + debug dev-client + Fast Refresh are ALREADY set up (see memory `hot-reload-dev-client-loop`). The loop per fix:
1. **Find** issue — screenshot (`adb exec-out screencap -p > .maestro-artifacts/<name>.png`) + uiautomator dump + logcat. NOTE: do NOT Read .png/.jpg/.bin files (they crash subagent sessions). Analyze via uiautomator XML (text + bounds) + logcat. Keep screenshots on disk for the USER to view.
2. **Fix** in source — aurora tokens only (NO hardcoded colors/spacing), no new deps, no `Alert.alert` (use `crossPlatformAlert`), no `console.log` in prod paths, match surrounding code style.
3. **Hot-reload** — save → ~2-3s → if Fast Refresh doesn't auto-apply, force reload: `adb shell input keyevent 82` → tap "Reload".
4. **Re-verify** — re-screenshot + re-dump, confirm the fix.
5. **Gates after fixes** — `npx tsc --noEmit` (exit 0), `npx jest 2>&1 | tail -3` (≥471/87 suites, never regress), `npx expo export --platform android`.

**NEVER rebuild the APK for iteration.** Reserve release-APK rebuild (`./gradlew assembleRelease --rerun-tasks` + uninstall + reinstall) for FINAL sign-off only.

### First agent of the session MUST verify the loop is alive
`curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status` → expect 200. If dead: `cd D:/FitAi/FitAI && nohup npx expo start --dev-client --port 8081 > .maestro-artifacts/metro.log 2>&1 &` + `sleep 12` + `adb reverse tcp:8081 tcp:8081`. If emulator offline: cold-boot `C:/Users/Harsh/AppData/Local/Android/Sdk/emulator/emulator.exe @sniff_avd -no-snapshot-load -no-boot-anim -gpu host -no-audio`, wait `adb shell getprop sys.boot_completed`=1. ADB: `C:/Users/Harsh/AppData/Local/Android/Sdk/platform-tools/adb.exe`. Test user: `testuser@fitai.dev` / `TestPass12345` (Supabase project `mqfrwtmkokivoxgukgsz`; MCP `mcp__supabase__execute_sql` available — but prefer agents).

## DEV MODE = create users freely
It's dev, not prod. **Create fresh test users** to exercise onboarding + every authenticated flow. Do NOT worry about polluting Supabase. This overturns the prior "defer onboarding" decision — onboarding IS in scope now.

## FOCUS 1 — UI/UX (go one-by-one through EVERY screen/window)
For each screen: screenshot + dump → hunt defects → fix → re-verify. Defect categories (the user's witnessed issues are the priority):
- **Overlapping controls** — two nodes with intersecting bounds → one occludes the other (e.g. workout-session overload buttons overlapping the background).
- **Low transparency / background bleed** — glass/blur surfaces too transparent, background visible through them when it shouldn't be. Check `backdropOpacity`, `GlassCard`/`GlassView` overlay colors, alpha values.
- **Cards overlaying with no separation** — stacked cards with no margin/spacing/gap; opacity making them merge visually. Check `spacing`, `gap`, `marginVertical`, `borderRadius`, elevation/shadow separation.
- **Wrong opacity** — elements at 0 opacity (invisible) or 1 where semi-transparent expected.
- **Collapsed/invisible controls** — `AnimatedPressable` outer `Animated.View` with `flexShrink:1` + no `height` collapses to ~10px (FOUND in ExerciseSessionModal — grep ALL `AnimatedPressable`/`containerStyle` usage for this bug).
- **Negative/inverted bounds** — y1>y2 or x1>x2 (FOUND in SettingsModalWrapper, PaywallModal, SettingsSelectionModal, ExerciseGifPlayer — caused by percentage `maxHeight`, `overflow:"hidden"`, missing height constraints). Grep for `maxHeight: "9` / percentage heights + `overflow: "hidden"`.
- **Entire modal invisible to a11y** — gesture-handler wrapper blocking the bridge (FOUND in BottomSheet; check all BottomSheet consumers + other gesture-handler-wrapped modals).
- **Truncation** — text bounds too small for content.
- **Off-screen** — bounds beyond viewport (x>1080 or y>2400 on this device).
- **Dead controls** — buttons with no onPress, or onPress that throws (check logcat on tap).
- **Empty/error states** — what shows when data is missing? Silent failures?

### Screen inventory (verify EACH, screenshot + dump each)
**Onboarding** (fresh user): first-name/last-name/age (testIDs exist), body analysis, fitness goals, workout preferences, diet preferences, completion → lands on Home.
**Auth**: sign-in, sign-up, "Continue as Guest" (must set guest mode), password reset.
**Home tab**: greeting, daily summary cards, quick actions, streak, empty states.
**Fitness tab**: generate-workout CTA, plan display, workout cards, **workout builder** (CreateWorkout, TemplateLibrary, ScheduleBuilder), exercise detail.
**Workout session** (BIG — many nested modals): WorkoutSessionScreen (Aurora + volume + mesocycle), ExerciseSessionModal (the overload/complete-set controls — user flagged issues HERE), SetLogModal (RPE + inputs), RestTimer, ExerciseInstructionModal, ExerciseHistoryScreen, DeloadModal, NextExercisePreview, WorkoutHeader/ProgressBar.
**Diet tab**: generate-diet, meal cards, meal detail (MealDetailModal), **LogMealModal** (By Ingredients + Direct Entry), ContributeFood, cooking/meal-session, water log, diet compliance.
**Analytics tab**: weight trend, volume, calorie/macro compliance, ProgressTrends charts, nested content.
**Profile tab**: personal info edit, goals & preferences, stats summary.
**Settings**: units selection modal, HealthKit settings, cache clear, notifications, manual health entry.
**Achievements**: cards, progress bars, locked/unlocked.
**Subscription/Paywall**: plan cards, pricing, features.

## FOCUS 2 — DATA INTEGRITY (local + Supabase, online + offline)
For EACH user-data type, verify the **store → service → DB → UI round-trip** and that it works **offline (local-first)** AND **online (Supabase sync)**. No silent loss.
### Data types to verify
- User profile / onboarding data (personal info, body analysis, fitness goals, workout prefs, diet prefs).
- Workout plan + exercise sets (completion, `caloriesBurned` MET calc — SSOT, NOT `estimatedCalories`; PRs; volume; progressive overload / mesocycle `MESOCYCLE_WEEK_MULTIPLIERS`; `priorPerformance` wiring).
- Diet plan + meals + food logs + water log.
- Achievements + body measurements / progress.
- Subscription state.
### Integrity rules (from CLAUDE.md — verify + enforce)
- Single Source of Truth; store is runtime source, Supabase is persistence; update store immediately after DB write.
- No silent failures — empty `catch{}` must `console.error` (18 fixed this session — verify none regressed + find any remaining).
- No hardcoded fallbacks for user data (no fake IDs, no `weight||70`, no 1800/2200/2800 calories).
- Offline writes queue + sync (hydrationStore pattern; `_writeExerciseSets` offline-queue).
- Schema+code match — insert/select columns match live migration.
- RLS — every table has `auth.uid()=user_id`.
- `EXPO_PUBLIC_*` env via direct static access (no `?.`, no dynamic key) — release-crash lesson.
### How to verify (agent tasks)
- **Code-only agents** trace each data path with Read/Grep (NOT code-review-graph MCP — disabled). Confirm the round-trip + offline-queue + no-silent-loss.
- **Device agent** performs a real write (log a set, save a meal, log water, edit profile) and confirms: (a) store updates immediately, (b) Supabase row appears (query via MCP `mcp__supabase__execute_sql`), (c) UI reflects it, (d) kill network + write + confirm local persistence + restore network + confirm sync.

## AGENT DISPATCH PLAN (orchestrator executes this, wave by wave)
**Wave A** — device: onboarding (fresh user) + auth + Home. code: profile/onboarding data integrity, workout-plan data integrity, diet-plan data integrity, achievements/subscription data integrity.
**Wave B** — device: workout session (all nested modals — the user's priority). code: progressive-overload deep audit, calories SSOT deep audit, offline-queue audit, schema/RLS audit.
**Wave C** — device: diet flow (all modals). code: diet-save integrity, water-log offline, meal/macro compliance.
**Wave D** — device: analytics + achievements + progress. code: analytics data sources, measurement sync.
**Wave E** — device: profile + settings + paywall. code: settings persistence, subscription state.
**Wave F (final)** — device: regression sweep across all fixed screens + release-APK sign-off build.

Adjust waves based on findings; loop a wave until its flow is clean before moving on.

## OUTPUTS
- Per-flow reports: `src/docs/visual-qa-<flow>.md` (screenshots, dump counts, issues + bounds evidence, fix file:line+change, verification).
- Data-integrity reports: `src/docs/integrity-<domain>.md`.
- Master catalog: `src/docs/UIUX-FINDINGS-CATALOG.md` (severity-ranked P0/P1/P2, fix status, dedup across waves).
- Nothing committed until the user says so.

## GATES (sacred — never regress)
`npx tsc --noEmit` (exit 0) · `npx jest` (≥471 passed / 87 suites) · `npx expo export --platform android`. Run after every batch of fixes.

## OUT OF SCOPE (explicitly, this round)
- drag-to-dismiss adb-swipe verification (gesture-handler can't read adb discrete MotionEvents — needs human/Maestro `swipeElement`; not a code bug).
- Release-APK production sign-off rebuild (do ONCE at the very end, Wave F).
- code-review-graph MCP (disabled — use Read/Grep/Glob).

## CONSTRAINTS
No new deps. No `Alert.alert` (use `crossPlatformAlert`). No `console.log` in prod. Aurora tokens only (no hardcoded values). Do NOT Read binary images. Do NOT commit. Orchestrator does NOTHING inline — all work via agents.
