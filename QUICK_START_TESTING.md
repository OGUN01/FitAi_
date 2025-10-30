# Quick Start: Testing Option B Implementation

## ⚡ 5-Minute Test

### 1. Open the App
```bash
# If not already running:
npm start
```

### 2. Navigate to Profile
- Open the app on your device/emulator
- Tap the **Profile** tab (bottom right)
- Look for the ✏️ **Edit Profile** button (top right)

### 3. Test One Edit Option
1. Tap **Edit Profile** button
2. Select **"Diet Preferences"** (has most fields - 27 total)
3. **Expected Result**:
   - OnboardingContainer opens
   - Only Diet tab visible (no tab bar at bottom)
   - "Save" button instead of "Next"
   - "Cancel" button instead of "Back"
   - All 27 diet fields visible
   - Existing data pre-loaded

4. Make a change (e.g., toggle a health habit)
5. Tap **"Save"**
6. **Expected**: Returns to Profile screen
7. Tap **Edit Profile** → **"Diet Preferences"** again
8. **Verify**: Your change persisted!

### ✅ If That Worked
Congratulations! Option B is working. Continue with full testing (see OPTION_B_TESTING_GUIDE.md).

### ❌ If That Failed
Check console logs for errors and review OPTION_B_IMPLEMENTATION_COMPLETE.md troubleshooting section.

---

## 📊 Full Testing Checklist

### Test All 5 Options:
- [ ] Personal Information (10 fields)
- [ ] Diet Preferences (27 fields)
- [ ] Body Analysis (30 fields)
- [ ] Workout Preferences (22 fields)
- [ ] Health Metrics (50+ fields, read-only)

### Verify Core Functionality:
- [ ] Edit mode shows only selected tab
- [ ] "Save" button works
- [ ] "Cancel" button works
- [ ] Data pre-loads correctly
- [ ] Changes persist after saving
- [ ] No crashes or errors

---

## 🎯 Success Criteria

### Must Pass:
✅ All 5 options open correct tabs
✅ All fields load with existing data
✅ Edits save to database
✅ No crashes or console errors

### Next Steps After Testing:
1. If all tests pass → Execute DEPRECATION_PLAN.md
2. If tests fail → Report issues, debug, re-test

---

## 📝 Expected Console Logs

### When opening edit mode:
```
🧭 ProfileScreen: Navigating to OnboardingContainer for tab 2
🧭 NAVIGATION: Navigating to OnboardingContainer
🧭 Setting onboarding edit session: { editMode: true, initialTab: 2 }
🧭 RENDERING: OnboardingContainer in edit mode
🎭 OnboardingContainer: Initializing with tab: 2 (editMode: true)
```

### When saving:
```
✅ OnboardingContainer: Validation passed
💾 OnboardingContainer: Edit mode - saving and calling onEditComplete
✅ OnboardingContainer: Edit completed
✅ ProfileScreen: Edit completed, refreshing profile
```

---

## 🐛 Common Issues

### Issue: Nothing happens when clicking edit options
**Solution**: Check that navigation prop is passed to ProfileScreen in MainNavigation.tsx:212

### Issue: Tab bar still visible
**Solution**: Check MainNavigation.tsx:223 includes `!onboardingEditSession.isActive`

### Issue: Data doesn't load
**Solution**: Check useOnboardingState hook is loading data from database correctly

### Issue: Changes don't save
**Solution**: Check integration.ts save functions and Supabase connection

---

## 📚 Full Documentation

- **Implementation Details**: OPTION_B_IMPLEMENTATION_COMPLETE.md
- **Complete Testing Guide**: OPTION_B_TESTING_GUIDE.md
- **Deprecation Plan**: DEPRECATION_PLAN.md
- **Summary**: IMPLEMENTATION_SUMMARY.md

---

## 🎉 Ready?

**Let's test Option B and see those 170+ fields in action!**

1. Open app
2. Profile → Edit Profile → Diet Preferences
3. Make a change
4. Save
5. Verify it worked!

**Good luck! 🚀**
