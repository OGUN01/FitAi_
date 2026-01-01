# Validation System Migration Checklist

## Overview
This checklist helps you migrate existing code from using fallback values to the new validation system with zero fallbacks.

## Phase 1: Assessment

### 1.1 Find All Fallback Usages
- [ ] Search codebase for `|| 'Champion'`
- [ ] Search for `|| ''` (empty string fallbacks)
- [ ] Search for `|| 0` (numeric fallbacks)
- [ ] Search for `|| []` (array fallbacks)
- [ ] Search for `|| {}` (object fallbacks)
- [ ] Search for `?? ` (nullish coalescing with defaults)
- [ ] Search for default parameters in function signatures

### 1.2 Identify Validation Points
- [ ] List all forms that collect user data
- [ ] List all places that display user data
- [ ] List all calculations using user data (BMI, calories, etc.)
- [ ] List all API requests with user data
- [ ] List all navigation guards
- [ ] List all components that require user data

## Phase 2: Core Files Migration

### 2.1 User Helpers (COMPLETED ✅)
- [x] Import validation utilities
- [x] Add `ensureValidPersonalInfo()` helper
- [x] Update `getUserDisplayName()` to use validators
- [x] Update `getUserFirstName()` to use validators
- [x] Update `getUserInitials()` to use validators
- [x] Remove all fallback values
- [x] Add error handling

### 2.2 Onboarding Screens
#### Personal Info Screen
- [ ] Import `validatePersonalInfo`
- [ ] Add validation on form submit
- [ ] Show validation errors to user
- [ ] Highlight invalid fields
- [ ] Prevent navigation if invalid
- [ ] Remove any default values in form

#### Body Analysis Screen
- [ ] Import `validateBodyMetrics`
- [ ] Add validation on form submit
- [ ] Show validation errors to user
- [ ] Highlight invalid fields
- [ ] Add real-time validation for numeric inputs
- [ ] Remove any default values in form

#### Diet Preferences Screen
- [ ] Import `validateDietPreferences`
- [ ] Add validation on form submit
- [ ] Validate arrays (allergies, restrictions, etc.)
- [ ] Show validation errors to user
- [ ] Remove any default values in form

#### Workout Preferences Screen
- [ ] Import `validateWorkoutPreferences`
- [ ] Add validation on form submit
- [ ] Validate fitness level selection
- [ ] Validate workout days range
- [ ] Show validation errors to user
- [ ] Remove any default values in form

#### Review Screen
- [ ] Import `validateProfileComplete`
- [ ] Validate entire profile before submission
- [ ] Show summary of any missing data
- [ ] Prevent submission if invalid
- [ ] Add completion percentage indicator

### 2.3 Main Screens

#### Home Screen
- [ ] Import required validators
- [ ] Wrap greeting in try-catch using `getUserFirstName()`
- [ ] Validate data before displaying stats
- [ ] Add error boundary for missing data
- [ ] Remove "Champion" or similar fallbacks

#### Profile Screen
- [ ] Import `validateProfileComplete`
- [ ] Validate before saving changes
- [ ] Show validation errors for each section
- [ ] Add completion indicators
- [ ] Remove any fallback display values

#### Diet Screen
- [ ] Validate diet preferences before generating meals
- [ ] Check required nutritional data exists
- [ ] Handle missing preferences gracefully
- [ ] Remove default meal fallbacks

#### Fitness Screen
- [ ] Validate workout preferences before generating workouts
- [ ] Check fitness level and equipment availability
- [ ] Handle missing preferences gracefully
- [ ] Remove default workout fallbacks

#### Analytics Screen
- [ ] Validate data before calculations
- [ ] Use `getRequiredNumericField` for BMI, etc.
- [ ] Handle missing data with clear messages
- [ ] Don't show charts with incomplete data

## Phase 3: Services Migration

### 3.1 API Service
- [ ] Import validators
- [ ] Validate data before POST requests
- [ ] Validate data before PUT requests
- [ ] Add validation error handling
- [ ] Return validation errors to caller

### 3.2 Data Manager Service
- [ ] Add validation before saving to storage
- [ ] Validate data loaded from storage
- [ ] Handle corrupted/incomplete data
- [ ] Add migration for existing invalid data

### 3.3 Profile Service
- [ ] Use `validateProfileComplete` before updates
- [ ] Use `validateMinimumProfile` for basic checks
- [ ] Add validation to getter functions
- [ ] Remove fallback values in getters

### 3.4 Calculation Services
- [ ] Import `getRequiredNumericField`
- [ ] Validate inputs for BMI calculation
- [ ] Validate inputs for calorie calculation
- [ ] Validate inputs for macro calculation
- [ ] Wrap calculations in try-catch
- [ ] Return validation errors instead of defaults

## Phase 4: Components Migration

### 4.1 User Display Components
- [ ] Avatar component: Use `getUserInitials()` with error handling
- [ ] Greeting component: Use `getUserFirstName()` with error handling
- [ ] Profile header: Use `getUserDisplayName()` with error handling
- [ ] User card: Validate all displayed fields
- [ ] Add fallback UI for missing data (not fallback data)

### 4.2 Form Components
- [ ] Add validation to custom input components
- [ ] Add real-time validation feedback
- [ ] Show error messages near inputs
- [ ] Disable submit if validation fails
- [ ] Add field-level validation helpers

### 4.3 Chart/Analytics Components
- [ ] Validate data before rendering charts
- [ ] Show "incomplete data" message instead of empty charts
- [ ] Use `getRequiredNumericField` for values
- [ ] Handle missing data gracefully

### 4.4 List Components
- [ ] Validate items before rendering
- [ ] Filter out invalid items
- [ ] Log validation failures
- [ ] Show count of invalid items to user

## Phase 5: Navigation & Guards

### 5.1 Navigation Guards
- [ ] Add `validateMinimumProfile` check for app access
- [ ] Redirect to onboarding if validation fails
- [ ] Check profile completeness before certain screens
- [ ] Show reason for navigation block

### 5.2 Tab Navigation
- [ ] Validate required data for each tab
- [ ] Disable tabs requiring missing data
- [ ] Show indicators for incomplete sections

### 5.3 Deep Linking
- [ ] Validate profile before deep link navigation
- [ ] Redirect to appropriate completion screen
- [ ] Handle invalid deep link params

## Phase 6: Testing

### 6.1 Unit Tests
- [ ] Test all validators (already done ✅)
- [ ] Test updated user helpers
- [ ] Test form validation logic
- [ ] Test error handling
- [ ] Test edge cases (null, undefined, empty)

### 6.2 Integration Tests
- [ ] Test onboarding flow with validation
- [ ] Test profile editing with validation
- [ ] Test navigation guards
- [ ] Test API requests with validation
- [ ] Test error boundaries

### 6.3 E2E Tests
- [ ] Test complete user journey
- [ ] Test validation error messages
- [ ] Test form submission blocking
- [ ] Test navigation blocking
- [ ] Test data persistence with validation

## Phase 7: Error Handling

### 7.1 Error Boundaries
- [ ] Add error boundary for profile-dependent screens
- [ ] Show helpful fallback UI
- [ ] Log validation errors for monitoring
- [ ] Add "Complete Profile" CTA in fallback

### 7.2 User Feedback
- [ ] Design validation error UI
- [ ] Add toast notifications for validation errors
- [ ] Show inline field validation
- [ ] Add validation summary modals
- [ ] Create helpful error messages

### 7.3 Logging & Monitoring
- [ ] Log validation failures
- [ ] Track most common validation errors
- [ ] Monitor validation failure rates
- [ ] Alert on high validation failure rates

## Phase 8: Documentation

### 8.1 Code Documentation
- [ ] Add JSDoc comments to validators
- [ ] Document error handling patterns
- [ ] Add inline comments for complex validation
- [ ] Update function signatures

### 8.2 Team Documentation
- [ ] Share validation guide with team
- [ ] Create onboarding doc for new developers
- [ ] Add validation to code review checklist
- [ ] Create runbook for common validation issues

### 8.3 User Documentation
- [ ] Update help docs with validation requirements
- [ ] Create FAQ for common validation errors
- [ ] Add tooltips for validation rules
- [ ] Update onboarding tutorial

## Phase 9: Cleanup

### 9.1 Remove Fallbacks
- [ ] Remove all `|| 'Champion'` fallbacks
- [ ] Remove all `|| ''` fallbacks
- [ ] Remove all `|| 0` fallbacks
- [ ] Remove all `|| []` fallbacks
- [ ] Remove all `|| {}` fallbacks
- [ ] Search for remaining `??` with defaults

### 9.2 Code Review
- [ ] Review all changed files
- [ ] Check for consistent error handling
- [ ] Verify all validation points covered
- [ ] Check for any remaining silent failures

### 9.3 Performance
- [ ] Profile validation overhead
- [ ] Optimize hot paths if needed
- [ ] Add validation caching if needed
- [ ] Monitor app performance

## Phase 10: Deployment

### 10.1 Pre-Deployment
- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Error monitoring configured

### 10.2 Staged Rollout
- [ ] Deploy to staging environment
- [ ] Test with real data
- [ ] Monitor error rates
- [ ] Collect user feedback

### 10.3 Production
- [ ] Deploy to production
- [ ] Monitor validation error rates
- [ ] Monitor user support tickets
- [ ] Fix any issues quickly

### 10.4 Post-Deployment
- [ ] Analyze validation failure patterns
- [ ] Improve error messages based on feedback
- [ ] Update documentation based on issues
- [ ] Share lessons learned with team

## Common Patterns to Replace

### Pattern 1: Display Name Fallback
```typescript
// ❌ BEFORE
const name = user?.first_name || 'Champion';

// ✅ AFTER
import { getUserFirstName } from './utils/userHelpers';

try {
  const name = getUserFirstName(user.personalInfo);
  return `Hello, ${name}!`;
} catch (error) {
  console.error(error.message);
  navigation.navigate('CompleteProfile');
  return null; // Don't render
}
```

### Pattern 2: Numeric Calculation
```typescript
// ❌ BEFORE
const bmi = (weight || 70) / ((height || 170) / 100) ** 2;

// ✅ AFTER
import { getRequiredNumericField } from './utils/profileValidation';

try {
  const weight = getRequiredNumericField(
    profile.current_weight_kg, 'current_weight_kg', 30, 300
  );
  const height = getRequiredNumericField(
    profile.height_cm, 'height_cm', 100, 250
  );
  const bmi = weight / ((height / 100) ** 2);
  return bmi;
} catch (error) {
  console.error('Cannot calculate BMI:', error.message);
  throw error; // Let caller handle
}
```

### Pattern 3: Form Validation
```typescript
// ❌ BEFORE
const handleSubmit = () => {
  if (formData.first_name) {
    submit(formData);
  }
};

// ✅ AFTER
import { validatePersonalInfo, formatValidationErrors } from './utils/profileValidation';

const handleSubmit = () => {
  const result = validatePersonalInfo(formData);

  if (!result.isValid) {
    setErrors(result.errors);
    alert(formatValidationErrors(result));
    return;
  }

  submit(formData);
};
```

### Pattern 4: Array Access
```typescript
// ❌ BEFORE
const allergies = user.allergies || [];

// ✅ AFTER
import { getRequiredArrayField } from './utils/profileValidation';

try {
  const allergies = getRequiredArrayField(
    user.allergies, 'allergies', 0
  );
  return allergies;
} catch (error) {
  console.error('Allergies not set:', error.message);
  return []; // OK to return empty array if allergies are truly optional
}
```

## Progress Tracking

### Overall Progress
- [ ] Phase 1: Assessment (0%)
- [x] Phase 2.1: User Helpers (100%)
- [ ] Phase 2.2: Onboarding Screens (0%)
- [ ] Phase 2.3: Main Screens (0%)
- [ ] Phase 3: Services Migration (0%)
- [ ] Phase 4: Components Migration (0%)
- [ ] Phase 5: Navigation & Guards (0%)
- [ ] Phase 6: Testing (20% - validators tested)
- [ ] Phase 7: Error Handling (0%)
- [ ] Phase 8: Documentation (100% - guides created)
- [ ] Phase 9: Cleanup (0%)
- [ ] Phase 10: Deployment (0%)

### Estimated Time
- **Phase 1**: 2-4 hours
- **Phase 2**: 8-16 hours
- **Phase 3**: 4-8 hours
- **Phase 4**: 8-16 hours
- **Phase 5**: 4-6 hours
- **Phase 6**: 8-12 hours
- **Phase 7**: 4-6 hours
- **Phase 8**: Already complete ✅
- **Phase 9**: 2-4 hours
- **Phase 10**: 4-8 hours

**Total Estimated Time**: 44-80 hours (5-10 working days)

## Success Criteria

### Must Have
- ✅ Core validation utilities created
- ✅ User helpers migrated
- ✅ Comprehensive tests written
- ✅ Documentation complete
- [ ] All onboarding screens use validators
- [ ] All main screens handle missing data
- [ ] No fallback values remain
- [ ] All tests passing

### Should Have
- [ ] Error boundaries for all screens
- [ ] Real-time validation feedback
- [ ] Validation analytics/monitoring
- [ ] Migration complete in all services

### Nice to Have
- [ ] Validation caching for performance
- [ ] A11y improvements for validation errors
- [ ] Animated validation feedback
- [ ] Validation state persistence

## Notes

- Start with high-impact, low-risk areas (user helpers ✅)
- Migrate one screen/component at a time
- Test thoroughly after each migration
- Get code review for each phase
- Monitor error rates closely
- Be ready to roll back if issues arise
- Communicate changes to team
- Update documentation as you go

## Questions/Issues

- Document any blockers here
- Note any unclear requirements
- Track any breaking changes needed
- List any dependency updates required
