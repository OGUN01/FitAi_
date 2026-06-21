# Play Store Health Connect Compliance Checklist

> **Last updated:** 2026-06-20 (Wave 2)
> **Scope:** Android release via Google Play Store. Health Connect (HC) is mandatory for any Android health-data read/write in FitAI.

## ⚠️ Timeline Warning (read first)

Health Connect approval is **NOT instant**. Plan for:

- **~7-day Google review** of the Play Console "Health apps" form after each submission.
- **5–7 additional days** for the Health Connect **permission whitelist** to propagate after approval (per the `react-native-health-connect` README).

**Total lead time: ~2 weeks from submission to a working production build.** Any change to the declared Health Connect data types re-triggers this review. Ship data-type changes in dedicated releases, not mixed into feature releases.

---

## Pre-Submission Checklist

### 1. Manifest declarations

File: `android/app/src/main/AndroidManifest.xml` (managed via the `./plugins/withFitAiHealthConnect` Expo config plugin in `app.config.js`).

- [ ] Declare **only** the `READ_*` / `WRITE_*` permissions actually used by the app. Current set:
  - READ: `READ_STEPS`, `READ_HEART_RATE`, `READ_SLEEP`, `READ_EXERCISE`, `READ_ACTIVE_CALORIES_BURNED`, `READ_TOTAL_CALORIES_BURNED`, `READ_WEIGHT`, `READ_BODY_FAT`, `READ_HEART_RATE_VARIABILITY`, `READ_OXYGEN_SATURATION`, `READ_DISTANCE`, `READ_BASAL_METABOLIC_RATE`, `READ_HEALTH_DATA_IN_BACKGROUND` (Android 15+), `READ_HEALTH_DATA_HISTORY`.
  - WRITE: `WRITE_EXERCISE`, `WRITE_ACTIVE_CALORIES_BURNED`.
- [ ] `<queries>` block includes `<package android:name="com.google.android.apps.healthdata"/>` (Health Connect provider app).
- [ ] `ViewPermissionUsageActivity` activity-alias declared with:
  - `android:permission="android.permission.START_VIEW_PERMISSION_USAGE"`
  - intent-filter `<action android:name="android.intent.action.VIEW_PERMISSION_USAGE"/>` + `<category android:name="android.intent.category.HEALTH_PERMISSIONS"/>`
  - **This is mandatory — Play rejects the listing without it.** It lets users view how FitAI uses each health permission from the HC system settings screen.

### 2. Play Console → App content → Health apps form

- [ ] Declare all health features used (Activity & fitness; Sleep; Body & weight; Heart & cardiovascular; etc.).
- [ ] Provide a **user-facing justification for EACH Health Connect data type** read or written — explain what data, why FitAI needs it, and how it is used. Google reviews each justification individually.
- [ ] **Re-submit whenever the set of declared data types changes.** Adding a new metric (e.g. a new `READ_*` permission) requires a fresh review cycle.

### 3. Data Safety form

- [ ] Declare every Health Connect data type under "Health info" (Personal & Sensitive).
- [ ] Answer collection / sharing / encryption / retention practices accurately:
  - Collection: health data IS collected (read from HC).
  - Sharing: not shared with third parties (confirm before submitting — health metrics are currently store-only and never leave the device except `weight` → Supabase `body_analysis`).
  - Encryption: data in transit (HTTPS to Supabase) and at rest (Supabase encryption).
  - Retention: document the planned `health_metrics` table retention (Wave 3) if submitting after it ships; otherwise document the current store-only/ephemeral model.

### 4. Privacy policy

- [ ] ONE privacy policy, shown **identically** in-app (the link presented on the HC permissions screen) AND on the Play Store listing. Mismatches trigger rejection.
- [ ] Policy is comprehensive, covering EACH health data type read/written (steps, HR, HRV, SpO2, sleep, calories, distance, weight, body fat, exercise sessions).
- [ ] Policy states that data is read from / written to Android Health Connect.
- [ ] Policy states the retention model (currently: health metrics are ephemeral/store-only; `weight` is persisted to the user's profile).

### 5. Prominent in-app disclosure (Play User Data policy)

- [ ] Show a **disclosure dialog BEFORE the system permission prompt**. Must explain:
  - What health data FitAI will access.
  - Why (personalized fitness recommendations, progress tracking, workout write-back).
  - How it is shared (not shared with third parties; written to user's own Supabase profile for weight only).
- [ ] User must acknowledge before `requestPermissions()` is called. Calling the system permission prompt without prior disclosure is a Play User Data policy violation.

### 6. Runtime availability check

- [ ] On cold start, call `getSdkStatus()` (done in `healthConnectService.initializeHealthConnect()` / `canUseHealthConnect()`).
- [ ] If `SDK_UNAVAILABLE` on Android <14 (HC provider app not installed), **deep-link the user to install "Health Connect by Android"** from the Play Store. Do not silently fail.
- [ ] If `SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED`, deep-link to HC settings to prompt the update.

### 7. Permission requests (runtime)

- [ ] Request the **minimal set** of permissions — only what FitAI actually reads/writes (see the `permissions` array in `src/services/health/core.ts`).
- [ ] Re-validate granted permissions with `getGrantedPermissions()` **on every launch**. Users can revoke any permission from Android system Settings at any time; the app must degrade gracefully (show "Permission needed" state, not crash).
- [ ] `disconnect()` must revoke OS-level permissions via `revokeAllPermissions()` (already implemented) — not just flip a local flag.

### 8. Background sync (Android 15+)

- [ ] Declare `READ_HEALTH_DATA_IN_BACKGROUND` in the manifest.
- [ ] Before scheduling the `expo-background-fetch` task (`fitai-healthconnect-background-sync`), check the `FEATURE_READ_HEALTH_DATA_IN_BACKGROUND` feature status. Only schedule the task if the device/OS supports background health reads.
- [ ] Gate background sync registration on a user setting (`settings.backgroundSyncEnabled`) — do not schedule unconditionally.
- [ ] On Android <15, the task may register but the OS will not deliver background reads; foreground sync (Home mount + manual "Sync Now") remains the fallback.

### 9. SDK / build configuration

- [ ] `minSdkVersion` 26 (Health Connect requirement; set in `app.config.js` android block AND the `expo-build-properties` plugin).
- [ ] `compileSdkVersion` 35 (required for latest `androidx.health.connect` dependencies).
- [ ] `targetSdkVersion` 34 (optimal compatibility; bump to 35 when ready).
- [ ] `react-native-health-connect` ^3.5.3 (pinned in `package.json`).
- [ ] The `./plugins/withFitAiHealthConnect` config plugin wraps `react-native-health-connect/app.plugin` and injects `HealthConnectPermissionDelegate` into `MainActivity` — verify the plugin runs in the prebuild (`npx expo prebuild`).

---

## Submission Runbook

1. **Local verify:** `npx expo prebuild` → confirm `AndroidManifest.xml` contains all permissions, the `<queries>` block, and the `ViewPermissionUsageActivity` alias.
2. **Build:** `bash build-both-apks.sh` (or EAS build for production).
3. **Internal test track:** upload APK/AAB to Play Console internal track. Confirm HC permission flow works on a real device (grant → sync → metrics appear → revoke → app degrades gracefully).
4. **Health apps form:** fill in / update the form with per-data-type justifications.
5. **Data Safety form:** update health-info declarations.
6. **Privacy policy:** publish the updated policy and point both the in-app link and the Play Store listing at it.
7. **Submit for review.** Expect ~7 days for review + ~5–7 days for whitelist propagation.
8. **After whitelist propagates:** promote from internal → closed → open testing → production. Verify on a fresh install that HC permissions actually grant in production (whitelist propagation is the most common silent-failure point).

---

## Common Rejection Reasons

| Reason | Fix |
|--------|-----|
| Missing `ViewPermissionUsageActivity` alias | Add the activity-alias with `ACTION_VIEW_PERMISSION_USAGE` + `CATEGORY_HEALTH_PERMISSIONS` (mandatory). |
| Privacy policy mismatch (in-app vs Play listing) | Serve identical text from the same URL. |
| Declared data types ≠ actual permissions requested | Keep the Play Console "Health apps" form in sync with the manifest permission set on every release. |
| No prominent in-app disclosure before system prompt | Add the disclosure dialog; require user acknowledgement before `requestPermissions()`. |
| Permission requested but not justified in the form | Write a per-data-type justification (what / why / how used). |
| Whitelist not propagated (production build silently fails HC) | Wait the full ~2 weeks; verify on a fresh install before promoting. |
