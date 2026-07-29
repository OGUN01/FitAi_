/**
 * DurationSelector — time_preference as a RangeSlider (blueprint §6/§7.6)
 *
 * Aurora redesign of the legacy pill-scroll. Used by PreferencesSection
 * inline; this leaf is kept for any caller that wants the slider in isolation.
 * Data wiring unchanged: `onDurationChange(minutes)`.
 */

import React from "react";
import { View } from "react-native";
import { RangeSlider, SectionHeader } from "../../aurora";
import { chart } from "../../../../theme/aurora-tokens";

interface DurationSelectorProps {
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
};

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  selectedDuration,
  onDurationChange,
}) => {
  return (
    <View>
      <SectionHeader
        title="Session duration"
        subtitle={`Target: ${formatTime(selectedDuration)}`}
      />
      <RangeSlider
        value={selectedDuration}
        min={15}
        max={120}
        step={5}
        onChange={onDurationChange}
        unit="min"
        tickHapticEvery={5}
        accentColor={chart[1]}
        testID="duration-slider"
      />
    </View>
  );
};
