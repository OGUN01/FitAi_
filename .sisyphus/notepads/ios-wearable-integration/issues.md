# iOS Prebuild - Task 0 Issues & Blockers

## CRITICAL BLOCKER: Platform Limitation

### Issue ID: TASK_0_PLATFORM_BLOCKER_001
- **Severity**: CRITICAL (blocks all subsequent iOS tasks)
- **Status**: UNFIXED (by design - iOS limitation)
- **Root Cause**: Windows OS cannot generate Xcode projects

### Details
- Task: Generate iOS native project with `npx expo prebuild --platform ios`
- Expected: iOS project generated in `ios/` directory
- Actual: Command exits with warning, skips iOS generation
- Reason: Expo prebuild is platform-aware and skips iOS generation on non-macOS

### Error Messages
```
⚠️  Skipping generating the iOS native project files. 
Run npx expo prebuild again from macOS or Linux to generate the iOS project.

CommandError: At least one platform must be enabled when syncing
```

### Impact
- ❌ Cannot execute full prebuild pipeline on Windows
- ❌ Cannot generate `ios/FitAI.xcodeproj`
- ❌ Cannot verify HealthKit entitlements in generated files
- ❌ Cannot test iOS build compilation on Windows
- ❌ BLOCKS ALL 15 SUBSEQUENT TASKS (Wave 0 prerequisite)

## Workaround Solutions

### Solution 1: Use GitHub Actions (RECOMMENDED FOR CI/CD)
Create `.github/workflows/ios-prebuild.yml`:
```yaml
name: Generate iOS Project
on:
  push:
    branches: [master]
    paths: [app.config.js, package.json, eas.json]
jobs:
  prebuild:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx expo prebuild --platform ios --clean
      - run: git add ios/
      - uses: EndBug/add-and-commit@v9
        with:
          message: "chore(ios): generate native iOS project"
```

### Solution 2: Use EAS Cloud Build
```bash
eas build --platform ios --local=false
# Downloads generated project after build completes
```

### Solution 3: Manual macOS Generation
1. Commit current configuration to git
2. On macOS machine: `npx expo prebuild --platform ios --clean`
3. Commit generated `ios/` directory

## Dependencies

This task BLOCKS all of:
- Task 1: HealthKit integration setup
- Task 2-15: All iOS-specific features
- Tests for iOS platform
- Building for iOS App Store

## Verification Status

### What CAN be verified on Windows:
- ✅ app.config.js syntax and iOS config validity
- ✅ HealthKit permissions are configured
- ✅ Firebase config (GoogleService-Info.plist) exists
- ✅ Expo and dependencies are installed

### What CANNOT be verified on Windows:
- ❌ iOS native project compilation
- ❌ Generated Xcode project structure
- ❌ HealthKit entitlements in generated files
- ❌ iOS simulator testing

## Recommended Action

**DO NOT** attempt to work around this by:
- ❌ Manually creating XCODEproj files (won't compile)
- ❌ Copying prebuild output from other machines (may be stale)
- ❌ Using older generated projects (incompatible with current config)

**INSTEAD:**
1. Set up macOS CI/CD runner (GitHub Actions)
2. Automate prebuild generation on config changes
3. Commit generated files only from authorized environment

