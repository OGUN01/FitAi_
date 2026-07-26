import React from "react";
import { Alert, StyleSheet } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

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

import { MealDetailModal } from "@/components/diet/MealDetailModal";
import { flatColors as colors } from "@/theme/aurora-tokens";
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
      onSwap={jest.fn()}
      {...overrides}
    />,
  );

describe("MealDetailModal", () => {
  it("renders the full-screen header, nutrition strip, and meta tiles", () => {
    const view = renderModal();

    expect(view.getByText("Meal Details")).toBeTruthy();
    expect(view.getAllByTestId("nutrition-stat")).toHaveLength(5);
    expect(view.getAllByTestId("meal-meta-tile")).toHaveLength(3);
    expect(view.getByText("Ingredients")).toBeTruthy();
  });

  it("fires completion and swap callbacks with the meal", () => {
    const onMarkComplete = jest.fn();
    const onSwap = jest.fn();
    const view = renderModal({ onMarkComplete, onSwap });

    fireEvent.press(view.getByText("Mark as Completed"));
    expect(onMarkComplete).toHaveBeenCalledWith(meal);

    fireEvent.press(view.getByText("Swap This Meal"));
    expect(onSwap).toHaveBeenCalledWith(meal);
  });

  it("opens Ingredients by default and toggles an accordion section", () => {
    const view = renderModal();

    // Ingredients body is open by default — at least one ingredient name renders.
    expect(view.getByText("Moong Dal")).toBeTruthy();

    // Toggle Recipe closed→open: its summary is visible while collapsed.
    const recipeHeader = view.getByText("Recipe");
    expect(view.queryByText("No recipe available")).toBeNull();
    fireEvent.press(recipeHeader);
    expect(view.getByText("No recipe available")).toBeTruthy();
  });

  it("shows a completed state while keeping the swap action", () => {
    const onSwap = jest.fn();
    const view = renderModal({ isCompleted: true, onSwap });

    expect(view.queryByText("Mark as Completed")).toBeNull();
    expect(view.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(view.getByText("Swap This Meal")).toBeTruthy();

    fireEvent.press(view.getByText("Swap This Meal"));
    expect(onSwap).toHaveBeenCalledWith(meal);
  });

  it("falls back to the gradient placeholder when the meal image errors", () => {
    const withImage: DayMeal = { ...meal, imageUrl: "https://example.com/breakfast.jpg" };
    const view = renderModal({ meal: withImage });

    const image = view.getByLabelText(`${withImage.name} photo`);
    fireEvent(image, "error");

    // After error, the initials placeholder takes over — the photo is gone.
    expect(view.queryByLabelText(`${withImage.name} photo`)).toBeNull();
    expect(view.getByTestId("meal-image-fallback")).toBeTruthy();
  });

  it("exposes the overflow menu and deletes only after confirmation", () => {
    const onDelete = jest.fn();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    const view = renderModal({ onDelete });

    fireEvent.press(view.getByLabelText("Open meal actions"));
    fireEvent.press(view.getByLabelText("Delete meal"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Meal",
      `Are you sure you want to delete "${meal.name}"?`,
      expect.any(Array),
      undefined,
    );
    const buttons = alertSpy.mock.calls[0]?.[2] ?? [];
    const deleteAction = buttons.find((button) => button.style === "destructive");
    expect(deleteAction).toBeDefined();
    deleteAction?.onPress?.();

    expect(onDelete).toHaveBeenCalledWith(meal);
    alertSpy.mockRestore();
  });

  it("closes back to the plan via the back button", () => {
    const onClose = jest.fn();
    const view = renderModal({ onClose });

    const back = view.getByLabelText("Back to meal plan");
    expect(StyleSheet.flatten(back.props.style)).toMatchObject({ width: 44, height: 44 });
    fireEvent.press(back);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
