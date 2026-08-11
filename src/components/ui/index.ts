// UI Components Barrel Export
// This file exports all base UI components for easy importing

export { Button } from './Button';
export { Input } from './Input';
export { PasswordInput } from './PasswordInput';
export { Card } from './Card';
export { Modal } from './Modal';
export { CustomDialog, WorkoutStartDialog, WorkoutCompleteDialog } from './CustomDialog';

// Phase 3: Advanced Visual Components
export { ChartTooltip } from './ChartTooltip';
export { GradientBarChart, type BarData } from './GradientBarChart';
export { SegmentedControl, type SegmentOption } from './SegmentedControl';
export { ParticleBurst } from './ParticleBurst';

// Re-export theme for easy access
export { THEME } from '../../utils/constants';
