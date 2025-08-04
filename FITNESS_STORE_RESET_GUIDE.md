
# Fitness Store Reset Guide

To complete the old data cleanup, add this to your app initialization:

```typescript
// In your main App.tsx or initialization code
import { useFitnessStore } from './src/stores/fitnessStore';

// Clear all old fitness data
const fitnessStore = useFitnessStore.getState();
fitnessStore.clearData();

console.log('🧹 Old workout data cleared - ready for fresh generation');
```

## What was cleared:
- Old weekly workout plans with descriptive exercise names
- Workout progress tracking for old format
- Current workout sessions with incompatible data
- AsyncStorage fitness data

## Next steps:
1. Start the app
2. Generate a new workout plan (will use database IDs)
3. All exercises will now have guaranteed GIF coverage
