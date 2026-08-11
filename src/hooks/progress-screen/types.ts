// Only WeeklyDataPoint remains live: it's consumed by data.ts, which in turn
// is used by useHomeLogic.ts (Home screen). The rest of this directory's
// former state/computed/actions split (ProgressScreenState, ComputedData,
// ProgressScreenActions, etc.) was dead — the Progress screen actually uses
// the separate, self-contained ../useProgressScreen.ts — and was removed
// along with state.ts, computed.ts, and actions.ts.
export interface WeeklyDataPoint {
  day: string;
  workouts: number;
  meals: number;
  calories: number;
  duration: number;
}
