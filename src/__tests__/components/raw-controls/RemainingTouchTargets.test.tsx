import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");

  return {
    View: "View",
    Text: "Text",
    Image: "Image",
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    Modal: ({ children }: { children: React.ReactNode }) => children,
    ScrollView: ({ children }: { children: React.ReactNode }) => children,
    Dimensions: {
      get: () => ({ width: 393, height: 852 }),
    },
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
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: "Images",
  },
}));

jest.mock("expo-image", () => ({
  Image: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");

  return {
    Card: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    Button: ({
      children,
      title,
      onPress,
      style,
    }: {
      children?: React.ReactNode;
      title?: string;
      onPress?: () => void;
      style?: unknown;
    }) =>
      React.createElement(
        Pressable,
        { onPress, style, accessibilityLabel: title },
        children ?? title,
      ),
    Modal: ({ children }: { children: React.ReactNode }) => children,
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
      white: "#fff",
      border: "#333",
      surface: "#222",
      backgroundSecondary: "#111",
      backgroundTertiary: "#111",
      primary: "#0af",
      error: "#f33",
      success: "#0a0",
      info: "#09f",
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
    borderRadius: { sm: 8, md: 12, lg: 16, full: 999 },
    fontSize: { sm: 12, md: 14, lg: 18, xl: 20, xxl: 24 },
    fontWeight: { medium: "500", semibold: "600", bold: "700" },
  },
}));

jest.mock("@/components/ui/aurora/GlassCard", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GlassCard: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("@/services/exerciseFilterService", () => ({
  exerciseFilterService: {
    getExerciseById: () => ({
      name: "Push Up",
      gifUrl: "https://example.com/pushup.gif",
      instructions: ["Step:1 Lower down", "Step:2 Push up"],
      targetMuscles: ["Chest"],
      secondaryMuscles: [],
      equipments: [],
      bodyParts: [],
    }),
  },
}));

import { MealDetailHeader } from "@/components/details/MealDetailHeader";
import { ImagePicker } from "@/components/advanced/ImagePicker";
import { IngredientList } from "@/components/diet/meal-edit/IngredientList";
import { ExerciseInstructionModal } from "@/components/fitness/ExerciseInstructionModal";
import { ProgressHeader } from "@/components/progress/ProgressHeader";

describe("remaining raw touch targets", () => {
  it("keeps meal detail header controls at a 44pt floor", () => {
    const screen = render(
      <MealDetailHeader onBack={jest.fn()} onEdit={jest.fn()} />,
    );

    expect(
      StyleSheet.flatten(screen.getByLabelText("Back").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(screen.getByLabelText("Edit meal").props.style),
    ).toMatchObject({ width: 44, height: 44 });
  });

  it("keeps image picker action buttons and ingredient controls at safe sizes", () => {
    const picker = render(
      <ImagePicker
        visible
        mode="single"
        onImagesSelected={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const ingredients = render(
      <IngredientList
        ingredients={[{ name: "Chicken", quantity: 100, calories: 120 }]}
        onQuantityChange={jest.fn()}
        onRemoveIngredient={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(picker.getByLabelText("Take photo").props.style),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(
        picker.getByLabelText("Choose image from library").props.style,
      ),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(
        ingredients.getByLabelText("Decrease Chicken quantity").props.style,
      ),
    ).toMatchObject({ minWidth: 44, minHeight: 44 });
    expect(
      StyleSheet.flatten(
        ingredients.getByLabelText("Increase Chicken quantity").props.style,
      ),
    ).toMatchObject({ minWidth: 44, minHeight: 44 });
    expect(
      StyleSheet.flatten(ingredients.getByLabelText("Remove Chicken").props.style),
    ).toMatchObject({ minWidth: 44, minHeight: 44 });
  });

  it("keeps exercise instruction and progress header controls at safe sizes", () => {
    const exercise = render(
      <ExerciseInstructionModal
        isVisible
        onClose={jest.fn()}
        exerciseId="push-up"
        exerciseName="Push Up"
      />,
    );

    const progress = render(
      <ProgressHeader
        navigation={{ goBack: jest.fn() }}
        trackBStatus={{ isConnected: true }}
        showAnalytics={false}
        setShowAnalytics={jest.fn()}
        onAddEntry={jest.fn()}
        onShare={jest.fn()}
      />,
    );

    expect(
      StyleSheet.flatten(exercise.getByLabelText("Close Push Up").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(
        exercise.getByLabelText("Show instructions tab").props.style,
      ),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(
        exercise.getByLabelText("Show details tab").props.style,
      ),
    ).toMatchObject({ minHeight: 44 });
    expect(
      StyleSheet.flatten(progress.getByLabelText("Back").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(progress.getByLabelText("Add entry").props.style),
    ).toMatchObject({ width: 44, height: 44 });
    expect(
      StyleSheet.flatten(progress.getByLabelText("Share").props.style),
    ).toMatchObject({ width: 44, height: 44 });
  });
});
