# FitAI UI/UX Audit Wave 3 — 540+ True Positive Issues

Audit date: 2026-07-26
Scope: All remaining screens (home, analytics, profile, auth, cooking, details, common, ui, errors, achievements, charts) + re-audit of fixed workout screens for regressions
Method: 4 parallel agents, code-level verification, file:line citations

This audit covers screens NOT in the original Wave 1/2 fix scope, plus a regression re-audit of fixed workout screens.

## Summary

| Agent | Scope | Issues |
|-------|-------|--------|
| E1 | home + analytics + charts | ~130 |
| E2 | profile + auth + cooking + advanced | ~150 |
| E3 | common + ui + errors + details | ~145 |
| E4 | regression re-audit of workout screens | ~150 |
| **Total** | | **~575** |

## Critical Regressions Found in Wave 1/2 Fixes

E4 found ~25 REGRESSIONS introduced by the Wave 1/2 fix agents. Highest priority — must fix before any new work:

### REGRESSIONS (fix immediately)

1. **FitnessHeader.tsx:88-91** — emoji→Ionicons fix kept `notifications-outline` icon but `accessibilityLabel="Calendar"` and `onCalendarPress` handler. Label/icon/handler all mismatched.
2. **FitnessHeader.tsx:99-107** — 100% state renders `progressIndicatorDone` with `minWidth:rw(18)` while active uses `minWidth:rw(28)` — badge width jumps at 99→100%.
3. **RecoveryTipsModal.tsx:215-219** — KAV added but modal has NO TextInputs. KAV is dead code, `keyboardVerticalOffset:40` shifts content 40px down unnecessarily.
4. **RecoveryTipsModal.tsx:343** — scrollView maxHeight raised from `rh(400)` to `rh(560)` making it WORSE — on small phones (rh<724) scrollView 560 + header ~80 + footer ~80 = 720 exceeds viewport, footer pushed off-screen.
5. **WorkoutSessionScreen.tsx:736** — `SafeAreaView edges={["bottom"]}` only, but `WorkoutHeader paddingTop={Math.max(insets.top,12)}` double-pads top on notched devices.
6. **WorkoutSessionScreen.tsx:861** — emoji→Ionicons fix missed `warmupDoneText` using literal '✓' and 'Done' characters.
7. **WorkoutDetailScreen.tsx:1060-1063** — `headerStartBtn` style sets `minHeight:rf(36)` which overrides GlassButton's default 44px min — explicit 36px clamp reduces touch target below 44px.
8. **ScheduleBuilderScreen.tsx:632-636** — KAV `keyboardVerticalOffset={Platform.OS==="ios"?40:0}` uses magic 40 — risk of double-padding on iOS if BottomSheet already offsets.
9. **TemplateLibraryScreen.tsx:1530** — `scheduleBtn` `minHeight Math.max(rw(36),36)` — clamp floor is 36 not 44, button stays below 44px.
10. **ExerciseInstructionModal.tsx:308-310** — KAV `keyboardVerticalOffset:40` adds 40px top-padding but BottomSheet already positions content above keyboard — double-padding on iOS.
11. **ExerciseInstructionModal.tsx:323** — `minHeight:Math.max(rp(44),44)` on tab — `rp(44)` already scales ≥44 on phones, Math.max redundant; on tablets rp(44)≈52px makes tabs taller than design.
12. **ExerciseInstructionModal.tsx:137** — `instructionText numberOfLines={5}` hard-truncates long instructions with no "Read more" affordance — dead-end.
13. **ExerciseCard.tsx:416-417** — playButton uses `Math.max(rs(44),44)` but sibling completedBadge uses raw `rs(32)` — toggling complete/incomplete shifts right-side element size by 12px, title baseline jumps.
14. **ExerciseCard.tsx:432** — timerDisplay background hardcoded `rgba(245,158,11,0.2)` bypasses token system — fix swapped solid `colors.warning` for hardcoded amber tint instead of tokenized tint.
15. **ExerciseSessionModal.tsx:696-700** — progressDotActive width:rs(14) with white border vs completed rs(10) with orange fill — active dot looks like different state than completed.
16. **CustomPlanEmptyState.tsx:265-297** — all three emptyActionChip buttons call WRONG handlers — "Create First Template" calls onBrowseTemplates, "Generate with AI" calls onBuildSchedule (semantically wrong).
17. **AchievementNotifications.tsx:66** — toastAchievement.icon still rendered as Text emoji — workout components migrated emoji→Ionicons.
18. **components/fitness/FitnessHeader.tsx:84-88** — uses `name="calendar"` icon but `screens/main/fitness/FitnessHeader.tsx:83` uses `name="notifications-outline"` — two components same name different icons.
19. **WeeklyCalendar.tsx:210-213** — fix swapped emoji "😴" to Ionicons "moon" for rest but kept text "✓"/"•" for workout indicators — inconsistent: rest uses Ionicons, workout uses text chars.
20. **WeeklyPlanOverview.tsx:317-319** — `dayCircle Math.max(rw(36),44)` inflates circles from 36px to 44px — 7 × 44px = 308px + label widths overflow 320px screen with parent padding.
21. **components/fitness/exercise-card/ExerciseCardDetails.tsx:31** — parent colors difficulty icon with getDifficultyColor (green/amber/red) but child always uses colors.textSecondary, losing semantic color coding.
22. **ExerciseCardHeader.tsx:39-42** — child exerciseName has numberOfLines+adjustsFontSizeToFit but parent ExerciseCard.tsx:129-136 has NONE — long names wrap in parent, truncate in child.
23. **ExerciseCardSections.tsx:66** — numberOfLines={5} on instructionText silently truncates long instructions after 5 lines with no "show more" affordance.
24. **ExerciseCardTimer.tsx:36** — rgba(245,158,11,0.2) amber tint + colors.warningAlt text — amber-on-amber ~2.8:1, fails WCAG AA.
25. **GifPlayerContent.tsx:136-144** — gifContainer has native shadow props AND `boxShadow` — boxShadow is web-only and warns on React Native.
26. **FullscreenModal.tsx:32-33** — comment claims clamp to 480/900 but dimensions returns raw screenWidth/screenHeight WITHOUT clamping — on web/desktop GIF balloons to full screen width.
27. **ExerciseTipsCard.tsx:12** — imports raw colors object while every sibling imports flatColors as colors.
28. **ExerciseTipsCard.tsx:44** — `fontWeight:String(typography.fontWeight.bold) as any` casts to any to bypass typing.
29. **InstructionSteps.tsx:39** — numberOfLines={5} on instructionText truncates long steps silently, no "show more" affordance.
30. **TabNavigation.tsx:16-42** — uses TouchableOpacity, original audit flagged this; fix did not migrate to AnimatedPressable.
31. **MuscleHeatmap.tsx:70-73** — isLightCell returns true ONLY for colors.success.DEFAULT (green) — warning (orange) and primary (orange) also need dark text.
32. **ExerciseRow.tsx:519-524** — row style overflow:hidden + borderRadius — dragAnimatedStyle transform translateY moves whole row INCLUDING actionsLayer — actions translate WITH row, defeating swipe-reveal.
33. **ExercisePickerSheet.tsx:909-911** — filterChip `minHeight Math.max(rp(36),36)` — clamp floor is 36 not 44, below 44px minimum.
34. **InlineValidationBanner.tsx:395** — balancedChip `minHeight Math.max(rp(36),36)` — clamped to 36px floor, below 44px.
35. **InlineValidationBanner.tsx:473** — fixBtn `minHeight Math.max(rf(32),44)` — uses rf (font-scaling) instead of rp (width-scaling); on large font scale grows huge.
36. **SetRow.tsx:570** — typeChip `minHeight Math.max(rp(28),32)` — clamped to 32px floor, below 44px.
37. **NaturalLanguageEditBar.tsx:376** — exampleChip `minHeight Math.max(rp(36),36)` — clamped to 36px floor, below 44px.
38. **components/workout/* (ExerciseCard, WorkoutErrorState, WorkoutNavigation, AchievementNotifications)** — all still use `flatColors` instead of aurora tokens — Aurora modernization applied unevenly.
39. **SetLogModal.tsx:751** — widespread fragile hex-append pattern (`${colors.warning.DEFAULT}22/66`, `${colors.primary.DEFAULT}1A/40`, etc.) — same anti-pattern the fix was supposed to eliminate.
40. **AchievementNotifications.tsx:132** — boxShadow (lines 132,184) is web-only CSS — ignored on native React Native, dead code.

---

## Agent E1 — Home + Analytics + Charts (130 issues)

### src/screens/main/home/HomeHeader.tsx
- :90 MEDIUM a11y: Avatar fallback `(userInitial || '')` renders empty circle when no initial. Pass '?' or first letter of userName.
- :108 MEDIUM typography: dateText uses `opacity: 0.75` on top of colors.text instead of using colors.textSecondary token; opacity-based dimming inconsistent.
- :138 LOW touch-target: Notification button hitSlop left:4 asymmetric vs right:8. Make symmetric.
- :213 LOW consistency: rightSection gap:spacing.sm vs headerRow gap:spacing.md — visual rhythm cramped.
- :249 MEDIUM overflow: notificationBadge minWidth:rw(18) at top:-2/right:-2 with border 2 — can clip outside 40px button bounds on small screens.

### src/screens/main/home/DailyProgressRings.tsx
- :89 HIGH state: useEffect deps `[progress]` omit `delay`; animation won't re-trigger when delay changes.
- :195 MEDIUM layout: outer ring rw(140) + strokeWidth rw(9); gap between Move and Exercise ring stroke edges only ~4px. Increase ring size deltas.
- :316 HIGH consistency: Move stat shows raw integers, Steps stat uses toLocaleString(). Inconsistent number formatting.
- :354 CRITICAL consistency: "Nutrition" stat shows `{mealsLogged}/{mealsGoal} kcal` — mealsGoal is meal count, not calories. Unit "kcal" is wrong/misleading.
- :387 MEDIUM layout: container minHeight:rw(148) fixed; rings(140) + GlassCard padding md(16×2) = 172 > 148. minHeight ignored.
- :463 LOW contrast: sourceLabel opacity:0.7 on colors.textSecondary (#B0B0B0) — effective contrast below WCAG AA.
- :466 LOW a11y: stepsSource label "via {name}" has no accessibility description.

### src/screens/main/home/QuickActions.tsx
- :107 MEDIUM overflow: badge positioned top:-4/right:-4 on iconCircle inside ScrollView with no vertical padding — badge can be clipped.
- :178 MEDIUM touch-target: badge minWidth:rw(18) / height:rw(18) — 18px with 9px font below readable minimum.
- :191 LOW typography: badgeText fontSize:rf(9) below 12px minimum.

### src/screens/main/home/SmartCoaching.tsx
- :313 MEDIUM a11y: "See All" AnimatedPressable has no accessibilityRole="button" or accessibilityLabel.
- :414 LOW spacing: actionContainer gap:rp(2) (2px) between action text and chevron — cramped.
- :257 MEDIUM overflow: cardDescription numberOfLines={2} with action text row — actionContainer no minWidth, chevron can wrap awkwardly.
- :425 LOW spacing: emptyState paddingVertical:spacing.sm (8px) — too tight.

### src/screens/main/home/TodaysFocus.tsx
- :100 MEDIUM a11y: outer AnimatedPressable has no accessibilityLabel or accessibilityRole="button".
- :200 LOW layout: progressBar height:rh(4) — 4px tall hard to see.
- :211 LOW typography: progressText fontSize:rf(10) below 12px.

### src/screens/main/home/WeeklyMiniCalendar.tsx
- :27 HIGH a11y: DAY_LABELS `["M","T","W","T","F","S","S"]` has duplicate "T" and "S" — cannot distinguish days. Use full abbreviations.
- :70 MEDIUM a11y: statsRow AnimatedPressable no accessibilityRole="button" or accessibilityLabel.
- :166 MEDIUM touch-target: statsRow pressable no minHeight; tap area ~20px tall.
- :90 LOW state: `today = new Date()` recomputed inside map callback 7×. Hoist.
- :196 MEDIUM layout: dayCell width/height rw(34) — 34px; with borderWidth:2 on todayCell, content area shrinks to 30px, checkmark icon may clip.

### src/screens/main/home/MotivationBanner.tsx
- :161 MEDIUM overflow: quoteText and subtextText NO numberOfLines — long quotes grow banner unpredictably.
- :74 MEDIUM contrast: evening gradient rgba(46,125,50,0.85)/rgba(27,94,32,0.95) semi-transparent over dark bg reduces to near-black.
- :124 LOW state: if filteredQuotes empty after goal filter, returns null silently — no fallback.
- :181 LOW touch-target: banner pressable no minHeight — thin banners borderline.

### src/screens/main/home/GuestPromptBanner.tsx
- :46 CRITICAL touch-target: inner "Sign Up" button paddingVertical:spacing.sm (8px) + text ~14px = ~30px tall, below 44px minimum.
- :37 MEDIUM layout: row justifyContent:"center" with icon + text + button; text has flexShrink:1 but no flex:1/minWidth:0.
- :22 MEDIUM a11y: whole card is one pressable triggering sign-up; "Sign Up" pill is visual-only with no separate handler.

### src/screens/main/home/SyncStatusIndicator.tsx
- :195 HIGH contrast: container backgroundColor rgba(255,255,255,0.05) nearly invisible against #0A0F1C bg.
- :217 LOW typography: status fontSize:rf(10) below 12px.
- :221 LOW typography: retryHint fontSize:rf(9) below 12px.
- :223 LOW spacing: retryHint marginTop:1 — 1px gap invisible.
- :113 LOW contrast: default status color colors.textSecondary on rgba(255,255,255,0.05) — effective contrast ~3:1.
- :175 MEDIUM a11y: trailing refresh icon no accessibilityLabel.

### src/screens/main/home/HealthIntelligenceHub.tsx
- :196 MEDIUM layout: metricCell width:'47%' and metricCellFull width:'100%' with flexWrap — 47%+47%+gap may exceed 100%.
- :89 MEDIUM layout: statusBadge paddingVertical:spacing.xs + text rf(11); badge height ~19px, can overlap on long title.
- :207 LOW contrast: insightText colors.textSecondary on glass bg with borderTopColor colors.glassBorder (rgba(255,255,255,0.18)) — divider barely visible.

### src/screens/main/home/HydrationTracker.tsx
- :57 LOW state: fillHeight computed but never used — dead code; dropHeight/dropWidth also unused.
- :237 LOW state: empty `<Text style={styles.statUnit}></Text>` renders empty text node when remainingGlasses > 0.
- :326 MEDIUM layout: dropCenter transform translateY:-10 hardcoded offset; % label not vertically centered for different progress values.
- :377 LOW spacing: quickAddButtons gap:spacing.xs (4px) between three flex:1 buttons — cramped.
- :159 MEDIUM layout: dropSize rw(90) fixed; stats container may overflow on 320px screen.
- :351 LOW typography: statLabel fontSize:rf(10) below 12px.

### src/screens/main/home/AchievementShowcase.tsx
- :86 HIGH layout: progressRingFill uses transform rotate on full border element — rotating 4-sided border does NOT produce true progress arc. Replace with SVG stroke-dashoffset.
- :116 MEDIUM consistency: headerLeft is AnimatedPressable triggering onViewAll, AND separate "View All" button also triggers onViewAll — two duplicate tap targets.
- :259 LOW spacing: countBadge paddingVertical:rp(2) — too tight.
- :298 LOW typography: badgeTitle fontSize:rf(10) below 12px.
- :347 LOW typography: progressPercent fontSize:rf(9) below 12px.

### src/screens/main/home/BodyProgressCard.tsx
- :60 MEDIUM consistency: headerPressable uses raw Pressable instead of AnimatedPressable used everywhere else in home.
- :94 MEDIUM state: TrendChart data fallback `[currentWeight, currentWeight]` renders flat line presented as "trend" — misleading.
- :125 LOW state: progressPercent renders empty `<Text>` when no goalWeight — empty node takes layout space.
- :332 MEDIUM layout: actionDivider height:rh(20) between two flex:1 buttons — divider doesn't span full height.

### src/screens/main/home/SectionHeader.tsx
- :50 MEDIUM touch-target: actionText AnimatedPressable wraps only `<Text>` with no padding/minHeight — tap area ~20px.
- :78 LOW spacing: icon marginRight:spacing.xs (4px) — tight.

### src/screens/main/home/HomeSkeleton.tsx
- :41 MEDIUM consistency: ringsRow renders 3 ring placeholders, actual DailyProgressRings renders 4 concentric rings in ONE container — skeleton misleads.
- :67 MEDIUM consistency: quickActionsRow renders 2 placeholders, QuickActions is horizontal ScrollView with 4+ items.
- :84 LOW state: weekRow renders 7 items but WeeklyMiniCalendar returns null when no weekData — mismatch.

### src/screens/main/analytics/AnalyticsHeader.tsx
- :106 HIGH a11y: `accessibilityRole="text"` is NOT a valid React Native accessibilityRole. Use "summary" or remove.
- :38 MEDIUM layout: Android topPadding uses StatusBar.currentHeight which is null in some contexts; `null || 0` → 0, content overlaps status bar.
- :149 LOW spacing: titleRight gap:spacing.xs (4px) — cramped.
- :178 LOW typography: subtitle marginTop:rp(-2) — negative margin pulls subtitle into title.
- :208 LOW typography: badgeText lineHeight:rf(10) equals fontSize — text baseline cramped.

### src/screens/main/analytics/PeriodSelector.tsx
- :36 MEDIUM state: containerWidth starts 0; segmentWidth 0 until onLayout fires; indicator invisible on first paint.
- :49 MEDIUM state: useEffect deps [selectedIndex, segmentWidth] but translateX.value = withSpring(...) runs on every segmentWidth change — re-animates unexpectedly.

### src/screens/main/analytics/MetricSummaryGrid.tsx
- :384 MEDIUM layout: cardGlass minHeight:rh(105) fixed; with trend row + subtitle, content can exceed 105 and clip.
- :400 MEDIUM overflow: metricValue fontSize:rf(22) with values like "100.0" or "2.5K" in flex:1 card — overflow.
- :366 LOW z-index: container zIndex:3 set without sibling stacking context — unnecessary.
- :416 LOW spacing: trendRow gap:rp(3) — too tight.
- :245 MEDIUM overflow: subtitle string can be long — may wrap and exceed minHeight.

### src/screens/main/analytics/InsightCard.tsx
- :258 LOW spacing: categoryBadge paddingVertical:spacing.xs/2 (2px) — too tight.
- :289 MEDIUM layout: description marginLeft:rw(30) + spacing.sm — hardcoded offset mirroring iconContainer width+margin.
- :296 MEDIUM layout: actionContainer marginLeft:rw(30) + spacing.sm — same fragile hardcoded offset.
- :218 LOW spacing: container marginBottom:spacing.xs (4px) — too tight for list readability.
- :111 MEDIUM a11y: outer AnimatedPressable has no accessibilityLabel.

### src/screens/main/analytics/GoalProgressCard.tsx
- :69 LOW consistency: goalText uses plain `->` arrow text instead of Ionicon arrow.
- :108 MEDIUM consistency: trendCard padding:rw(16) uses width-responsive for vertical; SimpleTrendCard uses rp(16). Inconsistent.
- :96 LOW state: emptyStateValue shows "--" at fontSize rf(28) — large placeholder.
- :161 MEDIUM layout: emptyState gap:rh(8) but emptyStateValue is large rf(28) — gap too tight.

### src/screens/main/analytics/SimpleTrendCard.tsx
- :38 MEDIUM consistency: icon size={20} hardcoded, not rf(20).
- :75 MEDIUM layout: miniChart bar height hardcoded 40/10, not responsive.
- :49 HIGH state: `trend.data[trend.data.length - 1]?.toFixed(1)` returns undefined when data is empty, rendering `{undefined} {unit}` → "undefined kcal".
- :125 MEDIUM layout: trendIconContainer marginRight:rp(12) but container rw(36); icon hardcoded size 20 may not center.
- :196 LOW contrast: ctaButtonText color:colors.background (#0A0F1C) on primary — semantically wrong; use colors.white.

### src/screens/main/analytics/SummaryCard.tsx
- :25 MEDIUM typography: summaryTitle "Xly Summary" — hardcoded English suffix "ly"; no i18n.
- :78 MEDIUM overflow: summaryStatValue fontSize:rf(24) with values like "1000L" — no numberOfLines; overflow.
- :57 LOW a11y: card has no accessibilityLabel; stats read as separate texts.

### src/screens/main/analytics/TrendCharts.tsx
- :137 LOW z-index: container zIndex:1 unnecessary.
- :149 MEDIUM layout: emptyChart minHeight:rh(180) but content ~80px — too much whitespace.
- :52 LOW consistency: weight chart icon hardcoded "trending-down" — assumes weight loss goal.

### src/screens/main/analytics/ProgressTrendsHeader.tsx
- :46 MEDIUM layout: header paddingTop:rh(10) (10px) — too small; screen does not use SafeAreaView.
- :68 MEDIUM overflow: headerTitle fontSize:rf(28) with no numberOfLines.

### src/screens/main/analytics/AchievementShowcase.tsx
- :279 HIGH typography: categoryText fontSize:rf(8) — far below 12px.
- :280 HIGH typography: description fontSize:rf(10) below 12px.
- :298 HIGH typography: progressLabel fontSize:rf(9) below 12px.
- :309 HIGH typography: pts fontSize:rf(10) below 12px.
- :213 MEDIUM contrast: countBadge backgroundColor rgba(255,255,255,0.07) — nearly invisible.
- :247 MEDIUM contrast: rowBorder borderBottomColor rgba(255,255,255,0.06) — below visible threshold.
- :16 MEDIUM layout: ITEM_HEIGHT=68 and VISIBLE_COUNT=3 → containerHeight 220; but rows have paddingVertical:rp(10) (20 total) + icon rw(36) = 56 + progress row ~12 = 88 > 68. Rows exceed ITEM_HEIGHT, scroll clipping.

### src/screens/main/analytics/components/BarChart.tsx
- :43 MEDIUM overflow: barLabel and barValue numberOfLines={1} with fontSize:rf(9)/rf(10) — tiny text.
- :56 MEDIUM layout: barChartContainer height:rh(120) fixed; chart area 96px — bars and labels cramped.

### src/screens/main/analytics/components/ChartCard.tsx
- :91 LOW touch-target: chartIconContainer rw(28) decorative, fine; whole card pressable scale 0.98 — OK.
- :104 MEDIUM overflow: legendContainer flexWrap:wrap with gap:spacing.md — legends wrap to multiple rows unpredictably.

### src/screens/main/analytics/components/LineChart.tsx
- :149 HIGH consistency: emptyChart text hardcoded "No weight data recorded" / "Log your weight" — LineChart is generic. Text should be parameterized.
- :286 HIGH overflow: SelectedPointTooltip Rect at `y = getY(point.value) - rh(35)` — if point value near chartMax, y = -10; tooltip overflows top of SVG.
- :167 HIGH state: calculateTrend sets isPositiveTrend = trend >= 0; for weight-loss goals, weight gain (positive) shows green — semantically wrong.
- :75 MEDIUM layout: CHART_WIDTH fallback rw(300) before onLayout — first paint at 300px then jumps.
- :336 MEDIUM overflow: currentValue fontSize:rf(28) with no numberOfLines — large values overflow.

### src/screens/main/analytics/components/ChartSvgElements.tsx
- :152 HIGH touch-target: data point hit circle r={rw(15)} = 30px diameter — below 44px.
- :61 MEDIUM typography: YAxisLabels SvgText fontSize={rf(9)} — below 12px.

### src/screens/main/analytics/components/StackedAreaChart.tsx
- :41 MEDIUM layout: areaBarBurned position:absolute inside areaBarWrapper with justifyContent:flex-end — consumed bar in normal flow, burned absolute — misleading "stacked" visualization.
- :84 LOW contrast: areaBarConsumed rgba(76,175,80,0.7) and areaBarBurned rgba(255,152,0,0.5) — both semi-transparent; bars washed out.
- :92 LOW typography: areaLabel fontSize:rf(9) below 12px.

### src/screens/main/analytics/components/chartUtils.ts
- :93 HIGH state: isPositiveTrend = trend >= 0 — for weight-loss context, gain (positive) is bad but flagged positive (green).

### src/screens/main/analytics/hooks/usePeriodLabels.ts
- :12 MEDIUM consistency: year labels skip every other month — inconsistent with quarter/month.

### src/components/charts/AnimatedChart.tsx
- :91 MEDIUM layout: paddingLeft=50, paddingRight=20, paddingTop=20, paddingBottom=35 all hardcoded — not responsive.
- :249 HIGH state: percentageChange = ((targetValue - currentValue) / currentValue) * 100 — division by zero if currentValue is 0.
- :413 HIGH consistency: timelineText uses emoji `📅` — violates app's no-emoji convention.
- :354 LOW consistency: start/end Circles r={6} and milestone r={4} hardcoded, not responsive.
- :264 LOW typography: arrowText fontSize:rf(24) for "→" — large; visually heavy.

### src/components/charts/ColorCodedZones.tsx
- :33 HIGH state: `withSpring(\`${zone.percentage}%\`, ...)` passes a STRING to withSpring — Reanimated springs animate numbers, not strings.
- :112 MEDIUM consistency: HEART_RATE_ZONE_COLORS zone3 and zone4 both colors.warning — two adjacent zones identical color.
- :182 MEDIUM layout: zoneInfo width:rp(100) fixed — long zone names may wrap or clip.
- :219 MEDIUM contrast: zonePercentage color:colors.white on colored zone bars — for zone3 (warning #FF9800) white-on-yellow ~2:1, below WCAG.
- :249 LOW spacing: legendGrid gap:spacing.xs (4px) between 5 legend items — cramped.

### src/components/charts/MuscleBalanceRadar.tsx
- :249 MEDIUM state: axisFont useMemo with empty deps — font built once with initial rf(11); doesn't update on font scale change.
- :386 MEDIUM touch-target: tappable hotspots width:rs(28), height:rs(28) = 28px, below 44px; hitSlop:8 brings to 44px — verify.
- :410 MEDIUM overflow: tooltip positioned left/top — for axes on right/bottom edges, tooltip overflows canvas and is clipped.
- :434 LOW consistency: tooltip uses borderRadius:8 hardcoded, not rbr(8).

### src/components/charts/NutritionChart.tsx
- :141 HIGH layout: PieChart width={300} hardcoded — not responsive; on 320px screens overflows.
- :142 MEDIUM layout: PieChart height={180} hardcoded — not responsive.
- :146 LOW consistency: paddingLeft="15" string — inconsistent with numeric paddings elsewhere.
- :296 LOW spacing: macroGrams marginBottom:spacing.xs/2 (2px) — too tight.
- :111 MEDIUM state: targetCalories may be undefined; renders "/ undefined cal".
- :131 MEDIUM state: progressText — if targetCalories undefined, caloriesProgress=0, shows "0% of daily goal" — misleading.

### src/components/charts/ProgressChart.tsx
- :247 MEDIUM layout: LineChart width={Math.max(350, filteredData.length * 50)} — on 320px screens min 350 overflows container.
- :248 MEDIUM layout: height={220} hardcoded — not responsive.
- :101 HIGH state: data: filteredData.map(point => point[metric] || 0) — `|| 0` converts undefined AND legitimate 0 values to 0, masking missing data.
- :319 MEDIUM touch-target: periodButton paddingHorizontal:spacing.sm, paddingVertical:spacing.xs — no minHeight; tap area ~24px.
- :312 LOW spacing: periodSelector padding:spacing.xs/2 (2px) — too tight.

### src/components/charts/WeightProjectionChart.tsx
- :62 MEDIUM layout: padding=40 hardcoded — not responsive.
- :79 MEDIUM layout: minWeight = Math.min(current, target) - 5 — hardcoded ±5 padding; for large weights range too tight.
- :197 HIGH state: milestonePoints uses `point!.x` and `point!.y` non-null assertions — if milestone week doesn't match, crashes.
- :174 LOW consistency: start/end Circles r={6} and milestone r={4} hardcoded, not responsive.
- :291 LOW consistency: legendDot uses rf(8) for width/height — semantically wrong; should use rs(8).

### src/components/charts/WorkoutIntensityChart.tsx
- :287 HIGH touch-target: dayCell width:rs(12), height:rs(12) = 12px — far below 44px; no hitSlop.
- :271 MEDIUM layout: dayLabel height:rs(14) — 14px row height; fontSize xs barely fits, text vertically cramped.
- :285 LOW spacing: weekColumn marginRight:rp(2) (2px) — weeks nearly touch.
- :290 LOW spacing: dayCell marginBottom:rp(2) (2px) — days nearly touch.
- :133 MEDIUM layout: calendarGrid position:absolute, left:rp(20), top:0 — fragile; if dayLabelsContainer width changes, grid misaligns.
- :70 MEDIUM contrast: intensityColors[1] "#1a3d2e" very dark green — on dark bg nearly invisible.
- :92 MEDIUM state: selectedDay typed as any — no type safety.
- :174 MEDIUM state: tapping rest day (no workout) shows nothing, no feedback.

### src/screens/main/AnalyticsScreen.tsx
- :855 LOW consistency: `<View style={{ height: insets.bottom + rh(100) }} />` — inline style + rh(100) on top of scrollContent paddingBottom rh(120) = 220px excessive.
- :776 MEDIUM layout: loadingContainer flex:1 inside ScrollView — flex:1 inside scroll content does not vertically center.
- :904 LOW consistency: breakdownTitle marginBottom:10 hardcoded, not spacing token.
- :911 LOW consistency: breakdownRow paddingVertical:4 hardcoded.
- :914 LOW typography: breakdownLabel fontSize:13 hardcoded, not rf(13).
- :917 LOW typography: breakdownValue fontSize:13 hardcoded.
- :719 MEDIUM a11y: locked screen Ionicons accessibilityLabel missing.

### src/screens/main/ProgressScreen.tsx
- :74 MEDIUM layout: DashboardSkeleton inside non-scroll SafeAreaView+ScrollView — flex:1 may not size correctly.
- :98 LOW consistency: RefreshControl has tintColor AND colors (array) — ProgressTrendsScreen only sets tintColor. Inconsistent.

### src/screens/main/ProgressTrendsScreen.tsx
- :87 MEDIUM consistency: RefreshControl has only tintColor, missing colors (Android) — spinner color may default to system black.
- :77 HIGH state: no loading state — when useProgressTrendsLogic is loading, render with empty/zero data, showing "0 workouts / 0L / undefined kcal".
- :70 LOW spacing: periodSelectorContainer paddingHorizontal:rw(20) but AnalyticsScreen uses spacing.lg (24) — inconsistent.

### src/screens/main/AchievementsScreen.tsx
- :359 MEDIUM touch-target: backButton width:Math.max(rw(10),44) — rw(10)≈10px so always 44; but no borderRadius — square button, inconsistent.
- :234 LOW consistency: arrow-back icon size={24} hardcoded, not rf(24).
- :275 HIGH consistency: statValue uses emoji `🪙` for FitCoins — violates app's no-emoji convention.
- :428 MEDIUM layout: loadingContainer flex:1, marginTop:rh(80) inside SafeAreaView — verify spinner centers.
- :399 LOW typography: statLabel fontSize:rf(10) below 12px.
- :406 MEDIUM layout: statDivider height:rh(32) but statItem has statValue (rf(18)) + statLabel (rf(10)) ≈ 32px — divider matches but on font scale-up divider too short.
- :364 LOW typography: headerTitle fontSize:rf(20) with no numberOfLines — fragile.

---

## Agent E2 — Profile + Auth + Cooking + Advanced (150 issues)

### src/screens/main/profile/ProfileHeader.tsx
- :69-83 MEDIUM touch-target: avatar Pressable hitSlop={8} but avatar rw(80) — fine; however no disabled state, no visual feedback (no opacity/scale) on press.
- :139-142 LOW contrast: memberSince uses colors.text at opacity 0.85 on aurora gradient — text white-on-light-gradient can dip below 4.5:1.
- :88 HIGH overflow: userName Text has no numberOfLines — long names wrap and push memberSince label off-card on small screens.
- :90 MEDIUM a11y: Avatar fallback `(userInitial || '')` renders empty circle when no initial provided.

### src/screens/main/profile/ProfileStats.tsx
- :180-182 HIGH layout: statCardWrapper width "31.5%" with gap rp(spacing.sm) in flexWrap row — three-per-row math plus gaps will overflow to 4th-column wrap on devices where 1% rounding differs.
- :92 MEDIUM overflow: statLabel uses adjustsFontSizeToFit/minimumFontScale 0.75 on single line at fontSize rf(10) — "Achievements" label will shrink to ~7.5px.
- :84-89 MEDIUM layout: statValue (rf(20)) and suffix inline; large values like "10.0k" plus suffix overflow the 31.5% column width.

### src/screens/main/profile/SettingsSection.tsx
- :240 HIGH touch-target: row minHeight rh(60) but chevron/icon tap targets rely on whole-row press — disabled rows (opacity 0.68) still show chevron implying nav.
- :337-339 HIGH layout: dividerContainer paddingLeft uses `rw(36) + spacing.md * 2` — divider indents past the icon, misaligned with row content.
- :327-332 LOW consistency: incompleteDot is rw(8) (8px) — below 10px indicator dot convention.
- :108 MEDIUM consistency: backgroundColor `${item.iconColor || colors.primary}18` appends hex alpha "18" to hex color — breaks if iconColor is rgba().
- :319-325 LOW typography: badgeText fontSize rf(9) below 10px accessibility floor.

### src/screens/main/profile/GuestPromptCard.tsx
- :85-88 HIGH overflow: subtitle Text has no numberOfLines; long subtitle wraps to 3+ lines pushing button below fold.
- :30-50 MEDIUM state: pulse animation runs via RNAnimated.loop unconditionally — never pauses when card offscreen.
- :141 LOW z-index: iconGradient uses boxShadow + elevation 6 nested inside GlassCard with overflow hidden — boxShadow may be clipped.

### src/screens/main/profile/LogoutButton.tsx
- :42-48 MEDIUM a11y: LogoutButton has no accessibilityRole="button" or accessibilityLabel="Sign out" on the AnimatedPressable.
- :80 LOW consistency: content minHeight 44 but GlassCard padding="md" adds vertical padding on top of 44 — actual tap target ~76px, larger than sibling SettingsSection rows (rh(60)).

### src/screens/main/profile/ConnectedAccountsCard.tsx
- :147-151 HIGH layout: divider indentation `paddingLeft: rw(36) + spacing.md * 2` — divider sits under the icon, not under the text, misaligning with email text above.
- :116-118 MEDIUM overflow: email Text numberOfLines={1} but no ellipsizeMode="tail" specified.
- :55-67 HIGH state: Apple account hardcoded isConnected:false with no onApplePress wiring — tapping "Connect" on iOS does nothing.
- :210-215 MEDIUM touch-target: statusBadge has paddingVertical spacing.xs (4px) — total height ~22px.

### src/screens/main/profile/ProfileCompletionCard.tsx
- :147-148 HIGH layout: progress Circle uses strokeDashoffset={circumference / 4} to start at top — but SVG circle default starts at 3 o'clock; without rotate(90deg) progress arc begins at wrong angle.
- :181 HIGH state: incompleteSections.slice(0,2) — if 3+ sections incomplete, only 2 get quick-action buttons.
- :286-296 MEDIUM overflow: sectionButton flex:1 in a row with gap — long section names plus icon may clip on narrow screens.
- :286 HIGH touch-target: sectionButton minHeight 44 but sectionIcon is rw(24) (24px) with no padding.
- :263-269 LOW consistency: completionBar height rh(4) vs completionProgress borderRadius rh(2) — rounded right edge floats inside squared-left bar.

### src/screens/main/profile/AppInfoCard.tsx
- :148-153 MEDIUM overflow: footerContent flexWrap:"wrap" with three inline children — heart icon can wrap to its own line, orphaned.
- :52-55 LOW consistency: versionBadge has no numberOfLines on versionText.

### src/screens/main/profile/components/GlassFormSwitch.tsx
- :46-99 HIGH a11y: whole row wrapped in AnimatedPressable AND inner Switch — double interaction; tap fires twice or conflicts.
- :82-97 MEDIUM consistency: Switch thumbColor uses solid colors while trackColor true is `${colors.primary}50` (~50% alpha) — track barely visible when off.
- :75-78 HIGH overflow: description numberOfLines={2} but textContainer marginRight spacing.md and Switch ~50px wide — long descriptions clip.

### src/screens/main/profile/components/SettingsModalWrapper.tsx
- :91-94 HIGH keyboard: KeyboardAvoidingView behavior="height" on Android often breaks content — should be undefined on Android.
- :86-88 MEDIUM state: StatusBar barStyle="light-content" but no backgroundColor set on StatusBar.
- :127-130 MEDIUM overflow: headerTitle numberOfLines={1} but no ellipsizeMode — long titles may clip.
- :221-227 HIGH touch-target: closeButton `Math.max(rw(40), 44)` — no accessibilityState for disabled.
- :271 HIGH keyboard: scrollContent paddingBottom spacing.md (16) — when keyboard open and input at bottom, save footer overlaps last input.
- :159-167 MEDIUM a11y: saveButton has accessibilityLabel but no accessibilityState={{ busy: isSaving}}.

### src/screens/main/profile/components/GlassFormPicker.tsx
- :100 HIGH layout: optionWrapper width via getColumnWidth() returning "48.5%"/"31.5%" — combined with gap, 2-column math overflows forcing 1-per-row.
- :148-152 MEDIUM overflow: optionLabel numberOfLines={1} but when columns=1 with descriptions, long labels truncate silently.
- :226-228 HIGH touch-target: optionButton minHeight rw(52) — rw(52) on small phones ≈ 47px (OK) but on very small screens could dip below 44.

### src/screens/main/profile/components/GlassFormInput.tsx
- :146-152 HIGH touch-target: iconContainer width rw(40) height rw(48) — height 48 but input row has no enforced minHeight; on small screens rw(48)≈43 dipping below 44.
- :155-159 MEDIUM keyboard: input height rw(48) hardcoded — does not grow with text on multiline.
- :91-100 MEDIUM a11y: TextInput has no accessibilityLabel (label is sibling Text, not associated).
- :61-65 HIGH state: animatedBorderStyle reads error from closure but borderOpacity SharedValue only animates on focus/blur — when error clears, border stays at error color until next focus.

### src/screens/main/profile/modals/BodyMeasurementsEditModal.tsx
- :345-385 HIGH layout: BMI scale uses flex values 18.5/6.5/5/10 (sum 40) — but flex ignores numeric relationship to BMI ranges (15-40). Indicator won't align with segment boundaries.
- :374-385 HIGH state: bmiIndicator left: (scaleBarWidth * pct) / 100 — on first render scaleBarWidth=0 so indicator doesn't show until after layout.
- :387-391 MEDIUM layout: bmiScaleLabels has three labels (18.5, 25, 30) with justifyContent:"space-between" — but bar has 4 segments; labels mark 3 of 4 boundaries, missing endpoints.
- :60-77 HIGH state: useEffect deps [visible, bodyAnalysis, weightUnit] — every time bodyAnalysis updates from store, effect re-runs and resets all form fields, wiping in-progress edits.

### src/screens/main/profile/modals/PersonalInfoEditModal.tsx
- :147 MEDIUM state: age validation rejects <13 — excludes legitimate young teens.
- :239 HIGH state: occupation_type cast includes "very_active" but type union doesn't include it — TypeScript cast silences runtime invalid value.
- :390-397 MEDIUM touch-target: GlassFormPicker columns=3 for gender — each option at 31.5% width with minHeight rw(52); three gender options in a row leaves icon+label cramped.

### src/screens/main/profile/modals/GoalsPreferencesEditModal.tsx
- :18 HIGH consistency: import line has two imports on one line (formatting).
- :433-442 MEDIUM overflow: GlassFormPicker multiSelect columns=2 for PRIMARY_GOALS_OPTIONS (6 options) — descriptions will truncate at numberOfLines=1.

### src/screens/main/profile/modals/ClearCacheConfirmModal.tsx
- :63-66 HIGH keyboard: outer Pressable onPress={onCancel} wraps BlurView and inner Pressable onPress={() => {}} — inner empty Pressable has no style.
- :134-137 MEDIUM layout: dialogContainer width "85%" maxWidth 340 — no maxHeight; with long message could exceed viewport height.
- :88-117 HIGH touch-target: action buttons have no explicit minHeight.

### src/screens/main/profile/modals/SettingsSelectionModal.tsx
- :209-212 HIGH layout: dialogContainer maxHeight rh(682) — on short screens rh(682) could exceed viewport height; optionsList has no maxHeight.
- :243-250 MEDIUM touch-target: closeBtn Math.max(rw(32),44) — closeBtn sits in headerRow with headerIconWrap rw(40) — visual asymmetry.
- :110 MEDIUM a11y: optionsList has accessibilityRole="radiogroup" but no accessibilityLabel={title}.
- :162-166 MEDIUM overflow: optionLabel has no numberOfLines — long labels with descriptions wrap and push checkmark off-row.

### src/screens/auth/PasswordResetScreen.tsx
- :411-417 HIGH z-index: backButton position:absolute with zIndex:1 — on small screens overlaps titleBlock.
- :437-438 MEDIUM overflow: subtitle maxWidth rw(280) centered — lineHeight rf(22) with no numberOfLines.
- :207-217 HIGH state: loading state shows only "Verifying your reset link…" text with no spinner.
- :139-149 MEDIUM state: updateField clears errors[field] but if user types in password then confirmPassword, only confirmPassword error clears.
- :256-258 MEDIUM touch-target: footerLink AnimatedPressable has no padding/minHeight — tappable area just Text height (~20px).

### src/screens/cooking/CookingSessionScreen.tsx
- :117-152 HIGH layout: header is View (not SafeAreaView top edge) with paddingHorizontal rp(20) — parent SafeAreaView wraps everything; inconsistent left alignment.
- :143 MEDIUM consistency: Ionicons size={28} hardcoded (not rf(28)).
- :147-150 HIGH overflow: mealMeta Text has no numberOfLines — "Prep: 45m • Cook: 30m • Hard" plus long meal name wraps and overflows header row.
- :93-104 MEDIUM state: crossPlatformAlert on completion has single button "Enjoy Your Meal! 🍽️" with emojis; no Cancel option.
- :154-185 MEDIUM keyboard: ScrollView has no keyboardShouldPersistTaps and no KeyboardAvoidingView.

### src/screens/ContributeFood.tsx
- :325-329 HIGH keyboard: KeyboardAvoidingView behavior="padding" on iOS only, undefined on Android — on Android keyboard covers submit button.
- :194-203 MEDIUM touch-target: input has paddingVertical rp(12) — total height ~44, OK, but no minHeight enforcement.
- :499-523 HIGH state: submitBtn has no disabled state when form is invalid — isSubmitting disables it, but invalid form still allows tap.
- :513-517 MEDIUM consistency: submit icon uses cloud-upload-outline while success EmptyState uses checkmark-circle — icon language inconsistent.
- :373-376 MEDIUM overflow: barcodeBadgeValue numberOfLines={1} but no ellipsizeMode — long barcodes may clip.
- :302-319 MEDIUM state: success state uses EmptyState with onCta — no "Add another" option, forcing re-scan.

### src/components/auth/AuthWrapper.tsx
- :65-73 HIGH state: AuthenticationScreen is placeholder with "Welcome to FitAI" and "Please log in" but NO login/register UI — dead/incomplete UI shipped to users.
- :75-104 HIGH consistency: styles object not wrapped in StyleSheet.create() — uses plain object with `as const` casts.
- :97 MEDIUM typography: authTitle fontSize rf(32) with fontWeight "bold" (string, not typography.fontWeight.bold).

### src/components/cooking/IngredientsSection.tsx
- :47 HIGH consistency: ingredientText uses emoji "🥘" hardcoded inline — should be Ionicons.
- :47-50 MEDIUM overflow: ingredientChip has no maxWidth — long ingredient names push chip to wrap or overflow.
- :35-58 HIGH layout: ingredientsGrid flexWrap with gap rp(8) — chips have variable widths based on content; rows won't align.
- :36-57 MEDIUM state: `meal.items?.map(...) || []` — if meal.items undefined the grid is empty with no empty state.

### src/components/cooking/NavigationButtons.tsx
- :34-107 HIGH layout: three buttons (Previous / Mark Complete / Next) each flex:1 in row with marginHorizontal rp(4) — on narrow screens labels will truncate or overflow.
- :84-86 MEDIUM consistency: "Step Done ✓" uses checkmark emoji/text mix — inconsistent with checkmark-circle Ionicon.
- :99 LOW consistency: "🎉 Finish Cooking" uses emoji in button label.
- :120-128 HIGH touch-target: navButton paddingVertical rp(14) but no minHeight — on small screens could be ~40px tall.

### src/components/cooking/VideoSection.tsx
- :139 HIGH consistency: videoPreview height:200 hardcoded — not responsive.
- :73-75 MEDIUM a11y: playButton is View inside AnimatedPressable — play icon has no separate accessibilityLabel.
- :182-191 MEDIUM touch-target: watchVideoButton paddingVertical rp(10) — total height ~40px, below 44.
- :110-128 HIGH state: error state shows videoError text but if videoError is null (no video and no error), component still renders error card with empty text.

### src/components/cooking/CurrentStepDisplay.tsx
- :62 HIGH overflow: stepTitle Text has no numberOfLines — long step instructions wrap indefinitely.
- :113-117 HIGH layout: currentStepSection has marginHorizontal rp(16) AND borderWidth:2 with borderColor primary — visually heavy and inconsistent.
- :88-90 MEDIUM consistency: tipText uses emoji "💡" inline — should be Ionicon.
- :161-168 MEDIUM touch-target: timerButton paddingVertical rp(10) — height ~38px, below 44.

### src/components/cooking/StepsList.tsx
- :125-127 HIGH layout: stepsList maxHeight:300 hardcoded — with 10+ steps scroll area fixed at 300px inside parent ScrollView, nested scrolling.
- :125 HIGH a11y: nested ScrollView inside parent CookingSessionScreen ScrollView — nested scroll containers violate a11y.
- :168-173 MEDIUM overflow: stepItemText has no numberOfLines — long step instructions wrap.
- :144-152 MEDIUM touch-target: stepNumber is 32x32 (below 44) — whole row tappable so OK, but visual number circle small.
- :101-108 MEDIUM consistency: proTipsTitle uses emoji "💡" — should be Ionicon.
- :83 LOW consistency: stepTimeText uses emoji "⏱️" — should be Ionicon.

### src/components/advanced/HapticFeedback.tsx
- :33-56 MEDIUM state: iOS branch uses Vibration.vibrate() (raw Android API) on iOS — on iOS ignores duration, always vibrates 400ms; per-type durations ineffective.

### src/components/advanced/Camera.tsx
- :252 HIGH consistency: close button uses Text "✕" instead of Ionicons close.
- :260-263 HIGH state: flashIcon renders `{flashMode === "on" ? "⚡" : "⚡"}` — both branches identical, icon never changes.
- :372 MEDIUM consistency: flipIcon uses emoji "🔄" — should be Ionicons camera-reverse-outline.
- :513 HIGH consistency: label mode tip uses Text "Label" as tip icon while all other tips use emojis.
- :439 MEDIUM a11y: portionHintLabel uses emoji "⚖️" inline — screen readers announce "scales" awkwardly.
- :441-458 HIGH keyboard: portionHintInput has no KeyboardAvoidingView ancestor and onSubmitEditing fires but keyboard may not dismiss.
- :711-718 MEDIUM touch-target: flipButton rs(50)×rs(50) — OK ~50px, but captureButton rs(80) is large.
- :399-421 HIGH layout: barcodeActionRow flexWrap:"wrap" with gap — action buttons have minWidth rs(110) but no max, 3+ actions could wrap.
- :423-434 MEDIUM touch-target: labelLibraryButton paddingVertical spacing.sm (8) — height ~36px, below 44.
- :461-470 MEDIUM touch-target: portionClearBtn has padding:4 — total tap area ~20px, well below 44.
- :1005-1018 HIGH state: Camera Modal has no onDismiss handler — on Android hardware back, camera ref isn't cleaned up.

### src/components/advanced/LongPressMenu.tsx
- :97-104 HIGH layout: menu position calc uses screenWidth from Dimensions.get("window") captured at module load — on rotation or window resize position is stale.
- :241-247 MEDIUM touch-target: menuItem minHeight 50 — OK, but menuIcon width 24 with marginRight spacing.sm.
- :207 HIGH a11y: menuIcon is Text rendering item.icon (string/emoji) with no accessibilityLabel — menu items lack accessibilityRole="button".
- :179-183 MEDIUM a11y: overlay TouchableOpacity has no accessibilityLabel.
- :152-154 HIGH state: handleMenuItemPress uses setTimeout(100ms) to delay onPress after hideMenu — if component unmounts, setTimeout callback fires onPress on stale item.

### src/components/advanced/PullToRefresh.tsx
- :43-48 HIGH state: onMoveShouldSetPanResponder returns true when dy>0 && !isRefreshing — but doesn't check if ScrollView scrolled to top; pulling down mid-scroll hijacks gesture.
- :147-150 MEDIUM consistency: refresh icons "⟳"/"↑"/"↓" are text glyphs, not Ionicons.
- :218-227 HIGH layout: ScrollView children wrapped in Animated.View with transform translateY — translating child doesn't move scroll position, content slides under refresh indicator incorrectly.

### src/components/advanced/RatingSelector.tsx
- :48-57 MEDIUM consistency: getIcon returns emoji strings "⭐"/"☆"/"🔥"/"😊"/"💪" — emojis render inconsistently across platforms.
- :170-181 HIGH touch-target: iconButton width/height = getSize() returning 24/32/40 — "sm" size is 24px, well below 44.
- :276-279 MEDIUM layout: valueContainer gap spacing.xs/2 (2px) — valueText and numericValue stacked with 2px gap, too tight.
- :37-40 HIGH state: animatedValues initialized via useState(Array.from(...new Animated.Value(1))) — Animated.Value inside useState is discouraged.

### src/components/advanced/Slider.tsx
- :342-350 MEDIUM overflow: track height 8 with thumb top:-8 — thumb extends 8px above track but container has no overflow padding.
- :174-184 HIGH state: useEffect sets thumbPosition via Animated.timing when value changes, but if isDragging is true it sets duration:0 — effect deps include isDragging, toggling re-animates to same value.
- :271-294 MEDIUM layout: stepsContainer position:"relative" height:4 with stepIndicator left:`${stepPercentage}%` and transform translateX(-1) — at 0% indicator at -1px (clipped left).
- :357-367 MEDIUM touch-target: thumb rs(24)×rs(24) — 24px, below 44; PanResponder covers thumb area only.

### src/components/advanced/DatePicker.tsx
- :68-81 HIGH state: dateOptions useMemo generates date range from minDate-1month to maxDate+2months — for default picker ~90 days, but if minimumDate/maximumDate far apart, generates thousands of Date objects.
- :178-180 MEDIUM consistency: triggerIcon uses emoji "📅" — should be Ionicons calendar-outline.
- :259 MEDIUM consistency: triggerIcon emoji "📅" again — trigger has no visual disabled distinction beyond opacity.
- :83-93 HIGH state: timeOptions useMemo generates 96 Date objects (24*4) on every mount even when mode!="time".
- :346-350 MEDIUM keyboard: modalOverlay has no KeyboardAvoidingView; bottom-sheet modal has no SafeAreaView bottom inset.

### src/components/advanced/MultiSelect.tsx
- :136 HIGH consistency: triggerIcon "▼" text glyph — should be Ionicons chevron-down.
- :183 MEDIUM consistency: searchIcon emoji "🔍" — should be Ionicons search.
- :234 HIGH consistency: checkmark "✓" text — should be Ionicons checkmark.
- :281-292 HIGH touch-target: trigger minHeight 44 OK, but triggerIcon fontSize fontSize.sm with no padding.
- :140-154 MEDIUM overflow: selectedPreview horizontal ScrollView with selectedTags — tags have no maxWidth, long labels create wide tags.
- :240-244 HIGH state: noResults empty state is plain Text "No options found" with no icon or action.
- :287-302 HIGH layout: trigger has flex:1 triggerText with numberOfLines=1 but triggerIcon "▼" outside flex — long display text truncates, chevron fixed-width with no marginRight from text.

### src/components/advanced/SwipeGesture.tsx
- :87-121 HIGH state: onPanResponderRelease sets lastOffset.current = currentTranslateX.current BEFORE deciding to reset — if shouldTriggerAction is false, resetPosition called but lastOffset already set, spring animates from stale offset.
- :255-261 MEDIUM layout: leftActions/rightActions position absolute with top:0 bottom:0 — container has no explicit height; actions rely on content height.
- :200 HIGH a11y: actionContent onTouchEnd={handleActionPress} — onTouchEnd not accessible; screen readers can't activate.
- :275-278 MEDIUM consistency: actionIcon/actionLabel use rf() font sizes but icon is Text string (emoji).

### src/components/advanced/ImagePicker.tsx
- :8-10 HIGH consistency: imports include Modal but component uses custom Modal; selectedImageContainer removeButton uses emoji "✕" text.
- :157-173 MEDIUM consistency: actionEmoji "📷"/"🖼️" — should be Ionicons camera/images.
- :195 HIGH touch-target: removeButton `Math.max(rs(24),44)` — good, but positioned top:-8 right:-8, half outside image; 44px target extends 20px beyond 80px image edge.
- :205-210 MEDIUM consistency: tipsTitle "📝 Tips for better photos:" uses emoji.
- :237-239 HIGH layout: container flex:1 but parent Modal content may not constrain height — actionsContainer + selectedSection + tipsCard + bottomActions stack without ScrollView.

### src/components/advanced/MultiSelectWithCustom.tsx
- :78-84 MEDIUM consistency: customLabel "➕ Add Custom..." uses emoji prefix.
- :261 HIGH consistency: triggerIcon "▼" text glyph — same as MultiSelect.
- :312 MEDIUM consistency: searchIcon "🔍" emoji.
- :288-291 HIGH keyboard: KeyboardAvoidingView behavior "padding" iOS / "height" Android wraps modalContent but modalOverlay flex:1 with no justifyContent.
- :419 HIGH consistency: checkmark "✓" text.
- :156 MEDIUM consistency: custom option icon "✨" emoji.

### src/components/advanced/multiselect/CustomInput.tsx
- :28-35 HIGH keyboard: TextInput autoFocus but no returnKeyType="done" and no onSubmitEditing — keyboard "enter" doesn't submit.

### src/components/advanced/multiselect/OptionsList.tsx
- :55-65 HIGH a11y: optionItem TouchableOpacity has no accessibilityRole="checkbox" or accessibilityState={{checked}}.
- :95 HIGH consistency: checkmark "✓" text.
- :68-69 MEDIUM consistency: optionIcon is Text string (emoji).

### src/components/advanced/multiselect/SearchInput.tsx
- :23 MEDIUM consistency: searchIcon "🔍" emoji.

### src/components/advanced/multiselect/SelectedPreview.tsx
- :24-27 MEDIUM overflow: selectedTagText numberOfLines={1} but no ellipsizeMode and no maxWidth on tag.

### src/components/advanced/camera/CameraHeader.tsx
- :28-38 HIGH state: flashIcon `{flashMode === "on" ? "⚡" : "⚡"}` — identical branches, icon never reflects state. Same bug as Camera.tsx.
- :28 HIGH consistency: closeIcon "✕" text — should be Ionicons close.

### src/components/advanced/camera/CameraOverlay.tsx
- :38 MEDIUM consistency: scanningText "✓ Scanning..." mixes checkmark emoji with text.

### src/components/details/ExerciseListItem.tsx
- :54-55 HIGH consistency: exerciseArrowText "→" text glyph — should be Ionicons chevron-forward.
- :50-53 HIGH touch-target: exerciseArrow is rw(32)×rh(32) (~32px) with no hitSlop — below 44.
- :43-48 MEDIUM overflow: exerciseName has no numberOfLines — long exercise names wrap.
- :60-66 MEDIUM overflow: muscle tags have no maxWidth — long muscle names create wide tags.

### src/components/details/FoodItemsList.tsx
- :21-26 HIGH overflow: foodName has no numberOfLines — long food names wrap and push calories off-row.
- :101-105 MEDIUM touch-target: foodCalories has no tappable area — display-only, fine, but whole Card has no onPress. Inconsistent card interactivity.
- :42-47 MEDIUM state: fiber macro only shows if fiber>0 — but other macros always show even if 0; inconsistent.

### src/components/details/MealActions.tsx
- :18-32 HIGH state: Button onPress={onEdit ?? (() => {})} with disabled={!onEdit} — when onEdit undefined, button disabled but still renders "Edit Meal" looking enabled-greyed.
- :30 MEDIUM consistency: deleteButton uses variant="outline" with borderColor override — textStyle color override may not propagate.

### src/components/details/MealDetailHeader.tsx
- :24 HIGH consistency: backIcon "←" text glyph — should be Ionicons arrow-back.
- :33 HIGH consistency: editIcon "✏️" emoji — should be Ionicons create-outline.
- :18-25 MEDIUM touch-target: backButton Math.max(rw(40),44) — OK, but onPress={onBack} with no null check.

### src/components/details/MealInfoCard.tsx
- :25 HIGH overflow: mealName has no numberOfLines — long meal names wrap and push calories container off-row.
- :26 MEDIUM consistency: completedBadge "✓" text glyph — should be Ionicons checkmark-circle.
- :84-87 MEDIUM layout: mealIcon fontSize rf(24) with marginRight spacing.sm — emoji baseline differs from text, vertical misalignment.

### src/components/details/MealInsights.tsx
- :20-21 MEDIUM consistency: notesTitle "📝 Meal Notes" emoji.
- :26 MEDIUM consistency: insightsTitle "💡 Nutritional Insights" emoji.
- :30-31 HIGH a11y: insightIcon is Text rendering insight.icon (emoji) with no accessibilityLabel.
- :57-59 MEDIUM overflow: notesText has no numberOfLines — long notes wrap indefinitely.
- :75-77 MEDIUM layout: insightsList gap spacing.xs (4px) — tight spacing.

### src/components/details/WorkoutInfoCard.tsx
- :36-37 MEDIUM consistency: workoutEmoji "✅"/"💪" emojis — should be Ionicons.
- :73-76 HIGH state: calories shows `{workout.calories > 0 ? workout.calories : "~300"}` — hardcoded fallback "~300" violates CLAUDE.md rule #8.
- :32-33 HIGH overflow: workoutName has no numberOfLines — long workout names wrap.
- :32-33 MEDIUM overflow: workoutDescription has no numberOfLines — long descriptions expand card unbounded.
- :155-160 MEDIUM overflow: progressBar height rh(8) with progressFill width % — progressFill borderRadius on fill <8px wide creates fully-rounded sliver.
- :84-89 MEDIUM consistency: muscleTag/equipmentTag use `colors.primary + "20"` string concatenation — fragile if primary changes to rgba.

---

## Agent E3 — Common + UI + Errors + Details (145 issues)

### src/components/common/AIStatusIndicator.tsx
- :42 HIGH touch-target: Container is TouchableOpacity/View with paddingHorizontal:spacing.sm (8) + paddingVertical:spacing.xs (4) — total height ~22px.
- :35 MEDIUM consistency: Uses emoji glyphs ("🤖"/"🎭") as status icon instead of Ionicons.
- :68 LOW contrast: backgroundColor:colors.glassHighlight (rgba(255,255,255,0.15)) over aurora gradient makes pill nearly invisible.

### src/components/common/OnboardingRequired.tsx
- :50 HIGH touch-target: Compact variant AnimatedPressable has paddingVertical:rh(8) (~8px) + icon 14px = ~30px tall.
- :166 MEDIUM dead-code: MetricPlaceholder exported but never imported.
- :185 MEDIUM dead-code: LoadingMetric exported but unused.
- :294 LOW state: loadingShimmer is static colored block with no animation — claims "loading" but never animates.

### src/components/common/SectionHeader.tsx
- :42 MEDIUM overflow: Title Text has no numberOfLines — long titles wrap and push action button off-screen.

### src/components/errors/ErrorFallback.tsx
- :35 HIGH touch-target: Retry button uses paddingVertical:spacing.sm (8) — height ~32px.
- :93 MEDIUM consistency: Second EmptyState defined here while aurora/EmptyState.tsx is canonical — duplicate, divergent styling.
- :117 MEDIUM layout: container uses flex:1 + padding:spacing.xl but often rendered inside non-flex parent (ScrollView content).

### src/components/errors/ScreenErrorBoundary.tsx
- :92 HIGH touch-target: "Try Again" button has paddingVertical:spacing.md (16) but no minHeight.
- :96 MEDIUM overflow: Dev error stack ScrollView has maxHeight:200 but no borderRadius/backgroundColor separation.

### src/components/animations/LoadingAnimation.tsx
- :201 MEDIUM dead-code: renderWave computes per-bar delay variable never used.
- :243 LOW a11y: Container View has no accessibilityRole="progressbar" or label.

### src/components/animations/ProgressAnimation.tsx
- :113 MEDIUM dead-code: renderCircularProgress computes circumference/strokeDashoffset but never applies them (no strokeDasharray) — progress arc never fills.
- :209 MEDIUM dead-code: renderRingProgress computes strokeDashoffset per ring but never uses it — rings are static circles.
- :54 MEDIUM a11y: Progress bars have no accessibilityRole="progressbar" or accessibilityValue.

### src/components/debug/FoodRecognitionTest.tsx
- :157 HIGH touch-target: Meal-type chips use paddingVertical:rp(8) (~8px) — height ~30px.
- :205 HIGH touch-target: "Clear" button paddingVertical:rp(4) (~4px) — height ~22px.
- :275 MEDIUM contrast: card uses backgroundColor:colors.white (#FFFFFF) — jarring white flash in dark mode.
- :316 MEDIUM contrast: mealTypeButtonUnselected uses backgroundColor:colors.white — same dark-mode contrast issue.
- :279 LOW consistency: Uses raw boxShadow string instead of shadows token system.
- :387 MEDIUM overflow: resultImage is fixed 64x64 with no resizeMode — non-square images distort.
- :218 HIGH overflow: resultHeader is flexDirection:"row" with three texts and gap:rp(8) but no flex:1 on meal-type text.

### src/components/debug/MigrationTestComponent.tsx
- :190 HIGH touch-target: Three control buttons all use paddingVertical:spacing.sm (8) — height ~32px.
- :220 MEDIUM overflow: ScrollView has flex:1 but is sibling of controls View inside flex:1 container with no flex on controls.
- :247 MEDIUM overflow: resultData Text has no numberOfLines — large JSON payloads expand card unbounded.

### src/components/achievements/AchievementCard.tsx
- :49 MEDIUM a11y: TouchableOpacity has accessibilityLabel but no accessibilityHint.
- :96 MEDIUM overflow: description Text has no numberOfLines — long descriptions expand card.
- :188 MEDIUM overflow: title has flexWrap:"wrap" on flex:1 row with no numberOfLines — long titles wrap indefinitely.
- :165 LOW contrast: iconLocked uses backgroundColor:"rgba(0,0,0,0.1)" — near-invisible on dark glass card.

### src/components/achievements/AchievementCategoryTabs.tsx
- :67 MEDIUM layout: container has fixed height:rh(48) but tabs use minHeight:44 + vertical padding — on large font scales content exceeds 48px and clips.

### src/components/achievements/AchievementCelebration.tsx
- :331 HIGH a11y: Close Pressable has no accessibilityRole or accessibilityLabel.
- :126 MEDIUM state: Auto-close timer is 5 seconds — too short to read long descriptions.
- :266 MEDIUM a11y: panResponder.panHandlers on whole modal intercepts touches — close button taps can be swallowed.
- :237 LOW a11y: Confetti Animated.Views have no accessibilityRole="image" or label.
- :312 MEDIUM overflow: celebrationText with fontSize:rf(24) on maxWidth:rp(320) wraps to 3+ lines on small screens.

### src/components/achievements/AchievementDetailModal.tsx
- :60 HIGH keyboard: Modal has no KeyboardAvoidingView — ScrollView doesn't account for keyboard.
- :76 MEDIUM z-index: backdrop is absoluteFillObject rendered AFTER BlurView — sits on top of blur and can intercept taps.
- :89 HIGH touch-target: Close button has hitSlop:8 but icon is 24px with no minWidth/minHeight — actual tappable area 40px.
- :112 MEDIUM overflow: ScrollView has flexGrow:0 — content can't grow to fill.
- :120 MEDIUM overflow: requirementText has flex:1 + flexShrink:1 but no numberOfLines — long text wraps indefinitely.
- :177 LOW contrast: unlockedContainer uses backgroundColor:"rgba(255,215,0,0.1)" (10% gold) — borderline AA.

### src/components/details/ExerciseListItem.tsx
- :50 HIGH touch-target: exerciseArrow is rw(32)×rh(32) (~32px) — below 44px.
- :50 MEDIUM a11y: exerciseArrow TouchableOpacity has no accessibilityLabel — screen readers announce "→" literally.
- :42 MEDIUM overflow: exerciseName has no numberOfLines.

### src/components/details/FoodItemsList.tsx
- :16 MEDIUM state: Empty state shows Card with text, but parent uses EmptyState component — inconsistent empty handling.
- :101 MEDIUM overflow: foodCalories text has no numberOfLines.
- :115 MEDIUM overflow: macroItem has no flex:1 — on small screens with fiber column, 4 items overflow horizontally.

### src/components/details/MealActions.tsx
- :18 MEDIUM consistency: Button disabled={!onEdit} but onPress falls back to () => {} — disabled button still calls empty function via a11y tools.

### src/components/details/MealDetailHeader.tsx
- :18 HIGH a11y: backButton Text uses "←" Unicode arrow — screen readers read literal arrow despite accessibilityLabel="Back".
- :27 HIGH a11y: editButton uses emoji "✏️" as only content — screen readers read "pencil emoji".
- :59 LOW consistency: backIcon uses Unicode "←" while MealDetail.tsx GlassHeader uses Ionicons chevron-back — two different back affordances.

### src/components/details/MealInfoCard.tsx
- :34 MEDIUM overflow: caloriesContainer has no flexShrink:0 — mealHeader row can squeeze calorie badge.
- :89 MEDIUM overflow: mealName has no numberOfLines.

### src/components/details/MealInsights.tsx
- :28 MEDIUM overflow: insightText has flex:1 but no numberOfLines — long text wraps indefinitely.
- :18 MEDIUM contrast: notesCard uses backgroundColor:colors.secondary + "10" (10% cyan) — cyan title on near-transparent cyan low-contrast.

### src/components/details/WorkoutInfoCard.tsx
- :73 HIGH state: When workout.calories is 0, shows hardcoded "~300" fallback — violates "No Hardcoded Fallbacks" rule.
- :35 MEDIUM overflow: workoutIcon circle has no overflow:"hidden" — emoji can overflow circle on Android.
- :131 MEDIUM overflow: workoutDescription has no numberOfLines — long descriptions expand card.

### src/screens/details/ExerciseDetail.tsx
- :97 MEDIUM layout: rightAction=`<View style={styles.side} />` is empty 44px spacer that captures taps. Use null.
- :140 MEDIUM keyboard: bottomContainer has no SafeAreaView/inset — on notched devices "Start Exercise" button can be clipped by home indicator.

### src/screens/details/MealDetail.tsx
- :79 MEDIUM consistency: When onEdit absent, rightAction=`<View style={styles.side} />` where side: { width: 0 } — but GlassHeader's side is width:rf(44). 0-width spacer breaks title centering.
- :93 MEDIUM keyboard: ScrollView has no keyboardShouldPersistTaps — taps on MealActions can be lost when keyboard up.
- :116 MEDIUM z-index: MealActions rendered as sibling after ScrollView inside AuroraBackground (flex column) — fixed bottom bar can overlap scrolling content.

### src/components/ui/CustomDialog.tsx
- :93 MEDIUM state: `if (!visible) return null` before Modal render — modal never animates out (fade-out skipped on unmount).
- :137 MEDIUM layout: Multiple-action buttons stack vertically; last button gets width:"100%" while others get styles.actionButton (also width:"100%") — no visual distinction.
- :143 LOW a11y: Cancel button gets accessibilityLabel="back" — misleading; should be "Cancel".
- :212 MEDIUM dead-code: icon style defined but never applied.
- :249 MEDIUM dead-code: lastActionButton style is empty with only comment.
- :253 MEDIUM dead-code: statsContainer/statsTitle/statsGrid/statItem/statValue/statLabel styles defined but only used by WorkoutCompleteDialog which re-declares inline.
- :534 MEDIUM keyboard: WorkoutCompleteDialog uses animationType="slide" but KeyboardAvoidingView behavior is "height" on Android — causes jumpiness.
- :610 HIGH touch-target: Star rating buttons have hitSlop:8 but icon is rf(28) (~28px) — actual tappable area ~36px.
- :626 MEDIUM a11y: notesInput TextInput has no accessibilityLabel — relies on placeholder which disappears once typed.

### src/components/ui/Modal.tsx
- :57 MEDIUM a11y: Overlay Pressable has accessibilityLabel="Dismiss modal" but no accessibilityHint.
- :147 MEDIUM layout: content uses maxHeight:rh(682) (absolute px) — on small phones 682px > screen height.
- :121 MEDIUM a11y: bottomSheetHandle has no accessibilityRole="button" or label.

### src/components/ui/Input.tsx
- :71 MEDIUM dead-code: animatedStyle is empty useAnimatedStyle(() => ({})) — empty hook still runs every frame.
- :90 MEDIUM a11y: TextInput has accessibilityRole="none" explicitly — removes default text role.
- :117 HIGH touch-target: rightIconContainer is minHeight:rh(44) + minWidth:rw(44) — good, but onPress only attached when onRightIconPress provided; when absent, icon non-interactive but still occupies 44px area.

### src/components/ui/Button.tsx
- :131 MEDIUM consistency: Primary variant wraps in LinearGradient but disabled primary skips gradient entirely — visual jump.
- :160 HIGH touch-target: Non-primary variants rely on styles[size] minHeight (44/48/56) — good, but disabled only applies opacity:0.5 with no cursor change on web.

### src/components/ui/Card.tsx
- :47 MEDIUM a11y: wrapChild recursively wraps string/number children in <Text> — recursion into children of Text elements can break nested text styling.
- :101 MEDIUM a11y: TouchableOpacity when onPress provided has no accessibilityRole="button" or accessibilityLabel.

### src/components/ui/PasswordInput.tsx
- :34 MEDIUM a11y: eyeIcon Ionicons has no accessibilityLabel on icon; wrapper Input sets accessibilityLabel="Show/Hide password" but label doesn't update state — "Show password" shown even when already visible.

### src/components/ui/AnimatedNumber.tsx
- :47 MEDIUM a11y: AnimatedText has no accessibilityLabel — screen readers read static initial value, not animated.

### src/components/ui/LoadingSpinner.tsx
- :28 MEDIUM a11y: ActivityIndicator has no accessibilityRole="progressbar" or accessibilityLabel.
- :60 MEDIUM z-index: overlay uses zIndex:1000 — but modals use zIndex.modal:1400; spinner inside modal can be hidden behind backdrop.

### src/components/ui/InfoTooltip.tsx
- :38 HIGH touch-target: iconButton is rf(20)×rf(20) (~20px) — far below 44px. Has hitSlop:10 expanding to ~40px, still borderline.
- :46 MEDIUM a11y: Tooltip Modal overlay Pressable has no accessibilityLabel.
- :60 HIGH touch-target: "Got it!" close button uses paddingVertical:spacing.sm (8) — height ~32px.
- :96 MEDIUM contrast: modalOverlay uses colors.overlay (rgba(0,0,0,0.5)) — tooltip content on 50% black is low contrast against blurred app.

### src/components/ui/ChipSelector.tsx
- :90 MEDIUM a11y: AnimatedTouchable chip has no accessibilityRole="button" or accessibilityState={{ selected }}.
- :117 LOW consistency: Default gradient is [colors.success, "#45A049"] — hardcoded hex bypasses token system.

### src/components/ui/ToggleCard.tsx
- :113 MEDIUM a11y: TouchableOpacity toggle has no accessibilityRole="switch" or accessibilityState={{ checked }}.
- :228 MEDIUM touch-target: toggleSwitch is rw(40)×rp(20) — switch itself 20px tall, below 44px touch target.

### src/components/ui/PulseButton.tsx
- :80 MEDIUM a11y: TouchableOpacity has no accessibilityRole="button" or accessibilityLabel.
- :106 MEDIUM state: When loading, button text shows "Loading..." but no spinner — inconsistent with Button.tsx.

### src/components/ui/ProgressCard.tsx
- :48 MEDIUM a11y: No accessibilityRole="progressbar" or accessibilityValue on card despite showing progress ring.

### src/components/ui/SegmentedControl.tsx
- :100 MEDIUM a11y: TouchableOpacity segments have no accessibilityRole="tab" or accessibilityState={{ selected }}.
- :107 MEDIUM overflow: segmentText has numberOfLines={2} + ellipsizeMode="tail" but segment has minWidth:0 — long labels truncate mid-word.

### src/components/ui/CascadeGrid.tsx
- :100 MEDIUM layout: width:`${100/columns - 2}%` — -2 magic number leaves 2% gap unaccounted for; with gap:spacing.md also applied, columns can overflow.

### src/components/ui/DataPlaceholder.tsx
- :33 HIGH touch-target: actionButton uses paddingVertical:rp(8) + paddingHorizontal:rp(16) — height ~30px.
- :48 MEDIUM contrast: container uses backgroundColor:`${colors.surface}40` (25% opacity surface) + borderColor:`${colors.border}30` — dashed border at 18% opacity nearly invisible.

### src/components/ui/ChartTooltip.tsx
- :71 MEDIUM a11y: Tooltip container has no accessibilityRole or accessibilityLabel.
- :113 MEDIUM layout: arrow uses CSS-style triangle borders — on Android can render with hairline gaps.

### src/components/ui/aurora/AnimatedPressable.tsx
- :251 MEDIUM a11y: pointerEvents="box-none" on wrapper correct for touch, but accessible={isInteractive} on inner Pressable means non-interactive instances hidden from screen readers entirely.

### src/components/ui/aurora/BottomSheet.tsx
- :182 MEDIUM a11y: Backdrop Pressable has onPress only when closeOnOverlayPress — but no accessible={closeOnOverlayPress}; pressable still in a11y tree when non-dismissable.
- :235 HIGH touch-target: closeButton is 44x44 — good, but hitSlop={12} is a number not an object; RN expects {top,bottom,left,right}. Bare number silently ignored.
- :297 MEDIUM overflow: title has flex:1 but no numberOfLines — long titles wrap and push close button.

### src/components/ui/aurora/DetentBottomSheet.tsx
- :270 MEDIUM a11y: Close Pressable has hitSlop={12} (bare number — ignored, same issue as BottomSheet).
- :252 MEDIUM a11y: Detent dots have no accessibilityLabel — screen readers announce nothing.

### src/components/ui/aurora/DragHandleRow.tsx
- :166 HIGH a11y: accessibilityState={{ expanded: isDragging.value }} reads shared value synchronously at render — won't update when dragging starts/stops.

### src/components/ui/aurora/GlassView.tsx
- :109 MEDIUM contrast: Android/web fallback layers background.secondary then overlayColor (default colors.glass.background = rgba(255,255,255,0.1)) — 10% white overlay nearly imperceptible.

### src/components/ui/aurora/GlassCard.tsx
- :157 MEDIUM z-index: gradientBorderLayer is position:absolute with pointerEvents:none but no explicit borderRadius — relies on parent clipping.

### src/components/ui/aurora/EmptyState.tsx
- :57 MEDIUM a11y: Container Animated.View has accessibilityRole="summary" — summary is for HTML <details>/<summary>, not a RN role.
- :78 HIGH touch-target: CTA AnimatedPressable uses paddingHorizontal:rp(spacing.xl) + paddingVertical:rp(spacing.md) — height ~48px, OK, but no minHeight to guarantee.

### src/components/ui/aurora/AuroraSpinner.tsx
- :171 MEDIUM contrast: innerCircle is backgroundColor:"transparent" — ring effect relies on parent background showing through. On solid card background, ring becomes full disc.

### src/components/ui/aurora/AuroraBackground.tsx
- :116 MEDIUM a11y: AnimatedLinearGradient container has no accessibilityRole or accessible={false} — screen readers try to traverse gradient.

### src/components/ui/aurora/AnimatedSection.tsx
- :64 MEDIUM a11y: Section has no accessibilityRole — content inside isn't grouped for screen readers.

### src/components/ui/aurora/DashboardSkeleton.tsx
- :42 MEDIUM a11y: Skeleton has no accessibilityLabel="Loading content" on container.
- :60 MEDIUM overflow: filterRow has 3 fixed-width skeletons rw(90) — on narrow screens (320px) 3×90=270 + gaps fits, but with showHeader row can overflow.

### src/components/ui/aurora/GestureCard.tsx
- :259 MEDIUM z-index: actionBackground is position:absolute with width:"100%" rendered before card — paddingHorizontal:spacing.lg can make icon/label off-center when card translated.

### src/components/ui/aurora/MetricCard.tsx
- :213 MEDIUM a11y: AnimatedText for value has no accessibilityLabel — screen readers read static initial value.
- :249 MEDIUM layout: card has minWidth:120 but no maxWidth — on wide screens card stretches awkwardly.

### src/components/ui/aurora/ProgressRing.tsx
- :176 MEDIUM a11y: Container has accessibilityRole="progressbar" + accessible:true — accessible:true can swallow center children from a11y tree.

### src/components/ui/aurora/HeroSection.tsx
- :168 MEDIUM a11y: ImageBackground has no accessibilityLabel describing image.
- :150 MEDIUM overflow: getContentPositionStyle returns paddingTop:Math.max(insets.top, rp(20)) for "top" — paddingHorizontal:rw(20) not accounting for landscape insets.

### src/components/ui/aurora/FeatureGrid.tsx
- :242 MEDIUM layout: columnWrapper uses width:`${100/columns}%` + paddingHorizontal:gap/2 + marginBottom:gap — but container also has marginHorizontal:-spacing.md/2 (negative margin) AND gap — double-counting gap.
- :165 MEDIUM overflow: title/description have numberOfLines={2} — good, but itemContent has gap:spacing.sm with no flex:1, so on 2-column grid text can overflow card.

### src/components/ui/aurora/DynamicTabBar.tsx
- :235 MEDIUM a11y: Pressable tabs have accessibilityRole="tab" + accessibilityState — good. But disabled tabs render with tabTextDisabled opacity 0.4 — too low for AA contrast.
- :281 MEDIUM a11y: validationDot has no accessibilityLabel — screen readers announce colored dot.
- :381 MEDIUM overflow: validationDot is position:absolute, top:-4, right:-4 — can be clipped by overflow:hidden on tab container.

### src/components/ui/aurora/MagneticTabIndicator.tsx
- :201 HIGH touch-target: Pressable tabs have paddingVertical:spacing.xs (4px) — height ~20px, below 44px.

### src/components/ui/aurora/RestTimerRadial.tsx
- :297 HIGH touch-target: controlButton is position:absolute, bottom:-rs(40) with paddingVertical:spacing.sm — height ~32px.
- :297 MEDIUM layout: controlButton positioned bottom:-rs(40) (negative, outside container) — can overlap content below timer or be clipped by parent overflow:hidden.
- :252 MEDIUM a11y: accessibilityValue.now reads Math.ceil(remaining.value) at render — remaining is shared value updating every frame; a11y label won't update live.

### src/components/ui/aurora/LiveVolumeRing.tsx
- :154 MEDIUM a11y: accessibilityValue reads targetPercent (static at render) — doesn't update as ring animates.

### src/components/ui/aurora/SkeletonLoader.tsx
- :122 MEDIUM a11y: animatedShimmerStyle uses fixed [-300, 300] translate range — on wide containers shimmer doesn't cover full width.
- :145 MEDIUM a11y: Container has accessibilityLabel="Loading content" + accessible:true — good, but nested SkeletonCard/SkeletonListItem don't propagate label.

### src/components/navigation/TabBar.tsx
- :88 MEDIUM overflow: tabText has no numberOfLines — long tab titles wrap and break 60px-tall tab bar.
- :104 MEDIUM layout: Active indicator width:rw(24) + height:rh(3) + marginTop:rp(2) adds 5px below text — can push tab content above 60px height.

### src/components/ui/GlassCard.tsx
- :161 MEDIUM dead-code: pressable and onPress props accepted but ignored — press behavior is a no-op.
- :124 MEDIUM consistency: showBorder defaults to true here but false in aurora/GlassCard.tsx — two GlassCard components with different defaults.
- :83 MEDIUM consistency: getPaddingValue returns raw spacing.sm (8) not rp(spacing.sm) — non-responsive, unlike aurora version.
- :100 MEDIUM consistency: getBorderRadiusValue returns raw br.lg (12) not rw(br.lg) — non-responsive.
- :171 MEDIUM overflow: shadowWrapper has overflow:"hidden" — shadows drawn outside bounds; clipping defeats shadow.

### src/components/ui/aurora/GlassButton.tsx
- :84 MEDIUM a11y: AnimatedPressable has accessibilityState={{ disabled, busy: loading }} — busy isn't a standard RN accessibility state.
- :128 MEDIUM contrast: disabled style is opacity:0.5 — gradient button at 50% opacity over dark background can have insufficient text contrast.

### src/components/ui/aurora/GlassHeader.tsx
- :55 HIGH touch-target: backButton is width:rf(40) + height:rf(40) (~40px) — below 44px.
- :88 MEDIUM overflow: title has numberOfLines={1} — good, but titleWrap has flex:1 with no flexShrink.
- :51 MEDIUM a11y: Animated.View container has no accessibilityRole="header".
- :111 MEDIUM layout: side is width:rf(44) fixed — if rightAction wider than 44px, overflows side slot.

---

## Agent E4 — Regression Re-audit of Workout Screens (150 issues)

See REGRESSIONS section at top of this doc for the ~25 regressions. Remaining ~125 issues are NEW findings (not regressions) — issues missed in the original audit or edge cases uncovered by deeper inspection.

### src/screens/main/fitness/FitnessHeader.tsx (post-fix)
- :50-55 MEDIUM typography: greeting uses adjustsFontSizeToFit with minimumFontScale 0.7 at rf(22) — long usernames shrink to ~15px, unreadable.
- :92-98 MEDIUM contrast: progressIndicator colors.primary (#FF6B35 orange) bg + white text at rf(10) — borderline WCAG AA at 10px.

### src/screens/main/fitness/TodayWorkoutCard.tsx (post-fix)
- :163-170 MEDIUM overflow: todayLabel "TODAY • DAY 1" with letterSpacing:1 + adjustsFontSizeToFit — letterSpacing isn't scaled by font-fitting.
- :190-221 HIGH overflow: titleRow flexWrap:"nowrap" + title flex:1 + statusBadge flexShrink:0 — on narrow screens with long titles badge drops below row baseline.
- :223-240 MEDIUM overflow: metaRow nested Text spans with embedded Ionicons — numberOfLines={2} clamps but inline icon components break line wrapping on Android.
- :243-247 HIGH contrast: lastPerformedText colors.textSecondary (#B0B0B0) at rf(11) italic on glassSurface — borderline WCAG AA.
- :438-449 MEDIUM touch-target: actionButton has no explicit minHeight — relies on gradient padding ~38px, below 44px.

### src/screens/main/fitness/WeeklyPlanOverview.tsx (post-fix)
- :218-233 MEDIUM touch-target: seeAllButton View has minHeight:44 but wrapping AnimatedPressable has no minHeight — actual tap area ~24px on Android.
- :244-285 MEDIUM touch-target: dayCircle Math.max(rw(36),44) clamped to 44 but 7 circles × 44px = 308px nearly touch on 320px screen.
- :454-463 MEDIUM contrast: statLabel colors.textSecondary (#B0B0B0) at rf(10) on glass — 10px below 12px micro minimum.

### src/screens/main/fitness/WorkoutHistoryList.tsx (post-fix)
- :64-108 HIGH state: PanResponder created once in useRef with empty deps — workout prop changes don't update responder, swipe state leaks.
- :204-220 MEDIUM z-index: actionsContainer position:absolute with no zIndex — cardContainer zIndex:2 elevation:2 covers actions on Android.
- :370-379 MEDIUM state: workouts.slice(0,5) silently truncates — no "Show all" affordance.
- :485-503 MEDIUM overflow: progressText "99%" with adjustsFontSizeToFit minimumFontScale:0.6 in rw(34) circle shrinks to ~6px, illegible.

### src/screens/main/fitness/RecoveryTipsModal.tsx (post-fix)
- :215-219 MEDIUM REGRESSION: KAV added but modal has NO TextInputs — KAV is dead code, keyboardVerticalOffset:40 shifts content 40px down unnecessarily.
- :343 MEDIUM REGRESSION: scrollView maxHeight raised from rh(400) to rh(560) making it WORSE — on small phones footer pushed off-screen.
- :400 MEDIUM contrast: introCard rgba(255,215,0,0.18) + colors.text (#FFFFFF) — white text on gold-tinted glass ~3.8:1, borderline.
- :493-497 MEDIUM touch-target: gotItButton minHeight:48 but AnimatedPressable doesn't propagate minHeight to LinearGradient child.

### src/screens/main/fitness/EmptyPlanState.tsx (post-fix)
- :131 MEDIUM overflow: primaryGoals[0] inside numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} — long goals shrink to ~8px, illegible.
- :140-162 MEDIUM consistency: features list uses colors.successAlt checkmark icons while previewRow above uses colors.primary.
- :183-198 MEDIUM state: isGenerating shows sync icon + text but icon doesn't spin — no progressive feedback.
- :303-308 MEDIUM touch-target: generateButton minHeight:48 but AnimatedPressable doesn't pass minHeight to LinearGradient child.

### src/screens/main/fitness/MyWorkoutsCard.tsx (post-fix)
- :97-117 HIGH state: useEffect loads templates once on mount with empty deps — if user creates template in TemplateLibrary and returns, count is stale.
- :150-157 MEDIUM touch-target: viewAll row has minHeight:44 but entire card wrapped in AnimatedPressable — tapping viewAll area and tapping card both fire handleViewAll.
- :205-222 MEDIUM alignment: StatTile value numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} at rf(18) — "10,000" shrinks to ~12px while "0" renders at full 18px, visual jump.

### src/screens/main/FitnessScreen.tsx (post-fix)
- :200 MEDIUM state: SafeAreaView edges={["top"]} only — bottom content extends under home indicator on gesture-nav phones.
- :293-305 MEDIUM state: errorCard raw Text with no retry button — user cannot retry plan generation.
- :455-463 MEDIUM z-index: guestSignUpOverlay zIndex:100 elevation:100 but WorkoutStartDialog rendered AFTER in JSX with no explicit zIndex.

### src/screens/workout/WorkoutSessionScreen.tsx (post-fix)
- :736 MEDIUM REGRESSION: SafeAreaView edges={["bottom"]} only, WorkoutHeader paddingTop={Math.max(insets.top,12)} double-pads top.
- :772-777 MEDIUM keyboard: ScrollView keyboardShouldPersistTaps="handled" but no KeyboardAvoidingView wrapping.
- :822-865 HIGH overflow: warmupContainer alignSelf:'stretch' inside exerciseContainer alignItems:"center".
- :861 MEDIUM REGRESSION: emoji→Ionicons fix missed warmupDoneText using literal '✓' and 'Done' characters.
- :887-921 MEDIUM overflow: startButton label nested ternary — GlassButton label has no numberOfLines/adjustsFontSizeToFit.
- :924-940 MEDIUM alignment: previewNav justifyContent:"space-between" renders only Previous when isCompleted.
- :1131-1152 MEDIUM contrast: exerciseHistoryHint fontSize:fontSize.xs (~12px) at colors.text.tertiary (#8A8A8A) — 12px tertiary on glass fails WCAG AA.
- :1161-1168 MEDIUM typography: warmupHeader fontSize:rf(10) (responsive now) but marginBottom:8 hardcoded.
- :1210-1214 MEDIUM spacing: warmupDivider marginVertical:10 hardcoded — not tokenized.

### src/screens/details/WorkoutDetail.tsx (post-fix)
- :55-69 MEDIUM state: empty state uses EmptyState with conditional onBack — if onBack undefined, empty state has NO exit CTA, dead-end.
- :121-136 HIGH z-index: bottomContainer is sibling View after ScrollView, not absolute/sticky — on long content Start button renders below fold.
- :169 MEDIUM spacing: scrollView paddingHorizontal:rp(spacing.md) — FitnessScreen uses spacing.lg.
- :184-188 MEDIUM z-index: bottomContainer has borderTopWidth:1 but no backgroundColor.
- :185 MEDIUM spacing: bottomContainer padding:rp(spacing.md) — tighter than scrollView's spacing.lg.

### src/screens/workouts/WorkoutDetailScreen.tsx (post-fix)
- :1060-1063 HIGH REGRESSION: headerStartBtn style sets minHeight:rf(36) which overrides GlassButton's default 44px min.
- :721-730 HIGH touch-target: CollapsibleSection Pressable style has no minHeight — header content ~22-28px tall.
- :314-319 HIGH contrast: intensityChip rest state uses colors.text.tertiary (#8A8A8A grey) bg + white text → ~2.8:1, fails WCAG AA.
- :419-423 MEDIUM typography: intensityChip label uses intensityLevel.slice(0,4).toUpperCase() producing "INTE"/"MODE".
- :1101-1105 MEDIUM typography: intensityChipText fontSize rf(9) — below 12px micro minimum.
- :293-297 MEDIUM state: handleStartWorkout catch logs error + haptics.error() but shows no user-facing message.

### src/screens/workouts/ScheduleBuilderScreen.tsx (post-fix)
- :100 HIGH state: useFitnessStore() called with no selector — subscribes to entire store, re-renders on every store change.
- :632-636 MEDIUM REGRESSION: KAV keyboardVerticalOffset={Platform.OS==="ios"?40:0} uses magic 40.
- :742 MEDIUM contrast: saveBtnDisabled applies opacity:0.5 on top of backgroundColor colors.background.tertiary — white text on 50%-opacity tertiary fails WCAG AA.
- :693-711 MEDIUM state: alreadyAdded exercise picker items are tappable but onPress no-ops — tapping gives no feedback.

### src/screens/workouts/WeeklyBuilderScreen.tsx (post-fix)
- :389 HIGH state: pullIsRefreshing.value read directly in render — SharedValue reads don't trigger re-renders, so "Recalculating insights…" text never swaps.
- :110-117 HIGH state: hydrateFromCustomPlan catch only console.error — on failure draft stays null, loading state persists forever, user trapped.
- :462 MEDIUM consistency: discard "Discard" action uses variant:"primary" for a destructive action — misleading.
- :527-529 MEDIUM layout: footerSpacer height rp(180) — BuilderSummaryFooter with aiMenu open exceeds 180px, last DayBlock hidden.

### src/screens/workouts/TemplateLibraryScreen.tsx (post-fix)
- :1530 HIGH REGRESSION: scheduleBtn minHeight Math.max(rw(36),36) — clamp floor is 36 not 44.
- :1604 MEDIUM consistency: tabChipLocked opacity:0.7 makes locked Community tab look disabled but it's still tappable.
- :1574 MEDIUM touch-target: searchInput minHeight rf(22) — input field too short for comfortable typing.
- :1410-1429 MEDIUM z-index: exercise row Pressables nested inside card AnimatedPressable with no e.stopPropagation — Android may fire both.
- :242 MEDIUM state: sharedTemplateId deep-link with null data returns silently — no user feedback.

### src/screens/workouts/BuildMethodLandingScreen.tsx (post-fix)
- :43-47 HIGH consistency: imports flatColors as colors — uses different color structure than all other workout screens.
- :145-153 MEDIUM state: handleSelect for locked Community calls both triggerPaywall() AND crossPlatformAlert() — double feedback confusing.
- :227 MEDIUM a11y: accessibilityState={{disabled:false}} on locked card but accessibilityLabel includes "locked" — contradictory.
- :327-329 MEDIUM typography: headline lineHeight = typography.fontSize.h2 * typography.lineHeight.tight — if lineHeight.tight undefined, lineHeight becomes NaN.
- :245 MEDIUM consistency: backgroundColor `${method.accent}1F` hex-append — fragile if accent isn't 6-digit hex.

### src/components/workout/WorkoutHeader.tsx (post-fix)
- :106 HIGH overflow: headerRight stacks up to 3 statBlocks (TIME/CAL/VOL) with gap:rp(spacing.sm) — on narrow screens title squeezed to near-zero.
- :150 MEDIUM consistency: `${colors.error.DEFAULT}20` and `40` use fragile hex-append pattern.
- :149 LOW REGRESSION: Math.max(rw(40),44) clamps button to 44px but borderRadius:rbr(20) keeps 20px radius — 44px button renders as rounded square not circle.

### src/components/workout/ExerciseCard.tsx (post-fix)
- :5 HIGH REGRESSION: imports flatColors instead of aurora tokens — WorkoutHeader, WorkoutProgressBar use aurora colors.
- :110 MEDIUM consistency: setButton uses TouchableOpacity while SetLogModal/WorkoutHeader use AnimatedPressable — original audit NOT fixed.
- :87 MEDIUM overflow: exerciseDetails flexWrap:"wrap" may split "Rest: 60s" mid-phrase — original audit NOT fixed.
- :178 MEDIUM spacing: raw spacing.* values not rp()-scaled — under-pads on widthScale>1.

### src/components/workout/WorkoutErrorState.tsx (post-fix)
- :5 HIGH REGRESSION: uses flatColors/flatFontSize — inconsistent with aurora WorkoutHeader.
- :44 MEDIUM state: only "Go Back" button, no retry — user cannot recover from transient load failure.

### src/components/workout/WorkoutNavigation.tsx (post-fix)
- :4 HIGH REGRESSION: uses flatColors — inconsistent with aurora WorkoutHeader.
- :33 MEDIUM overflow: "Finish Workout" label has no numberOfLines.
- :28 LOW a11y: disabled buttons (Previous/Next) have no accessibilityState={{disabled:true}}.

### src/components/workout/SetLogModal.tsx (post-fix)
- :332 HIGH state: useFitnessStore.getState() called in render body does not subscribe to store updates — "Session volume (live)" footer never reflects just-saved set.
- :467 MEDIUM consistency: `PR 1RM ${Math.round(prPreview.new1RMPR)}kg` hardcodes kg — line 465 uses userUnits for weight PR. Inconsistent units.
- :856 MEDIUM state: inactive setTypeBadge opacity:0.5 jumps to opacity:1 when active — abrupt visual jump.
- :866 HIGH contrast: setTypeText color colors.background.DEFAULT (dark) on SET_TYPE_COLORS["normal"] which is colors.text.tertiary (grey) at 50% opacity — dark on translucent grey fails WCAG AA.
- :751 MEDIUM consistency: widespread fragile hex-append pattern (`${colors.warning.DEFAULT}22/66`, `${colors.primary.DEFAULT}1A/40`, etc.).
- :527 MEDIUM overflow: setTypeRow fieldLabel width:rp(80) + 4 setTypeBadges (44px each) + gaps (~284px total) — overflows sheet width on 320px screens.

### src/components/workout/AchievementNotifications.tsx (post-fix)
- :4 HIGH REGRESSION: uses flatColors/flatFontSize — inconsistent with aurora WorkoutHeader.
- :66 MEDIUM REGRESSION: toastAchievement.icon still rendered as Text emoji — workout components migrated emoji→Ionicons.
- :113 MEDIUM spacing: raw spacing.* values not rp()-scaled — inconsistent with WorkoutHeader.
- :132 LOW state: boxShadow (lines 132,184) is web-only CSS — ignored on native React Native, dead code.
- :171 MEDIUM consistency: rgba(255,107,53,0.9) and rgba(255,255,255,0.2) (line 179) hardcoded — bypass token system.

### src/components/fitness/ExerciseInstructionModal.tsx (post-fix)
- :308-310 MEDIUM REGRESSION: KAV keyboardVerticalOffset={Platform.OS==="ios"?40:0} adds 40px top-padding but BottomSheet already positions content above keyboard — double-padding.
- :323 MEDIUM REGRESSION: minHeight:Math.max(rp(44),44) on tab — rp(44) already scales ≥44 on phones, Math.max redundant; on tablets rp(44)≈52px.
- :137 MEDIUM REGRESSION: instructionText numberOfLines={5} hard-truncates long instructions with no "Read more" affordance.
- :306-311 MEDIUM overflow: modalGif sets width:"80%" + aspectRatio:1 + height:rh(200) — height+aspectRatio conflict.
- :285 MEDIUM contrast: qualityBadge background `${colors.success.DEFAULT}20` (12% alpha) + colors.success.DEFAULT text — 12% tint nearly invisible.

### src/components/fitness/ExerciseCard.tsx (post-fix)
- :416-417 MEDIUM REGRESSION: playButton uses Math.max(rs(44),44) but sibling completedBadge uses raw rs(32) — toggling complete/incomplete shifts right-side element size by 12px.
- :432 MEDIUM REGRESSION: timerDisplay background hardcoded "rgba(245,158,11,0.2)" bypasses token system.
- :439 MEDIUM contrast: timerText colors.warningAlt (#F59E0B) on rgba(245,158,11,0.2) amber tint — text and background same hue, ~2.8:1, fails WCAG AA.
- :48-52 MEDIUM state: handleToggleExpand calls LayoutAnimation.configureNext unconditionally — no useReducedMotion check.
- :137 MEDIUM overflow: metaRow single line of Text children with no numberOfLines.

### src/components/fitness/SuggestedWorkouts.tsx (post-fix)
- :90 MEDIUM state: workouts.length===0 returns null — no empty state, leaves blank gap.
- :112 MEDIUM overflow: snapToInterval={rw(160)+spacing.md} — spacing.md is raw number while rw(160) scales.
- :342-344 MEDIUM contrast: completedButton bg rgba(16,185,129,0.2) + text colors.successAlt (#10B981) — green text on 20% green tint ~3.2:1.

### src/components/fitness/WorkoutTimer.tsx (post-fix)
- :108-112 MEDIUM keyboard: KeyboardAvoidingView wraps entire overlay with behavior:"padding" — WorkoutTimer has no TextInput anywhere, KAV is dead code.
- :128-131 HIGH overflow: progressFill transform rotate "${progressPercentage*3.6}deg" INLINE but progressFill style (line 296) ALSO has transform rotate "-90deg" — inline transform OVERWRITES baseline -90deg.
- :304 MEDIUM typography: timeText fontFamily:"monospace" hardcoded — may not exist on all Android devices.
- :94-97 MEDIUM state: safeDuration=Math.max(1,...) guards zero but progressPercentage uses safeDuration — if duration=0, shows "100% Complete" immediately.

### src/components/fitness/WorkoutAnalytics.tsx (post-fix)
- :113 MEDIUM overflow: ScrollView inside Card with no maxHeight — long insights lists expand card unbounded.
- :148-167 MEDIUM state: workoutsByType conditionally renders only when Object.keys(...).length > 0 — if empty, section silently disappears.
- :201-207 MEDIUM state: insights section renders multiple conditional Text blocks but if none match, "Insights" title renders with empty content below.
- :274 MEDIUM overflow: statItem width:"50%" + gap:spacing.sm on statsGrid — 50% doesn't account for gap.

### src/components/fitness/ExerciseGifPlayer.tsx (post-fix)
- :107-109 LOW REGRESSION: original audit flagged console.error here; fix removed logs but silent setHasError(true) means missing gifUrl shows "Failed to load" error UI instead of "Demo unavailable" placeholder.
- :284-300 MEDIUM state: errorContainer retry button resets state and re-fetches SAME broken URL — permanently broken URL = infinite retry loop.
- :511-514 MEDIUM contrast: qualityIndicator bg rgba(76,175,80,0.2) + text colors.success (#4CAF50) — green text on 20% green tint ~3:1.
- :601 MEDIUM contrast: closeButton bg rgba(255,255,255,0.2) on 95% black overlay — close button nearly invisible.

### src/components/fitness/ExerciseSessionModal.tsx (post-fix)
- :434-441 MEDIUM overflow: ExerciseGifPlayer height={180} width={180} hardcoded — parent exerciseGifContainer is rs(180).
- :530-533 MEDIUM overflow: overlay has ...StyleSheet.absoluteFillObject AND flex:1 — redundant.
- :677-701 MEDIUM overflow: progressDots flexWrap:"wrap" — 8+ sets wrap to 2nd row, misaligned.
- :696-700 MEDIUM REGRESSION: progressDotActive width:rs(14) with white border vs completed rs(10) with orange fill no border — confusing.
- :144-153 MEDIUM typography: pausedLabel and sideLabel fontSize:rf(7) — 7px well below 12px micro minimum.
- :181-187 MEDIUM contrast: SwitchBanner backgroundColor rgba(10,15,28,0.95) nearly-opaque dark blue covers GIF entirely — jarring.

### src/components/fitness/CustomPlanEmptyState.tsx (post-fix)
- :265-297 HIGH REGRESSION: all three emptyActionChip buttons call WRONG handlers — "Create First Template" calls onBrowseTemplates, "Generate with AI" calls onBuildSchedule.
- :375 MEDIUM overflow: explanation lineHeight rf(typography.fontSize.caption) * (typography.lineHeight.normal ?? 1.4) — if lineHeight.normal is a string, multiplication yields NaN.

### src/components/fitness/AchievementSystem.tsx (post-fix)
- :270-274 HIGH state: useEffect deps [workoutStats, user?.id] but reads achievements state inside checkForNewAchievements — stale closure.
- :271 MEDIUM state: if (workoutStats && achievements.length >= 0) — achievements.length >= 0 is ALWAYS true, guard is a no-op.
- :82 MEDIUM state: console.error — CLAUDE.md prohibits console.log/error in production paths.
- :251-255 MEDIUM state: console.error — same violation.
- :258 MEDIUM state: console.error — same violation.

### src/components/fitness/FitnessHeader.tsx (post-fix)
- :84-88 MEDIUM consistency: uses name="calendar" icon but screens/main/fitness/FitnessHeader.tsx:83 uses name="notifications-outline".
- :89-95 MEDIUM state: progressIndicator only renders when progressPercent > 0 && < 100 — at 100% completion badge disappears entirely.

### src/components/fitness/WeeklyPlanOverview.tsx (post-fix)
- :144 MEDIUM state: planSubtitle shows plan.duration ? String(plan.duration) : "—" — renders literal "—" when duration missing.
- :317-319 MEDIUM REGRESSION: dayCircle Math.max(rw(36),44) inflates circles from 36px to 44px — 7 × 44px = 308px + label widths overflow 320px screen.

### src/components/fitness/WeeklyCalendar.tsx (post-fix)
- :210-213 MEDIUM REGRESSION: fix swapped emoji "😴" to Ionicons "moon" for rest but kept text "✓"/"•" for workout indicators — inconsistent.
- :308-311 MEDIUM contrast: dayButtonRest backgroundColor colors.backgroundTertiary + opacity:0.85 — rest days nearly invisible.
- :367-370 MEDIUM contrast: workoutIndicatorText color colors.white + fontSize:rf(10) on colors.success (#4CAF50) or colors.warning (#FF9800) — white on green ~3.2:1, white on orange ~2.8:1.
- :377-379 MEDIUM state: restIndicatorText style defined (fontSize:rf(12)) but NEVER USED — dead code.

### src/components/fitness/WeekDaySelector.tsx (post-fix)
- :137-153 MEDIUM overflow: mealIndicator position:absolute bottom:rh(4) overlaps dayDate (fontSize rf(18)) when date is 2-digit number.
- :201-203 MEDIUM contrast: dayLabelPast colors.textSecondary (#B0B0B0) on rgba(255,255,255,0.08) — ~3.5:1, still below WCAG AA.

### src/components/fitness/WorkoutHistoryList.tsx (post-fix)
- :55 MEDIUM consistency: SWIPE_THRESHOLD=-100 hardcoded — actionContent width rw(48)*2+gap=~104px on tablets.
- :401-404 MEDIUM contrast: actionText fontSize:rf(10) + colors.white on colors.successAlt (#10B981) and colors.errorAlt (#EF4444) — 10px white on green ~2.9:1.

### src/components/fitness/PlanSection.tsx (post-fix)
- :9 MEDIUM consistency: imports WeeklyPlanOverview from ../../screens/main/fitness/ — but components/fitness/WeeklyPlanOverview.tsx also exists.
- :61 MEDIUM layout: section paddingHorizontal:rp(spacing.lg) but marginBottom:spacing.lg (not rp-scaled) — REGRESSION inconsistent unit usage.

### src/components/fitness/exercise-card/ExerciseCardDetails.tsx (post-fix)
- :31 HIGH REGRESSION: parent ExerciseCard.tsx:192 colors difficulty icon with getDifficultyColor (green/amber/red) but child always uses colors.textSecondary.
- :38 LOW REGRESSION: child uses timer-outline icon for rest time, parent ExerciseCard.tsx:202 uses time-outline.

### src/components/fitness/exercise-card/ExerciseCardHeader.tsx (post-fix)
- :50 MEDIUM REGRESSION: child uses "•" bullet separator in metaRow, parent ExerciseCard.tsx:142 uses "-".
- :39-42 MEDIUM REGRESSION: child exerciseName has numberOfLines={1}+adjustsFontSizeToFit but parent ExerciseCard.tsx:129-136 has NONE.
- :134-140 MEDIUM touch-target: completedBadge rs(32)×rs(32) — size mismatch with playButton Math.max(rs(44),44).

### src/components/fitness/exercise-card/ExerciseCardSections.tsx (post-fix)
- :66 MEDIUM REGRESSION: numberOfLines={5} on instructionText silently truncates long instructions after 5 lines with no "show more" affordance.
- :113-118 HIGH contrast: muscleGroupText colors.text (#FFFFFF white) on getMuscleGroupColor — for triceps bg is #FFEAA7 (light yellow), white-on-yellow ~1.6:1.

### src/components/fitness/exercise-card/ExerciseCardTimer.tsx (post-fix)
- :36 MEDIUM REGRESSION: rgba(245,158,11,0.2) amber tint + colors.warningAlt (#F59E0B) text — amber-on-amber ~2.8:1.

### src/components/fitness/gif-player/GifPlayerContent.tsx (post-fix)
- :136-144 MEDIUM REGRESSION: gifContainer has native shadowColor/Offset/Opacity/Radius (iOS), elevation:3 (Android), AND boxShadow:"0px 2px 4px..." — boxShadow is web-only and warns on React Native.
- :172-177 MEDIUM z-index: playbackOverlay zIndex:3 stays visible above loadingOverlay zIndex:2 — play/pause button floats on top of loading spinner.

### src/components/fitness/gif-player/FullscreenModal.tsx (post-fix)
- :32-33 HIGH REGRESSION: comment claims clamp to 480/900 but dimensions returns raw screenWidth/screenHeight WITHOUT clamping — on web/desktop GIF balloons to full screen width.
- :75-77 LOW REGRESSION: fullscreenHint "Tap the close button to exit" always shown below GIF, cluttering fullscreen view.

### src/components/fitness/instruction/ExerciseTipsCard.tsx (post-fix)
- :12 HIGH REGRESSION: imports raw colors object while every sibling imports flatColors as colors.
- :29 MEDIUM contrast: colors.secondary.DEFAULT (#00D4FF cyan) tip icons on colors.glass.backgroundDark (rgba(255,255,255,0.05)) — ~3.2:1.
- :44 MEDIUM REGRESSION: fontWeight:String(typography.fontWeight.bold) as any casts to any to bypass typing.

### src/components/fitness/instruction/ExerciseDetails.tsx (post-fix)
- :130-131 MEDIUM contrast: primaryChip bg rgba(255,107,53,0.2) + primaryChipText colors.primary (#FF6B35) — orange text on orange-tint ~2.5:1.
- :140-148 MEDIUM contrast: secondaryChip bg rgba(245,158,11,0.2) + secondaryChipText colors.warningAlt (#F59E0B) — amber-on-amber ~2.8:1.
- :152-160 MEDIUM contrast: equipmentChip bg rgba(33,150,243,0.2) + equipmentChipText colors.info (#2196F3) — blue-on-blue ~2.6:1.
- :162-170 MEDIUM contrast: bodyPartChip bg rgba(76,175,80,0.2) + bodyPartChipText colors.success (#4CAF50) — green-on-green ~2.4:1.

### src/components/fitness/instruction/InstructionSteps.tsx (post-fix)
- :39 MEDIUM REGRESSION: numberOfLines={5} on instructionText truncates long steps silently, no "show more" affordance.
- :40 MEDIUM REGRESSION: instruction.replace(/^Step:\d+\s*/, "") regex strips "Step:N " prefix but if instructions don't follow that format, regex is a no-op.

### src/components/fitness/instruction/TabNavigation.tsx (post-fix)
- :16-42 MEDIUM REGRESSION: uses TouchableOpacity, original audit flagged this; fix did not migrate to AnimatedPressable.
- :69-77 MEDIUM contrast: active tabText colors.surface (dark #1A1F2E) on colors.primary (orange #FF6B35) — ~3.2:1.

### src/components/fitness/builder/BuilderAnalyticsPanel.tsx (post-fix)
- :288 MEDIUM state: aggregateMuscleHeatmap called with () => [] curatedLookup stub — heatmap always returns empty muscle data, "Muscle Heatmap (4 weeks)" section ALWAYS renders EmptyHint. Dead feature.
- :410 HIGH overflow: ScrollView scrollEnabled={false} wraps all analytics sections — if content exceeds viewport, users cannot scroll.

### src/components/fitness/builder/BuilderSummaryFooter.tsx (post-fix)
- :321 HIGH consistency: aiMenuItem uses colors.primary.light for calendar icon, Progressive Overload uses colors.success.light, Deload uses colors.warning.light — three different semantic colors for sibling menu items.
- :333-336 HIGH state: "Apply Progressive Overload" disabled when priorPerformance.length===0 but only sets opacity:0.4 — no accessibilityState={{disabled:true}}.
- :446 MEDIUM z-index: container zIndex:1100 — DayBlock drag overlays use zIndex:100, ExerciseRow menu zIndex:50.

### src/components/fitness/builder/DayBlock.tsx (post-fix)
- :139-144 HIGH contrast: intensityColor for "rest" state is colors.text.secondary (#B0B0B0 grey) used as intensityChip backgroundColor with white text — grey bg + white text ~2.5:1.
- :369-382 HIGH keyboard: KeyboardAvoidingView wraps only Notes TextInput + label, not whole expanded content — when keyboard opens, kebab menu, rest timer, add-exercise button remain under keyboard.
- :413-415 HIGH z-index: menuDismiss Pressable with ...StyleSheet.absoluteFillObject rendered as FIRST child of dayMenu, then dayMenuList renders on top — but menuDismiss has no zIndex, on Android may render ABOVE menu items blocking taps.
- :491-524 MEDIUM z-index: copyPicker is sibling View below GlassCard with zIndex:60 elevation:6 — pushes subsequent DayBlocks DOWN (layout shift) rather than overlaying.

### src/components/fitness/builder/ExerciseEditorSheet.tsx (post-fix)
- :410-420 MEDIUM state: handleGroupWithSibling comment says "we only write our own group id; the sibling's update is the caller's responsibility (Phase 8)" — Phase 8 past, but sibling NEVER updated.
- :783-792 MEDIUM state: "Alternative Exercise" section is a dead end — only shows text, no button to set/change alternative. TODO(Phase 4) comment remains but Phase 4 shipped.
- :502-507 HIGH keyboard: ScrollView keyboardShouldPersistTaps="handled" but no KeyboardAvoidingView — keyboard covers bottom SetRows.
- :974 MEDIUM keyboard: TempoTooltip tooltipBubble position:absolute top:rp(28) inside Section's GlassCard — when keyboard open, tooltip clipped by sheet bottom edge.
- :423-458 HIGH state: handleClose PR-celebration logic: prevMaxWeightRef set to maxWeight on editor open (line 235), so never 0 when maxWeight>0 — "celebrate new PR when no prior PR" branch is dead code.

### src/components/fitness/builder/ExercisePickerSheet.tsx (post-fix)
- :606 HIGH state: search FlatList data falls to allExercises when search returns empty AND filters active — shows exercises that don't match search text, confusing.
- :657-719 MEDIUM layout: aiSection inside ListHeaderComponent with maxHeight:rp(220) overflow:"hidden" — when AI suggestions exceed 220px, content clipped with no scroll/expand affordance.
- :909-911 HIGH REGRESSION: filterChip minHeight Math.max(rp(36),36) — clamp floor is 36 not 44.
- :999-1001 HIGH contrast: aiSection bg rgba(255,107,53,0.2) (orange tint) + aiSectionTitle color colors.primary.DEFAULT (#FF6B35 orange) — orange text on orange-tint ~2.5:1.

### src/components/fitness/builder/ExerciseRow.tsx (post-fix)
- :481-511 HIGH z-index: menu position:absolute with zIndex:50 elevation:8 renders above sibling rows, but menuDismiss ...StyleSheet.absoluteFillObject with no zIndex — on Android may render BELOW menuList.
- :519-524 MEDIUM REGRESSION: row style overflow:"hidden" + borderRadius — dragAnimatedStyle transform translateY moves whole row INCLUDING actionsLayer (absolute behind row). Actions translate WITH row, defeating swipe-reveal.
- :580 LOW typography: supersetChipText fontSize:rf(9) — below 12px micro minimum.

### src/components/fitness/builder/InlineValidationBanner.tsx (post-fix)
- :155-176 MEDIUM state: balancedChip shows "Plan looks balanced" when hasDraft is true and warnings.length===0 — but validation may not have RUN yet (draft exists, warnings still []). Falsely claims balance.
- :395 HIGH REGRESSION: balancedChip minHeight Math.max(rp(36),36) — clamped to 36px floor, below 44px.
- :473 MEDIUM REGRESSION: fixBtn minHeight Math.max(rf(32),44) — uses rf (font-scaling) instead of rp.

### src/components/fitness/builder/MuscleHeatmap.tsx (post-fix)
- :70-73 MEDIUM REGRESSION: isLightCell returns true ONLY for colors.success.DEFAULT (green) — warning (orange) and primary (orange) also need dark text.
- :142-163 HIGH touch-target: cell width:cellSize height:cellSize where cellSize=Math.max(rw(40),40) — clamped to 40px floor, below 44px.
- :157-161 HIGH contrast: cellValueText (white) on intensityColor — for warning (#FF9800 orange) + white text ~2.5:1, fails WCAG AA.

### src/components/fitness/builder/NaturalLanguageEditBar.tsx (post-fix)
- :376 HIGH REGRESSION: exampleChip minHeight Math.max(rp(36),36) — clamped to 36px floor, below 44px.

### src/components/fitness/builder/SetRow.tsx (post-fix)
- :570 HIGH REGRESSION: typeChip minHeight Math.max(rp(28),32) — clamped to 32px floor, below 44px.
- :365-371 MEDIUM touch-target: typeChip Pressable hitSlop:{6} + chip minHeight Math.max(rp(28),32) — clamped to 32px floor.
- :548 MEDIUM keyboard: labeledInputField returnKeyType:"done" but no onSubmitEditing.
- :316-320 MEDIUM a11y: row has accessibilityRole="button" + label but contains 4 TextInputs — button role on container with editable text fields confuses screen readers.

### src/components/fitness/builder/TemplateDetailSheet.tsx (post-fix)
- :397 HIGH overflow: template.name rendered in h2 font with NO numberOfLines/adjustsFontSizeToFit — long names wrap to 3-4 lines, pushing stats grid below fold.
- :443 MEDIUM consistency: Badge backgroundColor `${tint}1F` — appends alpha hex to 7-char hex string, fragile pattern.
- :560-622 MEDIUM layout: actions section stacks 5 fullWidth GlassButtons (Start Now + Use in Schedule + Fork + Rate + Share) — very tall (~250px). No max-height or grid layout.

### src/components/fitness/builder/TemplateRatingSheet.tsx (post-fix)
- :428-430 MEDIUM touch-target: starBtn minWidth/maxWidth:rw(44)..rw(56) — 5 stars × ~50px + 4 gaps × 4px = ~266px; on 320px screens with sheet padding, overflows horizontally.
- :456 MEDIUM touch-target: reviewInput minHeight:rp(96) but no maxHeight — long reviews grow unbounded, pushing Submit button off-screen.

### src/components/fitness/builder/WeeklyInsightsPanel.tsx (post-fix)
- :293-307 MEDIUM overflow: coverageSection GradientBarChart height={rp(coverageBarHeight())} where coverageBarHeight()=10*36=360px — maxHeight:rp(280) clips last ~2 muscle groups' bars.
- :400 HIGH state: buildCoverageBars maxValue:20 hardcoded — muscle groups with >20 sets clip at top of bar.
- :546 MEDIUM typography: emptySubtitle fontSize:rf(caption) but lineHeight:rf(body)*lineHeight.normal — lineHeight ~24px on 13px caption text, too loose.

---

## Top Priority — REGRESSIONS to Fix Immediately

The 40 REGRESSIONS listed at the top of this doc were INTRODUCED by the Wave 1/2 fix agents. These are higher priority than the new findings because they represent broken fixes. Fix these before addressing new issues.

Key regression categories:
1. **Dead KAV** — RecoveryTipsModal, WorkoutTimer (KAV added to modals with no TextInputs, dead code shifting content)
2. **Double-padding** — WorkoutSessionScreen, ExerciseInstructionModal (SafeAreaView edges + manual paddingTop)
3. **Math.max clamp floors too low** — TemplateLibraryScreen, ExercisePickerSheet, InlineValidationBanner, SetRow, NaturalLanguageEditBar (clamp floor 36 or 32 instead of 44)
4. **Inconsistent emoji→Ionicons migration** — AchievementNotifications, WeeklyCalendar, WorkoutSessionScreen (some emojis migrated, others left as text)
5. **Wrong handler wiring** — CustomPlanEmptyState (all 3 chip buttons call wrong handlers)
6. **Fragile hex-append NOT eliminated** — SetLogModal, WorkoutHeader (same anti-pattern fix was supposed to remove)
7. **Token migration incomplete** — components/workout/* still on flatColors
8. **numberOfLines truncation dead-ends** — ExerciseInstructionModal, ExerciseCardSections, InstructionSteps (5-line clamp with no "show more")
9. **Duplicate component divergence** — exercise-card/* children diverged from parent ExerciseCard.tsx (different bullet chars, different icons, different truncation)
10. **Layout regressions** — RecoveryTipsModal scrollView maxHeight increased (worse), WeeklyPlanOverview dayCircle inflated (overflow)

---

Total: 575+ true positive issues across 4 agents, all cited with file:line references.
