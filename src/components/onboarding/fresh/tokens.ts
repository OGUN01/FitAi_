/**
 * tokens.ts — "Editorial Dark" design tokens (docs/onboarding-fresh-design.md)
 *
 * Single source of truth for the onboarding re-skin. Content breathes on pure
 * black; hierarchy comes from type, space, and hairlines — never containers.
 *
 * Accent discipline (critical): `accent` is used ONLY for the primary CTA, the
 * selected-state indicator (check / 2px left bar), key numbers, and the focused
 * underline. It is NEVER a big background fill. Restraint = premium.
 *
 * NO fontWeight anywhere — each Manrope weight is a separate native family
 * (see src/theme/fonts.ts). Use the `type` scale / `font` map below.
 */

import { FONT_FAMILY } from "../../../theme/fonts";

/** Color palette. */
export const tokens = {
  /** Near-OLED black, screen background. */
  bg: "#050505",
  /** Primary text. */
  ink: "#F5F5F5",
  /** Secondary text. */
  ink2: "rgba(245,245,245,0.55)",
  /** Tertiary text / labels / placeholders. */
  ink3: "rgba(245,245,245,0.34)",
  /** 1px separators — the ONLY "border". */
  hairline: "rgba(255,255,255,0.08)",
  /** Brand orange — the single brand accent (matches the app's primary). */
  accent: "#FF6B35",
  /** Accent at low alpha, for a selected dot / chip bg. */
  accentDim: "rgba(255,107,53,0.14)",
  /** Healthy / in-range semantic green — NOT a second brand accent. Use only
      for "healthy zone", safe-rate, in-target states so accent keeps meaning
      "brand emphasis". */
  healthy: "#7BD88F",
  /** Healthy at low alpha (e.g. BMI healthy band on the spectrum strip). */
  healthyDim: "rgba(123,216,143,0.16)",
  /** Error / destructive. */
  danger: "#FF6B6B",
} as const;

/**
 * Manrope family map (one native family per weight). Re-exports the app's
 * canonical FONT_FAMILY so fresh primitives never hardcode family strings.
 *
 *   font.light     Manrope_300Light
 *   font.regular   Manrope_400Regular
 *   font.medium    Manrope_500Medium
 *   font.semibold  Manrope_600SemiBold
 *   font.bold      Manrope_700Bold
 *   font.extrabold Manrope_800ExtraBold
 */
export const font = FONT_FAMILY;

/**
 * Type scale (spec §Type). Spread into a StyleSheet text style; never add
 * `fontWeight` — the family IS the weight.
 */
export const type = {
  /** Hero number (plan-reveal scale — calorie target, goal weight). Manrope
      300, 64px, tight tracking. PAIR WITH `fontVariant: ["tabular-nums"]` on
      the Text style so digits don't jitter. Scale carries the hierarchy —
      never tint the hero with accent; only the unit gets accent. */
  hero: {
    fontFamily: font.light,
    fontSize: 64,
    letterSpacing: -1.5,
    color: tokens.ink,
  },
  /** The big screen question. Manrope 300, 40/44, ink. */
  question: {
    fontFamily: font.light,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.5,
    color: tokens.ink,
  },
  /** Section headers. Manrope 600, 11px, uppercase, ls 1.6, ink3. */
  sectionLabel: {
    fontFamily: font.semibold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  /** Field values, option labels. Manrope 500, 17px, ink. */
  value: {
    fontFamily: font.medium,
    fontSize: 17,
    color: tokens.ink,
  },
  /** Big numbers. Manrope 600, 22px, ink. */
  valueLg: {
    fontFamily: font.semibold,
    fontSize: 22,
    color: tokens.ink,
  },
  /** Helper / subtext. Manrope 400, 14px, ink2. */
  body: {
    fontFamily: font.regular,
    fontSize: 14,
    color: tokens.ink2,
  },
  /** Fine print. Manrope 400, 12px, ink3. */
  caption: {
    fontFamily: font.regular,
    fontSize: 12,
    color: tokens.ink3,
  },
  /** "Why we ask" / conversational microcopy. Manrope 400, 12px, ink2 —
      one step above the legibility floor so helper lines read as spoken, not
      as footnotes. */
  captionStrong: {
    fontFamily: font.regular,
    fontSize: 12,
    color: tokens.ink2,
  },
} as const;

/** Spacing scale (4pt grid, spec §Spacing). */
export const spacing = {
  /** 24px horizontal screen padding. */
  screenPad: 24,
  /** 40px between the big question and the first section. */
  qGap: 40,
  /** 36px between sections. */
  sectionGap: 36,
  /** 56px standard tappable row height. */
  rowH: 56,
  /** 1px hairline. */
  hair: 1,
  /** 4pt grid micro-steps (for inner paddings/gaps). */
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
} as const;
