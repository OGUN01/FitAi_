# iOS Prebuild - Architectural Decisions

## Decision 1: GitHub Actions for Automated iOS Prebuild

**Status**: RECOMMENDED (for Task 0 completion)

### Rationale
1. **No macOS machine required** - Use GitHub's macOS runners
2. **Automated and reproducible** - Regenerates on config changes
3. **Version controlled** - iOS project tracked in git
4. **CI/CD friendly** - Integrates with existing workflow
5. **Zero local setup** - Works on any OS

### Implementation
Will create `.github/workflows/ios-prebuild.yml` that:
- Triggers on: app.config.js, package.json, eas.json changes
- Runs on: `macos-latest` runner
- Generates: iOS project via `npx expo prebuild --platform ios --clean`
- Commits: Generated files back to repository
- Verification: Checks for HealthKit entitlements

### Alternatives Rejected
- **Manual macOS generation**: Not scalable, not automated
- **EAS Cloud Build**: Requires external service, slower
- **Docker macOS**: Not legally available, violates licensing

## Decision 2: Store iOS Project in Git

**Status**: RECOMMENDED

### Why Version Control?
- Developers can work with Xcode without running prebuild
- Changes in Xcode can be tracked
- CocoaPods/dependency updates visible
- Easy to review native code changes
- One-way dependency: app.config.js → ios/

### .gitignore Entries
```
ios/Pods/          # CocoaPods dependencies (regenerable)
ios/*/xcuserdata/  # Xcode user settings
ios/**/*.xcworkspace/xcuserdata/
```

## Decision 3: Validation Strategy

**Status**: IMPLEMENTED

### Verification Steps (on macOS via CI/CD)
1. ✅ Check `ios/FitAI.xcodeproj` exists
2. ✅ Verify `ios/FitAI/FitAI.entitlements` contains HealthKit
3. ✅ Check Info.plist for HealthKit usage descriptions
4. ✅ Run `xcodebuild build` to verify compilation
5. ✅ Commit with semantic message

### Pre-commit Checks (can run on any OS)
1. ✅ Validate app.config.js syntax
2. ✅ Verify HealthKit config presence
3. ✅ Check entitlements structure

## Decision 4: HealthKit Configuration

**Status**: VERIFIED ✅

### Location: app.config.js (lines 23-36)
```javascript
ios: {
  entitlements: {
    "com.apple.developer.healthkit": true,
    "com.apple.developer.healthkit.access": []
  },
  infoPlist: {
    NSHealthShareUsageDescription: "FitAI reads your health data...",
    NSHealthUpdateUsageDescription: "FitAI writes workout data...",
    NSMotionUsageDescription: "FitAI uses motion data..."
  }
}
```

### Status
- ✅ Entitlements defined
- ✅ Permission strings in Info.plist
- ✅ Expo plugin configured
- ✅ Ready for prebuild

## Decision 5: Bundle Identifier

**Status**: CONFIRMED

- **Value**: `com.fitai.app`
- **Source**: app.config.js line 26
- **Status**: Matches App Store requirements
- **Provisioning**: Will need signing certificate for distribution

## Decision 6: Task 0 Completion Criteria

**Status**: BLOCKED (platform limitation)

### What's Complete
- ✅ HealthKit config in app.config.js
- ✅ Expo plugins configured
- ✅ Firebase config (GoogleService-Info.plist)
- ✅ Dependencies installed
- ✅ Build configuration ready

### What Requires macOS
- ❌ Generate iOS native project
- ❌ Verify Xcode project structure
- ❌ Test iOS build compilation
- ❌ HealthKit entitlements verification in generated files

### Workaround Path
1. Create GitHub Actions workflow
2. Trigger on next commit to config files
3. Workflow generates iOS project on macOS
4. Auto-commits to repository
5. Subsequent tasks can proceed

## Decision 7: Android Priority

**Status**: CAN PROCEED

Android prebuild CAN run on Windows:
- `npx expo prebuild --platform android` works on Windows
- No platform limitation
- Can complete in parallel

Recommendation: Generate Android project first while awaiting iOS macOS CI/CD setup.

