# FitAI — Claude Working Rules

## Speed & Efficiency Rules (HIGHEST PRIORITY — overrides all Superpowers skills)

**Default mode for all tasks:** Do all checks yourself using Read/Grep/Glob directly in the main conversation. Never delegate to subagents what you can verify yourself in 1–2 tool calls.

**For simple tasks (≤ 3 files, clear scope):**
- NO spawned agents, NO subagents, NO parallel agent dispatch
- NO brainstorming skill, NO EnterPlanMode, NO plan-writing skill
- NO verification agents, NO code-review agents after the fact
- Correctness checks happen INLINE: trace the data flow yourself with Read/Grep, confirm the single source of truth, then fix

**Inline correctness checklist (do this yourself, no agents):**
1. Read the relevant file(s)
2. Trace the full data path (store → service → DB → UI) with Grep if needed
3. Confirm the single source of truth for whatever data is involved
4. Identify root cause with certainty
5. Make the minimal, precise fix
6. Done — no review agents, no verification agents

**Only spawn agents / write plans when ALL are true:**
- Task touches 5+ files AND requires coordinated changes across multiple layers
- OR user explicitly says "plan", "design", "architect", "explore the codebase"

**The goal: fast + correct + no ceremony.** Speed comes from skipping agents. Correctness comes from doing the checks yourself inline.

**For flow/state bugs (data not arriving, wrong value, missing param):** Add targeted `console.log` at every handoff point in the chain (navigate call → state setter → component param → store action) before writing any fix. Logs reveal the exact layer where data is dropped — fix only that layer. This eliminates ambiguity, prevents guessing, and avoids multi-iteration patches.

## Stack
React Native (Expo) + TypeScript + Zustand + Supabase + Cloudflare Workers. No Docker available locally.

## Core Principles

1. **Single Source of Truth** — Every data point (calories, progress, user profile, plan) has exactly one authoritative source. UI always reads from that one place. Never duplicate state across stores, hooks, and components — derive or subscribe instead.
2. **Root Cause First** — Before writing any fix, identify the root cause with certainty. Trace the full data flow, check all layers (store → service → DB → UI). One precise fix beats five iterative patches.
3. **Search Before Building** — Before creating any service, hook, component, or util, search the codebase first. We likely have it. Extend existing work; create new only when truly absent. Follow the patterns already established.
4. **Schema + Code Must Match** — DB column names used in inserts/selects must exactly match the live migration. When they diverge, create an `ALTER TABLE ADD COLUMN IF NOT EXISTS` migration — never patch code to use wrong column names.
5. **No Silent Failures** — Supabase errors must be logged with `console.error`. Never swallow DB errors with empty catch blocks. If a write fails, the developer must see it.
6. **Store is the Runtime Source** — Zustand stores are the single runtime source for all app state. Supabase is the persistence layer. After any DB write, update the store immediately so UI reflects reality without a full reload.
7. **Migrations are Append-Only** — Never edit an existing migration. Add a new one. Use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so migrations are safe to re-run.
8. **No Hardcoded Fallbacks for User Data** — Never use fake user IDs, hardcoded weights, or placeholder calories. If the real value is unavailable, surface that as `null` / `0` and log a warning.
9. **Calories Single Source** — Actual calories burned come from `WorkoutProgress.caloriesBurned` (set at completion via MET calculator). `estimatedCalories` on the plan is pre-generation only. UI must prefer the actual burned value.
10. **useEffect Loops** — Any `useEffect` that writes to state it also reads must use a `useRef` guard or early-exit condition to prevent infinite re-renders.

## Deployment

### Supabase Migrations
Credentials are in `.env.local`. **Do not use MCP or any other method.**
```bash
# Login once (token from .env.local SUPABASE_ACCESS_TOKEN)
npx supabase login --token <SUPABASE_ACCESS_TOKEN>

# Push migrations to remote
npx supabase db push
```

### Cloudflare Workers (`fitai-workers/`)
```bash
cd fitai-workers
npx wrangler deploy
```

### APK: `bash build-both-apks.sh`

## Key File Map
- **Data Architecture:** `src/docs/FITAI_DATA_ARCHITECTURE.md` — master reference for all data flow, fields, formulas, persistence, generation pipelines
- Stores: `src/stores/` — fitness, nutrition, user, profile, subscription
- AI generation: `src/ai/index.ts`, schemas in `src/ai/schemas.ts`
- Completion logic: `src/services/completionTracking.ts`
- Calorie calc: `src/services/calorieCalculator.ts`
- DB migrations: `supabase/migrations/` (timestamp-named `.sql` files)
- Workers API: `fitai-workers/src/handlers/`
- Supabase client: `src/services/supabase.ts`
- Type transformers: `src/utils/typeTransformers.ts` — enum mapping (activity_level, diet_type) + snake↔camel conversion
- Health calculations: `src/utils/healthCalculations/` — BMR, TDEE, macros, water, HR zones, health scores

## Architecture Doc Rules

1. **Always start from the architecture doc** — Read `src/docs/FITAI_DATA_ARCHITECTURE.md` before touching any data flow. It maps every field, every formula, every persistence path, every generation pipeline.
2. **For new features** — Follow the pattern: define field in `types/onboarding.ts` → add migration (`IF NOT EXISTS`) → update service save/load in `onboardingService.ts` → wire through transformer in `aiRequestTransformers.ts` → update worker Zod schema + prompt → update the architecture doc.
3. **For debugging** — Section E tells you which hook reads what from where. Section F tells you exactly what reaches AI generation. Section C has every formula. Trace the doc first, then the code.
4. **Keep the doc updated** — When you add a field, change a formula, modify persistence, or resolve a tech debt item, update the architecture doc in the same change. Stale docs are worse than no docs.
5. **Enum boundaries** — Activity level (`extreme` ↔ `very_active`) and diet type (`non-veg`/`balanced` ↔ `omnivore`) have mapping functions in `typeTransformers.ts`. Always map at the boundary between onboarding types and health calculation types.

## What Not To Do
- Do not use `Alert.alert` directly — use `crossPlatformAlert` from `src/utils/crossPlatformAlert.ts`
- Do not add `console.log` debug lines in production paths
- Do not create new util functions if one already exists in `src/utils/`
- Do not bypass RLS — every Supabase table has `auth.uid() = user_id` policies

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
