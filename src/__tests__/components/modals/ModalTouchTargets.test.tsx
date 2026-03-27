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
    FlatList: ({ data, renderItem, ListFooterComponent, ListEmptyComponent }: any) => {
      if (data?.length) {
        return React.createElement(
          React.Fragment,
          null,
          data.map((item: any, index: number) =>
            renderItem({ item, index }),
          ),
          ListFooterComponent ? ListFooterComponent() : null,
        );
      }
      return ListEmptyComponent ? ListEmptyComponent() : null;
    },
    StatusBar: "StatusBar",
    Dimensions: {
      get: () => ({ width: 393, height: 852 }),
    },
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
      absoluteFill: {},
      absoluteFillObject: {},
    },
    Platform: {
      OS: "ios",
    },
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image", () => ({
  Image: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components/ui/aurora/GlassCard", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("@/components/ui/aurora/AuroraSpinner", () => ({
  AuroraSpinner: () => null,
}));

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
      background: "#000",
      backgroundTertiary: "#111",
      overlayDark: "#222",
      glassHighlight: "#333",
      glassSurface: "#444",
      success: "#0a0",
      primary: "#0af",
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xxl: 32 },
    borderRadius: { lg: 16, md: 12 },
    fontSize: { xl: 20, md: 14, sm: 12, xs: 11 },
    fontWeight: { bold: "700", medium: "500", semibold: "600" },
  },
}));

import { AchievementDetailModal } from "@/components/achievements/AchievementDetailModal";
import { ActivitiesModal } from "@/components/progress/ActivitiesModal";
import { FullscreenModal } from "@/components/fitness/gif-player/FullscreenModal";
import { ModalHeader } from "@/components/fitness/instruction/ModalHeader";

describe("modal touch targets", () => {
  it("keeps achievement and activities close controls at accessible sizes", () => {
    const achievement = render(
      <AchievementDetailModal
        visible
        achievement={{
          title: "Winner",
          description: "Test achievement",
          icon: "T",
          tier: "gold",
          requirements: [{ target: 1, type: "win" }],
          reward: { value: 10, description: "Reward" },
        } as any}
        onClose={jest.fn()}
      />,
    );

    const activities = render(
      <ActivitiesModal
        visible
        onClose={jest.fn()}
        activities={[]}
        onLoadMore={jest.fn()}
        loadingMore={false}
        hasMore={false}
      />,
    );

    expect(
      StyleSheet.flatten(
        achievement.getByLabelText("Close achievement details").props.style,
      ),
    ).toMatchObject({ minWidth: 44, minHeight: 44 });
    expect(
      StyleSheet.flatten(
        activities.getByLabelText("Close activities").props.style,
      ),
    ).toMatchObject({ width: 44, height: 44 });
  });

  it("keeps fitness modal close controls at accessible sizes", () => {
    const fullscreen = render(
      <FullscreenModal
        visible
        onClose={jest.fn()}
        gifUrl="https://example.com/test.gif"
        displayName="Push Up"
      />,
    );

    const header = render(
      <ModalHeader displayName="Push Up" onClose={jest.fn()} />,
    );

    expect(
      StyleSheet.flatten(
        fullscreen.getByLabelText("Close Push Up fullscreen view").props.style,
      ),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(header.getByLabelText("Close Push Up").props.style),
    ).toMatchObject({ width: 44, height: 44 });
  });
});
