import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-linear-gradient", () => {
  const { View: MockView } = jest.requireActual("react-native");
  return {
    LinearGradient: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
      <MockView {...props}>{children}</MockView>
    ),
  };
});

jest.mock("@/utils/haptics", () => ({
  haptics: { trigger: jest.fn() },
}));

jest.mock("@/utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

import { MealDetailModal } from "@/components/diet/MealDetailModal";
import { crossPlatformAlert as mockCrossPlatformAlert } from "@/utils/crossPlatformAlert";
import type { DayMeal } from "@/types/ai";

const meal: DayMeal = {
  id: "meal-1",
  type: "breakfast",
  name: "Paneer Stuffed Moong Dal Chilla",
  description: "Protein-rich breakfast",
  items: [
    { name: "Moong Dal", quantity: 100, unit: "g" },
    { name: "Paneer", quantity: 50, unit: "g" },
    { name: "Curd", quantity: 30, unit: "g" },
    { name: "Spices", quantity: 5, unit: "g" },
  ],
  totalCalories: 640,
  totalMacros: { protein: 77, carbohydrates: 40, fat: 18, fiber: 5 },
  timing: "30 min",
  preparationTime: 20,
  cookingTime: 20,
  difficulty: "easy",
  tags: [],
  dayOfWeek: "Friday",
  isPersonalized: true,
  aiGenerated: true,
  createdAt: "2026-07-24T00:00:00.000Z",
};

const renderModal = (overrides: Partial<React.ComponentProps<typeof MealDetailModal>> = {}) =>
  render(
    <MealDetailModal
      visible
      meal={meal}
      onClose={jest.fn()}
      onMarkComplete={jest.fn()}
      onDelete={jest.fn()}
      {...overrides}
    />,
  );

describe("MealDetailModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders meal name, description, type chip, calories, and macro cards", () => {
    const view = renderModal();

    expect(view.getByText("Paneer Stuffed Moong Dal Chilla")).toBeTruthy();
    expect(view.getByText("Protein-rich breakfast")).toBeTruthy();
    expect(view.getByText("Breakfast")).toBeTruthy();
    expect(view.getByText("640")).toBeTruthy();
    expect(view.getByText("calories")).toBeTruthy();
    expect(view.getByText("Protein")).toBeTruthy();
    expect(view.getByText("Carbs")).toBeTruthy();
    expect(view.getByText("Fat")).toBeTruthy();
    expect(view.getByText("Fiber")).toBeTruthy();
    expect(view.getByText("Moong Dal")).toBeTruthy();
  });

  it("renders meta row items when timing, difficulty, and prep time are present", () => {
    const view = renderModal();

    expect(view.getByText("30 min")).toBeTruthy();
    expect(view.getByText("Easy")).toBeTruthy();
    expect(view.getByText("20 min prep")).toBeTruthy();
  });

  it("fires onMarkComplete with the meal when Mark Complete pressed", () => {
    const onMarkComplete = jest.fn();
    const view = renderModal({ onMarkComplete });

    fireEvent.press(view.getByText("Mark Complete"));
    expect(onMarkComplete).toHaveBeenCalledWith(meal);
  });

  it("shows Completed badge and hides Mark Complete when isCompleted", () => {
    const view = renderModal({ isCompleted: true });

    expect(view.queryByText("Mark Complete")).toBeNull();
    expect(view.getByText("Completed")).toBeTruthy();
    expect(view.getByLabelText(`${meal.name} completed`)).toBeTruthy();
  });

  it("opens delete confirmation via crossPlatformAlert and deletes only after destructive button pressed", () => {
    const onDelete = jest.fn();
    const view = renderModal({ onDelete });

    fireEvent.press(view.getByLabelText(`Delete ${meal.name}`));

    const mockedAlert = jest.mocked(mockCrossPlatformAlert);
    expect(mockedAlert).toHaveBeenCalledWith(
      "Delete Meal",
      `Are you sure you want to delete "${meal.name}"?`,
      expect.any(Array),
    );

    const buttons = mockedAlert.mock.calls[0]?.[2] ?? [];
    const cancelButton = buttons.find((b) => b.style === "cancel");
    expect(cancelButton).toBeDefined();

    const deleteAction = buttons.find((b) => b.style === "destructive");
    expect(deleteAction).toBeDefined();
    deleteAction?.onPress?.();

    expect(onDelete).toHaveBeenCalledWith(meal);
  });

  it("closes via the close button (accessibilityLabel Close meal details)", () => {
    const onClose = jest.fn();
    const view = renderModal({ onClose });

    fireEvent.press(view.getByLabelText("Close meal details"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders null-meal overlay and closes on backdrop press", () => {
    const onClose = jest.fn();
    const view = renderModal({ meal: null, onClose });

    expect(view.queryByText("Mark Complete")).toBeNull();
    expect(view.queryByText(meal.name)).toBeNull();

    fireEvent.press(view.getByLabelText("Close meal details"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
