import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockLookupProduct = jest.fn();

jest.mock("react-native", () => {
  const React = require("react");
  const createComponent = (name: string) =>
    React.forwardRef((props: any, ref) =>
      React.createElement(name, { ...props, ref }, props.children),
    );

  return {
    View: createComponent("View"),
    Text: createComponent("Text"),
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
    },
    Platform: {
      OS: "android",
    },
  };
});

jest.mock("@/services/barcodeService", () => ({
  __esModule: true,
  default: {
    lookupProduct: (...args: unknown[]) => mockLookupProduct(...args),
  },
}));

jest.mock("@/utils/responsive", () => ({
  rf: (value: number) => value,
  rp: (value: number) => value,
  rbr: (value: number) => value,
}));

jest.mock("@/utils/constants", () => ({
  ResponsiveTheme: {
    colors: {
      backgroundSecondary: "#fff",
      backgroundTertiary: "#eee",
      border: "#ddd",
      text: "#111",
      textSecondary: "#666",
      textMuted: "#999",
      primary: "#0af",
      secondary: "#09f",
      surfaceLight: "#f5f5f5",
      surface: "#fafafa",
      white: "#fff",
      error: "#f33",
      errorTint: "#fee",
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
    borderRadius: {
      sm: 8,
      md: 12,
      xl: 20,
    },
  },
}));

import { ManualBarcodeEntry } from "@/components/diet/ManualBarcodeEntry";

describe("ManualBarcodeEntry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards authoritative lookup results directly instead of forcing a second lookup", async () => {
    mockLookupProduct.mockResolvedValue({
      outcome: "authoritative_hit",
      product: {
        barcode: "012345678905",
        name: "Trusted Product",
      },
      meta: {
        rawBarcode: "012345678905",
        normalizedBarcode: "0012345678905",
        retryable: false,
        lookupPath: ["supabase", "off_world"],
      },
    });

    const onLookupResolved = jest.fn();
    const screen = render(
      <ManualBarcodeEntry
        onLookupResolved={onLookupResolved}
        onRequestLabelScan={jest.fn()}
        onContributeProduct={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(
      screen.getByLabelText("Barcode input"),
      "012345678905",
    );
    fireEvent.press(screen.getByText("Look Up"));

    await waitFor(() => {
      expect(onLookupResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: "authoritative_hit",
          product: expect.objectContaining({ name: "Trusted Product" }),
        }),
      );
    });
  });

  it("shows label and contribute fallbacks when the barcode is not found", async () => {
    mockLookupProduct.mockResolvedValue({
      outcome: "not_found",
      error: "Product not found in trusted packaged-food sources.",
      meta: {
        rawBarcode: "012345678905",
        normalizedBarcode: "0012345678905",
        retryable: false,
        lookupPath: ["supabase", "off_world", "off_india"],
      },
    });

    const onRequestLabelScan = jest.fn();
    const onContributeProduct = jest.fn();
    const screen = render(
      <ManualBarcodeEntry
        onLookupResolved={jest.fn()}
        onRequestLabelScan={onRequestLabelScan}
        onContributeProduct={onContributeProduct}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(
      screen.getByLabelText("Barcode input"),
      "012345678905",
    );
    fireEvent.press(screen.getByText("Look Up"));

    await waitFor(() => {
      expect(screen.getByText("Scan Label")).toBeTruthy();
      expect(screen.getByText("Contribute Product")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Scan Label"));
    expect(onRequestLabelScan).toHaveBeenCalled();

    fireEvent.press(screen.getByText("Contribute Product"));
    expect(onContributeProduct).toHaveBeenCalledWith("012345678905");
  });
});
