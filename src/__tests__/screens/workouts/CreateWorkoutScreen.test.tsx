import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const RealReact = require("react");
  return {
    View: "View",
    Text: "Text",
    TextInput: RealReact.forwardRef((props: any, ref: any) =>
      RealReact.createElement("TextInput", { ...props, ref }),
    ),
    FlatList: ({ data, renderItem, testID, ...rest }: any) =>
      RealReact.createElement(
        "View",
        { testID, ...rest },
        (data || []).map((item: any, index: number) =>
          RealReact.createElement(
            RealReact.Fragment,
            { key: item.id || index },
            renderItem({ item, index }),
          ),
        ),
      ),
    Pressable: RealReact.forwardRef((props: any, ref: any) =>
      RealReact.createElement("Pressable", { ...props, ref }, props.children),
    ),
    ScrollView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    SafeAreaView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    StyleSheet: {
      create: (s: any) => s,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Platform: { OS: "ios" },
  };
});

jest.mock("../../../stores/fitnessStore", () => ({
  useFitnessStore: (selector?: (state: any) => any) => {
    const state = {
      startTemplateSession: jest.fn().mockResolvedValue("session-123"),
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../../services/workoutTemplateService", () => ({
  workoutTemplateService: {
    createTemplate: jest.fn().mockResolvedValue({ id: "tpl-1", name: "Test" }),
  },
  TemplateExercise: {},
}));

jest.mock("../../../services/authUtils", () => ({
  getCurrentUserId: jest.fn(() => "test-user"),
}));

jest.mock("../../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

import CreateWorkoutScreen from "../../../screens/workouts/CreateWorkoutScreen";

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe("CreateWorkoutScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders name input", () => {
    const { getByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );
    expect(getByTestId("workout-name-input")).toBeTruthy();
  });

  it("exercise picker shows exercises", () => {
    const { getByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );
    expect(getByTestId("exercise-picker-list")).toBeTruthy();
  });

  it('"+" adds exercise to added list', () => {
    const { getByTestId, queryByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );

    const addBtn = getByTestId("add-exercise-push_up");
    fireEvent.press(addBtn);

    expect(queryByTestId("remove-exercise-0")).toBeTruthy();
  });

  it("remove button removes exercise", () => {
    const { getByTestId, queryByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );

    fireEvent.press(getByTestId("add-exercise-push_up"));
    expect(queryByTestId("remove-exercise-0")).toBeTruthy();

    fireEvent.press(getByTestId("remove-exercise-0"));
    expect(queryByTestId("remove-exercise-0")).toBeNull();
  });

  it('"Save Template" button exists', () => {
    const { getByTestId } = render(
      <CreateWorkoutScreen navigation={mockNavigation} />,
    );
    expect(getByTestId("save-template-button")).toBeTruthy();
  });
});
