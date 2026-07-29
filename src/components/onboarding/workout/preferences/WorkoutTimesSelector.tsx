/**
 * WorkoutTimesSelector — multi-select preferred times ChipPicker (blueprint §6/§7.4)
 *
 * Aurora redesign. Data wiring unchanged: `onToggleTime`.
 */

import React from "react";
import { View } from "react-native";
import { ChipPicker, SectionHeader } from "../../aurora";
import { chart } from "../../../../theme/aurora-tokens";
import { WORKOUT_TIMES } from "../../../../screens/onboarding/tabs/WorkoutPreferencesConstants";

interface WorkoutTimesSelectorProps {
  selectedTimes: string[];
  onToggleTime: (timeId: string) => void;
}

const OPTIONS = WORKOUT_TIMES.map((t) => ({
  id: t.value,
  label: t.label,
  icon: t.iconName,
}));

export const WorkoutTimesSelector: React.FC<WorkoutTimesSelectorProps> = ({
  selectedTimes,
  onToggleTime,
}) => {
  return (
    <View>
      <SectionHeader title="Preferred times" subtitle="When do you like to train?" />
      <ChipPicker
        options={OPTIONS}
        value={selectedTimes}
        onSelect={onToggleTime}
        multi
        accentColor={chart[1]}
        testID="workout-times-leaf-chip-picker"
      />
    </View>
  );
};
