# Android Barcode Audit

Date: 2026-03-25
Status: audit only, no production-code fixes in this delivery

Scope:
- Android barcode camera flow
- manual barcode entry
- product lookup and fallback classification
- label-scan handoff
- product-details modal/card UX
- Log Meal barcode entry and callback routing

Evidence bar:
- only issues backed by direct code proof, existing checked-in artifacts, or automated verification are included
- no issue is counted solely from user report or inference without code/test support

## Method

- Reviewed the live Diet barcode flow in:
  - `src/screens/main/DietScreen.tsx`
  - `src/hooks/useAIMealGeneration.ts`
  - `src/components/advanced/Camera.tsx`
  - `src/components/diet/ManualBarcodeEntry.tsx`
  - `src/components/diet/ProductDetailsModal.tsx`
  - `src/services/barcodeService.ts`
  - `src/services/freeNutritionAPIs.ts`
- Compared the live standalone hook with the parallel modular barcode flow under `src/hooks/ai-meal-generation/`.
- Ran the committed barcode service test baseline:
  - `npm test -- --runInBand src/__tests__/services/barcode/countryMapping.test.ts src/__tests__/services/barcode/searchByBarcode.test.ts src/__tests__/services/barcode/integration.test.ts`
  - Result: 48 tests passed across 3 suites.
  - Note: Jest reported open async handles after completion.

## Environment Notes

- `adb` is not installed in this environment, so no fresh Android device/emulator repro could be captured from this machine.
- The workspace is already heavily modified and dirty, so this delivery intentionally adds only this audit artifact.
- Existing checked-in screenshots cover Diet surfaces but do not include a current Android product-details modal capture, so modal findings below rely on direct code proof.

## Audit Matrix

| Flow | Status | Evidence |
| --- | --- | --- |
| Diet quick action -> Barcode | Confirmed issues | B-01, B-04, B-05 |
| Log Meal -> Barcode | Confirmed issues | B-01, B-03, B-04 |
| Same product repeated in one camera session | Confirmed issue | B-01 |
| Manual barcode entry parity | Confirmed issues | B-02, B-06, B-08 |
| Trusted barcode hit | No confirmed lookup-data defect in current evidence | Existing barcode service tests pass trusted OFF world and OFF India cases |
| Estimated barcode hit | Confirmed issue in Log Meal state handling | B-03 |
| Not found barcode | Confirmed issues | B-03, B-04, B-06 |
| Invalid barcode / malformed input | Confirmed issue | B-04 |
| Slow network / offline lookup | Confirmed issues | B-01, B-04 |
| Product details modal/card UX | Confirmed issues | B-07, B-08 |
| Label-scan handoff | No confirmed contract break in current evidence | Current code paths are internally consistent |
| Contribute Food fallback | Confirmed parity gap on manual entry | B-06 |

## Confirmed Findings

### B-01 High: Barcode camera closes before the lookup outcome is known

- Severity: High
- Exact flow:
  Diet -> Barcode scan, and Log Meal -> Barcode scan.
- Repro steps:
  1. Open the barcode camera.
  2. Present any decodable EAN/UPC code so the camera callback fires.
  3. Let the async product lookup continue.
- Expected:
  The scanner should stay active until the lookup is classified as trusted, estimated, not found, or transient failure, or it should offer an immediate retry/rescan path.
- Actual:
  The camera closes immediately on the first normalized barcode event, before lookup success or failure is known.
- Evidence type:
  Direct code proof.
- Suspected layer:
  Scanner/input orchestration.
- Fix direction:
  Keep the scanner open until a terminal lookup outcome is reached, or move to an explicit scanner state machine with retry/rescan support.
- Evidence:
  - [Camera.tsx](/D:/FitAi/FitAI/src/components/advanced/Camera.tsx#L134)
  - [Camera.tsx](/D:/FitAi/FitAI/src/components/advanced/Camera.tsx#L148)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L666)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L668)

### B-02 High: Manual barcode entry throws away its successful lookup result and performs a second lookup

- Severity: High
- Exact flow:
  Diet -> Barcode -> Enter Manually -> successful lookup.
- Repro steps:
  1. Enter a barcode that `ManualBarcodeEntry` can resolve.
  2. Observe the component already receives a concrete `ScannedProduct`.
  3. Observe the screen callback ignores that object and re-enters the generic barcode flow using only `product.barcode`.
- Expected:
  A successful manual lookup should use the already-resolved product object.
- Actual:
  The manual-entry success path does a second lookup, so the user can see a different result, a fresh miss, or a weaker result than the one already found.
- Evidence type:
  Direct code proof.
- Suspected layer:
  Manual-entry parity / orchestration.
- Fix direction:
  Route `ScannedProduct` directly into the shared product-modal path instead of re-querying by barcode.
- Evidence:
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L93)
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L97)
  - [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L325)
  - [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L329)

### B-03 High: Log Meal barcode callback state is not cleared on not-found or estimated-data exits

- Severity: High
- Exact flow:
  Log Meal -> Barcode -> barcode not found, or barcode found with estimated nutrition.
- Repro steps:
  1. Start the Log Meal barcode flow, which registers a callback in `logMealCallbackRef`.
  2. Scan a barcode that lands in the not-found alert branch or the estimated-data alert branch.
  3. Return to the diet surface and later scan another product from a non-Log-Meal barcode entry point.
- Expected:
  The Log Meal callback should be cleared on every terminal branch, not only on the trusted-product success path.
- Actual:
  The not-found and estimated-data branches return early without clearing the callback; a later scan can still be routed into stale Log Meal state.
- Evidence type:
  Direct code proof.
- Suspected layer:
  State machine / callback lifecycle.
- Fix direction:
  Clear `logMealCallbackRef` and the related camera-active bookkeeping on every terminal exit path.
- Evidence:
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L315)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L319)
  - [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L458)
  - [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L466)
  - [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L411)
  - [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L421)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L701)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L727)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L730)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L734)

### B-04 High: Lookup failures are collapsed into a single "scan label" outcome

- Severity: High
- Exact flow:
  Barcode lookup with invalid input, database failure, Open Food Facts failure, timeout, or genuine product miss.
- Repro steps:
  1. Follow the lookup chain from `lookupProduct()` into `searchByBarcode()`.
  2. Note that DB and OFF failures are logged and retried, but the service eventually returns the same "product not found" shape when no result is produced.
  3. Note that the live hook ignores `lookupResult.error` and always maps failure to label-scan guidance.
- Expected:
  Invalid scans, retryable infrastructure failures, weak data, and true not-found should be distinct outcomes.
- Actual:
  The lookup layer collapses multiple failure classes into one miss-like result, and the UI always responds with the same label-scan guidance.
- Evidence type:
  Direct code proof plus passing barcode baseline tests that cover trusted hits and true misses but not transient classification.
- Suspected layer:
  Lookup classification / UI mapping.
- Fix direction:
  Replace the current boolean-style contract with explicit outcomes such as `invalid_scan`, `not_found`, `weak_data`, and `transient_failure`, and map UI separately.
- Evidence:
  - [barcodeService.ts](/D:/FitAi/FitAI/src/services/barcodeService.ts#L152)
  - [barcodeService.ts](/D:/FitAi/FitAI/src/services/barcodeService.ts#L299)
  - [freeNutritionAPIs.ts](/D:/FitAi/FitAI/src/services/freeNutritionAPIs.ts#L489)
  - [freeNutritionAPIs.ts](/D:/FitAi/FitAI/src/services/freeNutritionAPIs.ts#L549)
  - [freeNutritionAPIs.ts](/D:/FitAi/FitAI/src/services/freeNutritionAPIs.ts#L631)
  - [freeNutritionAPIs.ts](/D:/FitAi/FitAI/src/services/freeNutritionAPIs.ts#L662)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L671)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L690)

### B-05 Medium: Barcode entry-point policy is inconsistent across the live and modular hooks

- Severity: Medium
- Exact flow:
  Any surface using the live standalone hook versus the parallel modular barcode flow.
- Repro steps:
  1. Compare the active `useAIMealGeneration` barcode flow with `src/hooks/ai-meal-generation/`.
  2. Note that the live hook opens barcode scan with no barcode quota gate and no barcode usage increment.
  3. Note that the same live hook uses `barcode_scan` gating for food-photo capture and increments usage for label scan.
  4. Note that the modular hook separately gates plain barcode scan.
- Expected:
  One canonical scan-policy contract for barcode camera, manual fallback, label scan, and usage tracking.
- Actual:
  Behavior depends on which hook tree is wired, which makes barcode entry points non-deterministic to maintain and test.
- Evidence type:
  Direct code proof.
- Suspected layer:
  Duplicated orchestration / policy split.
- Fix direction:
  Consolidate to one live barcode flow and one quota/usage policy contract.
- Evidence:
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L454)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L486)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L1059)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L1198)
  - [index.ts](/D:/FitAi/FitAI/src/hooks/ai-meal-generation/index.ts#L96)
  - [barcode-handlers.ts](/D:/FitAi/FitAI/src/hooks/ai-meal-generation/barcode-handlers.ts#L76)
  - [barcode-handlers.ts](/D:/FitAi/FitAI/src/hooks/ai-meal-generation/barcode-handlers.ts#L78)

### B-06 Medium: Manual entry is not parity with the scanner on supported formats or not-found recovery

- Severity: Medium
- Exact flow:
  Diet -> Barcode -> Enter Manually.
- Repro steps:
  1. Attempt to enter a format the lookup layer accepts but the UI does not fully support, such as a 14-digit ITF-14 or a 6-digit UPC-E.
  2. Observe that the field hard-caps at 13 digits and the hint only advertises 8-13 digits.
  3. For a miss, observe that manual entry offers only a retry path instead of the scanner's label-scan or Contribute Product recovery options.
- Expected:
  Manual entry should accept the same supported barcode formats as the lookup contract and should expose the same not-found recovery options as camera scan.
- Actual:
  The manual-entry UI narrows the format contract and has a weaker recovery path than barcode scan.
- Evidence type:
  Direct code proof.
- Suspected layer:
  Manual-entry parity / recovery UX.
- Fix direction:
  Align manual-entry validation with `normalizeBarcode()` and reuse the shared not-found recovery CTA set.
- Evidence:
  - [countryMapping.ts](/D:/FitAi/FitAI/src/utils/countryMapping.ts#L486)
  - [countryMapping.ts](/D:/FitAi/FitAI/src/utils/countryMapping.ts#L505)
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L147)
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L148)
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L180)
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L183)
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L187)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L673)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L689)

### B-07 Medium: Product details modal is not Android keyboard-safe

- Severity: Medium
- Exact flow:
  Open a product details card and edit the grams input on Android.
- Repro steps:
  1. Open `ProductDetailsModal`.
  2. Focus the footer grams input.
  3. Observe that the input lives in a fixed footer outside the `ScrollView`, while Android keyboard avoidance is disabled in the modal wrapper.
- Expected:
  The amount input and footer actions should remain visible and reachable when the Android keyboard opens.
- Actual:
  The modal opts out of Android keyboard avoidance, so the fixed footer/input section can be obscured without being moved by scroll.
- Evidence type:
  Direct code proof.
- Suspected layer:
  Modal/UI layer.
- Fix direction:
  Add Android-safe keyboard avoidance or move the editable control into scrollable content with proper bottom inset handling.
- Evidence:
  - [ProductDetailsModal.tsx](/D:/FitAi/FitAI/src/components/diet/ProductDetailsModal.tsx#L181)
  - [ProductDetailsModal.tsx](/D:/FitAi/FitAI/src/components/diet/ProductDetailsModal.tsx#L189)
  - [ProductDetailsModal.tsx](/D:/FitAi/FitAI/src/components/diet/ProductDetailsModal.tsx#L221)
  - [ProductDetailsModal.tsx](/D:/FitAi/FitAI/src/components/diet/ProductDetailsModal.tsx#L435)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L714)
  - [useAIMealGeneration.ts](/D:/FitAi/FitAI/src/hooks/useAIMealGeneration.ts#L722)

### B-08 Low: Live barcode surfaces still contain broken glyphs and mojibake

- Severity: Low
- Exact flow:
  Barcode camera UI and manual barcode entry UI.
- Repro steps:
  1. Open the barcode camera or manual-entry modal.
  2. Inspect the visible close, flash, status, clear, and hint strings.
- Expected:
  Stable readable iconography or plain text.
- Actual:
  The live UI still includes visibly corrupted close/flash/status/clear glyphs and a corrupted digit-range hint.
- Evidence type:
  Direct code proof.
- Suspected layer:
  Presentation / encoding cleanup.
- Fix direction:
  Replace corrupted literal strings with icon components or plain ASCII text.
- Evidence:
  - [Camera.tsx](/D:/FitAi/FitAI/src/components/advanced/Camera.tsx#L226)
  - [Camera.tsx](/D:/FitAi/FitAI/src/components/advanced/Camera.tsx#L237)
  - [Camera.tsx](/D:/FitAi/FitAI/src/components/advanced/Camera.tsx#L295)
  - [Camera.tsx](/D:/FitAi/FitAI/src/components/advanced/Camera.tsx#L347)
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L166)
  - [ManualBarcodeEntry.tsx](/D:/FitAi/FitAI/src/components/diet/ManualBarcodeEntry.tsx#L182)

## High-Value Missing Tests

- `useAIMealGeneration` should have committed coverage for:
  - clearing `logMealCallbackRef` on not-found and estimated-data exits
  - barcode camera close/retry behavior
  - explicit outcome classification mapping for barcode failures
- `ManualBarcodeEntry` should have committed coverage for:
  - success-path reuse of the resolved `ScannedProduct`
  - supported barcode lengths and not-found fallback parity
- `ProductDetailsModal` should have committed coverage for:
  - Android keyboard interaction
  - footer/input reachability when the keyboard is open

## Confirmed Non-Issues From Current Evidence

- Trusted OFF world and OFF India barcode lookups are covered by the existing committed barcode service tests and did not produce a confirmed mapping defect in this audit.
- The warn-then-allow-view policy for estimated packaged-food data is implemented in the live hook and is consistent with the approved plan.
- The label-scan mapping path is internally consistent in the current code review; no direct contract break was confirmed in this pass.

## Practical Conclusion

This audit is strong enough to start the barcode fix phase without re-discovery. The most important implementation targets are:

1. barcode outcome classification
2. camera/barcode state-machine cleanup
3. manual-entry parity
4. Log Meal callback cleanup
5. Android product-modal input safety

No source files were edited in this delivery other than this report.
