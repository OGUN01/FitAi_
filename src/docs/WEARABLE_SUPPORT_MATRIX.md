# Wearable Support Matrix — Android Health Connect

> **Last updated:** 2026-06-20 (Wave 3 — manual health-data entry fallback now IMPLEMENTED)
> **Scope:** Android only. iOS uses Apple HealthKit (separate path, not covered here).

## Core Principle

**Health Connect is the aggregation hub.** FitAI reads from Android Health Connect, not from individual smartwatch SDKs. A smartwatch works with FitAI on Android **if and only if** its companion app writes to Health Connect.

```
Smartwatch → Companion app → Android Health Connect → FitAI
```

If a watch's companion app does NOT write to Health Connect, that watch cannot feed FitAI on Android regardless of how capable the hardware is. See "Unsupported brands" below for the critical Indian-market gap.

FitAI's Health Connect integration is implemented in `src/services/health/core.ts` (`healthConnectService`). See `FITAI_DATA_ARCHITECTURE.md` §I for the data flow.

---

## Supported Brands (write to Health Connect)

| Brand | Writes to Health Connect? | Data types written | Companion app | Subscription needed? | Quirks |
|-------|--------------------------|--------------------|---------------|----------------------|--------|
| **Samsung Galaxy Watch** (WearOS) | ✅ Bidirectional | Steps, HR, HRV, SpO2, sleep, exercise sessions, active calories, weight (via Samsung Health) | Samsung Health | No | ⚠️ All-day **passive calories are NOT synced** — only exercise-session calories reach HC. Continuous HR is delayed to save battery. Bidirectional: HC can write back to Samsung Health. |
| **Google Pixel Watch + Fitbit** | ✅ Write-only | Steps, HR, sleep, exercise sessions, active calories | Fitbit app | No (free tier writes to HC) | Fitbit is the WRITE path to HC for Pixel Watch. Fitbit's own richer metrics (Fitbit "Premium" insights) do NOT reach HC. |
| **Garmin** | ✅ Write-only | Steps, HR, sleep, exercise sessions, active calories, stress (limited) | Garmin Connect | No (free) | Requires **Android 14+**. Does **NOT** share Body Battery, Training Load, or Stress Score — those stay proprietary to Garmin Connect. |
| **Withings** | ✅ Bidirectional | Steps, HR, sleep, weight, body composition (body fat), SpO2, temperature | Withings Health Mate | No | Richest data set of any brand. Bidirectional sync. Smart scales feed weight + body fat directly. |
| **Oura** (Gen 3+) | ✅ Bidirectional | Steps, HR, HRV, sleep, exercise sessions, body temperature | Oura app | ⚠️ **Yes — paid membership required** for HC sync on Gen 3+. | Excludes **BMR from active calories** — Oura reports active-only, so total-calories reads low without BMR fallback (FitAI's `syncTotalCaloriesWithBMRFallback` covers this). |
| **Zepp / Amazfit** | ✅ Write-only (since Jan 2025) | Steps, HR, sleep, SpO2, exercise sessions | Zepp app | No | ⚠️ **Manual enable required** — HC sync is OFF by default; user must turn it on in Zepp app settings. |
| **OnePlus / Oppo / Realme** (WearOS) | ✅ Write-only | Steps, HR, sleep, exercise sessions | OHealth | No | Only WearOS models work. Gen-1 RTOS watches (the cheap band-style ones) do **NOT** write to HC — OHealth doesn't bridge them. |
| **Xiaomi Mi Band** | ⚠️ Partial | Steps confirmed; HR/sleep inconsistent | Mi Fitness | No | ⚠️ **Foreground-only sync** — data flow halts when the Mi Fitness app is closed or killed. Users must exclude Mi Fitness from battery optimization. |

---

## Subscription-Gated Brands

| Brand | Gate | What syncs (with subscription) | What does NOT sync |
|-------|------|--------------------------------|--------------------|
| **Whoop** | Paid membership required | Workouts, HR, sleep | Recovery, Strain, HRV — these stay in the Whoop app |
| **Oura** (Gen 3+) | Paid membership required | Steps, HR, HRV, sleep, exercise, body temp | BMR (excluded from active calories) |

---

## Unsupported Brands (do NOT write to Health Connect) — Critical Indian-Market Gap

These brands use legacy Google Fit integration (now deprecated, shutdown end-2026) or proprietary sync with no HC pipeline. **They cannot feed FitAI automatically on Android** — but users on these watches can fall back to manual entry (see "Fallback for Unsupported Brands" below).

| Brand | Issue | Impact |
|-------|------|--------|
| **Noise** | Legacy Google Fit only; no HC pipeline | No FitAI integration. Popular in India. |
| **boAt** | Legacy Google Fit only; no HC pipeline | No FitAI integration. Popular in India. |
| **Fire-Boltt** | Legacy Google Fit only; no HC pipeline | No FitAI integration. Popular in India. |
| **Huawei** | No native HC support; uses Huawei Health only | No FitAI integration. Requires the paid **"Health Sync"** bridge app to forward Huawei Health → Health Connect. |
| **Older WearOS watches** whose companion app lacks HC integration | Companion app predates HC | No FitAI integration. |
| **Gen-1 RTOS bands** (cheap OnePlus/Oppo/Realme band models) | OHealth doesn't bridge RTOS → HC | No FitAI integration. |

> **India market note:** Noise, boAt, and Fire-Boltt collectively own a large share of the Indian budget-wearable market. None currently feed Health Connect automatically. This is the single largest FitAI-on-Android coverage gap as of June 2026 — Wave 3's manual entry fallback is the primary mitigation for these users.

---

## Fallback for Unsupported Brands

When a user's watch does not write to Health Connect, FitAI cannot read its data automatically. Options:

1. **Manual health-data entry in FitAI (Wave 3 — IMPLEMENTED).** Users can manually log steps, heart rate, resting heart rate, active calories, weight, sleep hours, distance, HRV, SpO2, and body fat directly into FitAI. Entries are saved with `source: 'manual'` to the `health_metrics` Supabase table via `healthMetricsDataService.saveHealthMetric`, coexisting with Health Connect data. The latest value per user/day/metric wins (UNIQUE upsert), so a manual entry on a day with HC data overrides that day's HC value for that metric.
   - **Screen:** `src/screens/settings/ManualHealthEntryScreen.tsx`
   - **Components:** `src/components/health/ManualMetricEntry.tsx`, `src/components/health/UnsupportedWatchNotice.tsx`
   - **Reachable from:** `WearableConnectionScreen.tsx` → "No Health Connect watch?" → `UnsupportedWatchNotice` card → `ManualHealthEntry` route (settings nav stack).
   - **Full user/developer doc:** `src/docs/MANUAL_HEALTH_ENTRY.md`
2. **Recommend the "Health Sync" bridge app** (Android, paid) for Huawei and other proprietary-sync brands. Health Sync forwards Huawei Health / Garmin / Fitbit data into Health Connect, after which FitAI can read it normally. This is a third-party workaround, not a FitAI dependency. For Huawei specifically, this is the automated-but-paid alternative to manual entry.

---

## How to Verify a Watch Works

A user can confirm their watch feeds FitAI by:

1. Opening their watch's companion app and checking for a "Health Connect" or "Data sharing" setting (must be ON).
2. Opening Android Settings → Health Connect → Data and access → confirm the companion app appears as a data source.
3. In FitAI, triggering a "Sync Now" and checking that metrics appear in `healthDataStore`.

If the companion app does not appear in Health Connect's data sources list, the watch is unsupported and FitAI cannot read it automatically — point the user to the **manual health-data entry** fallback (see "Fallback for Unsupported Brands" above and `src/docs/MANUAL_HEALTH_ENTRY.md`).
