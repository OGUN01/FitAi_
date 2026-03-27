import React from "react";

jest.mock("react-native", () => ({
  View: ({ children, testID, style, ...props }: any) => {
    const RealReact = require("react");
    return RealReact.createElement(
      "View",
      { testID, style, ...props },
      children,
    );
  },
  Text: ({ children, style, ...props }: any) => {
    const RealReact = require("react");
    return RealReact.createElement("Text", { style, ...props }, children);
  },
  TouchableOpacity: ({ children, testID, onPress, style, ...props }: any) => {
    const RealReact = require("react");
    return RealReact.createElement(
      "TouchableOpacity",
      { testID, onPress, style, ...props },
      children,
    );
  },
  Modal: ({ children, visible, ...props }: any) => {
    const RealReact = require("react");
    if (!visible) return null;
    return RealReact.createElement("Modal", props, children);
  },
  StyleSheet: {
    create: (s: any) => s,
    flatten: (s: any) =>
      Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {},
  },
  Platform: { OS: "ios", select: (o: any) => o?.ios },
}));

import { render, fireEvent } from "@testing-library/react-native";
import {
  DeloadModal,
  DeloadModalProps,
} from "../../../features/workouts/components/DeloadModal";

describe("DeloadModal", () => {
  const baseProactive: DeloadModalProps = {
    visible: true,
    variant: "proactive",
    message: "Week 5 — time for a recovery week! Reduce volume by 40%?",
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  const baseReactive: DeloadModalProps = {
    visible: true,
    variant: "reactive",
    message: "Bench Press struggling for 2 sessions — consider reducing by 10%",
    exerciseName: "Bench Press",
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("visibility", () => {
    it("renders nothing when visible=false", () => {
      const { queryByTestId } = render(
        <DeloadModal {...baseProactive} visible={false} />,
      );
      expect(queryByTestId("deload-modal")).toBeNull();
    });

    it("renders when visible=true", () => {
      const { getByTestId } = render(<DeloadModal {...baseProactive} />);
      expect(getByTestId("deload-modal")).toBeTruthy();
    });
  });

  describe("proactive variant", () => {
    it("displays the proactive message", () => {
      const { getByText } = render(<DeloadModal {...baseProactive} />);
      expect(
        getByText("Week 5 — time for a recovery week! Reduce volume by 40%?"),
      ).toBeTruthy();
    });

    it("shows Accept button", () => {
      const { getByTestId } = render(<DeloadModal {...baseProactive} />);
      expect(getByTestId("deload-accept-btn")).toBeTruthy();
    });

    it("shows Dismiss button", () => {
      const { getByTestId } = render(<DeloadModal {...baseProactive} />);
      expect(getByTestId("deload-dismiss-btn")).toBeTruthy();
    });

    it("calls onAccept when Accept pressed", () => {
      const { getByTestId } = render(<DeloadModal {...baseProactive} />);
      fireEvent.press(getByTestId("deload-accept-btn"));
      expect(baseProactive.onAccept).toHaveBeenCalledTimes(1);
    });

    it("calls onDismiss when Dismiss pressed", () => {
      const { getByTestId } = render(<DeloadModal {...baseProactive} />);
      fireEvent.press(getByTestId("deload-dismiss-btn"));
      expect(baseProactive.onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("reactive variant", () => {
    it("displays the reactive message with exercise name", () => {
      const { getByText } = render(<DeloadModal {...baseReactive} />);
      expect(
        getByText(
          "Bench Press struggling for 2 sessions — consider reducing by 10%",
        ),
      ).toBeTruthy();
    });

    it("calls onAccept on accept", () => {
      const { getByTestId } = render(<DeloadModal {...baseReactive} />);
      fireEvent.press(getByTestId("deload-accept-btn"));
      expect(baseReactive.onAccept).toHaveBeenCalledTimes(1);
    });

    it("calls onDismiss on dismiss", () => {
      const { getByTestId } = render(<DeloadModal {...baseReactive} />);
      fireEvent.press(getByTestId("deload-dismiss-btn"));
      expect(baseReactive.onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("snooze tracking", () => {
    it("does NOT auto-apply any changes — only calls callbacks", () => {
      const onAccept = jest.fn();
      const onDismiss = jest.fn();
      const { getByTestId } = render(
        <DeloadModal
          {...baseProactive}
          onAccept={onAccept}
          onDismiss={onDismiss}
        />,
      );
      fireEvent.press(getByTestId("deload-dismiss-btn"));
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onAccept).not.toHaveBeenCalled();
    });
  });
});
