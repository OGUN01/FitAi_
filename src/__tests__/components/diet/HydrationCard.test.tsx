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
      absoluteFill: {},
    },
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("react-native-svg", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => children,
    Svg: ({ children }: { children: React.ReactNode }) => children,
    Path: () => null,
    Defs: ({ children }: { children: React.ReactNode }) => children,
    Stop: () => null,
    LinearGradient: ({ children }: { children: React.ReactNode }) => children,
  };
});

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
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
    colors: {
      text: "#111",
      textSecondary: "#666",
      success: "#0a0",
      primary: "#0af",
    },
    borderRadius: { md: 12, full: 999, lg: 16 },
  },
}));

import { HydrationCard } from "@/components/diet/HydrationCard";

describe("HydrationCard", () => {
  it("stops propagation for nested quick-add actions", () => {
    const onAddWater = jest.fn();
    const event = { stopPropagation: jest.fn() };

    const screen = render(
      <HydrationCard
        currentIntake={500}
        dailyGoal={2500}
        onAddWater={onAddWater}
        onPress={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText("Add 250ml of water"), event);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onAddWater).toHaveBeenCalledWith(250);
  });
});
