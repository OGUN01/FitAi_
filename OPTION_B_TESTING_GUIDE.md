# Option B Testing Guide

## Quick Test Instructions

### Prerequisites
- App built and running
- User has completed onboarding (has data to edit)
- Device/emulator ready

### Test Scenario 1: Personal Information Edit
1. Open app → Navigate to Profile tab
2. Tap the Edit Profile button (✏️ icon at top right)
3. Modal appears with 5 options
4. Tap "Personal Information"
5. **Expected**: OnboardingContainer opens showing PersonalInfoTab
6. **Verify**:
   - Only PersonalInfoTab visible (no tab navigation bar)
   - All 10 fields show existing data
   - "Next" button says "Save"
   - "Back" button says "Cancel"
7. Edit a field (e.g., change height)
8. Tap "Save"
9. **Expected**: Returns to Profile screen
10. **Verify**: Changed data persists (reopen to check)

### Test Scenario 2: Diet Preferences Edit
1. Profile → Edit Profile → "Diet Preferences"
2. **Expected**: Opens DietPreferencesTab with 27 fields
3. **Verify**:
   - All existing diet data loads correctly
   - All toggles show correct state
   - Cooking preferences visible
   - Health habits section visible
4. Make changes to several fields
5. Tap "Save"
6. **Expected**: Returns to Profile, changes saved

### Test Scenario 3: Body Analysis Edit
1. Profile → Edit Profile → "Body Analysis"
2. **Expected**: Opens BodyAnalysisTab with 30 fields
3. **Verify**:
   - Body measurements load correctly
   - Photo uploads work (if user has photos)
   - Calculated fields display properly
4. Update a measurement
5. Tap "Save"
6. **Expected**: Measurement saves and updates calculations

### Test Scenario 4: Workout Preferences Edit
1. Profile → Edit Profile → "Workout Preferences"
2. **Expected**: Opens WorkoutPreferencesTab with 22 fields
3. **Verify**:
   - Equipment selections load
   - Workout types show correctly
   - Fitness assessment fields populated
4. Change workout location
5. Tap "Save"
6. **Expected**: Preference saves correctly

### Test Scenario 5: Health Metrics View
1. Profile → Edit Profile → "Health Metrics"
2. **Expected**: Opens AdvancedReviewTab (read-only)
3. **Verify**:
   - All calculated metrics display (BMI, BMR, TDEE, macros)
   - Recommendations show correctly
   - Complete health summary visible
4. Tap "Cancel" (should be read-only)
5. **Expected**: Returns to Profile without changes

### Test Scenario 6: Cancel During Edit
1. Profile → Edit Profile → Any option
2. Make changes to several fields
3. Tap "Cancel" (back button)
4. **Expected**: Returns to Profile without saving
5. **Verify**: Changes were discarded (reopen to confirm)

### Test Scenario 7: Validation Errors
1. Profile → Edit Profile → "Personal Information"
2. Clear a required field (e.g., age)
3. Tap "Save"
4. **Expected**: Alert shows validation errors
5. Fill in missing field
6. Tap "Save"
7. **Expected**: Saves successfully

## Expected Behavior Summary

### Edit Mode Characteristics:
- ✅ Tab bar hidden (bottom navigation)
- ✅ Only selected tab visible
- ✅ "Save" button instead of "Next"
- ✅ "Cancel" button instead of "Back"
- ✅ All existing data pre-filled
- ✅ Validation works correctly
- ✅ Saves return to Profile screen
- ✅ Cancels discard changes
- ✅ Data persists across app restarts

### Data Flow:
```
Profile Screen
    ↓ (navigation.navigate)
OnboardingContainer (editMode: true)
    ↓ (onEditComplete)
Save to Local Storage (AsyncStorage)
    ↓
Save to Database (Supabase)
    ↓
Return to Profile Screen
    ↓
Profile Data Refreshes
```

## Common Issues to Watch For

### Issue 1: Navigation not working
**Symptoms**: Tapping edit options does nothing or shows old screens
**Cause**: Navigation prop not passed to ProfileScreen
**Fix**: Verify MainNavigation passes navigation prop (line 212)

### Issue 2: Tab bar still visible in edit mode
**Symptoms**: Can see bottom tabs while editing
**Cause**: Tab visibility logic not working
**Fix**: Check MainNavigation line 223 includes onboardingEditSession check

### Issue 3: Data not loading
**Symptoms**: Fields are empty when opening for edit
**Cause**: useOnboardingState not loading from database
**Fix**: Check onboarding state initialization in useOnboardingState hook

### Issue 4: Saves not persisting
**Symptoms**: Changes disappear after closing app
**Cause**: Database save failing
**Fix**: Check integration.ts save functions, verify Supabase connection

### Issue 5: Cannot return to Profile
**Symptoms**: Stuck in edit mode, back button doesn't work
**Cause**: Callbacks not wired correctly
**Fix**: Verify onEditComplete/onEditCancel callbacks in ProfileScreen

## Success Criteria

### Must Pass:
- [ ] All 5 options open correct tabs
- [ ] All fields load with existing data
- [ ] Edits save to database
- [ ] Saves return to Profile
- [ ] Cancels discard changes
- [ ] No crashes or errors
- [ ] Type-check passes
- [ ] No console errors (except expected logs)

### Should Pass:
- [ ] Smooth animations
- [ ] Fast loading (<500ms)
- [ ] Validation errors clear and helpful
- [ ] No data loss on app restart
- [ ] Works on both iOS and Android

## Logging to Check

Watch console for these log messages:

### Expected Logs (Success):
```
🧭 ProfileScreen: Navigating to OnboardingContainer for tab N
🧭 NAVIGATION: Navigating to OnboardingContainer
🧭 Setting onboarding edit session: { editMode: true, initialTab: N }
🧭 RENDERING: OnboardingContainer in edit mode with: { editMode: true, initialTab: N }
🎭 OnboardingContainer: Initializing with tab: N (editMode: true)
✅ OnboardingContainer: Edit completed
✅ ProfileScreen: Edit completed, refreshing profile
```

### Error Logs to Watch For:
```
❌ Any errors from OnboardingContainer
🚫 Validation failed messages (unless fixing validation)
⚠️ Failed to navigate messages
❌ Failed to save messages
```

## Debugging Tips

### If edit mode not working:
1. Check navigation object is defined in ProfileScreen
2. Verify MainNavigation imports OnboardingContainer
3. Check OnboardingContainer accepts editMode prop
4. Verify tab bar visibility logic

### If data not saving:
1. Check AsyncStorage permissions
2. Verify Supabase connection
3. Check integration.ts save functions
4. Look for database errors in console

### If navigation broken:
1. Restart app/metro bundler
2. Clear AsyncStorage
3. Check for TypeScript errors
4. Verify navigation prop flow

## Performance Benchmarks

### Target Performance:
- Open edit screen: <300ms
- Load existing data: <500ms
- Save changes: <1000ms
- Return to Profile: <200ms
- Database sync: <2000ms (background)

### Memory Usage:
- Should not increase significantly (<10MB) when entering edit mode
- Memory should release when returning to Profile

## Testing Checklist

### Pre-Testing:
- [ ] App builds without errors
- [ ] TypeScript check passes
- [ ] No console errors on startup
- [ ] User data exists (completed onboarding)

### Testing:
- [ ] Test all 5 edit options
- [ ] Test save functionality
- [ ] Test cancel functionality
- [ ] Test validation errors
- [ ] Test data persistence
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Test with slow network
- [ ] Test with offline mode

### Post-Testing:
- [ ] No memory leaks detected
- [ ] No crashes during testing
- [ ] All data saved correctly
- [ ] Performance meets targets
- [ ] User feedback collected

## Next Steps After Testing

### If Tests Pass:
1. Mark todo as complete: "Option B Step 4: Test new navigation flow"
2. Proceed to: "Option B Step 5: Verify all 170+ fields accessible"
3. Move to cleanup phase: Remove old screens

### If Tests Fail:
1. Document failing scenarios
2. Debug using logs and console
3. Fix issues
4. Re-test
5. Update this guide with lessons learned

---

**Happy Testing! 🧪**
