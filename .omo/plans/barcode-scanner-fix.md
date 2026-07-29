# Barcode Scanner Full Fix — Global Product Lookup with Multi-API Fallback

## TL;DR

> **Quick Summary**: Fix the completely broken barcode scanner by (1) registering expo-camera as a plugin so `onBarcodeScanned` fires, (2) replacing the single OpenFoodFacts v0 call with a region-aware multi-API fallback chain (OFF v2 → UPCitemdb → Gemini AI estimation), (3) adding manual barcode entry, (4) fixing double-modal bug, type safety issues, and missing loading states.
>
> **Deliverables**:
> - Camera barcode scanning that actually fires callbacks (expo-camera plugin fix)
> - Multi-API fallback chain: OFF v2 World → UPCitemdb → Gemini AI → Manual Entry
> - GS1 prefix→country mapping + barcode normalization (UPC-A→EAN-13)
> - Region-aware API prioritization based on user's profile country
> - Manual barcode entry component as final fallback
> - AI estimation with "Estimated by AI" disclaimer in UI
> - Nutri-Score (A-E) and NOVA group (1-4) display in ProductDetailsModal
> - Loading indicator during barcode lookup
> - Full TDD test coverage (unit + integration)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves + final verification wave
> **Critical Path**: T1 → T5 → T6 → T8 → T10 → T12 → F1-F4

---

## Context

### Original Request
User reported barcode scanner is completely non-functional — scanning biscuits, chips, cold drinks returns nothing. Wants full product details (name, brand, nutrition facts, health score, ingredients, allergens) with ability to map/log products to meals. Specifically needs Indian product support (Parle-G, Lays Magic Masala, Thums Up). Requested exhaustive global coverage for all countries.

### Root Cause Analysis (5 issues)
1. **expo-camera missing from app.config.js plugins** — PRIMARY CAUSE. Camera opens but `onBarcodeScanned` never fires because native module isn't registered. Package IS installed (v16.1.11) but NOT in plugins array (lines 110-137).
2. **OpenFoodFacts is the ONLY barcode lookup API** — `freeNutritionAPIs.searchByBarcode()` (lines 397-436) only calls OFF. Many Indian products not found.
3. **Duplicate OFF API calls** — `barcodeService.lookupProduct()` calls both `searchByBarcode()` AND `fetchProductDetails()`, both hitting the same endpoint.
4. **No fallback when product not found** — dead end with "Product Not Found" alert.
5. **No loading indicator** — `isProcessingBarcode` state is set but no UI reads it.

### Interview Summary
**Key Discussions**:
- Full fix at once (not incremental) — user's explicit choice
- TDD approach (tests first) — user's explicit choice
- Both manual entry + camera scanning — user's explicit choice
- Free APIs only — no paid APIs
- Region-aware prioritization using user's profile country + GS1 prefix
- Test on development build only (not Expo Go)

**Research Findings (13 agent sessions)**:
- **OpenFoodFacts**: 4.35M+ products, 381 countries, free, no API key. India ~20,289 products (60-75% hit rate for top FMCG). v2 API supports field selection (300KB → 2-5KB payload).
- **UPCitemdb**: Free trial tier (100 req/day, no signup). Name/brand only — NO nutrition data. Skip for 890/880 prefixes (poor Indian/Korean coverage).
- **Gemini AI**: Can estimate nutrition from product name+brand. Use structured output. Confidence threshold ≤40 for disclaimer. 23 API keys available with rotation.
- **Dead APIs**: FoodRepo (shutdown), Nutritionix (no free tier), CalorieNinjas (shutting down), FSSAI (no public API), GS1 India DataKart (B2B paid), FatSecret (barcode=paid), USDA FDC (no barcode endpoint).
- **GS1 Prefix mapping**: 890→India, 880→Korea, 000-139→USA/Canada, 300-379→France, 400-440→Germany, 500-509→UK, 690-699→China, 450-459/490-499→Japan, 789-790→Brazil, 628→Saudi, 629→UAE, 930-939→Australia, 940-949→NZ.

### Metis Review (2 rounds)
**Critical corrections applied**:
- USDA FDC removed (no barcode endpoint)
- UPCitemdb returns name/brand ONLY — used only for name resolution before AI estimation
- expo-camera plugin must use `recordAudioAndroid: false` (NOT `microphonePermission: false`)
- Always query `world.openfoodfacts.org` first (country subdomains are filtered views)
- User-Agent header MUST be set: `FitAI/1.0 (fitai@example.com)`
- OFF returns `nutrition_grades` (Nutri-Score) and `nova_group` — surface in UI
- Camera.tsx already has permission gate (lines 140-166) — no change needed
- jest.setup.js mock targets OLD expo-camera API — must update
- Barcode type normalization needed: iOS returns `"org.gs1.EAN-13"`, Android returns `"32"`
- UPC-A 12-digit must be zero-padded to 13-digit EAN-13
- Non-product barcodes (QR, Code128, PDF417) must be rejected early
- Double-modal bug: barcode-handlers.ts line 38 shows modal AND lines 40-44 show Alert

---

## Work Objectives

### Core Objective
Make the barcode scanner fully functional so scanning ANY product worldwide returns complete details (name, brand, nutrition, health score, ingredients, allergens) and allows mapping/logging to a meal, with specific emphasis on Indian product coverage.

### Concrete Deliverables
- Fixed `app.config.js` with expo-camera plugin registration
- `src/utils/countryMapping.ts` — GS1 prefix→country + barcode normalization utilities
- Rewritten `src/services/freeNutritionAPIs.ts:searchByBarcode()` — OFF v2 + multi-API fallback
- Rewritten `src/services/barcodeService.ts:lookupProduct()` — deduplicated, uses new chain
- Gemini AI nutrition estimation integrated into fallback chain
- Fixed `src/hooks/ai-meal-generation/barcode-handlers.ts` — type safety, no double-modal, AI disclaimer
- `src/components/diet/ManualBarcodeEntry.tsx` — manual barcode entry UI
- Updated `src/components/diet/ProductDetailsModal.tsx` — AI disclaimer + Nutri-Score + NOVA
- Updated `src/screens/main/DietScreen.tsx` — manual entry wired + loading indicator
- Fixed `jest.setup.js` — CameraView mock + profileStore mock
- TDD test files: `countryMapping.test.ts`, `searchByBarcode.test.ts`, `integration.test.ts`

### Definition of Done
- [x] `npx expo prebuild --clean` succeeds (expo-camera plugin registered)
- [x] `bun test` — all tests pass (≥25 test cases across 3 test files)
- [x] Scanning EAN-13 barcode returns full product details with nutrition data
- [x] Scanning UPC-A barcode auto-pads to EAN-13 and finds product
- [x] Indian barcodes (890-prefix) return product details (OFF or AI fallback)
- [x] Non-product barcodes (QR codes) are rejected with friendly message
- [x] Manual barcode entry works as fallback
- [x] AI-estimated products show "Estimated by AI" disclaimer
- [x] Loading spinner visible during barcode lookup
- [x] No double-modal on successful scan
- [x] No `as any` casts in modified files

### Must Have
- Camera scanning that fires `onBarcodeScanned` callback
- Multi-API fallback: OFF v2 → UPCitemdb → Gemini AI → Manual Entry
- GS1 prefix-based country detection
- UPC-A → EAN-13 zero-padding
- Non-product barcode rejection (QR, Code128, PDF417, DataMatrix)
- Region-aware API prioritization (user's country from profileStore)
- FIFO in-memory cache (Map, evict at 100 entries)
- 5-second timeout per API call (Promise.race pattern)
- User-Agent header on all OFF calls
- AI estimation disclaimer in UI
- Nutri-Score (A-E with colors) and NOVA group (1-4) display
- Loading indicator during lookup
- Manual barcode entry component
- TDD test coverage

### Must NOT Have (Guardrails)
- NO paid API integrations (FatSecret, Nutritionix, etc.)
- NO `as any` type casts in new or modified code
- NO `@ts-ignore` or `@ts-expect-error`
- NO empty catch blocks — always `console.warn()` with context
- NO hardcoded API keys — use environment variables from app.config.js
- NO removal of existing camera permission gate (Camera.tsx lines 140-166)
- NO country-specific OFF subdomains as primary (always `world.openfoodfacts.org` first)
- NO Expo Go testing assumptions — development build only
- NO over-abstraction (no abstract base classes, no strategy pattern factories)
- NO console.log in production code (use console.warn for errors only)
- NO modifications to health-assessment.ts or profileStore.ts
- NO MFDS Korea API (deferred to Phase 2 — requires Korean text + gov API key)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Jest 29, jest.config.js, jest.setup.js, existing test files)
- **Automated tests**: TDD (tests first — user's explicit choice)
- **Framework**: `bun test` (existing setup, uses Jest under the hood)
- **TDD flow**: RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Config/Setup**: Use Bash — run prebuild/build commands, verify output
- **Services/Utils**: Use Bash (`bun test`) — run tests, verify pass counts
- **UI Components**: Use Playwright — navigate, interact, assert DOM, screenshot
- **Integration**: Use Bash — mock server + test runner, verify end-to-end

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + config fixes, 5 parallel):
├── Task 1: Fix jest.setup.js mocks [quick]
├── Task 2: Fix app.config.js expo-camera plugin [quick]
├── Task 3: Create countryMapping.ts + TDD tests [quick]
├── Task 4: Fix Camera.tsx barcode normalization [quick]
└── Task 5: Rewrite freeNutritionAPIs.ts searchByBarcode — OFF v2 + fallback chain + TDD [deep]

Wave 2 (After Wave 1 — core integration, 4 parallel):
├── Task 6: Rewrite barcodeService.ts (depends: T5) [unspecified-high]
├── Task 7: Add Gemini AI nutrition estimation fallback (depends: T3) [deep]
├── Task 8: Fix barcode-handlers.ts (depends: T3, T5) [unspecified-high]
└── Task 9: Create ManualBarcodeEntry.tsx component [visual-engineering]

Wave 3 (After Wave 2 — UI + integration, 3 parallel):
├── Task 10: Wire DietScreen — manual entry + loading indicator (depends: T8, T9) [unspecified-high]
├── Task 11: ProductDetailsModal — AI disclaimer + Nutri-Score + NOVA (depends: T8) [visual-engineering]
└── Task 12: Integration tests — end-to-end barcode flow (depends: T6, T7, T8) [deep]

Wave FINAL (After ALL — verification, 4 parallel):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real manual QA [unspecified-high]
└── F4: Scope fidelity check [deep]

Critical Path: T1 → T5 → T6 → T8 → T10 → T12 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | T5, T7, T12 | 1 |
| T2 | — | (none, config only) | 1 |
| T3 | — | T7, T8 | 1 |
| T4 | — | (none, standalone fix) | 1 |
| T5 | — | T6, T8, T12 | 1 |
| T6 | T5 | T12 | 2 |
| T7 | T3 | T12 | 2 |
| T8 | T3, T5 | T10, T11, T12 | 2 |
| T9 | — | T10 | 2 |
| T10 | T8, T9 | T12 | 3 |
| T11 | T8 | T12 | 3 |
| T12 | T6, T7, T8, T10, T11 | F1-F4 | 3 |
| F1-F4 | T12 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 5 tasks — T1→`quick`, T2→`quick`, T3→`quick`, T4→`quick`, T5→`deep`
- **Wave 2**: 4 tasks — T6→`unspecified-high`, T7→`deep`, T8→`unspecified-high`, T9→`visual-engineering`
- **Wave 3**: 3 tasks — T10→`unspecified-high`, T11→`visual-engineering`, T12→`deep`
- **FINAL**: 4 tasks — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. Fix jest.setup.js — Update expo-camera mocks and add profileStore mock

  **What to do**:
  - Replace the existing expo-camera mock (lines 44-52) that targets the old `Camera` API with a mock for `CameraView` (the current expo-camera v16 API)
  - Mock `CameraView` as a React component that accepts `onBarcodeScanned` prop
  - Mock `useCameraPermissions` hook returning `[{ granted: true }, jest.fn()]`
  - Add `profileStore` mock: `jest.mock('@/stores/profileStore', () => ({ getProfileStoreState: jest.fn(() => ({ personalInfo: { country: 'India' } })) }))`
  - Write the test FIRST (RED): create a trivial test that imports from `expo-camera` and verifies the mock shape, then update the mock to make it pass (GREEN)

  **Must NOT do**:
  - Do NOT remove mocks for other modules in jest.setup.js
  - Do NOT change jest.config.js
  - Do NOT use `@ts-ignore` or `as any`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file edit with straightforward mock replacement
  - **Skills**: []
    - No specialized skills needed — pure Jest mock config
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser needed — test config file

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 5, 7, 12 (all tests depend on correct mocks)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `jest.setup.js:44-52` — Current broken expo-camera mock to REPLACE. Shows the old `Camera` API mock that needs updating to `CameraView`.
  - `jest.setup.js:1-43` — Other existing mocks in the file. Do NOT touch these — only replace the expo-camera section.

  **API/Type References**:
  - `src/stores/profileStore.ts` — The `getProfileStoreState()` function signature. Mock must match this shape with `personalInfo.country`.
  - `src/types/user.ts:37` — The `country` field type (string). Mock should return `'India'` as default.

  **External References**:
  - expo-camera v16 API: `CameraView` component + `useCameraPermissions` hook (replaces old `Camera` component)

  **WHY Each Reference Matters**:
  - `jest.setup.js:44-52`: This is the EXACT code to replace — executor must read it to know the old mock shape
  - `profileStore.ts`: Mock must match real function signature or tests will pass with wrong shape
  - `user.ts:37`: Confirms `country` is a plain string, not an enum or code

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Mock file updated: `jest.setup.js`
  - [ ] `bun test -- --passWithNoTests` → PASS (mocks load without error)

  **QA Scenarios:**

  ```
  Scenario: Jest mocks load successfully
    Tool: Bash (bun test)
    Preconditions: jest.setup.js has been modified
    Steps:
      1. Run `bun test -- --passWithNoTests`
      2. Check exit code is 0
      3. Verify no "Cannot find module" or "mock" errors in output
    Expected Result: Exit code 0, no mock-related errors
    Failure Indicators: "Cannot find module 'expo-camera'", "getProfileStoreState is not a function"
    Evidence: .sisyphus/evidence/task-1-mocks-load.txt

  Scenario: Mock shape matches expected API
    Tool: Bash (bun test)
    Preconditions: jest.setup.js updated
    Steps:
      1. Run `bun test -- --testPathPattern="countryMapping|searchByBarcode" --passWithNoTests`
      2. If any existing barcode tests exist, verify they don't crash on import
    Expected Result: No import errors, mocks resolve correctly
    Failure Indicators: "TypeError: ... is not a function", "Cannot read properties of undefined"
    Evidence: .sisyphus/evidence/task-1-mock-shape.txt
  ```

  **Commit**: YES
  - Message: `test(barcode): update jest mocks for CameraView and profileStore`
  - Files: `jest.setup.js`
  - Pre-commit: `bun test -- --passWithNoTests`

- [x] 2. Fix app.config.js — Register expo-camera as a plugin

  **What to do**:
  - Add `["expo-camera", { "cameraPermission": "Allow FitAI to use your camera for barcode scanning and food recognition", "recordAudioAndroid": false }]` to the `plugins` array in `app.config.js` (between lines 110-137)
  - Place it near other camera-related plugins if any exist
  - Verify the config is valid by running `npx expo config --type introspect`

  **Must NOT do**:
  - Do NOT use `microphonePermission: false` (wrong key — it's `recordAudioAndroid`)
  - Do NOT change any other plugins in the array
  - Do NOT modify any other config sections

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line addition to config file
  - **Skills**: []
    - No specialized skills needed — config edit
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: None directly (but enables barcode scanning to work on device)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `app.config.js:110-137` — The existing `plugins` array. Insert the new plugin entry here. Look at the formatting/indentation of existing entries to match.
  - `app.config.js:148+` — Gemini API key env vars (context only — do NOT modify)

  **External References**:
  - expo-camera plugin config: `["expo-camera", { cameraPermission: string, recordAudioAndroid: boolean }]`

  **WHY Each Reference Matters**:
  - `app.config.js:110-137`: Executor must see the existing plugins array structure to insert at the right location with matching formatting
  - The `recordAudioAndroid: false` is CRITICAL — Metis flagged that `microphonePermission: false` is the WRONG key

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Expo config validates with expo-camera plugin
    Tool: Bash
    Preconditions: app.config.js modified
    Steps:
      1. Run `npx expo config --type introspect`
      2. Search output for "expo-camera" in plugins section
      3. Verify `recordAudioAndroid` is `false`
      4. Verify `cameraPermission` string is present
    Expected Result: expo-camera appears in plugins with correct config, command exits 0
    Failure Indicators: Config parse error, expo-camera not in plugins output, recordAudioAndroid missing
    Evidence: .sisyphus/evidence/task-2-expo-config.txt

  Scenario: No other plugins disturbed
    Tool: Bash
    Preconditions: app.config.js modified
    Steps:
      1. Run `git diff app.config.js`
      2. Verify only 1 addition (the expo-camera plugin entry)
      3. No deletions or modifications to existing plugins
    Expected Result: Diff shows only the new plugin addition
    Failure Indicators: Diff shows changes to other plugins or config sections
    Evidence: .sisyphus/evidence/task-2-diff-check.txt
  ```

  **Commit**: YES
  - Message: `fix(config): register expo-camera plugin for barcode scanning`
  - Files: `app.config.js`
  - Pre-commit: `npx expo config --type introspect`

- [x] 3. Create countryMapping.ts + TDD tests — GS1 prefix→country, country name normalization, barcode normalization

  **What to do**:
  - **TDD — Write tests FIRST** in `src/__tests__/services/barcode/countryMapping.test.ts`:
    - `getCountryFromBarcode("8901234567890")` → `"India"` (890 prefix)
    - `getCountryFromBarcode("0012345678905")` → `"USA"` (001 prefix)
    - `getCountryFromBarcode("4006381333931")` → `"Germany"` (400 prefix)
    - `getCountryFromBarcode("3017620422003")` → `"France"` (301 prefix)
    - `getCountryFromBarcode("5000159407236")` → `"UK"` (500 prefix)
    - `getCountryFromBarcode("4901234567894")` → `"Japan"` (490 prefix)
    - `getCountryFromBarcode("69")` → `"Unknown"` (too short)
    - `normalizeBarcode("012345678905")` → `"0012345678905"` (UPC-A 12→13 digit zero-pad)
    - `normalizeBarcode("8901234567890")` → `"8901234567890"` (EAN-13 unchanged)
    - `normalizeBarcode("")` → `null` (invalid)
    - `normalizeBarcode("ABC")` → `null` (non-numeric)
    - `isProductBarcode("ean13")` → `true`
    - `isProductBarcode("org.gs1.EAN-13")` → `true` (iOS format)
    - `isProductBarcode("32")` → `true` (Android numeric format for EAN-13)
    - `isProductBarcode("qr")` → `false`
    - `isProductBarcode("org.iso.Code128")` → `false`
    - `normalizeCountryName("India")` → `"IN"` (ISO 3166-1 alpha-2)
    - `normalizeCountryName("United States")` → `"US"`
    - `normalizeCountryName("USA")` → `"US"`
  - **Then implement** `src/utils/countryMapping.ts`:
    - `GS1_PREFIX_MAP`: Record mapping 3-digit prefix ranges to country names. Include ALL major ranges (see research findings).
    - `getCountryFromBarcode(barcode: string): string` — Extract first 3 digits, match against GS1_PREFIX_MAP with range matching, return country name or "Unknown"
    - `normalizeBarcode(barcode: string): string | null` — Validate numeric, handle UPC-A (12 digits → zero-pad to 13), return null for invalid
    - `isProductBarcode(type: string): boolean` — Return true for EAN-13, EAN-8, UPC-A, UPC-E in both iOS (`org.gs1.EAN-13`) and Android (`32`) formats. Return false for QR, Code128, PDF417, DataMatrix, Aztec.
    - `normalizeCountryName(name: string): string` — Map common country name variants to ISO 3166-1 alpha-2 codes
  - Export all functions as named exports

  **Must NOT do**:
  - Do NOT use external libraries for country codes — hardcode the mapping
  - Do NOT use `as any` or `@ts-ignore`
  - Do NOT include MFDS/Korea-specific logic (Phase 2)
  - Do NOT over-abstract — plain functions, no classes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure utility functions with TDD — well-scoped, no external dependencies
  - **Skills**: []
    - No specialized skills needed — TypeScript utility module
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser needed — utility functions
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 7, 8 (both need GS1 country detection and barcode normalization)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/services/youtube/invidious.ts:35-52` — Promise.race timeout pattern to reference for style (though countryMapping doesn't need timeouts, it shows the codebase's utility function style)
  - `src/__tests__/services/` — Existing test directory structure. Place new test at `barcode/countryMapping.test.ts` following this nesting.

  **API/Type References**:
  - `src/types/user.ts:37` — `country` field is a plain string like "India", "United States". The `normalizeCountryName()` function must handle these exact strings.
  - `src/stores/profileStore.ts` — `getProfileStoreState().personalInfo?.country` returns the user's country string. This is what gets passed to `normalizeCountryName()`.

  **External References**:
  - GS1 prefix complete table: 890→India, 880→Korea, 000-139→USA/Canada, 300-379→France, 400-440→Germany, 500-509→UK, 690-699→China, 450-459&490-499→Japan, 789-790→Brazil, 628→Saudi, 629→UAE, 930-939→Australia, 940-949→NZ, 471→Taiwan, 480→Philippines, 885→Thailand, 899→Indonesia, 729→Israel, 600-601→South Africa

  **WHY Each Reference Matters**:
  - `user.ts:37`: Country names in the app are full English strings ("India", not "IN") — `normalizeCountryName` must handle these
  - GS1 table: This is the authoritative mapping — executor must implement the complete range-matching logic
  - Test directory: Executor must place test in correct location for `bun test` to discover it

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file created FIRST: `src/__tests__/services/barcode/countryMapping.test.ts`
  - [ ] `bun test countryMapping` → RED (tests fail, module doesn't exist yet)
  - [ ] Implementation file created: `src/utils/countryMapping.ts`
  - [ ] `bun test countryMapping` → GREEN (≥18 tests pass, 0 failures)

  **QA Scenarios:**

  ```
  Scenario: GS1 prefix correctly identifies Indian products
    Tool: Bash (bun test)
    Preconditions: Both test and implementation files created
    Steps:
      1. Run `bun test countryMapping`
      2. Verify test "getCountryFromBarcode 8901234567890 returns India" passes
      3. Verify all GS1 prefix tests pass (India, USA, Germany, France, UK, Japan)
    Expected Result: ≥18 tests pass, 0 failures
    Failure Indicators: Any test failure, "Cannot find module" error
    Evidence: .sisyphus/evidence/task-3-gs1-tests.txt

  Scenario: UPC-A barcode correctly zero-padded to EAN-13
    Tool: Bash (bun test)
    Preconditions: Implementation exists
    Steps:
      1. Run `bun test countryMapping -- --verbose`
      2. Check "normalizeBarcode 12-digit UPC-A zero-pads to 13" test passes
      3. Check "normalizeBarcode empty string returns null" test passes
      4. Check "normalizeBarcode non-numeric returns null" test passes
    Expected Result: All normalization tests pass
    Failure Indicators: normalizeBarcode returns wrong length or doesn't handle edge cases
    Evidence: .sisyphus/evidence/task-3-normalize-tests.txt

  Scenario: Non-product barcode types rejected
    Tool: Bash (bun test)
    Preconditions: Implementation exists
    Steps:
      1. Run `bun test countryMapping -- --verbose`
      2. Verify isProductBarcode("qr") returns false
      3. Verify isProductBarcode("org.iso.Code128") returns false
      4. Verify isProductBarcode("org.gs1.EAN-13") returns true
      5. Verify isProductBarcode("32") returns true (Android EAN-13)
    Expected Result: All barcode type validation tests pass
    Failure Indicators: QR/Code128 not rejected, iOS/Android format not recognized
    Evidence: .sisyphus/evidence/task-3-barcodetype-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(barcode): add GS1 country mapping and barcode normalization with TDD`
  - Files: `src/utils/countryMapping.ts`, `src/__tests__/services/barcode/countryMapping.test.ts`
  - Pre-commit: `bun test countryMapping`

- [x] 4. Fix Camera.tsx — Barcode type normalization and non-product barcode rejection

  **What to do**:
  - Import `isProductBarcode` and `normalizeBarcode` from `@/utils/countryMapping`
  - In `handleBarcodeScanned` (lines 121-138):
    - Add early return if `!isProductBarcode(barcode.type)` — show brief toast/console.warn: "QR codes and non-product barcodes are not supported"
    - Call `normalizeBarcode(barcode.data)` before passing to parent callback
    - If `normalizeBarcode` returns `null`, show brief toast: "Invalid barcode format"
  - In `barcodeTypes` array (lines 234-248):
    - Remove QR, Code128, PDF417, DataMatrix, Aztec from the array
    - Keep ONLY: EAN-13, EAN-8, UPC-A, UPC-E
  - Handle both iOS format (`"org.gs1.EAN-13"`) and Android format (`"32"`) — the `isProductBarcode` utility handles this

  **Must NOT do**:
  - Do NOT modify the camera permission gate (lines 140-166)
  - Do NOT change camera UI layout or styling
  - Do NOT add new state variables for barcode type filtering (keep it stateless in the handler)
  - Do NOT remove the `onBarcodeScanned` prop interface

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small focused edits to one file — import + early return + array filter
  - **Skills**: []
    - No specialized skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No visual changes — logic-only edits
    - `playwright`: Cannot test camera in Playwright

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: None directly (Camera.tsx is standalone)
  - **Blocked By**: None technically, but uses `countryMapping.ts` from Task 3. If Task 3 hasn't finished yet, executor should create a minimal stub or wait. Practically, both are Wave 1 and quick — order within wave doesn't matter if Task 3 finishes first.

  **References**:

  **Pattern References**:
  - `src/components/advanced/Camera.tsx:121-138` — `handleBarcodeScanned` function. This is the EXACT function to modify. Read it to understand the current callback signature and what it passes to the parent.
  - `src/components/advanced/Camera.tsx:234-248` — `barcodeTypes` array. This defines which barcode types the camera listens for. Remove non-product types from here.
  - `src/components/advanced/Camera.tsx:140-166` — Permission gate. DO NOT TOUCH this section — Metis confirmed it's correct.

  **API/Type References**:
  - `src/utils/countryMapping.ts` (created in Task 3) — `isProductBarcode(type: string): boolean` and `normalizeBarcode(barcode: string): string | null`. These are the functions to import and use.

  **External References**:
  - expo-camera barcode types: iOS returns `"org.gs1.EAN-13"`, Android returns numeric `"32"` for the same type. The `isProductBarcode` utility abstracts this.

  **WHY Each Reference Matters**:
  - `Camera.tsx:121-138`: Executor must understand the current handler to add the early-return logic in the right place
  - `Camera.tsx:234-248`: Executor must know which types are currently in the array to remove the right ones
  - `countryMapping.ts`: Executor imports from this — must know the exact function signatures

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Camera.tsx compiles without errors
    Tool: Bash
    Preconditions: Camera.tsx modified, countryMapping.ts exists (from Task 3)
    Steps:
      1. Run `npx tsc --noEmit src/components/advanced/Camera.tsx` (or full `tsc --noEmit`)
      2. Verify no TypeScript errors in Camera.tsx
    Expected Result: No compile errors
    Failure Indicators: Type errors, missing imports, wrong function signatures
    Evidence: .sisyphus/evidence/task-4-tsc-check.txt

  Scenario: barcodeTypes array only contains product types
    Tool: Bash (grep)
    Preconditions: Camera.tsx modified
    Steps:
      1. Search Camera.tsx for barcodeTypes array
      2. Verify it contains ONLY: ean13, ean8, upc_a, upc_e (or equivalent format)
      3. Verify QR, Code128, PDF417, DataMatrix, Aztec are NOT present
    Expected Result: Only 4 product barcode types remain
    Failure Indicators: QR or Code128 still in array
    Evidence: .sisyphus/evidence/task-4-barcode-types.txt
  ```

  **Commit**: YES
  - Message: `fix(camera): normalize barcode types and reject non-product codes`
  - Files: `src/components/advanced/Camera.tsx`
  - Pre-commit: `bun test`

- [x] 5. Rewrite freeNutritionAPIs.ts searchByBarcode — OFF v2 + UPCitemdb fallback + TDD tests

  **What to do**:
  - **TDD — Write tests FIRST** in `src/__tests__/services/barcode/searchByBarcode.test.ts`:
    - Mock `global.fetch` for each test
    - Test: OFF v2 returns full product data → returns BarcodeSearchResult with `source: "openfoodfacts"`, `needsNutritionEstimate: false`
    - Test: OFF v2 returns product with NO nutriments → returns `needsNutritionEstimate: true`
    - Test: OFF v2 returns `status: 0` (not found) → falls through to UPCitemdb
    - Test: OFF v2 times out (>5s) → falls through to UPCitemdb
    - Test: OFF v2 network error → falls through to UPCitemdb
    - Test: UPCitemdb returns name/brand → returns `source: "upcitemdb"`, `needsNutritionEstimate: true`
    - Test: UPCitemdb 404 → returns `null` (no data from any source)
    - Test: Both OFF and UPCitemdb fail → returns `null`
    - Test: Barcode with 890 prefix → skips UPCitemdb (poor Indian coverage), goes straight to null
    - Test: FIFO cache hit → returns cached result, no fetch calls
    - Test: FIFO cache eviction at 100 entries → oldest entry removed
    - Test: User-Agent header sent on all OFF requests
    - Test: OFF v2 response correctly mapped to BarcodeSearchResult (nutriScore, novaGroup, allergens, ingredients)
  - **Then implement** the rewrite of `searchByBarcode()` in `src/services/freeNutritionAPIs.ts` (lines 397-436):
    - Define `BarcodeSearchResult` interface at top of file:
      ```typescript
      interface BarcodeSearchResult {
        nutrition: NutritionData | null;
        productInfo: {
          name?: string; brand?: string; imageUrl?: string;
          ingredients?: string; allergens?: string[];
          labels?: string[]; nutriScore?: string;
          novaGroup?: number; gs1Country?: string;
        };
        source: string;
        needsNutritionEstimate: boolean;
        confidence: number; // 0-100
      }
      ```
    - Import `getCountryFromBarcode` from `@/utils/countryMapping`
    - FIFO cache: `const barcodeCache = new Map<string, BarcodeSearchResult>()`; evict oldest when `size >= 100`
    - Timeout helper: `const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T>` using `Promise.race` pattern from `invidious.ts:35-52`
    - **Step 1**: Check cache → return if hit
    - **Step 2**: Call OFF v2: `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_en,brands,nutriments,ingredients_text,allergens_tags,nutrition_grades,nova_group,image_front_url,countries_tags,labels_tags` with `User-Agent: FitAI/1.0 (fitai@example.com)` header and 5s timeout
    - **Step 3**: If OFF returns `status: 1`, map to `BarcodeSearchResult`. Check if `nutriments` has data — if empty/missing, set `needsNutritionEstimate: true`
    - **Step 4**: If OFF fails/not-found AND GS1 prefix is NOT 890/880, try UPCitemdb: `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}` with 5s timeout. Map name/brand only, set `needsNutritionEstimate: true`
    - **Step 5**: If all fail, return `null`
    - Cache successful results before returning
    - All errors: `console.warn('[searchByBarcode] OFF failed:', error)` — never throw

  **Must NOT do**:
  - Do NOT call `fetchProductDetails()` from this function (it's the duplicate)
  - Do NOT use country-specific OFF subdomains (always `world.openfoodfacts.org`)
  - Do NOT add paid API calls
  - Do NOT use `as any` — define proper types for OFF and UPCitemdb responses
  - Do NOT use `try/catch` with empty catch — always `console.warn`
  - Do NOT modify other functions in freeNutritionAPIs.ts (only `searchByBarcode` and add types/helpers)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-API integration with timeout handling, caching, error recovery, and TDD — requires careful API response parsing and fallback logic
  - **Skills**: []
    - No specialized skills needed — TypeScript service code
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction — backend service
    - `frontend-ui-ux`: No UI code

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Tasks 6, 8, 12 (all depend on the new `searchByBarcode` return type)
  - **Blocked By**: None directly (Task 1 fixes mocks but this task can mock its own fetch)

  **References**:

  **Pattern References**:
  - `src/services/freeNutritionAPIs.ts:397-436` — Current `searchByBarcode()` function to REPLACE. Read the existing implementation to understand the return type contract and how callers use it.
  - `src/services/freeNutritionAPIs.ts:1-50` — Existing imports and type definitions at top of file. Add new types here following existing style.
  - `src/services/youtube/invidious.ts:35-52` — `Promise.race` timeout pattern. COPY this pattern for the `withTimeout` helper.
  - `src/services/barcodeService.ts:143-165` — Current caller of `searchByBarcode()`. Understand what it expects back to ensure new return type is compatible (will be rewritten in Task 6, but current shape informs the design).

  **API/Type References**:
  - `src/utils/countryMapping.ts` (Task 3) — `getCountryFromBarcode(barcode: string): string`. Import and use to set `gs1Country` in result and to decide whether to skip UPCitemdb for 890/880 prefixes.

  **External References**:
  - OFF v2 API: `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=product_name,product_name_en,brands,nutriments,ingredients_text,allergens_tags,nutrition_grades,nova_group,image_front_url,countries_tags,labels_tags` — Response: `{ status: 0|1, product: { ... } }`
  - UPCitemdb trial: `GET https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}` — Response: `{ items: [{ title, brand, images }] }`, 100 req/day
  - OFF rate limit: 100 req/min
  - Required header: `User-Agent: FitAI/1.0 (fitai@example.com)`

  **WHY Each Reference Matters**:
  - `freeNutritionAPIs.ts:397-436`: Executor must understand what to replace and see the current return shape
  - `invidious.ts:35-52`: Executor copies this exact pattern for timeouts — ensures consistency
  - `barcodeService.ts:143-165`: Shows how the return value is consumed — new type must be backward-compatible or Task 6 handles migration
  - OFF v2 API docs: Executor needs exact URL, field names, and response structure
  - UPCitemdb docs: Executor needs exact URL and response shape

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file created FIRST: `src/__tests__/services/barcode/searchByBarcode.test.ts`
  - [ ] `bun test searchByBarcode` → RED (≥13 tests fail)
  - [ ] Implementation rewritten in `src/services/freeNutritionAPIs.ts`
  - [ ] `bun test searchByBarcode` → GREEN (≥13 tests pass, 0 failures)

  **QA Scenarios:**

  ```
  Scenario: OFF v2 returns full product details for known barcode
    Tool: Bash (bun test)
    Preconditions: Test file mocks fetch to return OFF v2 success response
    Steps:
      1. Run `bun test searchByBarcode -- --verbose`
      2. Find test: "OFF v2 returns full product data"
      3. Verify it passes — result has source="openfoodfacts", needsNutritionEstimate=false
    Expected Result: Test passes, result includes name, brand, nutriments, nutriScore, novaGroup
    Failure Indicators: Missing fields in result, wrong source string
    Evidence: .sisyphus/evidence/task-5-off-success.txt

  Scenario: Fallback to UPCitemdb when OFF fails
    Tool: Bash (bun test)
    Preconditions: Test mocks OFF to return status:0, UPCitemdb to return name/brand
    Steps:
      1. Run `bun test searchByBarcode -- --verbose`
      2. Find test: "OFF not found falls through to UPCitemdb"
      3. Verify result has source="upcitemdb", needsNutritionEstimate=true
    Expected Result: UPCitemdb result returned with name/brand, nutrition=null
    Failure Indicators: Didn't fall through, threw error, returned null prematurely
    Evidence: .sisyphus/evidence/task-5-upcitemdb-fallback.txt

  Scenario: Indian barcode skips UPCitemdb
    Tool: Bash (bun test)
    Preconditions: Test passes barcode with 890 prefix, mocks OFF to fail
    Steps:
      1. Run `bun test searchByBarcode -- --verbose`
      2. Find test: "890 prefix skips UPCitemdb"
      3. Verify fetch was NOT called with upcitemdb URL
      4. Verify result is null (both sources exhausted for India path)
    Expected Result: UPCitemdb not called, returns null directly
    Failure Indicators: fetch called with upcitemdb URL for 890 barcode
    Evidence: .sisyphus/evidence/task-5-india-skip-upcitemdb.txt

  Scenario: FIFO cache returns cached result
    Tool: Bash (bun test)
    Preconditions: Test calls searchByBarcode twice with same barcode
    Steps:
      1. Run `bun test searchByBarcode -- --verbose`
      2. Find test: "cache hit returns cached result"
      3. Verify fetch called only once (first call), second call returns from cache
    Expected Result: Second call doesn't trigger fetch, returns identical result
    Failure Indicators: fetch called twice, different results on second call
    Evidence: .sisyphus/evidence/task-5-cache-hit.txt

  Scenario: Timeout handling
    Tool: Bash (bun test)
    Preconditions: Test mocks fetch to never resolve (simulating timeout)
    Steps:
      1. Run `bun test searchByBarcode -- --verbose`
      2. Find test: "OFF v2 timeout falls through"
      3. Verify timeout triggers after 5s and falls through gracefully
    Expected Result: No hanging, graceful fallback to next API
    Failure Indicators: Test times out (>10s), unhandled promise rejection
    Evidence: .sisyphus/evidence/task-5-timeout.txt
  ```

  **Commit**: YES
  - Message: `feat(barcode): multi-API fallback chain with OFF v2, UPCitemdb, and TDD`
  - Files: `src/services/freeNutritionAPIs.ts`, `src/__tests__/services/barcode/searchByBarcode.test.ts`
  - Pre-commit: `bun test searchByBarcode`

- [x] 6. Rewrite barcodeService.ts — Deduplicate, delete fetchProductDetails, wire new fallback chain

  **What to do**:
  - **DELETE** `fetchProductDetails()` function entirely (lines 210-254) — it's a duplicate OFF call
  - **Rewrite** `lookupProduct()` (lines ~143-200) to:
    - Import `normalizeBarcode` from `@/utils/countryMapping`
    - Call `normalizeBarcode(barcode)` first — early return `null` if result is `null`
    - Call the rewritten `searchByBarcode(normalizedBarcode)` from `freeNutritionAPIs.ts` (Task 5)
    - Map `BarcodeSearchResult` to `ScannedProduct` interface, adding new fields:
      ```typescript
      nutriScore?: string;      // "a" through "e"
      novaGroup?: number;       // 1-4
      isAIEstimated?: boolean;  // true when Gemini provided data
      gs1Country?: string;      // "India", "USA", etc.
      needsNutritionEstimate?: boolean; // true when only name/brand found
      ```
    - If `needsNutritionEstimate` is true, set it on the result (Task 7's Gemini estimation handles this downstream in barcode-handlers.ts)
    - Remove the second call to `fetchProductDetails()` that was duplicating the OFF call
  - Update the `ScannedProduct` type (or extend it) in the appropriate types file to include the new fields
  - Ensure all callers of `lookupProduct()` still work (primary caller: `barcode-handlers.ts` — rewritten in Task 8)

  **Must NOT do**:
  - Do NOT keep `fetchProductDetails()` — delete it entirely
  - Do NOT add a new API call here — the fallback chain lives in `freeNutritionAPIs.ts`
  - Do NOT modify `searchByBarcode()` — that's Task 5's responsibility
  - Do NOT use `as any` to bridge type mismatches

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity — type mapping between two interfaces, deletion of dead code, ensuring callers work
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser — service code
    - `frontend-ui-ux`: No UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9)
  - **Blocks**: Task 12 (integration tests need the rewritten service)
  - **Blocked By**: Task 5 (needs the new `searchByBarcode` and `BarcodeSearchResult` type)

  **References**:

  **Pattern References**:
  - `src/services/barcodeService.ts:143-165` — Current `lookupProduct()`. Read to understand the full flow and what it returns. REWRITE this function.
  - `src/services/barcodeService.ts:210-254` — `fetchProductDetails()`. Read to confirm it's a duplicate, then DELETE it.
  - `src/services/barcodeService.ts:1-30` — Imports and type definitions at top. Update imports to include `normalizeBarcode`.

  **API/Type References**:
  - `src/services/freeNutritionAPIs.ts` (Task 5) — The new `BarcodeSearchResult` interface and rewritten `searchByBarcode()` function. Map FROM this type.
  - `src/types/diet/scanning.ts` — `RecognizedFood` type. The `ScannedProduct` must remain compatible with this downstream type.
  - `src/hooks/ai-meal-generation/barcode-handlers.ts:97` — The `as any` cast indicates a type mismatch between `ScannedProduct` and `RecognizedFood`. Adding the new fields should help resolve this in Task 8.

  **WHY Each Reference Matters**:
  - `barcodeService.ts:143-165`: The function to rewrite — executor must understand current logic to simplify it
  - `barcodeService.ts:210-254`: Must confirm this is the duplicate before deleting (both call same OFF endpoint)
  - `BarcodeSearchResult`: Source type to map FROM — executor needs exact field names
  - `RecognizedFood`: Downstream type — ensures compatibility after type changes

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: barcodeService compiles without errors after rewrite
    Tool: Bash
    Preconditions: barcodeService.ts rewritten, freeNutritionAPIs.ts (Task 5) complete
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify zero errors in barcodeService.ts
      3. Verify zero errors in files that import from barcodeService
    Expected Result: Clean TypeScript compilation
    Failure Indicators: Type errors, missing exports, incompatible types
    Evidence: .sisyphus/evidence/task-6-tsc-check.txt

  Scenario: fetchProductDetails is deleted
    Tool: Bash (grep)
    Preconditions: barcodeService.ts modified
    Steps:
      1. Search barcodeService.ts for "fetchProductDetails"
      2. Verify zero matches (function deleted, no references remain)
    Expected Result: Function completely removed
    Failure Indicators: Function still exists, or references to it remain
    Evidence: .sisyphus/evidence/task-6-no-duplicate.txt

  Scenario: lookupProduct calls searchByBarcode only once
    Tool: Bash (grep)
    Preconditions: barcodeService.ts rewritten
    Steps:
      1. Search barcodeService.ts for "searchByBarcode" calls
      2. Verify exactly ONE call in lookupProduct
      3. Verify no call to fetchProductDetails
    Expected Result: Single call to searchByBarcode, no duplicate
    Failure Indicators: Multiple searchByBarcode calls, or fetchProductDetails reference
    Evidence: .sisyphus/evidence/task-6-single-call.txt
  ```

  **Commit**: YES
  - Message: `refactor(barcode): deduplicate barcodeService and wire new fallback chain`
  - Files: `src/services/barcodeService.ts`, type files if modified
  - Pre-commit: `bun test`

- [x] 7. Add Gemini AI nutrition estimation fallback

  **What to do**:
  - **TDD — Write test FIRST** for the Gemini estimation function:
    - Test: Given product name "Parle-G" + brand "Parle" → returns estimated nutrition with confidence ≤40
    - Test: Gemini returns malformed JSON → returns null gracefully
    - Test: Gemini API timeout → returns null gracefully
    - Test: All API keys exhausted → returns null gracefully
    - Test: Response includes `isAIEstimated: true` flag
    - Test: Response includes `source: "gemini-estimation"`
  - **Then implement** a new function `estimateNutritionWithAI(productName: string, brand: string, gs1Country: string): Promise<BarcodeSearchResult | null>` in `src/services/freeNutritionAPIs.ts`:
    - Use existing Gemini key rotation pattern from the codebase (23 keys: `EXPO_PUBLIC_GEMINI_API_KEY` through `EXPO_PUBLIC_GEMINI_API_KEY_23`)
    - Construct a prompt: "Estimate the nutritional information per 100g for the product: {productName} by {brand} from {gs1Country}. Return JSON with: calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg. Also provide a confidence score 0-100."
    - Use Gemini's structured output / JSON mode if available, otherwise parse JSON from response
    - Set `confidence` from Gemini's self-reported confidence (cap at 40 if higher — Metis guardrail)
    - Set `isAIEstimated: true`, `source: "gemini-estimation"`, `needsNutritionEstimate: false` (AI provided the estimate)
    - On ANY error: `console.warn('[estimateNutritionWithAI] failed:', error)` and return `null`
    - 10s timeout for Gemini call (longer than 5s for OFF/UPCitemdb because AI inference is slower)
  - **Wire it into the searchByBarcode fallback chain** (modify the Task 5 implementation):
    - After UPCitemdb (or after OFF for 890/880 prefix): if we have a product name but no nutrition, call `estimateNutritionWithAI(name, brand, gs1Country)`
    - If we have NO product name at all: call `estimateNutritionWithAI` with the barcode itself as product name (low confidence, but better than nothing)
  - Export `estimateNutritionWithAI` for testing

  **Must NOT do**:
  - Do NOT hardcode any API keys — use environment variables from app.config.js
  - Do NOT set confidence above 40 for AI estimates (Metis guardrail)
  - Do NOT use `as any` — define proper Gemini response types
  - Do NOT add Gemini as a paid dependency — it's already in the project

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: AI integration with structured output parsing, error handling, key rotation, and fallback chain wiring — complex
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser — backend AI call
    - `frontend-ui-ux`: No UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9)
  - **Blocks**: Task 12 (integration tests cover the full chain including AI)
  - **Blocked By**: Task 3 (needs `getCountryFromBarcode` for gs1Country)

  **References**:

  **Pattern References**:
  - `src/services/freeNutritionAPIs.ts` (Task 5 output) — The `searchByBarcode` function and `BarcodeSearchResult` type. Wire Gemini estimation as Step 3 in the fallback chain.
  - `app.config.js:148+` — Gemini API key environment variables (`EXPO_PUBLIC_GEMINI_API_KEY` through `_23`). Read to understand the key naming pattern for rotation.
  
  **API/Type References**:
  - Search codebase for existing Gemini API call patterns — there's likely an existing `callGeminiAPI` or similar helper. REUSE it rather than creating a new one.
  - `src/utils/countryMapping.ts` (Task 3) — `getCountryFromBarcode()` for gs1Country enrichment.
  - `BarcodeSearchResult` interface (Task 5) — Return type to match.

  **External References**:
  - Gemini API: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}`
  - Request body with JSON schema for structured output
  - Existing Gemini usage in the codebase (search for `generativelanguage.googleapis.com` to find patterns)

  **WHY Each Reference Matters**:
  - Existing Gemini patterns: Must reuse the same key rotation and API call structure — don't reinvent
  - `app.config.js:148+`: Key naming tells executor how to iterate through available keys
  - `BarcodeSearchResult`: AI estimation must return the same type as OFF/UPCitemdb results

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Tests added to `src/__tests__/services/barcode/searchByBarcode.test.ts` (extend file from Task 5)
  - [ ] `bun test searchByBarcode` → RED for new Gemini tests
  - [ ] Implementation added to `src/services/freeNutritionAPIs.ts`
  - [ ] `bun test searchByBarcode` → GREEN (all tests pass including new Gemini ones)

  **QA Scenarios:**

  ```
  Scenario: Gemini estimates nutrition for known Indian product
    Tool: Bash (bun test)
    Preconditions: Gemini estimation function implemented, test mocks Gemini API response
    Steps:
      1. Run `bun test searchByBarcode -- --verbose`
      2. Find test: "Gemini estimates nutrition for Parle-G"
      3. Verify result has source="gemini-estimation", isAIEstimated=true, confidence≤40
      4. Verify nutrition data (calories, protein, carbs, fat) present
    Expected Result: AI estimation returns structured nutrition data with low confidence
    Failure Indicators: Missing nutrition fields, confidence>40, isAIEstimated=false
    Evidence: .sisyphus/evidence/task-7-gemini-success.txt

  Scenario: Gemini failure returns null gracefully
    Tool: Bash (bun test)
    Preconditions: Test mocks Gemini to return malformed response
    Steps:
      1. Run `bun test searchByBarcode -- --verbose`
      2. Find test: "Gemini malformed JSON returns null"
      3. Verify function returns null without throwing
      4. Verify console.warn was called
    Expected Result: null returned, no unhandled exceptions
    Failure Indicators: Thrown error, unhandled promise rejection, no console.warn
    Evidence: .sisyphus/evidence/task-7-gemini-failure.txt
  ```

  **Commit**: YES
  - Message: `feat(barcode): add Gemini AI nutrition estimation fallback`
  - Files: `src/services/freeNutritionAPIs.ts`, `src/__tests__/services/barcode/searchByBarcode.test.ts`
  - Pre-commit: `bun test searchByBarcode`

- [x] 8. Fix barcode-handlers.ts — Type safety, double-modal bug, loading, AI disclaimer routing

  **What to do**:
  - **Fix the `as any` cast on line 97**: Replace with proper type mapping between `ScannedProduct` (from barcodeService) and `RecognizedFood` (from types). Create an explicit mapping function `mapScannedProductToRecognizedFood(product: ScannedProduct): RecognizedFood` that correctly maps all fields.
  - **Fix double-modal bug (lines 38-44)**: Currently line 38 shows the ProductDetailsModal AND lines 40-44 show an Alert that ALSO shows the modal. Remove the Alert — keep only the modal display.
  - **Add AI estimation routing**: After `lookupProduct()` returns, check `needsNutritionEstimate`:
    - If `true` and product has name/brand: call `estimateNutritionWithAI()` from Task 7
    - Merge AI nutrition into the product result
    - Set `isAIEstimated: true` on the merged result
  - **Pass `isAIEstimated` to ProductDetailsModal** so it can show the disclaimer (Task 11 handles the UI)
  - **Ensure loading state is properly managed**: `isProcessingBarcode` should be `true` during the entire lookup chain (OFF → UPCitemdb → Gemini), and `false` when done or on error
  - **Add `gs1Country` to the result** passed to the modal for display

  **Must NOT do**:
  - Do NOT modify health-assessment.ts
  - Do NOT use `as any` or `@ts-ignore` — fix types properly
  - Do NOT add new Alert calls — use only the modal for product display
  - Do NOT change the function signature of `handleBarcodeScanned` exported interface

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple bug fixes + type refactoring + wiring AI estimation — moderate complexity with several concerns
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser — hook logic
    - `frontend-ui-ux`: No visual changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9)
  - **Blocks**: Tasks 10, 11, 12 (DietScreen wiring, modal updates, and integration tests all depend on handler fixes)
  - **Blocked By**: Tasks 3 (countryMapping for gs1Country), 5 (new searchByBarcode return type)

  **References**:

  **Pattern References**:
  - `src/hooks/ai-meal-generation/barcode-handlers.ts:97` — The `as any` cast. Read surrounding code to understand the type mismatch between ScannedProduct and RecognizedFood.
  - `src/hooks/ai-meal-generation/barcode-handlers.ts:38-44` — Double-modal bug. Line 38 sets modal state, lines 40-44 show Alert that also triggers modal. DELETE the Alert.
  - `src/hooks/ai-meal-generation/barcode-handlers.ts:1-30` — Imports and state setup. Understand what state variables exist (`isProcessingBarcode`, etc.)

  **API/Type References**:
  - `src/types/diet/scanning.ts` — `RecognizedFood` type. The TARGET type that `ScannedProduct` must map to.
  - `src/services/barcodeService.ts` (Task 6 output) — Updated `ScannedProduct` with new fields (nutriScore, novaGroup, isAIEstimated, gs1Country, needsNutritionEstimate).
  - `src/services/freeNutritionAPIs.ts` (Task 7 output) — `estimateNutritionWithAI()` function to call when `needsNutritionEstimate` is true.
  - `src/hooks/ai-meal-generation/types.ts` — `HealthAssessment` type for context.

  **WHY Each Reference Matters**:
  - `barcode-handlers.ts:97`: The `as any` is the type bug — executor must understand both sides of the mismatch to create proper mapping
  - `barcode-handlers.ts:38-44`: Must read to confirm the double-modal pattern and know which line to remove
  - `RecognizedFood` vs `ScannedProduct`: Understanding both types is required to write `mapScannedProductToRecognizedFood`
  - `estimateNutritionWithAI`: Must know the function signature to call it correctly

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: No 'as any' in barcode-handlers.ts
    Tool: Bash (grep)
    Preconditions: barcode-handlers.ts modified
    Steps:
      1. Search barcode-handlers.ts for "as any"
      2. Verify zero matches
    Expected Result: Zero "as any" occurrences
    Failure Indicators: Any "as any" found
    Evidence: .sisyphus/evidence/task-8-no-as-any.txt

  Scenario: No Alert in barcode-handlers.ts (double-modal fix)
    Tool: Bash (grep)
    Preconditions: barcode-handlers.ts modified
    Steps:
      1. Search barcode-handlers.ts for "Alert.alert" or "Alert,"
      2. Verify zero matches (Alert import should also be removed if unused)
    Expected Result: No Alert references in the file
    Failure Indicators: Alert still imported or called
    Evidence: .sisyphus/evidence/task-8-no-alert.txt

  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: barcode-handlers.ts modified, Tasks 5-7 complete
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify zero errors in barcode-handlers.ts and its dependents
    Expected Result: Clean compilation
    Failure Indicators: Type errors in mapping function or import mismatches
    Evidence: .sisyphus/evidence/task-8-tsc-check.txt
  ```

  **Commit**: YES
  - Message: `fix(barcode): type safety, double-modal fix, AI disclaimer in handlers`
  - Files: `src/hooks/ai-meal-generation/barcode-handlers.ts`
  - Pre-commit: `bun test`

- [x] 9. Create ManualBarcodeEntry.tsx component

  **What to do**:
  - Create `src/components/diet/ManualBarcodeEntry.tsx`:
    - Text input field for barcode number (numeric keyboard, max 13 digits)
    - "Look Up" button that calls `lookupProduct(barcode)` from barcodeService
    - Loading spinner while looking up
    - Error state: "Product not found" with retry option
    - GS1 country hint: Show detected country from barcode prefix as user types (e.g., "India 🇮🇳" for 890...)
    - Input validation: Only accept numeric characters, min 8 digits, max 13 digits
    - Clear button to reset input
  - Follow existing component patterns in `src/components/diet/` directory
  - Use existing theme/colors from the app (check DietScreen or other diet components for color tokens)
  - Make it a controlled component that accepts `onProductFound(product: ScannedProduct)` callback
  - Also accept `onClose()` callback for dismissal

  **Must NOT do**:
  - Do NOT add navigation — this is a modal/panel component, not a screen
  - Do NOT over-style — match existing app aesthetic
  - Do NOT add barcode scanning camera here — this is MANUAL entry only
  - Do NOT use external form libraries — plain React Native TextInput

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with input, loading states, validation feedback — needs visual polish
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component needs proper UX for input validation, loading, error states, and country hint
  - **Skills Evaluated but Omitted**:
    - `playwright`: React Native component — can't test in browser

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Task 10 (DietScreen needs to wire this component)
  - **Blocked By**: None (pure UI component, can mock the service call for development)

  **References**:

  **Pattern References**:
  - `src/components/diet/BarcodeScannerPanel.tsx` — Existing barcode-related UI component. Follow its style, imports, and structure for consistency.
  - `src/components/diet/FoodRecognitionPanel.tsx` — Another diet panel component. Shows the app's pattern for loading states and callbacks.
  - `src/screens/main/DietScreen.tsx:1-50` — Imports and theme usage. Shows which color/style tokens the diet section uses.

  **API/Type References**:
  - `src/services/barcodeService.ts` (Task 6 output) — `lookupProduct(barcode: string): Promise<ScannedProduct | null>`. Call this on "Look Up" press.
  - `src/utils/countryMapping.ts` (Task 3) — `getCountryFromBarcode(barcode: string): string`. Call this as user types to show country hint.

  **WHY Each Reference Matters**:
  - `BarcodeScannerPanel.tsx`: Closest existing component — executor should match its structure and style
  - `FoodRecognitionPanel.tsx`: Shows loading state pattern used in the diet section
  - `DietScreen.tsx`: Shows theme tokens and import patterns to follow
  - `lookupProduct`: The function to call — executor needs the signature
  - `getCountryFromBarcode`: For the live country hint as user types

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Component compiles without errors
    Tool: Bash
    Preconditions: ManualBarcodeEntry.tsx created
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify zero errors in ManualBarcodeEntry.tsx
    Expected Result: Clean compilation
    Failure Indicators: Import errors, type mismatches, missing props
    Evidence: .sisyphus/evidence/task-9-tsc-check.txt

  Scenario: Component has correct prop interface
    Tool: Bash (grep)
    Preconditions: ManualBarcodeEntry.tsx created
    Steps:
      1. Search for "onProductFound" prop in the component
      2. Search for "onClose" prop
      3. Verify both are in the Props interface/type
    Expected Result: Both callbacks present in props
    Failure Indicators: Missing callbacks, wrong signature
    Evidence: .sisyphus/evidence/task-9-props-check.txt
  ```

  **Commit**: YES
  - Message: `feat(barcode): add ManualBarcodeEntry component`
  - Files: `src/components/diet/ManualBarcodeEntry.tsx`
  - Pre-commit: `bun test`

- [x] 10. Wire DietScreen — Manual barcode entry button + loading indicator

  **What to do**:
  - Import `ManualBarcodeEntry` from Task 9
  - Add a "Manual Entry" button/option near the existing barcode scanner trigger in DietScreen
  - Wire it to show `ManualBarcodeEntry` component (as a modal or bottom sheet — match existing pattern)
  - Add a loading overlay/spinner that reads `isProcessingBarcode` state:
    - Find where `isProcessingBarcode` is set in the barcode flow
    - Add UI that shows when this state is `true`: a semi-transparent overlay with spinner and "Looking up product..." text
  - Connect `ManualBarcodeEntry.onProductFound` to the same product display flow as camera scanning (should show ProductDetailsModal)
  - Connect `ManualBarcodeEntry.onClose` to dismiss the manual entry UI

  **Must NOT do**:
  - Do NOT restructure DietScreen layout
  - Do NOT modify the existing camera scanner trigger
  - Do NOT add new screens/navigation — keep it in the DietScreen as modal/panel
  - Do NOT change the DietModals orchestration pattern

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Wiring existing components together with state management — moderate complexity
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: Minor UI additions, not visual design work
    - `playwright`: React Native — can't test in browser

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12)
  - **Blocks**: Task 12 (integration tests need the full wired flow)
  - **Blocked By**: Tasks 8 (handler fixes), 9 (ManualBarcodeEntry component)

  **References**:

  **Pattern References**:
  - `src/screens/main/DietScreen.tsx:1-100` — Current screen structure, imports, and state. Add new imports and state here.
  - `src/screens/main/DietScreen.tsx` — Search for "barcode" or "scanner" to find where the camera trigger is. Place "Manual Entry" button near it.
  - `src/components/diet/DietModals.tsx` — Modal orchestration. Understand how modals are shown/hidden to follow the same pattern for ManualBarcodeEntry.
  - `src/components/diet/DietQuickActions.tsx` — Quick action buttons. If manual entry should be a quick action, check this component's pattern.

  **API/Type References**:
  - `src/components/diet/ManualBarcodeEntry.tsx` (Task 9) — Props interface: `{ onProductFound: (product: ScannedProduct) => void; onClose: () => void }`
  - `src/hooks/ai-meal-generation/barcode-handlers.ts` (Task 8 output) — `isProcessingBarcode` state variable. This is the loading flag to read for the spinner.

  **WHY Each Reference Matters**:
  - `DietScreen.tsx`: Must understand current layout to add button/spinner in the right place
  - `DietModals.tsx`: Must follow existing modal pattern — don't introduce a new pattern
  - `ManualBarcodeEntry.tsx`: Executor needs exact prop interface to wire correctly
  - `isProcessingBarcode`: The existing state flag — don't create a new one

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: DietScreen compiles with ManualBarcodeEntry wired
    Tool: Bash
    Preconditions: DietScreen.tsx modified, ManualBarcodeEntry.tsx exists
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify zero errors in DietScreen.tsx
    Expected Result: Clean compilation
    Failure Indicators: Import errors, type mismatches, missing state
    Evidence: .sisyphus/evidence/task-10-tsc-check.txt

  Scenario: Loading indicator reads isProcessingBarcode
    Tool: Bash (grep)
    Preconditions: DietScreen.tsx modified
    Steps:
      1. Search DietScreen.tsx for "isProcessingBarcode"
      2. Verify it's used in a conditional render (ActivityIndicator or similar)
      3. Verify there's a loading text like "Looking up product"
    Expected Result: Loading indicator present and reads the correct state
    Failure Indicators: isProcessingBarcode not referenced, no loading UI
    Evidence: .sisyphus/evidence/task-10-loading-indicator.txt

  Scenario: ManualBarcodeEntry is importable and referenced
    Tool: Bash (grep)
    Preconditions: DietScreen.tsx modified
    Steps:
      1. Search DietScreen.tsx for "ManualBarcodeEntry"
      2. Verify it's imported and rendered conditionally
      3. Verify onProductFound and onClose props are passed
    Expected Result: Component imported, rendered, and callbacks wired
    Failure Indicators: Not imported, missing props, not rendered
    Evidence: .sisyphus/evidence/task-10-manual-entry-wired.txt
  ```

  **Commit**: YES
  - Message: `feat(diet): wire manual entry and loading indicator to DietScreen`
  - Files: `src/screens/main/DietScreen.tsx`
  - Pre-commit: `bun test`

- [x] 11. ProductDetailsModal — AI disclaimer banner + Nutri-Score + NOVA group display

  **What to do**:
  - **AI Disclaimer Banner**: When `isAIEstimated` is `true` on the product:
    - Show a prominent yellow/amber banner at the top of the modal: "⚠️ Nutrition data estimated by AI. Values may not be accurate. Verify with product packaging."
    - Style: amber background (#FFF3CD), dark text (#856404), rounded corners, icon
  - **Nutri-Score Display**: When `nutriScore` is present (a-e):
    - Show Nutri-Score badge with correct color: A=#038141, B=#85BB2F, C=#FECB02, D=#EE8100, E=#E63E11
    - Display as a colored badge with the letter (e.g., green badge with "A")
    - Place near the product name/header area
  - **NOVA Group Display**: When `novaGroup` is present (1-4):
    - Show NOVA classification: 1="Unprocessed", 2="Processed culinary", 3="Processed", 4="Ultra-processed"
    - Display as a text label with appropriate color coding (1=green, 4=red)
    - Place near Nutri-Score
  - **GS1 Country**: When `gs1Country` is present:
    - Show "Origin: {country}" text near the product info section
  - Follow existing modal styling in `ProductDetailsModal.tsx`

  **Must NOT do**:
  - Do NOT restructure the entire modal layout — add elements to existing structure
  - Do NOT remove any existing modal content
  - Do NOT add new dependencies for badge/score components
  - Do NOT make the AI disclaimer dismissible — it must always show for AI-estimated products

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Visual UI enhancements — color-coded badges, banners, styling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Nutri-Score badges and AI disclaimer need proper visual design
  - **Skills Evaluated but Omitted**:
    - `playwright`: React Native — can't test in browser
    - `deep`: Straightforward UI, no complex logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 12)
  - **Blocks**: Task 12 (integration tests check modal content)
  - **Blocked By**: Task 8 (handlers must pass isAIEstimated, nutriScore, novaGroup, gs1Country to modal)

  **References**:

  **Pattern References**:
  - `src/components/diet/ProductDetailsModal.tsx:1-50` — Current imports, props interface. Add new props (isAIEstimated, nutriScore, novaGroup, gs1Country) or read them from the product object.
  - `src/components/diet/ProductDetailsModal.tsx:50-150` — Modal header area. Place Nutri-Score and NOVA badges near here.
  - `src/components/diet/ProductDetailsModal.tsx:150-300` — Nutrition display area. Place AI disclaimer banner ABOVE this section.

  **External References**:
  - Nutri-Score colors: A=#038141 (dark green), B=#85BB2F (light green), C=#FECB02 (yellow), D=#EE8100 (orange), E=#E63E11 (red)
  - NOVA groups: 1="Unprocessed or minimally processed", 2="Processed culinary ingredients", 3="Processed foods", 4="Ultra-processed foods"
  - AI disclaimer styling: Amber background #FFF3CD, text #856404 (Bootstrap warning pattern)

  **WHY Each Reference Matters**:
  - `ProductDetailsModal.tsx:1-50`: Executor needs to understand the current prop interface to add new data
  - `ProductDetailsModal.tsx:50-150`: Where to place the badges — near the product header
  - Nutri-Score colors: Exact hex codes are required — don't approximate
  - NOVA labels: Exact text descriptions for each group

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: AI disclaimer banner renders for AI-estimated products
    Tool: Bash (grep)
    Preconditions: ProductDetailsModal.tsx modified
    Steps:
      1. Search ProductDetailsModal.tsx for "Estimated by AI" or "estimated by AI"
      2. Verify conditional render checks isAIEstimated
      3. Verify amber/yellow background color (#FFF3CD) is applied
    Expected Result: Disclaimer text and styling present, conditional on isAIEstimated
    Failure Indicators: No disclaimer text, no conditional check, wrong color
    Evidence: .sisyphus/evidence/task-11-ai-disclaimer.txt

  Scenario: Nutri-Score badge uses correct colors
    Tool: Bash (grep)
    Preconditions: ProductDetailsModal.tsx modified
    Steps:
      1. Search for "#038141" (Nutri-Score A color) in the file
      2. Search for "#E63E11" (Nutri-Score E color)
      3. Verify all 5 colors present (A through E)
      4. Verify nutriScore is rendered conditionally
    Expected Result: All 5 Nutri-Score colors present, conditional on nutriScore field
    Failure Indicators: Missing colors, hardcoded single color, not conditional
    Evidence: .sisyphus/evidence/task-11-nutriscore-colors.txt

  Scenario: NOVA group labels are correct
    Tool: Bash (grep)
    Preconditions: ProductDetailsModal.tsx modified
    Steps:
      1. Search for "Ultra-processed" in the file
      2. Search for "Unprocessed" in the file
      3. Verify NOVA labels map: 1→Unprocessed, 2→Processed culinary, 3→Processed, 4→Ultra-processed
    Expected Result: All 4 NOVA labels present with correct group mapping
    Failure Indicators: Missing labels, wrong group numbers, no NOVA section
    Evidence: .sisyphus/evidence/task-11-nova-labels.txt

  Scenario: TypeScript compiles cleanly
    Tool: Bash
    Preconditions: ProductDetailsModal.tsx modified
    Steps:
      1. Run `npx tsc --noEmit`
      2. Verify zero errors in ProductDetailsModal.tsx
    Expected Result: Clean compilation
    Failure Indicators: Type errors for new props/fields
    Evidence: .sisyphus/evidence/task-11-tsc-check.txt
  ```

  **Commit**: YES
  - Message: `feat(diet): add AI disclaimer banner, Nutri-Score, NOVA to ProductDetailsModal`
  - Files: `src/components/diet/ProductDetailsModal.tsx`
  - Pre-commit: `bun test`

- [x] 12. Integration tests — End-to-end barcode flow (≥10 test cases)

  **What to do**:
  - Create `src/__tests__/services/barcode/integration.test.ts`
  - Test the FULL flow from barcode input through to result:
    1. **Happy path — EAN-13 found on OFF**: Barcode "3017620422003" (Nutella) → OFF returns full data → result has nutrition, nutriScore, novaGroup
    2. **Happy path — Indian product found on OFF**: Barcode "8901234567890" → OFF returns data → gs1Country="India"
    3. **Fallback — OFF miss, UPCitemdb hit**: Non-890 barcode, OFF returns status:0, UPCitemdb returns name/brand → result has `needsNutritionEstimate: true`
    4. **Fallback — OFF miss, UPCitemdb miss, Gemini estimates**: Both APIs fail, Gemini returns estimate → result has `isAIEstimated: true`, `source: "gemini-estimation"`
    5. **Fallback — Everything fails**: All APIs fail → returns null
    6. **UPC-A normalization**: 12-digit barcode "012345678905" → zero-padded to 13 → looked up correctly
    7. **Cache hit**: Same barcode looked up twice → second call returns cached result, fetch called only once
    8. **Indian barcode skips UPCitemdb**: 890 prefix → OFF fails → skips UPCitemdb → goes to Gemini
    9. **Non-product barcode rejected**: QR code type → rejected before any API call
    10. **OFF timeout → fallback**: OFF takes >5s → falls through to UPCitemdb
  - Mock `global.fetch` at the integration level — simulate different API responses
  - Each test should verify:
    - Correct source string in result
    - Correct needsNutritionEstimate/isAIEstimated flags
    - Correct gs1Country
    - No unhandled exceptions

  **Must NOT do**:
  - Do NOT make real network calls — mock everything
  - Do NOT test individual functions in isolation (that's unit tests in Tasks 3, 5, 7)
  - Do NOT use `as any` for mock data — type everything properly
  - Do NOT skip negative/error test cases

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration tests covering complex multi-step flows with mocked APIs — requires careful orchestration of mocks
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Unit test file — not browser testing
    - `frontend-ui-ux`: Test code — no UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11)
  - **Blocks**: F1-F4 (final verification wave)
  - **Blocked By**: Tasks 6 (barcodeService rewrite), 7 (Gemini estimation), 8 (handler fixes)

  **References**:

  **Pattern References**:
  - `src/__tests__/services/barcode/searchByBarcode.test.ts` (Task 5) — Unit test patterns for barcode tests. Follow the same mock fetch setup, assertion patterns, and file structure.
  - `src/__tests__/services/barcode/countryMapping.test.ts` (Task 3) — Test file structure in the barcode test directory.

  **API/Type References**:
  - `src/services/barcodeService.ts` (Task 6) — `lookupProduct(barcode: string): Promise<ScannedProduct | null>`. This is the entry point for integration tests.
  - `src/services/freeNutritionAPIs.ts` (Tasks 5, 7) — `searchByBarcode()` and `estimateNutritionWithAI()`. The internal chain being tested.
  - `src/utils/countryMapping.ts` (Task 3) — `normalizeBarcode()`, `getCountryFromBarcode()`, `isProductBarcode()`. Used internally.

  **External References**:
  - OFF v2 response shape: `{ status: 0|1, product: { product_name, brands, nutriments: { energy-kcal_100g, proteins_100g, ... }, nutrition_grades, nova_group, ... } }`
  - UPCitemdb response shape: `{ items: [{ title, brand, images: [...] }] }`
  - Gemini response shape: `{ candidates: [{ content: { parts: [{ text: '{"calories":...}' }] } }] }`

  **WHY Each Reference Matters**:
  - `searchByBarcode.test.ts`: Executor should follow established mock patterns — don't invent new mocking approach
  - `lookupProduct`: This is the PUBLIC API being integration-tested — all tests call this
  - API response shapes: Executor needs exact JSON structure for mocks to be realistic

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file created: `src/__tests__/services/barcode/integration.test.ts`
  - [ ] `bun test integration` → PASS (≥10 tests, 0 failures)

  **QA Scenarios:**

  ```
  Scenario: All integration tests pass
    Tool: Bash (bun test)
    Preconditions: All Tasks 1-11 complete, integration test file created
    Steps:
      1. Run `bun test integration -- --verbose`
      2. Verify ≥10 tests pass
      3. Verify 0 failures
      4. Check each test name maps to one of the 10 scenarios listed above
    Expected Result: ≥10 tests pass, 0 failures
    Failure Indicators: Any test failure, fewer than 10 tests
    Evidence: .sisyphus/evidence/task-12-integration-tests.txt

  Scenario: Full test suite passes
    Tool: Bash (bun test)
    Preconditions: All tasks complete
    Steps:
      1. Run `bun test` (full suite)
      2. Verify total test count ≥25 (countryMapping + searchByBarcode + integration)
      3. Verify 0 failures across all test files
    Expected Result: ≥25 tests pass, 0 failures
    Failure Indicators: Any test failure, total count below 25
    Evidence: .sisyphus/evidence/task-12-full-suite.txt
  ```

  **Commit**: YES
  - Message: `test(barcode): add integration tests for end-to-end barcode flow`
  - Files: `src/__tests__/services/barcode/integration.test.ts`
  - Pre-commit: `bun test integration`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration. Test edge cases: empty state, invalid barcode, no network. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After | Message | Files | Pre-commit |
|-------|---------|-------|------------|
| T1 | `test(barcode): update jest mocks for CameraView and profileStore` | `jest.setup.js` | `bun test -- --passWithNoTests` |
| T2 | `fix(config): register expo-camera plugin for barcode scanning` | `app.config.js` | `npx expo config --type introspect` |
| T3 | `feat(barcode): add GS1 country mapping and barcode normalization with TDD` | `src/utils/countryMapping.ts`, `src/__tests__/services/barcode/countryMapping.test.ts` | `bun test countryMapping` |
| T4 | `fix(camera): normalize barcode types and reject non-product codes` | `src/components/advanced/Camera.tsx` | `bun test` |
| T5 | `feat(barcode): multi-API fallback chain with OFF v2, UPCitemdb, and TDD` | `src/services/freeNutritionAPIs.ts`, `src/__tests__/services/barcode/searchByBarcode.test.ts` | `bun test searchByBarcode` |
| T6 | `refactor(barcode): deduplicate barcodeService and wire new fallback chain` | `src/services/barcodeService.ts` | `bun test` |
| T7 | `feat(barcode): add Gemini AI nutrition estimation fallback` | `src/services/freeNutritionAPIs.ts` (or new file) | `bun test` |
| T8 | `fix(barcode): type safety, double-modal fix, AI disclaimer in handlers` | `src/hooks/ai-meal-generation/barcode-handlers.ts` | `bun test` |
| T9 | `feat(barcode): add ManualBarcodeEntry component` | `src/components/diet/ManualBarcodeEntry.tsx` | `bun test` |
| T10 | `feat(diet): wire manual entry and loading indicator to DietScreen` | `src/screens/main/DietScreen.tsx` | `bun test` |
| T11 | `feat(diet): add AI disclaimer banner, Nutri-Score, NOVA to ProductDetailsModal` | `src/components/diet/ProductDetailsModal.tsx` | `bun test` |
| T12 | `test(barcode): add integration tests for end-to-end barcode flow` | `src/__tests__/services/barcode/integration.test.ts` | `bun test integration` |

---

## Success Criteria

### Verification Commands
```bash
npx expo config --type introspect  # Expected: expo-camera in plugins array
bun test                           # Expected: ≥25 tests, 0 failures
bun test countryMapping            # Expected: GS1 + normalization tests pass
bun test searchByBarcode           # Expected: fallback chain tests pass
bun test integration               # Expected: end-to-end flow tests pass
```

### Final Checklist
- [x] All "Must Have" items implemented and verified
- [x] All "Must NOT Have" items absent from codebase
- [x] All tests pass (`bun test` — 0 failures)
- [x] Evidence files exist in `.sisyphus/evidence/` for all QA scenarios
- [x] No `as any`, `@ts-ignore`, or empty catches in modified files
- [x] Loading indicator visible during barcode lookup
- [x] AI disclaimer visible for estimated products
- [x] Nutri-Score and NOVA group displayed when available
- [x] Manual barcode entry accessible and functional
