import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    Modal: ({ children }: { children: React.ReactNode }) => children,
    ScrollView: React.forwardRef((props: any, ref) =>
      React.createElement("ScrollView", { ...props, ref }, props.children),
    ),
    TextInput: React.forwardRef((props: any, ref) =>
      React.createElement("TextInput", { ...props, ref }, props.children),
    ),
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
    TouchableOpacity: React.forwardRef((props: any, ref) =>
      React.createElement("TouchableOpacity", { ...props, ref }, props.children),
    ),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
  };
});

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return {
    Button: ({
      title,
      onPress,
      style,
    }: {
      title: string;
      onPress?: () => void;
      style?: unknown;
    }) =>
      React.createElement(
        Pressable,
        { onPress, style, accessibilityLabel: title },
        title,
      ),
    Card: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("@/components/ui/aurora/GlassCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => Math.round(value * 0.75),
  rh: (value: number) => Math.round(value * 0.75),
  rp: (value: number) => value,
  rs: (value: number) => Math.round(value * 0.75),
  rbr: (value: number) => Math.round(value * 0.75),
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      text: "#111",
      textSecondary: "#666",
      textMuted: "#777",
      white: "#fff",
      primary: "#0af",
      primaryDark: "#08c",
      secondary: "#0c8",
      surface: "#222",
      background: "#000",
      backgroundSecondary: "#111",
      backgroundTertiary: "#111",
      border: "#333",
      success: "#0a0",
      warningAlt: "#fa0",
      warning: "#fa0",
      error: "#f33",
      errorAlt: "#f33",
      errorLight: "#f55",
      glassSurface: "#333",
      glassHighlight: "#444",
      overlayDark: "#111",
      accent: "#6cf",
      info: "#09f",
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20 },
    fontSize: { sm: 12, md: 14, lg: 18, xl: 20 },
    fontWeight: { medium: "500", semibold: "600", bold: "700" },
  },
}));

jest.mock("@/components/onboarding/BMRInfoModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BMRInfoModal: () => React.createElement(View, null),
  };
});

jest.mock("@/components/onboarding/AlternativeOption", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    AlternativeOption: () => React.createElement(View, null),
  };
});

import { DatePicker } from "@/components/advanced/DatePicker";
import { MultiSelect } from "@/components/advanced/MultiSelect";
import { MultiSelectWithCustom } from "@/components/advanced/MultiSelectWithCustom";
import { TimePicker } from "@/components/onboarding/TimePicker";
import { RateComparisonCard } from "@/components/onboarding/RateComparisonCard";
import { OnboardingTabBar } from "@/components/onboarding/OnboardingTabBar";

describe("advanced picker touch targets", () => {
  it("keeps picker triggers and option rows at a 44pt floor", () => {
    const date = render(
      <DatePicker value={new Date("2026-03-23T00:00:00.000Z")} onDateChange={jest.fn()} />,
    );
    fireEvent.press(date.getByLabelText("Select date"));

    const multi = render(
      <MultiSelect
        label="Equipment"
        options={[{ id: "1", label: "Dumbbells", value: "dumbbells" }]}
        selectedValues={[]}
        onSelectionChange={jest.fn()}
      />,
    );
    fireEvent.press(multi.getByLabelText("Equipment"));

    const custom = render(
      <MultiSelectWithCustom
        label="Cuisine"
        options={[{ id: "1", label: "Indian", value: "indian" }]}
        selectedValues={[]}
        onSelectionChange={jest.fn()}
      />,
    );
    fireEvent.press(custom.getByLabelText("Cuisine"));

    expect(StyleSheet.flatten(date.getByLabelText("Select date").props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(date.getByLabelText(/Mon, Mar 23|Mar 23/i).props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(multi.getByLabelText("Equipment").props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(multi.getByLabelText("Dumbbells").props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(custom.getByLabelText("Cuisine").props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(custom.getByLabelText("Indian").props.style)).toMatchObject({
      minHeight: 44,
    });
  });

  it("keeps time picker, rate card, and onboarding tabs at safe sizes", () => {
    const time = render(
      <TimePicker
        visible
        initialTime="06:00"
        onTimeSelect={jest.fn()}
        onClose={jest.fn()}
        title="Wake Time"
      />,
    );

    const rate = render(
      <RateComparisonCard
        alternativesResult={{
          alternatives: [
            {
              id: "orig",
              bmrDifference: -100,
              isUserOriginal: true,
              requiresExercise: false,
            },
            {
              id: "ex",
              requiresExercise: true,
            },
          ],
          userBMR: 1600,
          originalRequestedRate: 1.2,
          weightToLose: 8,
          targetWeight: 72,
          rateAtBMR: 0.5,
        } as any}
        selectedAlternativeId={null}
        onSelectAlternative={jest.fn()}
      />,
    );

    const tabs = render(
      <OnboardingTabBar
        activeTab={1}
        completionPercentage={20}
        onTabPress={jest.fn()}
        tabs={[
          { id: 1, title: "Personal", iconName: "person", isCompleted: false, isAccessible: true },
          { id: 2, title: "Diet", iconName: "nutrition", isCompleted: false, isAccessible: true },
        ]}
      />,
    );

    expect(StyleSheet.flatten(time.getByLabelText("6:00 AM").props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(rate.getByLabelText("Open BMR warning details").props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(rate.getByLabelText("More info about BMR warning").props.style)).toMatchObject({
      minWidth: 44,
      minHeight: 44,
    });
    expect(StyleSheet.flatten(rate.getByLabelText("Show exercise options").props.style)).toMatchObject({
      minHeight: 44,
    });
    expect(StyleSheet.flatten(tabs.getAllByLabelText(/step$/i)[0].props.style)).toMatchObject({
      width: 44,
      height: 44,
    });
  });
});
