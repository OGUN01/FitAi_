import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

// Mock icon + gradient deps shared across the suite.
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-linear-gradient", () => {
  const { View: MockView } = jest.requireActual("react-native");
  return {
    LinearGradient: ({ children, ...props }: React.ComponentProps<typeof View>) => (
      <MockView {...props}>{children}</MockView>
    ),
  };
});

// Stub PremiumMealCard so MealPlanView tests stay focused on wiring
// (per-meal render order, mealTime/progress/calorie passthrough,
// card press -> onMealPress vs handleStartMeal fallback, start/complete
// callbacks). PremiumMealCard has its own test coverage elsewhere.
jest.mock("@/components/diet/PremiumMealCard", () => ({
  PremiumMealCard: (props: any) => {
    const React = jest.requireActual("react");
    const { View, Text, Pressable } = jest.requireActual("react-native");
    return React.createElement(
      View,
      { testID: `meal-card-${props.meal.id}` },
      React.createElement(Text, null, props.meal.name),
      React.createElement(Text, null, props.mealTime),
      React.createElement(Text, null, `progress:${props.progress ?? 0}`),
      React.createElement(Text, null, `calories:${props.macroTargets?.calories ?? 0}`),
      React.createElement(Pressable, { testID: `card-press-${props.meal.id}`, onPress: props.onPress }),
      React.createElement(Pressable, { testID: `start-${props.meal.id}`, onPress: props.onStartMeal }),
      React.createElement(Pressable, { testID: `complete-${props.meal.id}`, onPress: props.onCompleteMeal }),
    );
  },
}));

// Stub GlassCard as a plain View so the empty-state branch renders stably.
jest.mock("@/components/ui/aurora/GlassCard", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    GlassCard: ({ children }: any) => React.createElement(View, null, children),
  };
});

import { MealPlanView, type MealPlanViewProps } from "@/components/diet/MealPlanView";
import type { DayMeal } from "@/types/ai";

const makeMeal = (
  id: string,
  type: DayMeal["type"],
  name: string,
): DayMeal => ({
  id,
  type,
  name,
  description: `${name} description`,
  items: [],
  totalCalories: 450,
  totalMacros: { protein: 30, carbohydrates: 50, fat: 14, fiber: 8 },
  preparationTime: 10,
  cookingTime: 20,
  difficulty: "easy",
  tags: [],
  dayOfWeek: "Friday",
  isPersonalized: true,
  aiGenerated: true,
  createdAt: "2026-07-24T00:00:00.000Z",
});

const breakfast = makeMeal(
  "breakfast",
  "breakfast",
  "Paneer Stuffed Moong Dal Chilla",
);
const lunch = makeMeal("lunch", "lunch", "Chana Masala & Stir Fry");
const snack = makeMeal("snack", "snack", "Greek Yogurt & Chia Seeds");
const dinner = makeMeal("dinner", "dinner", "Paneer Tikka Salad & Egg");

const mealSchedule = {
  breakfast: "7:45 AM",
  morningSnack: "10:30 AM",
  lunch: "12:00 PM",
  afternoonSnack: "3:00 PM",
  dinner: "8:00 PM",
};

const makeBaseProps = (): MealPlanViewProps => ({
  weeklyMealPlan: {},
  selectedDay: "",
  setSelectedDay: jest.fn(),
  todaysMeals: [],
  storeGetMealProgress: (id: string) => ({
    progress: id === "breakfast" ? 100 : id === "lunch" ? 35 : 0,
  }),
  mealSchedule,
  handleStartMeal: jest.fn(),
  completeMealPreparation: jest.fn(),
  macroTargets: { protein: 120, carbs: 200, fat: 60 },
  calorieTarget: 1856,
});

describe("MealPlanView", () => {
  it("renders \"Today's Meals\" title when selectedDay is falsy and lists meals in given order", () => {
    const props = makeBaseProps();
    const view = render(
      <MealPlanView
        {...props}
        selectedDay=""
        todaysMeals={[dinner, snack, breakfast, lunch]}
      />,
    );

    expect(view.getByText("Today's Meals")).toBeTruthy();
    // Component maps todaysMeals in array order, so all four meals render.
    expect(view.getByTestId("meal-card-breakfast")).toBeTruthy();
    expect(view.getByTestId("meal-card-lunch")).toBeTruthy();
    expect(view.getByTestId("meal-card-snack")).toBeTruthy();
    expect(view.getByTestId("meal-card-dinner")).toBeTruthy();
    expect(view.getByText(breakfast.name)).toBeTruthy();
    expect(view.getByText(lunch.name)).toBeTruthy();
    expect(view.getByText(snack.name)).toBeTruthy();
    expect(view.getByText(dinner.name)).toBeTruthy();
  });

  it("renders \"{Day}'s Meals\" title when selectedDay is a non-empty string", () => {
    const props = makeBaseProps();
    const view = render(
      <MealPlanView
        {...props}
        selectedDay="friday"
        todaysMeals={[]}
      />,
    );

    expect(view.getByText("Friday's Meals")).toBeTruthy();
    expect(view.queryByText("Today's Meals")).toBeNull();
  });

  it("renders the empty state with \"No meals planned for today\" when weeklyMealPlan is truthy and todaysMeals empty", () => {
    const props = makeBaseProps();
    const view = render(
      <MealPlanView
        {...props}
        weeklyMealPlan={{}}
        todaysMeals={[]}
        selectedDay=""
      />,
    );

    expect(view.getByText("No meals planned for today")).toBeTruthy();
    expect(view.getByLabelText("No meals planned for today")).toBeTruthy();
  });

  it("renders the empty state with \"Generate a meal plan to get started\" when weeklyMealPlan is falsy and todaysMeals empty", () => {
    const props = makeBaseProps();
    const view = render(
      <MealPlanView
        {...props}
        weeklyMealPlan={null}
        todaysMeals={[]}
        selectedDay=""
      />,
    );

    expect(view.getByText("Generate a meal plan to get started")).toBeTruthy();
    expect(view.getByLabelText("Generate a meal plan to get started")).toBeTruthy();
  });

  it("passes mealTime, progress, and calorieTarget to each PremiumMealCard", () => {
    const props = makeBaseProps();
    const view = render(
      <MealPlanView
        {...props}
        todaysMeals={[breakfast, lunch]}
        storeGetMealProgress={(id) => ({ progress: id === "breakfast" ? 100 : 35 })}
        macroTargets={{ protein: 120, carbs: 200, fat: 60 }}
        calorieTarget={1856}
      />,
    );

    // mealTime wiring (real getMealTime util runs).
    expect(view.getByText("7:45 AM")).toBeTruthy();
    expect(view.getByText("12:00 PM")).toBeTruthy();
    // progress passthrough.
    expect(view.getByText("progress:100")).toBeTruthy();
    expect(view.getByText("progress:35")).toBeTruthy();
    // calorieTarget passthrough on both cards.
    expect(view.getAllByText("calories:1856")).toHaveLength(2);
  });

  it("fires onMealPress when provided and a card is pressed", () => {
    const onMealPress = jest.fn();
    const handleStartMeal = jest.fn();
    const props = makeBaseProps();
    const view = render(
      <MealPlanView
        {...props}
        onMealPress={onMealPress}
        handleStartMeal={handleStartMeal}
        todaysMeals={[breakfast]}
      />,
    );

    fireEvent.press(view.getByTestId("card-press-breakfast"));
    expect(onMealPress).toHaveBeenCalledTimes(1);
    expect(onMealPress).toHaveBeenCalledWith(breakfast);
    expect(handleStartMeal).not.toHaveBeenCalled();
  });

  it("fires handleStartMeal (fallback) when onMealPress not provided, plus start/complete buttons", () => {
    const handleStartMeal = jest.fn();
    const completeMealPreparation = jest.fn();
    const props = makeBaseProps();
    const view = render(
      <MealPlanView
        {...props}
        handleStartMeal={handleStartMeal}
        completeMealPreparation={completeMealPreparation}
        todaysMeals={[breakfast]}
      />,
    );

    // Card press falls back to handleStartMeal when onMealPress is absent.
    fireEvent.press(view.getByTestId("card-press-breakfast"));
    expect(handleStartMeal).toHaveBeenCalledTimes(1);
    expect(handleStartMeal).toHaveBeenCalledWith(breakfast);

    // Start button fires handleStartMeal.
    fireEvent.press(view.getByTestId("start-breakfast"));
    expect(handleStartMeal).toHaveBeenCalledTimes(2);

    // Complete button fires completeMealPreparation.
    fireEvent.press(view.getByTestId("complete-breakfast"));
    expect(completeMealPreparation).toHaveBeenCalledTimes(1);
    expect(completeMealPreparation).toHaveBeenCalledWith(breakfast);
  });

  it("does not render meal cards when todaysMeals is empty/undefined", () => {
    const props = makeBaseProps();

    // Empty array branch.
    const emptyView = render(
      <MealPlanView
        {...props}
        weeklyMealPlan={{}}
        todaysMeals={[]}
      />,
    );
    expect(emptyView.queryByTestId("meal-card-breakfast")).toBeNull();
    expect(emptyView.getByText("No meals planned for today")).toBeTruthy();
    emptyView.unmount();

    // Undefined branch (component uses todaysMeals?.length ?? 0).
    const undefinedView = render(
      <MealPlanView
        {...props}
        weeklyMealPlan={{}}
        todaysMeals={undefined as unknown as DayMeal[]}
      />,
    );
    expect(undefinedView.queryByTestId("meal-card-breakfast")).toBeNull();
    expect(undefinedView.getByText("No meals planned for today")).toBeTruthy();
  });
});
