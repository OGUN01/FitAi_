import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

const mockSyncHealthData = jest.fn();

jest.mock("../../../stores/healthDataStore", () => ({
  useHealthDataStore: () => ({
    isHealthKitAuthorized: true,
    isHealthConnectAuthorized: false,
    syncStatus: "idle",
    lastSyncTime: undefined,
    syncError: undefined,
    syncHealthData: mockSyncHealthData,
    syncFromHealthConnect: jest.fn(),
    metrics: { sources: { steps: { name: "Apple Health", tier: 2 } } },
  }),
}));

jest.mock("../../../components/ui/aurora/AnimatedPressable", () => {
  const ReactRuntime = require("react");
  const { Pressable: NativePressable } = require("react-native");
  return {
    AnimatedPressable: ({ children, ...props }: any) =>
      ReactRuntime.createElement(NativePressable, props, children),
  };
});

jest.mock("../../../components/ui/aurora/AuroraSpinner", () => ({
  AuroraSpinner: () => null,
}));

jest.mock("../../../utils/haptics", () => ({
  haptics: { light: jest.fn() },
}));

import { SyncStatusIndicator } from "../../../screens/main/home/SyncStatusIndicator";

describe("SyncStatusIndicator", () => {
  beforeEach(() => {
    mockSyncHealthData.mockReset();
  });

  it("announces the source and current sync state", () => {
    const screen = render(<SyncStatusIndicator />);

    expect(screen.getByRole("button")).toBeTruthy();
    expect(screen.getByLabelText("Apple Health: Not synced, Premium accuracy")).toBeTruthy();
  });

  it("guards manual sync against same-frame double taps", async () => {
    let finishSync: (() => void) | undefined;
    mockSyncHealthData.mockImplementation(
      () => new Promise<void>((resolve) => {
        finishSync = resolve;
      }),
    );
    const screen = render(<SyncStatusIndicator />);
    const syncButton = screen.getByRole("button");

    fireEvent.press(syncButton);
    fireEvent.press(syncButton);

    expect(mockSyncHealthData).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishSync?.();
    });
  });
});
