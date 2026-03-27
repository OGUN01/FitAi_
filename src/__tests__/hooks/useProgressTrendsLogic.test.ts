const mockUseAuthStore = jest.fn();
const mockUseCalculatedMetrics = jest.fn();
const mockUseAnalyticsStore = jest.fn();
const mockLoadMetricsHistory = jest.fn();

jest.mock("../../stores/authStore", () => ({
  useAuthStore: (...args: unknown[]) => mockUseAuthStore(...args),
}));

jest.mock("../../hooks/useCalculatedMetrics", () => ({
  useCalculatedMetrics: (...args: unknown[]) => mockUseCalculatedMetrics(...args),
}));

jest.mock("../../stores/analyticsStore", () => ({
  useAnalyticsStore: (...args: unknown[]) => mockUseAnalyticsStore(...args),
}));

jest.mock("../../services/analyticsData", () => ({
  analyticsDataService: {
    loadMetricsHistory: (...args: unknown[]) => mockLoadMetricsHistory(...args),
  },
}));

jest.mock("../../utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
  },
}));

import { act, renderHook } from "@testing-library/react-native";

import { useProgressTrendsLogic } from "../../hooks/useProgressTrendsLogic";

const buildMetricsHistory = (days: number) =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date("2026-03-01T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + index);

    return {
      metricDate: date.toISOString(),
      weightKg: 70 + index,
      caloriesConsumed: 1800 + index,
      workoutsCompleted: 1,
      mealsLogged: 3,
      waterIntakeMl: 2000,
    };
  });

describe("useProgressTrendsLogic", () => {
  beforeEach(() => {
    const analyticsState = {
      dailyMetricsHistory: buildMetricsHistory(40),
      dailyMetricsHistoryPeriod: 365,
      setDailyMetricsHistory: jest.fn(),
    };

    mockUseAuthStore.mockReturnValue({
      user: { id: "user-1" },
    });
    mockUseCalculatedMetrics.mockReturnValue({
      metrics: null,
    });
    mockUseAnalyticsStore.mockImplementation(
      (selector?: (state: typeof analyticsState) => unknown) =>
        selector ? selector(analyticsState) : analyticsState,
    );
    mockLoadMetricsHistory.mockReset();
  });

  it("filters metrics and derived trends to the selected period", () => {
    const { result } = renderHook(() => useProgressTrendsLogic());

    expect(result.current.selectedPeriod).toBe("month");
    expect(result.current.metricsHistory).toHaveLength(30);
    expect(result.current.weightTrend?.data).toHaveLength(30);
    expect(result.current.workoutTrend.total).toBe(30);

    act(() => {
      result.current.handlePeriodChange("week");
    });

    expect(result.current.selectedPeriod).toBe("week");
    expect(result.current.metricsHistory).toHaveLength(7);
    expect(result.current.weightTrend?.data).toHaveLength(7);
    expect(result.current.workoutTrend.total).toBe(7);
  });
});
