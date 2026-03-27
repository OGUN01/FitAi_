import React from "react";
import { render } from "@testing-library/react-native";

let mockCompletedSessions: any[] = [];

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
  };
});

jest.mock("../../stores/fitnessStore", () => ({
  useFitnessStore: (selector?: (state: { completedSessions: any[] }) => unknown) => {
    const state = { completedSessions: mockCompletedSessions };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../components/ui/aurora/GlassCard", () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../components/ui/aurora/AnimatedPressable", () => {
  const React = require("react");

  return {
    AnimatedPressable: ({ children, ...props }: any) =>
      React.createElement("Pressable", props, children),
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");

  return {
    Ionicons: ({ name }: { name: string }) =>
      React.createElement("Text", null, `icon:${name}`),
  };
});

jest.mock("../../utils/weekUtils", () => ({
  ...jest.requireActual("../../utils/weekUtils"),
  getCurrentWeekStart: () => "2026-03-23",
}));

jest.mock("../../utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => value,
  rh: (value: number) => value,
  rp: (value: number) => value,
  rbr: (value: number) => value,
}));

import { WeeklyPlanOverview } from "../../screens/main/fitness/WeeklyPlanOverview";

const plan = {
  planTitle: "Test Plan",
  weekNumber: 13,
  workouts: [
    {
      id: "workout-monday",
      title: "Monday Strength",
      dayOfWeek: "monday",
      duration: 45,
      estimatedCalories: 250,
      exercises: [],
    },
  ],
  restDays: [],
};

describe("Fitness WeeklyPlanOverview", () => {
  beforeEach(() => {
    mockCompletedSessions = [];
  });

  it("does not mark a day completed when only stale workoutProgress from a prior week exists", () => {
    mockCompletedSessions = [
      {
        sessionId: "session-last-week",
        type: "planned",
        workoutId: "workout-monday",
        plannedDayKey: "monday",
        planSlotKey: "monday:0",
        workoutSnapshot: {
          title: "Monday Strength",
          category: "strength",
          duration: 45,
          exercises: [],
        },
        caloriesBurned: 175,
        durationMinutes: 45,
        completedAt: "2026-03-16T09:54:42.821Z",
        weekStart: "2026-03-16",
      },
    ];

    const screen = render(
      <WeeklyPlanOverview
        plan={plan as any}
        workoutProgress={{
          "workout-monday": {
            workoutId: "workout-monday",
            progress: 100,
            completedAt: "2026-03-16T09:54:42.821Z",
          },
        }}
        selectedDay="monday"
        onDayPress={jest.fn()}
        onViewFullPlan={jest.fn()}
      />,
    );

    expect(screen.queryByText("icon:checkmark")).toBeNull();
    expect(screen.getByText("0/1")).toBeTruthy();
  });

  it("marks a day completed when the completed session belongs to the current week", () => {
    mockCompletedSessions = [
      {
        sessionId: "session-this-week",
        type: "planned",
        workoutId: "workout-monday",
        plannedDayKey: "monday",
        planSlotKey: "monday:0",
        workoutSnapshot: {
          title: "Monday Strength",
          category: "strength",
          duration: 45,
          exercises: [],
        },
        caloriesBurned: 175,
        durationMinutes: 45,
        completedAt: "2026-03-23T09:54:42.821Z",
        weekStart: "2026-03-23",
      },
    ];

    const screen = render(
      <WeeklyPlanOverview
        plan={plan as any}
        workoutProgress={{
          "workout-monday": {
            workoutId: "workout-monday",
            progress: 100,
            completedAt: "2026-03-23T09:54:42.821Z",
          },
        }}
        selectedDay="monday"
        onDayPress={jest.fn()}
        onViewFullPlan={jest.fn()}
      />,
    );

    expect(screen.getByText("icon:checkmark")).toBeTruthy();
    expect(screen.getByText("1/1")).toBeTruthy();
  });
});
