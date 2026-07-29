# Diet Tab Testing Learnings - 2026-03-02

## CORS Fix Verification
- The `api.upcitemdb.com` CORS issue is **fully resolved**
- Barcode lookup no longer calls upcitemdb.com at all (endpoint removed from `freeNutritionAPIs.ts`)
- Barcode lookup flow: Supabase RPC `lookup_barcode` -> `world.openfoodfacts.org` -> `in.openfoodfacts.org`
- **NEW CORS issue discovered**: `in.openfoodfacts.org` (India-specific Open Food Facts) has CORS blocking from localhost
  - Error: "Access to fetch at 'https://in.openfoodfacts.org/...' blocked by CORS policy: No 'Access-Control-Allow-Origin' header"
  - This is a secondary issue, not the one that was fixed

## UI Pattern: Diet Tab Action Buttons
- Six action buttons in a horizontal row: Scan Food, Barcode, Log Meal, AI Meal, Log Water, Recipes
- "Enter Barcode Manually" is a separate standalone button below the row
- "Generate weekly plan" and "Generate daily plan" are in the header toolbar area

## Guest Auth Blocking Pattern
- AI features use `confirm()` dialog for blocking guests (not alerts or modals)
- Different messages per feature:
  - AI Meal: "Sign Up Required\n\nCreate an account to generate personalized AI meals."
  - Generate daily plan: "Sign Up Required\n\nCreate an account to generate meal plans."
  - Generate weekly plan: "Sign In Required\n\nCreate a free account to generate your personalized AI meal plan and save your progress."
  - Note: weekly plan says "Sign In" while daily says "Sign Up" — inconsistent wording

## Barcode Dialog UX
- Auto-detects country of origin from barcode prefix (showed "India" flag for 890...)
- Shows digit count progress (e.g., "13 / 13 digits")
- "Look Up" button is disabled until valid barcode length entered
- Result shows "Product not found. Try a different barcode." with "Try Again" button

## Scan Food Behavior
- Opens a "Select Meal Type" modal first (Breakfast, Lunch, Dinner, Snack)
- Time-based suggestion: "Based on current time, we suggest: Lunch"
- After selecting meal type, attempts camera access
- Graceful failure on web: "No access to camera - Please enable camera permissions"
- Does NOT crash, no errors in console

## Recipes Feature
- Opens a rich AI recipe creation form (not just a recipe list)
- 4 fields: dish description, dietary preferences, time, servings
- Pre-filled suggestion chips for each field
- When submitted: "Feature Not Available - AI recipe generation is currently disabled. This feature will be available when the backend integration is complete."
- Does NOT check auth first — shows feature-not-available regardless of login state
