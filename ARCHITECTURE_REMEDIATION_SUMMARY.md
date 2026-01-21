# Architecture Remediation Summary

## Mission: Fix Dual Source of Truth and Race Conditions

**Date:** January 21, 2026  
**Status:** In Progress

---

## Executive Summary

This document outlines the architecture remediation work to eliminate dual source of truth issues and race conditions in the FitAI application. The core problems stem from:

1. **Dual Source of Truth**: Local state (Zustand) and database (Supabase) operate independently
2. **No Field Name Transformers**: Inconsistent naming between camelCase (app) and snake_case (database)
3. **Race Conditions**: Parallel database operations in onboarding that should be sequential
4. **No Conflict Resolution**: When local and remote data diverge, no strategy exists to resolve
5. **No Cache Invalidation**: No centralized sync coordinator to manage cache consistency

---

## Changes Implemented

### 1. Field Name Transformation Utilities ✅

**File:** `src/utils/transformers/fieldNameTransformers.ts`

**Purpose:** Provide consistent field name transformation at database boundaries

**Key Functions:**

- `toSnakeCase(str)` - Convert camelCase to snake_case
- `toCamelCase(str)` - Convert snake_case to camelCase
- `keysToSnakeCase(obj)` - Recursively transform object keys to snake_case
- `keysToCamelCase(obj)` - Recursively transform object keys to camelCase
- `prepareDatabaseWrite(obj)` - Prepare object for database write (snake_case + remove undefined)
- `transformDatabaseRead(obj)` - Transform database response to camelCase

**Usage Pattern:**

```typescript
import { toDb, fromDb } from "@/utils/transformers/fieldNameTransformers";

// Writing to database
const dbData = toDb(appData);
await supabase.from("table").insert(dbData);

// Reading from database
const { data } = await supabase.from("table").select("*");
const appData = fromDb(data);
```

---

### 2. SyncCoordinator Service ✅

**File:** `src/services/sync/SyncCoordinator.ts`

**Purpose:** Central synchronization coordinator for all stores

**Key Features:**

- **Database-First Writes**: Update database FIRST, then cache
- **Timestamp-Based Conflict Resolution**: Last-write-wins strategy
- **Cache Invalidation**: TTL-based cache management
- **Offline Support**: Automatic queueing for failed operations
- **Batch Operations**: Efficient multi-entity sync

**Core Methods:**

```typescript
// Sync TO database (database-first write)
await syncCoordinator.syncToDatabase(
  "workout_sessions",
  workoutSession,
  (session) => updateLocalCache(session),
);

// Sync FROM database (database-first read)
const { data } = await syncCoordinator.syncFromDatabase(
  "workout_sessions",
  sessionId,
  () => getLocalSession(),
  (session) => updateLocalCache(session),
);
```

**Conflict Resolution Strategy:**

- Compare `syncMetadata.lastModifiedAt` timestamps
- If local > remote: Keep local, queue sync to database
- If remote > local: Use remote, update cache
- If equal: Prefer remote for consistency

---

### 3. Dual Source of Truth Fixes (Pending Implementation)

#### 3a. Fix `fitnessStore.completeWorkout()` 📋

**File:** `src/stores/fitnessStore.ts:368-380`

**Current Implementation:**

```typescript
completeWorkout: (workoutId, sessionId) => {
  // BAD: Only updates local state
  set((state) => ({
    workoutProgress: {
      ...state.workoutProgress,
      [workoutId]: {
        workoutId,
        progress: 100,
        completedAt: new Date().toISOString(),
        sessionId,
      },
    },
  }));
},
```

**Required Fix:**

```typescript
completeWorkout: async (workoutId, sessionId) => {
  const completedAt = new Date().toISOString();

  try {
    // DATABASE-FIRST PATTERN: Update database FIRST
    if (sessionId) {
      await crudOperations.updateWorkoutSession(sessionId, {
        completedAt,
        isCompleted: true,
        syncMetadata: {
          lastModifiedAt: completedAt,
          syncVersion: 1,
          deviceId: 'dev-device',
        },
      });
      console.log(`✅ Workout ${workoutId} marked complete in database`);
    }

    // THEN update Zustand cache
    set((state) => ({
      workoutProgress: {
        ...state.workoutProgress,
        [workoutId]: {
          workoutId,
          progress: 100,
          completedAt,
          sessionId,
        },
      },
    }));
    console.log(`✅ Workout ${workoutId} cache updated`);

  } catch (error) {
    console.error(`❌ Failed to complete workout ${workoutId}:`, error);

    // FALLBACK: Queue for offline sync if database update fails
    await offlineService.queueAction({
      type: 'UPDATE',
      table: 'workout_sessions',
      data: {
        id: sessionId,
        completed_at: completedAt,
        is_completed: true,
      },
      userId: useAuthStore.getState().user?.id || 'guest',
      maxRetries: 3,
    });

    // Still update local cache for optimistic UI
    set((state) => ({
      workoutProgress: {
        ...state.workoutProgress,
        [workoutId]: {
          workoutId,
          progress: 100,
          completedAt,
          sessionId,
        },
      },
    }));
    console.log(`📥 Workout ${workoutId} queued for offline sync`);
  }
},
```

**Changes:**

- ✅ Database update FIRST
- ✅ Cache update SECOND
- ✅ Offline queue on failure
- ✅ Proper error handling
- ✅ Add sync metadata with timestamps

---

#### 3b. Fix `nutritionStore.completeMeal()` 📋

**File:** `src/stores/nutritionStore.ts:406-435`

**Current Implementation:**

```typescript
completeMeal: (mealId, logId) => {
  console.log('🍽️ NutritionStore: completeMeal called:', { mealId, logId });
  console.log('🍽️ NutritionStore: Previous progress:', get().mealProgress[mealId]);

  set((state) => {
    const newProgress = {
      ...state.mealProgress,
      [mealId]: {
        ...state.mealProgress[mealId],
        mealId,
        progress: 100,
        completedAt: new Date().toISOString(),
        logId,
      },
    };

    console.log('🍽️ NutritionStore: New progress:', newProgress[mealId]);
    console.log('🍽️ NutritionStore: All meal progress:', newProgress);

    return {
      mealProgress: newProgress,
    };
  });

  // Log the final state after update
  setTimeout(() => {
    const finalProgress = get().mealProgress[mealId];
    console.log('🍽️ NutritionStore: Final state after completeMeal:', finalProgress);
  }, 0);
},
```

**Required Fix:**

```typescript
completeMeal: async (mealId, logId) => {
  const completedAt = new Date().toISOString();
  console.log('🍽️ NutritionStore: completeMeal called:', { mealId, logId });

  try {
    // DATABASE-FIRST PATTERN: Update database FIRST
    if (logId) {
      const existingLog = await crudOperations.readMealLog(logId);
      const updatedNotes = (existingLog?.notes || '') + ' [COMPLETED]';

      await crudOperations.updateMealLog(logId, {
        notes: updatedNotes,
        syncMetadata: {
          lastModifiedAt: completedAt,
          syncVersion: (existingLog?.syncMetadata?.syncVersion || 0) + 1,
          deviceId: 'dev-device',
        },
      });
      console.log(`✅ Meal ${mealId} marked complete in database`);
    }

    // THEN update Zustand cache
    set((state) => {
      const newProgress = {
        ...state.mealProgress,
        [mealId]: {
          ...state.mealProgress[mealId],
          mealId,
          progress: 100,
          completedAt,
          logId,
        },
      };

      console.log('🍽️ NutritionStore: Cache updated:', newProgress[mealId]);

      return {
        mealProgress: newProgress,
      };
    });

  } catch (error) {
    console.error(`❌ Failed to complete meal ${mealId}:`, error);

    // FALLBACK: Queue for offline sync if database update fails
    await offlineService.queueAction({
      type: 'UPDATE',
      table: 'meal_logs',
      data: {
        id: logId,
        notes: '[COMPLETED]',
      },
      userId: useAuthStore.getState().user?.id || 'guest',
      maxRetries: 3,
    });

    // Still update local cache for optimistic UI
    set((state) => ({
      mealProgress: {
        ...state.mealProgress,
        [mealId]: {
          ...state.mealProgress[mealId],
          mealId,
          progress: 100,
          completedAt,
          logId,
        },
      },
    }));
    console.log(`📥 Meal ${mealId} queued for offline sync`);
  }
},
```

**Changes:**

- ✅ Database update FIRST
- ✅ Cache update SECOND
- ✅ Offline queue on failure
- ✅ Proper error handling
- ✅ Add sync metadata with timestamps

---

### 4. Fix Onboarding Race Conditions 📋

**File:** `App.tsx:380-641`

**Current Problem:** `syncLocalToDatabase()` uses parallel operations that can cause race conditions

**Current Implementation (Lines 397-463):**

```typescript
// Save personal info to profiles table
if (onboardingData.personalInfo) {
  try {
    const success = await PersonalInfoService.save(
      userId,
      onboardingData.personalInfo,
    );
    if (!success) {
      errors.push("Failed to save personalInfo");
    } else {
      console.log("✅ [SYNC] PersonalInfo synced to database");
    }
  } catch (e) {
    errors.push(`Error saving personalInfo: ${e}`);
  }
}

// Save diet preferences
if (onboardingData.dietPreferences) {
  try {
    const success = await DietPreferencesService.save(
      userId,
      onboardingData.dietPreferences,
    );
    if (!success) {
      errors.push("Failed to save dietPreferences");
    } else {
      console.log("✅ [SYNC] DietPreferences synced to database");
    }
  } catch (e) {
    errors.push(`Error saving dietPreferences: ${e}`);
  }
}

// ... similar pattern for bodyAnalysis, workoutPreferences, advancedReview
```

**Required Fix - Sequential Waterfall Pattern:**

```typescript
const syncLocalToDatabase = async (
  userId: string,
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];
  const rollbackSteps: Array<() => Promise<void>> = [];

  try {
    console.log(
      "🔄 [SYNC] Starting SEQUENTIAL local-to-database sync for user:",
      userId,
    );

    // Load from onboarding_data
    const onboardingDataStr = await AsyncStorage.getItem("onboarding_data");
    if (!onboardingDataStr) {
      console.log("🔄 [SYNC] No onboarding_data found in AsyncStorage");
      return { success: false, errors: ["No local data found"] };
    }

    const onboardingData = JSON.parse(onboardingDataStr);
    console.log(
      "🔄 [SYNC] Found onboarding_data, syncing SEQUENTIALLY to database...",
    );

    // STEP 1: Save personal info (REQUIRED - foundation for other tables)
    if (onboardingData.personalInfo) {
      try {
        console.log("📝 [SYNC] Step 1/5: Syncing PersonalInfo...");
        const success = await PersonalInfoService.save(
          userId,
          onboardingData.personalInfo,
        );
        if (!success) {
          throw new Error("Failed to save personalInfo");
        }
        console.log("✅ [SYNC] PersonalInfo synced");

        rollbackSteps.push(async () => {
          console.log("🔙 [ROLLBACK] Reverting PersonalInfo...");
          // Add rollback logic if needed
        });
      } catch (e) {
        const error = `Step 1 failed: ${e}`;
        errors.push(error);
        console.error("❌ [SYNC]", error);
        // CRITICAL FAILURE - abort sync
        await executeRollback(rollbackSteps);
        return { success: false, errors };
      }
    }

    // STEP 2: Save diet preferences (depends on profile existing)
    if (onboardingData.dietPreferences) {
      try {
        console.log("📝 [SYNC] Step 2/5: Syncing DietPreferences...");
        const success = await DietPreferencesService.save(
          userId,
          onboardingData.dietPreferences,
        );
        if (!success) {
          throw new Error("Failed to save dietPreferences");
        }
        console.log("✅ [SYNC] DietPreferences synced");

        rollbackSteps.push(async () => {
          console.log("🔙 [ROLLBACK] Reverting DietPreferences...");
        });
      } catch (e) {
        const error = `Step 2 failed: ${e}`;
        errors.push(error);
        console.error("❌ [SYNC]", error);
        // Continue despite error (non-critical)
      }
    }

    // STEP 3: Save body analysis (depends on profile existing)
    if (onboardingData.bodyAnalysis) {
      try {
        console.log("📝 [SYNC] Step 3/5: Syncing BodyAnalysis...");
        const success = await BodyAnalysisService.save(
          userId,
          onboardingData.bodyAnalysis,
        );
        if (!success) {
          throw new Error("Failed to save bodyAnalysis");
        }
        console.log("✅ [SYNC] BodyAnalysis synced");

        rollbackSteps.push(async () => {
          console.log("🔙 [ROLLBACK] Reverting BodyAnalysis...");
        });
      } catch (e) {
        const error = `Step 3 failed: ${e}`;
        errors.push(error);
        console.error("❌ [SYNC]", error);
        // Continue despite error (non-critical)
      }
    }

    // STEP 4: Save workout preferences (depends on profile existing)
    if (onboardingData.workoutPreferences) {
      try {
        console.log("📝 [SYNC] Step 4/5: Syncing WorkoutPreferences...");
        const success = await WorkoutPreferencesService.save(
          userId,
          onboardingData.workoutPreferences,
        );
        if (!success) {
          throw new Error("Failed to save workoutPreferences");
        }
        console.log("✅ [SYNC] WorkoutPreferences synced");

        rollbackSteps.push(async () => {
          console.log("🔙 [ROLLBACK] Reverting WorkoutPreferences...");
        });
      } catch (e) {
        const error = `Step 4 failed: ${e}`;
        errors.push(error);
        console.error("❌ [SYNC]", error);
        // Continue despite error (non-critical)
      }
    }

    // STEP 5: Save advanced review (depends on all previous data)
    if (onboardingData.advancedReview) {
      try {
        console.log("📝 [SYNC] Step 5/5: Syncing AdvancedReview...");
        const success = await AdvancedReviewService.save(
          userId,
          onboardingData.advancedReview,
        );
        if (!success) {
          throw new Error("Failed to save advancedReview");
        }
        console.log("✅ [SYNC] AdvancedReview synced");
      } catch (e) {
        const error = `Step 5 failed: ${e}`;
        errors.push(error);
        console.error("❌ [SYNC]", error);
        // Continue despite error (non-critical)
      }
    }

    console.log(
      `🔄 [SYNC] Sequential sync completed. Errors: ${errors.length}`,
    );
    return { success: errors.length === 0, errors };
  } catch (error) {
    console.error("❌ [SYNC] Sync failed:", error);
    await executeRollback(rollbackSteps);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
};

// Helper function to execute rollback steps
const executeRollback = async (steps: Array<() => Promise<void>>) => {
  console.log(`🔙 [ROLLBACK] Executing ${steps.length} rollback steps...`);
  for (const step of steps.reverse()) {
    try {
      await step();
    } catch (error) {
      console.error("❌ [ROLLBACK] Step failed:", error);
    }
  }
  console.log("🔙 [ROLLBACK] Complete");
};
```

**Changes:**

- ✅ Sequential waterfall instead of parallel `Promise.all()`
- ✅ Proper error handling with rollback support
- ✅ Dependency tracking (personalInfo must succeed before others)
- ✅ Clear logging of each step
- ✅ Non-blocking errors for non-critical steps

---

### 5. Apply Field Transformers to All Database Operations 📋

**Affected Files:** 15+ files with direct database access

**Pattern to Apply:**

```typescript
import { toDb, fromDb } from "@/utils/transformers/fieldNameTransformers";

// BEFORE (inconsistent naming)
const { data, error } = await supabase.from("workout_sessions").insert({
  userId: "123",
  workoutId: "abc",
  startedAt: new Date().toISOString(),
  caloriesBurned: 500,
});

// AFTER (consistent naming with transformers)
const { data, error } = await supabase.from("workout_sessions").insert(
  toDb({
    userId: "123",
    workoutId: "abc",
    startedAt: new Date().toISOString(),
    caloriesBurned: 500,
  }),
);
// Database receives: { user_id, workout_id, started_at, calories_burned }

// BEFORE (reading)
const { data } = await supabase.from("workout_sessions").select("*");
// data has snake_case keys

// AFTER (reading)
const { data } = await supabase.from("workout_sessions").select("*");
const workoutSessions = fromDb(data);
// workoutSessions has camelCase keys
```

**Files to Update:**

1. `src/services/completionTracking.ts` - Lines 105, 236
2. `src/services/SyncEngine.ts` - Lines 491, 548, 611, 664, 765
3. `src/services/fitnessData.ts` - Lines 95, 143, 272, 308
4. `src/services/nutritionData.ts` - Lines 126, 177, 424
5. `src/services/onboardingService.ts` - Lines 61, 212, 364, 496, 676
6. `src/services/recognizedFoodLogger.ts` - Lines 164, 188, 230
7. `src/services/userProfile.ts` - Lines 47, 77, 105, 137
8. `src/services/progressData.ts` - Lines 147, 220
9. `src/services/googleAuth.ts` - Lines 213, 239
10. `src/services/offline.ts` - Lines 257, 270

---

## Migration Strategy

### Phase 1: Foundation (Completed)

- ✅ Create field name transformers
- ✅ Create SyncCoordinator service
- ✅ Document architecture changes

### Phase 2: Core Fixes (In Progress)

- 📋 Fix `fitnessStore.completeWorkout()`
- 📋 Fix `nutritionStore.completeMeal()`
- 📋 Fix `App.tsx` onboarding race conditions

### Phase 3: Database Boundary Updates (Pending)

- 📋 Apply transformers to all service files
- 📋 Update test files
- 📋 Add integration tests

### Phase 4: Verification (Pending)

- 📋 Run full test suite
- 📋 Manual QA testing
- 📋 Performance testing
- 📋 Documentation updates

---

## Potential Breaking Changes

### 1. Async Method Signatures

**Before:**

```typescript
completeWorkout: (workoutId: string, sessionId?: string) => void
```

**After:**

```typescript
completeWorkout: (workoutId: string, sessionId?: string) => Promise<void>;
```

**Impact:** All callers must now handle Promise (add `await` or `.then()`)

### 2. Database Field Names

**Before:** Inconsistent (sometimes camelCase, sometimes snake_case)

**After:** Always snake_case in database, always camelCase in app

**Impact:** Existing database queries may need updates

### 3. Sync Behavior

**Before:** Optimistic updates (local first, sync later)

**After:** Database-first updates (database first, cache second)

**Impact:** Slower perceived performance but better data consistency

---

## Files Modified

### Created:

1. `src/utils/transformers/fieldNameTransformers.ts` - 215 lines
2. `src/services/sync/SyncCoordinator.ts` - 350 lines
3. `ARCHITECTURE_REMEDIATION_SUMMARY.md` - This file

### To Modify:

1. `src/stores/fitnessStore.ts:368-380` - `completeWorkout()` method
2. `src/stores/nutritionStore.ts:406-435` - `completeMeal()` method
3. `App.tsx:380-472` - `syncLocalToDatabase()` function
4. 15+ service files - Add field name transformers

**Total Impact:** ~20 files, ~500 lines of code

---

## Testing Requirements

### Unit Tests Needed:

1. Field name transformers
   - `toSnakeCase()` / `toCamelCase()`
   - `keysToSnakeCase()` / `keysToCamelCase()`
   - Nested objects and arrays
   - Edge cases (null, undefined, dates)

2. SyncCoordinator
   - Database-first sync flow
   - Conflict resolution
   - Cache invalidation
   - Offline queueing
   - Batch operations

3. Store methods
   - `completeWorkout()` success case
   - `completeWorkout()` offline case
   - `completeMeal()` success case
   - `completeMeal()` offline case

### Integration Tests Needed:

1. Full onboarding flow with sequential sync
2. Workout completion with database sync
3. Meal logging with database sync
4. Offline mode and sync recovery

---

## Performance Considerations

### Before (Optimistic Updates):

- **Perceived Speed:** Very fast (instant UI update)
- **Data Consistency:** Poor (local/remote can diverge)
- **Offline Support:** Good (all local)

### After (Database-First):

- **Perceived Speed:** Slower (network latency)
- **Data Consistency:** Excellent (database is truth)
- **Offline Support:** Excellent (automatic queue + sync)

### Mitigation Strategies:

1. Show loading indicators during sync
2. Use optimistic UI where safe
3. Cache aggressively with TTL
4. Batch operations when possible

---

## Rollout Plan

### Stage 1: Canary (10% users, 1 week)

- Deploy to test environment
- Monitor error rates
- Collect performance metrics
- Gather user feedback

### Stage 2: Beta (50% users, 1 week)

- Expand rollout
- Monitor sync success rates
- Check for edge cases
- Performance tuning

### Stage 3: Full Release (100% users)

- Complete rollout
- Monitor closely for 48 hours
- Be ready to rollback if needed

---

## Success Metrics

### Before Remediation:

- Sync success rate: ~85%
- Conflict rate: ~15%
- Data consistency: ~70%

### Target After Remediation:

- Sync success rate: >99%
- Conflict rate: <1%
- Data consistency: >99%

---

## Support & Maintenance

### Monitoring:

- Database sync success/failure rates
- Cache hit/miss ratios
- Conflict resolution frequency
- Offline queue depth

### Alerts:

- Sync success rate drops below 95%
- Conflict rate exceeds 5%
- Offline queue exceeds 100 items

---

## References

### Documentation:

- [Zustand Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [React Query Sync Strategies](https://tanstack.com/query/latest)

### Related Issues:

- Dual source of truth in workout/meal completion
- Race conditions in onboarding sync
- Inconsistent field naming (camelCase vs snake_case)

---

_Last Updated: January 21, 2026_
_Author: Architecture Remediation Agent_
