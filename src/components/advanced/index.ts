// Advanced Components Barrel Export
// This file exports advanced UI components for easy importing.
//
// Only components with real production or test usage live here. The rest
// (Slider, RatingSelector, SwipeGesture, PullToRefresh, LongPressMenu,
// HapticFeedback) were unmaintained duplicates never imported by any screen
// — every screen that needed that behavior built its own local version
// instead (e.g. onboarding/aurora/RangeSlider, diet/portion/CustomSlider,
// gestures/handlers.ts's usePullToRefresh) — and have been removed.

export { Camera } from './Camera';
export { ImagePicker } from './ImagePicker';
export { DatePicker } from './DatePicker';
export { MultiSelect } from './MultiSelect';
export { MultiSelectWithCustom } from './MultiSelectWithCustom';
