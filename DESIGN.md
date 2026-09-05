# FitAI Design System — "Editorial Dark"

This file is the single visual source of truth for FitAI. It supersedes
`docs/onboarding-blueprint.md` (superseded "Aurora 2026" onboarding kit),
`docs/UIUX_METHODOLOGY.md` (obsolete — mandates glassmorphism, do not use),
and reconciles `docs/onboarding-fresh-design.md` with the app-wide token file
`src/theme/aurora-tokens.ts`. Read this before writing or reviewing any UI
code. If a value here and a value in code disagree, **this file is wrong and
must be fixed** — it should always describe what the code actually does.

Standing tracker for the ongoing rollout of this system across the app:
`src/docs/VISUAL_DESIGN_OVERHAUL.md`.

## 1. Overview

FitAI's visual language is **Editorial Dark**: restrained, minimalist,
near-OLED-black, separated by hairlines rather than boxes or shadows. One
accent color, used sparingly, carries all emphasis. Manrope is the only
typeface. This standard originated in the onboarding flow
(`src/components/onboarding/fresh/`) and is now canonical for the entire app.

The opposite of this system is: glassmorphism/blur, drop shadows, gradient
fills used as decoration, nested "card in a card" containers, Material
Design stock colors, and more than one font-weight mechanism.

## 2. Colors

Single source of truth: `src/theme/aurora-tokens.ts` (`colors`, `surface`,
`border`, `chart`). Never hardcode a hex/rgba literal in a component —
import from this file.

| Token | Value | Use |
|---|---|---|
| `colors.background.DEFAULT` | `#050505` | Screen background |
| `colors.background.secondary` / `surface[1]` | `#15161B` | Card / row fill (1 level of elevation) |
| `colors.background.tertiary` / `surface[2]` | `#232430` | Raised control (pressed row, popover) — controls only, never a stacked card |
| `colors.text.primary` | `#F5F5F5` | Primary text |
| `colors.text.secondary` | `rgba(245,245,245,0.55)` | Secondary text |
| `colors.text.tertiary` / `.muted` | `rgba(245,245,245,0.5)` | Tertiary text, labels, placeholders |
| `border.subtle` | `rgba(255,255,255,0.08)` | The default hairline — the only "border" most surfaces need |
| `border.DEFAULT` | `rgba(255,255,255,0.12)` | Slightly stronger hairline (focused states, selected chip) |
| `border.strong` | `rgba(255,255,255,0.18)` | Rare, high-emphasis separator |
| `colors.primary.DEFAULT` (accent) | `#FF6B35` | The ONE brand accent |
| `colors.primary` tint (`accentDim`) | `rgba(255,107,53,0.14)` | Selected-chip background |
| `chart[1..6]` | `#FF6B35 #00D4FF #9333EA #4ADE80 #FBBF24 #EC4899` | Data-viz series, and the governed source for any new category/semantic accent — never freehand a new color |

**Deviation from onboarding's literal values, and why.** `docs/onboarding-fresh-design.md`
documents `ink3` at 34% white. Adopted as-is, that only clears ~2.8-3.0:1 on
this app's background tiers — below WCAG AA even at the relaxed 3:1
large-text threshold (verified via `src/utils/accessibility/__tests__/contrast.test.ts`,
which exists because a past dimmer value failed this exact check once
already). The canonical value is 50% instead, which keeps the same
restrained/dimmed feel while clearing 4.5:1+ with margin on every background
tier. `src/components/onboarding/fresh/tokens.ts` re-exports this same value
(rather than hardcoding 34% separately), so onboarding's own rendering
updated too — this incidentally fixes the same latent contrast issue there
(`sectionLabel` renders at 11px, `caption` at 12px, both normal-text-sized).

**Semantic status colors — KNOWN GAP, fix in Stage 3.** `colors.success` /
`.warning` / `.error` / `.info` currently point at unmodified Material Design
2014 stock colors (`#4CAF50` / `#FF9800` / `#F44336` / `#2196F3`). These read
visually alien against the rest of the palette, and `warning` (`#FF9800`) is
close enough to `primary` (`#FF6B35`) to be confusable. **Do not keep these
values** — re-derive semantic colors from the `chart` palette or pick new
values that sit harmoniously with `#FF6B35`/`#00D4FF`/`#9333EA`, and update
this table once decided.

**Banned:** `flatColors` (the deprecated flat projection in
`aurora-tokens.ts`, frozen for a small legacy set only — never add new
entries or new consumers), any hardcoded hex/rgba literal, `THEME`/
`ResponsiveTheme` (`src/utils/constants.ts` — legacy back-compat shim only).

## 3. Typography

Single source of truth: `typography.variants` in `aurora-tokens.ts`. Font
family only — **never** `fontWeight`. React Native loads each weight as a
completely separate native font file (see `src/theme/fonts.ts`); a
`fontWeight` prop does not select a different file, so a "bold" `fontWeight`
on a light-weight family silently does nothing on native. Use `fontFamily`
from `FONT_FAMILY` (`src/theme/fonts.ts`) or a `typography.variants.*` entry,
which already bakes in the correct family.

| Variant | Family | Size / Line-height | Use |
|---|---|---|---|
| `pageTitle` | Manrope_700Bold | 28 / 36.4 | Screen title |
| `sectionTitle` | Manrope_600SemiBold | 18 / 25.2 | Section header |
| `cardHeadline` | Manrope_600SemiBold | 16 / 22.4 | Card title |
| `body` | Manrope_400Regular | 15 / 22.5 | Body text |
| `caption` | Manrope_500Medium | 12 / 16.8 | Captions, meta |
| `caption2` | Manrope_500Medium | 13 / 18.2 | Secondary meta (meal type/time labels) |
| `heroStat` | Manrope_800ExtraBold | 40 / 44 | Hero ring/tile numbers |

Onboarding's own scale (`fresh/tokens.ts` `type.*`) additionally defines
`hero` (Manrope_300Light 64, ls -1.5), `question` (Manrope_300Light 40/44,
ls -0.5), `sectionLabel` (Manrope_600SemiBold 11 uppercase ls 1.6), `value`
(Manrope_500Medium 17), `valueLg` (Manrope_600SemiBold 22). These remain
onboarding-specific (the large light-weight display sizes suit a single
full-screen question, not a dense list screen) but any main-app screen
building an onboarding-style hero moment should reuse them rather than
inventing new sizes.

**Rule: every numeric readout gets `fontVariant: ['tabular-nums']`** — scores,
timers, calorie counts, weights. Reference implementation:
`src/components/onboarding/WarningCard.tsx`.

## 4. Layout

8pt spacing grid (`spacing` in `aurora-tokens.ts`): `xxs 2, xs 4, sm 8, md 16,
lg 24, xl 32, xxl 48, xxxl 64`. No arbitrary pixel values in `padding`/
`margin`/`gap` — always a `spacing.*` token (optionally passed through the
`rp`/`rw`/`rh` responsive-scale wrappers in `src/utils/responsive.ts`).

Onboarding-specific layout constants (`fresh/tokens.ts`): `screenPad: 24,
qGap: 40, sectionGap: 36, rowH: 56`. These describe onboarding's specific
one-question-per-screen rhythm; general app screens use the 8pt grid above
directly.

## 5. Elevation & Depth

**Max one surface depth over the screen background. Never a card inside a
card, never stacked glass.** Depth comes from a `border.subtle` hairline and
a `surface[1]`/`surface[2]` fill step — never from a shadow.

- `surface[0]` (`#050505`) = screen background
- `surface[1]` (`#15161B`) = card / row fill — one flat step up
- `surface[2]` (`#232430`) = raised/pressed control only (never a stacked card)

**No drop shadows, anywhere.** No `shadowColor`, `shadowOpacity`,
`shadowRadius`, `elevation:`, or `boxShadow`. On a near-black background,
shadows are close to invisible anyway and the ones in the codebase today are
overwhelmingly light-theme shadow recipes (`rgba(0,0,0,0.1)`) that read as
dead weight, not depth. Use a hairline border instead.

**Sections are not cards.** In onboarding and anywhere adopting the
Editorial Dark section pattern: a section is a label + content + a 1px
`Rule` hairline — never a bordered/filled container. The one legitimate
exception is a **grouped list surface** (see Components §6, `SettingsSection`
pattern) — reserved for Profile/Settings-style row lists only.

## 6. Shapes

`borderRadius` (`aurora-tokens.ts`):

| Token | Value | Use |
|---|---|---|
| `xs` | 2 | Rare micro-radius |
| `sm` | 4 | Small controls |
| `md` | 8 | Steppers, small chips |
| `lg` | 12 | Chips, standard buttons |
| `xl` | 16 | **The CTA button radius** (documented exception — not the card radius) |
| `xxl` | 24 | Large surfaces |
| `card` | 20 | Grouped-list surface (`SettingsSection`) |
| `full` | 9999 | Pills, thumbs, circular icons |

Pick **one radius per component type** and use it everywhere that component
type appears — the audit that produced this file found the same semantic
button rendered with 7 different radii across the Diet area alone. Never a
raw numeric literal (`borderRadius: 999`, `borderRadius: 22`) — always a
token.

## 7. Components

### Button — the canonical CTA (source: `src/components/ui/aurora/GlassButton.tsx`)
```
minHeight: 56, borderRadius: 16 (borderRadius.xl)
background: FLAT fill per variant — never a gradient
  primary:   colors.primary.DEFAULT (#FF6B35)
  (secondary/success/warning/error: re-derive from `chart[]`, flat — see §2 gap)
label: Manrope_700Bold, 16px, color #050505 on the primary variant
disabled: background = border.subtle (hairline), label = colors.text.tertiary
press: opacity only (~0.85), 120ms — no scale, no gradient shimmer, no haptic
loading: replace label with a spinner, same geometry
```
Ghost/secondary-action buttons (e.g. "Back") have **no background, no
border** — just `colors.text.secondary` label text, opacity-only press.

### Card / grouped-list surface (source: `src/screens/main/profile/SettingsSection.tsx`)
```
backgroundColor: surface[1], borderRadius: borderRadius.card (20)
borderWidth: 1, borderColor: border.subtle, overflow: hidden
row: minHeight 64, paddingHorizontal spacing.md
divider: absolute, inset (not full-bleed), height 1, border.DEFAULT
iconSquircle: 32×32, borderRadius ~10, backgroundColor surface[2]
```
Use this ONLY for a genuine grouped list of rows (Settings, account
sections). A single free-floating content block should NOT be wrapped in
this — see the section pattern below instead.

### Section (source: `src/components/onboarding/fresh/` — `SectionLabel`, `RowGroup`, `Rule`, `CollapsibleSection`)
```
SectionLabel: Manrope_600SemiBold 11px uppercase, letter-spacing 1.6, ink3
RowGroup:     transparent background — label + content, no box
Rule:         height 1, backgroundColor border.subtle — the only separator
CollapsibleSection: collapses by animating measured HEIGHT (never opacity —
              an opacity-only collapse leaves an empty interactive box, a
              real bug this system fixed once already)
```

### OptionRow / Pill (source: `fresh/OptionRow.tsx`, `fresh/Pill.tsx`)
```
OptionRow: minHeight 56, transparent bg, 2px accent left-bar (always
           rendered, transparent when unselected so nothing shifts on
           toggle) + accent checkmark when selected
Pill:      radius full (9999), 1px hairline border, transparent bg;
           selected = accent border + accentDim (14%) fill + accent label
```

### Grouped multi-select (chip wall)
Never render 6+ ungrouped pills in one `flexWrap` grid. Group under a
`SectionLabel`, or progressively disclose via `CollapsibleSection` /
`ChipPicker`.

## 8. Do's and Don'ts

**Never:**
- `GlassCard` — banned in new code (the shared component itself is being
  reskinned to render flat; existing call sites are being migrated, not
  extended). Blur/frosted glass is retired.
- `flatColors` / `flatFontSize` as an import in new code — use the nested
  `colors`/`typography` exports directly.
- `fontWeight` — use `fontFamily` / `typography.variants`.
- `shadowColor`, `elevation:`, `shadowOpacity`, `shadowRadius`, `boxShadow` —
  use a `border.subtle` hairline instead.
- A hardcoded hex/rgba color literal — add a token if one is genuinely
  missing, never inline a new color.
- More than 2 accent colors visible on one screen at once.
- A gradient fill outside a genuine brand moment (the onboarding aurora
  background FX, `SkiaBloom`) — never as button/card/icon-tile filler.
- Nested cards / stacked glass — max 1 surface depth over the screen
  background.
- A touch target below 44×44 for any interactive element.

**Always:**
- One radius per component type, sourced from `borderRadius.*`.
- One spacing scale (8pt grid), sourced from `spacing.*`.
- `fontVariant: ['tabular-nums']` on every numeric readout.
- Press feedback: opacity-only for ghost/text actions, spring-scale 0.96 for
  primary CTAs is acceptable but opacity-only (matching onboarding) is
  preferred for new work — see Stage 1 of the rollout plan for the final
  call once verified live.

## 9. Verification

There is no automated design linter beyond this file yet — Stage 0 of the
rollout (`src/docs/VISUAL_DESIGN_OVERHAUL.md`) adds:
1. A jest ratchet test (`src/__tests__/design/tokenConformance.test.ts`)
   that fails if any directory's banned-pattern count increases versus a
   checked-in baseline, and is expected to strictly decrease over time.
2. ESLint rules flagging the same banned patterns (warn initially, promote
   to error per-directory as each area reaches zero).
3. A live Playwright `browser_evaluate` conformance script (walks the
   rendered DOM, flags off-token radius/fontSize/fontFamily/backgroundColor,
   any non-`none` `boxShadow`, and sub-44px touch targets) — the primary,
   objective way to verify a screen actually renders to this spec, since
   react-native-web's accessibility tree is too generic to inspect visually.
