# Debug: Tab Navigation Still Showing Tab 1

## Current Status
After the first fix, all options are still opening Personal Information tab (tab 1).

## Added Debug Logging
Added comprehensive logging to ProfileScreen.tsx to help diagnose the issue.

## What to Check

### 1. Reload the App FULLY
```bash
# Stop metro bundler (Ctrl+C)
# Clear cache:
npx expo start -c

# Or restart with:
npm start
```

**Important**: Hot reload may not pick up all changes. Do a full reload!

### 2. Check Console Logs

When you tap any edit option, you should see:

```
🔍 ProfileScreen: handleEditProfileItemPress called with item: {
  id: 2,
  title: 'Diet Preferences',
  tabIndex: 2,
  hasNavigation: true
}
🧭 ProfileScreen: Navigating to OnboardingContainer for tab 2
🧭 NAVIGATION: Navigating to OnboardingContainer
🧭 Setting onboarding edit session: { editMode: true, initialTab: 2 }
🧭 RENDERING: OnboardingContainer in edit mode with: { editMode: true, initialTab: 2 }
🎭 OnboardingContainer: Initializing with tab: 2 (editMode: true, initialTab: 2)
```

###  3. Possible Issues

#### Issue A: `hasNavigation: false`
If you see:
```
🔍 ProfileScreen: handleEditProfileItemPress called with item: {
  ...
  hasNavigation: false  ❌
}
⚠️ ProfileScreen: Falling back to OLD EditContext (navigation or tabIndex missing)
```

**This means**: Navigation prop is not reaching ProfileScreen.
**Solution**: Check MainNavigation.tsx line 212 is rendering `<ProfileScreen navigation={navigation} />`

#### Issue B: `tabIndex: undefined`
If you see:
```
🔍 ProfileScreen: handleEditProfileItemPress called with item: {
  ...
  tabIndex: undefined  ❌
}
⚠️ ProfileScreen: Falling back to OLD EditContext (navigation or tabIndex missing)
```

**This means**: The item doesn't have tabIndex property.
**Solution**: Check editProfileItems array has tabIndex for all items (lines 145-186 in ProfileScreen.tsx)

#### Issue C: Logs show correct tab number but wrong tab displayed
If you see:
```
🎭 OnboardingContainer: Initializing with tab: 2 ✅
```
But tab 1 is displayed...

**This means**: The useEffect dependency fix didn't work or component isn't re-rendering.
**Solution**: Check OnboardingContainer.tsx line 104 has `[editMode, initialTab, startingTab]` dependencies

## Quick Diagnostic Script

Can you run this in your terminal and paste the output?

```bash
# Check files have correct content
echo "=== ProfileScreen editProfileItems ===" && \
sed -n '145,153p' "D:\FitAi\FitAI\src\screens\main\ProfileScreen.tsx" && \
echo "" && \
echo "=== ProfileScreen handler ===" && \
sed -n '291,300p' "D:\FitAi\FitAI\src\screens\main\ProfileScreen.tsx" && \
echo "" && \
echo "=== OnboardingContainer useEffect ===" && \
sed -n '99,104p' "D:\FitAi\FitAI\src\screens\onboarding\OnboardingContainer.tsx"
```

## Expected File Contents

### ProfileScreen.tsx line 152
```typescript
tabIndex: 1, // PersonalInfoTab
```

### ProfileScreen.tsx line 160
```typescript
tabIndex: 2, // DietPreferencesTab
```

### ProfileScreen.tsx line 168
```typescript
tabIndex: 3, // BodyAnalysisTab
```

### ProfileScreen.tsx line 176
```typescript
tabIndex: 4, // WorkoutPreferencesTab
```

### ProfileScreen.tsx line 184
```typescript
tabIndex: 5, // AdvancedReviewTab
```

### OnboardingContainer.tsx line 104
```typescript
}, [editMode, initialTab, startingTab]); // Re-run when edit mode or initialTab changes
```

## Next Steps

1. **Full app reload** (not hot reload)
2. **Tap Diet Preferences**
3. **Copy and paste ALL console logs** here
4. **Screenshot** what tab is actually shown

Then I can identify exactly where the issue is!

---

## Alternative Debug Approach

If console logs aren't showing, try adding alerts:

```typescript
// In ProfileScreen.tsx handleEditProfileItemPress, add this at the top:
Alert.alert('Debug', `Tab Index: ${item.tabIndex}, Has Nav: ${!!navigation}`);
```

This will popup showing the actual values being passed.
