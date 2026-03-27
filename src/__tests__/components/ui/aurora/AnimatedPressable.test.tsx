import React from "react";
import { Text, StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

const mockTrigger = jest.fn();

jest.mock("react-native", () => {
  const React = require("react");

  return {
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
    View: "View",
    Text: "Text",
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
  };
});

jest.mock("@/utils/haptics", () => ({
  haptics: {
    trigger: (...args: unknown[]) => mockTrigger(...args),
  },
}));

import { AnimatedPressable } from "@/components/ui/aurora/AnimatedPressable";

describe("AnimatedPressable", () => {
  beforeEach(() => {
    mockTrigger.mockClear();
  });

  it("applies layout styles to the actual press target", () => {
    const { getByTestId } = render(
      <AnimatedPressable
        testID="press-target"
        onPress={jest.fn()}
        style={{ width: 123, paddingVertical: 10 }}
      >
        <Text>Tap me</Text>
      </AnimatedPressable>,
    );

    const pressable = getByTestId("press-target");

    expect(StyleSheet.flatten(pressable.props.style)).toMatchObject({
      width: 123,
      paddingVertical: 10,
    });
  });

  it("stays non-interactive when no press handlers are provided", () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="static-target" style={{ width: 80 }}>
        <Text>Static content</Text>
      </AnimatedPressable>,
    );

    const pressable = getByTestId("static-target");

    fireEvent(pressable, "pressIn", { stopPropagation: jest.fn() });

    expect(pressable.props.onPressIn).toBeUndefined();
    expect(pressable.props.accessible).toBe(false);
    expect(mockTrigger).not.toHaveBeenCalled();
  });
});
