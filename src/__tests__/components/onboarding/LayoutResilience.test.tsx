import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { ScreenScaffold } from '@/components/onboarding/fresh/ScreenScaffold';
import { OptionRow } from '@/components/onboarding/fresh/OptionRow';
import { TimeRow } from '@/components/onboarding/fresh/TimeRow';
import { GlassFormInput } from '@/components/form/GlassFormInput';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('onboarding layout resilience', () => {
  it('keeps long header and footer copy in the scrollable region', () => {
    const screen = render(
      <ScreenScaffold
        question="A deliberately long localized onboarding question"
        subtext="Supporting copy that may wrap over several lines"
        onNext={jest.fn()}
        footerNote={<Text>Long localized legal note</Text>}
      >
        <Text>Form content</Text>
      </ScreenScaffold>,
    );

    const scroll = screen.UNSAFE_getByType(ScrollView);
    const scrollQueries = within(scroll);
    expect(
      scrollQueries.getByText('A deliberately long localized onboarding question'),
    ).toBeTruthy();
    expect(scrollQueries.getByText('Long localized legal note')).toBeTruthy();
  });

  it('lets shared option and time labels wrap instead of forcing one line', () => {
    const option = render(
      <OptionRow
        label="A localized option label that needs room"
        sublabel="A longer explanation that should remain readable"
        selected={false}
        onPress={jest.fn()}
      />,
    );
    expect(
      option.getByText('A localized option label that needs room').props.numberOfLines,
    ).toBeUndefined();
    expect(
      option.getByText('A longer explanation that should remain readable').props.numberOfLines,
    ).toBeUndefined();
    option.unmount();

    const time = render(
      <TimeRow
        label="Localized wake-up time"
        value="07:30"
        onChange={jest.fn()}
        use12Hour
      />,
    );
    expect(time.getByText('Localized wake-up time').props.numberOfLines).toBeUndefined();
  });

  it('preserves form focus callbacks and uses a natural minimum input height', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const screen = render(
      <GlassFormInput
        label="Daily water goal"
        value=""
        onChangeText={jest.fn()}
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );

    const input = screen.getByLabelText('Daily water goal');
    fireEvent(input, 'focus');
    fireEvent(input, 'blur');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    const inputStyle = StyleSheet.flatten(input.props.style);
    expect(inputStyle.height).toBeUndefined();
    expect(inputStyle.minHeight).toEqual(expect.any(Number));
  });
});
