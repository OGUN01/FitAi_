import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

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

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/ui/aurora/GlassCard", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("@/utils/haptics", () => ({
  haptics: {
    trigger: jest.fn(),
  },
}));

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => value,
  rh: (value: number) => value,
  rp: (value: number) => value,
  rbr: (value: number) => value,
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
    colors: {
      text: "#111",
      textSecondary: "#666",
      primary: "#0af",
      success: "#0a0",
      warning: "#fa0",
      errorLight: "#f55",
      amber: "#fb0",
      teal: "#0aa",
      white: "#fff",
      background: "#000",
      glassSurface: "#222",
    },
    borderRadius: { full: 999 },
  },
}));

import { TodaysMealsSection } from "@/components/diet/TodaysMealsSection";

describe("TodaysMealsSection", () => {
  it("stops propagation when the meal action button is pressed", () => {
    const meal = {
      id: "meal-1",
      name: "Chicken Bowl",
      type: "lunch",
      calories: 520,
      protein: 35,
      carbs: 48,
      fat: 18,
      progress: 0,
      isCompleted: false,
    } as const;

    const onMealPress = jest.fn();
    const onStartMeal = jest.fn();
    const event = { stopPropagation: jest.fn() };

    const screen = render(
      <TodaysMealsSection
        meals={[meal]}
        onMealPress={onMealPress}
        onStartMeal={onStartMeal}
      />,
    );

    fireEvent.press(screen.getByLabelText("Start meal Chicken Bowl"), event);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onStartMeal).toHaveBeenCalledWith(meal);
  });
});
