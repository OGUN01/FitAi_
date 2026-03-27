import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    ScrollView: "ScrollView",
    TouchableOpacity: React.forwardRef((props: any, ref) =>
      React.createElement(
        "TouchableOpacity",
        { ...props, ref },
        props.children,
      ),
    ),
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

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => value,
  rh: (value: number) => value,
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
    colors: {
      text: "#111",
      textSecondary: "#666",
      textMuted: "#888",
      backgroundTertiary: "#222",
      primary: "#0af",
      white: "#fff",
    },
    borderRadius: { md: 12 },
    fontSize: { sm: 12, lg: 18 },
    fontWeight: { semibold: "600" },
  },
}));

jest.mock("@/components/ui/aurora", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");

  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    AnimatedPressable: ({
      children,
      onPress,
      accessibilityLabel,
      style,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      accessibilityLabel?: string;
      style?: unknown;
    }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityLabel, style },
        children,
      ),
  };
});

import { CurrentDietSection } from "@/components/onboarding/diet/CurrentDietSection";

describe("CurrentDietSection", () => {
  it("stops propagation before opening the info tooltip", () => {
    const updateField = jest.fn();
    const showInfoTooltip = jest.fn();
    const event = { stopPropagation: jest.fn() };

    const screen = render(
      <CurrentDietSection
        formData={{ diet_type: null } as any}
        updateField={updateField}
        showInfoTooltip={showInfoTooltip}
      />,
    );

    const infoButton = screen.getAllByLabelText(/More info about/i)[0];
    fireEvent.press(infoButton, event);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(showInfoTooltip).toHaveBeenCalledTimes(1);
    expect(updateField).not.toHaveBeenCalled();
  });
});
