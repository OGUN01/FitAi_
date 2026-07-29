/**
 * EquipmentSelector — multi-select equipment ChipPicker (blueprint §6/§7.4)
 *
 * Aurora redesign. Data wiring unchanged: `onEquipmentChange`. When location
 * is "gym", standard gym equipment is auto-filled by the hook — this leaf just
 * renders the current selection as chips (the parent owns the auto-fill logic).
 */

import React from "react";
import { View } from "react-native";
import { ChipPicker, SectionHeader } from "../../aurora";
import { chart } from "../../../../theme/aurora-tokens";
import { EQUIPMENT_OPTIONS } from "../../../../screens/onboarding/tabs/WorkoutPreferencesConstants";

interface EquipmentSelectorProps {
  location: "gym" | "home" | "both";
  selectedEquipment: string[];
  onEquipmentChange: (equipment: string[]) => void;
}

const OPTIONS = EQUIPMENT_OPTIONS.map((e) => ({
  id: e.value,
  label: e.label,
  icon: e.iconName,
}));

export const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  selectedEquipment,
  onEquipmentChange,
}) => {
  const toggle = (id: string) => {
    const next = selectedEquipment.includes(id)
      ? selectedEquipment.filter((x) => x !== id)
      : [...selectedEquipment, id];
    onEquipmentChange(next);
  };

  return (
    <View>
      <SectionHeader
        title="Equipment"
        subtitle="Tap to toggle what you have access to"
      />
      <ChipPicker
        options={OPTIONS}
        value={selectedEquipment}
        onSelect={toggle}
        multi
        accentColor={chart[1]}
        testID="equipment-leaf-chip-picker"
      />
    </View>
  );
};
