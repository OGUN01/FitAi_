import React from "react";
import { render, waitFor } from "@testing-library/react-native";

const mockGetTemplates = jest.fn();
const mockIncrementUsageCount = jest.fn();
const mockStartTemplateSession = jest.fn().mockResolvedValue("session-456");

jest.mock("react-native", () => {
  const RealReact = require("react");
  return {
    View: "View",
    Text: "Text",
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
    SafeAreaView: ({ children, ...props }: any) =>
      RealReact.createElement("View", props, children),
    ActivityIndicator: () => null,
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
    const state = { startTemplateSession: mockStartTemplateSession };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../../services/workoutTemplateService", () => ({
  workoutTemplateService: {
    getTemplates: (...args: any[]) => mockGetTemplates(...args),
    incrementUsageCount: (...args: any[]) => mockIncrementUsageCount(...args),
    duplicateTemplate: jest.fn().mockResolvedValue({}),
    deleteTemplate: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../services/authUtils", () => ({
  getCurrentUserId: jest.fn(() => "test-user"),
}));

jest.mock("../../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

import TemplateLibraryScreen from "../../../screens/workouts/TemplateLibraryScreen";

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const sampleTemplate = {
  id: "tpl-001",
  userId: "test-user",
  name: "Push Day",
  description: "Chest focus",
  exercises: [
    {
      exerciseId: "push_up",
      name: "Push-Up",
      sets: 3,
      repRange: [8, 15],
      restSeconds: 60,
    },
  ],
  targetMuscleGroups: ["chest", "triceps"],
  estimatedDurationMinutes: 45,
  isPublic: false,
  usageCount: 2,
  createdAt: "2026-03-26T08:00:00.000Z",
  updatedAt: "2026-03-26T08:00:00.000Z",
};

describe("TemplateLibraryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTemplates.mockResolvedValue([]);
  });

  it("renders empty state when no templates", async () => {
    mockGetTemplates.mockResolvedValue([]);

    const { getByTestId } = render(
      <TemplateLibraryScreen navigation={mockNavigation} />,
    );

    await waitFor(() => {
      expect(getByTestId("empty-state")).toBeTruthy();
    });
  });

  it("renders template list when templates exist", async () => {
    mockGetTemplates.mockResolvedValue([sampleTemplate]);

    const { getByTestId } = render(
      <TemplateLibraryScreen navigation={mockNavigation} />,
    );

    await waitFor(() => {
      expect(getByTestId("template-list")).toBeTruthy();
    });
  });

  it("Start button calls incrementUsageCount", async () => {
    mockGetTemplates.mockResolvedValue([sampleTemplate]);
    mockIncrementUsageCount.mockResolvedValue(undefined);

    const { getByTestId } = render(
      <TemplateLibraryScreen navigation={mockNavigation} />,
    );

    await waitFor(() => {
      expect(getByTestId(`start-button-${sampleTemplate.id}`)).toBeTruthy();
    });

    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(getByTestId(`start-button-${sampleTemplate.id}`));

    await waitFor(() => {
      expect(mockIncrementUsageCount).toHaveBeenCalledWith(
        sampleTemplate.id,
        sampleTemplate.userId,
      );
    });
  });
});
