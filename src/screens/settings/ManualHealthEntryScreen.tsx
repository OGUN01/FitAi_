/**
 * ManualHealthEntryScreen
 *
 * Fallback UI for users whose smartwatches do NOT support Android Health
 * Connect (Noise, boAt, Fire-Boltt, Huawei). Lets them key in daily health
 * metrics by hand so their history isn't blank.
 *
 * WRITE PATH (Option B per task contract): calls the persistence service
 * `healthMetricsDataService.saveHealthSnapshot(...)` directly — Supabase is
 * the single source of truth (CLAUDE.md #1). After a successful save, the
 * local Zustand health store is refreshed optimistically by mapping the
 * saved rows onto the existing `metrics` seam via setState, so the UI
 * reflects reality without a full reload (CLAUDE.md #6). Reads-back use
 * `getTodayHealthMetrics` to rehydrate after save.
 *
 * Navigation model: the settings screens use a string-keyed renderer
 * (SettingsScreenRenderer) — NOT a React Navigation Stack — so this screen
 * takes an `onBack` callback, matching WearableConnectionScreen.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { ManualMetricEntry } from "../../components/health/ManualMetricEntry";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rw } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { getLocalDateString } from "../../utils/weekUtils";
import { healthMetricsDataService } from "../../services/healthMetricsData";
import { useHealthDataStore } from "../../stores/healthDataStore";
import type { HealthMetrics, MetricSource } from "../../stores/healthDataStore";

interface ManualHealthEntryScreenProps {
  onBack?: () => void;
}

// ---- Metric definitions -------------------------------------------------
// metric_type keys MUST match the health_metrics migration exactly.
type MetricType =
  | "steps"
  | "heart_rate"
  | "resting_heart_rate"
  | "active_calories"
  | "weight_kg"
  | "sleep_hours"
  | "distance_km"
  | "heart_rate_variability"
  | "oxygen_saturation"
  | "body_fat";

interface MetricDef {
  key: MetricType;
  label: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint?: string;
  validate: (n: number) => string | undefined;
  advanced?: boolean;
}

const nonNegative = (n: number) =>
  n < 0 ? "Must be 0 or greater" : undefined;

const METRIC_DEFS: MetricDef[] = [
  {
    key: "steps",
    label: "Steps",
    unit: "count",
    icon: "walk-outline",
    hint: "Daily step count",
    validate: (n) =>
      nonNegative(n) ?? (!Number.isInteger(n) ? "Must be a whole number" : undefined),
  },
  {
    key: "distance_km",
    label: "Distance",
    unit: "km",
    icon: "navigate-outline",
    hint: "Distance walked/run today",
    validate: nonNegative,
  },
  {
    key: "active_calories",
    label: "Active Calories",
    unit: "kcal",
    icon: "flame-outline",
    hint: "Calories burned from activity",
    validate: nonNegative,
  },
  {
    key: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    icon: "heart-outline",
    hint: "Current heart rate",
    validate: (n) =>
      nonNegative(n) ?? (n < 30 || n > 250 ? "Heart rate must be 30–250" : undefined),
  },
  {
    key: "resting_heart_rate",
    label: "Resting Heart Rate",
    unit: "bpm",
    icon: "pulse-outline",
    hint: "Heart rate at rest",
    validate: (n) =>
      nonNegative(n) ?? (n < 30 || n > 250 ? "Heart rate must be 30–250" : undefined),
  },
  {
    key: "heart_rate_variability",
    label: "Heart Rate Variability",
    unit: "ms",
    icon: "analytics-outline",
    hint: "RMSSD recovery indicator",
    advanced: true,
    validate: nonNegative,
  },
  {
    key: "oxygen_saturation",
    label: "Oxygen Saturation (SpO₂)",
    unit: "%",
    icon: "water-outline",
    hint: "Blood oxygen percentage",
    advanced: true,
    validate: (n) =>
      nonNegative(n) ?? (n < 50 || n > 100 ? "SpO₂ must be 50–100" : undefined),
  },
  {
    key: "weight_kg",
    label: "Weight",
    unit: "kg",
    icon: "body-outline",
    hint: "Today's weight",
    validate: nonNegative,
  },
  {
    key: "body_fat",
    label: "Body Fat",
    unit: "%",
    icon: "fitness-outline",
    hint: "Body fat percentage",
    advanced: true,
    validate: (n) =>
      nonNegative(n) ?? (n > 60 ? "Body fat must be 0–60" : undefined),
  },
  {
    key: "sleep_hours",
    label: "Sleep",
    unit: "hours",
    icon: "bed-outline",
    hint: "Last night's sleep",
    validate: (n) =>
      nonNegative(n) ?? (n > 24 ? "Sleep must be 0–24 hours" : undefined),
  },
];

// Grouped sections for display order per the task spec.
interface MetricGroup {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  metrics: MetricDef[];
}

const METRIC_GROUPS: MetricGroup[] = [
  {
    title: "Activity",
    icon: "walk-outline",
    metrics: METRIC_DEFS.filter((m) =>
      ["steps", "distance_km", "active_calories"].includes(m.key),
    ),
  },
  {
    title: "Vitals",
    icon: "heart-outline",
    metrics: METRIC_DEFS.filter((m) =>
      [
        "heart_rate",
        "resting_heart_rate",
        "heart_rate_variability",
        "oxygen_saturation",
      ].includes(m.key),
    ),
  },
  {
    title: "Body",
    icon: "body-outline",
    metrics: METRIC_DEFS.filter((m) => ["weight_kg", "body_fat"].includes(m.key)),
  },
  {
    title: "Sleep",
    icon: "bed-outline",
    metrics: METRIC_DEFS.filter((m) => ["sleep_hours"].includes(m.key)),
  },
];

// Maps a saved metric_type → the field on HealthMetrics it should update.
// Only the metrics the store tracks are mapped; unmapped metrics are still
// persisted by the service (they just don't have a runtime store field).
const METRIC_TO_STORE_FIELD: Partial<Record<MetricType, keyof HealthMetrics>> = {
  steps: "steps",
  heart_rate: "heartRate",
  resting_heart_rate: "restingHeartRate",
  active_calories: "activeCalories",
  weight_kg: "weight",
  sleep_hours: "sleepHours",
  distance_km: "distance",
  heart_rate_variability: "heartRateVariability",
  oxygen_saturation: "oxygenSaturation",
  body_fat: "bodyFat",
};

// Maps a store field → the key on HealthMetrics.sources it should update.
// NOTE: sources only has keys for steps, heartRate, activeCalories,
// totalCalories, distance, weight, sleep, heartRateVariability,
// oxygenSaturation, bodyFat — restingHeartRate is NOT in sources, so manual
// resting HR writes update the metric value but get no source attribution.
const STORE_FIELD_TO_SOURCE_KEY: Partial<
  Record<keyof HealthMetrics, keyof NonNullable<HealthMetrics["sources"]>>
> = {
  steps: "steps",
  heartRate: "heartRate",
  activeCalories: "activeCalories",
  distance: "distance",
  weight: "weight",
  sleepHours: "sleep",
  heartRateVariability: "heartRateVariability",
  oxygenSaturation: "oxygenSaturation",
  bodyFat: "bodyFat",
};

// MetricSource is an object interface (packageName/name/tier/accuracy/icon/
// deviceType), not a string. Build a Manual-source object so attribution
// surfaces provenance consistent with Health Connect sources.
const MANUAL_SOURCE: MetricSource = {
  packageName: "manual",
  name: "Manual entry",
  tier: 4,
  accuracy: 0.5,
  icon: "create-outline",
  deviceType: "unknown",
};

export const ManualHealthEntryScreen: React.FC<
  ManualHealthEntryScreenProps
> = ({ onBack }) => {
  // Date selector — kept as a YYYY-MM-DD TextInput (local date string).
  // Today is the default; the user can back-date a missed entry.
  const [dateStr, setDateStr] = useState(getLocalDateString());

  // Values held as strings so partial input ("72.") is editable.
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // True while today's saved metrics are being read back to prefill the
  // form on mount. Keeps the input fields from flashing empty before the
  // async read resolves.
  const [loadingToday, setLoadingToday] = useState(true);

  // Prefill today's values on mount. A user who already logged (or whose
  // wearable synced) earlier today should see their existing numbers when
  // they reopen the screen — not a blank form they have to retype. Reads
  // from the SSOT (health_metrics table) via the same service the save
  // path uses, so any normalization the service enforces is reflected.
  // Runs once on mount (empty dep array): a re-mount is the only way a
  // user reopens the screen, so we never clobber mid-edit values.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await healthMetricsDataService.getTodayHealthMetrics();
        if (cancelled) return;
        if (result.success && result.data) {
          const seed: Record<string, string> = {};
          for (const [metricType, row] of Object.entries(result.data)) {
            // Only seed metric_types this screen knows how to edit — the
            // service may return rows for types we don't expose here.
            if (
              typeof row?.value === "number" &&
              Number.isFinite(row.value)
            ) {
              seed[metricType] = String(row.value);
            }
          }
          if (Object.keys(seed).length > 0) {
            setValues(seed);
          }
        }
      } catch (err) {
        // No silent failure (CLAUDE.md #5): log so a broken read is
        // visible in dev. The form stays editable with empty fields.
        console.error(
          "[ManualHealthEntryScreen] Failed to prefill today's metrics:",
          err,
        );
      } finally {
        if (!cancelled) setLoadingToday(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setValue = (key: string, text: string) =>
    setValues((prev) => ({ ...prev, [key]: text }));

  // Validate every filled field. Returns map of key → error message.
  const errors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const def of METRIC_DEFS) {
      const raw = values[def.key]?.trim();
      if (!raw) continue;
      const n = Number(raw);
      if (Number.isNaN(n)) {
        out[def.key] = "Enter a valid number";
        continue;
      }
      const err = def.validate(n);
      if (err) out[def.key] = err;
    }
    return out;
  }, [values]);

  const hasErrors = Object.keys(errors).length > 0;
  const changedKeys = useMemo(
    () => METRIC_DEFS.filter((d) => values[d.key]?.trim()).map((d) => d.key),
    [values],
  );
  const canSave = changedKeys.length > 0 && !hasErrors && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    haptics.light();

    // Build the numeric payload for the batch upsert.
    const payload: Record<string, number> = {};
    for (const key of changedKeys) {
      const n = Number(values[key]);
      if (!Number.isNaN(n)) payload[key] = n;
    }

    setSaving(true);
    try {
      const result = await healthMetricsDataService.saveHealthSnapshot(
        payload,
        "manual",
        dateStr || undefined,
      );

      if (!result.success) {
        crossPlatformAlert(
          "Save failed",
          result.error
            ? `Could not save your metrics: ${result.error}`
            : "Could not save your metrics. Please try again.",
          [{ text: "OK" }],
        );
        return;
      }

      // Optimistic local-store refresh: map saved values onto the runtime
      // HealthMetrics seam so the UI reflects reality without a full reload
      // (CLAUDE.md #6). Only fields the store tracks are touched; sources
      // attribution marks them as Manual so downstream UI shows provenance.
      const storePatch: Partial<HealthMetrics> = {};
      const sourcesPatch: NonNullable<HealthMetrics["sources"]> = {};
      for (const [metricType, value] of Object.entries(payload)) {
        const field = METRIC_TO_STORE_FIELD[metricType as MetricType];
        if (field) {
          // distance is stored in km natively in the store (no /1000 needed;
          // the metric_type is distance_km so the value is already km).
          (storePatch as Record<string, unknown>)[field as string] = value;
          const sourceKey = STORE_FIELD_TO_SOURCE_KEY[field];
          if (sourceKey) {
            sourcesPatch[sourceKey] = MANUAL_SOURCE;
          }
        }
      }

      if (Object.keys(storePatch).length > 0) {
        useHealthDataStore.setState((state) => ({
          metrics: {
            ...state.metrics,
            ...storePatch,
            lastUpdated: new Date().toISOString(),
            sources: { ...state.metrics.sources, ...sourcesPatch },
          },
        }));
      }

      // Also read back from the source of truth so any cross-metric
      // normalization the service enforces is reflected locally. Read-back
      // is best-effort: failure here does NOT invalidate the successful write.
      const readback = await healthMetricsDataService.getTodayHealthMetrics();
      if (readback.success && readback.data) {
        const rbPatch: Partial<HealthMetrics> = {};
        for (const [metricType, row] of Object.entries(readback.data)) {
          const field = METRIC_TO_STORE_FIELD[metricType as MetricType];
          if (field && row.source === "manual") {
            (rbPatch as Record<string, unknown>)[field as string] = row.value;
          }
        }
        if (Object.keys(rbPatch).length > 0) {
          useHealthDataStore.setState((state) => ({
            metrics: { ...state.metrics, ...rbPatch },
          }));
        }
      }

      crossPlatformAlert(
        "Saved",
        `Logged ${result.saved} metric${result.saved === 1 ? "" : "s"} for ${dateStr}.`,
        [{ text: "OK", onPress: () => onBack?.() }],
      );
    } catch (err) {
      crossPlatformAlert(
        "Save failed",
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving.",
        [{ text: "OK" }],
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuroraBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              haptics.light();
              onBack?.();
            }}
            style={styles.backButton}
            scaleValue={0.9}
            hapticFeedback={false}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="arrow-back"
              size={rf(24)}
              color={ResponsiveTheme.colors.text}
            />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Log Health Data</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subheader}>
            For watches that don't sync with Health Connect (Noise, boAt,
            Fire-Boltt, Huawei). Enter your values and they'll be saved to your
            history.
          </Text>

          {/*
            Prefill loading indicator. While today's saved metrics are
            being read back to seed the form (Task 4), show a tiny inline
            hint so the user doesn't see a blank form flash before their
            existing numbers appear. Does not block editing — fields stay
            editable, just empty, during the (fast) read.
          */}
          {loadingToday && (
            <View style={styles.prefillRow}>
              <AuroraSpinner customSize={rf(16)} theme="primary" />
              <Text style={styles.prefillText}>
                Loading today's entries…
              </Text>
            </View>
          )}

          {/* Date selector — simple local-date TextInput */}
          <GlassCard elevation={1} style={styles.dateCard}>
            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={rf(18)}
                color={ResponsiveTheme.colors.primary}
              />
              <View style={styles.dateLabelCol}>
                <Text style={styles.dateLabel}>Date</Text>
                <Text style={styles.dateHint}>
                  YYYY-MM-DD · leave as today unless back-filling
                </Text>
              </View>
              <TextInput
                style={styles.dateInput}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={ResponsiveTheme.colors.textTertiary}
                maxLength={10}
                accessibilityLabel="Date for the manual entry"
              />
            </View>
          </GlassCard>

          {METRIC_GROUPS.map((group) => {
            const standard = group.metrics.filter((m) => !m.advanced);
            const advanced = group.metrics.filter((m) => m.advanced);
            return (
              <View key={group.title}>
                <View style={styles.groupHeader}>
                  <Ionicons
                    name={group.icon}
                    size={rf(16)}
                    color={ResponsiveTheme.colors.primary}
                  />
                  <Text style={styles.groupTitle}>{group.title}</Text>
                </View>
                <GlassCard elevation={1} style={styles.groupCard}>
                  {standard.map((def) => (
                    <ManualMetricEntry
                      key={def.key}
                      label={def.label}
                      unit={def.unit}
                      icon={def.icon}
                      hint={def.hint}
                      value={values[def.key] ?? ""}
                      onChange={(t) => setValue(def.key, t)}
                      error={errors[def.key]}
                    />
                  ))}

                  {advanced.length > 0 && (
                    <AnimatedPressable
                      onPress={() => {
                        haptics.light();
                        setAdvancedOpen((v) => !v);
                      }}
                      style={styles.advancedToggle}
                      scaleValue={0.98}
                      accessibilityRole="button"
                      accessibilityLabel="Toggle advanced metrics"
                    >
                      <Ionicons
                        name={advancedOpen ? "chevron-up" : "chevron-down"}
                        size={rf(14)}
                        color={ResponsiveTheme.colors.textSecondary}
                      />
                      <Text style={styles.advancedToggleText}>
                        {advancedOpen ? "Hide" : "Show"} advanced metrics
                      </Text>
                    </AnimatedPressable>
                  )}

                  {advancedOpen &&
                    advanced.map((def) => (
                      <View key={def.key} style={styles.advancedRow}>
                        <ManualMetricEntry
                          label={def.label}
                          unit={def.unit}
                          icon={def.icon}
                          hint={def.hint}
                          value={values[def.key] ?? ""}
                          onChange={(t) => setValue(def.key, t)}
                          error={errors[def.key]}
                        />
                      </View>
                    ))}
                </GlassCard>
              </View>
            );
          })}

          <AnimatedPressable
            onPress={handleSave}
            style={[
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
            ]}
            scaleValue={0.97}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Save manually entered health metrics"
            accessibilityState={{ disabled: !canSave }}
          >
            {saving ? (
              <AuroraSpinner customSize={rf(16)} theme="white" />
            ) : (
              <Ionicons
                name="save-outline"
                size={rf(18)}
                color={ResponsiveTheme.colors.text}
              />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </AnimatedPressable>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.glassHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: rf(20),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
  headerRight: {
    width: rw(40),
    alignItems: "flex-end",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    paddingBottom: rp(120),
  },
  subheader: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.md,
  },
  prefillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  prefillText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textTertiary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  dateCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.md,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabelCol: {
    flex: 1,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  dateLabel: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  dateHint: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  dateInput: {
    color: ResponsiveTheme.colors.text,
    fontSize: rf(14),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
    borderRadius: rbr(8),
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: rp(8),
    minWidth: rw(120),
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  groupTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginLeft: ResponsiveTheme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: ResponsiveTheme.spacing.sm,
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassHighlight,
  },
  advancedToggleText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  advancedRow: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingVertical: rp(16),
    borderRadius: rbr(14),
    marginTop: ResponsiveTheme.spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
});

export default ManualHealthEntryScreen;
