# Diet Preferences Validation Debug Instructions

## Issue
User reports that "Diet preferences are required" error appears even after filling all fields in the diet preferences tab.

## Changes Made

### 1. Added Debug Logging to `src/services/onboardingService.ts` (lines 779-798)
```typescript
static validateDietPreferences(data: DietPreferencesData | null): TabValidationResult {
  // Debug logging added:
  console.log('🔍 validateDietPreferences called with data:', data ? 'Data provided' : 'NULL data');

  if (!data) {
    console.log('❌ Validation failed: data is null or undefined');
    return { is_valid: false, errors: ['Diet preferences data is missing'], warnings: [], completion_percentage: 0 };
  }

  console.log('🔍 Diet data fields:', {
    diet_type: data.diet_type,
    breakfast_enabled: data.breakfast_enabled,
    lunch_enabled: data.lunch_enabled,
    dinner_enabled: data.dinner_enabled,
    snacks_enabled: data.snacks_enabled
  });
  // ... rest of validation
}
```

### 2. Added Debug Logging to `src/hooks/useOnboardingState.tsx` (lines 325-347)
```typescript
const validateTab = useCallback((tabNumber: number, currentData?: any): TabValidationResult => {
  console.log(`🔍 validateTab called for tab ${tabNumber}`);
  console.log(`🔍 currentData provided:`, currentData !== undefined ? 'YES' : 'NO');

  const currentState = stateRef.current;

  switch (tabNumber) {
    case 2:
      const dietPrefsToValidate = currentData !== undefined ? currentData : currentState.dietPreferences;
      console.log('🔍 Tab 2 validating with data source:', currentData !== undefined ? 'CURRENT_DATA' : 'STORED_STATE');
      console.log('🔍 Tab 2 data:', dietPrefsToValidate);
      result = validateDietPreferences(dietPrefsToValidate);
      console.log('🔍 Tab 2 validation result:', result);
      return result;
    // ... other cases
  }
}, []);
```

### 3. Added Debug Logging to `src/screens/onboarding/OnboardingContainer.tsx` (lines 170-188)
```typescript
const handleNextTab = (currentTabData?: any) => {
  console.log('🎭 OnboardingContainer: handleNextTab called, currentTab:', currentTab);
  console.log('🎭 OnboardingContainer: currentTabData provided:', currentTabData ? 'Yes' : 'No');

  const validation = validateTab(currentTab, currentTabData);
  console.log('🎭 OnboardingContainer: Validation result:', validation);

  if (!validation.is_valid) {
    console.log('🚫 OnboardingContainer: Validation failed, showing alert');
    Alert.alert('Incomplete Information', ...);
    return;
  }
  // ... proceed to next tab
}
```

## Testing Steps

### Step 1: Build and Install the App
```bash
# Option 1: Development build
npm run build:development

# Option 2: Play store build (recommended for testing)
cd android
JAVA_HOME="/c/Program Files/Java/jdk-21" ANDROID_HOME="/c/Users/Harsh/AppData/Local/Android/Sdk" PATH="$PATH:/c/Program Files/Java/jdk-21/bin" ./gradlew assemblePlayDebug
cd ..

# Install on device
adb install android/app/build/outputs/apk/play/debug/app-play-debug.apk
```

### Step 2: Enable Console Logging
```bash
# Start Metro bundler with logging
npm start

# In a separate terminal, view logs
adb logcat | grep -E "(🔍|🎭|❌|✅)"
```

### Step 3: Test the Onboarding Flow

1. **Open the app** on your device
2. **Navigate to onboarding** (Diet Preferences tab, Tab 2)
3. **Fill in all required fields:**
   - Diet type (vegetarian/non-vegetarian/vegan)
   - Enable at least one meal (breakfast/lunch/dinner/snacks)
   - Cooking preferences (optional but recommended)
   - Health habits (fill in as many as possible)
4. **Click "Next: Body Analysis"** button
5. **Watch the console** for debug logs

### Step 4: Analyze Debug Output

You should see logs in this order:

```
🎭 OnboardingContainer: handleNextTab called, currentTab: 2
🎭 OnboardingContainer: currentTabData provided: Yes
🔍 validateTab called for tab 2
🔍 currentData provided: YES
🔍 Tab 2 validating with data source: CURRENT_DATA
🔍 Tab 2 data: { diet_type: '...', breakfast_enabled: true, ... }
🔍 validateDietPreferences called with data: Data provided
🔍 Diet data fields: { diet_type: '...', breakfast_enabled: true, ... }
🔍 Tab 2 validation result: { is_valid: true/false, errors: [...], warnings: [...] }
🎭 OnboardingContainer: Validation result: { is_valid: true/false, ... }
```

### Step 5: Diagnose Issues

**Expected Behavior:**
- ✅ `currentData provided: YES` - form data is being passed
- ✅ `Tab 2 validating with data source: CURRENT_DATA` - using submitted data, not state
- ✅ `Diet data fields` shows all your filled fields
- ✅ `is_valid: true` if all required fields filled

**If Error Still Occurs:**

**Case A: `currentData provided: NO`**
- Issue: DietPreferencesTab not passing form data to onNext
- Location: `src/screens/onboarding/tabs/DietPreferencesTab.tsx` line ~965

**Case B: `Tab 2 data: null` or `Diet data fields: { diet_type: undefined, ... }`**
- Issue: Form data structure mismatch or state not updating
- Location: Form data collection in DietPreferencesTab

**Case C: `is_valid: false` with specific errors**
- Issue: Specific validation rule failing
- Check: Which field is causing the error in the logs

## Expected Validation Requirements

For Diet Preferences to pass validation:

1. **diet_type** must be selected (required)
2. **At least one meal** must be enabled (breakfast/lunch/dinner/snacks)
3. Optional fields will generate warnings but won't block progression

## Files Modified

- `src/services/onboardingService.ts` (lines 779-798) - Added debug logging to validateDietPreferences
- `src/hooks/useOnboardingState.tsx` (lines 325-347) - Added debug logging to validateTab
- `src/screens/onboarding/OnboardingContainer.tsx` (lines 170-188) - Debug logging already present

## Next Steps

After collecting debug logs:

1. **Share the console output** with the exact logs showing the data flow
2. **Identify the exact point** where data becomes null or invalid
3. **Implement targeted fix** based on the root cause
4. **Re-test** to verify the fix works

## Quick Test Commands

```bash
# Rebuild app
npm run build:development

# View logs filtered for onboarding
adb logcat | grep -i "onboarding\|diet\|validation"

# View all React Native logs
adb logcat *:S ReactNative:V ReactNativeJS:V

# Clear logs and start fresh
adb logcat -c && adb logcat | grep -E "(🔍|🎭|❌|✅)"
```

## Success Criteria

✅ User can fill all diet preference fields
✅ Clicking "Next" passes validation
✅ User proceeds to Body Analysis tab (Tab 3)
✅ No "Diet preferences are required" error appears

## Contact

If issues persist after following these steps, provide:
1. Full console logs from Step 4
2. Screenshot of filled diet preferences form
3. Exact error message received
