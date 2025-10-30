# 🧪 Onboarding Testing Guide

Complete guide for testing the FitAI onboarding system with automated test suites.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Coverage](#test-coverage)
- [Quick Start](#quick-start)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Device Testing](#device-testing)
- [Test Scenarios](#test-scenarios)
- [Metrics & Reports](#metrics--reports)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The onboarding system is a critical part of FitAI, collecting 170+ data points across 5 comprehensive tabs. This testing suite ensures every field, validation rule, and calculation works correctly.

### System Architecture

```
Onboarding Container (Main)
├── Tab 1: Personal Info (21 fields)
├── Tab 2: Diet Preferences (27 fields)
├── Tab 3: Body Analysis (20+ fields)
├── Tab 4: Workout Preferences (22 fields)
└── Tab 5: Advanced Review (50+ calculated fields)
```

### Key Features Tested

- ✅ All 170+ input fields
- ✅ 100+ validation rules
- ✅ 50+ health calculations
- ✅ Tab navigation & accessibility
- ✅ Data persistence (local & remote)
- ✅ Auto-save functionality
- ✅ Error handling
- ✅ Performance benchmarks

## 📊 Test Coverage

### Test Distribution

| Test Type | Files | Test Cases | Coverage |
|-----------|-------|------------|----------|
| **Unit Tests** | 1 | 20+ | Container logic, navigation, validation |
| **Integration Tests** | 1 | 15+ | Complete flow, data persistence, errors |
| **E2E Tests** | 1 | 4 scenarios | Real user flows, all 5 tabs |
| **Total** | **3** | **39+** | **170+ fields validated** |

### Coverage Breakdown

#### Tab 1: Personal Info (21 fields)
- ✅ First name, last name validation
- ✅ Age range (13-120) validation
- ✅ Gender selection
- ✅ Location (country, state, region)
- ✅ Sleep schedule (wake/sleep times)
- ✅ Occupation type

#### Tab 2: Diet Preferences (27 fields)
- ✅ Diet type selection
- ✅ Allergies & restrictions
- ✅ 6 diet readiness toggles
- ✅ 4 meal preferences
- ✅ 3 cooking preferences
- ✅ 14 health habit checkboxes

#### Tab 3: Body Analysis (20+ fields)
- ✅ Height (100-250 cm)
- ✅ Current weight (30-300 kg)
- ✅ Target weight & timeline
- ✅ Body measurements (waist, hip, chest)
- ✅ Body fat percentage
- ✅ Medical conditions & medications
- ✅ Pregnancy/breastfeeding status
- ✅ Photo uploads (front, side, back)
- ✅ AI analysis results

#### Tab 4: Workout Preferences (22 fields)
- ✅ Primary goals (multiple)
- ✅ Activity level
- ✅ Location & equipment
- ✅ Time preferences
- ✅ Intensity level
- ✅ Workout types
- ✅ Experience & frequency
- ✅ Fitness assessment (pushups, running)
- ✅ Preferences (cardio, strength, groups)

#### Tab 5: Advanced Review (50+ fields)
- ✅ BMI, BMR, TDEE calculations
- ✅ Daily nutritional needs (calories, macros, water)
- ✅ Weight management (healthy range, loss rate)
- ✅ Body composition (ideal BF%, lean mass, fat mass)
- ✅ Heart rate zones (fat burn, cardio, peak)
- ✅ Fitness recommendations (frequency, duration)
- ✅ Health scores (overall, diet, fitness, goal)
- ✅ Sleep analysis
- ✅ Data completeness metrics

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Quick Tests (No Device Needed)

```bash
npm run test:onboarding:quick
```

### 3. Run Full Test Suite

```bash
npm run test:onboarding:all
```

### 4. Run Tests on Device/Emulator

```bash
npm run test:onboarding:device
```

## 🧪 Test Types

### 1. Unit Tests

**File:** `src/__tests__/onboarding/OnboardingContainer.test.tsx`

Tests individual components and functions in isolation.

**Run:**
```bash
npm run test:onboarding:unit
```

**Coverage:**
- Container initialization
- Tab navigation logic
- Validation functions
- Auto-save mechanism
- Back button behavior
- Unsaved changes handling

### 2. Integration Tests

**File:** `src/__tests__/onboarding/OnboardingFlow.integration.test.tsx`

Tests the complete flow from start to finish.

**Run:**
```bash
npm run test:onboarding:integration
```

**Coverage:**
- Complete onboarding flow (all 5 tabs)
- Data validation across tabs
- Error handling
- Data persistence
- Tab accessibility rules
- Performance benchmarks

### 3. E2E Tests

**File:** `src/__tests__/e2e/onboarding.e2e.test.tsx`

Tests real-world scenarios with complete user journeys.

**Run:**
```bash
npm run test:onboarding:e2e
```

**Scenarios:**
1. **Weight Loss User** - Sarah, 32, wants to lose 10kg
2. **Muscle Gain User** - Mike, 25, wants to gain 8kg muscle
3. **Senior Wellness** - Dorothy, 68, with health conditions
4. **Validation Errors** - Tests error handling with invalid data

## 🎮 Running Tests

### All Tests

```bash
# Run all onboarding tests
npm run test:onboarding

# Run with coverage report
npm run test:onboarding -- --coverage

# Run in watch mode
npm run test:onboarding -- --watch
```

### Specific Test Types

```bash
# Unit tests only
npm run test:onboarding:unit

# Integration tests only
npm run test:onboarding:integration

# E2E tests only
npm run test:onboarding:e2e
```

### Automated Test Runner

```bash
# Quick mode (unit tests, ~30 seconds)
npm run test:onboarding:quick

# Full mode (all tests, ~2 minutes)
npm run test:onboarding:all

# Device mode (with emulator, ~5 minutes)
npm run test:onboarding:device
```

### Custom Options

```bash
# Run on specific device
node scripts/run-onboarding-tests.js --device emulator-5554

# Verbose output
node scripts/run-onboarding-tests.js --verbose

# With coverage
node scripts/run-onboarding-tests.js --coverage --full
```

## 📱 Device Testing

### Prerequisites

1. **ADB Installed**
   ```bash
   adb version
   ```

2. **Device Connected or Emulator Running**
   ```bash
   adb devices
   ```

### Start Emulator

```bash
# List available emulators
npm run android:list

# Start default emulator
npm run android:start

# Or manually
"C:\Users\Harsh\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Pixel_9_Pro_XL
```

### Run Tests on Device

```bash
# Auto-start emulator and run tests
npm run test:onboarding:device

# Or manually with script
node scripts/run-onboarding-tests.js --emulator --full --verbose
```

### Expected Output

```
═══════════════════════════════════════════════════════════════════════════════
  🚀 FITAI ONBOARDING TEST AUTOMATION
═══════════════════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════════════
  🔌 Checking ADB Connection
═══════════════════════════════════════════════════════════════════════════════
✅ Found 1 device(s):
  • emulator-5554

═══════════════════════════════════════════════════════════════════════════════
  🧪 Running UNIT Tests
═══════════════════════════════════════════════════════════════════════════════
ℹ️  Running: npm test -- src/__tests__/onboarding/OnboardingContainer.test.tsx
✅ UNIT tests passed!

═══════════════════════════════════════════════════════════════════════════════
  🧪 Running INTEGRATION Tests
═══════════════════════════════════════════════════════════════════════════════
✅ INTEGRATION tests passed!

═══════════════════════════════════════════════════════════════════════════════
  🧪 Running E2E Tests
═══════════════════════════════════════════════════════════════════════════════
✅ E2E tests passed!

═══════════════════════════════════════════════════════════════════════════════
  📊 Onboarding System Metrics
═══════════════════════════════════════════════════════════════════════════════

🎯 Coverage Overview:
  • Tab 1 (Personal Info):      21 fields
  • Tab 2 (Diet Preferences):   27 fields
  • Tab 3 (Body Analysis):      20+ fields
  • Tab 4 (Workout Prefs):      22 fields
  • Tab 5 (Advanced Review):    50+ calculated fields
  ────────────────────────────────────────────────────────
  • Total Data Points:          170+ fields
  • Validation Rules:           100+ rules
  • Health Calculations:        50+ formulas

⏱️  Total Duration: 45.23s

🎉 All tests passed successfully!
```

## 📝 Test Scenarios

### Scenario 1: Weight Loss User

**Profile:** Sarah Johnson, 32, Female
- **Goal:** Lose 10kg (75kg → 65kg)
- **Timeline:** 20 weeks
- **Activity:** Light (desk job)
- **Diet:** Non-vegetarian, intermittent fasting ready

**Expected Results:**
- BMI: 27.5 → 23.9 (healthy range)
- Daily Calories: ~1,650 cal (deficit of 350 cal/day)
- Weekly Loss: 0.5 kg/week (safe rate)
- Macros: 124g protein, 165g carbs, 55g fat
- Workouts: 3x/week, 45min sessions
- Health Score: 72/100

### Scenario 2: Muscle Gain User

**Profile:** Mike Chen, 25, Male
- **Goal:** Gain 8kg muscle (70kg → 78kg)
- **Timeline:** 24 weeks
- **Activity:** Active (gym 5x/week)
- **Diet:** High protein, non-veg

**Expected Results:**
- BMI: 22.1 → 24.6 (healthy range)
- Daily Calories: ~2,800 cal (surplus of 300 cal/day)
- Weekly Gain: 0.33 kg/week (safe rate)
- Macros: 210g protein, 280g carbs, 93g fat
- Workouts: 5x/week, 90min sessions
- Health Score: 85/100

### Scenario 3: Senior Wellness

**Profile:** Dorothy Williams, 68, Female
- **Goal:** Maintain health, improve flexibility
- **Conditions:** Arthritis, hypertension
- **Activity:** Light (limited mobility)

**Expected Results:**
- Focus on low-impact exercises
- Joint-friendly recommendations
- Modified intensity (beginner)
- Safety adjustments for medications
- Longer timeline for goals
- Health Score: 68/100 (good for age/conditions)

### Scenario 4: Validation Errors

Tests invalid data handling:
- Age < 13 or > 120
- Height < 100cm or > 250cm
- Weight < 30kg or > 300kg
- Timeline < 4 weeks or > 104 weeks
- Missing required fields
- Invalid formats (time, email, etc.)

## 📊 Metrics & Reports

### Test Report Generation

Tests automatically generate a JSON report:

**Location:** `test-results/onboarding-test-report.json`

**Contents:**
```json
{
  "timestamp": "2025-10-29T04:15:32.123Z",
  "summary": {
    "total": 39,
    "passed": 39,
    "failed": 0
  },
  "results": [...],
  "environment": {
    "platform": "win32",
    "nodeVersion": "v20.x.x",
    "androidHome": "C:\\Users\\Harsh\\AppData\\Local\\Android\\Sdk"
  }
}
```

### Coverage Report

Generate detailed coverage report:

```bash
npm run test:onboarding -- --coverage
```

**Output:** `coverage/lcov-report/index.html`

Open in browser to see:
- Line coverage
- Branch coverage
- Function coverage
- Uncovered lines

### Performance Metrics

All tests track performance:

| Operation | Target | Typical |
|-----------|--------|---------|
| Tab Load | < 500ms | ~200ms |
| Validation | < 100ms | ~50ms |
| Save Operation | < 1s | ~300ms |
| Complete Flow | < 5s | ~2s |

## 🔧 Troubleshooting

### Common Issues

#### 1. "No devices connected"

**Solution:**
```bash
# Check ADB
adb devices

# Start emulator
npm run android:start

# Wait for boot
adb wait-for-device
```

#### 2. "Module not found" errors

**Solution:**
```bash
# Reinstall dependencies
npm install --legacy-peer-deps

# Clear cache
npm cache clean --force
rm -rf node_modules
npm install --legacy-peer-deps
```

#### 3. "Tests timing out"

**Solution:**
```bash
# Increase timeout in jest.config.js
testTimeout: 60000 // 60 seconds

# Or run with custom timeout
npm run test:onboarding -- --testTimeout=60000
```

#### 4. "Emulator won't start"

**Solution:**
```bash
# Check emulator exists
"C:\Users\Harsh\AppData\Local\Android\Sdk\emulator\emulator.exe" -list-avds

# Cold boot
"C:\Users\Harsh\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Pixel_9_Pro_XL -no-snapshot-load
```

#### 5. "Tests pass locally but fail on device"

**Possible causes:**
- Device-specific API differences
- Timing issues (add waitFor)
- Missing permissions
- Storage limitations

### Debug Mode

Run tests with verbose logging:

```bash
# Verbose test output
npm run test:onboarding -- --verbose

# Debug specific test
node --inspect-brk node_modules/.bin/jest src/__tests__/onboarding/OnboardingContainer.test.tsx
```

### Manual Verification

If automated tests fail, manually verify:

1. Open app on device
2. Navigate to onboarding
3. Fill out each tab
4. Verify calculations in Tab 5
5. Complete onboarding
6. Check data persistence

## 🎯 Best Practices

### Writing New Tests

1. **Follow the pattern:**
   ```typescript
   describe('Feature', () => {
     it('should do something specific', () => {
       // Arrange
       const input = createTestData();

       // Act
       const result = functionUnderTest(input);

       // Assert
       expect(result).toBe(expected);
     });
   });
   ```

2. **Use descriptive names:**
   - ✅ `should prevent navigation with invalid personal info`
   - ❌ `test validation`

3. **Test one thing at a time:**
   - Each test should verify a single behavior
   - Use multiple tests for multiple scenarios

4. **Clean up:**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

5. **Mock external dependencies:**
   - Supabase calls
   - Navigation
   - Device APIs

### Running Tests in CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Onboarding Tests
  run: npm run test:onboarding:all

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🤝 Contributing

When adding new onboarding features:

1. ✅ Write tests first (TDD)
2. ✅ Ensure all existing tests pass
3. ✅ Add new test cases for new features
4. ✅ Update this documentation
5. ✅ Run full test suite before committing

---

**Last Updated:** October 29, 2025
**Test Suite Version:** 1.0.0
**Maintained by:** FitAI Development Team
