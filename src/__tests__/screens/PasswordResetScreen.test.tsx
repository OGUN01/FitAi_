import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("../../components/ui/aurora/AuroraBackground", () => {
  const ReactRuntime = require("react");
  const { View } = require("react-native");
  return {
    AuroraBackground: ({ children }: any) =>
      ReactRuntime.createElement(View, null, children),
  };
});

jest.mock("../../components/ui/aurora/AuroraSpinner", () => ({
  AuroraSpinner: () => null,
}));

jest.mock("../../components/ui/aurora/EmptyState", () => ({
  EmptyState: () => null,
}));

jest.mock("../../components/onboarding/aurora/UnderlineInput", () => {
  const ReactRuntime = require("react");
  const { TextInput } = require("react-native");
  return {
    UnderlineInput: ({ label, ...props }: any) =>
      ReactRuntime.createElement(TextInput, { ...props, accessibilityLabel: label }),
  };
});

jest.mock("../../components/ui/aurora/GlassButton", () => {
  const ReactRuntime = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    GlassButton: ({ label, onPress, disabled }: any) =>
      ReactRuntime.createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button", accessibilityLabel: label },
        ReactRuntime.createElement(Text, null, label),
      ),
  };
});

import { PasswordResetScreen } from "../../screens/auth/PasswordResetScreen";
import { supabase } from "../../services/supabase";

const getSessionSpy = jest.spyOn(supabase.auth, "getSession");
const updateUserSpy = jest.spyOn(supabase.auth, "updateUser");

describe("PasswordResetScreen", () => {
  beforeEach(() => {
    getSessionSpy.mockReset();
    updateUserSpy.mockReset();
  });

  it("guards password updates against same-frame double taps", async () => {
    let finishSessionCheck: (() => void) | undefined;
    getSessionSpy.mockImplementation(
      () => new Promise((resolve) => {
        finishSessionCheck = () => resolve({
          data: { session: { user: { id: "user-1" } } },
          error: null,
        });
      }),
    );
    let finishUpdate: (() => void) | undefined;
    updateUserSpy.mockImplementation(
      () => new Promise((resolve) => {
        finishUpdate = () => resolve({ error: null });
      }),
    );
    const screen = render(
      <PasswordResetScreen onBackToLogin={jest.fn()} onRequestNewReset={jest.fn()} />,
    );

    expect(getSessionSpy).toHaveBeenCalled();

    await act(async () => {
      finishSessionCheck?.();
    });

    await waitFor(() => expect(screen.getByLabelText("New Password")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("New Password"), "strongpass1");
    fireEvent.changeText(screen.getByLabelText("Confirm New Password"), "strongpass1");
    const submit = screen.getByLabelText("Update Password");
    fireEvent.press(submit);
    fireEvent.press(submit);

    expect(updateUserSpy).toHaveBeenCalledTimes(1);
    expect(updateUserSpy).toHaveBeenCalledWith({ password: "strongpass1" });

    await act(async () => {
      finishUpdate?.();
    });
  });
});
