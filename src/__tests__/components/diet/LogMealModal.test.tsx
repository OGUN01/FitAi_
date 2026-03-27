import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockSetWeeklyMealPlan = jest.fn();
const mockSaveWeeklyMealPlan = jest.fn(() => Promise.resolve());
const mockCompleteMeal = jest.fn(() => Promise.resolve());

jest.mock("react-native", () => {
  const React = require("react");
  const createComponent = (name: string) =>
    React.forwardRef((props: any, ref) =>
      React.createElement(name, { ...props, ref }, props.children),
    );

  return {
    View: "View",
    Text: "Text",
    Modal: createComponent("Modal"),
    ScrollView: createComponent("ScrollView"),
    KeyboardAvoidingView: createComponent("KeyboardAvoidingView"),
    TextInput: createComponent("TextInput"),
    TouchableOpacity: createComponent("TouchableOpacity"),
    Pressable: createComponent("Pressable"),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Platform: {
      OS: "ios",
      select: (options: Record<string, unknown>) =>
        options.ios ?? options.default,
    },
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components/ui/aurora/GlassCard", () => {
  const React = require("react");

  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
      React.createElement("View", null, children),
  };
});

jest.mock("@/components/ui/aurora/AnimatedPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");

  return {
    AnimatedPressable: React.forwardRef((props: any, ref) =>
      React.createElement(Pressable, { ...props, ref }, props.children),
    ),
  };
});

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => value,
  rh: (value: number) => value,
  rp: (value: number) => value,
  rbr: (value: number) => value,
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      text: "#111",
      textSecondary: "#666",
      backgroundSecondary: "#fff",
      surface: "#f5f5f5",
      border: "#ddd",
      white: "#fff",
      primary: "#0af",
      error: "#e11d48",
      errorLight: "#f97316",
      teal: "#14b8a6",
      amber: "#f59e0b",
      overlayDark: "rgba(0,0,0,0.5)",
    },
  },
}));

jest.mock("@/stores/nutritionStore", () => ({
  useNutritionStore: jest.fn(() => ({
    weeklyMealPlan: null,
    setWeeklyMealPlan: mockSetWeeklyMealPlan,
    saveWeeklyMealPlan: mockSaveWeeklyMealPlan,
  })),
}));

jest.mock("@/utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

jest.mock("@/services/completionTracking", () => ({
  completionTrackingService: {
    completeMeal: (...args: unknown[]) => mockCompleteMeal(...args),
  },
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

import {
  LogMealModal,
  LogMealScanResult,
} from "@/components/diet/LogMealModal";

describe("LogMealModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads direct-entry fiber from a scan and saves it into item-level and meal-level totals", async () => {
    const pendingScanResult: LogMealScanResult = {
      type: "label",
      mealName: "Protein Bar",
      suggestedMealType: "snack",
      directEntry: {
        calories: "220",
        protein: "20.0",
        carbs: "18.0",
        fat: "8.0",
        fiber: "7.5",
      },
      provenance: {
        mode: "label",
        truthLevel: "authoritative",
        requiresReview: false,
        source: "vision-label",
      },
    };

    const onClose = jest.fn();
    const onScanResultConsumed = jest.fn();

    const screen = render(
      <LogMealModal
        visible={true}
        onClose={onClose}
        pendingScanResult={pendingScanResult}
        onScanResultConsumed={onScanResultConsumed}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("7.5")).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText("Log Meal").at(-1)!);

    await waitFor(() => {
      expect(mockSaveWeeklyMealPlan).toHaveBeenCalledTimes(1);
      expect(mockCompleteMeal).toHaveBeenCalledTimes(1);
    });

    const savedPlan = mockSaveWeeklyMealPlan.mock.calls[0][0];
    const savedMeal = savedPlan.meals[0];

    expect(savedMeal.items).toHaveLength(1);
    expect(savedMeal.items[0]).toMatchObject({
      name: "Protein Bar",
      calories: 220,
      macros: expect.objectContaining({
        protein: 20,
        carbohydrates: 18,
        fat: 8,
        fiber: 7.5,
      }),
    });
    expect(savedMeal.totalMacros).toEqual(
      expect.objectContaining({
        protein: 20,
        carbohydrates: 18,
        fat: 8,
        fiber: 7.5,
      }),
    );
    expect(onScanResultConsumed).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
