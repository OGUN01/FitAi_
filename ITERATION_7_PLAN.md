# Iteration 7 - Quick Fix Plan

## Current Status
- Errors: 523
- Target: <450 errors (15% reduction)

## Priority Fixes (Estimated ~30 errors)

### 1. Migration Types (~15 errors)
**Files:**
- src/components/migration/MigrationProgressModal.tsx
- src/components/migration/MigrationIntegration.tsx

**Actions:**
- Check actual export name in MigrationProgressModal
- Add conflicts property to MigrationResult type
- Fix MigrationStatus/MigrationProgress type alignment
- Fix SetStateAction type issues

### 2. WebManifest Boolean Comparison (~4 errors)
**Files:**
- src/components/notifications/NotificationEditModal.tsx (line 22)
- src/components/notifications/WaterReminderEditModal.tsx (line 21)

**Fix:**
Change from: `manifest === true`
To: `typeof manifest !== 'undefined'` or similar

### 3. Card.tsx Children Types (~10 errors)
**File:** src/components/ui/Card.tsx

**Issues:**
- child.props is unknown
- Property children does not exist

**Fix:**
Add React.isValidElement() type guards

### 4. Number Type Restrictions (~5 errors)
**File:** src/components/diet/FoodRecognitionFeedback.tsx (line 177)

**Fix:**
Type assertion or validation for rating value (1|2|3|4|5)

## Quick Wins
Look for patterns like:
- More optional chaining opportunities
- Simple type assertions
- Missing null checks
