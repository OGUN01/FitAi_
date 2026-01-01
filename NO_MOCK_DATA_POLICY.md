# No Mock Data Policy

**Date:** 2025-12-29
**Decision:** Remove all mock/demo data from AI generation
**Status:** ✅ COMPLETE

---

## What Changed

### Before (Problematic)
```typescript
async generateWeeklyWorkoutPlan(...) {
  console.warn('⚠️ Using demo mode');
  // Returns fake demo workouts
  return demoAIService.generateDemoWorkout(...);
}
```

**Problem:** App appears to work but generates fake data. Users don't know it's broken.

### After (Clear Failure)
```typescript
async generateWeeklyWorkoutPlan(...) {
  console.error('❌ CRITICAL: Weekly workout generation not connected');
  throw new Error(
    'Workout generation is not configured.\n\n' +
    'Required: Connect to Cloudflare Workers backend\n' +
    'Endpoint: POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate\n\n' +
    'This is the PRIMARY feature - must be implemented before app can be used.'
  );
}
```

**Result:** App fails loudly with clear instructions on what needs to be fixed.

---

## Affected Methods

All methods now **throw errors** instead of returning mock data:

1. ✅ `generateWorkout()` - Throws error
2. ✅ `generateMeal()` - Throws error
3. ✅ `generateDailyMealPlan()` - Throws error
4. ✅ `generateWeeklyWorkoutPlan()` - Throws error with CRITICAL flag
5. ✅ `generateWeeklyMealPlan()` - Throws error with CRITICAL flag
6. ⚠️ `generateMotivationalContent()` - Still uses demo (not critical feature)

---

## Exception: Motivational Content

We kept demo mode ONLY for motivational content because:
- It's not a core feature
- It doesn't affect workout/meal plans
- It's just inspirational quotes and tips
- Users won't be misled by fake fitness plans

```typescript
async generateMotivationalContent(...) {
  console.warn('⚠️ Motivational content using demo mode (not critical for core functionality)');
  return demoAIService.generateDemoMotivation(...);
}
```

---

## Error Messages

All errors now clearly state:

1. **What's wrong:** "AI generation is not configured"
2. **What's needed:** "Connect to Cloudflare Workers backend"
3. **Exact endpoint:** "https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate"
4. **Severity:** "CRITICAL" for core features

---

## User Experience

### Before
```
User: *Taps "Generate Weekly Plan"*
App: ✅ "Plan Generated!" (Shows fake demo plan)
User: 😊 "Great!" (Doesn't realize it's fake)
```

### After
```
User: *Taps "Generate Weekly Plan"*
App: ❌ Error dialog with clear message
      "Workout generation is not configured.
       Required: Connect to Cloudflare Workers backend"
User: 🚨 Knows exactly what's broken
```

---

## Benefits

1. **Honesty:** No fake data misleading users
2. **Clarity:** Error messages tell exactly what to do
3. **Urgency:** Developers can't ignore it
4. **Safety:** No accidental demo data in production
5. **Focus:** Forces proper backend integration

---

## Next Steps

Now that mock data is removed, the app REQUIRES:

1. Create `src/services/workersClient.ts`
2. Implement HTTP calls to Cloudflare Workers
3. Add auth headers (Supabase JWT)
4. Handle real AI responses
5. Display cache metadata to users

The app will NOT work until this is done - which is exactly what we want!

---

## Files Modified

- `src/ai/index.ts` - Replaced all demo fallbacks with errors
- `src/ai/gemini.ts` - Stubbed with deprecation warnings

## Files Kept (Demo Service)

- `src/ai/demoService.ts` - Still exists for motivational content only
- Will be deleted after motivational content migrates to Workers

---

## Verification

To verify mock data is removed:

```bash
# Search for demo fallbacks (should find only motivational content)
grep -r "demoAIService.generate" src/ai/index.ts

# Should only show:
# - generateMotivationalContent (allowed exception)
```

✅ **Verification passed:** Only motivational content uses demo mode
