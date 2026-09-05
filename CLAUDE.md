# FitAI — Claude Working Rules

## Speed & Efficiency Rules (highest priority)

- **Do checks yourself** with Read/Grep/Glob directly in the main conversation. Don't delegate what you can verify in 1–2 tool calls.
- **For simple tasks (≤ 3 files, clear scope):** no subagents, no plan-writing, no verification/code-review agents afterward. Trace the data path yourself (store → service → DB → UI), confirm the single source of truth, identify the root cause, make the minimal precise fix. Done.
- **Reach for agents or a written plan only when** the task touches 5+ files AND requires coordinated changes across multiple layers, OR the user explicitly asks for a plan/design/architecture/exploration.
- **For flow/state bugs** (data not arriving, wrong value, missing param): add targeted `console.log` at every handoff point in the chain (navigate call → state setter → component param → store action) before writing a fix — it reveals the exact layer where data is dropped, so you fix only that layer. Remove these logs once the fix is verified; they're debugging scaffolding, not something that ships (see "No debug logs in production paths" below).

## Stack
React Native (Expo) + TypeScript + Zustand + Supabase + Cloudflare Workers. No Docker available locally.

## Commands
- `npm run type-check` — `tsc --noEmit`
- `npm test` / `npm run test:coverage` — Jest
- `npm run lint` / `npm run lint:fix` — ESLint
- **Definition of done:** type-check clean and relevant tests passing before reporting a change complete.

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
Credentials are in `.env.local`. Use the Supabase CLI for migrations — not the Supabase MCP server.
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
- AI generation: `src/ai/index.ts`, `src/ai/workoutBuilderAi.ts`
- Worker request/response schemas (Zod): `fitai-workers/src/utils/validation.ts` and per-handler files in `fitai-workers/src/handlers/`
- Completion logic: `src/services/completionTracking.ts`
- Calorie calc: `src/services/calorieCalculator.ts`
- DB migrations: `supabase/migrations/` (timestamp-named `.sql` files)
- Workers API: `fitai-workers/src/handlers/`
- Supabase client: `src/services/supabase.ts`
- Type transformers: `src/utils/typeTransformers.ts` — enum mapping (activity_level, diet_type) + snake↔camel conversion
- Health calculations: `src/utils/healthCalculations/` — BMR, TDEE, macros, water, HR zones, health scores

## Architecture Doc Rules

1. **Always start from the architecture doc** — Read `src/docs/FITAI_DATA_ARCHITECTURE.md` before touching any data flow. It maps every field, every formula, every persistence path, every generation pipeline.
2. **For new features** — Follow the pattern: define field in `src/types/onboarding.ts` → add migration (`IF NOT EXISTS`) → update service save/load in `src/services/onboardingService.ts` → wire through transformer in `src/services/aiRequestTransformers.ts` → update worker Zod schema + prompt → update the architecture doc.
3. **For debugging** — Section E tells you which hook reads what from where. Section F tells you exactly what reaches AI generation. Section C has every formula. Trace the doc first, then the code.
4. **Keep the doc updated** — When you add a field, change a formula, modify persistence, or resolve a tech debt item, update the architecture doc in the same change. Stale docs are worse than no docs.
5. **Enum boundaries** — Activity level (`extreme` ↔ `very_active`) and diet type (`non-veg`/`balanced` ↔ `omnivore`) have mapping functions in `typeTransformers.ts`. Always map at the boundary between onboarding types and health calculation types.

## What Not To Do
- Do not use `Alert.alert` directly — use `crossPlatformAlert` from `src/utils/crossPlatformAlert.ts`
- Do not add `console.log` debug lines in production paths
- Do not create new util functions if one already exists in `src/utils/`
- Do not bypass RLS — every Supabase table has `auth.uid() = user_id` policies
