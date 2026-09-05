/**
 * "Editorial Dark" shared primitives — promoted from
 * src/components/onboarding/fresh/ for main-app (non-onboarding) use, per
 * DESIGN.md and the app-wide visual overhaul
 * (src/docs/VISUAL_DESIGN_OVERHAUL.md, Stage 1).
 *
 * Re-exports rather than moves the underlying files: these primitives are
 * pure, portable presentational components (only depend on `tokens.ts` +
 * `theme/fonts`, nothing onboarding-specific), and re-exporting avoids
 * touching onboarding's own working imports while giving the rest of the
 * app one shared, discoverable import path
 * (`src/components/ui/editorial`) instead of reaching across into
 * `onboarding/fresh/` directly.
 *
 * Use these instead of a boxed/bordered card container for a section of
 * content that should read as "label + content + hairline," not a card —
 * see DESIGN.md §7 (Components — Section).
 */
export { Rule } from "../../onboarding/fresh/Rule";
export type { RuleProps } from "../../onboarding/fresh/Rule";

export { SectionLabel } from "../../onboarding/fresh/SectionLabel";
export type { SectionLabelProps } from "../../onboarding/fresh/SectionLabel";

export { OptionRow } from "../../onboarding/fresh/OptionRow";
export type { OptionRowProps } from "../../onboarding/fresh/OptionRow";

export { RowGroup } from "../../onboarding/fresh/RowGroup";
export type { RowGroupProps } from "../../onboarding/fresh/RowGroup";

export { Pill } from "../../onboarding/fresh/Pill";
export type { PillProps } from "../../onboarding/fresh/Pill";

export { CollapsibleSection } from "../../onboarding/fresh/CollapsibleSection";
export type { CollapsibleSectionProps } from "../../onboarding/fresh/CollapsibleSection";
