# Diet UI Overhaul Design

**Date:** 2026-07-24

**Status:** Approved direction; awaiting written-spec review

**Reference assets:** `C:/Users/Harsh/Desktop/design/1.png` and `C:/Users/Harsh/Desktop/design/2.png`

## Objective

Replace the current long, visually inconsistent Diet page with a focused three-level experience:

1. A compact Diet dashboard matching the left panel of `1.png`.
2. A dedicated daily meal-plan view matching the right panel of `1.png`.
3. A full-screen meal-detail view matching `2.png`.

The overhaul must preserve existing nutrition calculations, food logging, scanning, offline database download, generated plans, meal completion, swapping, and deletion behavior. This is a presentation and information-architecture redesign, not a rewrite of nutrition business logic.

## Product Decisions

- The Diet tab opens the dashboard, not a combined dashboard/plan feed.
- The dashboard is optimized for answering: “How am I doing today?”
- The plan view is optimized for answering: “What should I eat and when?”
- The meal-detail view is optimized for answering: “What is in this meal, and how do I prepare or complete it?”
- Plan and detail views are full-screen drill-down surfaces. They provide explicit back navigation and do not expose the root bottom tab bar while open.
- Date arrows change the selected date without leaving the dashboard. Tapping the center date control or a day in the week strip opens that day’s plan.
- Android hardware back and modal dismissal return Detail → Plan → Dashboard in that order.
- The visual references define density, hierarchy, color usage, and component proportions. Small deviations are allowed only for accessibility, safe areas, dynamic content, or required existing functionality.

## Information Architecture

### Diet Dashboard

The dashboard contains, in order:

1. Safe-area-aware top row: menu affordance, “Diet” title, and streak indicator.
2. Date navigator: previous arrow, selected date pill, and next arrow.
3. Seven-day week strip with one selected day.
4. Compact calorie and macro summary card.
5. Six quick actions in a two-row, three-column grid.
6. Compact offline database banner when applicable.
7. Existing global bottom navigation.

The dashboard must fit the primary content above the fold on common 393 × 852 devices. It must not include meal timeline cards, logged-meal lists, suggestions, or a second large log-meal CTA.

### Today’s Plan

The plan view contains:

1. Safe-area header with back navigation, “Today’s Plan” or the selected date’s label, and a filter/settings affordance.
2. A chronological timeline with scheduled time, meal-type icon, connector rail, and one meal card per entry.
3. Meal cards with a real image when available, meal type, name, calories, color-coded macros, status badge, and chevron.
4. A full-width “Log a Meal / Food” primary action.
5. A compact daily-intake progress card.
6. Optional logged meals and suggestions below the core plan, using the same visual system and no duplicate section when the same meal is already represented.

The timeline sorts breakfast, lunch, snack, and dinner by schedule when schedule data exists, then falls back to the existing stable meal-type order.

### Meal Details

The detail view contains:

1. Safe-area header with back, centered “Meal Details”, and overflow menu.
2. A wide meal hero image with rounded corners and a deterministic gradient fallback.
3. Meal-type/status row, meal name, schedule metadata, and save/bookmark action.
4. Five-column nutrition strip: calories, protein, carbs, fat, and fiber.
5. Three metadata tiles: prep time, cook time, and difficulty.
6. Four accordion rows: Ingredients, Recipe, Instructions, and Nutrition Insights.
7. Sticky bottom actions: green “Mark as Completed” and secondary “Swap This Meal”.
8. The overflow menu retains Delete Meal with confirmation so existing functionality is not lost.

Ingredients open by default. Other accordion sections remain collapsed until selected.

## Component Boundaries

- `DietScreen` owns selected date, dashboard/plan visibility, modal orchestration, and existing data/action wiring.
- `DietScreenHeader` renders the compact dashboard header, date navigator, and week strip.
- `NutritionSummaryCard` renders the calorie arc, calorie labels, three primary macros, and edit-goal action.
- `DietQuickActions` renders the fixed two-by-three action grid.
- `MealPlanView` renders the dedicated plan screen’s header, timeline, CTA, and intake card.
- `MealPlanCard` is introduced as a focused, testable meal-row component if keeping it inside `MealPlanView` would make that file unwieldy.
- `MealSuggestions` adopts the plan visual language and remains below the core plan rather than on the dashboard.
- `MealDetailModal` keeps its public action contract but becomes an opaque, full-screen detail experience.
- `DatabaseDownloadBanner` gains a compact dashboard presentation while retaining all download states and actions.
- Shared nutrition display helpers may be extracted only where they remove duplicated formatting or status logic.

No unrelated navigation, store, API, or design-system refactor is included.

## Visual System

### Color

- App background: deep navy/black from the existing Aurora space palette.
- Elevated panels: opaque dark-blue surfaces with subtle borders; underlying content must never show through.
- Primary dashboard/plan action: orange-to-red emphasis consistent with the reference and current primary token.
- Completion action/status: green.
- Protein: blue; carbs: amber/yellow; fat: green; fiber: purple.
- Secondary text uses muted gray with sufficient contrast; no essential label relies on opacity alone.

### Typography

- Screen titles use a compact bold hierarchy rather than the current oversized “Nutrition Plan” heading.
- Meal names use two lines at most in cards and remain readable at accessibility font sizes.
- Numeric calorie values receive the strongest emphasis in summary areas.
- Labels, status chips, and metadata maintain consistent casing across screens.

### Spacing and Shape

- The layout follows an 8-point spacing rhythm with 4-point micro-spacing where necessary.
- Main horizontal gutters are 16 px at 393 px width and never below 12 px on supported small devices.
- Cards use 12–16 px corner radii; pills remain fully rounded.
- All interactive controls have at least a 44 × 44 logical-pixel hit area even when their visible icon is smaller.
- Horizontal scrolling is removed from the dashboard’s calendar and quick actions at supported widths.

### Images

- Meal images use existing real `imageUrl` values.
- Missing or failed images render a gradient fallback with meal initial and type icon.
- Images use `cover`, stable aspect ratios, rounded clipping, and accessibility descriptions.
- No fabricated remote URLs are introduced.

## State and Interaction Behavior

- Changing date updates all dashboard calculations and opens the matching plan only when the date pill/day is activated.
- Generate/refresh plan remains available through the plan/settings affordance and relevant empty state instead of occupying a large dashboard row.
- Quick actions retain Scan Food, Barcode, Scan Label, Log Meal, Log Water, and More/Recipes behavior.
- A quick action provides pressed feedback, haptics, an accessibility label, and a disabled state where applicable.
- Plan status is derived from existing progress data: completed, in progress, or upcoming.
- Tapping a meal card opens details for that exact meal.
- Completing a meal updates the status, consumed nutrition, and intake progress without inserting a duplicate log.
- Swapping uses the existing callback; if unavailable, the button is disabled or omitted without leaving an empty gap.
- Deleting is available from the detail overflow menu and requires confirmation.
- Logged meals and planned suggestions remain distinct; planned items do not contribute to consumed totals until logged.

## Loading, Empty, and Error States

- Dashboard nutrition loading uses a compact skeleton/spinner that preserves layout stability.
- Missing targets show a short profile-completion prompt without fabricated defaults.
- A day with no plan shows an illustration/icon, a concise explanation, and “Generate Plan”.
- Plan-generation failures show the existing error message and a retry action.
- Missing meal images fall back locally without showing broken-image chrome.
- Empty ingredients, recipe, instructions, or insights display concise section-specific messages.
- Offline download states remain: not downloaded, downloading, paused/cancelled, ready, and error/retry.
- Long meal names, zero targets, macro overflow, missing schedule, and incomplete metadata never break layout.

## Accessibility and Responsiveness

- Supported viewport width: 360–480 logical pixels, plus the existing centered web phone column.
- The UI respects top and bottom safe areas and avoids content beneath the global tab bar.
- No card, day chip, macro tile, status badge, or CTA clips horizontally at 360 px.
- Text can wrap without overlapping status badges or chevrons.
- Touch targets are at least 44 × 44.
- Buttons expose role, label, selected/disabled state, and progress semantics where appropriate.
- Status is communicated with text/icon as well as color.
- Reduced-motion/system settings are respected by avoiding motion-dependent meaning.

## Verification Strategy

Implementation follows test-first development for each changed behavior.

- Component tests cover date navigation, view transitions, touch-target sizes, status rendering, fallbacks, accordion behavior, completion, swap, and delete.
- Screen integration tests verify Dashboard → Plan → Detail → Plan → Dashboard navigation.
- Existing barcode and label-camera flow tests must remain passing.
- Existing nutrition-store and meal-log tests must remain passing.
- TypeScript and targeted ESLint checks must pass for touched files.
- Visual verification captures the dashboard, plan, and detail views at 393 × 852 and at 360 px width.
- Each visual capture is compared against the supplied references for hierarchy, spacing, clipping, and content density.

## Visual Acceptance Checklist

### Dashboard

1. The oversized “Nutrition Plan” heading is removed.
2. The header reads “Diet” and aligns vertically with menu and streak controls.
3. Safe-area top padding matches the reference density.
4. Previous and next date buttons are circular and visually balanced.
5. The selected-date pill is centered and does not overflow.
6. The date label uses the correct weekday, month, and day.
7. All seven weekdays fit without horizontal scrolling at 393 px.
8. Day numbers align consistently beneath weekday labels.
9. The selected day uses the orange circular treatment.
10. Unselected day indicators remain subtle and legible.
11. The calorie card begins directly below the week strip with a consistent gap.
12. The calorie card header shows “Calories” and “Edit Goal”.
13. The calorie arc is compact and not a full 220 px circle.
14. The remaining-calorie number is centered and prominent.
15. Consumed and target calories appear beneath the central value.
16. The orange consumption bar is visible beneath the arc.
17. Protein, carbs, and fat appear in one row.
18. Each macro has the correct semantic color and icon.
19. Macro current/target values align consistently.
20. Macro progress bars are visible and proportional.
21. Macro overflow is clearly communicated without breaking the card.
22. Quick actions use a fixed three-column grid.
23. The grid has exactly two rows for six actions.
24. Quick-action labels do not truncate at standard font scale.
25. Quick-action icons use consistent size and alignment.
26. All quick-action hit areas meet 44 px minimums.
27. The database banner is compact rather than a tall two-row card.
28. The database banner exposes download and dismiss actions.
29. Dashboard content does not duplicate the plan timeline.
30. Dashboard content does not duplicate the large log-meal CTA.
31. The global bottom tab bar remains fixed and unobscured.
32. The Diet tab uses the correct active color and indicator.

### Today’s Plan

33. The plan opens as a dedicated full-screen surface.
34. The plan header exposes an obvious back action.
35. The title matches the selected date context.
36. The filter/settings action has a 44 px hit area.
37. Timeline times align in a stable left column.
38. Timeline icons align with their corresponding meal cards.
39. Connector lines join timeline nodes without gaps or overshoot.
40. Meal cards use consistent height and corner radius.
41. Meal images use a stable square-ish thumbnail ratio.
42. Meal type is visibly secondary to meal name.
43. Meal names wrap to at most two lines.
44. Calories and macros remain visible without collision.
45. Protein, carbs, and fat use their semantic colors.
46. Completed, In Progress, and Upcoming badges are visually distinct.
47. Status is readable without relying on color alone.
48. Each card has a clear navigation chevron or equivalent affordance.
49. The log-meal CTA spans the available content width.
50. The intake card shows logged-meal count, percentage, progress, consumed calories, and remaining calories.
51. The plan screen does not expose duplicate logged entries.
52. Empty plan state includes a functional generation action.

### Meal Details

53. Meal Details is full-screen and opaque.
54. Header title is centered between back and overflow controls.
55. The hero image respects horizontal gutters and rounded corners.
56. Image fallback preserves the same dimensions as a real image.
57. Meal type and completion status share a balanced row.
58. Meal name is not obscured by save or status controls.
59. Schedule metadata remains legible at large font scale.
60. The five nutrition values fit at 360 px without clipping.
61. Nutrition colors match the dashboard and plan.
62. Prep time, cook time, and difficulty use equal-width tiles.
63. Accordion rows align icons, labels, summaries, and chevrons.
64. Ingredients are expanded by default.
65. Accordion expansion does not jump or overlay sticky actions.
66. Nutrition Insights can display its “New” badge without collision.
67. Mark as Completed is a full-width green primary action.
68. Swap This Meal is a full-width dark secondary action.
69. Delete Meal remains reachable from the overflow menu.
70. Bottom actions respect device safe-area insets.

### Cross-Cutting

71. No supported screen has horizontal clipping or unintended scrolling.
72. No underlying content shows through cards, sheets, or detail surfaces.
73. Loading, empty, error, and image-failure states preserve layout hierarchy.
74. All existing Diet actions remain reachable.
75. No nutrition values are fabricated when user targets are missing.
76. Existing user-owned uncommitted changes outside this UI scope remain untouched.

## Out of Scope

- Redesigning non-Diet tabs.
- Changing nutrition formulas, AI generation prompts, or worker APIs.
- Replacing the app-wide design-token system.
- Introducing a new navigation library.
- Adding fabricated meal imagery or new remote image providers.
- Refactoring unrelated dirty-worktree changes.
