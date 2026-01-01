# Quick Reference: DietScreen Workers Integration

## File Locations

```
src/
├── services/
│   └── fitaiWorkersClient.ts           # Workers API client
├── components/
│   └── diet/
│       ├── ValidationAlert.tsx         # Validation error/warning UI
│       ├── CacheIndicator.tsx          # Cache status indicator
│       └── index.ts                     # Exports
└── screens/
    └── main/
        └── DietScreen.tsx              # Main integration
```

## Import Statements

```typescript
// In DietScreen.tsx
import {
  fitaiWorkersClient,
  type APIMetadata,
  type ValidationError,
  type ValidationWarning
} from '../../services/fitaiWorkersClient';

import {
  ValidationAlert,
  CacheIndicator,
  validationErrorToAlertProps,
  validationWarningToAlertProps
} from '../../components/diet';
```

## Basic Usage

### 1. Generate Diet Plan

```typescript
const response = await fitaiWorkersClient.generateDietPlan({
  profile: {
    personalInfo: profile.personalInfo,
    fitnessGoals: profile.fitnessGoals,
    dietPreferences: userDietPreferences,
  },
  weekNumber: 1,
  bypassCache: false,
  model: 'google/gemini-2.5-flash',
});

if (response.success && response.data) {
  // Success!
  setApiMetadata(response.metadata);
  setWeeklyMealPlan(response.data);
}
```

### 2. Display Cache Indicator

```typescript
{apiMetadata && (
  <CacheIndicator
    metadata={apiMetadata}
    showGenerationTime={true}
    showCuisine={true}
  />
)}
```

### 3. Display Validation Errors

```typescript
{validationErrors.map((error, index) => (
  <ValidationAlert
    key={`error-${index}`}
    {...validationErrorToAlertProps(error)}
    onDismiss={() => setValidationErrors(prev => prev.filter((_, i) => i !== index))}
    onRetry={handleGenerateWeeklyPlan}
  />
))}
```

### 4. Display Validation Warnings

```typescript
{validationWarnings.map((warning, index) => (
  <ValidationAlert
    key={`warning-${index}`}
    {...validationWarningToAlertProps(warning)}
    onDismiss={() => setValidationWarnings(prev => prev.filter((_, i) => i !== index))}
  />
))}
```

## State Management

```typescript
// Add these to your component state
const [apiMetadata, setApiMetadata] = useState<APIMetadata | undefined>(undefined);
const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
const [bypassCache, setBypassCache] = useState(false);
```

## Pull-to-Refresh Cache Bypass

```typescript
const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  setBypassCache(true); // CRITICAL: Bypass cache on pull-to-refresh

  try {
    await loadData();
  } finally {
    setRefreshing(false);
    setTimeout(() => setBypassCache(false), 1000); // Reset after 1s
  }
}, [loadData]);
```

## Error Handling

```typescript
try {
  const response = await fitaiWorkersClient.generateDietPlan({ ... });

  if (response.success) {
    // Parse validation errors
    if (response.metadata?.validationErrors) {
      setValidationErrors(response.metadata.validationErrors);
    }

    // Parse validation warnings
    if (response.metadata?.validationWarnings) {
      setValidationWarnings(response.metadata.validationWarnings);
    }
  }
} catch (error: any) {
  // Network error handling
  if (error.message?.includes('Network') || error.message?.includes('timeout')) {
    Alert.alert('Connection Error', 'Check your internet connection');
  } else {
    Alert.alert('Generation Failed', error.message);
  }
}
```

## Response Structure

```typescript
{
  success: true,
  data: {
    planTitle: "Balanced Nutrition Plan",
    weekNumber: 1,
    totalCalories: 15400,
    totalMacros: { protein: 1155, carbohydrates: 1540, fat: 462 },
    meals: [
      {
        id: "meal-1",
        dayOfWeek: "monday",
        type: "breakfast",
        name: "Oatmeal with Berries",
        totalCalories: 350,
        totalMacros: { protein: 10, carbohydrates: 60, fat: 8 },
        foods: [
          { name: "Oats", quantity: 50, unit: "g", calories: 190, macros: {...} }
        ],
        instructions: ["Step 1", "Step 2"],
        tips: ["Tip 1"]
      }
    ]
  },
  metadata: {
    cached: false,
    cacheSource: "fresh",
    generationTime: 3456,
    model: "google/gemini-2.5-flash",
    cuisineDetected: "Mediterranean",
    validationErrors: [],
    validationWarnings: [
      {
        type: "low_protein",
        message: "Your meal plan has 120g protein (target: 165g)",
        currentValue: 120,
        targetValue: 165,
        percentage: 72,
        suggestions: ["Greek yogurt snack", "Protein shake"]
      }
    ]
  }
}
```

## Validation Error Types

```typescript
type ValidationErrorType =
  | 'allergen'          // Allergen detected in meal
  | 'diet_violation'    // Violates diet preferences (e.g., meat in vegan)
  | 'calorie_drift'     // Calories too far from target
  | 'macro_imbalance';  // Macros imbalanced

type ValidationWarningType =
  | 'low_protein'       // Protein below target
  | 'low_variety'       // Limited food variety
  | 'high_sodium'       // Sodium too high
  | 'low_fiber';        // Fiber too low
```

## Alert Severity Colors

```typescript
error:   Red    (#EF4444) - Critical issues (allergens, violations)
warning: Orange (#F59E0B) - Non-critical issues
info:    Blue   (#3B82F6) - Helpful tips, suggestions
success: Green  (#10B981) - Confirmations
```

## Testing Checklist

- [ ] Generate plan (fresh)
- [ ] Generate plan again (cached)
- [ ] Pull-to-refresh (bypass cache)
- [ ] Test with allergen profile
- [ ] Test with vegan profile
- [ ] Test with high protein goal
- [ ] Test offline
- [ ] Test network timeout
- [ ] Dismiss validation errors
- [ ] Dismiss validation warnings
- [ ] Retry after error

## Common Issues

### Issue: TypeScript errors on ValidationAlert
**Solution**: Ensure GlassCard doesn't have conflicting style props. Use nested View for custom styles.

### Issue: Cache not bypassed on pull-to-refresh
**Solution**: Verify `bypassCache` state is set to `true` in handleRefresh and passed to API call.

### Issue: Validation errors not showing
**Solution**: Check `response.metadata?.validationErrors` exists and is being set in state.

### Issue: Network errors not caught
**Solution**: Wrap API call in try-catch and check for error.message patterns.

## Performance Tips

1. **Cache First**: Default to `bypassCache: false` to leverage cache
2. **Timeout**: Adjust timeout for slower networks (default: 60s)
3. **Retry Logic**: Built-in exponential backoff (3 attempts)
4. **Bundle Size**: Components add only +6.7 KB

## Debugging

Enable detailed logging:
```typescript
// In fitaiWorkersClient.ts
const ENABLE_LOGGING = __DEV__;

// Console output:
[WorkersClient] Generating diet plan...
[WorkersClient] Diet plan generated: { cached: false, ... }
[WorkersClient] ⚠️ Validation errors found: [...]
[WorkersClient] ℹ️ Validation warnings: [...]
```

## Backend URL

```
Production: https://fitai-workers.sharmaharsh9887.workers.dev
Endpoint:   POST /diet/generate
Timeout:    60 seconds
Auth:       JWT from Supabase
```

## Support

- Documentation: `DIET_SCREEN_WORKERS_INTEGRATION_COMPLETE.md`
- Integration Guide: `INTEGRATION_SUMMARY.txt`
- Backend Docs: `FITAI_WORKERS_DEPLOYMENT_COMPLETE.md`
