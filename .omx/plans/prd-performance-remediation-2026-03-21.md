# PRD: Performance Remediation 2026-03-21

## Problem

Users perceive the app as slow, especially when opening screens after tapping. The likely causes are eager imports, heavy mount-time work, and screen-specific side effects.

## Goal

Reduce interaction latency for primary app navigation and first-open flows without changing user-visible behavior or data semantics.

## Non-Goals

- Re-architecting the entire app
- Adding new dependencies
- Changing product flows or visual design

## User Stories

### US-001 Faster primary tab switching
As a user, I want taps on the main tabs to open quickly so the app feels responsive.

Acceptance criteria:
- Main tab open work avoids unnecessary eager computation or mounting.
- Existing tab behavior is preserved.

### US-002 Faster first-open heavy flows
As a user, I want the first time I open a heavy screen or modal to feel quicker so the app feels polished.

Acceptance criteria:
- Heavy mount-time work is deferred, gated, or memoized where safe.
- Data correctness and existing flows remain intact.

### US-003 Safe performance remediation
As a maintainer, I need verification that performance-focused changes did not break core behavior.

Acceptance criteria:
- Affected behavior has regression protection where missing.
- Typecheck and targeted tests pass.
- Final review includes residual risk notes.
