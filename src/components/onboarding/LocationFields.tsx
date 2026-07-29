/**
 * LocationFields — S1 "You" location inputs, Editorial Dark skin.
 *
 * Country: Pill wrap (7 countries + Other) — single-select chips, accent on
 * selected, plus a one-line "why we ask" caption. State: Pill wrap when the
 * country has states, otherwise an UnderlineInput. Custom-country and state
 * reveals fade in (progressive disclosure — no popping). Region/city:
 * UnderlineInput. No cards, no boxed chip grids — hairlines and type only.
 *
 * Presentation only — props/hooks/validation identical to the data layer.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { tokens, type as typeScale, SectionLabel, Rule, Pill } from "./fresh";
import { UnderlineInput } from "./aurora";
import { COUNTRIES_WITH_STATES } from "./PersonalInfoConstants";
import { PersonalInfoData } from "../../types/onboarding";

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

  const countryOptions = [
    ...COUNTRIES_WITH_STATES.map((c) => ({ id: c.name, label: c.name })),
    { id: "Other", label: "Other" },
  ];

  return (
    <View>
      <SectionLabel>Country</SectionLabel>
      <View style={styles.pillWrap} testID="onboarding-country">
        {countryOptions.map((c) => (
          <Pill
            key={c.id}
            label={c.label}
            selected={formData.country === c.id}
            onPress={() => handleCountryChange(c.id)}
            testID={`onboarding-country-${c.id}`}
          />
        ))}
      </View>
      <Text style={styles.fieldCaption}>
        Sets your food database and measurement units.
      </Text>
      {hasFieldError("country") && (
        <Text style={styles.errorText}>{getFieldError("country")}</Text>
      )}

      {showCustomCountry && (
        <Animated.View entering={FadeInDown.duration(280)}>
          <UnderlineInput
            label="Country Name"
            placeholder="Enter your country"
            value={customCountry}
            onChangeText={setCustomCountry}
            accentColor={tokens.accent}
            containerStyle={styles.fieldBlock}
            testID="onboarding-custom-country"
          />
        </Animated.View>
      )}

      {availableStates.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={styles.fieldBlock}
        >
          <SectionLabel>State / Province</SectionLabel>
          <View style={styles.pillWrap} testID="onboarding-state">
            {availableStates.map((s) => (
              <Pill
                key={s}
                label={s}
                selected={formData.state === s}
                onPress={() => updateField("state", s)}
                testID={`onboarding-state-${s}`}
              />
            ))}
          </View>
          {hasFieldError("state") && (
            <Text style={styles.errorText}>{getFieldError("state")}</Text>
          )}
        </Animated.View>
      )}

      {showCustomCountry && (
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
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  fieldBlock: {
    marginTop: 28,
  },
  /** One-line "why we ask" caption under the country chips. */
  fieldCaption: {
    ...typeScale.caption,
    marginTop: 10,
  },
  errorText: {
    ...typeScale.caption,
    color: tokens.danger,
    marginTop: 8,
  },
});
