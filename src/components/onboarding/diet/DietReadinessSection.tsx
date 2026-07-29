/**
 * S3 "Fuel" — DietReadinessSection (blueprint §3 S3, §5 S3, §6 input map)
 *
 * Fresh "Editorial Dark" — PEAK pass. The 6 ready-flags (keto / IF / paleo /
 * mediterranean / low_carb / high_protein) are an icon Pill grid inside a
 * CollapsibleSection that defaults to collapsed and removes its content from
 * layout when closed.
 *
 * Selected-state system (uniform across the diet tab): a pill shows its
 * identity icon (ink2) when off and an accent checkmark + accentDim fill
 * when on. The collapsed subtitle NAMES the picks — "2 · Keto, Paleo +1" —
 * so closing the section never hides the selection (2026 chip-rail rule).
 *
 * Presentation-only redesign — props contract (formData, toggleDietReadiness,
 * showInfoTooltip) unchanged; fields still save via toggleDietReadiness.
 */

import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DietPreferencesData } from "../../../types/onboarding";
import { DIET_READINESS_OPTIONS } from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { CollapsibleSection, Pill } from "../fresh";
import { countWithPreview } from "./selectionPreview";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface DietReadinessSectionProps {
  formData: DietPreferencesData;
  toggleDietReadiness: (dietKey: keyof DietPreferencesData) => void;
  showInfoTooltip: (
    title: string,
    description: string,
    benefits?: string[],
  ) => void;
}

export const DietReadinessSection: React.FC<DietReadinessSectionProps> = ({
  formData,
  toggleDietReadiness,
}) => {
  const [open, setOpen] = useState(false);
  const selected = DIET_READINESS_OPTIONS.filter(
    (o) => formData[o.key as keyof DietPreferencesData] as boolean,
  );

  return (
    <CollapsibleSection
      title="Diet Readiness"
      subtitle={countWithPreview(
        selected.length,
        "Open to trying any of these specialized diets? (optional)",
        selected.map((o) => o.title),
      )}
      expanded={open}
      onToggle={() => setOpen((v) => !v)}
      testID="diet-readiness-section"
    >
      <View style={styles.pillGrid}>
        {DIET_READINESS_OPTIONS.map((o) => {
          const isReady = formData[o.key as keyof DietPreferencesData] as boolean;
          return (
            <Pill
              key={o.key}
              label={o.title}
              icon={isReady ? "checkmark" : (o.iconName as IoniconName)}
              selected={isReady}
              onPress={() =>
                toggleDietReadiness(o.key as keyof DietPreferencesData)
              }
              testID={`readiness-${o.key}`}
            />
          );
        })}
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

export default DietReadinessSection;
