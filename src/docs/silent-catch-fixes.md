# Silent Catch Fixes — Empty `catch` blocks filled with `console.error`/`console.warn`

**Date:** 2026-06-23
**Scope:** P1-1 + P1-2 from `src/docs/architectural-audit.md` (violates CLAUDE.md #5: No Silent Failures).
**Method:** Read/Grep/Edit only. No device, no commits.

## Why
Empty `catch (error) {}` blocks swallowed errors silently — Supabase failures, calculator throws, AsyncStorage corruption, SecureStore downgrades all disappeared. Per CLAUDE.md #5, every catch must `console.error` (or `console.warn` for intentional fallback) the failure so devs can see it. Behavior (return values, fallbacks) is preserved; only the swallowing is removed.

## Style conventions matched
- `[<module>] <what failed>:`, error` — matches existing usage in `advancedExerciseMatching.ts`, `aiRequestTransformers.ts`, `achievementEngine.ts`.
- SecureStore adapter uses `console.warn` (fallback to AsyncStorage is intentional, not a hard failure) — matches audit's P1-2 recommendation.
- AsyncInitializer init sub-steps use `console.error` with `(non-fatal)` suffix to signal graceful skip.

## Fixed catches (18 total)

### `src/hooks/useWorkoutAchievements.ts` (4)
| Line | Before | After | Failure surfaced |
|------|--------|-------|------------------|
| 102 | `} catch (error) {}` | `console.error("[useWorkoutAchievements] trackSetCompletion failed:", error);` | Achievement `checkProgress` for set_completed |
| 133 | `} catch (error) {}` | `console.error("[useWorkoutAchievements] trackExerciseCompletion failed:", error);` | Achievement `checkProgress` for exercise_completed |
| 169 | `} catch (error) {}` | `console.error("[useWorkoutAchievements] trackMilestone failed:", error);` | Achievement `checkProgress` for workout_halfway / three_quarters |
| 210 | `} catch (error) {}` | `console.error("[useWorkoutAchievements] trackWorkoutCompletion failed:", error);` | `trackAchievementActivity.workoutCompleted` + `checkProgress` for workout_completed |

### `src/utils/healthCalculations/metricsCalculator.ts` (4)
| Line | Before | After | Failure surfaced |
|------|--------|-------|------------------|
| 75 | `} catch (error) {}` | `console.error("[metricsCalculator] HR zone calc failed:", error);` | `HeartRateCalculatorService.calculateZones` throw → `hrZones` stays null |
| 84 | `} catch (error) {}` | `console.error("[metricsCalculator] VO2max calc failed:", error);` | `VO2MaxCalculatorService.estimate` throw → `vo2max` stays null |
| 100 | `} catch (error) {}` | `console.error("[metricsCalculator] health score calc failed:", error);` | `HealthScoreCalculatorService.calculate` throw → `healthScore` stays null |
| 109 | `} catch (error) {}` | `console.error("[metricsCalculator] muscle gain limits calc failed:", error);` | `MuscleGainCalculatorService.calculateLimits` throw → `muscleGainLimits` stays null |

### `src/services/advancedExerciseMatching.ts` (2)
| Line | Before | After | Failure surfaced |
|------|--------|-------|------------------|
| 583 | `} catch (error) {}` | `console.error("[advancedExerciseMatching] loadSemanticCache failed:", error);` | AsyncStorage `semantic_exercise_cache` read/parse corruption |
| 594 | `} catch (error) {}` | `console.error("[advancedExerciseMatching] saveSemanticCache failed:", error);` | AsyncStorage `semantic_exercise_cache` write failure |

### `src/services/supabase.ts` — `ExpoSecureStoreAdapter` (3, `console.warn` per audit P1-2)
| Line | Before | After | Failure surfaced |
|------|--------|-------|------------------|
| 24 | `} catch {` | `console.warn("[SecureStoreAdapter] getItem falling back to AsyncStorage for key:", key, error);` | SecureStore read fail → AsyncStorage (less secure) |
| 43 | `} catch {` | `console.warn("[SecureStoreAdapter] setItem falling back to AsyncStorage for key:", key, error);` | SecureStore write fail → AsyncStorage (auth token security downgrade) |
| 60 | `} catch {` | `console.warn("[SecureStoreAdapter] removeItem falling back to AsyncStorage for key:", key, error);` | SecureStore delete fail → AsyncStorage fallback |

### `src/services/api.ts` (1)
| Line | Before | After | Failure surfaced |
|------|--------|-------|------------------|
| 360 | `} catch (error) {}` | `console.error("[api] initialize restoreSession failed:", error);` | `authService.restoreSession()` throw during app init |

### `src/services/healthKit.ts` (1)
| Line | Before | After | Failure surfaced |
|------|--------|-------|------------------|
| 13 | `} catch (error) {}` | `console.error("[healthKit] expo-health-kit module load failed:", error);` | `require("expo-health-kit")` failure on iOS |

### `src/services/health/syncHelpers.ts` (1)
| Line | Before | After | Failure surfaced |
|------|--------|-------|------------------|
| 234 | `} catch (bmrError) {}` | `console.error("[syncHelpers] syncBMR aggregate failed:", bmrError);` | BMR aggregate record fetch failure |

### `src/components/AsyncInitializer.tsx` (2)
| Line | Before | After | Failure surfaced |
|------|--------|-------|------------------|
| 52 | `} catch (authError) {}` | `console.error("[AsyncInitializer] googleAuthService.configure failed (non-fatal):", authError);` | Google auth configure failure (intentional skip) |
| 58 | `} catch (migrationError) {}` | `console.error("[AsyncInitializer] migrationService.runMigrations failed (non-fatal):", migrationError);` | Data migration failure (intentional skip) |

## Total
- **Empty catches found:** 18 (audit claimed "~9 across named files + others"; authoritative grep confirmed 18)
- **Empty catches fixed:** 18
- **Files touched:** 8

## Gates
- `npx tsc --noEmit` → exit 0 (clean)
- `npx jest` → 87 suites passed, 471 tests passed, 9 skipped, 0 failed (no regressions; ≥471 passing requirement met)

## Notes
- No tests asserted the empty catch behavior, so no test updates were needed.
- All return values / fallbacks preserved — only the silent swallowing was removed.
- SecureStore adapter uses `console.warn` (intentional fallback, not a hard error) per audit P1-2 guidance; all others use `console.error` per CLAUDE.md #5.
- AsyncInitializer sub-step catches annotated `(non-fatal)` to clarify they are intentional skips, not swallowed DB errors.
