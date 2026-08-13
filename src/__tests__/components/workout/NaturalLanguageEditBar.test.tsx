import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

const mockApplyAiEdit = jest.fn();
const mockEditNaturalLanguage = jest.fn();
const mockDraft = { id: "draft-1", workouts: [] };

jest.mock("@/stores/workoutBuilderStore", () => ({
  useWorkoutBuilderStore: (selector: (state: unknown) => unknown) =>
    selector({ draft: mockDraft, applyAiEdit: mockApplyAiEdit }),
}));

jest.mock("@/ai/workoutBuilderAi", () => ({
  workoutBuilderAi: { editNaturalLanguage: (...args: unknown[]) => mockEditNaturalLanguage(...args) },
}));

jest.mock("@/utils/haptics", () => ({
  haptics: {
    selection: jest.fn(),
    warning: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/utils/accessibility/hooks", () => ({
  useReducedMotion: () => false,
}));

jest.mock("@/components/ui/aurora/GlassCard", () => {
  const ReactLocal = require("react");
  const { View } = require("react-native");
  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
      ReactLocal.createElement(View, null, children),
  };
});

jest.mock("@/components/ui/aurora/GlassButton", () => {
  const ReactLocal = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    GlassButton: ({ label, onPress, disabled, loading }: any) =>
      ReactLocal.createElement(
        Pressable,
        { accessibilityLabel: label, onPress, disabled, accessibilityState: { disabled, busy: loading } },
        ReactLocal.createElement(Text, null, label),
      ),
  };
});

jest.mock("@/components/ui/aurora/AuroraSpinner", () => ({ AuroraSpinner: () => null }));

import { NaturalLanguageEditBar } from "@/components/fitness/builder/NaturalLanguageEditBar";

describe("NaturalLanguageEditBar reliability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("guards duplicate AI edits and ignores a response after unmount", async () => {
    let resolveRequest!: (value: unknown) => void;
    mockEditNaturalLanguage.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const view = render(<NaturalLanguageEditBar />);
    fireEvent.press(view.getByLabelText("Open AI edit bar"));
    fireEvent(view.getByLabelText("Natural language workout instruction"), "change", {
      nativeEvent: { text: "Make Friday heavier" },
    });

    const apply = view.getByLabelText("Apply");
    act(() => {
      fireEvent.press(apply);
      fireEvent.press(apply);
    });

    expect(mockEditNaturalLanguage).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText("Collapse AI edit bar")).toBeDisabled();

    view.unmount();
    await act(async () => {
      resolveRequest({
        success: true,
        data: { updatedPlan: { id: "updated", workouts: [] }, summary: "Updated Friday" },
      });
      await Promise.resolve();
    });

    expect(mockApplyAiEdit).not.toHaveBeenCalled();
  });
});
