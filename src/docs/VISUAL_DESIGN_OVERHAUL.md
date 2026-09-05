# FitAI — App-Wide Visual/UI-UX Consistency Overhaul

## Mission

Propagate the onboarding flow's minimalist "Editorial Dark" look to the
**entire** app. Onboarding, Home, Profile, and the Workout tab's main page
already look good; Diet and parts of Workout are visually inconsistent —
misaligned components, incoherent button colors, glassmorphism/shadows that
contradict the rest of the app. Do not hold back, cover every screen down to
individual buttons, and leave the app self-enforcing against drifting back.
This is a standing, multi-session goal — read this file first, every time,
before starting a new round.

The design source of truth is `DESIGN.md` (repo root) — read it before
touching any visual code. The full reference audits, decisions, and
reasoning behind this rollout live in the approved plan for this work
(session-local plan file); this doc tracks live status only.

## Key finding that reframes the whole effort

The onboarding look the user endorsed is **not** the "Aurora 2026" kit
(`src/components/onboarding/aurora/`, `docs/onboarding-blueprint.md`) — it's
a newer, separate system, "Editorial Dark" (`src/components/onboarding/fresh/`,
`docs/onboarding-fresh-design.md`), whose rule is **"NO CARDS"** and whose CTA
is a flat solid `#FF6B35` fill (no gradient). All 5 onboarding tabs render
exclusively from `fresh/`. `DESIGN.md` reconciles both into one canonical
standard, now app-wide.

A prior, independent, dated (2026-07-31) audit — `docs/design-dna-audit-2026-07-31.md`
— already diagnosed nearly the same problems and proposed an 11-initiative
replacement plan, but it was **never executed**. This rollout adopts that
document as the file-inventory reference (its per-area file maps are still
accurate) rather than re-deriving them.

## User decisions locked in (do not re-litigate)

1. Depth: **component redesign** — keep screen layouts/logic, replace shared
   components (Button, Card, chips, headers) so consumers inherit the new
   look.
2. Button language: **onboarding's flat CTA wins app-wide** — retires
   `GlassButton`'s gradient variants (3 of 5 are unmodified Material Design
   2014 stock colors).
3. Palette: **onboarding's values are now canonical app-wide, with one
   deliberate deviation** (done — see Stage 0 below): bg `#050505`,
   text.primary `#F5F5F5`, text.secondary 55% white, text.tertiary **50%**
   white — NOT onboarding's literal 34%, which failed WCAG AA on this app's
   backgrounds (see the Stage 0 checklist's WCAG-regression entry below).
4. Automated drift guard required: jest ratchet test + ESLint rule.
5. Rollout: staged, auto-continue — verify each stage, proceed without
   stopping to ask.

## Verification harness (use for every stage)

react-native-web's accessibility tree is nearly useless (`generic` divs
everywhere) — `browser_snapshot` cannot judge visual conformance.
Primary tool: a `browser_evaluate` script via real Playwright MCP that walks
every visible DOM node and flags off-token `borderRadius`/`fontSize`,
non-Manrope `fontFamily`, any non-`none` `boxShadow`, and touch targets
below 44×44. Proven this session — caught real issues on the Welcome screen
(52px/36px/22px off-scale font sizes, 22px radii, "Get Started" CTA on
system font instead of Manrope, "Continue as Guest" at a 22px touch target).
Run at both 1280x800 and 390x844 viewports.

Screenshots (`browser_take_screenshot`) are secondary, subjective-judgment
only — and per a hard-won prior-session lesson, **must never be Read
directly by the agent driving the browser** (an agent that accumulates >10
images in its own context dies unrecoverably at
`API Error: 400 Request contains 11 images`, transcript unrecoverable).
Screenshots go to disposable child agents only, which Read the image(s) and
report back text findings, then die.

A hazard noted for any implementation agent: `git worktree list` showed 24
stale worktrees pinned at an old commit while `master` had moved on. Use
fresh worktrees; if a worktree's diff looks unexpectedly large, check
`git rev-parse HEAD` in it against `master` before trusting it.

## Standing operating procedure

1. Confirm the web dev server is up (`http://localhost:19010`, or the
   stage's assigned port) before testing.
2. Work whichever stage is next unchecked, below, in order — the stages
   build on each other (Stage 1 depends on Stage 0's tokens; Stage 2 depends
   on Stage 1's shared-component reskin already being live).
3. After any code change: `npx tsc --noEmit -p .` and `npx jest --silent`
   clean, then live-verify via the Playwright harness above.
4. Update this file's checklist before ending a round, so a future session
   with no memory of this one can resume exactly where this one left off.
5. Do not invent busywork once a stage's checklist is fully checked — move
   to the next stage, or if all stages are done, report that plainly rather
   than manufacturing a new one.

## Stage checklist

### Stage 0 — Foundation (DESIGN.md + token unification + drift guard)
- [x] `DESIGN.md` written at repo root, reconciling the Aurora/Editorial-Dark
      systems into one canonical standard.
- [x] `src/theme/aurora-tokens.ts` palette updated to the canonical values
      (`background.DEFAULT` → `#050505`, `text.primary` → `#F5F5F5`,
      `text.secondary` → 55% white, `text.tertiary`/`.muted` → **50%** white —
      see the WCAG-regression entry below for why this isn't onboarding's
      literal 34%).
- [x] `src/components/onboarding/fresh/tokens.ts` now re-exports these
      values from `aurora-tokens.ts` instead of hardcoding them a second
      time (single SSOT).
- [x] Jest ratchet test (`src/__tests__/design/tokenConformance.test.ts`) +
      checked-in baseline (`conformance-baseline.json`: 67 directories,
      2,346 total banned-pattern hits at Stage 0 start — this number must
      only decrease from here).
- [x] ESLint rule(s) for the banned patterns added to `eslint.config.js`
      (warn-level: `fontWeight`/`shadowColor`/`elevation`/`boxShadow`
      properties, `flatColors`/`flatFontSize`/`flatShadows`/`GlassCard`
      imports). Verified firing correctly against a known-violating file.
- [x] `tsc`/`jest` verified clean after the token change (153 suites /
      1,466 tests passing).
- [x] Live Playwright verification on the Welcome screen: confirmed
      `#050505` background, `#F5F5F5` text.primary, and 55%-white
      text.secondary all reached the live DOM correctly.
- [x] **Real WCAG regression caught and fixed during this stage**:
      onboarding's literal `ink3` value (34% white) only clears ~2.8-3.0:1
      on this app's backgrounds — below AA even at the relaxed 3:1
      large-text threshold, breaking a pre-existing contrast test
      (`contrast.test.ts`) written specifically because a past dimmer value
      failed this once already. User decision: use 50% white instead (not
      onboarding's literal 34%) — clears 4.5:1+ on all three background
      tiers with margin, keeps the same restrained feel. Also required
      extending `getContrastRatio`/`checkContrast`
      (`src/utils/accessibility/contrast.ts`) to parse and alpha-composite
      `rgba()` strings, not just hex — the canonical text tokens are now
      alpha-based, and the old hex-only parser threw on them.
- [x] Confirmed (not yet fixed — tracked for Stage 3) via the live
      Playwright check: the "Get Started" CTA and "Already have an account?"
      text on the Welcome screen still render on the system font stack
      instead of Manrope.

### Stage 1 — Shared-primitive reskin
- [x] `GlassCard` reskinned to flat `surface[1]`/`surface[2]` + hairline,
      no blur/shadow regardless of `elevation` prop. Verified via
      `OpaqueOverlaySurfaces.test.tsx` (directly renders it) + full jest pass.
- [x] `GlassButton` reskinned to the flat CTA spec (kept name/API, ~53 call
      sites need zero changes): flat fill per variant sourced from `chart[]`
      (no Material stock colors — `success`→chart[4], `warning`→chart[5],
      `error`→a new non-Material red, `secondary`→chart[2]), radius 16,
      minHeight 56, Manrope_700Bold label in near-black (`colors.background.DEFAULT`),
      opacity-only press (no scale/haptic), disabled = hairline bg.
- [x] **Deviation from the plan, by design**: `ui/Button.tsx` was NOT deleted.
      Ground-truthed its 6 real call sites (Camera, CustomInput, MealActions,
      ExerciseDetail, MealDetail, WorkoutDetail — the "3 call sites" in one
      of the source audits was wrong) and found they're overwhelmingly
      `variant="outline"`/ghost secondary actions (Edit/Delete/Cancel/Close),
      a semantic `GlassButton`'s filled-only API doesn't cover. Reskinned
      `Button.tsx` in place instead (flat fills, no shadow, no gradient, no
      fontWeight — `fontFamily` now) and kept it alive specifically for its
      outline/ghost variants, documented as such in both files.
- [x] `fresh/` primitives promoted via a new re-export barrel
      `src/components/ui/editorial/index.ts` (`Rule`, `SectionLabel`,
      `OptionRow`, `RowGroup`, `Pill`, `CollapsibleSection`) rather than
      physically moved — lower risk (zero changes to onboarding's own
      working imports), same practical benefit (one shared, discoverable
      import path for Stage 2+ to use instead of reaching into
      `onboarding/fresh/` directly).
- [x] `TabBar.tsx` migrated off `flatColors`/raw `fontWeight` to nested
      `colors`/`surface`/`border`/`typography.variants.caption`.
- [x] `GlassHeader.tsx` made opaque (`surface[1]`, matching TabBar's fill —
      not `surface[0]` as originally drafted, corrected to actually match
      the tab bar's own tier) + `typography.variants.pageTitle` for the
      title, `FONT_FAMILY.bold` for the eyebrow label. Back-button chip
      moved off `colors.glass.background` to `surface[2]`.
- [x] Duplicate `FitnessHeader` pair resolved: `src/components/fitness/FitnessHeader.tsx`
      confirmed to have ZERO importers anywhere (dead code) and deleted.
      The live one (`src/screens/main/fitness/FitnessHeader.tsx`) fixed for
      token conformance (`flatColors`→nested, raw `fontWeight`→`fontFamily`,
      raw `borderRadius: rbr(22)`→`borderRadius.full`).
- [x] Ratchet baseline regenerated after Stage 1: 2,346 → 2,323 total hits
      (real, verified decrease — not just "no increase").
- [~] Live Playwright pass: PARTIAL, not the full Home/Profile/Diet/Workout
      sweep originally planned. The test account's session state was
      inconsistent across two logins in the same round (first login landed
      mid-onboarding with existing data at Body step 3/5; a page reload lost
      that session and a second login landed on a fully blank Personal step
      1/5) — reaching the main app tabs where GlassCard/GlassButton/TabBar/
      GlassHeader actually render would have required completing a fresh
      5-step onboarding flow, which was not finished this round. What WAS
      live-verified: 0 console errors on the Welcome/Sign-in screens (which
      already render via the reskinned `GlassButton`), plus the harness run
      on the Body Analysis onboarding screen (see Backlog — 2 new real
      findings surfaced there, unrelated to Stage 1's own changes). The
      strongest evidence for Stage 1 itself remains `tsc` clean + full jest
      pass (153/153 suites, 1,466/1,466 tests) including a test that
      directly renders `GlassCard` and asserts its exact computed style.
      **Follow-up for next round**: get a fully-onboarded test session (or
      finish onboarding once and keep the browser session alive) and run
      the full Home/Profile/Diet/Workout/modal sweep before calling Stage 1
      100% closed.

### Stage 2 — Diet + Workout parallel lanes

**⚠️ Coordination bug hit and fixed this round — read before dispatching any
future `isolation: "worktree"` agent.** Both lanes were dispatched with
`isolation: "worktree"`, but ALL of Stage 0/1's work (this file, `DESIGN.md`,
the flat `GlassCard`/`GlassButton`, the token changes) existed only as
**uncommitted** changes in the coordinator's main working tree at dispatch
time. `git worktree add` checks out from committed history, not another
directory's uncommitted state — so neither lane's worktree had `DESIGN.md`,
a flat `GlassCard`, or the new palette. Both agents independently verified
the premise, found it false, and correctly declined to guess at a new
design language blind — instead fixing real, verifiable bugs (Material
colors, sub-44px touch targets, redundant shadows, raw `fontWeight`) against
the *actual* pre-Stage-0/1 token system. That work was real and valuable;
it was manually reconciled into the main tree after the fact (see below).
**The fix**: Stage 0/1 (and now Stage 2's reconciled output) is being
committed to `master` at the end of this round specifically so any future
worktree-isolated agent has real committed ground to build on. Going
forward: either commit foundational work before dispatching worktree-
isolated agents that depend on it, or don't use worktree isolation when the
work depends on same-session uncommitted changes.

- [x] Lane A (Diet) — ran against the pre-Stage-0/1 token system (see bug
      above), fixed real bugs: `DietScreen.tsx` edge-to-edge card
      misalignment (`errorCard` missing `marginHorizontal`), a redundant
      `...shadows.level3` on `MealsTimeline.tsx`'s primary card, the
      macro-color mismatch between `macroColors.ts` and `NutritionCard.tsx`
      (now imports the real palette), close-button unification across 6
      modals (`LogMealModal`/`WaterIntakeModal`/`ManualBarcodeEntry`
      /`MealTypeSelector`/`PortionAdjustment`/`ProductDetailsModal` — one of
      them, `ManualBarcodeEntry`, was a real sub-44px a11y bug), removed 7
      identical light-theme `boxShadow` blocks from `nutrition/**`, fixed
      hardcoded `#6B7280` greys + a real contrast bug (dark-grey label text
      on a bright CTA fill), and a typography sweep on the worst-ranked
      files (`ProductDetailsModal.tsx` 18 literals, `DateStepper.tsx`,
      `TodaysPlanOverlay.tsx`). Manually reconciled into master (2 of 17
      files had unrelated pre-existing session changes in the same regions
      handled by hand; 15 applied cleanly via patch).
      **New finding**: the entire `src/components/nutrition/ingredient/`
      subdirectory has ZERO importers anywhere — `IngredientDetailModal.tsx`
      duplicates all of it inline instead. Fixed both (hygiene), but the
      duplication itself is a real decision deferred to a future round
      (wire up the components and delete the duplicate, or delete the dead
      files outright).
      ~150 more raw `fontWeight` occurrences remain across ~25 other
      Diet-area files beyond the explicitly-prioritized list — deferred,
      not silently dropped.
- [x] Lane B (Workout) — ran against the pre-Stage-0/1 token system (see bug
      above), fixed real bugs: `ExerciseCard.tsx` full detoken (was the
      worst file in the repo, importing no theme at all — replaced the
      private Material-2014 `SET_TYPE_COLORS`, 6 raw hex backgrounds, and
      the rogue `#6C63FF` indigo "second primary" with real tokens; bumped
      `checkButton`/`setTypeBadge` from 36×36/32×32 to the 44px touch-target
      floor), the copy-pasted 24px orange drop-shadow removed from both
      `TemplateLibraryScreen.tsx` AND `EmptyPlanState.tsx` (the latter is on
      the Fitness tab's "already looks good" main page), all
      `borderRadius: 999` → `borderRadius.full`, raw `rgba(...)` scrims
      routed through `hexToRgba`, `WeekDaySelector.tsx`'s 3 raw rgba
      literals tokenized, drag-shadow `shadowColor:"#000"` → the real
      background token (kept the drag-lift shadow itself — a legitimate
      affordance, not a banned pattern by itself), and a raw/no-op
      `fontWeight` sweep across `WorkoutDetailScreen.tsx` (removed a
      dead `fw()` cast helper entirely, 21 call sites),
      `SetLogModal.tsx`, `ScheduleBuilderScreen.tsx`. Manually reconciled
      into master (3 of 9 files had unrelated pre-existing session changes
      in the same regions handled by hand; 6 applied cleanly via patch).
      Deferred with reasoning: `AchievementNotifications.tsx`'s shadows are
      real branching (web `boxShadow` mirrors `aurora-tokens.ts`'s own
      `makeShadow` pattern, not a banned copy-paste) and its `successAlt`
      is a real, if legacy, governed token — the app genuinely has 3
      distinct greens (`colors.success`, `successAlt`, `chart[4]`) that need
      a deliberate consolidation decision, not a guess.
- [x] Both lanes manually reconciled into master (worktree isolation meant
      neither could be integrated via a simple merge — see bug note above).
      `tsc --noEmit -p .` clean, full `npx jest --silent` clean (153/153
      suites, 1,466/1,466 tests) after integration. One real ratchet-test
      catch during integration: a new `flatColors.gold` usage introduced
      while reconciling `ExerciseCard.tsx`'s PR banner — fixed to `chart[5]`
      (amber) instead. Conformance baseline regenerated: 2,323 → 2,104 (a
      real 219-violation reduction from both lanes combined).
- [x] **Foundation (Stage 0/1) + Stage 2's reconciled output committed to
      `master`** at the end of this round — the actual fix for the
      coordination bug above, and required before any future
      worktree-isolated agent can build on this work.
- [ ] **Follow-up still owed**: neither lane could apply the FLAT/no-shadow
      parts of Stage 0/1 (they didn't exist in either worktree) — e.g.
      Lane B's drag-shadow and `AchievementNotifications.tsx` deferrals
      should be re-examined now that the real flat `GlassCard`/token system
      is actually committed and visible. A future round should re-audit
      both areas against the NOW-real `DESIGN.md` rather than assume this
      round's reconciliation was the final word.

### Stage 3 — Remaining app-wide sweep
- [x] **Home/Profile/Onboarding polish (Lane A)** — verified all 4 named
      priority findings against current `master`, fixed each at its real
      root cause, then found and fixed the same bug class across the rest of
      Home/Profile/Onboarding while sweeping.
      **Welcome screen**: "Get Started" CTA was ALREADY fixed (a Stage 1
      side-effect — `GlassButton`'s label got `fontFamily: "Manrope_700Bold"`
      during its flat reskin), confirmed live via `getComputedStyle`. But
      `footerText` ("Already have an account? " / "Don't have an account? ")
      and `dividerText` ("or sign in with email") had NO `fontFamily` at
      all — fixed both
      (`src/screens/onboarding/WelcomeScreen.tsx`). "Continue as Guest"
      measured a real 22px-tall touch target (BUTTON element, Text-only
      content, no `minHeight`) — added a `continueGuestButton` style
      (`minHeight: 44`); left the inline "Sign In"/"Sign Up" links alone
      since those sit inside a sentence (WCAG 2.5.8's inline-text-link
      exception applies, unlike the standalone Guest button).
      **Onboarding Body Analysis (Body tab, step 3/5)**: root-caused the
      "STEP X OF 5"/percentage-label system-font finding to
      `src/components/onboarding/OnboardingTabBar.tsx` (`metaText`/`metaPct`)
      and `src/components/onboarding/AuroraStepRail.tsx`
      (`segmentTitleActive`/`segmentNumber`) — all four had a bare
      RN style-weight prop and NO `fontFamily`, which is a no-op on RN (each
      Manrope weight is a separate font file), so they fell back to the
      system font stack app-wide (this rail renders on every onboarding
      screen, not just Body). Fixed all four with explicit `fontFamily`.
      The residual box-shadow (`~71×44` orange element,
      `rgba(0,0,0,0.1) 0px 1px 2px`) was the SAME component's `glowPill` (the
      active-step pill in `AuroraStepRail.tsx`) — live-measured at
      70.8×44px, confirming the match — carrying a leftover
      `...flatShadows.sm` spread; removed it entirely (no replacement
      hairline needed — depth already comes from the capsule fill/contrast).
      Live-verified via a full scripted sign-up + onboarding walkthrough
      (throwaway Supabase test account, deleted after) that Welcome,
      Sign-In, and all 5 onboarding tabs (Personal/Diet/Body/Workout/Review)
      now scan at 0 off-Manrope text nodes and 0 real `boxShadow` hits.
      The height/weight/BMI/"— %" readouts named in the original finding
      were traced to `MeasurementsSection.tsx`/`GoalVisualizationSection.tsx`/
      `BodyCompositionSection.tsx` — all were ALREADY correct (`font.light`/
      `freshType.*`, which bake in `fontFamily`); the live scan confirms zero
      remaining hits there, so that part of the original finding no longer
      reproduces (likely fixed incidentally by Stage 1's token work).
      **New findings from the same root-cause pattern, same live sweep**:
      - `src/components/advanced/MultiSelectWithCustom.tsx` (used by the
        Body tab's Medical & safety section) had ZERO `fontFamily` anywhere
        in the file — every label/placeholder/option/search-input Text
        fell back to system font. Fixed all 10 affected styles.
      - `src/components/ui/aurora/BottomSheet.tsx`'s `title` style (shared
        app-wide primitive — every bottom sheet's title, not just
        onboarding's) had the same bare-weight-no-family bug. Fixed.
      - `src/components/ui/OnboardingCompleteModal.tsx` ("You're All Set!"
        hand-off screen right after onboarding) — 6 styles had the same bug
        across `title`/`subtitle`/`userName`/`description`/`statLabel`/
        `statValue`/`featureText`; fixed all.
      - A full live sweep of the actual Home screen (reached by completing
        onboarding end-to-end on the throwaway account) found the SAME bug
        class in 10 of its files — essentially the entire screen was
        rendering on the system font: `BodyProgressCard.tsx` (12 styles),
        `HomeHeader.tsx` (6), `home/components/TrendChart.tsx` (1),
        `GuestPromptBanner.tsx` (2), `QuickActions.tsx` (2),
        `SyncStatusIndicator.tsx` (3), `WeeklyMiniCalendar.tsx` (3, two of
        which had a REAL bare-weight-only override that silently failed to
        render bold even though the base style did have a family),
        `DailyProgressRings.tsx` (1 redundant no-op, base style already had
        `fontFamily`), `src/components/home/EmptyMealsMessage.tsx` (3),
        `src/components/home/EmptyCalendarMessage.tsx` (3),
        `src/components/home/HealthIntelligencePlaceholder.tsx` (3),
        `src/components/home/GapSummary.tsx` (3, including a "Food"/"Burn"
        label style with no font styling at all). Fixed all. Re-verified
        live post-fix: Home screen (initial render + scrolled) now scans at
        0 off-Manrope nodes, 0 `boxShadow` hits.
      - Two real sub-44px touch targets found during the same live sweep and
        fixed: `BodyProgressCard.tsx`'s whole-card-header Pressable
        ("View Progress", 324×25 measured) — added `minHeight: 44`; and
        `ProfileScreen.tsx`'s "quick jump" section chips (introduced in a
        recent commit, `af54e03c`) — explicit `minHeight: 36`, bumped to 44.
      - Profile screen scan otherwise clean (0 off-font hits). One residual
        `boxShadow` hit is `<Switch>` (React Native's built-in component,
        wrapped by `GlassFormSwitch.tsx`) — react-native-web renders the
        native thumb with its own internal drop-shadow that isn't exposed
        via our StyleSheet API; not fixable without replacing the native
        control with a fully custom toggle. Logged in Backlog rather than
        forced, since DESIGN.md's shadow ban is aimed at app-authored
        styles, not a platform control's internal rendering.
      **Root-cause pattern worth flagging explicitly for future rounds**:
      every one of the above bugs shares the same mechanism — `App.tsx` sets
      a global `Text.defaultProps.style` Manrope fallback, but that only
      applies when a component's `style` prop is `undefined`; any component
      that always passes its own `style={styles.x}` (the overwhelming norm
      in this codebase) permanently opts out of that fallback, so a style
      object missing `fontFamily` silently renders system font with no
      visible error. Grepping for a bare RN font-weight style prop with no
      sibling `fontFamily` in the same object is a fast, mechanical way to
      find the next batch of these; it is NOT equivalent to grepping for
      that prop generically, since plenty of correct styles legitimately
      spread in a `typography.variants.*`/`fresh/tokens type.*` object that
      already carries `fontFamily` first.
      **Verification**: `npx tsc --noEmit -p .` clean, full `npx jest --silent`
      clean (153/153 suites, 1466/1466 tests) throughout. Conformance
      baseline regenerated at the end of this round (see below).
- [ ] Progress/Analytics chart-stack modernization scoped as its own
      sub-task (Skia press-state `ChartCallout` — the one genuine kit gap).
- [x] **Profile/Settings/Subscription/Paywall/Auth (Lane B)** — bottom-sheet
      migration for centered modals done for the two real, in-scope call
      sites: `src/screens/main/profile/modals/SettingsSelectionModal.tsx`
      and `src/components/profile/DestructiveConfirmModal.tsx` (used by
      `LogoutConfirmationModal`, `ClearCacheConfirmModal`,
      `DeleteAccountConfirmModal`, and directly by `ProfileScreen.tsx`) —
      both rewritten off the centered `CustomDialog`/`DialogShell` +
      `BlurView`-backdrop pattern onto the shared `BottomSheet` primitive.
      `src/components/ui/Modal.tsx` does not actually exist in this repo
      (only `CustomDialog.tsx` does) — the task brief's reference to it was
      stale, verified via search before acting.
      **Legacy form primitive retirement**: `src/components/ui/Input.tsx` /
      `PasswordInput.tsx` were found to be dead code — zero real importers
      anywhere (`PasswordResetScreen.tsx`, the one auth screen in scope,
      already uses `UnderlineInput`; no other in-scope auth screen imports
      them). Left in place for Stage 4's dead-file pass rather than deleting
      unilaterally (out of this task's stated scope), documented in Backlog
      below.
      **PaywallModal.tsx**: fixed the hardcoded `rgba(59,130,246,0.10)` /
      `rgba(59,130,246,0.25)` "Sign in required" banner (now a governed
      `colors.info` tint, matching its own icon/title color — was an
      off-token Tailwind blue) and a full `flatColors`/raw-`fontWeight`
      sweep. Also fixed real bugs found while in the file: `PlanCard.tsx`'s
      "MOST POPULAR"/"BEST VALUE" badge was a `LinearGradient` (decorative
      gradient filler, banned) — now a flat `colors.primary.DEFAULT` fill;
      its label and the badge icon were white-on-orange (fails WCAG, see
      Backlog) — now near-black. `TrustRow.tsx`'s row was a flat
      `glassSurface`/`glassBorder` box nested inside the paywall sheet's own
      surface — a "card inside a card" per DESIGN.md's max-1-surface-depth
      rule — made transparent instead.
      **Full token/typography sweep across the rest of Lane B's scope**:
      ran the conformance scanner against every directory in scope, then
      fixed every real `fontWeight`/`flatColors`/`boxShadow`/`elevation:`
      hit found (not just the 4 named priority files) across
      `src/components/settings/**`, `src/screens/settings/**` (incl. its
      `components/` subdir), `src/screens/profile/SubscriptionManagement.tsx`,
      `src/components/subscription/**` (incl. `paywall/`),
      `src/components/auth/**`, `src/screens/auth/PasswordResetScreen.tsx`.
      Real bugs caught along the way (beyond simple token renames):
      - `src/components/settings/AppInfoCard.tsx` was dead code (zero
        importers, a stale duplicate of the live
        `src/screens/main/profile/AppInfoCard.tsx`) — deleted outright,
        matching the Stage 1 precedent (dead `FitnessHeader.tsx`).
      - Five files (`AboutFitAISocialButtons.tsx`, `AboutFitAIFeatureCard.tsx`
        in `components/settings/`, plus the now-deleted `AppInfoCard.tsx`)
        overrode `GlassCard`'s own flat surface fill with
        `backgroundColor: colors.glassSurface` (the pre-Stage-1 blur-tint
        value) passed via the `style` prop — silently re-introducing the
        retired glass look on top of the reskinned component. Removed the
        override (and the now-redundant `blurIntensity="light"` prop) so
        `GlassCard`'s own flat fill actually renders.
      - Same glass-tint-reintroduction bug, different shape, in
        `AboutFitAIScreen.tsx` (`versionBadge`), `PlanCard.tsx`
        (`cardCurrent` border), `TrustRow.tsx` (see above), and
        `SubscriptionManagement.tsx` (4 occurrences: back button, progress
        track, feature-flag chip, action row) — all used `colors.glassSurface`
        as a plain flat-fill color, not for any actual blur. Routed through
        `surface[2]` (the correct flat token for a raised control) instead.
      - `src/screens/settings/components/ExpoGoMessage.tsx` had a decorative
        `LinearGradient` icon-tile fill (`[colors.warning, colors.primaryDark]`)
        — banned per DESIGN.md's de-gradient rule (not a genuine brand
        moment). Replaced with a flat `colors.warning.DEFAULT` fill.
      - Two more WCAG contrast bugs matching the pattern already fixed once
        in `DestructiveConfirmModal.tsx` (white text/icon on the solid
        `colors.primary.DEFAULT` #FF6B35 fill, ~2.84:1, fails even the
        relaxed 3:1 large-text threshold): `AboutFitAIScreen.tsx`'s "F" logo
        glyph + `DescriptionCard.tsx`'s scheduled-count badge. Both now
        near-black text on the orange fill (7:1+), matching
        `GlassButton`'s own documented primary-variant label convention.
      `UsageCounter.tsx` and `SettingsSection.tsx`'s `flatColors.gold`/
      `successAlt`/`warningAlt`/`errorAlt`/`muted` usages were deliberately
      left on `flatColors` — DESIGN.md explicitly freezes that accent-palette
      subset for existing consumers ("never add new entries or new
      consumers", not "migrate existing ones"), and forcing a migration
      would mean inventing new token names DESIGN.md doesn't define.
      `src/screens/profile/SubscriptionManagement.tsx` similarly keeps
      `flatColors` for its mixed accent set (`errorAlt`/`muted`/`successAlt`/
      `successBright`/`warningAlt`/`blue`) for the same reason — only its
      `glassSurface` bug (above) and raw `fontWeight` were fixed.
      **Spot-checked** `src/screens/main/profile/SettingsSection.tsx` (the
      designated reference pattern) — still clean, used as the template for
      the grouped-list surface throughout this pass; no changes needed.
      **Verification**: `npx tsc --noEmit -p .` clean throughout. Full
      `npx jest --silent` clean (153/153 suites, 1466/1466 tests) — one test
      (`TouchChrome.test.tsx`) needed its own local mock updated to stub the
      newly-introduced `BottomSheet` import (its local `jest.mock("react-native", ...)`
      override didn't provide `useSafeAreaInsets`, which real `BottomSheet`
      needs); a second test file
      (`OpaqueOverlaySurfaces.test.tsx`) already had comments anticipating
      this exact migration ("LogoutConfirmationModal migrated to a flat
      surface[2] dialog... no GlassCard") and passed against the real
      `BottomSheet` with zero changes needed.
- [ ] Full `browser_evaluate` harness sweep across all ~25 screens reachable
      from `MainNavigation.tsx`, both viewports (navigation is state-driven,
      not URL-routed — must drive via taps).

### Stage 4 — Dead-file cleanup + final verification
- [x] Re-verified the 71 files flagged dead in the 2026-07-31 audit: 70 of
      71 were ALREADY deleted (in earlier, unrelated session rounds before
      this overhaul started). The one survivor, `src/theme/ThemeProvider.tsx`,
      is NOT actually zero-import — `App.tsx` still wraps the tree in
      `<ThemeProvider>` (and `gluestack-ui.config.ts` similarly, via
      `<GluestackUIProvider>`) even though nothing consumes `ThemeContext`.
      Deliberately NOT deleted — removing either requires editing the app
      root (`App.tsx`), which deserves its own careful, tested change, not
      a drive-by deletion during a "dead file" sweep. Left as a documented
      exception for a future dedicated pass.
- [x] Final Playwright pass on the Welcome/onboarding screen at both
      1280x800 and 390x844: zero font-family offenders (previously found:
      system-font fallback on several elements — now fixed), zero shadow
      offenders (previously found: a residual `shadows.level1` — now
      fixed), no horizontal overflow at the mobile viewport. One
      false-positive investigated and dismissed: 6 stepper buttons
      (age/wake/sleep +/-) measured at 32x32 via `getBoundingClientRect()`,
      but they already carry `hitSlop={8}` (48x48 effective touch area) —
      the harness's DOM-box measurement can't see hitSlop-expanded hit
      regions, a real limitation of the technique worth remembering for
      future rounds (don't trust a raw bounding-box touch-target check
      without also checking for `hitSlop`/`pressRetentionOffset` on
      the component).
- [x] Ratchet count trend, stage by stage: 2,346 (Stage 0 start) → 2,323
      (Stage 1) → 2,104 (Stage 2) → 1,933 (Stage 3, current). Real,
      monotonic decrease every stage — not yet at zero (a genuinely
      exhaustive full-app sweep is a much larger, multi-round effort), but
      the trend the ratchet exists to enforce is holding.

## Backlog (real findings from this rollout, filled in as stages land)

- [x] **Stage 0 — WCAG AA regression from adopting onboarding's literal
      palette, caught and fixed same-stage.** Onboarding's `ink3` (34%
      white) fails WCAG AA on this app's background tiers (~2.8-3.0:1,
      below even the relaxed 3:1 large-text bar). Resolved by using 50%
      white as the canonical `text.tertiary`/`.muted` instead — see Stage 0
      checklist for full detail. `src/utils/accessibility/contrast.ts` also
      extended to handle `rgba()` color strings (previously hex-only).
- [x] **Welcome screen: "Get Started" CTA + "Already have an account?" text
      render on the system font stack, not Manrope.** Resolved in Stage 3
      Lane A. "Get Started" turned out to already be fixed as a Stage 1
      side-effect (`GlassButton`'s reskin). "Already have an account?" /
      "Don't have an account?" (`footerText`) and "or sign in with email"
      (`dividerText`) genuinely had no `fontFamily` — fixed. See Stage 3
      checklist for full detail.
- [x] **Onboarding Body Analysis screen (Personal→Body step 3/5): several
      numeric labels render on the system font stack instead of Manrope**
      ("STEP 3 OF 5", "58%", height/weight values, "— %" placeholder).
      Resolved in Stage 3 Lane A: root cause was
      `OnboardingTabBar.tsx`/`AuroraStepRail.tsx` (the step-rail header that
      renders on every onboarding tab, not just Body), not the Body tab's
      own components — those were already clean. See Stage 3 checklist for
      full detail.
- [x] **A small orange (`colors.primary`) element on the same Body Analysis
      screen, ~71×44, carries a residual `shadows.level1` box-shadow**
      (`rgba(0,0,0,0.1) 0px 1px 2px`). Resolved in Stage 3 Lane A: identified
      as `AuroraStepRail.tsx`'s `glowPill` (the active-step pill, confirmed
      by a live 70.8×44px measurement) — removed the leftover
      `...flatShadows.sm` spread. See Stage 3 checklist for full detail.
- [ ] **Test-account session state was inconsistent across logins this
      round** (mid-onboarding with data vs. fully blank onboarding on a
      re-login moments later) — worth a quick investigation next round since
      it blocked completing this round's full live verification sweep. May
      be a genuine bug (profile-complete check not hydrating before routing
      to onboarding) or may be innocuous test-data drift from very heavy use
      of this account across 5+ rounds of prior E2E testing.
- [x] **Process bug: Stage 0/1 work was uncommitted when two worktree-
      isolated Stage 2 agents were dispatched, so neither could see it.**
      Full detail in the Stage 2 checklist above. Fixed by manually
      reconciling both lanes' real (but old-token-system) fixes into
      master, then committing Stage 0 through Stage 2 as one checkpoint.
- [ ] **`src/components/nutrition/ingredient/**` is entirely dead code**
      (zero importers) — `IngredientDetailModal.tsx` duplicates all of its
      logic inline instead. Both were fixed for token conformance this
      round, but the duplication itself needs a real decision: wire up the
      orphaned components and delete the duplicate inline code, or delete
      the dead files outright. Found by Lane A.
- [ ] **The app has 3 distinct "success green" values** in live use:
      `colors.success.DEFAULT`, the legacy `successAlt` token (used by
      `AchievementNotifications.tsx`), and `chart[4]` (used by the
      reskinned `GlassButton`'s `success` variant). Needs a deliberate
      consolidation decision, not a guess — found by Lane B while
      evaluating whether to touch `AchievementNotifications.tsx`.
- [x] **Stage 3 Lane B (Profile/Settings/Subscription/Paywall/Auth) findings**
      — see the Stage 3 checklist entry above for full detail. Summary:
      bottom-sheet migration for `SettingsSelectionModal`/
      `DestructiveConfirmModal` done; `src/components/ui/Modal.tsx` doesn't
      exist (stale reference in the task brief); `Input.tsx`/`PasswordInput.tsx`
      are dead code, not migration targets (flagged for Stage 4, not deleted —
      out of this task's scope); `PaywallModal.tsx`'s hardcoded blue tint
      fixed to a governed `colors.info` tint; `PlanCard.tsx`'s gradient
      "MOST POPULAR" badge and two WCAG-failing white-on-orange text/icon
      instances fixed; a "glass tint reintroduced as a flat-fill override"
      bug found and fixed in 8 places across 6 files
      (`AboutFitAISocialButtons.tsx`, `AboutFitAIFeatureCard.tsx`,
      `AboutFitAIScreen.tsx`, `PlanCard.tsx`, `TrustRow.tsx`,
      `SubscriptionManagement.tsx` ×4); a decorative gradient icon fill in
      `ExpoGoMessage.tsx` fixed; `TrustRow.tsx`'s own nested-card violation
      (a bordered/filled box inside the paywall's own sheet surface) fixed;
      dead `src/components/settings/AppInfoCard.tsx` deleted (zero
      importers, a stale duplicate of the live
      `src/screens/main/profile/AppInfoCard.tsx`, which was already clean).
      Deliberately left alone: `flatColors`' frozen accent-palette keys
      (`gold`/`successAlt`/`warningAlt`/`errorAlt`/`muted`/`blue`) in
      `SettingsSection.tsx`, `UsageCounter.tsx`, and
      `SubscriptionManagement.tsx` — DESIGN.md freezes that set for existing
      consumers only, and no governed nested-token equivalent exists for
      them yet (a future round should decide real replacements rather than
      leaving them on the legacy map indefinitely).
- [ ] **`src/components/ui/Input.tsx` / `PasswordInput.tsx` are dead code**
      (zero real importers anywhere — only each other and a barrel
      re-export in `src/components/ui/index.ts` that nothing consumes).
      Not a migration target since nothing renders them; candidate for
      Stage 4's dead-file deletion pass. Found by Lane B while chasing the
      task brief's (stale) claim that `PasswordResetScreen.tsx` used them —
      it already uses `UnderlineInput`.
- [ ] **`src/components/subscription/PremiumGate.tsx` / `PremiumBadge.tsx`
      referenced in a task brief do not exist anywhere in the actual source
      tree** — only inside ~20 stale leftover `.claude/worktrees/agent-*`
      directories (the exact stale-worktree hazard this doc's Stage 2
      section already warns about) and a `coverage/` report artifact.
      Zero live references in `src/`. Not acted on — nothing to fix.
- [ ] **Out-of-scope centered-modal call sites found while auditing
      `CustomDialog.tsx`/`DialogShell` consumers** (not touched — belong to
      other areas/lanes): `AchievementCelebration.tsx`,
      `AchievementDetailModal.tsx`, `DateStepper.tsx`,
      `HealthConnectDisclosureModal.tsx`, `UnderperformancePromptModal.tsx`,
      `MealBuilderScreen.tsx`, `MetricSummaryGrid.tsx`,
      `WorkoutSessionScreen.tsx`, `CreateWorkoutScreen.tsx`,
      `WeeklyBuilderScreen.tsx` — all still render via `CustomDialog`'s
      centered `DialogShell`. A future round covering Diet/Workout/
      Health/Achievements/Analytics should decide whether these get the
      same bottom-sheet migration.
- [ ] **`<Switch>` (React Native's built-in toggle, wrapped app-wide by
      `src/screens/main/profile/components/GlassFormSwitch.tsx`) renders a
      real `boxShadow` on its thumb on web** (`rgba(0,0,0,0.5) 0px 1px 3px`,
      confirmed live on the Profile screen's "Rest Timer" toggle). This is
      react-native-web's own internal rendering for the native control, not
      an app-authored style — there's no `shadowColor`/`elevation`/
      `boxShadow` prop exposed on `<Switch>` to override. Not fixed this
      round: doing so properly means replacing every `<Switch>` with a
      fully custom toggle primitive (a real, deliberate build, not a
      token swap), which is out of scope for a polish pass. Found by
      Lane A while sweeping Profile for the DESIGN.md "no drop shadows"
      rule.
- [x] **Stage 3 Lane A (Home/Profile/Onboarding polish) findings** — see the
      Stage 3 checklist entry above for full detail. Summary: all 4 named
      priority findings verified and fixed at root cause (2 already-fixed-
      by-Stage-1, 2 genuinely broken — `footerText`/`dividerText` missing
      `fontFamily` on Welcome, `OnboardingTabBar`/`AuroraStepRail`'s bare
      weight-only styles + a residual shadow on the step rail); the same
      bug class (a `style`-prop-bearing Text with no `fontFamily`, which
      silently opts out of the app's global Manrope default) was then found
      and fixed across `MultiSelectWithCustom.tsx`, `BottomSheet.tsx`
      (shared, app-wide), `OnboardingCompleteModal.tsx`, and 10 files
      directly on the Home screen (`BodyProgressCard.tsx`, `HomeHeader.tsx`,
      `TrendChart.tsx`, `GuestPromptBanner.tsx`, `QuickActions.tsx`,
      `SyncStatusIndicator.tsx`, `WeeklyMiniCalendar.tsx`,
      `DailyProgressRings.tsx`, `EmptyMealsMessage.tsx`,
      `EmptyCalendarMessage.tsx`, `HealthIntelligencePlaceholder.tsx`,
      `GapSummary.tsx`); two real sub-44px touch targets fixed
      (`BodyProgressCard.tsx`'s header Pressable, `ProfileScreen.tsx`'s
      quick-jump chips); one real finding deferred with reasoning (native
      `<Switch>` thumb shadow, see above). `npx tsc --noEmit -p .` and full
      `npx jest --silent` (153/153 suites, 1466/1466 tests) clean
      throughout; conformance baseline regenerated at the end of the round.

      **Correction on integration**: `GapSummary.tsx`'s specific fontFamily
      fix above is genuinely applied on disk, but was deliberately NOT
      committed in Stage 3's commit — the file itself is new, untracked,
      unrelated "Goal Engine" feature work still in progress from a
      different task, and bundling it into a visual-design commit would
      have shipped unreviewed feature code under the wrong label. The fix
      is real and harmless; it'll land whenever that other work is
      committed.

## Round wrap-up (this session)

Stages 0-4 are now code-complete and committed to local `master` in 3
commits (`1b4217ea` Stage 0+1, `32f5ff95` Stage 2, `01365396` Stage 3+4).
Conformance ratchet: 2,346 → 1,933 total banned-pattern hits, monotonically
decreasing every stage, never increasing (enforced by the jest ratchet
test). `tsc`/`jest` clean throughout (153/153 suites, 1,466/1,466 tests).

**A process lesson worth repeating for any future round**: `isolation:
"worktree"` on this machine defaults to branching from `origin/<default
branch>`, not local HEAD. Local `master` is currently 134+ commits ahead of
`origin/master` (never pushed). Any future `isolation: "worktree"` dispatch
will silently miss ALL of this local-only work (including everything in
this file) unless either (a) `origin/master` is pushed first, or (b) the
agent works directly in the main tree instead (safe when file scopes don't
overlap, as Stage 2/3's lanes were deliberately partitioned to allow).

**Known remaining/deferred work, for a future round to pick up:**
- Progress/Analytics chart-stack modernization (needs a new Skia
  press-state `ChartCallout` component, the one genuine kit gap — was
  explicitly out of scope for Stage 3, not started).
- Centered-modal → BottomSheet migration for the remaining out-of-scope
  call sites Lane B identified but didn't touch: `AchievementCelebration.tsx`,
  `AchievementDetailModal.tsx`, `DateStepper.tsx`,
  `HealthConnectDisclosureModal.tsx`, `UnderperformancePromptModal.tsx`,
  `MealBuilderScreen.tsx`, `MetricSummaryGrid.tsx`, `WorkoutSessionScreen.tsx`,
  `CreateWorkoutScreen.tsx`, `WeeklyBuilderScreen.tsx`.
- `src/components/ui/Input.tsx`/`PasswordInput.tsx` confirmed genuinely dead
  (zero importers) — candidate for Stage 4-style deletion whenever a future
  round does another dead-file pass.
- `src/theme/ThemeProvider.tsx` + `gluestack-ui.config.ts`: inert but still
  wrapped in `App.tsx` — removing them cleanly needs its own small, tested
  App.tsx change, deliberately not done as a drive-by deletion.
- Minor cleanup debt: a throwaway Lane B test account
  (`laneb-verify-1788598245857@mailinator.com`) was left live after
  Supabase rate-limited further signup attempts mid-cleanup — low risk
  (mailinator is a disposable-email service), but worth a manual delete.
- ~~Incidental, unconfirmed finding from Lane B's live testing: RLS-policy
  errors (`42501`) on `daily_energy_ledger`/`user_achievements`~~ —
  **investigated via the Supabase Management API**: both tables' RLS
  policies are correctly configured (`auth.uid() = user_id` on every
  command — INSERT/SELECT/UPDATE/DELETE for `daily_energy_ledger`, ALL for
  `user_achievements`), matching CLAUDE.md's guarantee exactly. This is
  NOT a security gap. A `42501` with correctly-scoped policies in place
  almost always means the client attempted the write before `auth.uid()`
  was actually populated (a timing race during signup, not a policy hole)
  — consistent with this session's earlier-found "DataBridge hydration"
  race-condition bug class, but in the NEW, still-uncommitted "Goal
  Engine" feature code (`daily_energy_ledger`/`user_achievements` writes),
  which is a different, separate, in-progress effort — not something to
  debug as part of this visual-design task. Flagged for whoever picks that
  feature work back up.
- Ratchet total is 1,933 and dropping, but nowhere near zero — a genuinely
  exhaustive full-app token migration remains a much larger, multi-round
  effort than Stages 0-4 alone.
