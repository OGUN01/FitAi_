import React from "react";
import { StyleSheet, View } from "react-native";
import {
  fireEvent,
  render,
  within,
} from "@testing-library/react-native";

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

import {
  MealPlanView,
  type MealPlanViewProps,
} from "@/components/diet/MealPlanView";
import { DailyMealList } from "@/components/diet/DailyMealList";
import { flatColors as colors } from "@/theme/aurora-tokens";
import type { DayMeal } from "@/types/ai";

const testStyles = StyleSheet.create({
  viewport360: { width: 360, flex: 1 },
});

const expectMinimumTouchTarget = (styleValue: unknown) => {
  const style = StyleSheet.flatten(styleValue) as {
    width?: number;
    minWidth?: number;
    height?: number;
    minHeight?: number;
  };
  const width = Math.max(style.width ?? 0, style.minWidth ?? 0);
  const height = Math.max(style.height ?? 0, style.minHeight ?? 0);
  expect(width).toBeGreaterThanOrEqual(44);
  expect(height).toBeGreaterThanOrEqual(44);
};

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

// Use today's date so the header renders "Today's Plan" (the title switches to
// "{Weekday}'s Plan" for non-today dates — a hardcoded past date would fail).
const TODAY = new Date();
TODAY.setHours(12, 0, 0, 0);

const makeBaseProps = (): MealPlanViewProps => ({
  selectedDate: TODAY,
  meals: [],
  getMealProgress: (id) => ({
    progress: id === "breakfast" ? 100 : id === "lunch" ? 35 : 0,
  }),
  mealSchedule: {
    breakfast: "7:45 AM",
    morningSnack: "10:30 AM",
    lunch: "12:00 PM",
    afternoonSnack: "3:00 PM",
    dinner: "8:00 PM",
  },
  consumedCalories: 1125,
  calorieTarget: 1856,
  loggedMealCount: 2,
  onBack: jest.fn(),
  onFilterPress: jest.fn(),
  onMealPress: jest.fn(),
  onLogMeal: jest.fn(),
  onGeneratePlan: jest.fn(),
  isGeneratingPlan: false,
});

describe("MealPlanView", () => {
  it("renders a stable chronological plan with schedule, statuses, intake, and footer", () => {
    const props = makeBaseProps();
    const view = render(
      <MealPlanView
        {...props}
        meals={[dinner, snack, breakfast, lunch]}
        footer={<View testID="plan-footer" />}
      />,
    );

    expect(view.getByText("Today's Plan")).toBeTruthy();
    // Subtitle is the full formatted selected date (today).
    const expectedSubtitle = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(TODAY);
    expect(view.getByText(expectedSubtitle)).toBeTruthy();
    const cards = view.getAllByTestId("meal-plan-card");
    expect(cards).toHaveLength(4);
    expect(view.queryAllByTestId("timeline-connector")).toHaveLength(3);
    expect(within(cards[0]).getByText(breakfast.name)).toBeTruthy();
    expect(within(cards[1]).getByText(lunch.name)).toBeTruthy();
    expect(within(cards[2]).getByText(snack.name)).toBeTruthy();
    expect(within(cards[3]).getByText(dinner.name)).toBeTruthy();
    expect(view.getByText("7:45 AM")).toBeTruthy();
    expect(view.getByText("12:00 PM")).toBeTruthy();
    expect(view.getByText("3:00 PM")).toBeTruthy();
    expect(view.getByText("8:00 PM")).toBeTruthy();
    expect(view.getByText("Completed")).toBeTruthy();
    expect(view.getByText("In Progress")).toBeTruthy();
    expect(view.getAllByText("Upcoming")).toHaveLength(2);
    expect(view.getByText("Today's Intake")).toBeTruthy();
    expect(view.getByText("1,125 / 1,856 kcal")).toBeTruthy();
    expect(view.getByText("731 kcal remaining")).toBeTruthy();
    expect(view.getByText("2 meals logged")).toBeTruthy();
    expect(view.getByText("61%")).toBeTruthy();

    expect(view.getByTestId("intake-card")).toBeTruthy();
    expect(view.getByTestId("plan-footer-slot")).toBeTruthy();
  });

  it("connects every plan action and exposes 44px-by-44px touch targets", () => {
    const props = makeBaseProps();
    const view = render(
      <MealPlanView {...props} meals={[breakfast, lunch, snack, dinner]} />,
    );

    const back = view.getByLabelText("Back to diet dashboard");
    const filter = view.getByLabelText("Filter meal plan");
    const meal = view.getByLabelText(`Open ${breakfast.name}`);
    const logMeal = view.getByLabelText("Log meal");

    [back, filter, meal, logMeal].forEach((target) => {
      expectMinimumTouchTarget(target.props.style);
    });

    fireEvent.press(back);
    fireEvent.press(filter);
    fireEvent.press(meal);
    fireEvent.press(logMeal);

    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onFilterPress).toHaveBeenCalledTimes(1);
    expect(props.onMealPress).toHaveBeenCalledWith(breakfast);
    expect(props.onLogMeal).toHaveBeenCalledTimes(1);
  });

  it("uses equal-size image fallbacks and transitions to one after image error", () => {
    const withImage: DayMeal = {
      ...breakfast,
      imageUrl: "https://example.com/breakfast.jpg",
    };
    const view = render(
      <MealPlanView {...makeBaseProps()} meals={[withImage, lunch]} />,
    );

    const image = view.getByLabelText(`${withImage.name} meal`);
    const imageStyle = StyleSheet.flatten(image.props.style);
    const lunchFallback = view.getByTestId(`meal-image-fallback-${lunch.id}`);
    expect(StyleSheet.flatten(lunchFallback.props.style)).toMatchObject({
      width: imageStyle.width,
      height: imageStyle.height,
    });

    fireEvent(image, "error");

    expect(view.queryByLabelText(`${withImage.name} meal`)).toBeNull();
    expect(
      StyleSheet.flatten(
        view.getByTestId(`meal-image-fallback-${withImage.id}`).props.style,
      ),
    ).toMatchObject({ width: imageStyle.width, height: imageStyle.height });
  });

  it("retries a meal image when its URI changes after an error", () => {
    const props = makeBaseProps();
    const failedImageMeal: DayMeal = {
      ...breakfast,
      imageUrl: "https://example.com/failed.jpg",
    };
    const view = render(<MealPlanView {...props} meals={[failedImageMeal]} />);

    fireEvent(view.getByLabelText(`${failedImageMeal.name} meal`), "error");
    expect(
      view.getByTestId(`meal-image-fallback-${failedImageMeal.id}`),
    ).toBeTruthy();

    const refreshedImageMeal: DayMeal = {
      ...failedImageMeal,
      imageUrl: "https://example.com/refreshed.jpg",
    };
    view.rerender(<MealPlanView {...props} meals={[refreshedImageMeal]} />);

    expect(view.getByLabelText(`${refreshedImageMeal.name} meal`).props.source).toEqual({
      uri: refreshedImageMeal.imageUrl,
    });
  });

  it("keeps opaque surfaces and long text constrained for a 360px viewport", () => {
    const longMeal = makeMeal(
      "long-name",
      "dinner",
      "Paneer Tikka Salad With Roasted Vegetables, Eggs, Seeds, and Herb Dressing",
    );
    const view = render(
      <View testID="viewport-360" style={testStyles.viewport360}>
        <MealPlanView {...makeBaseProps()} meals={[longMeal]} />
      </View>,
    );

    expect(StyleSheet.flatten(view.getByTestId("viewport-360").props.style)).toMatchObject({
      width: 360,
    });
    expect(
      StyleSheet.flatten(view.getByTestId("meal-plan-screen").props.style),
    ).toEqual(expect.objectContaining({ backgroundColor: colors.background }));
    expect(
      StyleSheet.flatten(view.getByTestId("meal-plan-card").props.style),
    ).toEqual(
      expect.objectContaining({ backgroundColor: colors.backgroundSecondary }),
    );
    expect(
      StyleSheet.flatten(view.getByTestId("intake-card").props.style),
    ).toEqual(
      expect.objectContaining({ backgroundColor: colors.backgroundSecondary }),
    );
    const longName = view.getByText(longMeal.name);
    expect(longName.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(longName.props.style)).toEqual(
      expect.objectContaining({ flexShrink: 1 }),
    );
    expect(view.getByText("Today's Plan").props.numberOfLines).toBe(1);
  });

  it("offers plan generation for an empty day and reports generation progress", () => {
    const props = makeBaseProps();
    const view = render(<MealPlanView {...props} />);

    expect(view.getByText("No meals planned")).toBeTruthy();
    const generate = view.getByLabelText("Generate meal plan");
    expect(StyleSheet.flatten(generate.props.style)).toEqual(
      expect.objectContaining({ minHeight: 44 }),
    );
    expectMinimumTouchTarget(generate.props.style);
    fireEvent.press(generate);
    expect(props.onGeneratePlan).toHaveBeenCalledTimes(1);

    view.rerender(<MealPlanView {...props} isGeneratingPlan />);
    expect(view.getByText("Generating Plan…")).toBeTruthy();
    expect(view.getByLabelText("Generate meal plan").props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
  });

  it("clamps overflow intake progress to its accessibility maximum", () => {
    const view = render(
      <MealPlanView
        {...makeBaseProps()}
        consumedCalories={2100}
        calorieTarget={1856}
      />,
    );

    expect(view.getByRole("progressbar").props.accessibilityValue).toEqual({
      min: 0,
      max: 1856,
      now: 1856,
    });
  });

  it("uses a valid zero-target accessibility range", () => {
    const view = render(
      <MealPlanView
        {...makeBaseProps()}
        consumedCalories={450}
        calorieTarget={0}
      />,
    );

    expect(view.getByRole("progressbar").props.accessibilityValue).toEqual({
      min: 0,
      max: 1,
      now: 0,
    });
  });
});

describe("DailyMealList", () => {
  it("renders compact real-meal rows with logged and planned states", () => {
    const logged = render(
      <DailyMealList
        title="Logged meals"
        meals={[breakfast]}
        status="logged"
      />,
    );
    expect(logged.getByText("Logged meals")).toBeTruthy();
    expect(logged.getByText(breakfast.name).props.numberOfLines).toBe(1);
    expect(logged.getByText("450 kcal · 30P · 50C · 14F")).toBeTruthy();
    expect(logged.getByText("Logged")).toBeTruthy();
    logged.unmount();

    const planned = render(
      <DailyMealList
        title="Planned meals"
        meals={[dinner]}
        status="planned"
      />,
    );
    expect(planned.getByText("Planned")).toBeTruthy();
  });
});
