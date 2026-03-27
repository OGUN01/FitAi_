import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: React.forwardRef((props: any, ref) =>
      React.createElement("View", { ...props, ref }, props.children),
    ),
    Text: React.forwardRef((props: any, ref) =>
      React.createElement("Text", { ...props, ref }, props.children),
    ),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Platform: {
      OS: "ios",
    },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});

jest.mock("react-native-svg", () => {
  const React = require("react");

  const createSvgComponent = (name: string) =>
    React.forwardRef((props: any, ref) =>
      React.createElement(name, { ...props, ref }, props.children),
    );

  return {
    __esModule: true,
    default: createSvgComponent("Svg"),
    Svg: createSvgComponent("Svg"),
    Defs: createSvgComponent("Defs"),
    LinearGradient: createSvgComponent("LinearGradient"),
    Stop: createSvgComponent("Stop"),
    Path: createSvgComponent("Path"),
    Circle: createSvgComponent("Circle"),
    Line: createSvgComponent("Line"),
    G: createSvgComponent("G"),
    Rect: createSvgComponent("Rect"),
    Text: createSvgComponent("SvgText"),
  };
});

jest.mock("expo-linear-gradient", () => {
  const React = require("react");

  return {
    LinearGradient: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("LinearGradient", null, children),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("../../../utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      text: "#111",
      textMuted: "#666",
      textSecondary: "#777",
      white: "#fff",
      border: "#ddd",
      primary: "#0af",
      primaryTint: "rgba(0, 170, 255, 0.15)",
      success: "#0a0",
      successTint: "rgba(0, 170, 0, 0.15)",
      error: "#f33",
      errorTint: "rgba(255, 51, 51, 0.15)",
      glassSurface: "rgba(255, 255, 255, 0.08)",
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
    },
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 18,
      xl: 20,
    },
    fontWeight: {
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },
}));

jest.mock("../../../utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => value,
  rh: (value: number) => value,
  rp: (value: number) => value,
  rbr: (value: number) => value,
}));

import { LineChart } from "@/screens/main/analytics/components/LineChart";

describe("analytics LineChart", () => {
  it("clears a stale selected point when the dataset shrinks", async () => {
    const initialData = [
      { label: "Mon", value: 80 },
      { label: "Tue", value: 81 },
      { label: "Wed", value: 82 },
    ];

    const screen = render(
      <LineChart data={initialData} color="#0af" unit="kg" />,
    );

    const hitAreas = screen
      .UNSAFE_getAllByType("Circle")
      .filter((node) => typeof node.props.onPress === "function");

    expect(hitAreas).toHaveLength(initialData.length);

    fireEvent.press(hitAreas[1]);

    const getSvgTextValues = () =>
      screen.UNSAFE_getAllByType("SvgText").map((node) => {
        const children = node.props.children;
        return Array.isArray(children) ? children.join("") : String(children);
      });

    await waitFor(() => {
      expect(getSvgTextValues()).toContain("81.0kg");
    });

    expect(() =>
      screen.rerender(
        <LineChart
          data={[{ label: "Thu", value: 82 }]}
          color="#0af"
          unit="kg"
        />,
      ),
    ).not.toThrow();

    await waitFor(() => {
      expect(getSvgTextValues()).not.toContain("81.0kg");
    });
  });
});
