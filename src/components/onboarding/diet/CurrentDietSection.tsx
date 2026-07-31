/**
 * S3 "Fuel" — CurrentDietSection (blueprint §3 S3, §6 input map)
 *
 * Fresh "Editorial Dark" — PEAK pass. diet_type is the focal list of the
 * screen: 5 full-width OptionRows (icon + sublabel, hairline-separated,
 * accent check + 2px left bar when selected). The old prose helper line is
 * gone — the scaffold's big question + subtext already frame it; the info
 * affordance is a quiet ink3 glyph aligned to the label row's right edge
 * (still opens the shared tooltip modal).
 *
 * Below the diet rows sits the cuisine picker (H4 drift fix): a
 * CollapsibleSection ("Cuisines you like — optional") holding grouped
 * ChipPickers (Indian / Asian / European / Americas & Middle East,
 * 12 options total). Collapse ≠ hide — the subtitle reflects the current
 * selection count. Smart default (§4): when the S1 country maps to a
 * cuisine and the user hasn't picked any yet, that cuisine is pre-selected
 * once on mount AND surfaced as a suggestion (ChipPicker bulb tint) so the
 * choice stays visible + editable. Persisted to
 * diet_preferences.cuisine_preferences; consumed by the diet worker prompt
 * (CUISINE_PREFERENCES placeholder, prioritized over country auto-detect).
 *
 * Presentation + cuisine field wiring. diet_type props contract
 * (formData, updateField, showInfoTooltip) unchanged. "balanced" is the §4
 * default diet_type but is absent from DIET_TYPE_OPTIONS, so it remains
 * surfaced as the 5th row.
 */

import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DietPreferencesData } from "../../../types/onboarding";
import {
  CUISINE_OPTIONS,
  CUISINE_REGION_LABELS,
  DIET_TYPE_OPTIONS,
  getCountryDerivedCuisine,
  type CuisineOption,
} from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import {
  CollapsibleSection,
  OptionRow,
  SectionLabel,
  tokens,
  type as typeScale,
} from "../fresh";
import { ChipPicker } from "../aurora/ChipPicker";

type IoniconName = keyof typeof Ionicons.glyphMap;

const DIET_TYPE_ROWS: {
  id: string;
  label: string;
  sublabel: string;
  icon: IoniconName;
}[] = [
  ...DIET_TYPE_OPTIONS.map((o) => ({
    id: o.id,
    label: o.title,
    sublabel: o.description,
    icon: o.iconName as IoniconName,
  })),
  {
    id: "balanced",
    label: "Balanced",
    sublabel: "A flexible mix of everything, in moderation",
    icon: "restaurant-outline" as IoniconName,
  },
];

/** Region render order for the grouped chip layout. */
const CUISINE_REGION_ORDER: CuisineOption["region"][] = [
  "indian",
  "asian",
  "european",
  "americas",
];

interface CurrentDietSectionProps {
  formData: DietPreferencesData;
  updateField: <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => void;
  showInfoTooltip: (title: string, description: string) => void;
  /**
   * S1 country selection — drives the cuisine smart default + suggestion
   * tint. Optional: null/undefined → no suggestion surfaced.
   */
  country?: string | null;
}

export const CurrentDietSection: React.FC<CurrentDietSectionProps> = ({
  formData,
  updateField,
  showInfoTooltip,
  country = null,
}) => {
  const selectedCuisines = formData.cuisine_preferences ?? [];
  const suggestedCuisine = getCountryDerivedCuisine(country);

  // §4 smart default: pre-select the country-derived cuisine exactly once,
  // only when the user has no persisted/existing picks. The ref guard keeps
  // it a true default — the user can still deselect it or clear everything
  // afterwards without the default snapping back.
  //
  // Two mount-order hazards on web (and device on rehydrate):
  //  1. `country` may arrive a tick late (async store rehydration), so key the
  //     effect on `suggestedCuisine` instead of firing once blindly.
  //  2. The parent form hook (useDietPreferences) runs a sync-from-props
  //     setFormData in its own mount effect AFTER this child effect (child
  //     effects flush first), which would clobber a same-tick write. Defer
  //     the write past the mount flush with setTimeout(0) so it lands after.
  const appliedCuisineDefaultRef = useRef(false);
  useEffect(() => {
    if (appliedCuisineDefaultRef.current) return;
    if (selectedCuisines.length > 0) {
      appliedCuisineDefaultRef.current = true;
      return;
    }
    if (!suggestedCuisine) return;
    appliedCuisineDefaultRef.current = true;
    const t = setTimeout(
      () => updateField("cuisine_preferences", [suggestedCuisine]),
      0,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedCuisine]);

  const handleCuisineSelect = (id: string) => {
    const next = selectedCuisines.includes(id)
      ? selectedCuisines.filter((c) => c !== id)
      : [...selectedCuisines, id];
    updateField("cuisine_preferences", next);
  };

  const cuisineSubtitle =
    selectedCuisines.length === 0
      ? "Used to shape your meal plans — skip to keep it global."
      : `${selectedCuisines.length} selected`;

  return (
    <View>
      {/* Label row — small-caps left, quiet info glyph right. One edge. */}
      <View style={styles.labelRow}>
        <SectionLabel>Current Diet Type</SectionLabel>
        <Pressable
          accessibilityLabel="More info about Diet Type"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() =>
            showInfoTooltip(
              "Diet Type",
              "Choose the eating pattern that matches you today. You can adjust this later.",
            )
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={tokens.ink3}
          />
        </Pressable>
      </View>
      {DIET_TYPE_ROWS.map((o) => (
        <OptionRow
          key={o.id}
          label={o.label}
          sublabel={o.sublabel}
          icon={o.icon}
          selected={formData.diet_type === o.id}
          onPress={() =>
            updateField("diet_type", o.id as DietPreferencesData["diet_type"])
          }
          testID={`diet-type-${o.id}`}
        />
      ))}

      {/* Cuisine picker — progressive disclosure. Collapsed: one quiet
          header line ("Cuisines you like — optional" + selection count).
          Expanded: grouped multi-select chips. The country-derived cuisine
          is marked as a suggestion (bulb tint) so the smart default reads
          as "we guessed — change it", not a hidden fallback. */}
      <View style={styles.cuisineBlock}>
        <CollapsibleSection
          title="Cuisines you like — optional"
          subtitle={cuisineSubtitle}
          testID="cuisine-preferences-section"
        >
          <View
            accessibilityLabel="Cuisine preferences, multi select"
            accessibilityRole="none"
          >
            {CUISINE_REGION_ORDER.map((region) => {
              const regionOptions = CUISINE_OPTIONS.filter(
                (o) => o.region === region,
              );
              return (
                <View key={region} style={styles.regionGroup}>
                  <Text style={styles.regionLabel}>
                    {CUISINE_REGION_LABELS[region]}
                  </Text>
                  <ChipPicker
                    multi
                    options={regionOptions.map((o) => ({
                      id: o.id,
                      label: o.label,
                    }))}
                    value={selectedCuisines}
                    onSelect={handleCuisineSelect}
                    suggestions={
                      suggestedCuisine ? [suggestedCuisine] : undefined
                    }
                    testID={`cuisine-picker-${region}`}
                  />
                </View>
              );
            })}
          </View>
        </CollapsibleSection>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cuisineBlock: {
    marginTop: 16,
  },
  regionGroup: {
    marginBottom: 16,
  },
  regionLabel: {
    ...typeScale.caption,
    color: tokens.ink3,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
});

export default CurrentDietSection;
