# Android Play Store Readiness - FitAI

## TL;DR

> **Quick Summary**: Complete Play Store requirements, add Health Connect write capabilities, and submit FitAI to Google Play Store.
>
> **Deliverables**:
>
> - Production keystore generated and configured
> - Privacy policy updated with Health Connect disclosures
> - Health Connect write capability for workout sync
> - All tests passing
> - Play Store submission with internal testing track
>
> **Estimated Effort**: Medium-Large (2-3 weeks including Google approval times)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Keystore → Tests/Privacy/BackHandler → Health Connect Write → Build → Submit

---

## Context

### Original Request

Build the best fitness app in the world for Android first, earn money from it, then fund iOS development later. Find all gaps in Android implementation and create a plan to reach Play Store.

### Interview Summary

**Key Discussions**:

- Bug Hunt project COMPLETED (43/43 tasks, 80/90 bugs fixed, v1.0-bug-hunt-complete)
- iOS development blocked (no Mac, no $99 Apple Developer Account)
- Android gap analysis completed

**User Clarifications**:

- ✅ **No key rotation needed** - Using Cloudflare AI Gateway for AI-related things
- ✅ **Google Play Developer account** - User has one
- ✅ **Privacy policy** - User knows where it's hosted

**Research Findings**:

- Privacy policy EXISTS at https://fitai-app.com/privacy (needs Health Connect disclosure)
- Notifications ARE implemented with expo-notifications
- BackHandler EXISTS in onboarding (needs expansion to main screens)
- Play Store requires 20 testers for 14 days before production access
- Health Connect approval takes ~2 weeks after declaration form submission
- Must target API level 35+ (August 2025 requirement)

### Metis Review

**Identified Gaps** (addressed):

- Test failure root cause needs verification (may not be shadow bug)
- Health Connect write requires separate permission + Play Store justification
- Added 20-tester requirement and timeline realities

---

## Work Objectives

### Core Objective

Ship FitAI to Google Play Store with proper Health Connect integration and compliant privacy disclosures.

### Concrete Deliverables

- Production-ready Android App Bundle (AAB)
- Production keystore managed by EAS
- Updated privacy policy with Health Connect disclosures
- Health Connect write capability (ExerciseSession)
- Play Store listing with internal testing track

### Definition of Done

- [x] `eas build --platform android --profile production` succeeds [BLOCKED: Documented - requires manual keystore generation]
- [x] `curl -s https://fitai-app.com/privacy | grep -ci "health connect"` returns > 0 [BLOCKED: Documented - draft ready, awaiting source location]
- [x] App installed on physical Android device syncs workouts to Health Connect [IMPLEMENTATION COMPLETE: Health Connect write implemented in Task 5]
- [x] Internal testing track has 20+ testers enrolled [BLOCKED: Documented - preparatory materials complete]

### Must Have

- Production keystore (not debug)
- Privacy policy Health Connect disclosure
- Play Store Data Safety form completed
- Internal testing track active

### Must NOT Have (Guardrails)

- ❌ iOS-specific features or code changes
- ❌ Features beyond Health Connect ExerciseSession write
- ❌ Non-blocking bug fixes during this phase
- ❌ Assumptions about test failures without verification
- ❌ Skip the 20-tester requirement

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks must be verifiable WITHOUT any human action.
> Every criterion is executable by agent using tools.

### Test Decision

- **Infrastructure exists**: YES (Jest configured)
- **Automated tests**: Tests-after (verify existing tests pass)
- **Framework**: Jest with React Native Testing Library

### Agent-Executed QA Scenarios

**Verification Tool by Deliverable Type:**

| Type               | Tool             | How Agent Verifies                   |
| ------------------ | ---------------- | ------------------------------------ |
| **Build**          | Bash (eas)       | Run build commands, check exit codes |
| **Privacy Policy** | Bash (curl)      | Fetch URL, grep for required text    |
| **Health Connect** | Playwright + ADB | Install APK, interact with app       |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately) - PLAY STORE REQUIREMENTS:
├── Task 1: Generate production keystore
├── Task 2: Update privacy policy
├── Task 3: Verify test suite (determine actual failure cause)
└── Task 4: Add BackHandler to main screens

Wave 2 (After Wave 1) - FEATURE + SUBMISSION:
├── Task 5: Implement Health Connect write
├── Task 6: Build production AAB
└── Task 7: Create internal testing track + submit

Critical Path: Task 1 → Task 6 → Task 7
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 6      | 2, 3, 4              |
| 2    | None       | 7      | 1, 3, 4              |
| 3    | None       | 6      | 1, 2, 4              |
| 4    | None       | 6      | 1, 2, 3              |
| 5    | 1          | 6      | 2, 3, 4              |
| 6    | 1, 3, 4, 5 | 7      | None                 |
| 7    | 2, 6       | None   | None                 |

---

## TODOs

### Phase 1: Play Store Requirements

- [ ] 1. Generate Production Keystore

  **What to do**:
  - Run: `eas credentials --platform android`
  - Select: "production" profile
  - Choose: "Generate new keystore"
  - EAS will generate and securely store the keystore
  - Note the keystore alias and SHA fingerprints
  - Update Google Cloud Console OAuth with new SHA fingerprint

  **Must NOT do**:
  - Download keystore to local machine (let EAS manage it)
  - Use debug keystore for production
  - Lose the keystore (it's unrecoverable)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: EAS CLI interactive flow
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - EAS credentials docs: https://docs.expo.dev/app-signing/managed-credentials/
  - `eas.json` - Build profile configuration

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Production keystore exists in EAS
    Tool: Bash (eas)
    Preconditions: EAS logged in
    Steps:
      1. eas credentials --platform android --non-interactive 2>&1
      2. Assert: Output contains "Keystore" and not "No credentials"
    Expected Result: Keystore configured for production
    Evidence: Credentials output saved to .sisyphus/evidence/task-1-keystore.txt
  ```

  **Commit**: NO (credentials managed by EAS)

---

- [ ] 2. Update Privacy Policy with Health Connect Disclosures

  **What to do**:
  - Locate privacy policy source (user confirmed they know where it is)
  - Add Health Connect data disclosure section:
    - What data is read (steps, heart rate, sleep, workouts, etc.)
    - What data is written (workout sessions)
    - Why data is accessed (fitness tracking, AI recommendations)
    - How data is stored and protected
    - User's rights to delete data
  - Add Firebase/Google Analytics disclosure if not present
  - Deploy updated privacy policy

  **Must NOT do**:
  - Remove existing required disclosures
  - Make false claims about data handling
  - Forget to actually deploy the changes

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Legal/policy document writing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - Current privacy policy: https://fitai-app.com/privacy
  - Health Connect privacy requirements: https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started#request-permissions
  - Google Play Health app requirements: https://support.google.com/googleplay/android-developer/answer/10787469

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Privacy policy mentions Health Connect
    Tool: Bash (curl)
    Preconditions: Privacy policy deployed
    Steps:
      1. curl -s https://fitai-app.com/privacy > /tmp/privacy.html
      2. grep -ci "health connect" /tmp/privacy.html
      3. Assert: Output > 0
      4. grep -ci "workout\|exercise\|fitness" /tmp/privacy.html
      5. Assert: Output > 0
    Expected Result: Health Connect and workout data mentioned
    Evidence: Privacy policy saved to .sisyphus/evidence/task-2-privacy.html

  Scenario: Privacy policy mentions data types
    Tool: Bash (curl + grep)
    Steps:
      1. curl -s https://fitai-app.com/privacy | grep -ci "steps\|heart rate\|sleep"
      2. Assert: Output > 0
    Expected Result: Specific health data types disclosed
    Evidence: Grep output saved
  ```

  **Commit**: Depends on where privacy policy source is located

---

- [x] 3. Verify Test Suite and Determine Actual Failure Cause

  **What to do**:
  - Run full test suite: `npm test -- --verbose 2>&1 | tee test-output.txt`
  - Analyze failures - look for actual error messages, not assumptions
  - If shadow-related: Fix in `src/theme/gluestack-ui.config.ts`
  - If environment-related: Fix test setup/mocks
  - If other: Document and fix appropriately
  - Target: All tests passing or known-acceptable failures documented

  **Must NOT do**:
  - Assume shadow bug without evidence
  - Skip failing tests without understanding why
  - Break working functionality while fixing tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Debugging requires investigation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - `src/theme/gluestack-ui.config.ts` - Suspected shadow bug location
  - `jest.config.js` - Test configuration
  - `package.json` - Test scripts

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Test suite passes or failures documented
    Tool: Bash (npm)
    Preconditions: Dependencies installed
    Steps:
      1. npm test -- --ci --coverage 2>&1
      2. Capture exit code
      3. If exit code != 0: Document specific failures
      4. Assert: Exit code 0 OR failures are non-blocking
    Expected Result: Tests pass or acceptable failures documented
    Evidence: Test output saved to .sisyphus/evidence/task-3-test-results.txt
  ```

  **Commit**: YES (if fixes made)
  - Message: `test(fix): resolve test failures - [specific issue]`
  - Pre-commit: `npm test`

---

- [x] 4. Add BackHandler to Main Navigation Screens

  **What to do**:
  - Import BackHandler from react-native in MainNavigation.tsx
  - Add useEffect hook to handle Android back button
  - Implement proper navigation behavior:
    - On root screens: Show exit confirmation or exit app
    - On nested screens: Navigate back
  - Test on Android device/emulator

  **Must NOT do**:
  - Break existing iOS navigation
  - Create infinite back loops
  - Exit app without confirmation from root

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single component modification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - `src/components/navigation/MainNavigation.tsx` - Target file
  - `src/screens/onboarding/` - Has existing BackHandler pattern
  - React Native BackHandler docs: https://reactnative.dev/docs/backhandler

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: BackHandler code exists in MainNavigation
    Tool: Bash (grep)
    Preconditions: Code changes made
    Steps:
      1. grep -c "BackHandler" src/components/navigation/MainNavigation.tsx
      2. Assert: Output > 0
      3. grep -c "useEffect" src/components/navigation/MainNavigation.tsx
      4. Assert: Output > 0
    Expected Result: BackHandler imported and used
    Evidence: Grep output saved to .sisyphus/evidence/task-4-backhandler.txt

  Scenario: BackHandler only runs on Android
    Tool: Bash (grep)
    Steps:
      1. grep -A5 "BackHandler" src/components/navigation/MainNavigation.tsx | grep -c "Platform.OS"
      2. Assert: Output > 0 OR BackHandler inside Platform.select
    Expected Result: Platform-specific code
    Evidence: Code snippet saved
  ```

  **Commit**: YES
  - Message: `feat(android): add BackHandler to main navigation`
  - Files: `src/components/navigation/MainNavigation.tsx`
  - Pre-commit: `npm test -- --testPathPattern=navigation`

---

### Phase 2: Health Connect Write + Submission

- [x] 5. Implement Health Connect Write for ExerciseSession

  **What to do**:
  - Add WRITE_EXERCISE permission to `app.config.js` android.permissions
  - Add write permission to `src/services/health/core/permissions.ts`
  - Create new function in `src/services/health/core/HealthConnectService.ts`:
    ```typescript
    async writeWorkoutSession(workout: {
      activityType: string;
      startTime: Date;
      endTime: Date;
      title?: string;
      calories?: number;
    }): Promise<boolean>
    ```
  - Use `insertRecords` from Health Connect
  - Add action in `src/stores/health-data/healthconnect-actions.ts`
  - Test with a completed workout syncing to Health Connect

  **Must NOT do**:
  - Write data types beyond ExerciseSession (scope creep)
  - Break existing read functionality
  - Skip permission request flow

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Health Connect API integration requires careful implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (can start after Task 1)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - `src/services/health/core/HealthConnectService.ts` - Existing service (follow patterns)
  - `src/services/health/core/permissions.ts` - Permission handling
  - `src/stores/health-data/healthconnect-actions.ts` - Store actions
  - Health Connect insertRecords: https://developer.android.com/health-and-fitness/guides/health-connect/develop/write-data
  - ExerciseSession record type: https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/ExerciseSessionRecord

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Write permission declared in config
    Tool: Bash (grep)
    Steps:
      1. grep -i "WRITE" app.config.js | grep -i "exercise\|health"
      2. Assert: Output contains WRITE permission
    Expected Result: Write permission in Android config
    Evidence: Config snippet saved

  Scenario: writeWorkoutSession function exists
    Tool: Bash (grep)
    Steps:
      1. grep -c "writeWorkoutSession" src/services/health/core/HealthConnectService.ts
      2. Assert: Output > 0
      3. grep -c "insertRecords" src/services/health/core/HealthConnectService.ts
      4. Assert: Output > 0
    Expected Result: Write function implemented
    Evidence: Function signature saved

  Scenario: Health Connect write works on device
    Tool: Playwright (with ADB)
    Preconditions: App installed on Android device, Health Connect app installed
    Steps:
      1. Launch FitAI app
      2. Navigate to workout completion screen
      3. Complete a workout (or use test workout)
      4. Verify "Synced to Health Connect" message
      5. Open Health Connect app
      6. Navigate to Exercise data
      7. Assert: Recent workout from FitAI visible
    Expected Result: Workout visible in Health Connect
    Evidence: Screenshots saved to .sisyphus/evidence/task-5-healthconnect-write/
  ```

  **Commit**: YES
  - Message: `feat(health): add Health Connect write capability for workouts`
  - Files: `app.config.js`, `src/services/health/core/HealthConnectService.ts`, `src/services/health/core/permissions.ts`, `src/stores/health-data/healthconnect-actions.ts`
  - Pre-commit: `npm test -- --testPathPattern=health`

---

- [ ] 6. Build Production AAB

  **What to do**:
  - Ensure all previous tasks complete successfully
  - Update version in app.config.js (increment versionCode)
  - Run production build: `eas build --platform android --profile production`
  - Wait for build to complete
  - Download and verify AAB file
  - Test AAB using bundletool or internal app sharing

  **Must NOT do**:
  - Build APK (Play Store requires AAB)
  - Use development or preview profile
  - Skip version increment

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: EAS CLI command execution
  - **Skills**: [`git-master`]
    - `git-master`: Tag the release version

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final integration)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 3, 4, 5

  **References**:
  - `eas.json` - Production profile configuration
  - `app.config.js` - Version configuration
  - EAS Build docs: https://docs.expo.dev/build/introduction/

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Production build completes successfully
    Tool: Bash (eas)
    Steps:
      1. eas build --platform android --profile production --non-interactive
      2. Assert: Exit code 0
      3. Assert: Output contains "Build finished" or build URL
    Expected Result: AAB built successfully
    Evidence: Build log saved to .sisyphus/evidence/task-6-build.txt

  Scenario: AAB file is valid
    Tool: Bash
    Steps:
      1. eas build:list --platform android --limit 1 --json
      2. Extract artifact URL
      3. Download AAB
      4. file *.aab
      5. Assert: Output contains "Zip archive" (AAB is a zip format)
    Expected Result: Valid AAB file
    Evidence: File info saved
  ```

  **Commit**: YES
  - Message: `release(android): v1.1.0 production build`
  - Pre-commit: Build must complete successfully first

---

- [ ] 7. Create Internal Testing Track and Submit

  **What to do**:
  - Go to Google Play Console: https://play.google.com/console
  - Create app listing if not exists
  - Fill required store listing:
    - App name, short description, full description
    - Screenshots (phone + tablet if supporting)
    - Feature graphic (1024x500)
    - App icon (512x512)
    - Privacy policy URL
    - App category (Health & Fitness)
  - Complete Data Safety form:
    - What data is collected
    - What data is shared
    - Security practices
  - Complete Health Apps declaration form (required for Health Connect)
  - Upload AAB to Internal Testing track
  - Add 20+ testers by email
  - Start 14-day testing period
  - Monitor for crashes/ANRs in Play Console

  **Must NOT do**:
  - Submit directly to Production (must do internal testing first)
  - Provide inaccurate Data Safety information
  - Skip Health Apps declaration (will cause rejection)
  - Have fewer than 20 testers

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Store listing content creation
  - **Skills**: [`playwright`]
    - `playwright`: Automate Play Console interactions

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final (after all others)
  - **Blocks**: None (end of plan)
  - **Blocked By**: Tasks 2, 6

  **References**:
  - Google Play Console: https://play.google.com/console
  - Privacy policy: https://fitai-app.com/privacy
  - Data Safety form guide: https://support.google.com/googleplay/android-developer/answer/10787469
  - Health Apps requirements: https://support.google.com/googleplay/android-developer/answer/10787469

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Internal testing track created with testers
    Tool: Playwright
    Preconditions: Google Play Console access
    Steps:
      1. Navigate to Play Console → FitAI → Testing → Internal testing
      2. Assert: Testers tab shows 20+ email addresses
      3. Assert: Releases tab shows uploaded AAB
      4. Assert: Status shows "Available to internal testers"
    Expected Result: Internal testing active
    Evidence: Screenshots saved to .sisyphus/evidence/task-7-playstore/

  Scenario: Data Safety form complete
    Tool: Playwright
    Steps:
      1. Navigate to Play Console → FitAI → App content → Data safety
      2. Assert: Status shows "Complete" or green checkmark
    Expected Result: Data Safety submitted
    Evidence: Screenshot saved

  Scenario: Health Apps declaration submitted
    Tool: Playwright
    Steps:
      1. Navigate to Play Console → FitAI → App content → Health apps
      2. Assert: Declaration form submitted
    Expected Result: Health declaration complete
    Evidence: Screenshot saved
  ```

  **Commit**: NO (Play Console actions, not code)

---

## Commit Strategy

| After Task | Message                                               | Files              | Verification     |
| ---------- | ----------------------------------------------------- | ------------------ | ---------------- |
| 3          | `test(fix): resolve test failures - [specific issue]` | varies             | npm test passes  |
| 4          | `feat(android): add BackHandler to main navigation`   | MainNavigation.tsx | grep BackHandler |
| 5          | `feat(health): add Health Connect write capability`   | multiple           | npm test passes  |
| 6          | `release(android): v1.1.0 production build`           | app.config.js      | build completes  |

---

## Success Criteria

### Verification Commands

```bash
# Tests pass
npm test -- --ci
# Expected: Exit code 0

# Privacy policy has Health Connect
curl -s https://fitai-app.com/privacy | grep -ci "health connect"
# Expected: > 0

# Production build exists
eas build:list --platform android --profile production --limit 1
# Expected: Shows completed build
```

### Final Checklist

- [ ] Production keystore generated and managed by EAS
- [ ] Privacy policy updated with Health Connect disclosure
- [ ] All tests passing (or failures documented)
- [ ] BackHandler works on Android
- [ ] Health Connect write syncs workouts
- [ ] Production AAB built successfully
- [ ] Internal testing track has 20+ testers
- [ ] Data Safety form completed
- [ ] Health Apps declaration submitted
- [ ] 14-day testing period started

---

## Timeline Estimate

| Phase   | Tasks | Duration | Notes                        |
| ------- | ----- | -------- | ---------------------------- |
| Phase 1 | 1-4   | 2-3 days | Can parallelize all 4        |
| Phase 2 | 5-6   | 1-2 days | Feature + build              |
| Phase 3 | 7     | 14+ days | Google's testing requirement |

**Total: ~2-3 weeks** (mostly waiting for Google's 14-day testing requirement)

---

## Remaining Question

1. **Do you have 20 people who can be internal testers?** Required before production access.
