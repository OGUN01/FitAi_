/**
 * Aurora onboarding shared component library (blueprint §7)
 *
 * Barrel for the 13 shared components all onboarding Phase 2 screen agents
 * import. Presentation/layout/animation only — props, hooks, validation, and
 * data wiring stay in the screens.
 */

export { AuroraBeam } from "./AuroraBeam";
export type { AuroraBeamProps } from "./AuroraBeam";

export { AuroraField } from "./AuroraField";
export type { AuroraFieldProps } from "./AuroraField";

export { SectionShell } from "./SectionShell";
export type { SectionShellProps } from "./SectionShell";

export { ChipPicker } from "./ChipPicker";
export type { ChipPickerProps, ChipOption } from "./ChipPicker";

export { DialStepper } from "./DialStepper";
export type { DialStepperProps } from "./DialStepper";

export { RangeSlider } from "./RangeSlider";
export type { RangeSliderProps } from "./RangeSlider";

export { RadialDial } from "./RadialDial";
export type { RadialDialProps, RadialDialVariant } from "./RadialDial";

export { TogglePill } from "./TogglePill";
export type { TogglePillProps } from "./TogglePill";

export { SectionHeader } from "./SectionHeader";
export type { SectionHeaderProps } from "./SectionHeader";

export { InfoTap } from "./InfoTap";
export type { InfoTapProps } from "./InfoTap";

export { NavRail } from "./NavRail";
export type { NavRailProps } from "./NavRail";

export { MetricTile } from "./MetricTile";
export type { MetricTileProps } from "./MetricTile";

export { SkiaBloom } from "./SkiaBloom";
export type { SkiaBloomProps } from "./SkiaBloom";

// ── "Better than 2026" redesign — fresh interaction components ────────────
export { QuestionHero } from "./QuestionHero";
export type { QuestionHeroProps } from "./QuestionHero";

export { UnderlineInput } from "./UnderlineInput";
export type { UnderlineInputProps } from "./UnderlineInput";

export { StepperRow } from "./StepperRow";
export type { StepperRowProps, StepperOption } from "./StepperRow";

export { TogglePillRow } from "./TogglePillRow";
export type { TogglePillRowProps, TogglePillItem } from "./TogglePillRow";

export { GoalCarousel } from "./GoalCarousel";
export type { GoalCarouselProps, GoalOption } from "./GoalCarousel";

export { SearchSheet } from "./SearchSheet";
export type { SearchSheetProps, SearchSheetOption } from "./SearchSheet";

export { ScreenFrame } from "./ScreenFrame";
export type { ScreenFrameProps } from "./ScreenFrame";
