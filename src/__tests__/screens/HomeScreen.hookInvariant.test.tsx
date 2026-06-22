/**
 * HomeScreen hook-invariant test (P0-4 regression guard).
 *
 * P0-4 root cause: `useAnimatedStyle` was called AFTER the early returns
 * (`if (showGuestSignUp)` / `if (isLoading)`). On the loading render the
 * early return skipped it (fewer hooks); on the loaded render it ran (more
 * hooks) -> React's hook-count invariant violated -> crash:
 *   "Rendered more hooks than during the previous render."
 *
 * This test proves the fix deterministically: it renders HomeScreen in the
 * loading state, then flips to the loaded state, and asserts the hook count
 * stays stable across the transition (no throw). This is the verification
 * that on-device logcat could not reliably provide (stale buffer + pm-clear
 * logout both produced false signals).
 */
import React from "react";
import { render } from "@testing-library/react-native";

// --- Override the global reanimated mock so useAnimatedStyle is a REAL hook ---
// The global jest.setup.js mock makes useAnimatedStyle a plain function
// `(updater) => updater()` — that is NOT a hook, so React's dispatcher never
// counts it, and the "rendered more hooks than previous render" invariant
// never trips. To make this test actually catch P0-4, useAnimatedStyle must
// register with React's hook dispatcher. We wrap it in useRef (a real hook),
// so a conditional call (hook after early return) violates the invariant.
jest.mock("react-native-reanimated", () => {
  const R = require("react");
  return {
    __esModule: true,
    default: {
      View: "AnimatedView",
      Text: "AnimatedText",
      ScrollView: "AnimatedScrollView",
      createAnimatedComponent: (C) => C,
    },
    createAnimatedComponent: (C) => C,
    useSharedValue: (v) => ({ value: v }),
    // KEY: a real hook so React counts it in the hook order.
    useAnimatedStyle: (updater) => {
      R.useRef(); // registers with React's dispatcher -> counts as a hook
      return updater();
    },
    useAnimatedProps: (updater) => updater(),
    withTiming: (v) => v,
    withSpring: (v) => v,
    withRepeat: (v) => v,
    withSequence: (...v) => v[v.length - 1],
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    interpolate: () => 0,
  };
});

// --- Mock the heavy logic hook so we control isLoading across renders ---
// mockIsLoading is read by the factory on each render; toggling it +
// rerendering flips HomeScreen between the skeleton early-return path and
// the main render path. This is exactly the transition that exposed P0-4.
// NOTE: jest.mock factories are hoisted above imports by babel-plugin-jest-
// hoist, so any variable they reference MUST be prefixed with `mock` (jest's
// rule) or the hoist plugin throws at compile time. Hence mockIsLoading.
let mockIsLoading = false;

jest.mock("@/hooks/useHomeLogic", () => ({
  useHomeLogic: () => ({
    isLoading: mockIsLoading,
    error: null,
    refreshing: false,
    showGuestSignUp: false,
    showWeightModal: false,
    setShowGuestSignUp: jest.fn(),
    setShowWeightModal: jest.fn(),
    fadeAnim: { value: 1 },
    userName: "Test",
    isGuestMode: false,
    realStreak: 0,
    healthMetrics: null,
    wearableConnected: false,
    realCaloriesBurned: 0,
    currentSteps: 0,
    currentStepsSource: "none",
    actualCaloriesGoal: 2000,
    // todaysWorkoutInfo must be an object — HomeScreen reads
    // todaysWorkoutInfo.workout?.duration (non-optional on the outer object).
    todaysWorkoutInfo: { workout: null },
    todaysData: null,
    caloriesConsumed: 0,
    workoutMinutes: 0,
    weekCalendarData: [{ hasWorkout: false }, { hasWorkout: false }],
    waterIntakeML: 0,
    waterGoal: 2500,
    // weightData + weekCalendarData are read non-optionally in the loaded
    // render (weightData.currentWeight, weekCalendarData.every). Give them
    // real object shapes so the loaded path renders without throwing — the
    // test is about hook ORDER, not data correctness.
    weightData: {
      currentWeight: 70,
      goalWeight: 70,
      startingWeight: 70,
      weightHistory: [],
    },
    calculatedMetrics: null,
    workoutPreferences: null,
    handleRefresh: jest.fn(),
    handleAddWater: jest.fn(),
    weightUnit: "kg",
    syncHealthData: jest.fn(),
    syncFromHealthConnect: jest.fn(),
  }),
}));

// --- Mock stores HomeScreen reads directly ---
jest.mock("@/stores/appStateStore", () => ({
  useAppStateStore: () => ({ setSelectedDay: jest.fn() }),
}));
jest.mock("@/stores/achievementStore", () => ({
  useAchievementStore: (selector) => selector({ achievements: [], userAchievements: {} }),
}));
jest.mock("@/utils/achievementViewModel", () => ({
  buildAchievementViewModels: () => [],
}));

// --- Mock the heavy children so the test isolates HomeScreen's hook contract ---
// Each renders a stable placeholder; we are NOT asserting child output, only
// that HomeScreen's own hook order is stable across the isLoading flip.
jest.mock("@/screens/main/home", () => {
  const R = require("react");
  const { View, Text } = require("react-native");
  const Stub = function (props) {
    return R.createElement(View, null, R.createElement(Text, null, props.name));
  };
  return {
    HomeHeader: () => R.createElement(Stub, { name: "HomeHeader" }),
    GuestPromptBanner: () => R.createElement(Stub, { name: "GuestPromptBanner" }),
    MotivationBanner: () => R.createElement(Stub, { name: "MotivationBanner" }),
    DailyProgressRings: () => R.createElement(Stub, { name: "DailyProgressRings" }),
    TodaysFocus: () => R.createElement(Stub, { name: "TodaysFocus" }),
    QuickActions: () => R.createElement(Stub, { name: "QuickActions" }),
    WeeklyMiniCalendar: () => R.createElement(Stub, { name: "WeeklyMiniCalendar" }),
    HealthIntelligenceHub: () => R.createElement(Stub, { name: "HealthIntelligenceHub" }),
    HydrationTracker: () => R.createElement(Stub, { name: "HydrationTracker" }),
    BodyProgressCard: () => R.createElement(Stub, { name: "BodyProgressCard" }),
    SyncStatusIndicator: () => R.createElement(Stub, { name: "SyncStatusIndicator" }),
    ErrorBanner: () => R.createElement(Stub, { name: "ErrorBanner" }),
    EmptyMealsMessage: () => R.createElement(Stub, { name: "EmptyMealsMessage" }),
    EmptyCalendarMessage: () => R.createElement(Stub, { name: "EmptyCalendarMessage" }),
    createQuickActions: () => [],
    AchievementShowcase: () => R.createElement(Stub, { name: "AchievementShowcase" }),
    HomeSkeleton: () => R.createElement(Stub, { name: "HomeSkeleton" }),
  };
});

// --- Mock the remaining direct imports ---
jest.mock("@/components/progress/WeightEntryModal", () => ({
  WeightEntryModal: () => null,
}));
jest.mock("@/screens/main/GuestSignUpScreen", () => ({
  GuestSignUpScreen: () => null,
}));
jest.mock("@/components/ui/aurora/AuroraBackground", () => {
  const R = require("react");
  return {
    AuroraBackground: (props) => R.createElement("View", null, props.children),
  };
});

import { HomeScreen } from "@/screens/main/HomeScreen";

describe("HomeScreen hook-order invariant (P0-4 regression)", () => {
  it("does not throw 'Rendered more hooks' when isLoading flips true -> false", () => {
    // Loading render: early return path (skeleton). If useAnimatedStyle sat
    // AFTER the early return, this render would skip it -> fewer hooks.
    mockIsLoading = true;
    const { rerender, getByText } = render(<HomeScreen />);
    expect(getByText("HomeSkeleton")).toBeTruthy();

    // Loaded render: main path. This calls useAnimatedStyle. If the hook ran
    // conditionally, React would throw here. No throw = hook order stable.
    expect(() => {
      mockIsLoading = false;
      rerender(<HomeScreen />);
    }).not.toThrow();
  });

  it("does not throw when isLoading flips false -> true (back to skeleton)", () => {
    mockIsLoading = false;
    const { rerender } = render(<HomeScreen />);
    expect(() => {
      mockIsLoading = true;
      rerender(<HomeScreen />);
    }).not.toThrow();
  });
});
