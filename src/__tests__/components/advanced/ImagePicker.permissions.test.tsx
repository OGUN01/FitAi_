import React from "react";
import { Linking } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ExpoImagePicker from "expo-image-picker";

const mockAlert = jest.fn();

jest.mock("../../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: (...args: unknown[]) => mockAlert(...args),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("../../../components/ui/aurora/BottomSheet", () => ({
  BottomSheet: ({ children }: { children: React.ReactNode }) => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, null, children);
  },
}));

jest.mock("../../../components/ui/aurora/GlassCard", () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, null, children);
  },
}));

jest.mock("../../../components/ui/aurora/GlassButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    GlassButton: ({
      label,
      onPress,
      disabled,
    }: {
      label: string;
      onPress: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: label,
          onPress,
          disabled,
        },
        React.createElement(Text, null, label),
      ),
  };
});

jest.mock("../../../components/ui/aurora/AnimatedPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    AnimatedPressable: ({
      children,
      onPress,
      disabled,
      accessibilityLabel,
    }: {
      children: React.ReactNode;
      onPress: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
    }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel,
          onPress,
          disabled,
        },
        children,
      ),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

import { ImagePicker } from "../../../components/advanced/ImagePicker";

describe("ImagePicker permission recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("offers device settings when photo-library permission is permanently denied", async () => {
    jest
      .mocked(ExpoImagePicker.requestMediaLibraryPermissionsAsync)
      .mockResolvedValue({
        status: "denied",
        granted: false,
        expires: "never",
        canAskAgain: false,
      });
    const openSettings = jest
      .spyOn(Linking, "openSettings")
      .mockResolvedValue(undefined);

    const screen = render(
      <ImagePicker
        visible
        mode="single"
        onImagesSelected={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText("Choose image from library"));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        "Permission Blocked",
        expect.stringContaining("device settings"),
        expect.any(Array),
      ),
    );

    const buttons = mockAlert.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    buttons.find((button) => button.text === "Open Settings")?.onPress?.();
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("guards the OS permission request against duplicate taps", async () => {
    let resolvePermission: ((value: ExpoImagePicker.PermissionResponse) => void) | undefined;
    jest
      .mocked(ExpoImagePicker.requestMediaLibraryPermissionsAsync)
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePermission = resolve;
          }),
      );

    const screen = render(
      <ImagePicker
        visible
        mode="single"
        onImagesSelected={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const libraryButton = screen.getByLabelText("Choose image from library");

    fireEvent.press(libraryButton);
    fireEvent.press(libraryButton);

    expect(
      ExpoImagePicker.requestMediaLibraryPermissionsAsync,
    ).toHaveBeenCalledTimes(1);

    resolvePermission?.({
      status: "denied",
      granted: false,
      expires: "never",
      canAskAgain: true,
    });
    await waitFor(() => expect(mockAlert).toHaveBeenCalled());
  });
});
