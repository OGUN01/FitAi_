import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  const makeAnimationHandle = () => ({
    start: jest.fn(),
    stop: jest.fn(),
  });

  class MockAnimatedValue {
    value: number;

    constructor(value: number) {
      this.value = value;
    }

    interpolate() {
      return 0;
    }
  }

  return {
    View: "View",
    Text: "Text",
    TouchableOpacity: React.forwardRef((props: any, ref) =>
      React.createElement("TouchableOpacity", { ...props, ref }, props.children),
    ),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Animated: {
      Value: MockAnimatedValue,
      View: "AnimatedView",
      Text: "AnimatedText",
      timing: () => makeAnimationHandle(),
      loop: () => makeAnimationHandle(),
      sequence: () => makeAnimationHandle(),
    },
    Easing: {
      linear: jest.fn(),
      inOut: (value: unknown) => value,
      ease: "ease",
    },
  };
});

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rh: (value: number) => Math.round(value * 0.75),
  rw: (value: number) => Math.round(value * 0.75),
  rs: (value: number) => Math.round(value * 0.75),
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      warningAlt: "#fa0",
      blue: "#09f",
      successAlt: "#0a0",
      errorAlt: "#f33",
      text: "#111",
      textSecondary: "#666",
      primary: "#0af",
    },
    fontSize: { sm: 12, md: 14 },
    fontWeight: { bold: "700", semibold: "600", medium: "500" },
    spacing: { sm: 8, md: 12 },
    borderRadius: { md: 12, sm: 8 },
  },
}));

import { JobStatusIndicator } from "@/components/diet/JobStatusIndicator";

describe("JobStatusIndicator", () => {
  it("keeps dismiss and cancel controls at accessible tap sizes", () => {
    const processing = render(
      <JobStatusIndicator
        job={{
          status: "processing",
          estimatedTimeRemaining: 45,
        } as any}
        onCancel={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(processing.getByLabelText("Cancel generation").props.style),
    ).toMatchObject({ minHeight: 44 });

    const completed = render(
      <JobStatusIndicator
        job={{
          status: "completed",
          generationTimeMs: 1200,
        } as any}
        onDismiss={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(
        completed.getByLabelText("Dismiss generation status").props.style,
      ),
    ).toMatchObject({ width: 44, height: 44 });
  });
});
