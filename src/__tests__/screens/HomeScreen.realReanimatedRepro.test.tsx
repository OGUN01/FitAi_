/**
 * Reproduction test for the on-device HomeScreen "Rendered more hooks" crash.
 *
 * WHY THIS EXISTS:
 * The committed P0-4 regression guard (HomeScreen.hookInvariant.test.tsx)
 * MOCKS useHomeLogic entirely and overrides useAnimatedStyle as a real hook.
 * On-device (real emulator, authenticated testuser), HomeScreen STILL crashes
 * with "Rendered more hooks than during the previous render" on the
 * isLoading true→false transition — see logcat evidence in
 * src/docs/E2E-VERIFICATION-PLAN.md. The committed test cannot see this
 * because it never exercises the real useHomeLogic + real reanimated hooks.
 *
 * This test mocks reanimated's useAnimatedStyle + useAnimatedProps as REAL
 * hooks (so hook-count changes are detectable) and renders the REAL HomeScreen
 * with REAL useHomeLogic against mocked stores seeded to the failing state
 * (authenticated user, hasProfile=true, onboarding_data=null). It then forces
 * the isLoading true→false transition (the exact on-device trigger) and
 * asserts no "Rendered more hooks" throw.
 *
 * If this test FAILS (throws the hook invariant), it reproduces the on-device
 * crash deterministically in Node and we can bisect. If it PASSES, the crash
 * is specific to real-Reanimated's hook count and needs a device-only fix.
 */
import React from "react";
import { render, act } from "@testing-library/react-native";

// --- Real-hook reanimated mock (counts as hooks so React detects mismatch) ---
// NOTE: jest.mock factories are hoisted above imports and cannot reference
// out-of-scope vars. `require` is on the allowed list, so we require React
// inside the factory to get a real useRef (a real hook) — this makes a
// conditional reanimated hook call violate React's hook-count invariant,
// exactly as on-device React sees it.
jest.mock("react-native-reanimated", () => {
  const ReactRef = require("react");
  return {
    __esModule: true,
    default: {
      View: "AnimatedView",
      Text: "AnimatedText",
      ScrollView: "AnimatedScrollView",
      createAnimatedComponent: (C: any) => C,
    },
    createAnimatedComponent: (C: any) => C,
    useSharedValue: (v: any) => ({ value: v }),
    // REAL hooks — useRef registers with React's dispatcher, so a conditional
    // call violates the hook-count invariant (what on-device React sees).
    useAnimatedStyle: (updater: any) => {
      ReactRef.useRef();
      return updater();
    },
    useAnimatedProps: (updater: any) => {
      ReactRef.useRef();
      return updater();
    },
    useDerivedValue: (updater: any) => {
      ReactRef.useRef();
      return { value: updater() };
    },
  withTiming: (v: any) => v,
  withSpring: (v: any) => v,
  withRepeat: (v: any) => v,
  withSequence: (...v: any[]) => v[v.length - 1],
  withDelay: (_delay: any, v: any) => v,
  withDecay: (v: any) => v,
  cancelAnimation: () => {},
  runOnJS: (fn: any) => fn,
  interpolate: () => 0,
  Easing: new Proxy(
    { ease: (t: any) => t },
    {
      get: (target: any, prop: string) =>
        prop in target
          ? target[prop]
          : typeof prop === "string"
            ? (..._args: any[]) => (t: any) => t
            : undefined,
    },
  ),
  };
});

// --- Mock useAuth: authenticated, non-guest (the on-device failing state) ---
let mockAuthState = { user: { id: "test-user-id", email: "testuser@fitai.dev" }, isGuestMode: false, isAuthenticated: true };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

// --- Mock stores with the failing-state shape ---
const mockFitnessState: any = {
  loadData: jest.fn().mockResolvedValue(undefined),
  weeklyWorkoutPlan: null,
  completedSessions: [],
  workoutProgress: {},
  checkAndResetProgressIfNewDay: jest.fn(),
};
const mockNutritionState: any = {
  loadData: jest.fn().mockResolvedValue(undefined),
  weeklyMealPlan: null,
  mealProgress: {},
  dailyMeals: [],
  getTodaysConsumedNutrition: () => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }),
};
const mockAchievementState: any = {
  currentStreak: 0,
  initialize: jest.fn().mockResolvedValue(undefined),
  isInitialized: true,
  reconcileWithCurrentData: jest.fn(),
  achievements: [],
  userAchievements: {},
};
const mockHealthState: any = {
  metrics: null,
  isHealthKitAuthorized: false,
  isHealthConnectAuthorized: false,
  initializeHealthKit: jest.fn(),
  syncHealthData: jest.fn().mockResolvedValue(undefined),
  initializeHealthConnect: jest.fn(),
  syncFromHealthConnect: jest.fn().mockResolvedValue(undefined),
  loadHealthMetricsHistory: jest.fn().mockResolvedValue(undefined),
  settings: { healthKitEnabled: false, healthConnectEnabled: false },
};
const mockAnalyticsState: any = {
  isInitialized: true,
  initialize: jest.fn().mockResolvedValue(undefined),
  refreshAnalytics: jest.fn().mockResolvedValue(undefined),
  setHistoryData: jest.fn(),
  calorieHistory: [],
  weightHistory: [],
};
const mockHydrationState: any = {
  waterIntakeML: 0,
  dailyGoalML: 2500,
  addWater: jest.fn(),
  checkAndResetIfNewDay: jest.fn(),
  syncWithSupabase: jest.fn().mockResolvedValue(undefined),
};
const mockProfileState: any = {
  bodyAnalysis: null, // hasProfile=true but bodyAnalysis null → matches on-device
  personalInfo: null,
  workoutPreferences: null,
  dietPreferences: null,
};
const mockOfflineState: any = {
  isOnline: true,
  syncInProgress: false,
  queueLength: 0,
  lastSyncAttempt: null,
  lastSyncResult: null,
  autoSyncEnabled: false,
  initialize: jest.fn(),
  syncNow: jest.fn(),
  clearOfflineData: jest.fn(),
  setAutoSync: jest.fn(),
  updateSyncStatus: jest.fn(),
};

// Hoistable store-builder. `function` declarations are hoisted (unlike const
// arrows), so this is safe to call from jest.mock factories that babel hoists
// above the const initializers. The `mock`-prefixed state consts are accessed
// lazily (inside the returned fn), so they're initialized by call time.
function mockMakeStore(stateFn: () => any) {
  return Object.assign(
    jest.fn((sel?: (s: any) => any) => {
      const state = stateFn();
      return sel ? sel(state) : state;
    }),
    {
      getState: () => stateFn(),
      setState: jest.fn(),
    },
  );
}

jest.mock("@/stores", () => ({
  useFitnessStore: mockMakeStore(() => mockFitnessState),
  useNutritionStore: mockMakeStore(() => mockNutritionState),
  useAchievementStore: mockMakeStore(() => mockAchievementState),
  useHealthDataStore: mockMakeStore(() => mockHealthState),
  useAnalyticsStore: mockMakeStore(() => mockAnalyticsState),
  useHydrationStore: mockMakeStore(() => mockHydrationState),
}));

jest.mock("@/stores/profileStore", () => ({
  useProfileStore: mockMakeStore(() => mockProfileState),
}));

jest.mock("@/stores/appStateStore", () => ({
  useAppStateStore: mockMakeStore(() => ({ setSelectedDay: jest.fn() })),
}));

jest.mock("@/stores/offlineStore", () => ({
  useOfflineStore: mockMakeStore(() => mockOfflineState),
}));

// useDashboardIntegration → minimal (avoid heavy integration.ts)
jest.mock("@/utils/integration", () => ({
  useDashboardIntegration: () => ({ profile: null }),
  useOffline: () => ({
    isOnline: true,
    syncInProgress: false,
    queueLength: 0,
    lastSyncAttempt: null,
    lastSyncResult: null,
    autoSyncEnabled: false,
    syncNow: jest.fn(),
    clearOfflineData: jest.fn(),
    setAutoSync: jest.fn(),
    isDataStale: () => false,
    optimisticUpdate: jest.fn(),
    optimisticCreate: jest.fn(),
    optimisticDelete: jest.fn(),
  }),
}));

// Toggleable calculated metrics: start null (goals=0 → hasNoGoals=true, the
// empty-state early-return path in DailyProgressRings), then flip to non-zero
// goals so hasNoGoals flips false → Ring children mount with useAnimatedProps.
// This mirrors the on-device async-load transition (calculatedMetrics load
// after initial render) that precedes the "Rendered more hooks" crash.
let mockCalculatedMetrics: any = { metrics: null, dailyCalories: null };
jest.mock("@/hooks/useCalculatedMetrics", () => ({
  useCalculatedMetrics: () => mockCalculatedMetrics,
}));

// Mock the supabase client so no real network/GoTrue calls happen in Node.
jest.mock("@/services/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: jest.fn(() => ({ data: [], error: null, single: jest.fn(() => ({ data: null, error: null })) })) })),
      insert: jest.fn(() => ({ select: jest.fn(() => ({ data: [], error: null })) })),
      update: jest.fn(() => ({ eq: jest.fn(() => ({ data: [], error: null })) })),
      delete: jest.fn(() => ({ eq: jest.fn(() => ({ data: [], error: null })) })),
      upsert: jest.fn(() => ({ data: [], error: null })),
    })),
    channel: jest.fn(() => ({ on: jest.fn(() => ({ subscribe: jest.fn() })) })),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/utils/achievementViewModel", () => ({
  buildAchievementViewModels: () => [],
}));

import { HomeScreen } from "@/screens/main/HomeScreen";

describe("HomeScreen real-reanimated hook invariant (on-device repro)", () => {
  it("does not throw 'Rendered more hooks' when DailyProgressRings flips empty→populated", async () => {
    // Capture any render error explicitly so we distinguish the hook
    // invariant throw from unrelated async (supabase) rejections.
    let renderError: unknown = null;
    const onError = (e: unknown) => { renderError = e; };

    // First render: isLoading=true → skeleton path. Goals are unset
    // (mockCalculatedMetrics.metrics=null → actualCaloriesGoal=0 →
    // DailyProgressRings hasNoGoals=true → empty-state early return).
    let utils: ReturnType<typeof render>;
    try {
      utils = render(<HomeScreen />);
    } catch (e) { onError(e); }

    // Flush async store loads (loadData resolves → setIsLoading(false)).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Now flip goals to non-zero (the on-device async-load completion that
    // sets actualCaloriesGoal>0). This makes DailyProgressRings
    // hasNoGoals flip false → it renders Ring children that call
    // useSharedValue + useAnimatedProps (hooks the empty path didn't).
    mockCalculatedMetrics = {
      metrics: { dailyCalories: 2200, calculatedTDEE: 2200 },
      dailyCalories: 2200,
    };

    // Force a re-render to exercise the populated-rings path.
    try {
      await act(async () => {
        utils!.rerender(<HomeScreen />);
        await new Promise((r) => setTimeout(r, 50));
      });
    } catch (e) { onError(e); }

    // If the hook invariant was violated, renderError holds it.
    const errMsg = renderError instanceof Error ? renderError.message : String(renderError);
    // Unwrap AggregateError (React 18 bundles concurrent render errors).
    const agg = renderError as any;
    const inner = agg?.errors ? agg.errors.map((e: any) => e?.message ?? String(e)) : [errMsg];
    // eslint-disable-next-line no-console
    console.log("[REPRO] renderError messages:", JSON.stringify(inner));
    expect(renderError).toBeNull();

    // If we reached here without throwing, the hook count was stable.
    // (The on-device crash throws "Rendered more hooks than during the
    // previous render" — if reproducible, this test throws at rerender.)
    expect(true).toBe(true);
  }, 15000);
});
