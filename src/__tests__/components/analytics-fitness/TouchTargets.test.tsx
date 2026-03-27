import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    ActivityIndicator: "ActivityIndicator",
    Modal: ({ children }: { children: React.ReactNode }) => children,
    ScrollView: ({ children }: { children: React.ReactNode }) => children,
    FlatList: ({ children }: { children?: React.ReactNode }) => children ?? null,
    TouchableOpacity: React.forwardRef((props: any, ref) =>
      React.createElement("TouchableOpacity", { ...props, ref }, props.children),
    ),
    Pressable: React.forwardRef((props: any, ref) =>
      React.createElement("Pressable", { ...props, ref }, props.children),
    ),
    StatusBar: "StatusBar",
    Dimensions: {
      get: () => ({ width: 393, height: 852 }),
    },
    Platform: {
      OS: "ios",
    },
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
    },
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image", () => ({
  Image: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return {
    Card: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
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
      accessibilityRole,
      onPress,
    }: {
      children: React.ReactNode;
      style?: unknown;
      accessibilityLabel?: string;
      accessibilityRole?: string;
      onPress?: () => void;
    }) =>
      React.createElement(
        Pressable,
        { style, accessibilityLabel, accessibilityRole, onPress },
        children,
      ),
  };
});

jest.mock("@/components/ui/aurora/AuroraSpinner", () => ({
  AuroraSpinner: () => null,
}));

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
      textTertiary: "#777",
      white: "#fff",
      surface: "#222",
      backgroundSecondary: "#111",
      primary: "#0af",
      success: "#0a0",
      error: "#f33",
      primaryTint: "#113355",
      primaryDark: "#08c",
      accent: "#6cf",
      gold: "#fc0",
      backgroundTertiary: "#222",
      glassBorder: "#333",
      glassHighlight: "#444",
      warning: "#fa0",
      successAlt: "#0a0",
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
    fontSize: { xs: 11, sm: 12, md: 14, lg: 18, xl: 20, xxl: 24 },
    fontWeight: { medium: "500", semibold: "600", bold: "700" },
  },
}));

jest.mock("@/services/exerciseFilterService", () => ({
  exerciseFilterService: {
    getExerciseById: () => ({
      name: "Push Up",
      gifUrl: "https://example.com/pushup.gif",
      instructions: ["Step:1 Lower", "Step:2 Push"],
      targetMuscles: ["Chest"],
      secondaryMuscles: [],
      equipments: ["Bodyweight"],
      bodyParts: ["Upper Body"],
    }),
  },
}));

jest.mock("@/screens/main/analytics/components/LineChart", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LineChart: () => React.createElement(View, null),
  };
});

jest.mock("@/stores/profileStore", () => ({
  useProfileStore: () => ({ workoutPreferences: null }),
}));

jest.mock("@/utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
    medium: jest.fn(),
    trigger: jest.fn(),
  },
}));

import { ProgressTrendsHeader } from "@/screens/main/analytics/ProgressTrendsHeader";
import { RecoveryTipsModal } from "@/screens/main/fitness/RecoveryTipsModal";
import { ExerciseGifPlayer } from "@/components/fitness/ExerciseGifPlayer";
import { WeightJourneySection } from "@/components/progress/WeightJourneySection";
import { ProgressInsights } from "@/components/progress/ProgressInsights";

describe("analytics and fitness touch targets", () => {
  it("keeps trend and recovery modal controls at a 44pt floor", () => {
    const trends = render(<ProgressTrendsHeader onBack={jest.fn()} />);
    const recovery = render(<RecoveryTipsModal visible onClose={jest.fn()} />);

    expect(
      StyleSheet.flatten(trends.getByLabelText("Back").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(
        recovery.getByLabelText("Close recovery tips").props.style,
      ),
    ).toMatchObject({ width: 44, height: 44 });
  });

  it("keeps exercise player and progress utility controls at safe sizes", () => {
    const player = render(
      <ExerciseGifPlayer
        exerciseId="push-up"
        exerciseName="Push Up"
        onInstructionsPress={jest.fn()}
      />,
    );

    const journey = render(
      <WeightJourneySection
        weightHistory={[{ date: "2026-03-20", weight: 80 }]}
        progressEntries={[]}
        calculatedMetrics={null}
        onLogWeight={jest.fn()}
      />,
    );

    const insights = render(
      <ProgressInsights
        insights={[
          {
            id: "tip-1",
            type: "tip",
            title: "Keep Going",
            message: "Stay consistent",
            icon: "💡",
            actionText: "View Details",
            priority: "high",
          },
        ]}
        onInsightAction={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(
        player.getByLabelText("View Push Up instructions").props.style,
      ),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(journey.getByLabelText("Log weight").props.style),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(journey.getByLabelText("1W period").props.style),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(insights.getByLabelText("View Details").props.style),
    ).toMatchObject({ minHeight: 44 });
  });
});
