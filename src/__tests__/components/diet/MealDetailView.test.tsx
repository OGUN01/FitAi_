import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/utils/haptics', () => ({ haptics: { trigger: jest.fn(), light: jest.fn(), celebration: jest.fn() } }));
jest.mock('@/components/ui/aurora/AnimatedPressable', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    AnimatedPressable: React.forwardRef((props: any, ref: any) =>
      React.createElement(Pressable, { ...props, ref }, props.children)
    ),
  };
});

import { MealDetailView } from '@/components/diet/MealDetailView';

const meal: any = {
  id: 'lunch-1',
  type: 'lunch',
  name: 'Rainbow grain bowl',
  items: [],
  totalCalories: 500,
  totalMacros: { protein: 25, carbohydrates: 60, fat: 18, fiber: 10 },
};

describe('MealDetailView', () => {
  it('disables "Swap This Meal" once the meal is already completed, matching "Mark as Completed"', () => {
    const onSwapMeal = jest.fn();
    const onLogMeal = jest.fn();
    const screen = render(
      <MealDetailView
        meal={meal}
        isCompleted={true}
        onBack={jest.fn()}
        onLogMeal={onLogMeal}
        onSwapMeal={onSwapMeal}
      />
    );

    const swapButton = screen.getByLabelText('Swap This Meal');
    const completeButton = screen.getByLabelText('Completed');
    expect(swapButton.props.accessibilityState?.disabled).toBe(true);
    expect(completeButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('keeps "Swap This Meal" enabled while the meal is not yet completed', () => {
    const onSwapMeal = jest.fn();
    const screen = render(
      <MealDetailView
        meal={meal}
        isCompleted={false}
        onBack={jest.fn()}
        onLogMeal={jest.fn()}
        onSwapMeal={onSwapMeal}
      />
    );

    const swapButton = screen.getByLabelText('Swap This Meal');
    expect(swapButton.props.accessibilityState?.disabled).toBe(false);
  });
});
