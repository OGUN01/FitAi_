import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    StyleSheet: {
      create: (styles: unknown) => styles,
    },
    ScrollView: ({ children }: { children: React.ReactNode }) => children,
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components/ui/aurora/AnimatedPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");

  return {
    AnimatedPressable: React.forwardRef((props: any, ref) =>
      React.createElement(Pressable, { ...props, ref }, props.children),
    ),
  };
});

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
      errorLight: "#f55",
      teal: "#0aa",
      info: "#09f",
      warning: "#fa0",
    },
  },
}));

import { DietQuickActions } from "@/components/diet/DietQuickActions";

describe("DietQuickActions", () => {
  it("keeps the quick action row focused on unique supporting actions", () => {
    const screen = render(
      <DietQuickActions
        onScanFood={jest.fn()}
        onScanBarcode={jest.fn()}
        onScanLabel={jest.fn()}
        onLogWater={jest.fn()}
        onViewRecipes={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Scan Food")).toBeTruthy();
    expect(screen.getByLabelText("Barcode")).toBeTruthy();
    expect(screen.getByLabelText("Scan Label")).toBeTruthy();
    expect(screen.getByLabelText("Log Water")).toBeTruthy();
    expect(screen.getByLabelText("Recipes")).toBeTruthy();

    expect(screen.queryByLabelText("Log Meal")).toBeNull();
  });
});
