# Validation System - Documentation Index

## Quick Start

New to the validation system? Start here:

1. **Read**: [VALIDATION_QUICK_REFERENCE.md](src/utils/VALIDATION_QUICK_REFERENCE.md) - 5 minute read
2. **Review**: [VALIDATION_EXAMPLES.tsx](src/utils/VALIDATION_EXAMPLES.tsx) - See real examples
3. **Use**: Import validators and start validating!

```typescript
import { validatePersonalInfo, getRequiredField } from './utils/profileValidation';
```

## Documentation Files

### Core Implementation

| File | Size | Purpose |
|------|------|---------|
| [src/utils/profileValidation.ts](src/utils/profileValidation.ts) | 15KB | Core validation module with 16+ validators |
| [src/utils/userHelpers.ts](src/utils/userHelpers.ts) | 3.4KB | User display functions using validators |
| [src/utils/__tests__/profileValidation.test.ts](src/utils/__tests__/profileValidation.test.ts) | 23KB | Comprehensive test suite (50+ tests) |

### Documentation

| File | Size | Purpose | Best For |
|------|------|---------|----------|
| [VALIDATION_QUICK_REFERENCE.md](src/utils/VALIDATION_QUICK_REFERENCE.md) | 4.5KB | Quick lookup cheat sheet | Daily reference |
| [VALIDATION_UTILITIES_GUIDE.md](src/utils/VALIDATION_UTILITIES_GUIDE.md) | 17KB | Comprehensive API documentation | Learning the system |
| [VALIDATION_EXAMPLES.tsx](src/utils/VALIDATION_EXAMPLES.tsx) | 15KB | 10 real-world usage examples | Understanding patterns |
| [VALIDATION_ARCHITECTURE.md](VALIDATION_ARCHITECTURE.md) | 11KB | System architecture & diagrams | Understanding design |
| [VALIDATION_SYSTEM_COMPLETE.md](VALIDATION_SYSTEM_COMPLETE.md) | 11KB | Implementation summary | Project overview |
| [VALIDATION_MIGRATION_CHECKLIST.md](VALIDATION_MIGRATION_CHECKLIST.md) | 14KB | Step-by-step migration guide | Implementing system |

### Total Documentation
- **6 documentation files**
- **72KB of documentation**
- **3 core implementation files**
- **Total: 9 files, ~98KB**

## Quick Navigation

### I want to...

#### Learn the Basics
→ Start with [VALIDATION_QUICK_REFERENCE.md](src/utils/VALIDATION_QUICK_REFERENCE.md)
→ Then read [VALIDATION_UTILITIES_GUIDE.md](src/utils/VALIDATION_UTILITIES_GUIDE.md)

#### See Examples
→ Review [VALIDATION_EXAMPLES.tsx](src/utils/VALIDATION_EXAMPLES.tsx)
→ Look at [src/utils/userHelpers.ts](src/utils/userHelpers.ts) for real usage

#### Understand the Architecture
→ Read [VALIDATION_ARCHITECTURE.md](VALIDATION_ARCHITECTURE.md)
→ Review [VALIDATION_SYSTEM_COMPLETE.md](VALIDATION_SYSTEM_COMPLETE.md)

#### Migrate Existing Code
→ Follow [VALIDATION_MIGRATION_CHECKLIST.md](VALIDATION_MIGRATION_CHECKLIST.md)
→ Reference [VALIDATION_EXAMPLES.tsx](src/utils/VALIDATION_EXAMPLES.tsx) for patterns

#### Write Tests
→ Study [src/utils/__tests__/profileValidation.test.ts](src/utils/__tests__/profileValidation.test.ts)
→ Follow test patterns in the guide

## Common Tasks

### Task 1: Validate a Form
```typescript
import { validatePersonalInfo, formatValidationErrors } from './utils/profileValidation';

const result = validatePersonalInfo(formData);
if (!result.isValid) {
  alert(formatValidationErrors(result));
  return;
}
submit(formData);
```
**See**: VALIDATION_QUICK_REFERENCE.md, Section "Form Validation"

### Task 2: Get Required Field
```typescript
import { getRequiredField } from './utils/profileValidation';

try {
  const name = getRequiredField(user.first_name, 'first_name');
  console.log(`Hello, ${name}!`);
} catch (error) {
  redirectToProfileSetup();
}
```
**See**: VALIDATION_UTILITIES_GUIDE.md, Section "Required Field Helpers"

### Task 3: Validate Complete Profile
```typescript
import { validateProfileComplete } from './utils/profileValidation';

const result = validateProfileComplete(profile);
if (result.isValid) {
  submitProfile(profile);
} else {
  showErrors(result.errors);
  navigateToIncompleteSection(result.missingFields);
}
```
**See**: VALIDATION_EXAMPLES.tsx, Example 4

### Task 4: Calculate with Validation
```typescript
import { getRequiredNumericField } from './utils/profileValidation';

const height = getRequiredNumericField(
  profile.height_cm, 'height_cm', 100, 250
);
const weight = getRequiredNumericField(
  profile.current_weight_kg, 'current_weight_kg', 30, 300
);
const bmi = weight / ((height / 100) ** 2);
```
**See**: VALIDATION_EXAMPLES.tsx, Example 3

## API Reference

### Core Helpers
- `getRequiredField<T>(value, fieldName, context?)` - Get required field or throw
- `getRequiredNumericField(value, fieldName, min, max, context?)` - Get numeric with range
- `getRequiredArrayField<T>(value, fieldName, minLength?, context?)` - Get array with length

**Reference**: VALIDATION_UTILITIES_GUIDE.md, Section "Required Field Helpers"

### Section Validators
- `validatePersonalInfo(personalInfo)` → ValidationResult
- `validateBodyMetrics(bodyMetrics)` → ValidationResult
- `validateDietPreferences(dietPrefs)` → ValidationResult
- `validateWorkoutPreferences(workoutPrefs)` → ValidationResult

**Reference**: VALIDATION_UTILITIES_GUIDE.md, Section "Section Validators"

### Composite Validators
- `validateProfileComplete(profile)` → ValidationResult
- `validateMinimumProfile(profile)` → ValidationResult

**Reference**: VALIDATION_UTILITIES_GUIDE.md, Section "Composite Validators"

### Field-Specific Validators
- `validateEmail(email)` → ValidationResult
- `validatePassword(password)` → ValidationResult
- `validateDateOfBirth(dob)` → ValidationResult

**Reference**: VALIDATION_UTILITIES_GUIDE.md, Section "Field-Specific Validators"

### Utilities
- `combineValidationResults(...results)` → ValidationResult
- `hasCriticalErrors(result)` → boolean
- `formatValidationErrors(result)` → string

**Reference**: VALIDATION_UTILITIES_GUIDE.md, Section "Utility Functions"

## Validation Coverage

### Required Fields

| Section | Field | Type | Range/Options |
|---------|-------|------|---------------|
| Personal Info | first_name | string | non-empty |
| Personal Info | last_name | string | non-empty |
| Personal Info | age | number | 13-120 |
| Personal Info | gender | string | male/female/other |
| Body Metrics | height_cm | number | 100-250 |
| Body Metrics | current_weight_kg | number | 30-300 |
| Diet Preferences | diet_type | string | non-empty |
| Workout Preferences | fitness_level | string | beginner/intermediate/advanced |
| Workout Preferences | workout_days_per_week | number | 1-7 |

**Reference**: VALIDATION_SYSTEM_COMPLETE.md, Section "Validation Coverage"

## Integration Roadmap

### Phase 1: Core (Completed ✅)
- [x] Core validation module
- [x] User helpers integration
- [x] Comprehensive tests
- [x] Complete documentation

### Phase 2: Onboarding Screens
- [ ] Personal Info Screen
- [ ] Body Analysis Screen
- [ ] Diet Preferences Screen
- [ ] Workout Preferences Screen
- [ ] Review Screen

### Phase 3: Main Screens
- [ ] Home Screen
- [ ] Profile Screen
- [ ] Diet Screen
- [ ] Fitness Screen
- [ ] Analytics Screen

### Phase 4: Services
- [ ] API Service
- [ ] Data Manager
- [ ] Profile Service
- [ ] Calculation Services

### Phase 5: Components
- [ ] User Display Components
- [ ] Form Components
- [ ] Chart/Analytics Components
- [ ] List Components

**Reference**: VALIDATION_MIGRATION_CHECKLIST.md for complete roadmap

## Testing

### Run Tests
```bash
npm test profileValidation.test.ts
```

### Test Coverage
- ✅ 50+ unit tests
- ✅ All validators tested
- ✅ Edge cases covered
- ✅ Error scenarios tested
- ✅ Utility functions tested

**Reference**: src/utils/__tests__/profileValidation.test.ts

## Best Practices

### DO ✅
1. Validate data before using it
2. Handle validation errors explicitly
3. Show clear error messages to users
4. Use try-catch with getRequired* helpers
5. Check ValidationResult.isValid before proceeding

### DON'T ❌
1. Use fallback values (e.g., "Champion", 0, [])
2. Ignore validation results
3. Catch errors and silently continue
4. Access data without validation
5. Mix validation logic with business logic

**Reference**: VALIDATION_QUICK_REFERENCE.md, Section "DO's and DON'Ts"

## FAQ

### Why no fallback values?
Fallback values mask data flow issues. By throwing errors or returning validation results, we force explicit error handling and ensure data integrity.

### When should I use getRequiredField vs validate*?
- Use `getRequiredField()` when you need data immediately and cannot proceed without it
- Use `validate*()` for form validation where you want to collect all errors at once

### How do I handle validation errors in components?
Use try-catch for getRequired* helpers, or check ValidationResult.isValid for validate* functions. Always provide user feedback.

### Can I extend the validators?
Yes! The system is modular. See VALIDATION_EXAMPLES.tsx, Example 9 for custom validation rules.

### What if I need to validate before the user completes onboarding?
Use `validateMinimumProfile()` which only checks critical fields needed for basic app access.

**More FAQs**: VALIDATION_UTILITIES_GUIDE.md

## Support

### Getting Help
1. Check this index first
2. Review the quick reference
3. Look at examples
4. Read the comprehensive guide
5. Check test files for patterns

### Common Issues

#### Issue: "Required field missing: first_name"
**Solution**: User hasn't completed personal info. Redirect to profile completion.
**Reference**: VALIDATION_EXAMPLES.tsx, Example 6

#### Issue: Validation passes but data still missing
**Solution**: Check that you're validating the correct object structure.
**Reference**: VALIDATION_ARCHITECTURE.md, Section "Data Flow"

#### Issue: Too many validation errors at once
**Solution**: Use progressive validation (validate per section, not all at once).
**Reference**: VALIDATION_EXAMPLES.tsx, Example 2

## Version History

### v1.0.0 - Initial Release (Current)
- Core validation module created
- 16+ validation functions
- User helpers integrated
- Comprehensive documentation
- 50+ tests
- Zero fallbacks implemented

## Contributing

When adding new validators:
1. Follow existing patterns in profileValidation.ts
2. Add tests in profileValidation.test.ts
3. Update VALIDATION_UTILITIES_GUIDE.md
4. Add examples in VALIDATION_EXAMPLES.tsx
5. Update this index

## Summary

The validation system provides:
- **16+ validators** for all profile data
- **Zero fallbacks** - all missing data must be handled
- **Type safety** - full TypeScript support
- **Clear errors** - know exactly what's missing
- **Well tested** - 50+ test cases
- **Well documented** - 72KB of documentation

Start with the quick reference, review the examples, and begin validating!

---

**Last Updated**: 2025-12-29
**Status**: ✅ Complete and Ready for Integration
