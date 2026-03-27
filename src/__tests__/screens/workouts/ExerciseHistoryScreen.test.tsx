import React from "react";
import { render, waitFor } from "@testing-library/react-native";

const mockGetHistory = jest.fn();
const mockGetPersonalRecords = jest.fn();

jest.mock("react-native", () => {
  const RealReact = require("react");
  return {
    View: ({ children, testID, style, ...props }: any) =>
      RealReact.createElement("View", { testID, style, ...props }, children),
    Text: ({ children, style, ...props }: any) =>
      RealReact.createElement("Text", { style, ...props }, children),
    FlatList: ({
      data,
      renderItem,
      testID,
      ListEmptyComponent,
      ...rest
    }: any) => {
      if (!data || data.length === 0) {
        const empty =
          typeof ListEmptyComponent === "function"
            ? RealReact.createElement(ListEmptyComponent)
            : ListEmptyComponent || null;
        return RealReact.createElement("View", { testID, ...rest }, empty);
      }
      return RealReact.createElement(
        "View",
        { testID, ...rest },
        data.map((item: any, index: number) =>
          RealReact.createElement(
            RealReact.Fragment,
            { key: item.sessionId || index },
            renderItem({ item, index }),
          ),
        ),
      );
    },
    ScrollView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    SafeAreaView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    ActivityIndicator: () => null,
    StyleSheet: {
      create: (s: any) => s,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Platform: { OS: "ios" },
  };
});

jest.mock("react-native-svg", () => {
  const RealReact = require("react");
  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      RealReact.createElement("Svg", props, children),
    Svg: ({ children, ...props }: any) =>
      RealReact.createElement("Svg", props, children),
    Rect: (props: any) => RealReact.createElement("Rect", props),
    Line: (props: any) => RealReact.createElement("Line", props),
    Polyline: (props: any) => RealReact.createElement("Polyline", props),
    Text: (props: any) => RealReact.createElement("SvgText", props),
    Circle: (props: any) => RealReact.createElement("Circle", props),
  };
});

jest.mock("../../../services/exerciseHistoryService", () => ({
  exerciseHistoryService: {
    getHistory: (...args: any[]) => mockGetHistory(...args),
    getPersonalRecords: (...args: any[]) => mockGetPersonalRecords(...args),
  },
}));

jest.mock("../../../services/authUtils", () => ({
  getCurrentUserId: jest.fn(() => "test-user"),
}));

import ExerciseHistoryScreen from "../../../screens/workouts/ExerciseHistoryScreen";

const mockRoute = {
  params: {
    exerciseId: "bench_press",
    exerciseName: "Bench Press",
  },
};

describe("ExerciseHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPersonalRecords.mockResolvedValue([]);
  });

  it("renders empty state when no history", async () => {
    mockGetHistory.mockResolvedValue([]);

    const { getByText } = render(
      <ExerciseHistoryScreen route={mockRoute as any} />,
    );

    await waitFor(() => {
      expect(
        getByText("No history yet — complete your first workout!"),
      ).toBeTruthy();
    });
  });

  it("renders session list when history available", async () => {
    mockGetHistory.mockResolvedValue([
      {
        sessionId: "s1",
        completedAt: "2026-03-20T10:00:00.000Z",
        sets: [
          { setNumber: 1, weightKg: 60, reps: 10, setType: "normal" },
          { setNumber: 2, weightKg: 60, reps: 8, setType: "normal" },
        ],
        estimated1RM: 80,
      },
      {
        sessionId: "s2",
        completedAt: "2026-03-18T10:00:00.000Z",
        sets: [{ setNumber: 1, weightKg: 55, reps: 10, setType: "normal" }],
        estimated1RM: 73,
      },
    ]);

    const { getByText } = render(
      <ExerciseHistoryScreen route={mockRoute as any} />,
    );

    await waitFor(() => {
      expect(getByText(/60kg/)).toBeTruthy();
    });
  });

  it("shows exercise name in header", async () => {
    mockGetHistory.mockResolvedValue([]);

    const { getByText } = render(
      <ExerciseHistoryScreen route={mockRoute as any} />,
    );

    await waitFor(() => {
      expect(getByText("Bench Press")).toBeTruthy();
    });
  });
});
