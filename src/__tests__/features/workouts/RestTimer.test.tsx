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
  StyleSheet: {
    create: (s: any) => s,
    flatten: (s: any) =>
      Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {},
  },
  Vibration: {
    vibrate: jest.fn(),
  },
}));

jest.mock("../../../services/restTimerService", () => ({
  getRemainingTime: jest.fn(),
  isExpired: jest.fn(),
}));

import { render, fireEvent, act } from "@testing-library/react-native";
import { Vibration } from "react-native";
import { RestTimer } from "../../../features/workouts/components/RestTimer";
import {
  getRemainingTime,
  isExpired,
} from "../../../services/restTimerService";

const mockGetRemainingTime = getRemainingTime as jest.Mock;
const mockIsExpired = isExpired as jest.Mock;

describe("RestTimer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetRemainingTime.mockReturnValue(60);
    mockIsExpired.mockReturnValue(false);
  });

  afterEach(() => {
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
    mockGetRemainingTime.mockReturnValue(60);

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
    const target = Date.now() + 60000;
    mockGetRemainingTime
      .mockReturnValueOnce(60)
      .mockReturnValueOnce(59)
      .mockReturnValueOnce(58);

    const { getByTestId } = render(
      <RestTimer
        targetEndTime={target}
        onExpire={jest.fn()}
        onSkip={jest.fn()}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockGetRemainingTime).toHaveBeenCalledWith(target);
  });

  it("calls onExpire and vibrates when timer expires", () => {
    const target = Date.now() + 1000;
    const onExpire = jest.fn();

    mockGetRemainingTime.mockReturnValue(1);
    mockIsExpired.mockReturnValue(false);

    render(
      <RestTimer
        targetEndTime={target}
        onExpire={onExpire}
        onSkip={jest.fn()}
      />,
    );

    mockGetRemainingTime.mockReturnValue(0);
    mockIsExpired.mockReturnValue(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(Vibration.vibrate).toHaveBeenCalledWith([0, 500]);
  });

  it("calls onSkip when Skip button is pressed", () => {
    const target = Date.now() + 60000;
    const onSkip = jest.fn();
    mockGetRemainingTime.mockReturnValue(60);

    const { getByTestId } = render(
      <RestTimer targetEndTime={target} onExpire={jest.fn()} onSkip={onSkip} />,
    );

    fireEvent.press(getByTestId("rest-timer-skip"));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("cleans up interval on unmount", () => {
    const target = Date.now() + 60000;
    mockGetRemainingTime.mockReturnValue(60);
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
    const target = Date.now() + 125000;
    mockGetRemainingTime.mockReturnValue(125);

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
