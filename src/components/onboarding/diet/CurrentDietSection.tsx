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
 * Presentation-only redesign — props contract (formData, updateField,
 * showInfoTooltip) unchanged. "balanced" is the §4 default diet_type but is
 * absent from DIET_TYPE_OPTIONS, so it remains surfaced as the 5th row.
 */

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DietPreferencesData } from "../../../types/onboarding";
import { DIET_TYPE_OPTIONS } from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { OptionRow, SectionLabel, tokens } from "../fresh";

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

interface CurrentDietSectionProps {
  formData: DietPreferencesData;
  updateField: <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => void;
  showInfoTooltip: (title: string, description: string) => void;
}

export const CurrentDietSection: React.FC<CurrentDietSectionProps> = ({
  formData,
  updateField,
  showInfoTooltip,
}) => {
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
});

export default CurrentDietSection;
