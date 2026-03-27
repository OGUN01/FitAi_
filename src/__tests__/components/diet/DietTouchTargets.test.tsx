import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components/ui/aurora/GlassCard", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("@/components/ui/aurora/AuroraSpinner", () => ({
  AuroraSpinner: () => null,
}));

jest.mock("@/utils/haptics", () => ({
  haptics: {
    trigger: jest.fn(),
  },
}));

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => Math.round(value * 0.75),
  rh: (value: number) => Math.round(value * 0.75),
  rp: (value: number) => value,
  rs: (value: number) => value,
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
    colors: {
      text: "#111",
      textSecondary: "#666",
      textMuted: "#777",
      white: "#fff",
      primary: "#0af",
      primaryLight: "#4bf",
      backgroundSecondary: "#222",
      glassSurface: "#333",
      warning: "#fa0",
      info: "#09f",
      success: "#0a0",
      successLight: "#4c4",
      teal: "#0aa",
    },
    borderRadius: { full: 999, lg: 16 },
    fontSize: { xs: 11, md: 14, xxl: 28 },
  },
}));

import { DietHeader } from "@/components/diet/DietHeader";
import { DietScreenHeader } from "@/components/diet/DietScreenHeader";
import { WeeklyNutritionChart } from "@/components/diet/WeeklyNutritionChart";

describe("diet touch targets", () => {
  it("keeps the diet header settings action at 44x44", () => {
    const screen = render(
      <DietHeader
        caloriesRemaining={800}
        caloriesGoal={2000}
        onSettingsPress={jest.fn()}
      />,
    );

    const button = screen.getByLabelText("Open nutrition settings");

    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      width: 44,
      height: 44,
    });
  });

  it("keeps the diet screen header controls at safe tap sizes", () => {
    const screen = render(
      <DietScreenHeader
        isGeneratingPlan={false}
        hasPlan={false}
        onGenerateWeeklyPlan={jest.fn()}
        handleSearchFood={jest.fn()}
        selectedDate={new Date("2026-03-23T00:00:00.000Z")}
        onPrevDay={jest.fn()}
        onNextDay={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(screen.getByLabelText("Previous day").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(screen.getByLabelText("Next day").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(screen.getByLabelText("Log Meal").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(screen.getByLabelText("Generate weekly plan").props.style),
    ).toMatchObject({ minHeight: 44 });
  });

  it("keeps the weekly nutrition details action at a 44pt minimum", () => {
    const screen = render(
      <WeeklyNutritionChart
        weeklyData={[
          { day: "monday", shortDay: "Mon", protein: 100, carbs: 150, fat: 60 },
        ]}
        proteinTarget={120}
        carbsTarget={180}
        fatTarget={70}
        onPress={jest.fn()}
      />,
    );

    const button = screen.getByLabelText("See nutrition trend details");

    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      minHeight: 44,
    });
  });
});
