# iOS Wearable Integration Plan - FitAI

## TL;DR

> **Quick Summary**: Implement complete iOS wearable support with Apple Watch companion app, production-grade HealthKit integration with background sync, and cross-platform data parity with Android Health Connect.
>
> **Deliverables**:
>
> - Production-ready HealthKit service with background delivery & anchored queries
> - Native watchOS companion app (SwiftUI) with workout sessions, activity tracking, hydration, complications
> - WatchConnectivity bridge for phone-watch communication
> - React Native native modules bridging Swift to JS
> - TDD test suite with protocol-based mocks
> - Settings UI for sync preferences (periodic vs real-time)
>
> **Estimated Effort**: XL (3+ weeks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 7 → Task 11 → Task 15

---

## Context

### Original Request

Complete iOS implementation for 100% Apple Watch compatibility, plus support for iOS-compatible wearables. Focus on production-grade implementation with proper error handling and user experience.

### Interview Summary

**Key Discussions**:

- **Watch App**: Build full watchOS extension (ships inside main app bundle, not separate app)
- **Watch Features**: Workout sessions, Activity summary, Today's workout plan, Hydration tracking, Complications
- **Third-Party Wearables**: Apple ecosystem only (no Fitbit/Garmin/Whoop/Oura) - can extend later
- **Development Approach**: Phased - Phase 1: HealthKit foundation, Phase 2: Watch app
- **Background Sync**: Periodic default (battery-friendly) + real-time option for power users
- **Testing**: TDD with protocol mocks for HealthKit/WCSession abstractions
- **Data Parity**: iOS must match Android Health Connect 1:1

**Research Findings**:

- Oracle recommends **phone-as-hub architecture** (Watch → HealthKit → iPhone → Supabase)
- Use `HKObserverQuery` + `HKAnchoredObjectQuery` pattern for incremental background sync
- `WCSession` for watch-phone communication with fallback strategies
- `HKWorkoutSession` + `HKLiveWorkoutBuilder` for live workout tracking on watch
- Current HealthKit service exists but missing background delivery, anchored queries, deduplication

### Metis Review

**Identified Gaps** (addressed in plan):

- Missing watchOS target in Xcode project configuration
- No WatchConnectivity native module for React Native
- Background delivery entitlements not configured
- No anchor persistence for incremental sync
- Missing conflict resolution for Watch vs Phone data
- No user settings for sync preferences

---

## Work Objectives

### Core Objective

Enable FitAI users to track workouts directly from Apple Watch, sync health data bidirectionally with HealthKit, and maintain data consistency across iOS and Android platforms.

### Concrete Deliverables

1. `ios/FitAIWatch/` - Native watchOS app target (SwiftUI)
2. `ios/FitAI/HealthKit/` - Enhanced HealthKit Swift module with background sync
3. `ios/FitAI/WatchConnectivity/` - WCSession manager for phone-watch communication
4. `src/services/health-kit/` - Updated React Native service with new native bindings
5. `src/screens/settings/HealthSyncSettings.tsx` - User preferences for sync mode
6. `fitai-workers/src/handlers/healthSync.ts` - Backend health data endpoints
7. Test suites for all new modules

### Definition of Done

- [ ] `npx expo run:ios` builds successfully with watch target
- [ ] Watch app installs on paired Apple Watch from single App Store download
- [ ] Workouts started on watch appear in FitAI app within 30 seconds
- [ ] Background sync delivers new HealthKit data within configured interval
- [ ] All health metrics (steps, HR, calories, sleep, workouts) sync bidirectionally
- [ ] 80%+ test coverage on new HealthKit and WatchConnectivity modules

### Must Have

- HKWorkoutSession for live workout tracking on watch
- HKObserverQuery + HKAnchoredObjectQuery for background sync
- WCSession communication (sendMessage + applicationContext)
- Anchor persistence for incremental sync
- Protocol abstractions for testability
- User setting for periodic vs real-time sync
- All 6 workout categories: Outdoor Cardio, Indoor Cardio, Strength, Mind & Body, HIIT, Swimming

### Must NOT Have (Guardrails)

- ❌ Direct watch-to-cloud communication (phone is always the sync gateway)
- ❌ Third-party wearable integrations (Fitbit, Garmin, Whoop, Oura) - out of scope
- ❌ Custom workout UI on watch beyond Apple's HKWorkoutSession patterns
- ❌ Storing health data in AsyncStorage (must use HealthKit as source of truth)
- ❌ Polling-based sync (must use observer queries for efficiency)
- ❌ Hardcoded sync intervals (must be user-configurable)
- ❌ Breaking Android Health Connect compatibility

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> The executing agent verifies using tools (Playwright, Bash, interactive_bash).

### Test Decision

- **Infrastructure exists**: Partial (Jest for JS, need XCTest for Swift)
- **Automated tests**: TDD with protocol mocks
- **Framework**: Jest (React Native) + XCTest (Swift) + Detox (E2E)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type              | Tool                    | How Agent Verifies              |
| ----------------- | ----------------------- | ------------------------------- |
| **Swift Code**    | Bash (xcodebuild test)  | Run XCTest suite, assert pass   |
| **React Native**  | Bash (npm test)         | Run Jest tests, assert coverage |
| **iOS Build**     | Bash (npx expo run:ios) | Build succeeds, no errors       |
| **Watch Install** | Bash (xcrun simctl)     | Simulator shows watch app       |
| **E2E Flow**      | Detox/Maestro           | Automated UI verification       |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Prerequisite - MUST RUN FIRST):
└── Task 0: Generate iOS Native Project (Expo Prebuild)

Wave 1 (After Wave 0) - Foundation:
├── Task 1: HealthKit Protocol Abstractions (Swift) [depends: 0]
├── Task 2: Setup Xcode watchOS Target [depends: 0]
└── Task 5: Backend Health Sync Endpoints [no iOS dependency]

Wave 2 (After Wave 1) - Core Implementation:
├── Task 3: HKObserverQuery + Anchored Sync [depends: 1]
├── Task 4: HealthKit React Native Bridge [depends: 1]
├── Task 6: WatchConnectivity Manager (Swift) [depends: 2]
├── Task 7: Watch App - Workout Sessions [depends: 2]
└── Task 8: Watch App - Activity Summary [depends: 2]

Wave 3 (After Wave 2) - Features & Polish:
├── Task 9: Watch App - Today's Plan [depends: 6, 7]
├── Task 10: Watch App - Hydration [depends: 6]
├── Task 11: Watch App - Complications [depends: 7, 8]
├── Task 12: WatchConnectivity RN Bridge [depends: 6]
├── Task 13: Sync Settings UI [depends: 3, 4]
└── Task 14: Background Sync Toggle [depends: 3, 13]

Wave 4 (Final) - Integration:
└── Task 15: E2E Integration Tests [depends: all]

Critical Path: Task 0 → Task 1 → Task 3 → Task 7 → Task 11 → Task 15
Parallel Speedup: ~45% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks    | Can Parallelize With |
| ---- | ---------- | --------- | -------------------- |
| 0    | None       | 1, 2      | None (prerequisite)  |
| 1    | 0          | 3, 4      | 2, 5                 |
| 2    | 0          | 6, 7, 8   | 1, 5                 |
| 3    | 1          | 13, 14    | 4, 6, 7, 8           |
| 4    | 1          | 13        | 3, 6, 7, 8           |
| 5    | None       | 15        | 1, 2                 |
| 6    | 2          | 9, 10, 12 | 3, 4, 7, 8           |
| 7    | 2          | 9, 11     | 3, 4, 6, 8           |
| 8    | 2          | 11        | 3, 4, 6, 7           |
| 9    | 6, 7       | 15        | 10, 11, 12, 13, 14   |
| 10   | 6          | 15        | 9, 11, 12, 13, 14    |
| 11   | 7, 8       | 15        | 9, 10, 12, 13, 14    |
| 12   | 6          | 15        | 9, 10, 11, 13, 14    |
| 13   | 3, 4       | 14        | 9, 10, 11, 12        |
| 14   | 3, 13      | 15        | 9, 10, 11, 12        |
| 15   | All        | None      | None (final)         |

---

## TODOs

### PHASE 0: Prerequisites (MUST RUN FIRST)

---

- [ ] 0. Generate iOS Native Project with Expo Prebuild

  **What to do**:
  - Run `npx expo prebuild --platform ios` to generate the native iOS project
  - This creates the `ios/` directory with `FitAI.xcodeproj` and all native files
  - Verify the generated project includes HealthKit entitlements from `app.config.js`
  - Commit the generated iOS project to version control

  **Must NOT do**:
  - Do not manually create the Xcode project (use Expo prebuild)
  - Do not skip this step - ALL subsequent tasks depend on `ios/` existing

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution with verification
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Must complete BEFORE Wave 1
  - **Blocks**: ALL subsequent tasks (1-15)
  - **Blocked By**: None

  **References**:
  - `app.config.js:23-36` - iOS configuration including HealthKit entitlements
  - `app.config.js:107-134` - Expo plugins configuration
  - Expo docs: https://docs.expo.dev/workflow/prebuild/

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: iOS project generated successfully
    Tool: Bash
    Steps:
      1. npx expo prebuild --platform ios --clean
      2. Assert: Exit code 0
      3. ls -la ios/
      4. Assert: ios/FitAI.xcodeproj exists
      5. Assert: ios/FitAI/ directory exists
    Expected Result: Native iOS project created
    Evidence: Directory listing captured

  Scenario: HealthKit entitlements present
    Tool: Bash
    Steps:
      1. cat ios/FitAI/FitAI.entitlements
      2. Assert: "com.apple.developer.healthkit" key present
      3. cat ios/FitAI/Info.plist | grep -A1 "NSHealthShareUsageDescription"
      4. Assert: HealthKit usage description present
    Expected Result: HealthKit properly configured
    Evidence: Entitlements file content captured

  Scenario: Project builds after prebuild
    Tool: Bash
    Steps:
      1. cd ios && xcodebuild build -scheme FitAI -destination 'generic/platform=iOS Simulator' -quiet
      2. Assert: "Build Succeeded" or exit code 0
    Expected Result: Generated project compiles
    Evidence: Build output captured
  ```

  **Commit**: YES
  - Message: `chore(ios): generate native iOS project with expo prebuild`
  - Files: `ios/`

---

### PHASE 1: HealthKit Foundation

---

- [ ] 1. Create HealthKit Protocol Abstractions (Swift)

  **What to do**:
  - Create `HealthKitProtocol.swift` defining all HealthKit operations as protocols
  - Create `HealthKitService.swift` implementing protocols with real HKHealthStore
  - Create `MockHealthKitService.swift` for unit testing
  - Define protocols for: authorization, queries (statistics, samples, anchored), writing samples
  - Include error types enum for all HealthKit failure modes

  **Must NOT do**:
  - Do not use HKHealthStore directly in any consumer code (always through protocol)
  - Do not hardcode any health data types (use configurable arrays)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex protocol design requiring careful abstraction for testability
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commits for Swift module creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 5)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: Task 0 (Expo Prebuild)

  **References**:
  - `src/services/health-kit/health-kit-service.ts:20-60` - Current HealthKit service pattern (replicate in Swift)
  - `src/services/health-kit/types.ts` - TypeScript types to mirror in Swift
  - Apple docs: https://developer.apple.com/documentation/healthkit/hkhealthstore

  **Acceptance Criteria**:

  **TDD (Tests First):**
  - [ ] Test file created: `ios/FitAITests/HealthKitProtocolTests.swift`
  - [ ] Test covers: MockHealthKitService returns expected data for all query types
  - [ ] `xcodebuild test -scheme FitAI -destination 'platform=iOS Simulator,name=iPhone 15'` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Protocol compilation succeeds
    Tool: Bash (xcodebuild)
    Preconditions: Xcode project exists at ios/FitAI.xcodeproj
    Steps:
      1. cd ios && xcodebuild build -scheme FitAI -destination 'generic/platform=iOS'
      2. Assert: Build Succeeded in output
      3. Assert: No "protocol" related errors
    Expected Result: Clean build with no errors
    Evidence: Build log captured to .sisyphus/evidence/task-1-build.log

  Scenario: Mock service returns test data
    Tool: Bash (xcodebuild test)
    Preconditions: Test target configured
    Steps:
      1. xcodebuild test -scheme FitAI -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:FitAITests/HealthKitProtocolTests
      2. Assert: "Test Suite 'HealthKitProtocolTests' passed"
      3. Assert: Exit code 0
    Expected Result: All protocol tests pass
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(ios): add HealthKit protocol abstractions for testability`
  - Files: `ios/FitAI/HealthKit/*.swift`, `ios/FitAITests/HealthKitProtocolTests.swift`

---

- [ ] 2. Setup Xcode watchOS Target

  **What to do**:
  - Add watchOS app target to existing Xcode project
  - Configure `FitAIWatch` target with proper bundle identifier (`com.fitai.app.watchkitapp`)
  - Set up SwiftUI App lifecycle for watchOS
  - Configure entitlements: HealthKit, Background Modes (workout processing)
  - Add watch app to main app's embedded binaries
  - Create basic `FitAIWatchApp.swift` entry point

  **Must NOT do**:
  - Do not create separate Xcode project (must be target in existing project)
  - Do not use WatchKit storyboards (SwiftUI only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Xcode project configuration requires careful setup
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 5)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: Task 0 (Expo Prebuild)

  **References**:
  - `app.config.js:23-36` - iOS bundle identifier and HealthKit entitlements
  - Apple docs: https://developer.apple.com/documentation/watchos-apps/creating-independent-watchos-apps
  - Note: ios/FitAI.xcodeproj will exist after Task 0 (Expo Prebuild)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Watch target builds successfully
    Tool: Bash (xcodebuild)
    Preconditions: ios/FitAI.xcodeproj exists
    Steps:
      1. cd ios && xcodebuild build -scheme FitAIWatch -destination 'generic/platform=watchOS'
      2. Assert: "Build Succeeded" in output
      3. Assert: FitAIWatch.app created in build folder
    Expected Result: watchOS app builds without errors
    Evidence: Build log at .sisyphus/evidence/task-2-watch-build.log

  Scenario: Watch app appears in simulator
    Tool: Bash (xcrun simctl)
    Preconditions: watchOS Simulator available
    Steps:
      1. xcrun simctl list devices | grep -i watch
      2. Assert: At least one Apple Watch simulator listed
      3. xcodebuild build -scheme FitAIWatch -destination 'platform=watchOS Simulator,name=Apple Watch Series 9 (45mm)'
      4. Assert: Build succeeds
    Expected Result: Watch app can target simulator
    Evidence: Device list and build output captured

  Scenario: Entitlements correctly configured
    Tool: Bash (codesign)
    Preconditions: Watch app built
    Steps:
      1. Find FitAIWatch.app in DerivedData
      2. codesign -d --entitlements :- FitAIWatch.app
      3. Assert: "com.apple.developer.healthkit" present
      4. Assert: "com.apple.developer.healthkit.background-delivery" present
    Expected Result: HealthKit entitlements in watch app
    Evidence: Entitlements output captured
  ```

  **Commit**: YES
  - Message: `feat(ios): add watchOS target with SwiftUI lifecycle`
  - Files: `ios/FitAI.xcodeproj/`, `ios/FitAIWatch/`

---

- [ ] 3. Implement HKObserverQuery + Anchored Sync

  **What to do**:
  - Implement `HealthKitBackgroundSync.swift` with HKObserverQuery for all tracked types
  - Implement `HKAnchoredObjectQuery` for incremental data fetching
  - Store sync anchors in UserDefaults with keys per data type
  - Enable background delivery for: steps, heart rate, active energy, workouts, sleep
  - Implement proper `completionHandler()` calling in observer callbacks
  - Add deduplication logic using HKSource bundleIdentifier
  - Handle timezone edge cases for date queries

  **Must NOT do**:
  - Do not poll on timer (must use observer queries)
  - Do not fetch all historical data on every sync (use anchors)
  - Do not store health data locally (HealthKit is source of truth)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex async patterns with Apple's callback-based APIs
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7, 8)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `src/services/health-kit/sync-manager.ts` - Current sync pattern (replace with observer-based)
  - `src/services/health-kit/data-fetcher.ts` - Current fetch logic (enhance with anchors)
  - Research: HKObserverQuery + HKAnchoredObjectQuery pattern from librarian findings

  **Acceptance Criteria**:

  **TDD (Tests First):**
  - [ ] Test file: `ios/FitAITests/HealthKitBackgroundSyncTests.swift`
  - [ ] Test covers: Anchor persistence across app restarts
  - [ ] Test covers: Deduplication filters same-source samples
  - [ ] Test covers: Observer query calls completion handler

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Anchor persists across sessions
    Tool: Bash (xcodebuild test)
    Steps:
      1. Run test that saves anchor, terminates, restores anchor
      2. Assert: Restored anchor matches saved anchor
      3. Assert: Query uses restored anchor (not nil)
    Expected Result: Incremental sync resumes from last position
    Evidence: Test output captured

  Scenario: Background delivery enabled
    Tool: Bash (grep entitlements)
    Steps:
      1. Check FitAI.entitlements file
      2. Assert: com.apple.developer.healthkit.background-delivery = true
      3. Check code calls enableBackgroundDelivery for each type
    Expected Result: Background delivery configured
    Evidence: Entitlements file content captured

  Scenario: Deduplication filters duplicates
    Tool: Bash (xcodebuild test)
    Steps:
      1. Run test with mock returning duplicate samples (same UUID)
      2. Assert: Output contains only unique samples
      3. Assert: Count matches expected unique count
    Expected Result: No duplicate health records synced
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(ios): implement HKObserverQuery background sync with anchored queries`
  - Files: `ios/FitAI/HealthKit/HealthKitBackgroundSync.swift`

---

- [ ] 4. Create HealthKit React Native Bridge

  **What to do**:
  - Create native module `RNHealthKitModule.swift` exposing Swift HealthKit to JS
  - Implement methods: `initialize()`, `requestAuthorization()`, `fetchHealthData()`, `saveWorkout()`
  - Use `RCTPromiseResolveBlock`/`RCTPromiseRejectBlock` for async operations
  - Bridge all data types: steps, heartRate, activeEnergy, sleep, workouts, weight
  - Create corresponding TypeScript definitions in `src/services/health-kit/native.ts`
  - Update existing `health-kit-service.ts` to use native module

  **Must NOT do**:
  - Do not use deprecated `RCTBridgeModule` patterns
  - Do not expose HKHealthStore directly (use protocol-based service)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: React Native native module bridging requires careful type mapping
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 6, 7, 8)
  - **Blocks**: Task 13
  - **Blocked By**: Task 1

  **References**:
  - `src/services/health-kit/platform.ts` - Current platform detection (enhance)
  - `src/services/health-kit/health-kit-service.ts` - Service to update with native calls
  - React Native docs: https://reactnative.dev/docs/native-modules-ios

  **Acceptance Criteria**:

  **TDD (Tests First):**
  - [ ] Test file: `src/services/health-kit/__tests__/native.test.ts`
  - [ ] Test covers: Native module resolves/rejects promises correctly
  - [ ] `npm test -- --testPathPattern=health-kit` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Native module accessible from JS
    Tool: Bash (npm test)
    Steps:
      1. npm test -- --testPathPattern=native
      2. Assert: "NativeModules.RNHealthKit" is defined in test
      3. Assert: All exported methods exist
    Expected Result: Bridge exposes all required methods
    Evidence: Test output captured

  Scenario: TypeScript types match native interface
    Tool: Bash (tsc)
    Steps:
      1. npx tsc --noEmit src/services/health-kit/native.ts
      2. Assert: Exit code 0 (no type errors)
    Expected Result: Type definitions compile without errors
    Evidence: TypeScript output captured

  Scenario: iOS build includes native module
    Tool: Bash (xcodebuild)
    Steps:
      1. cd ios && xcodebuild build -scheme FitAI
      2. grep -r "RNHealthKitModule" ios/
      3. Assert: Module file found and compiled
    Expected Result: Native module in build
    Evidence: Build log captured
  ```

  **Commit**: YES
  - Message: `feat(ios): create HealthKit React Native bridge module`
  - Files: `ios/FitAI/RNHealthKitModule.swift`, `src/services/health-kit/native.ts`

---

- [ ] 5. Backend Health Sync Endpoints

  **What to do**:
  - Create `fitai-workers/src/handlers/healthSync.ts` with endpoints:
    - `POST /api/health/sync` - Receive health data from app
    - `GET /api/health/latest` - Get latest synced metrics
    - `POST /api/health/workout` - Save workout session
  - Use existing Supabase tables: `daily_health_logs`, `workout_sessions`
  - Implement idempotent upserts using `UNIQUE(user_id, log_date)` constraint with `data_source` column
    - Upsert key: `{ onConflict: 'user_id,log_date' }`
    - Include `data_source: 'apple_health' | 'google_fit' | 'manual'` in payload
  - Add rate limiting (100 req/min per user)
  - Validate incoming health data schema with Zod

  **Must NOT do**:
  - Do not create new database tables (use existing schema from `DATA_CATEGORY_SUPABASE_MAP.md`)
  - Do not store raw HealthKit UUIDs (privacy concern)
  - Do not use column names that don't exist (use `log_date` not `date`, use `data_source` not `source`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard CRUD endpoints following existing worker patterns
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 15
  - **Blocked By**: None

  **References**:
  - `fitai-workers/src/handlers/analytics.ts` - Reference handler pattern with Hono Context, Supabase client, error handling
  - `src/docs/DATA_CATEGORY_SUPABASE_MAP.md:34-71` - `daily_health_logs` table schema with `UNIQUE(user_id, log_date)` constraint
  - `src/docs/DATA_CATEGORY_SUPABASE_MAP.md:145-153` - `workout_sessions` table schema
  - `fitai-workers/src/utils/supabase.ts` - `getSupabaseClient()` usage pattern
  - `fitai-workers/src/utils/errors.ts` - `APIError` class for error handling

  **Acceptance Criteria**:

  **TDD (Tests First):**
  - [ ] Test file: `fitai-workers/src/handlers/healthSync.test.ts`
  - [ ] Test covers: Idempotent upsert doesn't duplicate records
  - [ ] Test covers: Invalid schema returns 400
  - [ ] `npm test -- healthSync` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Sync endpoint accepts valid data
    Tool: Bash (curl)
    Preconditions: Worker running locally on port 8787
    Steps:
      1. curl -X POST http://localhost:8787/api/health/sync \
           -H "Content-Type: application/json" \
           -H "Authorization: Bearer test-token" \
           -d '{"steps": 5000, "log_date": "2026-02-05", "data_source": "apple_health", "active_calories": 250}'
      2. Assert: HTTP status 200 or 201
      3. Assert: Response contains "success": true
    Expected Result: Health data synced successfully
    Evidence: Response body captured

  Scenario: Duplicate sync is idempotent (uses UNIQUE(user_id, log_date))
    Tool: Bash (curl)
    Steps:
      1. POST data with user_id=X, log_date=2026-02-05
      2. POST same data again with user_id=X, log_date=2026-02-05
      3. Query Supabase: SELECT COUNT(*) FROM daily_health_logs WHERE user_id=X AND log_date='2026-02-05'
      4. Assert: Count equals 1 (upsert, not duplicate insert)
    Expected Result: No duplicate records created
    Evidence: Response showing single record

  Scenario: Invalid schema rejected
    Tool: Bash (curl)
    Steps:
      1. POST with invalid data: {"steps": "not-a-number"}
      2. Assert: HTTP status 400
      3. Assert: Response contains validation error from Zod
    Expected Result: Bad request returned
    Evidence: Error response captured
  ```

  **Commit**: YES
  - Message: `feat(workers): add health sync endpoints with idempotent upserts`
  - Files: `fitai-workers/src/handlers/healthSync.ts`, `fitai-workers/src/handlers/healthSync.test.ts`

---

### PHASE 2: Apple Watch App

---

- [ ] 6. WatchConnectivity Manager (Swift)

  **What to do**:
  - Create `WatchConnectivityManager.swift` as singleton managing WCSession
  - Implement `WCSessionDelegate` with all required methods
  - Support communication patterns:
    - `sendMessage` for real-time (when reachable)
    - `updateApplicationContext` for latest state (fallback)
    - `transferUserInfo` for queued messages
  - Handle session activation states and reachability changes
  - Implement retry logic with exponential backoff for failed messages
  - Create shared data models for phone-watch communication

  **Must NOT do**:
  - Do not send large payloads via sendMessage (use transferFile for >64KB)
  - Do not assume watch is always reachable

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex bidirectional communication with multiple fallback strategies
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 7, 8)
  - **Blocks**: Tasks 9, 10, 12
  - **Blocked By**: Task 2

  **References**:
  - Research: WatchConnectivity patterns from librarian findings
  - `src/stores/health-data/healthkit-actions.ts` - Data flow patterns to mirror

  **Acceptance Criteria**:

  **TDD (Tests First):**
  - [ ] Test file: `ios/FitAITests/WatchConnectivityTests.swift`
  - [ ] Test covers: Fallback from sendMessage to applicationContext when not reachable
  - [ ] Test covers: Session activation state handling

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Manager initializes session
    Tool: Bash (xcodebuild test)
    Steps:
      1. Run WatchConnectivityTests
      2. Assert: WCSession.default.delegate is set
      3. Assert: activate() called on init
    Expected Result: Session properly initialized
    Evidence: Test output captured

  Scenario: Fallback works when not reachable
    Tool: Bash (xcodebuild test)
    Steps:
      1. Mock isReachable = false
      2. Call sendWorkoutStatus()
      3. Assert: updateApplicationContext called (not sendMessage)
    Expected Result: Graceful fallback to context update
    Evidence: Test output with mock verification
  ```

  **Commit**: YES
  - Message: `feat(ios): implement WatchConnectivity manager with fallback strategies`
  - Files: `ios/FitAI/WatchConnectivity/WatchConnectivityManager.swift`

---

- [ ] 7. Watch App - Workout Sessions

  **What to do**:
  - Create `WorkoutManager.swift` using HKWorkoutSession + HKLiveWorkoutBuilder
  - Implement workout types: running, walking, cycling, swimming, strength, yoga, HIIT
  - Display live metrics: heart rate, calories, duration, distance (where applicable)
  - Create SwiftUI views: `WorkoutView.swift`, `ActiveWorkoutView.swift`, `WorkoutSummaryView.swift`
  - Handle workout states: notStarted, running, paused, ended
  - Save completed workouts to HealthKit
  - Send workout updates to phone via WatchConnectivity

  **Must NOT do**:
  - Do not bypass HKWorkoutSession (required for background workout tracking)
  - Do not create custom heart rate reading (use HKLiveWorkoutBuilder data source)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: SwiftUI watch UI with live data display
  - **Skills**: [`frontend-ui-ux`, `git-master`]
    - `frontend-ui-ux`: Watch UI design patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 6, 8)
  - **Blocks**: Tasks 9, 11
  - **Blocked By**: Task 2

  **References**:
  - Research: HKWorkoutSession + HKLiveWorkoutBuilder patterns from librarian
  - `src/stores/fitnessStore.ts` - Workout data models to sync with

  **Acceptance Criteria**:

  **TDD (Tests First):**
  - [ ] Test file: `ios/FitAIWatchTests/WorkoutManagerTests.swift`
  - [ ] Test covers: Workout state transitions (start → pause → resume → end)
  - [ ] Test covers: Workout saves to HealthKit on completion

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Start workout on watch
    Tool: Bash (xcodebuild test)
    Steps:
      1. Call workoutManager.startWorkout(type: .running)
      2. Assert: workoutSession.state == .running
      3. Assert: workoutBuilder.beginCollection called
    Expected Result: Workout session active
    Evidence: Test output captured

  Scenario: Live metrics update
    Tool: Bash (xcodebuild test)
    Steps:
      1. Start workout with mock data source
      2. Simulate heart rate sample
      3. Assert: workoutBuilderDidCollectDataOf delegate called
      4. Assert: UI model updated with new HR
    Expected Result: Real-time metrics displayed
    Evidence: Test output with mock verification

  Scenario: Workout saves on completion
    Tool: Bash (xcodebuild test)
    Steps:
      1. Start and end workout
      2. Assert: workoutBuilder.finishWorkout called
      3. Assert: HKWorkout saved (verify via mock)
    Expected Result: Workout persisted to HealthKit
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(watch): implement workout sessions with live metrics`
  - Files: `ios/FitAIWatch/Workout/*.swift`

---

- [ ] 8. Watch App - Activity Summary

  **What to do**:
  - Create `ActivitySummaryView.swift` displaying today's activity rings style data
  - Show: steps, active calories, exercise minutes, stand hours
  - Fetch data from HealthKit on watch (local queries)
  - Auto-refresh when view appears and on significant time change
  - Design consistent with Apple's activity ring aesthetic

  **Must NOT do**:
  - Do not replicate Apple's exact Activity Rings (trademark)
  - Do not poll continuously (fetch on view appear only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Watch UI with data visualization
  - **Skills**: [`frontend-ui-ux`, `git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 6, 7)
  - **Blocks**: Task 11
  - **Blocked By**: Task 2

  **References**:
  - `src/components/charts/` - Existing chart patterns (adapt for watch)
  - Apple HIG: https://developer.apple.com/design/human-interface-guidelines/watchos

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Activity data loads on appear
    Tool: Bash (xcodebuild test)
    Steps:
      1. Create ActivitySummaryView with mock HealthKit
      2. Trigger onAppear
      3. Assert: fetchTodayActivity called
      4. Assert: View displays mock step count
    Expected Result: Activity metrics displayed
    Evidence: Test output captured

  Scenario: View handles no data gracefully
    Tool: Bash (xcodebuild test)
    Steps:
      1. Mock returns nil/empty for all metrics
      2. Render view
      3. Assert: No crash
      4. Assert: Shows placeholder or 0 values
    Expected Result: Graceful empty state
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(watch): add activity summary view with daily metrics`
  - Files: `ios/FitAIWatch/Activity/ActivitySummaryView.swift`

---

- [ ] 9. Watch App - Today's Workout Plan

  **What to do**:
  - Create `TodayPlanView.swift` showing scheduled workout from FitAI
  - Receive plan data from phone via WatchConnectivity applicationContext
  - Display: workout name, exercises, estimated duration
  - Add "Start Workout" button that launches workout session
  - Handle case when no plan exists for today

  **Must NOT do**:
  - Do not fetch plan from API directly (phone sends via WC)
  - Do not allow editing plan on watch (read-only display)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Watch UI displaying synced data
  - **Skills**: [`frontend-ui-ux`, `git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12, 13, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 6, 7

  **References**:
  - `src/stores/fitnessStore.ts` - Workout plan data structure
  - `src/screens/main/FitnessScreen.tsx` - How plans are displayed on phone

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Plan received from phone displays
    Tool: Bash (xcodebuild test)
    Steps:
      1. Mock applicationContext with workout plan JSON
      2. Trigger didReceiveApplicationContext
      3. Assert: TodayPlanView shows workout name
      4. Assert: Exercise list populated
    Expected Result: Plan synced and displayed
    Evidence: Test output captured

  Scenario: No plan shows empty state
    Tool: Bash (xcodebuild test)
    Steps:
      1. applicationContext has no plan or null plan
      2. Render TodayPlanView
      3. Assert: "No workout planned" message shown
    Expected Result: Graceful empty state
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(watch): add today's workout plan view with WC sync`
  - Files: `ios/FitAIWatch/Plan/TodayPlanView.swift`

---

- [ ] 10. Watch App - Hydration Tracking

  **What to do**:
  - Create `HydrationView.swift` with quick-add water buttons
  - Preset amounts: 250ml, 500ml, custom
  - Display current intake vs daily goal (progress ring)
  - Sync water intake to phone via WatchConnectivity
  - Receive goal from phone's calculatedMetrics

  **Must NOT do**:
  - Do not store hydration in HealthKit (use app's own tracking)
  - Do not duplicate hydrationStore logic (phone is source of truth)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Interactive watch UI with data sync
  - **Skills**: [`frontend-ui-ux`, `git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11, 12, 13, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Task 6

  **References**:
  - `src/stores/hydrationStore.ts` - Hydration state management
  - `src/docs/DATA_SYNC_MAP.md` - Hydration data flow

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Add water syncs to phone
    Tool: Bash (xcodebuild test)
    Steps:
      1. Tap 250ml button in HydrationView
      2. Assert: sendMessage or transferUserInfo called
      3. Assert: Message contains {"addWater": 250}
    Expected Result: Water addition sent to phone
    Evidence: Test output with mock verification

  Scenario: Goal received from phone
    Tool: Bash (xcodebuild test)
    Steps:
      1. Mock applicationContext with {"waterGoalML": 3000}
      2. Assert: HydrationView shows 3000ml goal
      3. Assert: Progress ring denominator is 3000
    Expected Result: Goal synced from phone
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(watch): add hydration tracking with quick-add buttons`
  - Files: `ios/FitAIWatch/Hydration/HydrationView.swift`

---

- [ ] 11. Watch App - Complications

  **What to do**:
  - Create `ComplicationController.swift` with CLKComplicationDataSource
  - Support complication families: circularSmall, modularSmall, utilitarianSmall, graphicCircular
  - Display: current steps or active calories or workout status
  - Update complications when significant data changes
  - Use `transferCurrentComplicationUserInfo` for priority updates (budget: ~50/day)

  **Must NOT do**:
  - Do not exceed complication update budget
  - Do not show sensitive health data in complications (visible on lock screen)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: watchOS complications have specific implementation requirements
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 12, 13, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 7, 8

  **References**:
  - Research: Complication patterns from librarian findings
  - Apple docs: https://developer.apple.com/documentation/clockkit

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Complication provides current data
    Tool: Bash (xcodebuild test)
    Steps:
      1. Call getCurrentTimelineEntry for graphicCircular
      2. Assert: Entry contains step count
      3. Assert: Template is valid CLKComplicationTemplate
    Expected Result: Valid complication data returned
    Evidence: Test output captured

  Scenario: Complication updates on workout end
    Tool: Bash (xcodebuild test)
    Steps:
      1. End workout session
      2. Assert: reloadTimeline called for active complications
      3. Assert: Budget checked before transferCurrentComplicationUserInfo
    Expected Result: Complication refreshes post-workout
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(watch): implement complications with steps and calories`
  - Files: `ios/FitAIWatch/Complications/ComplicationController.swift`

---

- [ ] 12. WatchConnectivity React Native Bridge

  **What to do**:
  - Create `RNWatchConnectivityModule.swift` bridging WCSession to React Native
  - Expose methods: `sendMessage()`, `updateApplicationContext()`, `getReachability()`
  - Emit events to JS: `onMessageReceived`, `onReachabilityChanged`, `onContextReceived`
  - Create TypeScript definitions in `src/services/watch-connectivity/native.ts`
  - Create `WatchConnectivityService.ts` wrapping native module

  **Must NOT do**:
  - Do not expose low-level WCSession APIs (abstract to high-level methods)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Native module with event emitters
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11, 13, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Task 6

  **References**:
  - Task 4 patterns (HealthKit bridge)
  - React Native EventEmitter docs

  **Acceptance Criteria**:

  **TDD (Tests First):**
  - [ ] Test file: `src/services/watch-connectivity/__tests__/native.test.ts`
  - [ ] Test covers: Event listener registration/removal
  - [ ] `npm test -- watch-connectivity` → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Send message to watch
    Tool: Bash (npm test)
    Steps:
      1. Mock NativeModules.RNWatchConnectivity
      2. Call WatchConnectivityService.sendWorkoutPlan(plan)
      3. Assert: Native sendMessage called with serialized plan
    Expected Result: Message sent via native module
    Evidence: Test output captured

  Scenario: Receive message emits event
    Tool: Bash (npm test)
    Steps:
      1. Register listener for onMessageReceived
      2. Simulate native event emission
      3. Assert: Listener callback invoked with message data
    Expected Result: Events bridge from native to JS
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(ios): create WatchConnectivity React Native bridge`
  - Files: `ios/FitAI/RNWatchConnectivityModule.swift`, `src/services/watch-connectivity/`

---

### PHASE 3: Integration & Settings

---

- [ ] 13. Sync Settings UI

  **What to do**:
  - Create `src/screens/settings/HealthSyncSettings.tsx`
  - Settings options:
    - Toggle: HealthKit sync enabled/disabled
    - Toggle: Export workouts to HealthKit
    - Picker: Sync frequency (15min, 30min, 1hr, manual)
    - Toggle: Real-time sync (power user option)
    - Button: Force sync now
    - Display: Last sync time, sync status
  - Persist settings to AsyncStorage
  - Connect to healthDataStore actions

  **Must NOT do**:
  - Do not add settings that don't have backend implementation
  - Do not allow sync frequencies less than 15 minutes (battery concern)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Settings UI with form controls
  - **Skills**: [`frontend-ui-ux`, `git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11, 12, 14)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 3, 4

  **References**:
  - `src/screens/settings/` - Existing settings screens pattern
  - `src/stores/health-data/types.ts` - Settings type definitions

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Settings persist across app restart
    Tool: Bash (npm test)
    Steps:
      1. Set syncFrequency to "30min"
      2. Simulate app restart (clear memory state)
      3. Reload settings from AsyncStorage
      4. Assert: syncFrequency === "30min"
    Expected Result: Settings persisted
    Evidence: Test output captured

  Scenario: Force sync triggers immediate sync
    Tool: Bash (npm test)
    Steps:
      1. Mock healthDataStore.syncHealthData
      2. Press "Sync Now" button
      3. Assert: syncHealthData called with force=true
    Expected Result: Manual sync triggered
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(ui): add health sync settings screen`
  - Files: `src/screens/settings/HealthSyncSettings.tsx`

---

- [ ] 14. Background Sync Toggle Implementation

  **What to do**:
  - Implement iOS background task registration for health sync
  - Use BGProcessingTask for periodic sync (respects user's frequency setting)
  - Use HKObserverQuery for real-time option (when enabled)
  - Register background tasks in AppDelegate/SceneDelegate
  - Update `SyncManager` to respect user settings
  - Add background modes to entitlements: `background-fetch`, `processing`

  **Must NOT do**:
  - Do not enable real-time by default (battery drain)
  - Do not schedule background tasks more frequently than user setting

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: iOS background task scheduling is complex
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11, 12, 13)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 3, 13

  **References**:
  - Task 3 implementation (observer queries)
  - Apple docs: https://developer.apple.com/documentation/backgroundtasks

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Background task registered on app launch
    Tool: Bash (xcodebuild test)
    Steps:
      1. Call application didFinishLaunching
      2. Assert: BGTaskScheduler.register called
      3. Assert: Task identifier matches expected
    Expected Result: Background task registered
    Evidence: Test output captured

  Scenario: Periodic sync respects user setting
    Tool: Bash (xcodebuild test)
    Steps:
      1. Set sync frequency to 30 minutes
      2. Call scheduleBackgroundSync()
      3. Assert: BGProcessingTaskRequest.earliestBeginDate ~= now + 30min
    Expected Result: Correct interval scheduled
    Evidence: Test output captured

  Scenario: Real-time toggle enables observer queries
    Tool: Bash (xcodebuild test)
    Steps:
      1. Enable real-time sync in settings
      2. Assert: enableBackgroundDelivery called for all types
      3. Assert: HKObserverQuery started
    Expected Result: Real-time observers active
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(ios): implement background sync with user-configurable frequency`
  - Files: `ios/FitAI/Background/BackgroundSyncManager.swift`

---

- [ ] 15. E2E Integration Tests

  **What to do**:
  - Create Detox/Maestro test suite for full watch-phone flow
  - Test scenarios:
    - HealthKit authorization flow
    - Workout started on watch appears in app
    - Water added on watch updates hydration store
    - Settings changes persist and take effect
    - Background sync delivers data
  - Use iOS Simulator with paired Watch Simulator
  - Create CI workflow for automated testing

  **Must NOT do**:
  - Do not require real Apple Watch for CI (use simulators)
  - Do not skip error scenarios (test failure paths too)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: E2E testing across phone and watch
  - **Skills**: [`playwright`, `git-master`]
    - `playwright`: E2E testing patterns (adapt for mobile)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: All previous tasks

  **References**:
  - Detox docs: https://wix.github.io/Detox/
  - Existing test patterns in `fitai-workers/e2e/`

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Full authorization flow
    Tool: Detox
    Steps:
      1. Launch app on iOS Simulator
      2. Navigate to Settings > Health Sync
      3. Tap "Connect HealthKit"
      4. Assert: HealthKit permission dialog appears
      5. Grant permissions
      6. Assert: "Connected" status shown
    Expected Result: HealthKit authorized
    Evidence: Screenshots at each step

  Scenario: Workout sync from watch
    Tool: Detox + xcrun simctl
    Steps:
      1. Start watch simulator with paired phone
      2. Launch FitAI Watch app
      3. Start running workout
      4. End workout after 1 minute
      5. Check phone app
      6. Assert: New workout appears in workout history
    Expected Result: Cross-device sync works
    Evidence: Screenshots from both devices

  Scenario: Background sync test
    Tool: Detox
    Steps:
      1. Enable periodic sync (15 min)
      2. Background the app
      3. Wait for simulated background task trigger
      4. Foreground app
      5. Assert: lastSyncTime updated
    Expected Result: Background sync executed
    Evidence: Sync timestamp captured
  ```

  **Commit**: YES
  - Message: `test: add E2E integration tests for iOS wearable features`
  - Files: `e2e/ios-wearable.e2e.ts`, `.github/workflows/ios-e2e.yml`

---

## Commit Strategy

| After Task | Message                                                      | Files                                                     | Verification     |
| ---------- | ------------------------------------------------------------ | --------------------------------------------------------- | ---------------- |
| 0          | `chore(ios): generate native iOS project with expo prebuild` | `ios/`                                                    | xcodebuild build |
| 1          | `feat(ios): add HealthKit protocol abstractions`             | `ios/FitAI/HealthKit/*.swift`                             | xcodebuild test  |
| 2          | `feat(ios): add watchOS target`                              | `ios/FitAI.xcodeproj/`, `ios/FitAIWatch/`                 | xcodebuild build |
| 3          | `feat(ios): implement HKObserverQuery background sync`       | `ios/FitAI/HealthKit/`                                    | xcodebuild test  |
| 4          | `feat(ios): create HealthKit RN bridge`                      | `ios/FitAI/RN*.swift`, `src/services/health-kit/`         | npm test         |
| 5          | `feat(workers): add health sync endpoints`                   | `fitai-workers/src/handlers/`                             | npm test         |
| 6          | `feat(ios): implement WatchConnectivity manager`             | `ios/FitAI/WatchConnectivity/`                            | xcodebuild test  |
| 7          | `feat(watch): implement workout sessions`                    | `ios/FitAIWatch/Workout/`                                 | xcodebuild test  |
| 8          | `feat(watch): add activity summary view`                     | `ios/FitAIWatch/Activity/`                                | xcodebuild test  |
| 9          | `feat(watch): add today's plan view`                         | `ios/FitAIWatch/Plan/`                                    | xcodebuild test  |
| 10         | `feat(watch): add hydration tracking`                        | `ios/FitAIWatch/Hydration/`                               | xcodebuild test  |
| 11         | `feat(watch): implement complications`                       | `ios/FitAIWatch/Complications/`                           | xcodebuild test  |
| 12         | `feat(ios): create WatchConnectivity RN bridge`              | `ios/FitAI/RN*.swift`, `src/services/watch-connectivity/` | npm test         |
| 13         | `feat(ui): add health sync settings`                         | `src/screens/settings/`                                   | npm test         |
| 14         | `feat(ios): implement background sync toggle`                | `ios/FitAI/Background/`                                   | xcodebuild test  |
| 15         | `test: add E2E iOS wearable tests`                           | `e2e/`, `.github/workflows/`                              | detox test       |

---

## Success Criteria

### Verification Commands

```bash
# Build iOS app with watch extension
cd ios && xcodebuild build -scheme FitAI -destination 'generic/platform=iOS'
cd ios && xcodebuild build -scheme FitAIWatch -destination 'generic/platform=watchOS'

# Run all Swift tests
xcodebuild test -scheme FitAI -destination 'platform=iOS Simulator,name=iPhone 15'

# Run React Native tests
npm test -- --coverage --testPathPattern='health-kit|watch-connectivity'

# Run E2E tests
npx detox test --configuration ios.sim.release

# Verify HealthKit entitlements
codesign -d --entitlements :- ios/build/FitAI.app | grep healthkit
```

### Final Checklist

- [ ] Watch app installs from single App Store download
- [ ] All 6 workout types functional on watch
- [ ] Background sync delivers data within configured interval
- [ ] Real-time option available for power users
- [ ] Complications show current metrics on watch face
- [ ] Hydration quick-add syncs to phone
- [ ] Today's plan displays on watch
- [ ] 80%+ test coverage on new modules
- [ ] No regression in Android Health Connect functionality
- [ ] Settings persist across app restarts

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLE WATCH                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Workout    │  │  Activity   │  │  Hydration  │             │
│  │  Sessions   │  │  Summary    │  │  Tracking   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                       │
│              ┌───────────▼───────────┐                          │
│              │  WatchConnectivity    │                          │
│              │  (WCSession)          │                          │
│              └───────────┬───────────┘                          │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│    sendMessage    applicationContext  transferUserInfo          │
│    (real-time)    (latest state)      (queued)                  │
└─────────┬────────────────┬────────────────┬─────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                         iPHONE                                   │
│                                                                  │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │  WatchConnectivity│◄────►│  React Native   │                   │
│  │  Manager (Swift)  │      │  Bridge         │                   │
│  └────────┬─────────┘      └────────┬────────┘                   │
│           │                         │                            │
│           ▼                         ▼                            │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │   HealthKit     │◄────►│  Zustand Stores │                   │
│  │   Background    │      │  (Single Source │                   │
│  │   Sync Manager  │      │   of Truth)     │                   │
│  └────────┬────────┘      └────────┬────────┘                   │
│           │                         │                            │
│           ▼                         ▼                            │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │   HealthKit     │      │  Supabase       │                   │
│  │   (iOS System)  │      │  Sync Engine    │                   │
│  └─────────────────┘      └────────┬────────┘                   │
│                                    │                             │
└────────────────────────────────────┼─────────────────────────────┘
                                     │
                                     ▼
                         ┌─────────────────────┐
                         │  Cloudflare Workers │
                         │  /api/health/sync   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     Supabase        │
                         │  daily_health_logs  │
                         │  workout_sessions   │
                         └─────────────────────┘
```

---

_Plan generated by Prometheus | February 5, 2026_
