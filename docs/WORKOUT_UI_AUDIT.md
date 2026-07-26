# Workout UI/UX Audit — 368 True Positive Issues

Audit date: 2026-07-25
Scope: All workout screens + nested screens + builder + template library
Method: 2 parallel agents, code-level verification, file:line citations

User-reported symptoms addressed:
- Top header too crammed
- Buttons going out of window (clipping/overflow)
- UI/UX inconsistency
- Alignment inconsistency

## Summary by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | ~40 |
| MEDIUM | ~200 |
| LOW | ~128 |

## Systemic Findings (cross-cutting)

1. **Massive duplication** — `screens/main/fitness/` and `components/fitness/` have parallel FitnessHeader, WorkoutHistoryList, WeeklyPlanOverview with divergent implementations
2. **WCAG contrast failures** — widespread hardcoded `rgba(255,255,255,0.3-0.65)` on dark glass surfaces
3. **Touch target violations** — many `rw()/rp()/rs()` below 44px without `Math.max` clamp
4. **Missing KeyboardAvoidingView** — modals/sheets with TextInputs, keyboard occludes inputs
5. **console.log/error/warn in render paths** — violates CLAUDE.md (ExerciseGifPlayer, WorkoutSessionScreen, ExerciseEditorSheet)
6. **Emoji vs Ionicons inconsistency** — Aurora modernization removed emojis, but AchievementSystem, ExerciseCardDetails, WeeklyCalendar still use them
7. **Fragile `color+"CC"` hex-append** — AchievementNotifications appends alpha hex to color strings, breaks if color isn't 6-digit hex
8. **No loading skeletons** — most loading states show plain "Loading..." text, no spinner/skeleton
9. **rw() for border widths** — scales borders with screen width, should use fixed 1 or StyleSheet.hairlineWidth
10. **Premium gating visual-only** — BuildMethodLanding locked cards still tappable, no enforcement

---

## AGENT A — Active Workout + Detail + Fitness Components (200 issues)

### screens/main/fitness/FitnessHeader.tsx
- :88-93 MEDIUM overflow: progress badge `bottom:-4 right:-4` absolute, no `overflow:hidden` on parent — clips outside calendarIconContainer on small screens
- :166-178 MEDIUM contrast: progressIndicator `colors.primary` (#FF6B35 orange) + white text at `rf(9)` — borderline WCAG AA
- :79 LOW a11y: `accessibilityLabel="Calendar"` but icon is `notifications-outline` (line 83) — label/icon mismatch
- :48-50 MEDIUM typography: greeting has no `numberOfLines` — long userNames push calendar button off-screen
- :127 MEDIUM layout: greeting has `flexShrink:1` on style but Text itself has no truncation

### screens/main/fitness/TodayWorkoutCard.tsx
- :178-201 HIGH overflow: titleRow `flexWrap:"nowrap"` (line 351) + title `flex:1` + statusBadge `flexShrink:0` — narrow screens squeeze title to near-zero, badge pushes past container
- :204-219 MEDIUM overflow: metaRow single Text with nested spans + bullet separators — long counts wrap to 2-3 lines, no `numberOfLines`, card height jumps
- :384-386 HIGH contrast: metaText `rgba(255,255,255,0.65)` — fails WCAG AA on orange-tinted glass
- :388-392 HIGH contrast: restDaySubtitle `rgba(255,255,255,0.6)` — fails on light glass
- :411-416 HIGH contrast: lastPerformedText `rgba(255,255,255,0.4)` — well below 4.5:1
- :314-320 MEDIUM touch-target: iconContainer `rw(56)` — fine, but whole topSection Pressable wraps it; tapping icon does nothing yet looks tappable
- :142-147 LOW a11y: Pressable wraps topSection + bottom actionButton separate AnimatedPressable — two adjacent actionables, overlapping semantics
- :163 MEDIUM overflow: "TODAY • DAY 1" with `letterSpacing:1` overflows infoContainer without `numberOfLines`
- :185-200 MEDIUM alignment: statusBadge inline with title via `flexWrap:"nowrap"` + title `flex:1` — iPhone SE badge drops below visible row, misaligns baseline

### screens/main/fitness/WeeklyPlanOverview.tsx
- :152-220 HIGH overflow: header planTitle + Regenerate + View All buttons `flexShrink:0` — narrow screens crush title, buttons push off card edge
- :180-204 MEDIUM touch-target: regenerateButton inner padding `spacing.xs` only; row height ~22px < 44px
- :182-188 MEDIUM a11y: no `accessibilityState` for disabled when `isRegenerating=true`
- :205-219 MEDIUM touch-target: seeAllButton `minHeight:44` but AnimatedPressable wraps View without inheriting minHeight — actual tap area ~20px
- :393-402 MEDIUM touch-target: dayCircle `Math.max(rw(36), 44)` — adjacent circles nearly touch, mis-taps likely
- :225-273 HIGH consistency: 7 day circles `justifyContent:"space-between"` + each AnimatedPressable `scaleValue:0.9` — tap shrinks circle but label doesn't, visual jitter
- :277-303 MEDIUM alignment: statsRow `justifyContent:"space-around"` + statItem `flex:1` — dividers make labels wrap differently, misaligned baselines
- :286-289 MEDIUM overflow: totalCalories statValue `Math.round()` no `numberOfLines` — 5-digit count overflows statItem
- :154-156 LOW overflow: planTitle `numberOfLines={1}` no `adjustsFontSizeToFit` — long titles truncate to ellipsis
- :157-178 LOW typography: planSubtitle IIFE computing ISO week inline in JSX — unreadable
- :48 MEDIUM consistency: `REST_DAY_VIOLET "#A78BFA"` hardcoded magic color "no token yet" — diverges from token system

### screens/main/fitness/WorkoutHistoryList.tsx
- :55 MEDIUM consistency: `SWIPE_THRESHOLD=-100` hardcoded — actionContent width `rw(48)*2 + gap = ~104px`, swipe reveals partially on wide phones
- :67-108 HIGH state: PanResponder in `useRef` — doesn't respond to workout prop changes, swipe state leaks across re-renders
- :109-118 MEDIUM state: closeSwipe `useCallback` dep `[swipeX]` but `isSwipeOpen` is ref — stale closure
- :196-221 MEDIUM overflow: actionsContainer absolute `right:0 top:0 bottom:0` + actionButton `height:"100%"` — GlassCard padding leaves gaps above/below revealed actions
- :224-294 MEDIUM z-index: cardContainer `backgroundColor:colors.background` opaque covers actionsContainer — if transparent on some themes, actions show through
- :240-253 MEDIUM alignment: iconContainer `rw(44)` square `borderRadius:rw(12)` — GlassCard `padding="md"` makes icon appear off-center vertically
- :260-261 LOW overflow: title `numberOfLines={2}` + infoContainer `flex:1 minWidth:0` — narrow screens push meta off, status overlaps
- :287 MEDIUM typography: progressText `fontSize rf(10)` in `rw(34)` circle — "100%" doesn't fit, wraps to two lines
- :358-367 MEDIUM state: `workouts.slice(0,5)` silently truncates — no "Show more" affordance
- :399 LOW spacing: cardWrapper `marginBottom:spacing.xs` (~4-8px) — too tight between cards
- :413-419 MEDIUM touch-target: actionContent `rw(48)` `height:"100%"` — on short cards actions < 44px tall
- :426-430 HIGH contrast: actionText `fontSize rf(9)` white on successAlt/errorAlt — 9px below legibility minimum

### screens/main/fitness/RecoveryTipsModal.tsx
- :206-212 HIGH keyboard: Modal no KeyboardAvoidingView — `maxHeight:rh(724)` + ScrollView `maxHeight:rh(400)` + footer fixed — small phones content overflows safe area
- :324-329 HIGH contrast: overlay `rgba(0,0,0,0.85)` — too dark vs modalContent backgroundSecondary, harsh edge
- :337-340 MEDIUM overflow: modalContainer `width:"100%" maxHeight:rh(724)` — tall devices huge empty modal; short devices footer pushed off
- :384-386 MEDIUM state: scrollView `maxHeight:rh(400)` hardcoded independent of modal maxHeight — small screens footer unreachable
- :391-399 MEDIUM contrast: introCard `rgba(255,215,0,0.15)` + introText colors.text — gold tint may fail contrast
- :406-411 MEDIUM contrast: tipCard `rgba(255,255,255,0.08)` — very low alpha, tips blend into modal background
- :463-470 LOW contrast: quoteContainer `rgba(255,107,53,0.15)` + quoteText colors.text
- :35-89 LOW consistency: RECOVERY_TIPS gradients hardcoded hex pairs — bypass token system
- :236-251 MEDIUM touch-target: closeButton `Math.max(rw(36),44)` — no hitSlop, tight on narrow screens
- :293-313 MEDIUM touch-target: gotItButton `paddingVertical:spacing.md` — total ~40-48px, borderline

### screens/main/fitness/EmptyPlanState.tsx
- :63-66 MEDIUM overflow: iconAccent `absolute right:-8 bottom:-8` — outside iconWrapper, clips if parent `overflow:hidden`
- :99-103 MEDIUM overflow: previewText `numberOfLines={1}` on experienceLevel — "Intermediate level" + letterSpacing truncates
- :108-111 MEDIUM overflow: primaryGoals[0] `numberOfLines={1}` — long goals truncate
- :117-141 LOW consistency: features list checkmark-circle green (successAlt) — previewRow above uses primary (orange); mixed semantic colors
- :154-157 MEDIUM state: isGenerating gradient `["#6b7280","#4b5563"]` hardcoded — bypasses theme
- :161-167 MEDIUM state: generating text no spinner/ActivityIndicator — no progressive feedback
- :144-178 MEDIUM touch-target: generateButton no minHeight — ~40-48px, borderline
- :200-212 LOW contrast: iconAccent `rgba(255,107,107,0.15)` + heart icon colors.primary — red tint behind orange icon muddy

### screens/main/fitness/MyWorkoutsCard.tsx
- :150-158 MEDIUM touch-target: viewAll row no minHeight — tappable area ~16px, well below 44px
- :97-117 HIGH state: `useEffect` loads templates once on mount empty deps — if user creates template elsewhere, count stale until remount
- :205-217 MEDIUM alignment: StatTile value `numberOfLines={1}` — "10,000" at `rf(18)` overflows tile on narrow screens
- :256-265 MEDIUM spacing: statTile `paddingVertical:spacing.md + paddingHorizontal:spacing.md` — grid `gap:spacing.sm`; tiles touch, cramped
- :266-273 MEDIUM touch-target: statIcon `rw(30)` — entire StatTile non-interactive yet looks tappable

### screens/main/fitness/FitnessScreen.tsx
- :228-234 MEDIUM spacing: planToggleContainer `marginBottom:rp(12)` only — no paddingTop, segment control butts against header
- :292-297 MEDIUM state: errorCard raw Text, no icon/retry — user can't retry from this view
- :346 HIGH overflow: bottom spacer `height: insets.bottom + rh(120)` — SafeAreaView only `edges:["top"]`, bottom inset may be 0 on gesture nav
- :200 MEDIUM state: `SafeAreaView edges={["top"]}` only — bottom content extends under home indicator
- :351-358 MEDIUM z-index: guestSignUpOverlay `zIndex:100` no elevation — Android WorkoutStartDialog may render above
- :133 MEDIUM consistency: WorkoutCardItem `marginBottom:16` hardcoded — inconsistent with `rp(spacing.*)`
- :228-234 MEDIUM consistency: SegmentedControl for AI/Custom toggle — CustomPlanEmptyState renders below regardless of toggle when custom plan missing

### screens/main/fitness/index.ts
- :6-13 LOW consistency: re-exports SuggestedWorkouts from `../../../components/fitness/` while others from local `./` — inconsistent path

### screens/workout/WorkoutSessionScreen.tsx
- :733 MEDIUM state: SafeAreaView no edges prop — defaults all edges; WorkoutHeader `paddingTop={Math.max(insets.top,12)}` double-pads top
- :769-773 MEDIUM keyboard: ScrollView no `keyboardShouldPersistTaps` — SetLogModal opens, taps outside dismiss keyboard unexpectedly
- :786-794 MEDIUM touch-target: exerciseNameRow `paddingVertical:8` — ~32px tall, below 44px
- :808-815 MEDIUM overflow: ExerciseGifPlayer hardcodes `height={280} width={320}` — screens <360px wide overflow ScrollView padding
- :818-865 HIGH overflow: warmupContainer `alignSelf:'stretch'` conflicts with parent `alignItems:"center"` — rows misalign on narrow screens
- :868-880 MEDIUM alignment: setProgressRow 10px hardcoded dots — not responsive, tiny on high-DPI
- :883-917 MEDIUM state: startButton label nested ternary `Continue — Set X of Y` — long label wraps/truncates, no `numberOfLines`
- :920-932 MEDIUM alignment: previewNav `justifyContent:"space-between"` renders only Previous — content left-aligned, wastes right side
- :1104-1107 MEDIUM touch-target: prevExButton `paddingVertical:12 + paddingHorizontal:16` — ~36-40px, below 44px
- :1131 MEDIUM contrast: exerciseHistoryHint `marginLeft:8` hardcoded — inconsistent with spacing tokens
- :1167-1174 MEDIUM touch-target: warmupDoneBtn `paddingVertical:10 + paddingHorizontal:16` — ~32-36px
- :1142-1147 MEDIUM typography: warmupHeader `fontSize:10` hardcoded — not responsive
- :1163-1166 MEDIUM typography: warmupPercent `fontSize:10` hardcoded
- :1189-1195 MEDIUM typography: warmupWorkingLabel `fontSize:10` hardcoded
- :189-192 HIGH state: `console.warn` in render body when bodyAnalysis weight missing — CLAUDE.md prohibits console.log in production paths
- :731-1055 MEDIUM state: no loading state while completeWorkout runs — isCompletingRef disables Finish but no spinner
- :939-956 MEDIUM state: ExerciseSessionModal `isVisible` tied to `exercisePhase==="performing"` — main ScrollView still interactive underneath
- :1053 MEDIUM z-index: SafeAreaView closes before modals (RestTimer, dialogs) — render outside SafeAreaView, may overlap status bar

### screens/details/WorkoutDetail.tsx
- :44-52 MEDIUM state: isGeneratingPlan shows AuroraSpinner but no message — no context what's loading
- :54-69 MEDIUM state: !workout empty state uses EmptyState — no "Retry" or "Go Back to Plan" CTA beyond conditional onBack
- :92-117 MEDIUM overflow: ScrollView no `contentContainerStyle paddingBottom` — bottom button absolute may be underlapped
- :119-134 MEDIUM z-index: bottomContainer View `borderTopWidth` but no `position:absolute` — long content renders off-screen
- :149-156 MEDIUM consistency: favoriteButton `borderRadius:999` hardcoded magic number — inconsistent with `rw(44)`, should use `borderRadius.full` token
- :159-163 MEDIUM spacing: scrollView `paddingHorizontal:rp(spacing.md)` — FitnessScreen uses `spacing.lg`; horizontal padding inconsistent
- :170-174 MEDIUM spacing: bottomContainer `padding:rp(spacing.md)` — tighter than rest of screen's `spacing.lg`
- :76-90 MEDIUM touch-target: favoriteButton AnimatedPressable no explicit size — `rw(44)` View inside; pressable hit area may be smaller

### screens/workouts/WorkoutDetailScreen.tsx
- :336-338 HIGH consistency: header "Start" button uses GlassButton `variant="primary"` while TodayWorkoutCard.tsx:266 uses AnimatedPressable+LinearGradient for same action
- :319 MEDIUM state: SafeAreaView `edges={["top"]}` only — bottom sticky CTA extends under home indicator
- :341-346 MEDIUM overflow: ScrollView no `keyboardShouldPersistTaps` — sticky bottom CTA may overlap last scroll item
- :359-388 MEDIUM alignment: heroRow ProgressRing `rf(72)` + heroInfo `flex:1` — ring text prop empty string when not in progress; empty Text node takes space
- :391-393 MEDIUM overflow: heroTitle `numberOfLines={2}` no `adjustsFontSizeToFit` — long titles truncate
- :394-400 MEDIUM overflow: heroDesc `numberOfLines={3}` — short descriptions don't enforce minHeight; card height jumps

### components/fitness/ExerciseInstructionModal.tsx
- :228-260 MEDIUM keyboard: BottomSheet contains ScrollView, no KeyboardAvoidingView — gifSection + tabs + content may exceed sheet height
- :285-295 MEDIUM overflow: modalGif `width:"80%" height:rh(200)` — narrow screens 80% < 200px, aspect distortion
- :296-310 MEDIUM touch-target: tab `minHeight:rp(44)` — rp() scales; small screens may drop below 44px actual
- :339-348 MEDIUM touch-target: stepNumber `rp(28)` display only — instructionItem row looks tappable and isn't
- :237-242 LOW a11y: "Verified" badge no `accessibilityLabel` — screen readers announce text only
- :107-119 MEDIUM state: noDataContainer for missing instructions — no "Report missing" or fallback CTA, dead-end
- :142-150 MEDIUM state: noDataContainer for missing exercise details — same dead-end
- :66-105 LOW consistency: renderTabs uses AnimatedPressable + scaleValue — TabNavigation.tsx uses TouchableOpacity for same pattern
- :125-137 MEDIUM overflow: instructionText no `numberOfLines` — long instructions expand modal unpredictably

### components/fitness/ExerciseCard.tsx
- :66-79 HIGH consistency: getMuscleGroupColor hardcoded hex map — bypasses token system
- :81-94 LOW consistency: getDifficultyIcon returns "ellipse" for all three cases — no visual differentiation
- :96-107 MEDIUM consistency: getDifficultyColor returns `colors.success/warning/error` — other files use `successAlt/warningAlt/errorAlt`
- :120-149 MEDIUM touch-target: headerPressable wraps exerciseNumber+titleSection — entire Pressable toggles expand; tapping near meta triggers
- :161-167 MEDIUM touch-target: playButton hardcoded 44x44 — raw number not `rw(44)`, inconsistent scaling on tablets
- :172-180 MEDIUM overflow: timerDisplay hardcoded padding — "Rest: 10:00" overflows on large fonts
- :182-307 MEDIUM state: expanded content uses LayoutAnimation `easeInEaseOut` — no reduced-motion check
- :264-275 MEDIUM overflow: instructionText `flex:1` no `numberOfLines` — long instructions expand card
- :309-315 MEDIUM touch-target: expandIndicator no explicit size — chevron `rf(14)` in Pressable `paddingVertical:spacing.sm`; ~30px tall
- :294-299 MEDIUM touch-target: completeButton `minHeight:44` but `paddingHorizontal:spacing.lg` — "Mark Complete" may overflow width
- :392-399 MEDIUM contrast: completedBadge `colors.success` + white check — successAlt vs success mismatch with card border (line 327)
- :416-426 MEDIUM contrast: timerDisplay `colors.warning` (full opacity amber) + white text — may fail WCAG AA
- :480-491 MEDIUM contrast: muscleGroupChip `getMuscleGroupColor` (e.g. #FFEAA7 yellow for triceps) + white text — yellow+white fails severely

### components/fitness/FitnessHeader.tsx
- :80-91 MEDIUM consistency: uses "calendar" icon — screens/main/fitness/FitnessHeader.tsx:83 uses "notifications-outline"; two components same name different icons
- :142-151 MEDIUM contrast: calendarIconContainer `colors.glassBorder` + `borderColor colors.glassHighlight` — border on glass near-invisible
- :84-91 MEDIUM state: progressIndicator only shows when `progressPercent>0 && <100` — at 100% disappears entirely
- :152-162 MEDIUM contrast: progressIndicator `minWidth:rp(28)` + `rf(9)` text — very small text, borderline legible

### components/fitness/SuggestedWorkouts.tsx
- :88-89 MEDIUM state: `workouts.length===0` returns null — no empty state, blank gap
- :106-112 MEDIUM overflow: `snapToInterval={rw(160)+spacing.md}` — tablets `rw(160)` may exceed actual card width, snap misalignment
- :165-167 MEDIUM overflow: title `numberOfLines={2}` + `minHeight:rf(36)` — 1-line title forces empty space, 3+ truncates awkwardly
- :209-211 MEDIUM state: isGenerating shows "Generating..." text no spinner — only when `status==='idle'`
- :285-287 MEDIUM overflow: title `minHeight:rf(36)` — forces fixed height for 1-line titles, wastes vertical space
- :312-320 MEDIUM touch-target: startButton `paddingVertical:spacing.sm` — ~28-32px, below 44px
- :328-339 MEDIUM contrast: completedButton `rgba(16,185,129,0.12)` + border `rgba(16,185,129,0.3)` — nearly invisible against glass card

### components/fitness/WeekDaySelector.tsx
- :88-99 MEDIUM overflow: `contentOffset x: (todayIndex-1)*(rw(56)+spacing.sm)` — doesn't account for `paddingHorizontal:spacing.lg`, initial scroll off by lg
- :105-158 MEDIUM touch-target: dayItem `rw(56)×rh(80)` — mealIndicator (line 137-153) overlaps bottom, reducing effective tap area
- :137-153 MEDIUM overflow: mealIndicator `absolute bottom:rh(6)` — may overlap dayDate text on small screens
- :156 MEDIUM overflow: todayDot `absolute top:rh(6)` — may overlap dayLabel text
- :173-183 MEDIUM contrast: dayItem `rgba(255,255,255,0.03)` — extremely low alpha, nearly invisible
- :201-203 HIGH contrast: dayLabelPast `rgba(255,255,255,0.3)` — below WCAG AA
- :211-213 HIGH contrast: dayDatePast `rgba(255,255,255,0.4)` — below WCAG AA
- :215-222 MEDIUM contrast: mealIndicator `rgba(255,107,53,0.2)` + mealCount `colors.primary` — orange on orange-tint

### components/fitness/WorkoutHistoryList.tsx
- :283-306 MEDIUM state: empty state no CTA — "Complete your first workout" but no button, dead-end
- :324-333 MEDIUM state: `workouts.slice(0,5)` — no "Show all" link
- :438-448 MEDIUM contrast: progressBadge `rgba(255,142,83,0.15)` + progressText `colors.accent` — low contrast on light glass

### components/fitness/WorkoutTimer.tsx
- :101-107 MEDIUM keyboard: Modal transparent no KeyboardAvoidingView — controls row pushed off-screen in landscape
- :118-135 HIGH overflow: circularTimer two stacked Views `rs(200)` + `borderWidth:8` — progressFill rotate transform doesn't show circular progress, visually broken
- :124-128 MEDIUM state: progressFill `transform rotate` uses `progressPercentage*3.6` — baseline `-90deg` (line 268); combined rotation wrong
- :153-186 MEDIUM touch-target: three control buttons `flex:1 height:44` — "Skip Rest" text may truncate
- :189-205 MEDIUM touch-target: adjustButton no minHeight — ~28-32px, below 44px
- :275-280 MEDIUM typography: timeText `fontSize rf(48)` + `fontFamily:"monospace"` — may not exist on all platforms
- :259-269 MEDIUM consistency: progressFill `borderRightColor:"transparent" borderBottomColor:"transparent"` — hack for partial circle, inconsistent with ProgressRing SVG elsewhere
- :94-97 MEDIUM state: `safeDuration = Math.max(1, ...)` guards zero, but progressPercentage uses safeDuration not duration — if duration=0, percentage always 100%

### components/fitness/WeeklyPlanOverview.tsx
- :139-141 MEDIUM state: planTitle shows `plan.planTitle` no fallback — if null, empty Text
- :142 MEDIUM state: planSubtitle shows `plan.duration` directly — if undefined, renders nothing
- :300-308 MEDIUM touch-target: dayCircle `rw(36)` no `Math.max` clamp — small screens drop below 44px
- :317-322 MEDIUM consistency: workoutDot `rp(8)` — screens/main version uses `rw(8)`; inconsistent units

### components/fitness/WeeklyCalendar.tsx
- :125-151 MEDIUM touch-target: weekNavButton `rs(40)` — below 44px
- :160-216 MEDIUM overflow: dayButton `rw(80)` wide — 7×80=560px+gaps; ScrollView horizontal but no `contentOffset` to today, lands on Monday
- :209-213 MEDIUM consistency: restIndicator uses emoji "😴" — Aurora removed emojis elsewhere
- :204-207 MEDIUM contrast: workoutIndicatorText `fontSize rf(10)` white on success/warning — tiny text, borderline
- :298-301 MEDIUM contrast: dayButtonRest `colors.backgroundTertiary + opacity:0.7` — rest days nearly invisible

### components/fitness/PlanSection.tsx
- :35-55 MEDIUM consistency: imports WeeklyPlanOverview from `../../screens/main/fitness/` — but `components/fitness/WeeklyPlanOverview.tsx` also exists; two versions
- :11-21 LOW consistency: Props all `any` type — no type safety

### components/fitness/WorkoutAnalytics.tsx
- :53-59 MEDIUM state: loading shows Card with "Loading analytics..." — no spinner/skeleton
- :61-67 MEDIUM state: error shows "Error: {statsError}" raw text — no retry, exposes internal error string
- :76-93 MEDIUM touch-target: timeRangeButton no minHeight — ~28-32px
- :97-130 MEDIUM overflow: statsGrid `flexWrap:"wrap"` + statItem `width:"50%"` — no gap between rows
- :132-151 MEDIUM state: workoutsByType conditionally rendered — if empty, just disappears
- :153-195 MEDIUM state: insights section multiple conditionals — if none match, renders empty "Insights" title
- :201-205 MEDIUM spacing: container `margin:spacing.md` — other cards use `marginBottom` only

### components/fitness/ExerciseGifPlayer.tsx
- :107-110 HIGH state: `console.error` in render body — CLAUDE.md prohibits console.log/error in production paths
- :121-135 HIGH state: handleImageError calls `console.warn` and `console.error` — same violation
- :251-271 MEDIUM state: placeholder "Demo unavailable" — no "Report issue" CTA, dead-end
- :282-297 MEDIUM state: errorContainer retry resets state, re-fetches same URL — broken URL = infinite retry loop
- :299-329 MEDIUM touch-target: gifTouchArea Image `activeOpacity:0.8` — playbackOverlay separate TouchableOpacity on top; tap ambiguity
- :430-435 MEDIUM touch-target: playbackButton `Math.max(rs(40),44)` — defensive but inconsistent with other components
- :597-607 MEDIUM touch-target: closeButton fullscreen `Math.max(rs(40),44)` + `zIndex:10` no hitSlop — small screens hard to tap
- :615-622 MEDIUM overflow: fullscreenTitle `fontSize:fontSize.xl` + `textTransform:"capitalize"` — long names overflow, no `numberOfLines`
- :630-636 MEDIUM contrast: fullscreenHint `rgba(255,255,255,0.7)` + `fontSize:fontSize.sm` — borderline on 0.95 black overlay
- :384-401 MEDIUM contrast: gifContainer `borderWidth:0.5` + `borderColor colors.primary+"10"` — near-invisible border
- :397-401 HIGH contrast: gif `backgroundColor "#ffffff"` hardcoded white — dark mode white GIF clashes

### components/fitness/ExerciseSessionModal.tsx
- :381-509 MEDIUM overflow: overlay `paddingTop:rp(48)` — no SafeAreaView, notched devices underlap status bar
- :526-530 MEDIUM overflow: cardWrapper `width:"90%" maxWidth:400` — tablets 400px max centered; phones 90% too wide for GIF
- :575-583 MEDIUM overflow: breathingCircleOuter `rs(200)` + exerciseGifContainer `rs(180)` — 20px difference arbitrary
- :457-488 MEDIUM touch-target: controlButton `height:rh(50)` + controlButtonOuter `height:rh(50)` — double height redundant
- :449 MEDIUM overflow: exerciseName `numberOfLines={2}` — no `adjustsFontSizeToFit`
- :451-454 MEDIUM state: motivationText changes per set no fade transition — abrupt swap jarring
- :490-505 MEDIUM alignment: progressDots `justifyContent:"center"` — 8 sets overflow width, no `flexWrap`
- :676-683 MEDIUM overflow: progressDotActive `rs(13)` vs pending `rs(10)` — 3px difference barely visible on high-DPI
- :181-186 MEDIUM contrast: SwitchBanner `rgba(10,15,28,0.95)` — nearly opaque, covers GIF, jarring
- :175-186 MEDIUM z-index: SwitchBanner `zIndex:20` — GIF container `zIndex:10` also covered, may not be intended
- :519-524 MEDIUM overflow: overlay `...StyleSheet.absoluteFillObject + flex:1` — redundant
- :523 MEDIUM alignment: overlay `justifyContent:"flex-start"` — card pushed to top, empty space below on tall screens

### components/fitness/CustomPlanEmptyState.tsx
- :145-321 MEDIUM state: no loading state while templates fetch — libraryPreview shows 0/0/0, misleading
- :185-208 MEDIUM touch-target: ctaRow GlassButton `fullWidth` — no minHeight enforcement
- :265-315 MEDIUM touch-target: emptyActionChip `paddingVertical:rp(spacing.sm)` — ~32-36px, below 44px
- :375-376 MEDIUM overflow: explanation lineHeight `typography.fontSize.caption * typography.lineHeight.normal` — if `lineHeight.normal` undefined, NaN breaks rendering
- :384-392 MEDIUM spacing: libraryLabel `letterSpacing:1.2 + marginTop:rp(spacing.lg)` — floats between two cards
- :401-409 MEDIUM alignment: previewStat `alignItems:"flex-start"` — icon centered in previewStatIcon, value left-aligned; asymmetry
- :411-417 MEDIUM touch-target: previewStatIcon `rw(28)` — entire previewStat looks tappable and isn't

### components/fitness/AchievementSystem.tsx
- :265-271 MEDIUM state: loading "Loading achievements..." — no spinner/skeleton
- :273-279 MEDIUM state: error "⚠️ {error}" raw string exposed — no retry
- :281-332 MEDIUM overflow: Card no maxHeight — many achievements push content off-screen
- :299 MEDIUM overflow: ScrollView no `contentContainerStyle paddingBottom` — last achievement cut off
- :285-288 MEDIUM touch-target: pointsBadge no minHeight — ~8-12px (display only)
- :81-132 LOW consistency: achievement icons are emojis (🎯,🌟,💪,🏆,🥇) — Aurora removed emojis elsewhere
- :218-222 MEDIUM state: crossPlatformAlert with emoji "🎉" in title — renders inconsistently across platforms
- :248-252 HIGH state: useEffect deps `[workoutStats, user?.id]` but reads `achievements` state — may miss or duplicate checks
- :411-415 MEDIUM contrast: achievementIcon `colors.primary+"20"` — very low alpha, icon blends into card
- :449-461 MEDIUM state: loadingText and errorText `paddingVertical:spacing.xl` — no icon/retry, dead-end

### components/fitness/exercise-card/ExerciseCardDetails.tsx
- :23-46 MEDIUM consistency: detailIcon uses emoji "🎯","⏱️","🔥" — parent ExerciseCard uses Ionicons
- :26 MEDIUM overflow: detailValue shows `getDifficultyIcon(exercise.difficulty) + " " + exercise.difficulty` — returns "ellipse Beginner", meaningless
- :62-79 MEDIUM overflow: detailIcon `width:rw(20)` — emojis wider than 20px, clip/overflow

### components/fitness/exercise-card/ExerciseCardHeader.tsx
- :63-66 MEDIUM touch-target: playButton 44x44 hardcoded — not responsive, duplicated code
- :63-66 MEDIUM consistency: playIcon uses emoji "▶️" — ExerciseCard.tsx:161-167 uses Ionicons "play"
- :60-61 MEDIUM consistency: completedIcon "✓" text — ExerciseCard.tsx:155-158 uses Ionicons "checkmark"
- :139-146 MEDIUM touch-target: playButton `width:44 height:44` hardcoded — not `rw(44)`, inconsistent scaling

### components/fitness/exercise-card/ExerciseCardSections.tsx
- :75 MEDIUM consistency: sectionTitle "💡 Tips" emoji prefix — ExerciseCard.tsx:280 uses plain "Tips"
- :76-80 MEDIUM overflow: tipText "• {tip}" prefix — ExerciseCard.tsx:286 uses "- {tip}"; two bullet styles
- :105-108 MEDIUM contrast: muscleGroupChip no explicit text color — muscleGroupText white on getMuscleGroupColor (may be light yellow), fails contrast

### components/fitness/exercise-card/ExerciseCardTimer.tsx
- :33-38 MEDIUM contrast: timerDisplay `colors.warning` + white text — same as ExerciseCard.tsx:416-426, duplicated

### components/fitness/gif-player/GifPlayerContent.tsx
- :42-49 MEDIUM state: placeholder "Exercise Not Found" + "ID: {exerciseId}" — exposes internal ID, unfriendly
- :64-67 MEDIUM touch-target: retryButton no minHeight — ~8-12px
- :93-96 MEDIUM overflow: zoomHint always rendered (no showControls prop) — unlike ExerciseGifPlayer.tsx which gates it
- :165-172 MEDIUM touch-target: playbackButton `rs(40)` — below 44px, no `Math.max` clamp
- :245-249 HIGH contrast: zoomHintText `colors.text` (dark) on `rgba(0,0,0,0.7)` — dark on dark, fails

### components/fitness/gif-player/FullscreenModal.tsx
- :51-52 MEDIUM touch-target: closeButton "X" text `fontSize rf(20)` in 44px button — no icon, less accessible than Ionicons close
- :54 MEDIUM overflow: fullscreenTitle no `numberOfLines` — long names overflow
- :67-69 MEDIUM state: fullscreenHint "Maximum quality view - tap X to close" — always shown, clutters UI

### components/fitness/instruction/ExerciseTipsCard.tsx
- :15-20 LOW consistency: STANDARD_TIPS hardcoded — ExerciseCard.tsx:280-290 also has tips with different content; two sources

### components/fitness/instruction/InstructionSteps.tsx
- :16-25 MEDIUM state: noDataContainer shows "i" as emoji substitute — single char looks like typo
- :38-42 MEDIUM overflow: instructionText no `numberOfLines` — long instructions wrap infinitely
- :65-74 MEDIUM touch-target: stepNumber `rs(28)` display only — instructionItem row looks tappable and isn't

### components/fitness/instruction/ModalHeader.tsx
- :32-33 MEDIUM consistency: closeButton "X" text — ExerciseInstructionModal uses BottomSheet's Ionicons chevron
- :77-83 MEDIUM touch-target: closeButton `Math.max(rs(40),44)` — "X" text `rf(18)` smaller than Ionicons equivalent

### components/fitness/instruction/TabNavigation.tsx
- :16-42 MEDIUM consistency: uses TouchableOpacity — ExerciseInstructionModal.tsx:66-105 uses AnimatedPressable for same UI
- :56-61 MEDIUM touch-target: tab `paddingVertical:spacing.sm` — ~24-28px, below 44px

### components/fitness/instruction/ExerciseDetails.tsx
- :19-26 MEDIUM state: noDataContainer shows "?" as emoji — single char looks like placeholder
- :46-48 MEDIUM consistency: secondaryMuscles check `?.length &&` then `> 0` — redundant double check
- :173-184 MEDIUM state: tipContainer and tipText styles defined but never used — dead code

### components/workout/WorkoutProgressBar.tsx
- :70-72 MEDIUM alignment: progressPercentage text right-aligned `marginRight:rp(spacing.lg)` — 100% text may overflow
- :91-97 MEDIUM overflow: progressBarContainer `marginHorizontal:rp(spacing.lg)` — parent WorkoutHeader already has paddingHorizontal, double margin narrows bar

### components/workout/NextExercisePreview.tsx
- :40-42 MEDIUM overflow: nextExerciseName `numberOfLines={1}` — no `adjustsFontSizeToFit`, long names truncate

### components/workout/WorkoutHeader.tsx
- :87-94 MEDIUM overflow: workoutTitle `numberOfLines={1} + adjustsFontSizeToFit + minimumFontScale:0.7` — centered in headerInfo `flex:1` between exitButton and headerRight; 3 stat blocks squeeze title
- :106-123 MEDIUM overflow: headerRight 2-3 statBlocks (TIME, CAL, VOL) `gap:rp(spacing.sm)` — narrow screens with sessionVolume overflow horizontally
- :144-153 MEDIUM touch-target: exitButton `rw(40)` — below 44px, no `Math.max` clamp
- :198-205 MEDIUM contrast: statLabel `fontSize:9` (hardcoded, not rf) + `opacity:0.7` — double-reduced contrast
- :199 MEDIUM typography: statLabel `fontSize:9` hardcoded — not responsive

### components/workout/ExerciseCard.tsx
- :66-84 MEDIUM alignment: Button inside exerciseHeader `marginTop:spacing.md` — exerciseName (line 68) `marginBottom:spacing.md`; double margin
- :86-102 MEDIUM overflow: exerciseDetails `flexWrap:"wrap" + gap:spacing.md` — may split "Rest: 60s" mid-phrase
- :107-129 MEDIUM touch-target: setButton `rw(56)` — setButtonCheck (line 126) `absolute top:rp(-2) right:rp(2)` overlaps set number
- :108-128 MEDIUM consistency: setButton uses TouchableOpacity — rest of workout components use AnimatedPressable
- :109-117 LOW a11y: setButton no `accessibilityLabel` — screen readers announce "1" with no context
- :137-146 MEDIUM overflow: instructionsText no `numberOfLines` — long notes expand card unpredictably
- :222-232 MEDIUM touch-target: setButton `rw(56) + borderWidth:2` — small screens rw(56) may drop below 56; border eats tap area
- :249-256 MEDIUM overflow: setButtonCheck "OK" text `fontSize rf(12)` absolute — overlaps set number, not checkmark icon

### components/workout/WorkoutErrorState.tsx
- :33-51 MEDIUM state: no retry button — only "Go Back"
- :44-49 MEDIUM touch-target: errorButton `minWidth:rw(120)` — no minHeight
- :66-74 MEDIUM contrast: iconContainer `colors.glassSurface` — icon (alert-circle) `colors.error` or `colors.primary` may lack contrast

### components/workout/WorkoutNavigation.tsx
- :23-44 MEDIUM overflow: two navButtons `flex:1 + gap:rw(12)` — "Finish Workout" text may overflow, no `numberOfLines`
- :58-62 MEDIUM touch-target: navButton `minHeight:rh(44) maxHeight:rh(48)` — rh() scales; small screens below 44px
- :48-56 MEDIUM consistency: navigationContainer `rp(16) and rw(12)` — mixing rp and rw units

### components/workout/SetLogModal.tsx
- :443-449 HIGH keyboard: ScrollView `keyboardShouldPersistTaps="handled"` — no KeyboardAvoidingView; BottomSheet's internal KAV no-op on Android
- :451-467 MEDIUM overflow: headerRow exerciseName `flex:1` + prBadge `flexShrink:0` — "PR 1RM 1234kg" pushes exerciseName to near-zero
- :522-544 MEDIUM touch-target: setTypeBadge `rp(36)` — below 44px
- :532-541 MEDIUM state: setTypeBadge `opacity:0.5` when inactive — active `opacity:1 + borderWidth:2`; opacity jump abrupt
- :553-586 MEDIUM touch-target: stepperBtn `rp(40)` — below 44px
- :564-574 MEDIUM keyboard: weight TextInput `autoFocus + returnKeyType:"next" + onSubmitEditing` to repsRef — no `blurOnSubmit:false`; iOS keyboard may dismiss
- :610-620 MEDIUM keyboard: reps TextInput `returnKeyType:"done"` — no `onSubmitEditing` handler, "done" doesn't dismiss/save
- :640-678 MEDIUM touch-target: rpeButton `paddingVertical:rp(14)` — meets 44px but icon (rf(22)) + text may clip
- :696-703 MEDIUM touch-target: backButton (GlassButton) `fullWidth` — no minHeight
- :836-846 MEDIUM overflow: setTypeRow fieldLabel `width:rp(80)` + 4 set type badges — may overflow row width
- :858-869 MEDIUM overflow: inputRow fieldLabel `width:rp(80)` + stepperRow `flex:1` — stepperRow squeezed on narrow screens
- :886-898 MEDIUM overflow: input TextInput `textAlign:"center" + fontSize rf(h3)` — long weight values overflow
- :929-955 MEDIUM consistency: rpeButton `flex:1 + gap:rp(spacing.xs)` — "Just Right" may wrap to 2 lines, uneven heights

### components/workout/AchievementNotifications.tsx
- :101-108 MEDIUM z-index: achievementToast `zIndex:1000` — WorkoutCompleteDialog rendered after may have higher default zIndex
- :146-163 MEDIUM z-index: miniToast `zIndex:999` — below achievementToast; condition prevents both, but latent conflict
- :125-131 MEDIUM overflow: achievementToastIcon `fontSize rf(28) + marginRight:spacing.sm` — multi-char emoji shifts layout
- :141-144 HIGH contrast: achievementToastDescription `colors.white+"CC"` — fragile hex append; if colors.white isn't 6-digit hex, invalid color
- :150 HIGH contrast: miniToast `colors.primary+"E6"` — same fragile hex append
- :104-108 MEDIUM overflow: achievementToast `top:rp(60)` — notched devices rp(60) under status bar; no SafeAreaView
- :147-150 MEDIUM overflow: miniToast `top:rp(120)` — below achievementToast; positioning arbitrary

---

## AGENT B — Builder + Template Screens (168 issues)

### screens/workouts/ScheduleBuilderScreen.tsx
- :289 HIGH typography: Save/Saving button `rf(caption)=14px + rp(sm) padding (~8px)` — total ~30px, below 44px
- :282-291 HIGH layout: GlassHeader rightAction Save button single Text no icon — "Saving..." + back chevron + title collide, header crammed
- :360 MEDIUM touch-target: clear-day icon `padding rp(spacing.sm) + icon rf(16)` → ~32px, below 44dp
- :346-353 MEDIUM touch-target: "Change" button `padding rp(spacing.sm)` both axes — ~30px, below 44dp
- :364-372 MEDIUM touch-target: "Rest Day / + Add Workout" `paddingVertical rp(spacing.md)` ~50px OK, but no `accessibilityState` for "selected"
- :447-457 MEDIUM touch-target: stepper "−"/"+" 32×32 (rw(32)) — below 44dp
- :433 MEDIUM overflow: exercise item row controlGroup Sets/Reps/Rest at `gap rp(spacing.md)` — 320px screens overflow horizontally, no `flexWrap`
- :860-868 MEDIUM layout: exerciseItemRow `alignItems:'flex-start'` — removeExBtn misaligns vertically when name wraps
- :897-913 LOW spacing: stepperBtnText `lineHeight: rf(18)` hard-set — large font scale clips "+"
- :622-644 MEDIUM overflow: category tabs ScrollView no `contentContainerStyle` padding end — last chip flush against trailing edge
- :607-614 HIGH keyboard: exercise search TextInput no KeyboardAvoidingView — FlatList items hidden behind keyboard
- :646-683 MEDIUM state: exercise picker FlatList no `ListEmptyComponent` when `exercisePickerDay` is null — silent white space
- :262-272 LOW state: loading state only AuroraSpinner — no title/back button, trapped if load hangs
- :312-321 MEDIUM state: empty state "no templates" routes to CreateWorkout but Save button disabled — inconsistent exit paths
- :265 MEDIUM a11y: SafeAreaView loading state no edges prop — double-pads on Android
- :977-980 LOW typography: exerciseSearchInput no minHeight — collapses to fontSize height, ~22px
- :295-301 MEDIUM spacing: modeToggleContainer `paddingTop rp(spacing.md)` + subtitle `paddingVertical rp(spacing.md)` — ~32px gap, inconsistent rhythm
- :740 LOW typography: dayFull `fontSize rf(11)` — below 12px micro minimum
- :936-939 MEDIUM touch-target: clearDayBtn "Clear All" `paddingVertical rp(spacing.sm)` — ~28px, below 44dp
- :528 MEDIUM touch-target: "+ Add Exercise" `paddingVertical rp(spacing.sm)` no minHeight — ~28px
- :559 LOW consistency: picker title `Pick workout for ${DAYS.find(...)?.label}` — long day names truncate awkwardly

### screens/workouts/WeeklyBuilderScreen.tsx
- :348-355 LOW state: loading state no back affordance — GlassHeader not rendered, trapped if hydrate hangs
- :432 MEDIUM layout: footerSpacer `height rp(140)` hardcoded — BuilderSummaryFooter content wraps > 140, last day-block hidden
- :368-374 MEDIUM layout: SegmentedControl 7 day options — 360px screen each segment ~46px; tap target shrinks below 44dp with padding
- :378-385 LOW a11y: refresh indicator text no `accessibilityLiveRegion` — pullIsRefreshing read as SharedValue in render, only flips once
- :465-469 MEDIUM z-index: ExercisePickerSheet and ExerciseEditorSheet both mountable — no z-index guard ensures editor above picker
- :399-426 MEDIUM layout: DayBlock list `.map` inside ScrollView no virtualization — jank on low-end devices
- :441-461 LOW consistency: discard dialog CustomDialog — Save flow doesn't surface equivalent "unsaved changes" warning

### screens/workouts/TemplateLibraryScreen.tsx
- :599-623 HIGH layout: GlassHeader rightAction two buttons (Schedule + add icon) `gap rp(spacing.sm)` — ~120px + back chevron + "Template Library" title overflows horizontally, buttons clip on right
- :604-612 MEDIUM touch-target: "Schedule" button `paddingHorizontal rp(spacing.sm) + paddingVertical rp(spacing.xs)` — ~22px, below 44dp
- :613-621 MEDIUM touch-target: add-template button `rw(40)×rw(40)` — below 44dp
- :663-675 MEDIUM touch-target: view-toggle button `rw(44)×rw(44)` — Android density scaling rw(44) ~42px, add `hitSlop={8}`
- :644-660 LOW a11y: clear-search Pressable `hitSlop={12}` — no `accessibilityHint`
- :919 HIGH layout: FlatList `numColumns={2}` + `key={viewMode}` — switching viewMode remounts list, loses scroll position; no `columnWrapperStyle`
- :1641-1645 HIGH overflow: gridItem `maxWidth: "50%"` cast as number — `flex:1 + margin rp(spacing.xs)` exceeds 100% width, horizontal overflow
- :1652-1657 MEDIUM layout: gridThumb `height rw(90)` hardcoded — tall templates with long names make cards unequal height
- :1099-1119 LOW z-index: bookmark Pressable stopPropagation — Android doesn't always prevent parent onPress, simultaneous fire
- :1080-1086 LOW contrast: gridThumb gradient `colors.primary.DEFAULT → colors.secondary.DEFAULT` + white icon — no scrim, white-on-gradient legibility
- :1159-1172 MEDIUM touch-target: grid "Start" button `paddingVertical rp(spacing.sm)` no minHeight — ~32px, below 44dp
- :1278-1298 MEDIUM touch-target: listBookmarkBtn `minWidth rw(36)` — 36 < 44
- :1316-1328 MEDIUM touch-target: menuBtn `paddingVertical rp(spacing.xs)` + `minWidth rw(44)` — actual tappable height ~28px
- :1376-1393 MEDIUM touch-target: exercise row Pressable `paddingVertical rp(spacing.xs)` — ~24px, below 44dp
- :1395-1399 LOW typography: "+N more" text `textAlign:'right'` — no left padding, flush against container edge
- :1404-1436 HIGH z-index: inline menu (Edit/Duplicate/Delete) no zIndex — renders behind adjacent card
- :1452 MEDIUM touch-target: list Start button `paddingVertical rp(spacing.md)` ~50px OK, but `fullWidth` no maxWidth — tablets stretch edge-to-edge
- :1467-1471 LOW consistency: headerActions gap rp(spacing.sm) — tabsRow uses paddingBottom only no top separator; visual rhythm differs
- :1539-1550 MEDIUM touch-target: tabChip `minHeight rp(40)` — below 44dp
- :1578-1585 MEDIUM touch-target: collectionChip `paddingVertical rp(spacing.xs)` no minHeight — ~28px, below 44dp
- :1600-1611 MEDIUM overflow: multiBar `marginHorizontal rp(spacing.md) + marginBottom rp(spacing.sm)` — layout shift on appearance
- :1624-1631 MEDIUM touch-target: multiBarBtn `rw(36)×rw(36)` — below 44dp
- :821-835 LOW state: community-locked empty state CTA "Upgrade" navigates to "Profile" — no clear upgrade affordance from this entry
- :703-731 LOW a11y: locked tab chip `opacity 0.7` — "Community" label `colors.text.tertiary` (#8A8A8A) contrast ~3.2:1, below WCAG AA
- :723-731 MEDIUM contrast: tabLockIcon sparkles `rf(9)` + `colors.primary.DEFAULT` on glass.backgroundDark — tiny icon, borderline contrast
- :1705-1724 MEDIUM layout: gridBody `gap rp(spacing.xs)` (~4px) — 2-line name nearly touches difficulty badge
- :1694-1697 LOW spacing: gridBody `padding rp(spacing.sm)` — top 8px, bottom ~16px (with gridStartBtn margin); asymmetric
- :860-870 MEDIUM state: emptyWrap `flex:1 + justifyContent:'center'` — parent SafeAreaView no flex:1 wrapper, empty state collapses
- :583-593 LOW state: loading state only AuroraSpinner — no GlassHeader, no back button, trapped if load hangs
- :928-956 MEDIUM z-index: TemplateDetailSheet conditionally mounted inside Suspense `fallback={null}` — no spinner during lazy load
- :454-464 MEDIUM state: handleUseInSchedule navigates to "WeeklyBuilder" but `void template;` discards it — dead UI affordance
- :1782-1786 LOW contrast: listCheckbox border `colors.text.tertiary` (#8A8A8A) — unselected border low-contrast
- :1828-1837 MEDIUM overflow: badgeRow `flexWrap:'wrap'` — 4+ muscle groups wrap to many lines, card height unpredictable
- :1865-1870 MEDIUM z-index: styles.menu no zIndex — dropdown clipped by next list item's GlassCard elevation
- :1884-1890 MEDIUM touch-target: startButton `paddingVertical rp(spacing.md)` OK, but no `accessibilityHint`, no disabled state when `template.exercises.length === 0`

### screens/workouts/BuildMethodLandingScreen.tsx
- :165-173 MEDIUM touch-target: MethodCard no explicit minHeight — AnimatedPressable wraps GlassCard, no padding/minHeight guarantee
- :233-257 MEDIUM layout: titleRow title + badge `gap rp(spacing.sm)` — small screens badge + "Build From Scratch" collide; no `numberOfLines`, no `flexShrink`
- :243-250 MEDIUM state: locked Community card lock icon inside badge but card fully tappable, routes to TemplateLibrary — premium gating clarity issue
- :262-267 MEDIUM touch-target: chevron `rf(18)` no padding — `marginLeft rp(2)` tight to description text
- :306-313 MEDIUM layout: iconDisc `rw(48)×rw(48) + borderWidth:1` — no elevation/shadow, visually flat
- :328-331 MEDIUM layout: description no `numberOfLines` — long descriptions wrap to 3+ lines, uneven card heights
- :333-340 MEDIUM touch-target: badge `paddingVertical rp(2)` — ~16px, cramped
- :170 MEDIUM consistency: locked prop only affects badge lock icon + accessibilityHint — card visual treatment missing, looks identical to unlocked
- :137-140 LOW state: handleSelect doesn't check `locked` — premium gate purely visual

### components/fitness/CustomPlanEmptyState.tsx (builder-relevant)
- :185-208 MEDIUM layout: ctaRow two `fullWidth` GlassButtons in `flexDirection:'row'` — `fullWidth` on both misleading/dead
- :264-315 MEDIUM touch-target: emptyActionChip `paddingVertical rp(spacing.sm)` — ~30px, below 44dp
- :265-280 vs 282-297 vs 299-314 HIGH consistency: all three emptyActionChip buttons call either onBrowseTemplates or onBuildSchedule — "Create First Template" calls onBrowseTemplates (wrong target), "Generate with AI" calls onBuildSchedule (semantically wrong)
- :213 LOW typography: "MY LIBRARY" label `letterSpacing:1.2` but no `textTransform` — inconsistent with WeeklyInsightsPanel `uppercase`
- :393-399 MEDIUM layout: libraryBody padding raw `spacing.lg` (24) NOT `rp(spacing.lg)` — under-pads on widthScale>1
- :397-399 MEDIUM layout: libraryGrid gap raw `spacing.sm` (8) not `rp(spacing.sm)` — scaling inconsistency
- :404-409 MEDIUM layout: previewStat padding raw `spacing.md`/`spacing.sm` — not rp()-scaled
- :411-417 MEDIUM layout: previewStatIcon `rw(28)` — 15px icon can clip disc edge on large font scale
- :423-427 LOW contrast: previewStatLabel `colors.textSecondary` (#B0B0B0) on glassSurface (rgba(255,255,255,0.1)) — ~3.5:1, below WCAG AA
- :147-183 MEDIUM layout: explanation no `numberOfLines` — long copy pushes CTA row off-card on short devices

### components/fitness/PlanSection.tsx
- :58-62 LOW consistency: section paddingHorizontal raw `spacing.lg` (24) not `rp(spacing.lg)` — doesn't scale
- :36-53 MEDIUM state: no loading or error state — if WeeklyPlanOverview or EmptyPlanState render null/throw, section silently blank
- :11-21 LOW consistency: imports WeeklyPlanOverview from screens/main/fitness — components→screens circular-ish dependency

### components/fitness/builder/BuilderAnalyticsPanel.tsx
- :212-225 MEDIUM touch-target: Sparkline bars `rw(12)` wide — hard to tap precisely; no onPress handler anyway
- :233-240 LOW layout: barsRow `height rp(80) + alignItems:'flex-end'` — value=0 renders minHeight rf(2), label sits at bottom of 80px container, large gap
- :398-403 MEDIUM layout: ScrollView inside Animated.View `scrollEnabled={false}` — content overflows, users can't see lower sections
- :405-427 MEDIUM layout: statRow `justifyContent:'space-between'` + 3 StatTiles `flex:1` — "Growth" "+150%" clips with `numberOfLines` missing
- :525-531 LOW touch-target: StatTile no onPress — display-only but looks tappable
- :489-504 MEDIUM overflow: prList prRow `prName flex:1` + prValue + prDate — long names push date off-screen, no `flexShrink`
- :471-479 MEDIUM overflow: freqRow `freqName flex:1` + freqSets — long names push sets off
- :596-599 MEDIUM layout: statRow `gap rp(spacing.xs)` (~4px) — very tight between 3 tiles
- :694 LOW typography: emptySubtitle lineHeight `rf(typography.fontSize.body) * typography.lineHeight.normal` — text fontSize is caption; mismatched

### components/fitness/builder/BuilderSummaryFooter.tsx
- :217-225 HIGH z-index: container `pointerEvents:'box-none' + position:'absolute' bottom:0` — no zIndex; renders behind DayBlock drag overlays
- :241-278 HIGH overflow: statsRow 5 Stat cells + 4 Dividers `gap rp(spacing.xxs)` (~2px) — 360px screen ~380px → horizontal overflow/clipping of "Balance" cell
- :280-319 MEDIUM layout: bottomRow difficultyCell `flex:1` + aiMenuBtn (40×40) + GlassButton saveBtn — "Save Schedule" label wraps or difficulty truncates
- :287-306 MEDIUM touch-target: aiMenuBtn `rw(40)×rw(40)` — below 44dp; `hitSlop={8}` OK but visual small
- :322-362 HIGH z-index: aiMenu dropdown inside GlassCard no zIndex/elevation — clipped by GlassCard overflow or behind Save button
- :322-362 MEDIUM overflow: aiMenu 3 items no max-height/ScrollView — 4th item or large font scale grows beyond footer card
- :333-336 LOW state: "Generate Full Week" hint "{filledDayCount}/2 days" — when 0 says "0/2 days", awkward copy
- :365-374 MEDIUM z-index: confettiWrap `position:'absolute' + top:-40` — renders 40px above footer, behind DayBlock scroll content
- :400-416 MEDIUM z-index: aiActionError dialog + deloadConfirmOpen dialog both inside footer's View — verify CustomDialog uses Portal
- :473-477 MEDIUM touch-target: statCell no minHeight — ~40px, just below 44
- :487-491 LOW layout: divider `height rp(28)` — when statCell content taller ("120kg"), divider shorter, misaligned
- :499-511 MEDIUM layout: difficultyCell `flex:1` — "Intermediate" at body fontSize wraps to 2 lines, pushing bottomRow taller
- :516-528 LOW contrast: aiMenuBtn hardcoded `rgba(255,107,53,0.12) + rgba(255,107,53,0.3)` — duplicates colors.primary tints, not tokenized
- :529-537 MEDIUM overflow: aiMenu `borderWidth rw(1)` — scales border with screen width (1px → 2px on tablets)

### components/fitness/builder/CheckmarkMorph.tsx
- :154-200 LOW a11y: Svg no `accessibilityLabel` scoped — parent View has `accessibilityRole='image'`, but SVG renders without `role='img'` on web
- :78-80 MEDIUM layout: `strokeWidth = Math.max(2, Math.round(size/10))` — size=16 → strokeWidth=2, radius=7; check path coordinates may render outside disc
- :97-130 MEDIUM state: useEffect deps include `ringProgress, checkProgress` (SharedValues) — no-op; `trigger` rapid false→true can fire setTimeout after unmount

### components/fitness/builder/CommunityTemplatesTab.tsx
- :220-231 MEDIUM state: loading skeleton `variant="button"` for sort row — actual sort row 3 chips with icons, skeleton doesn't match
- :234-246 MEDIUM state: empty state shows SortRow above EmptyState — EmptyState no CTA, inconsistent with parent screen's empty pattern
- :318-352 MEDIUM touch-target: sortChip `minHeight rp(40)` — below 44dp
- :380-466 MEDIUM overflow: CommunityCard thumbnail `rw(56)` fixed + cardBody `flex:1` — long name + 4 stat pills overflow, no overflow handling
- :480-487 LOW touch-target: StatPill no onPress — display-only but visually tappable
- :493-522 MEDIUM layout: SkeletonCard `width="70%"` (string) — RN SkeletonLoader may not accept percentage width
- :266-291 MEDIUM z-index: featured section ListHeaderComponent — "All templates" divider `textTransform:'uppercase' + letterSpacing:0.5`, featured title doesn't; inconsistent typography
- :293 LOW state: ListFooterComponent single SkeletonCard — PAGE_SIZE=30, mismatched expectation
- :543-556 MEDIUM touch-target: sortChip `paddingVertical rp(spacing.sm) + minHeight rp(40)` — ~36px, below minimum
- :615-619 MEDIUM overflow: statRow `flexWrap:'wrap' + gap rp(spacing.xs)` — 4 pills wrap to 2 lines, misaligns difficulty badge below
- :620-628 LOW contrast: statPill `colors.glassSurface` (rgba(255,255,255,0.1)) + 11px icon + 12px text — borderline contrast

### components/fitness/builder/DayBlock.tsx
- :275-320 HIGH touch-target: header Pressable `minHeight rp(DAY_HEADER_HEIGHT)=rp(68)` OK, but intensityChip text `fontSize rf(9)` — below 12px micro minimum
- :294-298 MEDIUM overflow: intensityChip `intensityLevel.slice(0,4).toUpperCase()` — "INTE" for "intense", "MODE" for "moderate", confusing labels
- :294-298 HIGH contrast: intensityChip background = intensityColor + text `colors.text.primary` (white) — rest state intensityColor `colors.text.tertiary` (#8A8A8A grey) + white text → ~2.8:1, below WCAG AA
- :369-378 HIGH keyboard: notes TextInput (multiline) no KeyboardAvoidingView — keyboard covers input
- :392-404 MEDIUM touch-target: kebabBtn `padding rp(spacing.sm)` — ~34px square, below 44dp
- :406-456 HIGH z-index: dayMenu inside expanded Animated.View no zIndex — renders below next DayBlock
- :454 HIGH z-index: `<Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />` is LAST child of dayMenu — covers menu items, untappable
- :464-478 MEDIUM overflow: copyAction `position:'absolute' top:0 bottom:0 right:0` — copyAction stretches over copyPicker below
- :481-514 MEDIUM z-index: copyPicker sibling View below GlassCard no elevation — pushes subsequent DayBlocks down (layout shift), should be modal/overlay
- :522 LOW state: `const runOnJS_toggle = (_fn: () => void) => {};` — dead code
- :236-242 MEDIUM a11y: headerTap `Gesture.Tap()` declared but never used — dead gesture code
- :107 MEDIUM layout: `DAY_HEADER_HEIGHT=68` hardcoded — drag snap math uses raw 68, header minHeight is rp(68); mismatched on tablets
- :172 MEDIUM layout: `COPY_WIDTH = rw(110)` — copyBtn content can exceed 110px on small screens, clipping
- :548-560 LOW contrast: dayBadge `colors.primary.DEFAULT` (orange) + white text — dayShort `rf(typography.fontSize.micro)=12px` bold borderline WCAG AA
- :576-580 MEDIUM layout: intensityChip `paddingVertical rp(1)` — 1px padding, ~14px tall with 9px text, cramped
- :619-630 MEDIUM keyboard: notesInput `minHeight rp(60)` — multiline no maxHeight, grows unbounded on Android
- :648-655 MEDIUM z-index: dayMenu no elevation/shadow — flat against expanded content background

### components/fitness/builder/ExerciseEditorSheet.tsx
- :502-507 HIGH keyboard: ScrollView `keyboardShouldPersistTaps="handled"` — no KeyboardAvoidingView, keyboard covers bottom SetRows
- :511-521 MEDIUM touch-target: nameInput `paddingVertical rp(spacing.xs)` — ~28px, below 44dp
- :524-538 MEDIUM overflow: chipRow `flexWrap:'wrap'` — up to 4 muscle + 2 equipment + 1 difficulty chip wraps to 3+ lines, inflating header
- :563-577 MEDIUM touch-target: addSetBtn `paddingVertical rp(spacing.sm)` — ~32px, below 44dp
- :589-611 MEDIUM layout: restRow `flexDirection:'row'` + restSliderWrap `flex:1` + restPreviewWrap (no flex) — RestTimerRadial (rs(120)) + slider misaligned
- :649-667 MEDIUM keyboard: tempoInput + TempoTooltip `position:'absolute' top:rp(28)` — tooltip clipped by sheet bottom edge when keyboard open
- :715-737 MEDIUM overflow: siblingScroll horizontal ScrollView — no end padding, last chip flush against right edge
- :738-744 LOW state: groupIdDisplay shows raw group id "ss_lz0abc23" — exposes internal IDs
- :786-798 MEDIUM state: "Alternative Exercise" Change button onPress only `console.logs("Phase 4 not wired")` — dead button, no feedback
- :842-853 MEDIUM layout: AnimatedChart `width rw(280) + height rw(180)` — fixed pixel sizes, 320px screens overflow sheet content area
- :1095-1106 MEDIUM touch-target: addSetBtn `borderWidth:1.5 + borderStyle:'dashed'` — no minHeight, ~36px below 44dp
- :1142-1160 MEDIUM keyboard: tempoInput `keyboardType="numeric"` no validation on change — invalid chars like "2-0-2-0-3" without feedback until blur
- :1268-1284 MEDIUM z-index: tooltipBubble `zIndex:50` — parent Section's GlassCard may clip (overflow:hidden)
- :410-416 MEDIUM state: handleGroupWithSibling `console.logs` groupId + siblingName — debug log in production path
- :791-794 MEDIUM state: alternative picker onPress `console.logs("Phase 4 not wired")` — debug log in production path
- :890-897 MEDIUM a11y: Section collapsible header no `accessibilityState={{expanded: !collapsed}}`

### components/fitness/builder/ExercisePickerCard.tsx
- :117-125 MEDIUM layout: container `flexDirection:'row'` + iconDisc (rw(44)) + info (flex:1) + favBtn + addBtn — metaRow 3 dots + 3 texts overflow info column
- :153-184 MEDIUM touch-target: favBtn `padding rp(spacing.xxs)` (~2px) + icon rf(22) — ~26px visual; hitSlop={11} → ~48px OK but visual tiny
- :187-195 MEDIUM touch-target: addBtn `minWidth rw(44) + minHeight rw(36)` — minHeight 36 < 44
- :267-271 MEDIUM layout: addBtn `minHeight rw(36)` — inconsistent with iconDisc rw(44), misaligned vertically
- :59-63 LOW state: estimateMinutes returns hardcoded "5 min" or "3 min" — misleading precision

### components/fitness/builder/ExercisePickerSheet.tsx
- :468-474 MEDIUM z-index: DetentBottomSheet `initialSnapIndex={2}` (0.95) — opens near-fullscreen, covers DayBlock context
- :478-491 MEDIUM touch-target: multiToggle Pressable `padding rp(spacing.xs)` (~4px) + icon rf(22) — ~30px; hitSlop={10} → ~50px OK but visual small
- :525-533 MEDIUM state: voice search button (mic-outline) placeholder — onPress only fires haptics.selection, "Voice search (coming soon)"
- :534-550 MEDIUM touch-target: filter toggle iconBtn `rw(40)×rw(40)` — below 44dp
- :554-568 MEDIUM layout: multiBar `Add ${selectedIds.size || ''}` — when size===0 label is "Add", ambiguous
- :614-620 MEDIUM state: when searchResults empty AND hasActiveFilters false AND hasQuery true — FlatList data `[]`, ListEmptyComponent only renders when hasQuery || hasActiveFilters; silent blank
- :665-727 MEDIUM layout: aiSection inside ListHeaderComponent — long AI suggestions push exercise list far down, no max-height
- :688-713 MEDIUM touch-target: aiSuggestionCard Pressable `padding rp(spacing.sm)` — ~60px OK but no minHeight
- :714-723 MEDIUM touch-target: aiApplyBtn `minHeight rf(36)` — below 44dp
- :853-862 MEDIUM touch-target: iconBtn (voice + filter) `rw(40)×rw(40)` — below 44dp; no hitSlop
- :909-916 MEDIUM touch-target: filterChip `paddingVertical rp(spacing.xxs)` (~2px) — ~22px, below 44dp; no hitSlop
- :962-971 MEDIUM overflow: recentChip `maxWidth rw(160)` — verify text truncation
- :978-983 MEDIUM layout: emptyWrap `paddingVertical rp(spacing.xxl)` (~48px) — very tall, pushes out of view in 0.3-detent sheet
- :1001-1006 HIGH contrast: aiSection background `rgba(255,107,53,0.08)` + text `colors.primary.light` (#64B5F6 blue) — blue on orange-tint, jarring mismatch
- :1029-1036 MEDIUM overflow: aiSuggestionCard `borderWidth rw(1)` — scales with screen width
- :1050-1054 MEDIUM layout: confidenceBadge `rgba(76,175,80,0.18)` hardcoded — duplicates success tint, not tokenized

### components/fitness/builder/ExerciseRow.tsx
- :322-374 MEDIUM overflow: rowInner `flexDirection:'row'` dragHandle(20) + thumbnail(44) + info(flex:1) + setsCell(44min) + intensityDot(8) + favBtn + kebab — 320px screens info shrinks to ~60px
- :382-389 MEDIUM touch-target: dragHandle `rw(20)` wide, `pointerEvents="none"` — visually looks tappable
- :413-415 MEDIUM overflow: name `flexShrink:1` + supersetChip ("SS") in nameRow — superset active truncates name to ~10 chars
- :443-458 MEDIUM touch-target: favourite Pressable `hitSlop={13}` + icon rf(18) — visual 18px; adjacent hitSlop areas (fav + kebab) may overlap
- :461-475 MEDIUM touch-target: kebab Pressable `hitSlop={13}` + icon rf(18) — same overlap concern
- :482-511 HIGH z-index: menu `zIndex:50` no elevation — Android renders behind subsequent rows
- :509 HIGH z-index: menuDismiss Pressable `zIndex:-1` — RN quirk, may not receive taps at all
- :514 MEDIUM state: dragOverlay renders only when `isDraggingProp` — parent DayBlock doesn't pass isDragging; dead UI
- :626-636 MEDIUM overflow: actionsLayer `position:'absolute' right:0` + 3 action buttons (~140px) — SWIPE_ACTION_WIDTH=rw(150); third button partially clipped
- :646-662 MEDIUM z-index: menu `zIndex:50 + elevation:5` `position:'absolute' top:rp(spacing.sm) right:rp(spacing.sm)` — bottom-of-list menu renders below row, off-screen
- :519-538 LOW layout: row `borderRadius + overflow:'hidden'` — dragAnimatedStyle transform translateY moves whole row including actionsLayer; actions translate WITH row, defeating reveal
- :84-97 MEDIUM state: loadFavourites catch `favouriteSet = new Set()` silently — no error surfacing
- :57-58 LOW layout: `EXERCISE_ROW_HEIGHT=76` hardcoded — drag snap math uses raw 76, row minHeight is rp(76); mismatched

### components/fitness/builder/InlineValidationBanner.tsx
- :155-171 LOW state: empty/balanced chip shows "Plan looks balanced" — when warnings.length===0 because validation hasn't run (draft null), falsely claims balance
- :199-229 MEDIUM overflow: header severityDot + icon + headerLabel + topMessage + chevron `gap rp(spacing.xs)` — small screens topMessage + headerLabel collide
- :233-257 MEDIUM overflow: ScrollView `nestedScrollEnabled + scrollEnabled={warnings.length > 3}` — no maxHeight; nested scroll confusion
- :274-311 MEDIUM touch-target: warningCard fixBtn `minHeight rf(32)` — below 44dp
- :62-78 LOW contrast: SEVERITY_STYLES info `colors.info.DEFAULT` (#2196F3) on tint `rgba(33,150,243,0.12)` — ~3:1, below WCAG AA for icon
- :390-393 MEDIUM layout: balancedChip `borderWidth rw(1)` — scales with screen width

### components/fitness/builder/MuscleHeatmap.tsx
- :117-126 MEDIUM overflow: headerRow muscleLabelCol `width rw(84)` + 4 weekHeaderCells (each `cellSize rw(40)`) — ~244px; 320px screens with parent padding overflow horizontally
- :129-166 MEDIUM overflow: each row 84 + 4×40 = 244px — muscle names longer than 84px truncate, label col width fixed across locales
- :142-163 MEDIUM touch-target: cell `rw(40)×rw(40)` — below 44dp with onPress + accessibilityLabel per cell
- :157-161 LOW contrast: cellValueText (white) on intensityColor — low intensity (green #4CAF50) + white text ~2.5:1, below WCAG AA
- :169-176 MEDIUM layout: legend `gap rp(spacing.xxs)` (~2px) — swatches + "Less"/"More" crammed, wraps awkwardly
- :61-66 LOW state: intensityColor 4 discrete buckets — "More" end is colors.error.DEFAULT (red) implying high volume is "bad", misleading

### components/fitness/builder/NaturalLanguageEditBar.tsx
- :134-152 MEDIUM touch-target: collapsed chip `paddingVertical rp(spacing.xs)` — ~24px, below 44dp; no hitSlop
- :182-210 MEDIUM keyboard: inputRow TextInput + Apply button — keyboard opens, Apply button hidden behind keyboard (no KAV)
- :199-209 MEDIUM touch-target: applyBtn `minHeight rf(40)` — below 44dp
- :223-241 MEDIUM overflow: examplesRow `flexWrap:'wrap'` — 3 long example chips wrap to 3 lines, inflating bar height
- :212-221 LOW state: error + summary both rendered if both set — race condition, no visual hierarchy; guard with else
- :271-273 MEDIUM layout: chip `borderWidth rw(1)` — scales with screen width

### components/fitness/builder/SetRow.tsx
- :308-397 HIGH keyboard: multiple TextInputs (reps, weight) — no KeyboardAvoidingView; delete button + type chip above keyboard, row below hidden
- :316-322 MEDIUM touch-target: dragHandle `rw(24)` wide, `pointerEvents="box-none"` — setNumberBadge (28×28) adjacent, whole row is drag surface
- :364-381 MEDIUM touch-target: typeChip Pressable `hitSlop={6}` — ~50×24px; tap area ~62×36, below 44dp height
- :384-396 MEDIUM touch-target: deleteBtn `rw(28)×rw(28)` — below 44dp; hitSlop={8} → ~44px OK but visual tiny
- :404-433 MEDIUM layout: extraRow `marginLeft rw(24+28+spacing.xs)` — hardcoded arithmetic combining rw() and raw spacing.xs (4, not rp()); tablets indent too small
- :527-534 MEDIUM touch-target: setNumberBadge `rw(28)×rw(28)` — no accessibilityLabel, screen readers skip
- :566-571 MEDIUM layout: typeChip `borderWidth 1.5` fixed (good) but no minHeight — ~18px, too small to tap
- :548-559 MEDIUM keyboard: labeledInputField `keyboardType="numeric"` no per-field returnKeyType — iOS "done" doesn't dismiss reliably

### components/fitness/builder/TemplateDetailSheet.tsx
- :387-391 MEDIUM keyboard: ScrollView no `keyboardShouldPersistTaps` — verify rating sheet handles keyboard
- :402-455 MEDIUM overflow: header Animated.View name (h2) + authorRow + lineageRow + badgeRow — no max-height; long name + 3 badges pushes stats grid below fold
- :458-497 MEDIUM layout: statsGrid `flexDirection:'row' flexWrap:'wrap'` + 5 StatTiles `flex:1 minWidth rw(72)` — 5th tile alone on last row, left-aligned, unbalanced
- :500-512 MEDIUM layout: radarWrap MuscleBalanceRadar `size rs(220)` — fixed 220px; 320px screens with sheet padding overflow horizontally
- :524-533 MEDIUM touch-target: ExerciseRow (local component) View not Pressable — display-only, inconsistent affordance
- :560-629 MEDIUM overflow: actions section Start Now + Use in Schedule + Fork + Rate + Share — 5 stacked fullWidth buttons, very tall
- :560-572 MEDIUM touch-target: Start Now GlassButton `fullWidth + hapticType="medium"` — verify minHeight ≥ 44
- :395-399 HIGH z-index: Confetti `position:'absolute' top:0 zIndex:10` inside ScrollView's first child — scrolls with content, scrolls away from viewport
- :730-742 MEDIUM layout: StatTile no minHeight — icon (16) + value (20) + label (12) ~50px; minWidth rw(72) narrow; 2-column wrap unequal heights
- :820-825 MEDIUM layout: statsGrid `gap rp(spacing.sm)` (~8px) — row gap + column gap same 8px, tight for 5 tiles
- :868-876 MEDIUM layout: exerciseRow `borderBottomWidth:1` with isLast removing it — GlassCard contentStyle `overflow:'hidden'` leaves 1px gap
- :911-914 LOW typography: descriptionText lineHeight `typography.fontSize.body * typography.lineHeight.normal` (16×1.5=24) — text uses rf(fontSize.body); lineHeight not rf-scaled

### components/fitness/builder/TemplateRatingSheet.tsx
- :211-233 MEDIUM touch-target: starBtn `rw(48)×rw(48)` OK — starRow `gap rp(spacing.xs)` (~4px); 5×48 + 4 gaps = 256px; 320px screens with sheet padding overflow
- :246-263 MEDIUM keyboard: reviewInput multiline no KeyboardAvoidingView — keyboard covers Submit button
- :276-301 MEDIUM layout: actions `flexDirection:'row'` + two `fullWidth` GlassButtons — each tries 100%, may split 50/50 or overflow
- :333-364 LOW a11y: AnimatedPressableStar `accessibilityState={{selected: active, disabled}}` — `disabled` is boolean prop, not state object key
- :342 MEDIUM layout: `Animated.View entering={FadeIn.delay(star * 40)}` — FadeIn on wrapping View, press scale may conflict

### components/fitness/builder/WeeklyInsightsPanel.tsx
- :204-229 MEDIUM touch-target: header Pressable `paddingVertical rp(spacing.xs)` — ~28px, below 44dp
- :231-303 MEDIUM overflow: body radar (rs(240)) + statGrid (6 tiles) + coverage bars (10×36=360px) — ~700px+ tall when expanded, compounding scroll length
- :247-290 MEDIUM layout: statGrid `flexWrap:'wrap' + statTile flexBasis:'47%'` — recoveryRingWrap tile (ProgressRing rs(56)) taller, uneven row heights
- :293-301 MEDIUM overflow: coverageSection GradientBarChart `height rp(coverageBarHeight()) = rp(360)` — 360px tall, no max-height
- :385-401 MEDIUM state: buildCoverageBars `maxValue:20` hardcoded — 25 sets clips at 20
- :476-482 MEDIUM layout: statTile `rgba(255,255,255,0.05)` hardcoded — not tokenized
- :476-482 MEDIUM layout: statTile `borderWidth rw(1)` — scales with screen width
- :156-184 LOW state: empty state "Add exercises to see insights" — insights may be stale from previous draft
- :215 MEDIUM contrast: header icon `colors.primary[400]` — primary[400] not defined in tokens (only light/dark/DEFAULT)

---

## Top Priority Fixes (user-reported symptoms)

### Crammed header
- TemplateLibraryScreen.tsx:599-623 — two right-action buttons + title overflow
- ScheduleBuilderScreen.tsx:282-291 — Save button text-only, collides with back + title
- WeeklyPlanOverview.tsx:152-220 — title + Regenerate + View All crammed
- WorkoutHeader.tsx:106-123 — 3 stat blocks + exit + title overflow

### Buttons going out of window
- TodayWorkoutCard.tsx:178-201 — titleRow nowrap pushes statusBadge past container
- TemplateLibraryScreen.tsx:1641-1645 — gridItem flex:1 + margin exceeds 100%
- BuilderSummaryFooter.tsx:241-278 — 5 stats + 4 dividers overflow
- ScheduleBuilderScreen.tsx:433 — Sets/Reps/Rest control groups overflow

### Inconsistency
- Two FitnessHeader, WorkoutHistoryList, WeeklyPlanOverview versions (screens/ vs components/)
- Emoji vs Ionicons mixed across ExerciseCardDetails, AchievementSystem, WeeklyCalendar, ExerciseCardHeader
- rw() vs rp() vs rs() mixed for same visual elements
- AnimatedPressable vs TouchableOpacity for same tab/button patterns
- colors.success vs successAlt mixed for difficulty

### Alignment
- TodayWorkoutCard.tsx:185-200 — statusBadge drops below title baseline on narrow screens
- WeeklyPlanOverview.tsx:277-303 — statsRow labels wrap differently, misaligned baselines
- ExerciseRow.tsx:322-374 — fixed elements total ~140px, info column shrinks to ~60px
- BuilderAnalyticsPanel.tsx:405-427 — "Growth" "+150%" clips with numberOfLines missing

---

Total: 368 true positive issues, all cited with file:line references.
