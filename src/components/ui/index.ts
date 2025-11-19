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

// Re-export theme for easy access
export { THEME } from '../../utils/constants';
