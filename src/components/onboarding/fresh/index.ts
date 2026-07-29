/**
 * fresh/ — "Editorial Dark" onboarding primitive kit (docs/onboarding-fresh-design.md)
 *
 * Barrel re-exporting every primitive + the token/type/spacing scales.
 * Tab agents import ONLY from here:
 *
 *   import { tokens, type, spacing, Rule, SectionLabel, OptionRow, RowGroup,
 *            Pill, StrokeRing, CollapsibleSection, ScreenScaffold } from
 *          "../../components/onboarding/fresh";
 */

export { tokens, type, font, spacing } from "./tokens";

export { Rule } from "./Rule";
export type { RuleProps } from "./Rule";

export { SectionLabel } from "./SectionLabel";
export type { SectionLabelProps } from "./SectionLabel";

export { OptionRow } from "./OptionRow";
export type { OptionRowProps } from "./OptionRow";

export { RowGroup } from "./RowGroup";
export type { RowGroupProps } from "./RowGroup";

export { Pill } from "./Pill";
export type { PillProps } from "./Pill";

export { StrokeRing } from "./StrokeRing";
export type { StrokeRingProps } from "./StrokeRing";

export { CollapsibleSection } from "./CollapsibleSection";
export type { CollapsibleSectionProps } from "./CollapsibleSection";

export { TimeRow } from "./TimeRow";
export type { TimeRowProps } from "./TimeRow";

export { ScreenScaffold } from "./ScreenScaffold";
export type { ScreenScaffoldProps } from "./ScreenScaffold";
