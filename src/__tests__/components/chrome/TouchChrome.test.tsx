import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    Modal: ({ children }: { children: React.ReactNode }) => children,
    ScrollView: ({ children }: { children: React.ReactNode }) => children,
    KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) =>
      children,
    ActivityIndicator: "ActivityIndicator",
    StatusBar: "StatusBar",
    TouchableOpacity: React.forwardRef((props: any, ref) =>
      React.createElement("TouchableOpacity", { ...props, ref }, props.children),
    ),
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
    Platform: {
      OS: "ios",
    },
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
    medium: jest.fn(),
    trigger: jest.fn(),
  },
}));

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rw: (value: number) => Math.round(value * 0.75),
  rh: (value: number) => Math.round(value * 0.75),
  rp: (value: number) => value,
  rbr: (value: number) => Math.round(value * 0.75),
  rs: (value: number) => Math.round(value * 0.75),
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
    colors: {
      text: "#111",
      textSecondary: "#666",
      textMuted: "#777",
      white: "#fff",
      primary: "#0af",
      primaryLight: "#4bf",
      background: "#000",
      backgroundSecondary: "#111",
      glassBorder: "#222",
      glassSurface: "#333",
      surface: "#444",
      border: "#555",
      errorLight: "#f55",
    },
    borderRadius: { full: 999, lg: 16 },
    fontSize: { sm: 12, md: 14 },
  },
}));

jest.mock("@/components/ui/GlassCard", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
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

jest.mock("@/components/ui/aurora/AnimatedPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");

  return {
    AnimatedPressable: ({
      children,
      style,
      accessibilityLabel,
      onPress,
    }: {
      children: React.ReactNode;
      style?: unknown;
      accessibilityLabel?: string;
      onPress?: () => void;
    }) =>
      React.createElement(
        Pressable,
        { style, accessibilityLabel, onPress },
        children,
      ),
  };
});

import { EmptyMealsMessage } from "@/components/home/EmptyMealsMessage";
import { EmptyCalendarMessage } from "@/components/home/EmptyCalendarMessage";
import { SettingsModalWrapper } from "@/components/settings/SettingsModalWrapper";
import { SyncStatusCard } from "@/components/settings/SyncStatusCard";
import { SettingsModalWrapper as ProfileSettingsModalWrapper } from "@/screens/main/profile/components/SettingsModalWrapper";
import { SettingsSelectionModal } from "@/screens/main/profile/modals/SettingsSelectionModal";

describe("chrome touch targets", () => {
  it("keeps home CTA buttons at a 44pt minimum", () => {
    const meals = render(
      <EmptyMealsMessage mealsLogged={0} onLogMeal={jest.fn()} />,
    );
    const workouts = render(
      <EmptyCalendarMessage
        weekCalendarData={[{ hasWorkout: false }]}
        onPlanWorkout={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(meals.getByLabelText("Log your first meal").props.style),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(
        workouts.getByLabelText("Plan your first workout").props.style,
      ),
    ).toMatchObject({ minHeight: 44 });
  });

  it("keeps settings modal chrome at real minimum sizes under scaled responsive values", () => {
    const screen = render(
      <SettingsModalWrapper visible title="Profile Settings" onClose={jest.fn()}>
        <></>
      </SettingsModalWrapper>,
    );

    expect(
      StyleSheet.flatten(
        screen.getByLabelText("Close Profile Settings").props.style,
      ),
    ).toMatchObject({ width: 44, height: 44 });
  });

  it("keeps profile modal chrome at real minimum sizes under scaled responsive values", () => {
    const wrapper = render(
      <ProfileSettingsModalWrapper
        visible
        title="Profile Settings"
        onClose={jest.fn()}
      >
        <></>
      </ProfileSettingsModalWrapper>,
    );

    const selection = render(
      <SettingsSelectionModal
        visible
        title="Units"
        icon={"options-outline" as any}
        iconColor="#0af"
        options={[
          { value: "metric", label: "Metric", icon: "options-outline" as any },
        ]}
        selectedValue="metric"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(
        wrapper.getByLabelText("Close Profile Settings").props.style,
      ),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(selection.getByLabelText("Close Units").props.style),
    ).toMatchObject({ width: 44, height: 44 });
  });

  it("keeps sync CTA at a 44pt minimum", () => {
    const screen = render(
      <SyncStatusCard
        syncStatus="idle"
        onSyncNow={jest.fn()}
        formatLastSync={() => "Never"}
      />,
    );

    expect(
      StyleSheet.flatten(screen.getByLabelText("Sync now").props.style),
    ).toMatchObject({ minHeight: 44 });
  });
});
