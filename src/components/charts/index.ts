// Chart Components Barrel export
// This file exports all chart components for easy importing
//
// Note: AnimatedChart, ColorCodedZones, WeightProjectionChart also exist in
// ../ui/ and are barrel-exported from ../ui/index.ts. They are NOT re-exported
// here to avoid an ambiguous-duplicate export (TS2308) when ../components/index
// re-exports both `./ui` and `./charts` via `export *`. Import those from
// `components/ui` instead. MuscleBalanceRadar is imported directly from its
// file (no collision).

export { ProgressChart } from "./ProgressChart";
export { NutritionChart } from "./NutritionChart";
export { MuscleBalanceRadar, RADAR_AXES } from "./MuscleBalanceRadar";
