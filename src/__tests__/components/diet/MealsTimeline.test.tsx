import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/utils/haptics", () => ({
  haptics: { trigger: jest.fn() },
}));

jest.mock("@/components/ui/aurora/AnimatedPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    AnimatedPressable: React.forwardRef((props: any, ref: any) =>
      React.createElement(Pressable, { ...props, ref }, props.children),
    ),
  };
});

jest.mock("@/utils/responsive", () => ({
  rf: (v: number) => v,
  rw: (v: number) => v,
  rp: (v: number) => v,
  rh: (v: number) => v,
  rbr: (v: number) => v,
}));

import { MealsTimeline } from "@/components/diet/MealsTimeline";
import type { DayMeal } from "@/types/ai";
import type { MealSchedule } from "@/utils/mealSchedule";

const schedule: MealSchedule = {
  breakfast: "7:45 AM",
  morningSnack: "10:30 AM",
  lunch: "12:00 PM",
  afternoonSnack: "3:00 PM",
  dinner: "8:00 PM",
};

const meal = {
  id: "breakfast-1",
  type: "breakfast",
  name: "Paneer Chilla",
  description: "",
  items: [],
  totalCalories: 450,
  totalMacros: { protein: 30, carbohydrates: 50, fat: 14, fiber: 8 },
  preparationTime: 10,
  difficulty: "easy",
  tags: [],
  dayOfWeek: "Friday",
  isPersonalized: true,
  aiGenerated: true,
  createdAt: "2026-07-24T00:00:00.000Z",
} as DayMeal;

describe("MealsTimeline", () => {
  it("renders a row per meal with the timeline testID and fires onMealPress on tap", () => {
    const onMealPress = jest.fn();
    const view = render(
      <MealsTimeline
        meals={[meal]}
        mealSchedule={schedule}
        mealProgress={{}}
        onMealPress={onMealPress}
        onGeneratePlan={jest.fn()}
        title="Today's Meals"
      />,
    );

    expect(view.getByText("Today's Meals")).toBeTruthy();
    const row = view.getByTestId(`meal-timeline-card-${meal.id}`);
    expect(row).toBeTruthy();

    fireEvent.press(row);
    expect(onMealPress).toHaveBeenCalledTimes(1);
    expect(onMealPress).toHaveBeenCalledWith(meal);
  });

  it("renders the empty state with a Generate Plan CTA that fires onGeneratePlan when there are no meals", () => {
    const onGeneratePlan = jest.fn();
    const view = render(
      <MealsTimeline
        meals={[]}
        mealSchedule={schedule}
        mealProgress={{}}
        onMealPress={jest.fn()}
        onGeneratePlan={onGeneratePlan}
        title="Today's Meals"
      />,
    );

    expect(view.getByText("No meals planned")).toBeTruthy();
    expect(view.queryByTestId("meal-timeline-card-breakfast-1")).toBeNull();

    fireEvent.press(view.getByLabelText("Generate Plan"));
    expect(onGeneratePlan).toHaveBeenCalledTimes(1);
  });
});
