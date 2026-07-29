/**
 * RhythmTab — S6 "Rhythm" ("Better than 2026" redesign).
 *
 * One focal question: "When do you live?" Three answer-as-tap inputs:
 *   - Wake / Sleep: two RadialDial time dials side-by-side with a live
 *     sleep-duration readout (computed from the two times, overnight wrap).
 *   - Country: a tappable field that opens a SearchSheet (searchable bottom
 *     sheet) with the real country list.
 *   - State/region: an UnderlineInput revealed only after a country is picked.
 * Pure OLED black, cyan accent (screen 6), QuestionHero + ScreenFrame + NavRail.
 *
 * Data wiring UNCHANGED: uses usePersonalInfoForm → updatePersonalInfo.
 * wake/sleep/country/state collected here; name/age/gender live on S1.
 */

import React, { useMemo, useCallback, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import * as Haptics from "expo-haptics";
import {
  colors,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";
import {
  ScreenFrame,
  RadialDial,
  SearchSheet,
  UnderlineInput,
} from "../../../components/onboarding/aurora";
import {
  COUNTRIES_WITH_STATES,
} from "../../../components/onboarding/PersonalInfoConstants";
import { PersonalInfoData } from "../../../types/onboarding";
import { usePersonalInfoForm } from "../../../hooks/usePersonalInfoForm";

const ACCENT = "#00D4FF";

interface RhythmTabProps {
  data: PersonalInfoData | null;
  onUpdate: (data: Partial<PersonalInfoData>) => void;
  onNext: () => void;
  onBack: () => void;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

const fireSelection = () => Haptics.selectionAsync().catch(() => {});

/** Country options for the SearchSheet — { id, label } from COUNTRIES_WITH_STATES. */
const COUNTRY_OPTIONS = COUNTRIES_WITH_STATES.map((c) => ({
  id: c.name,
  label: c.name,
}));

/** States for the currently-selected country (for the UnderlineInput placeholder). */
const statesForCountry = (country: string): string[] => {
  const entry = COUNTRIES_WITH_STATES.find((c) => c.name === country);
  return entry?.states ?? [];
};

/** Compute sleep duration from wake/sleep "HH:MM" strings, handling overnight wrap. */
const computeSleepDuration = (wake: string, sleep: string): string => {
  if (!wake || !sleep) return "—";
  const [wh, wm] = wake.split(":").map((n) => parseInt(n, 10));
  const [sh, sm] = sleep.split(":").map((n) => parseInt(n, 10));
  if (isNaN(wh) || isNaN(wm) || isNaN(sh) || isNaN(sm)) return "—";

  const wakeMin = wh * 60 + wm;
  const sleepMin = sh * 60 + sm;
  let duration = wakeMin - sleepMin;
  if (duration <= 0) duration += 24 * 60;

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return `${hours}h ${minutes}m`;
};

export const RhythmTab: React.FC<RhythmTabProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
  isEditingFromReview,
  onReturnToReview,
}) => {
  const { state, actions } = usePersonalInfoForm({ data, onUpdate });
  const { formData } = state;

  // usePersonalInfoForm.updateField only updates local formData — it does NOT
  // call onUpdate (the hook syncs to the store only via a debounced auto-save
  // effect gated on `validationResult`, which this redesigned flow does not
  // pass). Bridge every field write to the parent store immediately so the
  // per-screen validation gate on Next sees the real values (CLAUDE.md "Store
  // is the Runtime Source — update the store immediately").
  const handleField = useCallback(
    <K extends keyof PersonalInfoData>(field: K, value: PersonalInfoData[K]) => {
      actions.updateField(field, value);
      onUpdate({ [field]: value } as Partial<PersonalInfoData>);
    },
    [actions, onUpdate],
  );

  // One-shot mount-sync: usePersonalInfoForm seeds local formData with smart
  // defaults (wake_time "07:00", sleep_time "23:00") that the completion gate
  // (validatePersonalInfo) requires. Without this, those defaults never reach
  // the store (the hook only auto-saves when a validationResult is supplied,
  // which this flow omits), so a user who accepts the default sleep schedule
  // would fail the wake_time/sleep_time requirement at Generate. Idempotent
  // for returning users (formData initializes from `data`) and preserves the
  // name/age/gender already written on S1.
  useEffect(() => {
    onUpdate(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAdvance = useMemo(() => {
    return (
      !!formData.wake_time &&
      !!formData.sleep_time &&
      !!formData.country &&
      !!formData.state?.trim()
    );
  }, [formData.wake_time, formData.sleep_time, formData.country, formData.state]);

  const sleepDuration = useMemo(
    () => computeSleepDuration(formData.wake_time, formData.sleep_time),
    [formData.wake_time, formData.sleep_time],
  );

  const statePlaceholder = useMemo(() => {
    const s = statesForCountry(formData.country);
    return s.length > 0 ? s[0] : "State / region";
  }, [formData.country]);

  return (
    <ScreenFrame
      question="When do you live?"
      reassurance="Sleep and where you are."
      onBack={onBack}
      onNext={onNext}
      nextLabel={isEditingFromReview ? "Review" : "Next"}
      disabled={!canAdvance}
      isEditingFromReview={isEditingFromReview}
      onReturnToReview={onReturnToReview}
      bloomColor={ACCENT}
      testID="onboarding-rhythm-tab"
    >
      {/* Wake / Sleep — two RadialDial time dials side-by-side */}
      <View style={styles.dialRow}>
        <RadialDial
          variant="time"
          value={formData.wake_time}
          onChange={(v) => handleField("wake_time", String(v))}
          label="Wake"
          accentColor={ACCENT}
          size={156}
          testID="onboarding-wake-dial"
        />
        <RadialDial
          variant="time"
          value={formData.sleep_time}
          onChange={(v) => handleField("sleep_time", String(v))}
          label="Sleep"
          accentColor={ACCENT}
          size={156}
          testID="onboarding-sleep-dial"
        />
      </View>

      {/* Sleep-duration readout */}
      <Text style={styles.sleepReadout}>
        {sleepDuration !== "—" ? `Sleep duration · ${sleepDuration}` : "—"}
      </Text>

      {/* Country — tappable field → SearchSheet */}
      <SearchSheet
        options={COUNTRY_OPTIONS}
        value={formData.country}
        onSelect={(id) => {
          fireSelection();
          handleField("country", id);
          handleField("state", "");
        }}
        fieldLabel="Country"
        placeholder="Select country"
        testID="onboarding-country-field"
      />

      {/* State/region — revealed only after a country is picked */}
      {!!formData.country && (
        <UnderlineInput
          label="State / region"
          value={formData.state ?? ""}
          onChangeText={(t) => handleField("state", t)}
          placeholder={statePlaceholder}
          accentColor={ACCENT}
          testID="onboarding-state-input"
        />
      )}
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  dialRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: spacing.md,
  },
  sleepReadout: {
    textAlign: "center",
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight:
      typography.variants.caption.fontSize * typography.variants.caption.lineHeight,
    color: colors.text.secondary,
  },
});

export default RhythmTab;
