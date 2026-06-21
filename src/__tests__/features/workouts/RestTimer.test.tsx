import React from "react";

jest.mock("react-native", () => {
  const RealReact = require("react");
  const View = ({ children, testID, style, ...props }: any) =>
    RealReact.createElement("View", { testID, style, ...props }, children);
  const Text = ({ children, style, ...props }: any) =>
    RealReact.createElement("Text", { style, ...props }, children);
  const TouchableOpacity = ({
    children,
    testID,
    onPress,
    style,
    ...props
  }: any) =>
    RealReact.createElement(
      "TouchableOpacity",
      { testID, onPress, style, ...props },
      children,
    );
  const Pressable = ({ children, testID, onPress, style, ...props }: any) =>
    RealReact.createElement(
      "Pressable",
      { testID, onPress, style, ...props },
      children,
    );
  return {
    View,
    Text,
    TouchableOpacity,
    Pressable,
    // Minimal Animated stub — the global reanimated mock handles the real
    // animation primitives; this covers any leftover RN Animated.Value usage.
    Animated: {
      View: ({ children, style, ...props }: any) =>
        RealReact.createElement("View", { style, ...props }, children),
      Value: class {
        constructor(v: any) {
          this.value = v;
        }
      },
    },
    Dimensions: {
      get: () => ({ width: 393, height: 852, scale: 1, fontScale: 1 }),
    },
    StyleSheet: {
      create: (s: any) => s,
      flatten: (s: any) =>
        Array.isArray(s)
          ? Object.assign({}, ...s.filter(Boolean))
          : s || {},
    },
    Platform: { OS: "ios", select: (o: any) => o?.ios },
    Vibration: {
      vibrate: jest.fn(),
    },
  };
});

// Note: RestTimer computes remaining seconds inline (it manages its own
// effectiveEndRef for pause/resume semantics), so it does not call
// getRemainingTime / isExpired from restTimerService. These tests drive
// the component through its real internal interval + Date.now() reads.

import { render, fireEvent, act } from "@testing-library/react-native";
import { Vibration } from "react-native";
import { RestTimer } from "../../../features/workouts/components/RestTimer";

describe("RestTimer", () => {
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Pin Date.now so the component's inline time math is deterministic.
    nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
  });

  afterEach(() => {
    nowSpy.mockRestore();
    jest.useRealTimers();
  });

  it("renders nothing when targetEndTime is null", () => {
    const { toJSON } = render(
      <RestTimer
        targetEndTime={null}
        onExpire={jest.fn()}
        onSkip={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it("shows countdown when targetEndTime is provided", () => {
    const target = Date.now() + 60000;

    const { getByTestId } = render(
      <RestTimer
        targetEndTime={target}
        onExpire={jest.fn()}
        onSkip={jest.fn()}
      />,
    );

    expect(getByTestId("rest-timer-container")).toBeTruthy();
    expect(getByTestId("rest-timer-countdown")).toBeTruthy();
  });

  it("updates countdown every second", () => {
    // target 60s ahead of pinned now
    const target = Date.now() + 60000;

    const { getByTestId } = render(
      <RestTimer
        targetEndTime={target}
        onExpire={jest.fn()}
        onSkip={jest.fn()}
      />,
    );

    const countdown = getByTestId("rest-timer-countdown");
    // Initial render computes remaining from (target - now) = 60s
    expect(countdown.props.children).toBe("1:00");

    // Advance real time by 1s; the 500ms interval fires twice and recomputes
    nowSpy.mockReturnValue(Date.now() + 1000);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(countdown.props.children).toBe("0:59");
  });

  it("calls onExpire and vibrates when timer expires", () => {
    // target 1s ahead of pinned now
    const target = Date.now() + 1000;
    const onExpire = jest.fn();

    render(
      <RestTimer
        targetEndTime={target}
        onExpire={onExpire}
        onSkip={jest.fn()}
      />,
    );

    // Advance real time past the target so the interval sees secs === 0
    nowSpy.mockReturnValue(Date.now() + 1000);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(Vibration.vibrate).toHaveBeenCalledWith([0, 400, 100, 400]);
  });

  it("calls onSkip when Skip button is pressed", () => {
    const target = Date.now() + 60000;
    const onSkip = jest.fn();

    const { getByTestId } = render(
      <RestTimer targetEndTime={target} onExpire={jest.fn()} onSkip={onSkip} />,
    );

    fireEvent.press(getByTestId("rest-timer-skip"));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("cleans up interval on unmount", () => {
    const target = Date.now() + 60000;
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { unmount } = render(
      <RestTimer
        targetEndTime={target}
        onExpire={jest.fn()}
        onSkip={jest.fn()}
      />,
    );

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("formats time as mm:ss", () => {
    // target 125s ahead of pinned now → remaining = 125s → "2:05"
    const target = Date.now() + 125000;

    const { getByTestId } = render(
      <RestTimer
        targetEndTime={target}
        onExpire={jest.fn()}
        onSkip={jest.fn()}
      />,
    );

    const countdown = getByTestId("rest-timer-countdown");
    expect(countdown.props.children).toBe("2:05");
  });
});
