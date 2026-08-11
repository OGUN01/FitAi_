// UI Components Barrel Export
// This file exports all base UI components for easy importing

/**
 * @deprecated Flat CTA button. Use `GlassButton` from './aurora/GlassButton'
 * for primary actions in new/updated screens — it matches the glass surfaces
 * used everywhere else in the app. Kept for legacy call sites only.
 */
export { Button } from './Button';
export { Input } from './Input';
export { PasswordInput } from './PasswordInput';
/**
 * @deprecated Flat panel. Use `GlassCard` from './aurora/GlassCard' for new
 * surfaces — it matches the frosted-glass look used across Home/Fitness/
 * Diet/Analytics. Kept for legacy call sites only.
 */
export { Card } from './Card';
/**
 * @deprecated Flat, unblurred modal wrapper. Use `BottomSheet` (or
 * `DetentBottomSheet`) from './aurora/BottomSheet' for any new sheet/dialog —
 * it provides the glass surface, drag-to-dismiss, and backdrop treatment used
 * by the rest of the app's modals. Kept for legacy call sites only.
 */
export { Modal } from './Modal';
/**
 * @deprecated Already uses `GlassCard` internally, but still renders through a
 * raw RN `Modal` (`DialogShell`) rather than the `BottomSheet` sheet system.
 * Prefer `BottomSheet` from './aurora/BottomSheet' with `GlassCard` content
 * for new confirmation/detail dialogs. Kept for legacy call sites only.
 */
export { CustomDialog, WorkoutStartDialog, WorkoutCompleteDialog } from './CustomDialog';

// Phase 3: Advanced Visual Components
export { ChartTooltip } from './ChartTooltip';
export { GradientBarChart, type BarData } from './GradientBarChart';
export { SegmentedControl, type SegmentOption } from './SegmentedControl';
export { ParticleBurst } from './ParticleBurst';

// Re-export theme for easy access
export { THEME } from '../../utils/constants';
