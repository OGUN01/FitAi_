/**
 * LocationFields — S1 "You" location inputs, Editorial Dark skin (2026 refresh).
 *
 * Replaces the 7-country Pill wrap with the 2026-standard pattern for
 * high-cardinality lists: an underline field that opens a searchable bottom
 * sheet (country selection is a SEARCH problem, not a menu problem — one tap,
 * type two letters, done). State/Province uses the same sheet language, so the
 * whole section is three quiet underline fields instead of a wall of chips.
 *
 * Progressive disclosure:
 *   - "Somewhere else" (id "Other") reveals a custom Country name
 *     UnderlineInput + a custom State/Province UnderlineInput.
 *   - A returning user whose saved country is NOT in the curated list gets it
 *     injected as the selected sheet option (the field never renders blank),
 *     and the custom inputs stay mounted — wired straight to `country` so
 *     typing can never unmount the input mid-keystroke when the debounced
 *     store sync flips `showCustomCountry` off.
 *
 * Stored field names are UNCHANGED: country / state / region. "Other" remains
 * the sentinel id the form hook keys on.
 *
 * Presentation only — validation + persistence stay in usePersonalInfoForm.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { tokens, type as typeScale, SectionLabel, Rule } from "./fresh";
import { SearchSheet, UnderlineInput } from "./aurora";
import type { SearchSheetOption } from "./aurora";
import { COUNTRIES_WITH_STATES } from "./PersonalInfoConstants";
import { PersonalInfoData } from "../../types/onboarding";

const OTHER_COUNTRY_ID = "Other";

/** Curated list + the "Other" sentinel — the sheet's base option set. */
const BASE_COUNTRY_OPTIONS: SearchSheetOption[] = [
  ...COUNTRIES_WITH_STATES.map((c) => ({ id: c.name, label: c.name })),
  { id: OTHER_COUNTRY_ID, label: "Somewhere else" },
];

const KNOWN_COUNTRY_IDS = new Set(BASE_COUNTRY_OPTIONS.map((o) => o.id));

interface LocationFieldsProps {
  formData: PersonalInfoData;
  availableStates: string[];
  showCustomCountry: boolean;
  customCountry: string;
  actions: {
    handleCountryChange: (country: string) => void;
    updateField: <K extends keyof PersonalInfoData>(
      field: K,
      value: PersonalInfoData[K],
    ) => void;
    setCustomCountry: (value: string) => void;
    hasFieldError: (field: string) => boolean;
    getFieldError: (field: string) => string | undefined;
  };
}

export const LocationFields: React.FC<LocationFieldsProps> = ({
  formData,
  availableStates,
  showCustomCountry,
  customCountry,
  actions,
}) => {
  const {
    handleCountryChange,
    updateField,
    setCustomCountry,
    hasFieldError,
    getFieldError,
  } = actions;

  // A saved country outside the curated list (typed via "Somewhere else" in a
  // previous session) must still display as the selected value — inject it as
  // a top option so the field never looks unset.
  const countryOptions = useMemo(() => {
    const current = formData.country;
    if (current && !KNOWN_COUNTRY_IDS.has(current)) {
      return [{ id: current, label: current }, ...BASE_COUNTRY_OPTIONS];
    }
    return BASE_COUNTRY_OPTIONS;
  }, [formData.country]);

  const stateOptions = useMemo(
    () => availableStates.map((s) => ({ id: s, label: s })),
    [availableStates],
  );

  // Custom-entry mode is on when the user picked "Other" this session OR when
  // the saved value is already a custom one. This keeps the free-text inputs
  // mounted through the debounced store sync (which flips showCustomCountry
  // off the moment the typed value round-trips) — the input can never vanish
  // under the user's thumbs mid-word.
  const isCustomCountry =
    showCustomCountry ||
    (formData.country.trim().length > 0 &&
      !KNOWN_COUNTRY_IDS.has(formData.country));

  // Re-selecting the current country is a no-op so it never wipes state/region.
  const handleSelectCountry = (id: string) => {
    if (id === formData.country) return;
    handleCountryChange(id);
  };

  // While "Other" is the sentinel value, the free-text draft lives in
  // `customCountry`; once the draft has round-tripped into `country`, the
  // input edits `country` directly. The switch is invisible — both hold the
  // same text at handoff.
  const customCountryValue = showCustomCountry
    ? customCountry
    : formData.country;
  const handleCustomCountryText = showCustomCountry
    ? setCustomCountry
    : (v: string) => updateField("country", v);

  const customCountryPending = showCustomCountry && !customCountry.trim();

  return (
    <View>
      <SectionLabel caption="Sets your food database, units, and currency.">
        Location
      </SectionLabel>

      <View style={styles.fieldBlock} testID="onboarding-country-field">
        <SearchSheet
          fieldLabel="Country"
          placeholder="Select your country"
          options={countryOptions}
          value={formData.country}
          onSelect={handleSelectCountry}
          testID="onboarding-country"
        />
        {hasFieldError("country") && (
          <Text style={styles.errorText}>{getFieldError("country")}</Text>
        )}
      </View>

      {isCustomCountry && (
        <Animated.View entering={FadeInDown.duration(280)}>
          <UnderlineInput
            label="Country Name"
            placeholder="Enter your country"
            value={customCountryValue}
            onChangeText={handleCustomCountryText}
            accentColor={tokens.accent}
            containerStyle={styles.fieldBlock}
            testID="onboarding-custom-country"
          />
          <Text style={styles.fieldCaption}>
            Tell us where you are — we'll tune everything to match.
          </Text>
          {customCountryPending && (
            <Text style={styles.errorText}>
              Enter your country to continue
            </Text>
          )}
        </Animated.View>
      )}

      {availableStates.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={styles.fieldBlock}
        >
          <SearchSheet
            fieldLabel="State / Province"
            placeholder="Select your state"
            options={stateOptions}
            value={formData.state}
            onSelect={(s) => updateField("state", s)}
            testID="onboarding-state"
          />
          {hasFieldError("state") && (
            <Text style={styles.errorText}>{getFieldError("state")}</Text>
          )}
        </Animated.View>
      )}

      {isCustomCountry && (
        <Animated.View entering={FadeInDown.duration(280)}>
          <UnderlineInput
            label="State / Province"
            placeholder="Enter your state or province"
            value={formData.state || ""}
            onChangeText={(v) => updateField("state", v)}
            accentColor={tokens.accent}
            containerStyle={styles.fieldBlock}
            testID="onboarding-custom-state"
          />
        </Animated.View>
      )}

      <UnderlineInput
        label="Region / City (Optional)"
        placeholder="e.g., Mumbai, Los Angeles, London"
        value={formData.region || ""}
        onChangeText={(v) => updateField("region", v)}
        accentColor={tokens.accent}
        containerStyle={styles.fieldBlock}
        testID="onboarding-region"
      />
      <Rule spacing={36} />
    </View>
  );
};

const styles = StyleSheet.create({
  /** 28px rhythm between the underline fields — same as the name row. */
  fieldBlock: {
    marginTop: 28,
  },
  /** Quiet conversational line under the custom-country reveal. */
  fieldCaption: {
    ...typeScale.captionStrong,
    marginTop: 10,
  },
  errorText: {
    ...typeScale.caption,
    color: tokens.danger,
    marginTop: 8,
  },
});
