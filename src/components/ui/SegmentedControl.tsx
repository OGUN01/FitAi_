/**
 * SegmentedControl — flat/dark variant of the shared sliding-indicator
 * control, used by ExerciseEditorSheet. Thin wrapper preserving the original
 * public API; the sliding-indicator motion/layout logic itself now lives in
 * `SlidingSegmentedControl` (src/components/ui/aurora/) so it stays in sync
 * with the Aurora-variant used by Analytics' PeriodSelector.
 */
import React from 'react';
import { ViewStyle } from 'react-native';
import { SlidingSegmentedControl } from './aurora/SlidingSegmentedControl';

export interface SegmentOption {
  id: string;
  label: string;
  value: string | number;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Kept for backward compatibility — no longer used. The indicator is now a
   *  white surface with a subtle shadow (spec §6.5). */
  gradient?: string[];
  style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedId,
  onSelect,
  gradient: _gradient,
  style,
}) => {
  return (
    <SlidingSegmentedControl
      options={options}
      selectedId={selectedId}
      onSelect={onSelect}
      variant="flat"
      style={style}
    />
  );
};

export default SegmentedControl;
