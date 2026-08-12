/**
 * PeriodSelector Component
 * Aurora-variant sliding segmented control for Week/Month/Quarter/Year.
 * The sliding-indicator motion/layout logic lives in the shared
 * `SlidingSegmentedControl` (src/components/ui/aurora/) so it stays visually
 * and behaviorally identical to every other exclusive single-select toggle
 * in the app (e.g. ExerciseEditorSheet's SegmentedControl).
 */

import React from 'react';
import { SlidingSegmentedControl } from '../../../components/ui/aurora/SlidingSegmentedControl';

export type Period = 'week' | 'month' | 'quarter' | 'year';

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  return (
    <SlidingSegmentedControl
      options={PERIODS.map((p) => ({ id: p.key, label: p.label }))}
      selectedId={selectedPeriod}
      onSelect={(id) => onPeriodChange(id as Period)}
      variant="aurora"
      testIDPrefix="period-selector"
    />
  );
};

export default PeriodSelector;
