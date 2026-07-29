# GOAL: Fix & polish FitAI Workout flow (UI/UX + functionality + concept explainability) via 3-orchestrator/3-sub-agent parallel loop, verified with Playwright MCP.

## ARCHITECTURE
1. Spawn 3 orchestrator agents in ONE message (run_in_background: true). Each gets one work-package (A/B/C).
2. Each orchestrator spawns exactly ONE sub-agent, hands it the package, relays status, reports done/blocked. Orchestrators do NOT code/review/Read — they assign+track only (lean context).
3. Sub-agents do the real work: Read/Grep/Glob/Edit/Write/Bash + Playwright MCP.
4. Main session (you): monitor the 3 orchestrators. If any fails/stalls, relaunch a replacement with the same package. ALWAYS keep 3 active — refill the bucket — until all done.
5. When all 3 done: run `npx tsc --noEmit` + `npm run lint`, fix breakages inline, summarize.

## PACKAGE A — DASHBOARD, WEEK STRIP, STATS, START MODAL
Files: Workout dashboard screen, week-calendar strip, stats row, Start-Workout modal.
- Title-case exercise names ("dumbbell clean" → "Dumbbell Clean") at render boundary or source.
- "0/5 workouts" + "0% Progress": verify they read from workout store / completionTracking and update after completion (not stuck at 0).
- "2470 Est. Calories": clarify = estimated WEEKLY burn; add info tooltip; confirm sourced from TDEE×activity (no hardcoded fallback).
- Week strip: workout-day vs rest-day distinction clear; fix day-highlight bugs.
- "Ready to Go" pill: reflects real readiness (not done today).
- Start modal: tighten copy; "Begin Workout" navigates correctly into exercise intro.

## PACKAGE B — EXERCISE INTRO + ACTIVE SET
Files: exercise intro component, active-set component, progress header, illustration card.
- Title-case exercise name; verify "History" link works (or remove); "View Instructions" renders content.
- "Tap to zoom" muscle illustration: confirm interaction works.
- Page indicator dots: clarify what they represent (sets? exercises?) — label or remove.
- "Set 1 of 4" + "10–13 reps": verify rep range from plan; make tip text contextual/rotating per set, not static.
- Progress bar: verify it advances as sets complete (set-based, not just exercise-based).
- Header metrics: timer ticks live, calories accumulate, volume = Σ(weight×reps) across completed sets — NOT 0.

## PACKAGE C — SET-LOG MODAL + EXPLAINERS + PERSISTENCE
Files: set-logging modal, RPE slider, set-type chips, explainer components, workout store.
- Set-type chips W/WU/F/D → full labels Warm-up/Working/Failure/Drop-set + legend/tooltip.
- Rename "Workout Information Session" → "Set Details" or "Log This Set".
- RPE slider: add explainer (Rate of Perceived Exertion 1–10, what each zone means); show numeric value ("Hard — RPE 8").
- VOLUME=0 BUG: compute live as weight×reps when both entered; accumulate across sets.
- PROGRESSIVE OVERLOAD EXPLAINER: small dismissible info card explaining what it is + how app increases weight/reps over time. Pull real params from store — NO hardcoding.
- Persistence: saved set writes to store AND Supabase (CLAUDE.md rule 6). Log errors with console.error, never swallow.

## VERIFICATION (every sub-agent)
1. Ensure Expo web running: `npx expo start --web` (reuse if already up).
2. Playwright MCP: navigate to Workout tab → walk Dashboard→Start→Begin→Exercise Intro→Start Exercise→Complete Set→Log Set.
3. BEFORE screenshot each screen, apply fixes, AFTER screenshot.
4. Confirm fixes render in browser. Report: files touched, screenshots, remaining issues.

## COMPLETION
- All A/B/C defects fixed + Playwright-verified.
- `npx tsc --noEmit` + `npm run lint` pass.
- Explainers (RPE, progressive overload, set types) visible, accurate, non-hardcoded.
- Sets persist to store + Supabase.
- src/docs/FITAI_DATA_ARCHITECTURE.md updated for data-flow changes.
- No Alert.alert (use crossPlatformAlert), no console.log in prod paths, no hardcoded user data.

## RULES
- CLAUDE.md: single source of truth, root-cause-first, search-before-build, schema+code match, no silent failures.
- Use code-review-graph MCP (semantic_search_nodes, query_graph, get_impact_radius) BEFORE Grep/Glob/Read.
- Sub-agents: ping orchestrator → main session on ambiguity. Do NOT guess on data-flow.
- Orchestrators report: {package, state: working|done|blocked, files, screenshots, blockers}. Short.
- Main session: relaunch failed orchestrators; keep 3 active; run final checks.
