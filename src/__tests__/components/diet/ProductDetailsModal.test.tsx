import React from "react";
import { render } from "@testing-library/react-native";

const mockSharedModal = jest.fn(
  ({ visible = true, children, ...props }: any) =>
    visible ? React.createElement("SharedModal", props, children) : null,
);

jest.mock("react-native", () => {
  const React = require("react");
  const createComponent = (name: string) =>
    React.forwardRef((props: any, ref) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  const MockModal = ({ visible = true, children, ...props }: any) =>
    visible ? React.createElement("Modal", props, children) : null;

  return {
    View: createComponent("View"),
    Text: createComponent("Text"),
    Image: createComponent("Image"),
    Modal: MockModal,
    Pressable: createComponent("Pressable"),
    ScrollView: createComponent("ScrollView"),
    TextInput: createComponent("TextInput"),
    TouchableOpacity: createComponent("TouchableOpacity"),
    ActivityIndicator: createComponent("ActivityIndicator"),
    KeyboardAvoidingView: createComponent("KeyboardAvoidingView"),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: any) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : (style ?? {}),
      hairlineWidth: 1,
      absoluteFillObject: {},
    },
    Platform: {
      OS: "android",
    },
  };
});

jest.mock("@/components/diet/HealthScoreIndicator", () => ({
  HealthScoreIndicator: () => null,
}));

jest.mock("@/components/ui/Modal", () => ({
  Modal: (props: any) => mockSharedModal(props),
}));

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rp: (value: number) => value,
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      backgroundSecondary: "#fff",
      surface: "#f5f5f5",
      border: "#ddd",
      text: "#111",
      textSecondary: "#666",
      textMuted: "#999",
      white: "#fff",
      primary: "#0af",
      errorAlt: "#f33",
      successAlt: "#0a6",
      neutral: "#ccc",
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
    borderRadius: {
      lg: 16,
      xl: 20,
      full: 999,
    },
    fontWeight: {
      bold: "700",
    },
    shadows: {
      lg: {},
    },
  },
}));

jest.mock("@/utils/packagedFoodNutrition", () => ({
  clampPackagedFoodGrams: (grams: number) => grams,
  getDefaultPackagedFoodGrams: () => 100,
  scaleScannedProductNutrition: (product: any, grams: number) => ({
    calories: Math.round((product.nutrition.calories / 100) * grams),
    protein: Number(((product.nutrition.protein / 100) * grams).toFixed(1)),
    carbs: Number(((product.nutrition.carbs / 100) * grams).toFixed(1)),
    fat: Number(((product.nutrition.fat / 100) * grams).toFixed(1)),
    fiber: Number(((product.nutrition.fiber / 100) * grams).toFixed(1)),
    sugar: Number(((product.nutrition.sugar / 100) * grams).toFixed(1)),
    sodium: Number(((product.nutrition.sodium / 100) * grams).toFixed(1)),
  }),
}));

import { ProductDetailsModal } from "@/components/diet/ProductDetailsModal";

describe("ProductDetailsModal", () => {
  beforeEach(() => {
    mockSharedModal.mockClear();
  });

  it("renders through the shared modal wrapper while preserving the product details UI", () => {
    const product = {
      barcode: "8900000000012",
      name: "Sabudana Khichdi",
      brand: "FitAI",
      source: "openfoodfacts",
      confidence: 96,
      nutrition: {
        calories: 152,
        protein: 4.5,
        carbs: 28,
        fat: 2.1,
        fiber: 1.9,
        sugar: 3.4,
        sodium: 0.21,
      },
    } as any;

    const screen = render(
      <ProductDetailsModal
        visible={true}
        onClose={jest.fn()}
        product={product}
        onAddToMeal={jest.fn()}
      />,
    );

    const sharedModal = screen.UNSAFE_getByType("SharedModal");
    expect(sharedModal.props.animationType).toBe("fade");
    expect(sharedModal.props.closeOnOverlayPress).toBe(true);
    expect(sharedModal.props.contentStyle.maxHeight).toBe("88%");

    expect(screen.getByText("Sabudana Khichdi")).toBeTruthy();
    expect(screen.getByText("Nutrition for 100g")).toBeTruthy();
    expect(screen.getByText("Amount you are eating")).toBeTruthy();
    expect(screen.getByText("Add to meal")).toBeTruthy();

    const scrollView = screen.UNSAFE_getByType("ScrollView");
    expect(scrollView.props.keyboardShouldPersistTaps).toBe("always");
    expect(scrollView.props.keyboardDismissMode).toBe("on-drag");
    expect(mockSharedModal).toHaveBeenCalledTimes(1);
  });

  it("shows label-scan source text instead of a barcode for vision-label results", () => {
    const product = {
      barcode: "label_123",
      name: "Labelled Oats",
      brand: "FitAI",
      source: "vision-label",
      confidence: 94,
      nutrition: {
        calories: 300,
        protein: 7.5,
        carbs: 55,
        fat: 5,
        fiber: 10,
        sugar: 2.5,
        sodium: 0.25,
        servingSize: 40,
        servingUnit: "g",
      },
      perServing: {
        calories: 120,
        protein: 3,
        carbs: 22,
        fat: 2,
        fiber: 4,
        sugar: 1,
        sodium: 0.1,
      },
    } as any;

    const screen = render(
      <ProductDetailsModal
        visible={true}
        onClose={jest.fn()}
        product={product}
        onAddToMeal={jest.fn()}
      />,
    );

    expect(screen.getByText("Source: Label scan")).toBeTruthy();
    expect(screen.queryByText(/Barcode:/)).toBeNull();
  });
});
