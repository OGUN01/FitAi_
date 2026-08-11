import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";

jest.mock("../../../components/ui/aurora/AuroraBackground", () => ({
  AuroraBackground: ({ children }: { children: React.ReactNode }) => children,
}));

import { ScreenErrorBoundary } from "../../../components/errors/ScreenErrorBoundary";

const Bomb: React.FC = () => {
  throw new Error("boom");
};

// EmptyState's accessibilityLabel="Try Again" is set on both its own root
// wrapper and the actual pressable CTA button nested inside it — query by
// role to land on the one that's really clickable.
const getTryAgainButton = (screen: ReturnType<typeof render>) =>
  screen.getAllByLabelText("Try Again").find((el) => el.props.accessibilityRole === "button")!;

describe("ScreenErrorBoundary", () => {
  // Silence the intentional console.error from componentDidCatch during
  // these tests — it's expected output, not a real test failure signal.
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders the fallback UI (inside AuroraBackground) when a child throws", () => {
    const screen = render(
      <ScreenErrorBoundary screenName="TestScreen">
        <Bomb />
      </ScreenErrorBoundary>,
    );

    expect(getTryAgainButton(screen)).toBeTruthy();
    expect(screen.getByText(/TestScreen/)).toBeTruthy();
  });

  it("calls the caller-supplied onReset when Try Again is pressed", () => {
    const onReset = jest.fn();
    const screen = render(
      <ScreenErrorBoundary screenName="TestScreen" onReset={onReset}>
        <Bomb />
      </ScreenErrorBoundary>,
    );

    fireEvent.press(getTryAgainButton(screen));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("does not throw when Try Again is pressed with no onReset prop", () => {
    const screen = render(
      <ScreenErrorBoundary screenName="TestScreen">
        <Bomb />
      </ScreenErrorBoundary>,
    );

    expect(() => fireEvent.press(getTryAgainButton(screen))).not.toThrow();
  });

  it("renders children normally when nothing throws", () => {
    const screen = render(
      <ScreenErrorBoundary screenName="TestScreen">
        <Text>All good</Text>
      </ScreenErrorBoundary>,
    );

    expect(screen.getByText("All good")).toBeTruthy();
    expect(screen.queryAllByLabelText("Try Again")).toHaveLength(0);
  });
});
