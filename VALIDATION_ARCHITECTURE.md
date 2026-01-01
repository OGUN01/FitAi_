# Validation System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FitAI Application                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  Onboarding │  │ Main Screens│  │   Services  │           │
│  │   Screens   │  │             │  │             │           │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          │                                     │
│                          ▼                                     │
│         ┌────────────────────────────────┐                    │
│         │   profileValidation.ts         │                    │
│         │  (Core Validation Module)      │                    │
│         └────────────────────────────────┘                    │
│                          │                                     │
│         ┌────────────────┴────────────────┐                   │
│         │                                  │                   │
│         ▼                                  ▼                   │
│  ┌─────────────┐                   ┌─────────────┐           │
│  │   Helpers   │                   │  Validators │           │
│  ├─────────────┤                   ├─────────────┤           │
│  │ Required    │                   │ Personal    │           │
│  │ Field       │                   │ Info        │           │
│  ├─────────────┤                   ├─────────────┤           │
│  │ Numeric     │                   │ Body        │           │
│  │ Field       │                   │ Metrics     │           │
│  ├─────────────┤                   ├─────────────┤           │
│  │ Array       │                   │ Diet        │           │
│  │ Field       │                   │ Preferences │           │
│  └─────────────┘                   ├─────────────┤           │
│                                     │ Workout     │           │
│                                     │ Preferences │           │
│                                     ├─────────────┤           │
│                                     │ Profile     │           │
│                                     │ Complete    │           │
│                                     └─────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Form Submission Flow

```
User Input
   │
   ▼
┌──────────────┐
│ Form Data    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ validateSection  │  (e.g., validatePersonalInfo)
└──────┬───────────┘
       │
       ▼
   ┌───────┐
   │ Valid?│
   └───┬───┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
  YES      NO
   │       │
   │       ▼
   │  ┌──────────────┐
   │  │ Show Errors  │
   │  └──────────────┘
   │
   ▼
┌──────────────┐
│ Submit Data  │
└──────────────┘
```

### 2. Data Access Flow

```
Component Needs Data
   │
   ▼
┌──────────────────┐
│ getRequiredField │
└──────┬───────────┘
       │
   ┌───┴───┐
   │ Exists?│
   └───┬───┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
  YES      NO
   │       │
   │       ▼
   │  ┌──────────────┐
   │  │ Throw Error  │
   │  └──────┬───────┘
   │         │
   │         ▼
   │    ┌──────────────┐
   │    │ Error Handler│
   │    │ - Log        │
   │    │ - Navigate   │
   │    │ - Show UI    │
   │    └──────────────┘
   │
   ▼
┌──────────────┐
│ Return Value │
└──────────────┘
```

### 3. Validation Result Flow

```
Validation Request
   │
   ▼
┌──────────────────┐
│ validateRules    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Check Each Rule  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Aggregate Results│
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ ValidationResult     │
│ - isValid            │
│ - missingFields[]    │
│ - errors[]           │
└──────────────────────┘
       │
       ▼
   ┌───────┐
   │ Valid?│
   └───┬───┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
  YES      NO
   │       │
   │       ▼
   │  ┌──────────────────┐
   │  │ formatErrors()   │
   │  └──────┬───────────┘
   │         │
   │         ▼
   │    ┌──────────────┐
   │    │ Display to   │
   │    │ User         │
   │    └──────────────┘
   │
   ▼
┌──────────────┐
│ Proceed      │
└──────────────┘
```

## Component Architecture

### Core Validation Module (profileValidation.ts)

```
profileValidation.ts
├── Types
│   ├── ValidationResult
│   └── FieldValidationRule
│
├── Core Helpers
│   ├── getRequiredField<T>()
│   ├── getRequiredNumericField()
│   ├── getRequiredArrayField<T>()
│   └── validateRules()
│
├── Section Validators
│   ├── validatePersonalInfo()
│   ├── validateBodyMetrics()
│   ├── validateDietPreferences()
│   └── validateWorkoutPreferences()
│
├── Composite Validators
│   ├── validateProfileComplete()
│   └── validateMinimumProfile()
│
├── Field-Specific Validators
│   ├── validateEmail()
│   ├── validatePassword()
│   └── validateDateOfBirth()
│
└── Utilities
    ├── combineValidationResults()
    ├── hasCriticalErrors()
    └── formatValidationErrors()
```

### User Helpers Integration (userHelpers.ts)

```
userHelpers.ts
├── ensureValidPersonalInfo()
│   └── Uses: validatePersonalInfo()
│
├── getUserDisplayName()
│   ├── Uses: ensureValidPersonalInfo()
│   └── Uses: getRequiredField()
│
├── getUserFirstName()
│   ├── Uses: ensureValidPersonalInfo()
│   └── Uses: getRequiredField()
│
└── getUserInitials()
    ├── Uses: ensureValidPersonalInfo()
    └── Uses: getRequiredField()
```

## Validation Hierarchy

```
                    validateProfileComplete()
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
validatePersonalInfo() validateBodyMetrics() validateDietPreferences()
        │                     │                     │
        ├─ first_name        ├─ height_cm          └─ diet_type
        ├─ last_name         └─ current_weight_kg
        ├─ age
        └─ gender

        ┌─────────────────────┘
        │
        ▼
validateWorkoutPreferences()
        │
        ├─ fitness_level
        └─ workout_days_per_week
```

## Error Handling Layers

```
┌─────────────────────────────────────────┐
│ Layer 4: User Interface                 │
│ - Show error messages                   │
│ - Highlight invalid fields              │
│ - Display validation summary            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ Layer 3: Error Boundaries               │
│ - Catch validation errors               │
│ - Show fallback UI                      │
│ - Provide recovery actions              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ Layer 2: Component Logic                │
│ - Try-catch blocks                      │
│ - Validation result checks              │
│ - Conditional rendering                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ Layer 1: Validation Functions           │
│ - Throw errors for missing data         │
│ - Return ValidationResult               │
│ - No fallback values                    │
└─────────────────────────────────────────┘
```

## Integration Points

### Onboarding Flow

```
Step 1: Personal Info
   │
   ├─► validatePersonalInfo() ─► Valid? ─► Next Step
   │                               │
   └───────────────────────────────┘
                                  No
                                   │
                                   ▼
                            Show Errors
                            Stay on Step


Step 2: Body Metrics
   │
   ├─► validateBodyMetrics() ─► Valid? ─► Next Step
   │                              │
   └──────────────────────────────┘
                                 No
                                  │
                                  ▼
                           Show Errors
                           Stay on Step


Step 3: Diet Preferences
   │
   ├─► validateDietPreferences() ─► Valid? ─► Next Step
   │                                  │
   └──────────────────────────────────┘
                                     No
                                      │
                                      ▼
                               Show Errors
                               Stay on Step


Step 4: Workout Preferences
   │
   ├─► validateWorkoutPreferences() ─► Valid? ─► Review
   │                                     │
   └─────────────────────────────────────┘
                                        No
                                         │
                                         ▼
                                  Show Errors
                                  Stay on Step


Review & Submit
   │
   ├─► validateProfileComplete() ─► Valid? ─► Submit
   │                                  │
   └──────────────────────────────────┘
                                     No
                                      │
                                      ▼
                               Show Missing
                               Navigate to
                               Incomplete Step
```

### Main App Flow

```
App Launch
   │
   ▼
┌──────────────────┐
│ Load User Data   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ validateMinimumProfile│
└────────┬─────────────┘
         │
     ┌───┴───┐
     │ Valid?│
     └───┬───┘
         │
     ┌───┴───┐
     │       │
     ▼       ▼
    YES      NO
     │       │
     │       ▼
     │  ┌──────────────┐
     │  │ Show Modal   │
     │  │ "Complete    │
     │  │  Profile"    │
     │  └──────┬───────┘
     │         │
     │         ▼
     │  ┌──────────────┐
     │  │ Navigate to  │
     │  │ Onboarding   │
     │  └──────────────┘
     │
     ▼
┌──────────────┐
│ Allow App    │
│ Access       │
└──────────────┘
```

## Testing Architecture

```
Test Suite
├── Unit Tests
│   ├── Required Field Helpers
│   │   ├── Null values
│   │   ├── Undefined values
│   │   ├── Empty strings
│   │   ├── Valid values
│   │   └── Context messages
│   │
│   ├── Numeric Field Helpers
│   │   ├── Range validation
│   │   ├── Type checking
│   │   └── NaN handling
│   │
│   ├── Array Field Helpers
│   │   ├── Type checking
│   │   └── Length validation
│   │
│   ├── Section Validators
│   │   ├── Valid data
│   │   ├── Missing fields
│   │   ├── Invalid formats
│   │   └── Edge cases
│   │
│   └── Utilities
│       ├── Combine results
│       ├── Format errors
│       └── Critical errors
│
├── Integration Tests
│   ├── Form flows
│   ├── Navigation guards
│   └── API validation
│
└── E2E Tests
    ├── Onboarding flow
    ├── Profile editing
    └── Data persistence
```

## File Dependencies

```
Components
   │
   ├─► userHelpers.ts
   │      │
   │      └─► profileValidation.ts
   │
   └─► profileValidation.ts
          │
          └─► types/onboarding.ts


Services
   │
   └─► profileValidation.ts
          │
          └─► types/onboarding.ts


Tests
   │
   └─► profileValidation.test.ts
          │
          └─► profileValidation.ts
```

## Key Design Patterns

### 1. Fail-Fast Pattern
```
getRequiredField() → Throws immediately if null/undefined/empty
                   → No fallback values
                   → Forces error handling
```

### 2. Validation Result Pattern
```
validate*() → Returns ValidationResult
            → isValid: boolean
            → missingFields: string[]
            → errors: string[]
            → Caller decides how to handle
```

### 3. Composable Validators Pattern
```
validateProfileComplete()
   └─► Calls multiple validators
       └─► Aggregates results
           └─► Returns combined result
```

### 4. Context-Aware Errors Pattern
```
getRequiredField(value, 'field', 'Context')
   └─► Error: "Required field missing: field (Context)"
       └─► Clear indication of where error occurred
```

## Performance Considerations

```
Validation Performance
   │
   ├─► In-memory validation (microseconds)
   │   └─► No database calls
   │       └─► No network requests
   │
   ├─► Early exit on first error (optional)
   │   └─► Can be configured for fast fail
   │
   └─► Caching opportunities
       └─► Cache validation results
           └─► Invalidate on data change
```

## Security Considerations

```
Security Layers
   │
   ├─► Input Validation
   │   └─► Type checking
   │       └─► Range validation
   │           └─► Format validation
   │
   ├─► No SQL Injection Risk
   │   └─► Pure TypeScript validation
   │       └─► No database queries
   │
   └─► No XSS Risk
       └─► No HTML rendering in validators
           └─► String validation only
```

## Scalability

```
Scalability Factors
   │
   ├─► Stateless Validators
   │   └─► No global state
   │       └─► Thread-safe
   │           └─► Parallelizable
   │
   ├─► Modular Design
   │   └─► Add new validators easily
   │       └─► Compose validators
   │           └─► Extend without breaking
   │
   └─► Performance
       └─► O(1) for most validations
           └─► O(n) for array validations
               └─► Linear scaling
```

## Summary

The validation system is designed with these core principles:

1. **Zero Fallbacks** - All missing data must be handled explicitly
2. **Type Safety** - Full TypeScript support with generics
3. **Composability** - Validators can be combined and extended
4. **Clear Errors** - Every error indicates what's wrong and where
5. **Testability** - Pure functions, easy to test
6. **Performance** - Fast, in-memory validation
7. **Security** - Input validation, no injection risks
8. **Scalability** - Stateless, modular, extensible

The system ensures data integrity throughout the application while providing developers with clear feedback when data is missing or invalid.
