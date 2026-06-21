# Manual Health-Data Entry — Fallback for Unsupported Watches

> **Last updated:** 2026-06-20 (Wave 3)
> **Scope:** Android. Lets users with watches that do NOT write to Android Health Connect manually log health metrics into FitAI. See `FITAI_DATA_ARCHITECTURE.md` §I for the persistence layer and `WEARABLE_SUPPORT_MATRIX.md` for the per-brand support matrix.

---

## Why This Exists

Android Health Connect is FitAI's sole automatic health-data path on Android (Wave 2 — Google Fit removed). A smartwatch works with FitAI **if and only if** its companion app writes to Health Connect. Several popular brands — especially in the Indian budget-wearable market — do NOT write to Health Connect:

| Brand | Why it has no HC pipeline |
|-------|---------------------------|
| **Noise** | Legacy Google Fit only (deprecated); no Health Connect support |
| **boAt** | Legacy Google Fit only (deprecated); no Health Connect support |
| **Fire-Boltt** | Legacy Google Fit only (deprecated); no Health Connect support |
| **Huawei** | Uses Huawei Health only; no native Health Connect support |

Before Wave 3, users on these watches had **no data path** into FitAI at all — they saw empty health metrics and could not chart trends. Manual entry closes that gap: the user types in their daily readings (from the watch's own companion app or a manual scale) and FitAI persists them exactly as it would Health Connect data.

---

## What It Covers — 10 Manually-Enterable Metrics

Each metric maps 1:1 to a `metric_type` value in the `health_metrics` Supabase table. The same metric_type values are used by the automatic Health Connect path, so the two coexist without divergence.

| Metric | `metric_type` key | Unit (`unit` column) | Notes |
|--------|-------------------|----------------------|-------|
| Steps | `steps` | `steps` | Daily step count |
| Heart rate | `heart_rate` | `bpm` | Latest reading |
| Resting heart rate | `resting_heart_rate` | `bpm` | Derived from companion app |
| Active calories | `active_calories` | `kcal` | Exercise-only burn |
| Weight | `weight_kg` | `kg` | Also dual-writes to `body_analysis.current_weight_kg` (calculation engine SSOT) |
| Sleep hours | `sleep_hours` | `hours` | Total sleep duration |
| Distance | `distance_km` | `km` | Daily distance |
| Heart rate variability | `heart_rate_variability` | `ms` | RMSSD — recovery indicator |
| Oxygen saturation (SpO2) | `oxygen_saturation` | `%` | Blood oxygen |
| Body fat | `body_fat` | `%` | From smart scales |

`total_calories` is NOT in the manual list — it's an automatic-only metric (BMR fallback via `BasalMetabolicRate` when total is unavailable). Users enter `active_calories` manually; total-calories aggregation remains an HC-side computation.

---

## How It Works — Data Flow

```
WearableConnectionScreen
  → "No Health Connect watch?" → UnsupportedWatchNotice card
  → navigates to ManualHealthEntry route                   [settings nav stack]
  → ManualHealthEntryScreen                                [src/screens/settings/ManualHealthEntryScreen.tsx]
      → ManualMetricEntry components (one per metric)       [src/components/health/ManualMetricEntry.tsx]
      → healthMetricsDataService.saveHealthMetric({        [src/services/healthMetricsData.ts]
            userId,
            date: getLocalDateString(),   // local DATE — matches the UNIQUE constraint
            metricType,
            value,
            unit,
            source: 'manual'
          })
      → upsert into health_metrics
          UNIQUE(user_id, date, metric_type) → latest write wins
      → chart screen calls loadHealthMetricsHistory(30) → metricsHistory (Zustand) → re-render
```

**Persistence:** `healthMetricsDataService.saveHealthMetric` follows the `hydrationData.ts` service pattern (thin Supabase wrapper, errors logged via `console.error`, never swallowed — CLAUDE.md #5). Writes are upserts against the UNIQUE constraint.

**History read-back:** `healthDataStore.loadHealthMetricsHistory(days=30)` fetches N days of `health_metrics` rows via `healthMetricsDataService.getMultiMetricHistory` and populates the `metricsHistory` state field. Charts subscribe to `metricsHistory`. Called on chart-screen mount and after manual entries so the new value renders immediately.

---

## The `source` Column — No-Ambiguity Guarantee

Every `health_metrics` row carries a `source`:

| `source` value | Meaning | Write path |
|-----------------|---------|------------|
| `'healthconnect'` | Synced automatically from Health Connect | `healthDataStore.syncFromHealthConnect` → `saveHealthSnapshot` (fire-and-forget) |
| `'manual'` | Entered by the user via `ManualHealthEntryScreen` | `saveHealthMetric(source: 'manual')` |

**`source` is for UI attribution only** — it tells the UI to render "from your watch" vs "manually entered". It does NOT create two sources of truth.

The single source of truth is enforced by the table's `UNIQUE(user_id, date, metric_type)` constraint: there is exactly ONE authoritative value per user/day/metric, and writes are upserts. **The latest write wins, regardless of source.** Concretely:

- A manual entry on a day that already has Health Connect data for that metric **overrides** that day's HC value. (The HC row is not deleted — it's overwritten on upsert.)
- A later Health Connect sync on the same day overrides the manual entry back.

This is intentional and documented (CLAUDE.md #1 — single source of truth): it lets users correct bad watch readings manually, and lets a subsequent automatic sync take over again once the watch feeds Health Connect. There is no merge logic, no fallback chain, no divergence — just "last write wins per (user, date, metric_type)". If you need to know which source is currently authoritative for a given day/metric, read the row's `source` column.

---

## UX — How Users Reach It

```
WearableConnectionScreen (settings)
  → "No Health Connect watch?" prompt (shown when HC unavailable OR no supported watch detected)
  → UnsupportedWatchNotice card          [src/components/health/UnsupportedWatchNotice.tsx]
      → lists the unsupported brands (Noise, boAt, Fire-Boltt, Huawei) so users self-identify
      → tap → navigate to ManualHealthEntry
  → ManualHealthEntryScreen              [src/screens/settings/ManualHealthEntryScreen.tsx]
      → ManualMetricEntry rows for each of the 10 metrics
      → save → toast/confirmation → metricsHistory refreshed
```

The `ManualHealthEntry` route is part of the settings nav stack (not the main tab stack), since it's a fallback configuration screen, not a daily-use surface.

---

## Huawei — Manual Entry vs. Health Sync Bridge

Huawei is unique among the unsupported brands: users have TWO options, not one.

1. **Manual entry (free, Wave 3).** Use `ManualHealthEntryScreen` as described above. No automation — the user re-enters values daily or whenever they want a fresh chart.
2. **"Health Sync" bridge app (paid, third-party).** Health Sync forwards Huawei Health data into Health Connect, after which FitAI reads it normally via the automatic path. This is automated but requires a paid Health Sync subscription and is a third-party dependency — not a FitAI product.

FitAI surfaces manual entry as the default fallback for Huawei. The Health Sync bridge is mentioned as an alternative for users who want automation and are willing to pay. Both paths converge on the same `health_metrics` table (Health Sync data lands with `source: 'healthconnect'` since it flows through Health Connect; manual entry lands with `source: 'manual'`).

---

## Related Docs

- `FITAI_DATA_ARCHITECTURE.md` §I — Android Wearable / Health Connect Subsystem (full data flow, `health_metrics` schema, `healthMetricsDataService` API)
- `WEARABLE_SUPPORT_MATRIX.md` — per-brand support matrix, lists all unsupported brands and their fallback status
- `DATA_SYNC_MAP.md` — `health_metrics` persistence path (automatic + manual) in the sync map

---

*Last Updated: June 2026 (Wave 3 — manual health-data entry fallback IMPLEMENTED)*
*Maintained by: FitAI Development Team*
