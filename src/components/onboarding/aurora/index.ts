/**
 * Aurora onboarding shared component library
 *
 * Barrel for the shared components actually wired into the live onboarding
 * flow (OnboardingContainer → tabs → these). Presentation/layout/animation
 * only — props, hooks, validation, and data wiring stay in the screens.
 */

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

export { SectionHeader } from "./SectionHeader";
export type { SectionHeaderProps } from "./SectionHeader";

export { InfoTap } from "./InfoTap";
export type { InfoTapProps } from "./InfoTap";

export { SkiaBloom } from "./SkiaBloom";
export type { SkiaBloomProps } from "./SkiaBloom";

export { UnderlineInput } from "./UnderlineInput";
export type { UnderlineInputProps } from "./UnderlineInput";

export { SearchSheet } from "./SearchSheet";
export type { SearchSheetProps, SearchSheetOption } from "./SearchSheet";
