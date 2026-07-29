/**
 * LocationSelector — single-select location ChipPicker (blueprint §6/§7.4)
 *
 * Aurora redesign. Data wiring unchanged: `onLocationChange`.
 */

import React from "react";
import { View } from "react-native";
import { ChipPicker, SectionHeader } from "../../aurora";
import { chart } from "../../../../theme/aurora-tokens";
import { LOCATION_OPTIONS } from "../../../../screens/onboarding/tabs/WorkoutPreferencesConstants";
import { WorkoutPreferencesData } from "../../../../types/onboarding";

interface LocationSelectorProps {
  selectedLocation: WorkoutPreferencesData["location"];
  onLocationChange: (location: WorkoutPreferencesData["location"]) => void;
  onInfoPress?: (title: string, description: string) => void;
}

const OPTIONS = LOCATION_OPTIONS.map((o) => ({
  id: o.id,
  label: o.title,
  icon: o.iconName,
}));

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationChange,
}) => {
  return (
    <View>
      <SectionHeader title="Workout location" subtitle="Home, gym, or both" />
      <ChipPicker
        options={OPTIONS}
        value={selectedLocation}
        onSelect={(id: string) =>
          onLocationChange(id as WorkoutPreferencesData["location"])
        }
        accentColor={chart[1]}
        testID="location-leaf-chip-picker"
      />
    </View>
  );
};
