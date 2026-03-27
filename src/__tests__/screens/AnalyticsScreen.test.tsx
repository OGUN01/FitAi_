import React from "react";
import { render, waitFor } from "@testing-library/react-native";

const mockGetWeightHistory = jest.fn();
const mockGetCalorieHistory = jest.fn();
const mockRefreshAnalytics = jest.fn();
const mockSetHistoryData = jest.fn();
const mockInitializeAnalytics = jest.fn();
const mockInitializeAchievements = jest.fn();

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style ?? {},
  },
  RefreshControl: "RefreshControl",
  Platform: {
    OS: "ios",
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    View: "View",
    ScrollView: "ScrollView",
  },
  FadeIn: {
    duration: () => undefined,
  },
}));

jest.mock("../../components/ui/aurora/AuroraBackground", () => ({
  AuroraBackground: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      background: "#000",
      text: "#fff",
      textSecondary: "#ccc",
      primary: "#0af",
      error: "#f00",
      successAlt: "#0f0",
    },
    spacing: {
      md: 16,
      lg: 20,
      xxl: 32,
    },
    borderRadius: {
      lg: 16,
    },
    fontSize: {
      sm: 12,
    },
  },
}));

jest.mock("../../utils/responsive", () => ({
  rh: (value: number) => value,
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

jest.mock("../../stores/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("../../stores/profileStore", () => ({
  useProfileStore: () => ({
    bodyAnalysis: null,
    personalInfo: null,
    workoutPreferences: null,
  }),
}));

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

    expect(screen.queryByText("Loading analytics...")).toBeNull();
    expect(screen.getByText("Metric Summary")).toBeTruthy();

    await waitFor(() => {
      expect(mockGetWeightHistory).toHaveBeenCalledWith("user-1", 30);
      expect(mockGetCalorieHistory).toHaveBeenCalledWith("user-1", 30);
      expect(mockSetHistoryData).toHaveBeenCalled();
    });
  });
});
