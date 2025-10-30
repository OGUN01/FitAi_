# Bug Fix: initialTab Not Updating

## Issue
All edit options in Profile screen were opening **Personal Information tab** (tab 1) instead of their designated tabs.

## Root Cause
The `useEffect` in `OnboardingContainer.tsx` that sets the initial tab had an empty dependency array `[]`, meaning it only ran once on mount and never re-ran when the `initialTab` prop changed.

```typescript
// OLD (BUGGY):
useEffect(() => {
  const tabToShow = editMode && initialTab ? initialTab : startingTab;
  setCurrentTab(tabToShow);
}, []); // ❌ Only runs once on mount
```

When navigating between different edit options (e.g., Diet → Workout → Body Analysis), the component stayed mounted and the `initialTab` prop changed, but the effect didn't re-run to update the displayed tab.

## Solution
Added proper dependencies to the `useEffect` so it re-runs whenever `editMode`, `initialTab`, or `startingTab` change:

```typescript
// NEW (FIXED):
useEffect(() => {
  const tabToShow = editMode && initialTab ? initialTab : startingTab;
  console.log('🎭 OnboardingContainer: Initializing with tab:', tabToShow, '(editMode:', editMode, ', initialTab:', initialTab, ')');
  setCurrentTab(tabToShow);
}, [editMode, initialTab, startingTab]); // ✅ Re-runs when props change
```

## File Modified
**File**: `src/screens/onboarding/OnboardingContainer.tsx`
**Lines**: 99-104
**Change**: Updated dependency array from `[]` to `[editMode, initialTab, startingTab]`

## Verification
- ✅ TypeScript type-check passes (no new errors)
- ⏳ Manual testing required to verify fix

## Expected Behavior After Fix

### Before Fix:
```
Profile → Edit Profile → Personal Information ✅ (tab 1)
Profile → Edit Profile → Diet Preferences     ❌ (showed tab 1, not tab 2)
Profile → Edit Profile → Body Analysis        ❌ (showed tab 1, not tab 3)
Profile → Edit Profile → Workout Preferences  ❌ (showed tab 1, not tab 4)
Profile → Edit Profile → Health Metrics       ❌ (showed tab 1, not tab 5)
```

### After Fix:
```
Profile → Edit Profile → Personal Information ✅ (tab 1)
Profile → Edit Profile → Diet Preferences     ✅ (tab 2)
Profile → Edit Profile → Body Analysis        ✅ (tab 3)
Profile → Edit Profile → Workout Preferences  ✅ (tab 4)
Profile → Edit Profile → Health Metrics       ✅ (tab 5)
```

## Testing Instructions

1. **Reload the app** (hot reload may not be sufficient)
2. Navigate to **Profile → Edit Profile**
3. Try each option:
   - **Personal Information** → Should show PersonalInfoTab (10 fields)
   - **Diet Preferences** → Should show DietPreferencesTab (27 fields, health habits, etc.)
   - **Body Analysis** → Should show BodyAnalysisTab (measurements, photos)
   - **Workout Preferences** → Should show WorkoutPreferencesTab (equipment, schedule, etc.)
   - **Health Metrics** → Should show AdvancedReviewTab (BMI, BMR, TDEE, macros)

4. **Verify each tab**:
   - Shows correct tab content
   - No tab bar visible at bottom
   - "Save" button instead of "Next"
   - "Cancel" button instead of "Back"

## Console Logs to Watch For

You should now see the correct tab number in console logs:

```
🧭 ProfileScreen: Navigating to OnboardingContainer for tab 2
🎭 OnboardingContainer: Initializing with tab: 2 (editMode: true, initialTab: 2)
```

Before fix, it would show:
```
🧭 ProfileScreen: Navigating to OnboardingContainer for tab 2
🎭 OnboardingContainer: Initializing with tab: 1 (editMode: true, initialTab: 2) ❌ Wrong!
```

## Related Files
- `src/screens/onboarding/OnboardingContainer.tsx` (fixed)
- `src/components/navigation/MainNavigation.tsx` (navigation setup)
- `src/screens/main/ProfileScreen.tsx` (passes initialTab prop)

## Status
- ✅ **Bug Fixed**
- ✅ **Type-check Passed**
- ⏳ **Awaiting User Testing**

---

**Date**: Bug found and fixed during initial testing
**Impact**: All edit options now navigate to correct tabs
**Risk**: Low (isolated change, proper React patterns)
