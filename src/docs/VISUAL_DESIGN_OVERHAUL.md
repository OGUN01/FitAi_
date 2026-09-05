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
3. Palette: **onboarding's values are now canonical app-wide** (done — see
   Stage 0 below): bg `#050505`, text.primary `#F5F5F5`, text.secondary 55%
   white, text.tertiary 34% white.
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
      `text.secondary` → 55% white, `text.tertiary`/`.muted` → 34% white).
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
- [ ] Home/Profile/Onboarding polish (Get Started CTA font, Continue as
      Guest touch target, any other harness-flagged issue).
- [ ] Progress/Analytics chart-stack modernization scoped as its own
      sub-task (Skia press-state `ChartCallout` — the one genuine kit gap).
- [ ] Profile/Settings/Subscription/Paywall/Auth: bottom-sheet migration for
      centered modals, legacy form primitive retirement.
- [ ] Full `browser_evaluate` harness sweep across all ~25 screens reachable
      from `MainNavigation.tsx`, both viewports (navigation is state-driven,
      not URL-routed — must drive via taps).

### Stage 4 — Dead-file cleanup + final verification
- [ ] Re-verify the ~70 files flagged dead in the 2026-07-31 audit are still
      zero-import, then delete.
- [ ] Full final Playwright pass, every screen, both viewports.
- [ ] Ratchet test count at or near zero for every directory.

## Backlog (real findings from this rollout, filled in as stages land)

- [x] **Stage 0 — WCAG AA regression from adopting onboarding's literal
      palette, caught and fixed same-stage.** Onboarding's `ink3` (34%
      white) fails WCAG AA on this app's background tiers (~2.8-3.0:1,
      below even the relaxed 3:1 large-text bar). Resolved by using 50%
      white as the canonical `text.tertiary`/`.muted` instead — see Stage 0
      checklist for full detail. `src/utils/accessibility/contrast.ts` also
      extended to handle `rgba()` color strings (previously hex-only).
- [ ] **Welcome screen: "Get Started" CTA + "Already have an account?" text
      render on the system font stack, not Manrope.** Found via the live
      Playwright conformance check during Stage 0 verification. Deferred to
      Stage 3 (Home/Profile/Onboarding polish) since it's outside Stage 0's
      scope (token values only).
- [ ] **Onboarding Body Analysis screen (Personal→Body step 3/5): several
      numeric labels render on the system font stack instead of Manrope**
      ("STEP 3 OF 5", "58%", height/weight values, "— %" placeholder) — found
      via the live harness run during Stage 1 verification. Onboarding was
      previously audited as fully clean of this pattern, so this is either a
      regression somewhere or a spot the original audit missed; worth a
      dedicated look, not just a blind Manrope-ify, in case it's an
      intentional numeric-formatting code path. Deferred to Stage 3.
- [ ] **A small orange (`colors.primary`) element on the same Body Analysis
      screen, ~71×44, carries a residual `shadows.level1` box-shadow**
      (`rgba(0,0,0,0.1) 0px 1px 2px`) — found the same way. Small/subtle but
      still a banned pattern per DESIGN.md. Not yet identified which
      component this is (likely a stepper/slider control) — needs
      localization before fixing. Deferred to Stage 3.
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
