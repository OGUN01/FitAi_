import React from "react";
import { render, waitFor } from "@testing-library/react-native";

const mockGetWeightHistory = jest.fn();
const mockGetCalorieHistory = jest.fn();
const mockRefreshAnalytics = jest.fn();
const mockSetHistoryData = jest.fn();
const mockInitializeAnalytics = jest.fn();
const mockInitializeAchievements = jest.fn();

// Bespoke react-native mock for the node test env (the real RN pulls native
// TurboModules like DevMenu that don't exist outside a device). Include the
// RN APIs that transitively-imported components use (Easing, Animated,
// fontWeights) so they don't crash with "Cannot read properties of undefined".
jest.mock("react-native", () => {
  const React = require("react");
  const View = (props: any) => React.createElement("View", props, props.children);
  const Text = (props: any) =>
    React.createElement("Text", props, props.children);
  return {
    View,
    Text,
    TextInput: React.forwardRef((props: any, ref: any) =>
      React.createElement("TextInput", { ...props, ref }),
    ),
    FlatList: ({ data, renderItem, ...rest }: any) =>
      React.createElement(
        View,
        rest,
        (data || []).map((item: any, index: number) =>
          React.createElement(
            React.Fragment,
            { key: item.id || index },
            renderItem({ item, index }),
          ),
        ),
      ),
    ScrollView: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
    ActivityIndicator: (props: any) => React.createElement("ActivityIndicator", props),
    RefreshControl: () => null,
    Pressable: React.forwardRef((props: any, ref: any) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
    StyleSheet: {
      create: (s: any) => s,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Platform: { OS: "ios", select: (o: any) => o.ios ?? o.default },
    // Easing — used by Animated timing (transitive imports).
    Easing: {
      in: (e: any) => e,
      out: (e: any) => e,
      inOut: (e: any) => e,
      bezier: () => () => ({}),
      linear: () => ({}),
      ease: () => ({}),
    },
    // Animated — minimal stub so Animated.Value/timing don't crash.
    Animated: {
      Value: class {
        constructor(v: any) {
          (this as any)._value = v;
        }
      },
      timing: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
      spring: () => ({ start: (cb?: any) => cb && cb({ finished: true }) }),
      View,
      Text,
      ScrollView: ({ children, ...props }: any) =>
        React.createElement(View, props, children),
    },
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const animation = {
    delay: () => animation,
    duration: () => animation,
    springify: () => animation,
  };
  // Minimal Animated.View/Text/ScrollView that render children so components
  // using Reanimated's Animated.* mount under react-test-renderer.
  const AnimatedView = ({ children, ...props }: any) =>
    React.createElement("View", props, children);
  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      Text: ({ children, ...props }: any) =>
        React.createElement("Text", props, children),
      ScrollView: ({ children, ...props }: any) =>
        React.createElement("View", props, children),
      createAnimatedComponent: (Component: unknown) => Component,
    },
    createAnimatedComponent: (Component: unknown) => Component,
    FadeIn: animation,
    FadeInDown: animation,
    FadeInRight: animation,
    FadeInUp: animation,
    useSharedValue: (value: any) => ({ value }),
    useAnimatedStyle: (updater: any) => updater(),
    useAnimatedProps: (updater: any) => updater(),
    withSpring: (value: any) => value,
    withTiming: (value: any) => value,
    withDelay: (_delay: any, value: any) => value,
    withRepeat: (value: any) => value,
    withSequence: (...values: any[]) => values[values.length - 1],
    cancelAnimation: (value: any) => {
      value.value = 0;
    },
    runOnJS: (fn: any) => fn,
    Extrapolate: { CLAMP: "clamp" },
    Extrapolation: { CLAMP: "clamp" },
    // Easing — used by src/theme/animations.ts (Easing.in/out/inOut/bezier).
    Easing: {
      linear: () => ({}),
      ease: () => ({}),
      in: () => ({}),
      out: () => ({}),
      inOut: () => ({}),
      bezier: () => ({}),
      bounce: () => ({}),
      elastic: () => ({}),
    },
  };
});

jest.mock("../../components/ui/aurora/AuroraBackground", () => ({
  AuroraBackground: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      background: "#000",
      backgroundTertiary: "#252a3a",
      text: "#fff",
      textSecondary: "#ccc",
      primary: "#0af",
      error: "#f00",
      successAlt: "#0f0",
    },
    spacing: {
      xxs: 2,
      xs: 4,
      sm: 8,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
    },
    // Complete borderRadius (SegmentedControl + other UI reads .full / .xl etc.)
    borderRadius: {
      xs: 2,
      sm: 4,
      md: 8,
      lg: 16,
      xl: 16,
      xxl: 24,
      full: 9999,
    },
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24,
    },
  },
}));

jest.mock("../../utils/responsive", () => ({
  // Identity responsive helpers — return the raw value so tests can assert
  // on the numeric input without scaling.
  rh: (value: number) => value,
  rw: (value: number) => value,
  rp: (value: number) => value,
  rf: (value: number) => value,
  rbr: (value: number) => value,
}));

jest.mock("../../utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
  },
}));

jest.mock("../../services/analyticsData", () => ({
  analyticsDataService: {
    getWeightHistory: (...args: unknown[]) => mockGetWeightHistory(...args),
    getCalorieHistory: (...args: unknown[]) => mockGetCalorieHistory(...args),
  },
}));

jest.mock("../../stores/analyticsStore", () => ({
  useAnalyticsStore: () => ({
    initialize: mockInitializeAnalytics,
    refreshAnalytics: mockRefreshAnalytics,
    isInitialized: true,
    isLoading: false,
    selectedPeriod: "month",
    setPeriod: jest.fn(),
    weightHistory: [{ date: "2026-03-20", weight: 80 }],
    calorieHistory: [{ date: "2026-03-20", consumed: 2100, burned: 300 }],
    setHistoryData: mockSetHistoryData,
  }),
}));

jest.mock("../../stores/healthDataStore", () => ({
  useHealthDataStore: () => ({
    metrics: null,
  }),
}));

jest.mock("../../stores/fitnessStore", () => ({
  useFitnessStore: (selector?: (state: { completedSessions: any[] }) => unknown) =>
    selector ? selector({ completedSessions: [] }) : { completedSessions: [] },
}));

// AnalyticsScreen gates on `features.analytics && isPremium()` (Wave 7) — a
// non-premium mock shows the locked surface, not the analytics content, so the
// test would never find "Metric Summary". Mock as premium + initialized.
jest.mock("../../stores/subscriptionStore", () => ({
  useSubscriptionStore: (selector?: (state: any) => unknown) => {
    const state = {
      features: { analytics: true },
      isPremium: () => true,
      isInitialized: true,
      currentPlan: { tier: "pro" },
      subscriptionStatus: "active",
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../stores/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("../../stores/profileStore", () => {
  const state = {
    bodyAnalysis: null,
    personalInfo: null,
    workoutPreferences: null,
  };
  const fn = jest.fn(() => state);
  (fn as any).getState = jest.fn(() => state);
  return { useProfileStore: fn };
});

jest.mock("../../hooks/useCalculatedMetrics", () => ({
  useCalculatedMetrics: () => ({
    metrics: null,
  }),
}));

jest.mock("../../stores/achievementStore", () => ({
  useAchievementStore: (selector?: (state: any) => unknown) => {
    const state = {
      initialize: mockInitializeAchievements,
      isInitialized: true,
      currentStreak: 3,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../screens/main/analytics", () => ({
  AnalyticsHeader: () => {
    const React = require("react");
    return React.createElement("Text", null, "Analytics Header");
  },
  MetricSummaryGrid: () => {
    const React = require("react");
    return React.createElement("Text", null, "Metric Summary");
  },
  AchievementShowcase: () => {
    const React = require("react");
    return React.createElement("Text", null, "Achievement Showcase");
  },
  TrendCharts: () => {
    const React = require("react");
    return React.createElement("Text", null, "Trend Charts");
  },
}));

import AnalyticsScreen from "../../screens/main/AnalyticsScreen";

describe("AnalyticsScreen", () => {
  beforeEach(() => {
    mockGetWeightHistory.mockResolvedValue([{ date: "2026-03-21", weight: 79.8 }]);
    mockGetCalorieHistory.mockResolvedValue([
      { date: "2026-03-21", consumed: 2050, burned: 320 },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders cached analytics immediately while refreshing history in the background", async () => {
    const screen = render(<AnalyticsScreen />);

    // The screen briefly shows a loading state while the first history load
    // completes (isHistoryCurrent is false until loadedHistoryPeriodDays is
    // set), then renders the cached analytics content. The background refresh
    // (weight/calorie history fetch) fires regardless.
    await waitFor(() => {
      expect(screen.getByText("Metric Summary")).toBeTruthy();
    });

    expect(mockGetWeightHistory).toHaveBeenCalledWith("user-1", 30);
    expect(mockGetCalorieHistory).toHaveBeenCalledWith("user-1", 30);
    expect(mockSetHistoryData).toHaveBeenCalled();
  });
});
