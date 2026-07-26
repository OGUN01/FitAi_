# Health Connect Disclosure Android Surface Design

## Problem and root cause

On Android, the Health Connect disclosure appears over the Connect Wearables screen, but text from the underlying Compatible Devices and How It Works cards remains sharply visible through the dialog. `HealthConnectDisclosureModal` renders a transparent native modal with a `BlurView` backdrop and a `GlassCard`. Android intentionally replaces the card blur with `GlassView`'s translucent fallback, and Expo Blur defaults to no native Android blur unless its experimental method is enabled. The resulting dialog surface has insufficient opacity; this is a compositing defect, not duplicate content rendering.

## Approved design

Apply an opaque `colors.backgroundSecondary` background directly to the disclosure's existing `GlassCard` through a local style in `src/components/health/HealthConnectDisclosureModal.tsx`.

This preserves the current modal structure, card radius, shadow, padding, animation, scroll area, buttons, haptics, and permission flow. It also makes foreground contrast deterministic on Android without depending on experimental blur support. The change remains local so ordinary glass cards elsewhere retain their current appearance.

## Scope and non-goals

In scope:

- Add one local dialog-surface style and pass it to the disclosure `GlassCard`.
- Add focused regression coverage for the opaque surface contract and existing dismissal/acknowledgement actions.
- Verify the modal on an Android-sized viewport, including increased font scaling.

Out of scope:

- Changing `GlassView`, `GlassCard`, theme token defaults, or other dialogs.
- Enabling Expo's experimental Android blur implementation.
- Rewriting the disclosure with the shared modal primitive.
- Changing disclosure copy, Health Connect permissions, acknowledgement persistence, or navigation behavior.

## Accessibility and layout behavior

The existing internal `ScrollView` remains the only scrolling region, so long disclosure content continues to fit smaller screens and larger text settings. The title, body, and action layout remain unchanged. The opaque dark surface improves text contrast and prevents background content from competing visually with the disclosure. Back-button handling, outside-tap dismissal, and both action targets retain their existing behavior.

## Regression test plan

Add a focused component test under `src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx` that:

- Renders the visible disclosure in an Android test environment.
- Verifies the dialog card receives the opaque `colors.backgroundSecondary` surface style.
- Verifies "Not now" calls `onDismiss`.
- Verifies "Acknowledge & continue" calls `onAcknowledge`.

The style assertion protects the specific regression; callback assertions ensure the visual change does not interrupt the permission flow.

## Verification plan

1. Run the focused component test.
2. Run TypeScript validation for the affected source and test code, or the repository-wide typecheck if that is the available command.
3. Review the diff to confirm only the approved modal surface and focused test were changed.
4. On Android at approximately 393 x 852 logical pixels, open Connect Wearables and trigger the first-time disclosure. Confirm no underlying text is legible through the dialog, all modal copy is readable, the content scrolls, and both actions remain visible and operable.
5. Repeat the visual check with increased system font size to confirm the scroll area prevents clipping or inaccessible content.
