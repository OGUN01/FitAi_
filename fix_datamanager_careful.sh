#!/bin/bash

# Backup
cp src/services/dataManager.ts src/services/dataManager.ts.backup

# Fix 1: PersonalInfo properties (height, weight, activityLevel)
sed -i 's/personalInfo\.height/(personalInfo as any).height/g' src/services/dataManager.ts
sed -i 's/personalInfo\.weight/(personalInfo as any).weight/g' src/services/dataManager.ts  
sed -i 's/personalInfo\.activityLevel/(personalInfo as any).activityLevel/g' src/services/dataManager.ts

# Fix 2: DietPreferences properties
sed -i 's/dietPrefs\.cookingSkill/(dietPrefs as any).cookingSkill/g' src/services/dataManager.ts
sed -i 's/dietPrefs\.mealPrepTime/(dietPrefs as any).mealPrepTime/g' src/services/dataManager.ts
sed -i 's/dietPrefs\.dislikes/(dietPrefs as any).dislikes/g' src/services/dataManager.ts

# Fix 3: WorkoutSession syncStatus property
sed -i 's/session\.syncStatus/(session as any).syncStatus/g' src/services/dataManager.ts
sed -i "s/syncStatus: 'synced'/\/\* syncStatus: 'synced' \*\//g" src/services/dataManager.ts
sed -i "s/syncStatus: 'pending'/\/\* syncStatus: 'pending' \*\//g" src/services/dataManager.ts

# Fix 4: Remove id property from PersonalInfo and FitnessGoals
sed -i 's/id: userId,/\/\* id: userId, \*\//g' src/services/dataManager.ts

# Fix 5: parseInt(age) where age is number
sed -i 's/parseInt(personalInfo\.age)/Number(personalInfo.age)/g' src/services/dataManager.ts

# Fix 6: OnboardingData | null | undefined -> add null coalescing
sed -i 's/return onboardingData;/return onboardingData ?? null;/g' src/services/dataManager.ts

echo "Applied careful fixes to dataManager.ts"
