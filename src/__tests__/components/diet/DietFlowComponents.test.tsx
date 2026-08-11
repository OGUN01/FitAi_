import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/utils/haptics', () => ({ haptics: { trigger: jest.fn() } }));
jest.mock('@/components/ui/aurora/AnimatedPressable', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    AnimatedPressable: React.forwardRef((props: any, ref: any) =>
      React.createElement(Pressable, { ...props, ref }, props.children)
    ),
  };
});

import { CompactIntakeSummary } from '@/components/diet/CompactIntakeSummary';
import { DateStepper } from '@/components/diet/DateStepper';
import { DietActionDock } from '@/components/diet/DietActionDock';
import { TodaysPlanOverlay } from '@/components/diet/TodaysPlanOverlay';

const meal = {
  id: 'lunch-1',
  type: 'lunch',
  name: 'Rainbow grain bowl',
  items: [],
  totalCalories: 500,
  totalMacros: { protein: 25, carbohydrates: 60, fat: 18, fiber: 10 },
} as any;

const mealSchedule = {
  breakfast: '8:00 AM',
  morningSnack: '10:30 AM',
  lunch: '1:00 PM',
  afternoonSnack: '4:00 PM',
  dinner: '8:00 PM',
} as any;

describe('Diet flow components', () => {
  it('steps dates and selects a calendar date', () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const onSelectDate = jest.fn();
    const screen = render(
      <DateStepper
        selectedDate="2026-08-06"
        onPrevious={onPrevious}
        onNext={onNext}
        onSelectDate={onSelectDate}
      />
    );

    fireEvent.press(screen.getByLabelText('Previous day'));
    fireEvent.press(screen.getByLabelText('Next day'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText(/Choose date, currently/));
    const selectedDay = screen
      .getAllByRole('button')
      .find((button) => button.props.accessibilityState?.selected === true);
    expect(selectedDay).toBeTruthy();
    fireEvent.press(selectedDay!);
    expect(onSelectDate).toHaveBeenCalledWith('2026-08-06');
    expect(screen.queryByLabelText('Close calendar')).toBeNull();
  });

  it('caps intake progress at 100% but shows the true overage, not a clamped remaining', () => {
    const onLogMeal = jest.fn();
    const onViewPlan = jest.fn();
    const screen = render(
      <CompactIntakeSummary
        consumedCalories={2200}
        calorieTarget={2000}
        mealCount={3}
        plannedMealCount={4}
        onLogMeal={onLogMeal}
        onViewPlan={onViewPlan}
      />
    );

    expect(screen.getByText('3 logged · 4 planned')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    // Consumed 200 kcal over target — must surface the real overage, not a
    // clamped "0 Remaining" that hides it.
    expect(screen.getByText('200')).toBeTruthy();
    expect(screen.getByText('kcal over')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Log a meal or food'));
    fireEvent.press(screen.getByLabelText("View today's plan"));
    expect(onLogMeal).toHaveBeenCalledTimes(1);
    expect(onViewPlan).toHaveBeenCalledTimes(1);
  });

  it('routes plan back, meal, and log actions', () => {
    const onBack = jest.fn();
    const onMealPress = jest.fn();
    const onLogMeal = jest.fn();
    const screen = render(
      <TodaysPlanOverlay
        selectedDate="2026-08-06"
        meals={[meal]}
        mealSchedule={mealSchedule}
        mealProgress={{}}
        consumedCalories={500}
        calorieTarget={2000}
        mealCount={1}
        isGeneratingPlan={false}
        onBack={onBack}
        onMealPress={onMealPress}
        onLogMeal={onLogMeal}
        onGeneratePlan={jest.fn()}
      />
    );

    expect(screen.getByTestId('diet-todays-plan-overlay')).toBeTruthy();
    expect(screen.getByText('Meal Timeline')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Back to Diet'));
    fireEvent.press(screen.getByTestId('meal-timeline-card-lunch-1'));
    fireEvent.press(screen.getByLabelText('Log a meal or food'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onMealPress).toHaveBeenCalledWith(meal);
    expect(onLogMeal).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['diet-dock-scan', 'onScan'],
    ['diet-dock-barcode', 'onBarcode'],
    ['diet-dock-label', 'onLabel'],
    ['diet-dock-log', 'onLog'],
    ['diet-dock-water', 'onWater'],
  ])('routes %s from the radial menu', (testID, callbackName) => {
    const callbacks = {
      onScan: jest.fn(),
      onBarcode: jest.fn(),
      onLabel: jest.fn(),
      onLog: jest.fn(),
      onWater: jest.fn(),
    };
    const screen = render(<DietActionDock {...callbacks} />);

    fireEvent.press(screen.getByTestId('diet-dock-more'));
    fireEvent.press(screen.getByTestId(testID));
    expect(callbacks[callbackName as keyof typeof callbacks]).toHaveBeenCalledTimes(1);
  });
});
