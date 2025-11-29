// UI Components Barrel Export
// This file exports all base UI components for easy importing

export { Button } from './Button';
export { Input } from './Input';
export { PasswordInput } from './PasswordInput';
export { Card } from './Card';
export { Modal, BottomSheetModal } from './Modal';
export { LoadingSpinner } from './LoadingSpinner';
export { CustomDialog, WorkoutStartDialog, WorkoutCompleteDialog } from './CustomDialog';
export { InfoTooltip } from './InfoTooltip';
export { Slider } from './Slider';

// Phase 3: Advanced Visual Components
export { CircularClock } from './CircularClock';
export { ColorCodedZones, HEART_RATE_ZONE_COLORS, calculateHeartRateZones } from './ColorCodedZones';
export { AnimatedChart } from './AnimatedChart';
export { SwipeableCardStack, type SwipeableCard } from './SwipeableCardStack';
export { BodySilhouette } from './BodySilhouette';
export { ChartTooltip } from './ChartTooltip';
export { AnimatedNumber } from './AnimatedNumber';
export { GradientBarChart, type BarData } from './GradientBarChart';
export { WeightProjectionChart, type MilestonePoint } from './WeightProjectionChart';
export { LargeProgressRing } from './LargeProgressRing';
export { ProgressCard } from './ProgressCard';
export { MetricInput } from './MetricInput';
export { PhotoUploadCard } from './PhotoUploadCard';
export { FeatureGrid, type FeatureItem } from './FeatureGrid';
export { SegmentedControl, type SegmentOption } from './SegmentedControl';
export { ChipSelector, type ChipOption } from './ChipSelector';
export { ToggleCard } from './ToggleCard';
export { PulseButton } from './PulseButton';
export { ParticleBurst } from './ParticleBurst';
export { CascadeGrid } from './CascadeGrid';

// Re-export theme for easy access
export { THEME } from '../../utils/constants';
