import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { WorkoutCompleteDialog } from "@/components/ui/CustomDialog";
import { spacing } from "@/theme/aurora-tokens";

jest.mock("react-native", () => {
  const React = require("react");
  const host = (name: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(name, { ...props, ref }, children),
    );

  return {
    View: host("View"),
    Text: host("Text"),
    TouchableOpacity: host("TouchableOpacity"),
    Pressable: host("Pressable"),
    TextInput: host("TextInput"),
    ActivityIndicator: host("ActivityIndicator"),
    Modal: ({ visible = true, children, ...props }: any) =>
      visible ? React.createElement("Modal", props, children) : null,
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Platform: { OS: "android" },
    useWindowDimensions: () => ({
      width: 320,
      height: 568,
      scale: 1,
      fontScale: 2,
    }),
    KeyboardAvoidingView: host("KeyboardAvoidingView"),
    ScrollView: host("ScrollView"),
    Dimensions: {
      get: () => ({ width: 320, height: 568, scale: 1, fontScale: 2 }),
    },
    PixelRatio: {
      getFontScale: () => 2,
    },
    Alert: { alert: jest.fn() },
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const insets = { top: 24, bottom: 16, left: 0, right: 0 };

  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement("SafeAreaView", props, children),
    useSafeAreaInsets: () => insets,
  };
});

const baseProps = {
  visible: true,
  workoutTitle: "Short Screen Workout",
  duration: 42,
  calories: 310,
  exercisesCompleted: 5,
  totalExercises: 6,
};

describe("WorkoutCompleteDialog", () => {
  it("wraps the dialog body in a keyboard-aware KeyboardAvoidingView with a bounded SafeAreaView", () => {
    const screen = render(
      <WorkoutCompleteDialog
        {...baseProps}
        onDone={jest.fn()}
        onViewProgress={jest.fn()}
      />,
    );

    expect(screen.getByText("Workout Complete!")).toBeTruthy();
    expect(screen.getByPlaceholderText("Any notes? (optional)")).toBeTruthy();
    expect(screen.getByText("View Progress")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();

    const keyboardView = screen.UNSAFE_getByType("KeyboardAvoidingView");
    // behavior is "padding" on iOS, undefined on Android (system handles keyboard).
    // The test's Platform.OS is "android" (set in the react-native mock factory),
    // so behavior must be undefined here.
    expect(keyboardView.props.behavior).toBeUndefined();

    const safeArea = screen.UNSAFE_getByType("SafeAreaView");
    expect(StyleSheet.flatten(safeArea.props.style)).toMatchObject({
      width: "85%",
      maxWidth: 400,
    });

    // No ScrollView is used in the current dialog body — content fits without
    // scrolling, and the KeyboardAvoidingView handles keyboard inset.
    let scrollFound = false;
    try {
      screen.UNSAFE_getByType("ScrollView");
      scrollFound = true;
    } catch {
      // expected — no ScrollView in the current dialog
    }
    expect(scrollFound).toBe(false);

    // Action buttons render outside any scroll container (they're siblings of the
    // stats/feedback sections inside the Card).
    expect(screen.getByText("View Progress")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
  });

  it("submits the selected rating and trimmed notes from Done", () => {
    const onDone = jest.fn();
    const onViewProgress = jest.fn();
    const screen = render(
      <WorkoutCompleteDialog
        {...baseProps}
        onDone={onDone}
        onViewProgress={onViewProgress}
      />,
    );

    const starButtons = screen
      .UNSAFE_getAllByType("TouchableOpacity")
      .slice(0, 5);
    fireEvent.press(starButtons[3]);
    fireEvent.changeText(
      screen.UNSAFE_getByType("TextInput"),
      "  Felt strong  ",
    );
    fireEvent.press(screen.getByText("Done"));

    expect(onDone).toHaveBeenCalledWith(4, "Felt strong");
    expect(onViewProgress).not.toHaveBeenCalled();
  });

  it("saves feedback before opening progress", () => {
    const calls: string[] = [];
    const onDone = jest.fn(() => calls.push("done"));
    const onViewProgress = jest.fn(() => calls.push("progress"));
    const screen = render(
      <WorkoutCompleteDialog
        {...baseProps}
        onDone={onDone}
        onViewProgress={onViewProgress}
      />,
    );

    fireEvent.changeText(
      screen.UNSAFE_getByType("TextInput"),
      "  Recovery session  ",
    );
    fireEvent.press(screen.getByText("View Progress"));

    expect(onDone).toHaveBeenCalledWith(undefined, "Recovery session");
    expect(onViewProgress).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["done", "progress"]);
  });
});
